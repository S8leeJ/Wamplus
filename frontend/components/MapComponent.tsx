"use client";

import { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import osmtogeojson from "osmtogeojson";
import centroid from "@turf/centroid";

import {
  TARGET_BUILDINGS,
  HEIGHT_OVERRIDES,
  MAP_BOUNDS,
} from "@/lib/map-data";

type LngLatBounds =
  | { getSouth: () => number; getWest: () => number; getNorth: () => number; getEast: () => number }
  | [number, number, number, number];

export type MapApartment = {
  id: string;
  name: string;
  image_url: string | null;
};

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
  const map = useRef<maplibregl.Map | null>(null);
  const apartmentsRef = useRef<MapApartment[]>(apartments);
  const [loading, setLoading] = useState(false);

  apartmentsRef.current = apartments;

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#f0f0f0" },
          },
        ],
      },
      center: [-97.742, 30.288],
      zoom: 16,
      minZoom: 14,
      maxZoom: 18,
      pitch: 0,
      bearing: 0,
    });

    map.current.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

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
        map.current!.easeTo({
          center: [newLng, newLat],
          zoom,
          duration: 500,
          easing: (t) => t * (2 - t),
        });
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

        if (map.current.getSource("buildings-source")) {
          (
            map.current.getSource("buildings-source") as maplibregl.GeoJSONSource
          ).setData(buildingsGeoJSON);
        } else {
          map.current.addSource("buildings-source", {
            type: "geojson",
            data: buildingsGeoJSON,
          });
          map.current.addLayer({
            id: "3d-buildings",
            type: "fill-extrusion",
            source: "buildings-source",
            paint: {
              "fill-extrusion-color": [
                "case",
                ["boolean", ["get", "isTarget"], false],
                "#5C6596",
                "#d9d9d9",
              ],
              "fill-extrusion-height": ["get", "renderHeight"],
              "fill-extrusion-base": 0,
              "fill-extrusion-opacity": 1,
              "fill-extrusion-vertical-gradient": true,
            },
          });
        }

        if (map.current.getSource("roads-source")) {
          (
            map.current.getSource("roads-source") as maplibregl.GeoJSONSource
          ).setData(roadsGeoJSON);
        } else {
          map.current.addSource("roads-source", {
            type: "geojson",
            data: roadsGeoJSON,
          });
          map.current.addLayer({
            id: "road-labels",
            type: "symbol",
            source: "roads-source",
            layout: {
              "text-field": ["get", "name"],
              "text-font": ["Open Sans Semibold"],
              "text-size": 12,
              "symbol-placement": "line",
              "text-offset": [0, 0.5],
            },
            paint: {
              "text-color": "#555",
              "text-halo-color": "#fff",
              "text-halo-width": 2,
            },
          });
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
        content += `<a href="/apartments" style="display: inline-block; margin-top: 10px; font-size: 0.85rem; color: #2563eb; text-decoration: none;">View apartment →</a>`;
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

    const handleBuildingClick = (
      props: Record<string, unknown>,
      coords: [number, number]
    ) => {
      if (!map.current) return;
      map.current.flyTo({
        center: coords,
        zoom: 17,
        pitch: 45,
        speed: 0.5,
        curve: 1,
        essential: true,
      });
    };

    map.current.on("load", async () => {
      await fetchBuildings(map.current!.getBounds());
      // Load all buildings in map bounds so we can find the right one
      const buildings = await fetchBuildings(MAP_BOUNDS);

      // Fly to specific apartment: use same OSM building centroid as when clicking
      if (initialFlyTo && buildings.length > 0) {
        const aptLower = initialFlyTo.toLowerCase().trim();
        const match = buildings.find((f) => {
          const bn = String((f.properties?.name as string) ?? "").toLowerCase();
          if (!bn) return false;
          return bn.includes(aptLower) || aptLower.includes(bn);
        });
        const exact = buildings.find(
          (f) => String((f.properties?.name as string) ?? "").toLowerCase() === aptLower
        );
        const feature = exact ?? match;
        if (feature) {
          const centerPoint = centroid(feature as GeoJSON.Feature);
          const coords = centerPoint.geometry.coordinates as [number, number];
          map.current!.flyTo({
            center: coords,
            zoom: 18,
            pitch: 60,
            bearing: -17,
            speed: 0.5,
            curve: 1,
            essential: true,
          });
        } else {
          // Fallback to TARGET_BUILDINGS if no OSM building matches
          const search = aptLower.replace(/\s+/g, " ");
          const target = TARGET_BUILDINGS.find(
            (b) =>
              b.name.toLowerCase() === search ||
              b.name.toLowerCase().includes(search) ||
              search.includes(b.name.toLowerCase())
          );
          if (target) {
            map.current!.flyTo({
              center: target.coords,
              zoom: 18,
              pitch: 60,
              bearing: -17,
              speed: 0.5,
              curve: 1,
              essential: true,
            });
          }
        }
      }
    });

    map.current.on("click", "3d-buildings", (e) => {
      if (!map.current || !e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const props = feature.properties as Record<string, unknown>;
      const centerPoint = centroid(feature as GeoJSON.Feature);
      const coords = centerPoint.geometry.coordinates as [number, number];

      handleBuildingClick(props, coords);

      const buildingName = String(props.name || "");
      const apartment = findApartmentForBuilding(buildingName);

      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(createPopupContent(props, apartment))
        .addTo(map.current!);
    });

    map.current.on("mouseenter", "3d-buildings", () => {
      if (map.current) map.current.getCanvas().style.cursor = "pointer";
    });
    map.current.on("mouseleave", "3d-buildings", () => {
      if (map.current) map.current.getCanvas().style.cursor = "";
    });

    return () => {
      if (bounceTimeout) clearTimeout(bounceTimeout);
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const handleSearchSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    if (!name || !map.current) return;

    const target = TARGET_BUILDINGS.find((b) => b.name === name);
    if (target) {
      map.current.flyTo({
        center: target.coords,
        zoom: 18,
        pitch: 60,
        bearing: -17,
        speed: 0.5,
        curve: 1,
        essential: true,
      });
    }
  };

  return (
    <div className="relative h-full w-full">
      <div
        className="absolute left-5 top-5 z-10 max-w-[300px] rounded-lg bg-white p-4 shadow-lg"
        style={{ zIndex: 10 }}
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
          style={{ zIndex: 1 }}
        >
          Updating 3D Data...
        </div>
      )}
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
}
