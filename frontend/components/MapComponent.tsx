"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import osmtogeojson from "osmtogeojson";
import centroid from "@turf/centroid";
import {
  TARGET_BUILDINGS,
  HEIGHT_OVERRIDES,
  MAP_BOUNDS,
} from "@/lib/map-data";
import ApartmentDetailModal from "@/app/apartments/ApartmentDetailModal";
import { getCompareItems } from "@/lib/cached-actions";
import type { CompareItemWithDetails } from "@/app/(dashboard)/compare/actions";

type LngLatBounds =
  | { getSouth: () => number; getWest: () => number; getNorth: () => number; getEast: () => number }
  | [number, number, number, number];

export type MapApartment = {
  id: string;
  name: string;
  image_url?: string | null;
  address?: string | null;
  website?: string | null;
  rating?: number | null;
  reviews?: number | null;
};

function compareKey(apartmentId: string, unitId: string) {
  return `${apartmentId}:${unitId}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function MapComponent({
  apartments = [],
  initialFlyTo,
}: {
  apartments?: MapApartment[];
  initialFlyTo?: string;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const buildingsLayer = useRef<L.GeoJSON | null>(null);
  const roadsLayer = useRef<L.GeoJSON | null>(null);
  const activePopup = useRef<L.Popup | null>(null);
  const apartmentsRef = useRef<MapApartment[]>(apartments);
  const [loading, setLoading] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<MapApartment | null>(null);
  const [compareKeys, setCompareKeys] = useState<string[]>([]);

  apartmentsRef.current = apartments;

  const fetchCompareKeys = useCallback(async () => {
    const items: CompareItemWithDetails[] = await getCompareItems();
    setCompareKeys(items.map((c) => compareKey(c.apartment_id, c.unit_id)));
  }, []);

  useEffect(() => {
    fetchCompareKeys();
  }, [fetchCompareKeys]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      center: [30.288, -97.742],
      zoom: 16,
      minZoom: 14,
      maxZoom: 18,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map.current);

    map.current.addControl(L.control.zoom({ position: "topright" }));

    // Ensure popups render above map layers
    const popupPane = map.current.getPane("popupPane");
    if (popupPane) (popupPane as HTMLElement).style.zIndex = "2000";

    let bounceTimeout: ReturnType<typeof setTimeout> | null = null;

    const checkBounds = () => {
      if (!map.current) return;
      const center = map.current.getCenter();
      const zoom = map.current.getZoom();
      const [w, s, e, n] = MAP_BOUNDS;

      let newLng = center.lng;
      let newLat = center.lat;
      let needsCorrection = false;

      if (newLng < w) {
        newLng = w;
        needsCorrection = true;
      }
      if (newLng > e) {
        newLng = e;
        needsCorrection = true;
      }
      if (newLat < s) {
        newLat = s;
        needsCorrection = true;
      }
      if (newLat > n) {
        newLat = n;
        needsCorrection = true;
      }

      if (needsCorrection) {
        map.current.flyTo([newLat, newLng], zoom, { duration: 0.5 });
      }
    };

    map.current.on("moveend", () => {
      if (bounceTimeout) clearTimeout(bounceTimeout);
      bounceTimeout = setTimeout(checkBounds, 150);
    });

    const fetchBuildings = async (targetBounds: LngLatBounds): Promise<GeoJSON.Feature[]> => {
      if (!map.current) return [];
      setLoading(true);

      let w: number, s: number, e: number, n: number;

      if (
        targetBounds &&
        typeof (targetBounds as { getSouth?: () => number }).getSouth ===
          "function"
      ) {
        const b = targetBounds as {
          getSouth: () => number;
          getWest: () => number;
          getNorth: () => number;
          getEast: () => number;
        };
        s = b.getSouth();
        w = b.getWest();
        n = b.getNorth();
        e = b.getEast();
      } else if (Array.isArray(targetBounds)) {
        [w, s, e, n] = targetBounds;
      } else {
        [w, s, e, n] = MAP_BOUNDS;
      }

      const query = `
      [out:json][timeout:25];
      (
        way["building"](${s},${w},${n},${e});
        relation["building"](${s},${w},${n},${e});
        way["building:part"](${s},${w},${n},${e});
        relation["building:part"](${s},${w},${n},${e});
        way["highway"~"^(primary|secondary|tertiary|residential)$"](${s},${w},${n},${e});
      );
      (._;>;);
      out;
    `;

      const cacheKey = `osm_data_${w}_${s}_${e}_${n}`;
      const cached =
        typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
      let data: unknown;

      if (cached) {
        try {
          const parsed = JSON.parse(cached) as {
            timestamp: number;
            data: unknown;
          };
          if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            data = parsed.data;
          }
        } catch {
          localStorage.removeItem(cacheKey);
        }
      }

      if (!data) {
        try {
          const response = await fetch(
            "https://overpass-api.de/api/interpreter",
            { method: "POST", body: query }
          );
          data = await response.json();
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({ timestamp: Date.now(), data })
            );
          } catch {
            /* ignore */
          }
        } catch (error) {
          console.error("Error fetching buildings:", error);
          setLoading(false);
          return [];
        }
      }

      let validBuildings: GeoJSON.Feature[] = [];
      try {
        const geojson = osmtogeojson(data) as GeoJSON.FeatureCollection;

        validBuildings = geojson.features.filter(
          (f) =>
            (f.properties?.building || f.properties?.["building:part"]) &&
            (f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon")
        );

        validBuildings.forEach((feature) => {
          const props = feature.properties as Record<string, unknown> & {
            name?: string;
            height?: string | number;
            "building:levels"?: string | number;
            isTarget?: boolean;
            renderHeight?: number;
          };
          const name = (props.name?.toString() || "").toLowerCase();
          const matchedTarget = TARGET_BUILDINGS.find((t) =>
            name.includes(t.name.toLowerCase())
          );
          props.isTarget = !!matchedTarget;

          let h = 0;
          const overrideKey = Object.keys(HEIGHT_OVERRIDES).find((key) =>
            name.includes(key)
          );
          if (overrideKey) {
            h = HEIGHT_OVERRIDES[overrideKey];
          }
          if (!h && props.height) {
            h = parseFloat(String(props.height));
          }
          if (!h && props["building:levels"]) {
            h = parseFloat(String(props["building:levels"])) * 3.5;
          }
          if (!h || isNaN(h) || h < 6) {
            h = 6;
          }
          props.renderHeight = h;
        });

        const buildingsGeoJSON: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: validBuildings,
        };

        const validRoads = geojson.features.filter(
          (f) =>
            f.properties?.highway &&
            f.geometry?.type === "LineString" &&
            f.properties?.name
        );

        const roadsGeoJSON: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: validRoads,
        };

        const buildingStyle = (feature?: GeoJSON.Feature) => {
          const isTarget = (feature?.properties?.isTarget as boolean) ?? false;
          return {
            fillColor: isTarget ? "#5C6596" : "#d9d9d9",
            fillOpacity: 0.8,
            color: isTarget ? "#4a5278" : "#bbb",
            weight: 1,
          };
        };

        const roadStyle = () => ({
          color: "#888",
          weight: 2,
          opacity: 0.7,
        });

        if (buildingsLayer.current) {
          buildingsLayer.current.clearLayers();
          buildingsLayer.current.addData(buildingsGeoJSON);
        } else {
          buildingsLayer.current = L.geoJSON(buildingsGeoJSON, {
            style: buildingStyle,
            onEachFeature: (feature: GeoJSON.Feature, layer: L.Layer) => {
              layer.on({
                click: (e: L.LeafletMouseEvent) => {
                  if (!map.current) return;
                  const props = (feature.properties || {}) as Record<string, unknown>;
                  const centerPoint = centroid(feature as GeoJSON.Feature);
                  const coords = centerPoint.geometry.coordinates as [number, number];

                  const buildingName = String(props.name || "");
                  const apartment = findApartmentForBuilding(buildingName);

                  if (activePopup.current) {
                    map.current.closePopup(activePopup.current);
                  }

                  activePopup.current = L.popup({
                    autoClose: false,
                    closeOnClick: false,
                    closeButton: true,
                  })
                    .setLatLng(e.latlng)
                    .setContent(createPopupContent(props, apartment))
                    .openOn(map.current);

                  map.current.flyTo([coords[1], coords[0]], 17, { duration: 0.5 });
                },
                mouseover: () => {
                  if (map.current) map.current.getContainer().style.cursor = "pointer";
                },
                mouseout: () => {
                  if (map.current) map.current.getContainer().style.cursor = "";
                },
              });
            },
          }).addTo(map.current);
        }

        if (roadsLayer.current) {
          roadsLayer.current.clearLayers();
          roadsLayer.current.addData(roadsGeoJSON);
        } else {
          roadsLayer.current = L.geoJSON(roadsGeoJSON, {
            style: roadStyle,
          }).addTo(map.current);
        }
      } catch (error) {
        console.error("Error processing buildings:", error);
        return [];
      } finally {
        setLoading(false);
      }
      return validBuildings;
    };

    const createPopupContent = (
      props: Record<string, unknown>,
      apartment: MapApartment | null
    ) => {
      const name = escapeHtml(String(props.name || "Building"));
      const addrStreet = props["addr:street"]
        ? escapeHtml(
            `${(props["addr:housenumber"] || "")} ${props["addr:street"]}`
          )
        : "";
      let content = `<div style="padding: 0; color: #333; font-family: system-ui, sans-serif; max-width: 280px;">`;
      if (apartment?.image_url) {
        content += `<img src="${escapeHtml(apartment.image_url)}" alt="${escapeHtml(apartment.name)}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px 8px 0 0; display: block;" />`;
      }
      content += `<div style="padding: 10px 12px;">`;
      content += `<h3 style="margin: 0 0 6px; font-size: 1rem; font-weight: 600;">${name}</h3>`;
      if (addrStreet) {
        content += `<p style="margin: 0; font-size: 0.85rem; color: #666;">${addrStreet}</p>`;
      }
      if (props.height) {
        content += `<p style="margin: 6px 0 0; font-size: 0.8rem; color: #888;">Height: ${escapeHtml(String(props.height))}m</p>`;
      }
      if (apartment) {
        content += `<button type="button" class="view-apartment-btn" data-apartment-id="${escapeHtml(apartment.id)}" style="display: inline-block; margin-top: 10px; font-size: 0.85rem; color: #2563eb; text-decoration: none; background: none; border: none; cursor: pointer; padding: 0; font-family: inherit;">View apartment →</button>`;
      }
      content += `</div></div>`;
      return content;
    };

    const findApartmentForBuilding = (buildingName: string): MapApartment | null => {
      const list = apartmentsRef.current;
      if (!list.length) return null;
      const lower = buildingName?.toLowerCase() ?? "";
      return (
        list.find((a) => lower.includes(a.name.toLowerCase())) ??
        list.find((a) => a.name.toLowerCase().includes(lower)) ??
        null
      );
    };

    const loadAndFlyTo = async () => {
      const allBuildings = await fetchBuildings(MAP_BOUNDS);

      if (initialFlyTo && allBuildings.length > 0) {
        const aptLower = initialFlyTo.toLowerCase().trim();
        const match = allBuildings.find((f) => {
          const bn = String((f.properties?.name as string) ?? "").toLowerCase();
          if (!bn) return false;
          return bn.includes(aptLower) || aptLower.includes(bn);
        });
        const exact = allBuildings.find(
          (f) => String((f.properties?.name as string) ?? "").toLowerCase() === aptLower
        );
        const feature = exact ?? match;
        if (feature) {
          const centerPoint = centroid(feature as GeoJSON.Feature);
          const coords = centerPoint.geometry.coordinates as [number, number];
          map.current!.flyTo([coords[1], coords[0]], 18, { duration: 0.5 });
        } else {
          const search = aptLower.replace(/\s+/g, " ");
          const target = TARGET_BUILDINGS.find(
            (b) =>
              b.name.toLowerCase() === search ||
              b.name.toLowerCase().includes(search) ||
              search.includes(b.name.toLowerCase())
          );
          if (target) {
            map.current!.flyTo(
              [target.coords[1], target.coords[0]],
              18,
              { duration: 0.5 }
            );
          }
        }
      }
    };

    loadAndFlyTo();

    return () => {
      if (bounceTimeout) clearTimeout(bounceTimeout);
      if (activePopup.current) {
        map.current?.closePopup(activePopup.current);
        activePopup.current = null;
      }
      buildingsLayer.current?.remove();
      roadsLayer.current?.remove();
      map.current?.remove();
      map.current = null;
      buildingsLayer.current = null;
      roadsLayer.current = null;
    };
  }, []);

  const handleViewApartmentClick = (e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest(".view-apartment-btn");
    if (!btn) return;
    const id = btn.getAttribute("data-apartment-id");
    if (!id) return;
    const apt = apartmentsRef.current.find((a) => a.id === id);
    if (apt) {
      setSelectedApartment(apt);
      if (activePopup.current && map.current) {
        map.current.closePopup(activePopup.current);
        activePopup.current = null;
      }
    }
  };

  const handleSearchSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    if (!name || !map.current) return;

    const target = TARGET_BUILDINGS.find((b) => b.name === name);
    if (target) {
      map.current.flyTo(
        [target.coords[1], target.coords[0]],
        18,
        { duration: 0.5 }
      );
    }
  };

  return (
    <div className="relative h-full w-full" onClick={handleViewApartmentClick}>
      <ApartmentDetailModal
        isOpen={selectedApartment != null}
        onClose={() => setSelectedApartment(null)}
        apartment={selectedApartment}
        compareKeys={compareKeys}
        onAddedToCompare={fetchCompareKeys}
      />
      <div
        className="absolute left-5 top-5 z-10 max-w-[300px] rounded-lg bg-white p-4 shadow-lg"
        style={{ zIndex: 1000 }}
      >
        <h2 className="mb-2.5 text-lg font-semibold text-primary-900">UT Austin Map</h2>
        <div className="mb-2.5">
          <label className="mb-1 block text-xs text-primary-900">
            Fly to Building:
          </label>
          <select
            onChange={handleSearchSelect}
            className="w-full rounded border text-primary-900 px-2 py-1.5"
          >
            <option value="">Select a destination...</option>
            {TARGET_BUILDINGS.map((b, i) => (
              <option key={i} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div
          className="absolute bottom-5 right-5 rounded-full bg-black/70 px-3 py-2 text-xs text-white"
          style={{ zIndex: 1000 }}
        >
          Updating map data...
        </div>
      )}
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
}
