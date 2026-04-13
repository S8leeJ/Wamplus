"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ChangeEvent,
} from "react";
import Image from "next/image";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import osmtogeojson from "osmtogeojson";
import {
  TARGET_BUILDINGS,
  HEIGHT_OVERRIDES,
  MAP_BOUNDS,
} from "@/lib/map-data";
import {
  extractScheduleLocationPicks,
  type ScheduleLocationPick,
} from "@/lib/schedule-json";
import { lngLatForBuildingCode } from "@/lib/ut-building-code-resolve";
import ApartmentDetailModal from "@/app/apartments/ApartmentDetailModal";
import { getCompareItems } from "@/lib/cached-actions";
import type { CompareItemWithDetails } from "@/app/(dashboard)/compare/actions";

/** OSRM foot times are optimistic for campus reality — inflate for display. */
const WALK_DURATION_DISPLAY_MULTIPLIER = 1.5;

export type SearchableBuilding = {
  name: string;
  isApartment: boolean;
};

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

function findApartmentForBuilding(
  buildingName: string,
  apartments: MapApartment[]
): MapApartment | null {
  if (!apartments.length) return null;
  const lower = buildingName?.toLowerCase() ?? "";
  return (
    apartments.find((a) => lower.includes(a.name.toLowerCase())) ??
    apartments.find((a) => a.name.toLowerCase().includes(lower)) ??
    null
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function schedulePickMenuLabel(p: ScheduleLocationPick): string {
  const room = p.room ? ` ${p.room}` : "";
  const d = p.daysLabel ? ` · ${p.daysLabel}` : "";
  return `${p.buildingCode}${room}${d} — ${p.courseLabel}`;
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
  const allBuildingsFeaturesRef = useRef<GeoJSON.Feature[]>([]);
  const fitMapToBuildingFeatureRef = useRef<(feature: GeoJSON.Feature) => void>(
    () => {}
  );
  const activeBuildingPopupRef = useRef<L.Popup | null>(null);
  const apartmentsRef = useRef<MapApartment[]>(apartments);
  const [loading, setLoading] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<MapApartment | null>(null);
  const [compareKeys, setCompareKeys] = useState<string[]>([]);
  const [buildingPanel, setBuildingPanel] = useState<{
    props: Record<string, unknown>;
    apartment: MapApartment | null;
    kind: "apartment" | "campus";
  } | null>(null);
  const [searchableBuildings, setSearchableBuildings] = useState<SearchableBuilding[]>([]);
  const [mapSearch, setMapSearch] = useState("");
  /** Hide typeahead after picking a building until user edits or refocuses search. */
  const [mapSearchDropdownDismissed, setMapSearchDropdownDismissed] = useState(false);
  const [routeFromDropdownDismissed, setRouteFromDropdownDismissed] = useState(false);
  const [routeToDropdownDismissed, setRouteToDropdownDismissed] = useState(false);
  const [showWalkingDirections, setShowWalkingDirections] = useState(true);
  const [routeFromSearch, setRouteFromSearch] = useState("");
  const [routeToSearch, setRouteToSearch] = useState("");
  const [routeFromName, setRouteFromName] = useState<string | null>(null);
  const [routeToName, setRouteToName] = useState<string | null>(null);
  const [useMyLocationStart, setUseMyLocationStart] = useState(false);
  const [routeSummary, setRouteSummary] = useState<{
    distanceM: number;
    durationS: number;
    fromLabel: string;
    toLabel: string;
  } | null>(null);
  const [routeFetching, setRouteFetching] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const routeOverlayRef = useRef<L.Layer | null>(null);
  const scheduleFileInputRef = useRef<HTMLInputElement>(null);

  const [routeInputTab, setRouteInputTab] = useState<"search" | "schedule">("search");
  const [schedulePicks, setSchedulePicks] = useState<ScheduleLocationPick[]>([]);
  const [schedulePlanTitle, setSchedulePlanTitle] = useState<string | null>(null);
  const [scheduleSelectKey, setScheduleSelectKey] = useState("");
  const [scheduleTargetBuilding, setScheduleTargetBuilding] = useState("");
  const [scheduleJsonError, setScheduleJsonError] = useState<string | null>(null);

  apartmentsRef.current = apartments;

  /** Apartment buildings with at least one unit on compare — primary-tinted highlight on the map. */
  const compareApartmentIds = useMemo(
    () =>
      new Set(
        compareKeys.map((k) => {
          const i = k.indexOf(":");
          return i >= 0 ? k.slice(0, i) : k;
        })
      ),
    [compareKeys]
  );

  const getBuildingPolygonStyleRef = useRef<(feature: GeoJSON.Feature) => L.PathOptions>(
    () => ({
      fillColor: "#94a3b8",
      fillOpacity: 0.1,
      color: "#cbd5e1",
      weight: 0.6,
    })
  );

  function getBuildingPolygonStyle(feature: GeoJSON.Feature): L.PathOptions {
    const isApartment = (feature.properties?.isApartment as boolean) ?? false;
    if (!isApartment) {
      return {
        fillColor: "#94a3b8",
        fillOpacity: 0.05,
        color: "#cbd5e1",
        weight: 0.6,
      };
    }
    const buildingName = String(feature.properties?.name ?? "").trim();
    const apt = findApartmentForBuilding(buildingName, apartmentsRef.current);
    const inCompare = apt && compareApartmentIds.has(apt.id);
    if (inCompare) {
      return {
        fillColor: "#4d5480",
        fillOpacity: 0.7,
        stroke: false,
      };
    }
    return {
      fillColor: "#5C6596",
      fillOpacity: 0.3,
      stroke: false,
    };
  }

  getBuildingPolygonStyleRef.current = getBuildingPolygonStyle;

  const fetchCompareKeys = useCallback(async () => {
    const items: CompareItemWithDetails[] = await getCompareItems();
    setCompareKeys(items.map((c) => compareKey(c.apartment_id, c.unit_id)));
  }, []);

  useEffect(() => {
    fetchCompareKeys();
  }, [fetchCompareKeys]);

  const searchResults = useMemo(() => {
    const q = mapSearch.trim().toLowerCase();
    if (!q) return [];
    return searchableBuildings
      .filter((b) => b.name.toLowerCase().includes(q))
      .slice(0, 16);
  }, [mapSearch, searchableBuildings]);

  const routeFromResults = useMemo(() => {
    const q = routeFromSearch.trim().toLowerCase();
    if (!q) return [];
    return searchableBuildings
      .filter((b) => b.name.toLowerCase().includes(q))
      .slice(0, 12);
  }, [routeFromSearch, searchableBuildings]);

  const routeToResults = useMemo(() => {
    const q = routeToSearch.trim().toLowerCase();
    if (!q) return [];
    return searchableBuildings
      .filter((b) => b.name.toLowerCase().includes(q))
      .slice(0, 12);
  }, [routeToSearch, searchableBuildings]);

  const sortedMapBuildingNames = useMemo(
    () =>
      [...searchableBuildings.map((b) => b.name)].sort((a, b) =>
        a.localeCompare(b)
      ),
    [searchableBuildings]
  );

  const getLngLatForBuilding = useCallback((name: string): { lng: number; lat: number } | null => {
    const key = name.trim().toLowerCase();
    const feature = allBuildingsFeaturesRef.current.find(
      (f) => String(f.properties?.name ?? "").trim().toLowerCase() === key
    );
    if (feature) {
      const gj = L.geoJSON(feature as GeoJSON.Feature);
      const c = gj.getBounds().getCenter();
      return { lng: c.lng, lat: c.lat };
    }
    const t = TARGET_BUILDINGS.find((b) => b.name === name);
    if (t) return { lng: t.coords[0], lat: t.coords[1] };
    return null;
  }, []);

  const clearWalkingRoute = useCallback(() => {
    if (routeOverlayRef.current && map.current) {
      map.current.removeLayer(routeOverlayRef.current);
      routeOverlayRef.current = null;
    }
    setRouteSummary(null);
    setRouteError(null);
  }, []);

  const resolveRouteEndpoint = useCallback(
    (picked: string | null, searchText: string): string | null => {
      if (picked) return picked;
      const q = searchText.trim();
      if (!q) return null;
      const hit = searchableBuildings.find(
        (b) => b.name.toLowerCase() === q.toLowerCase()
      );
      return hit ? hit.name : null;
    },
    [searchableBuildings]
  );

  const drawFootRoute = useCallback(
    async (
      from: { lng: number; lat: number },
      to: { lng: number; lat: number },
      fromLabel: string,
      toLabel: string
    ) => {
      const m = map.current;
      if (!m) throw new Error("Map not ready.");

      const url = `https://router.project-osrm.org/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Routing service unavailable. Try again later.");
      const data = (await res.json()) as {
        code?: string;
        message?: string;
        routes?: Array<{
          distance: number;
          duration: number;
          geometry: GeoJSON.LineString | GeoJSON.MultiLineString;
        }>;
      };
      if (data.code !== "Ok" || !data.routes?.[0]?.geometry) {
        throw new Error(
          data.message || "No walking route found. Try buildings closer together on streets."
        );
      }
      const r = data.routes[0];
      const layer = L.geoJSON(r.geometry as GeoJSON.GeoJsonObject, {
        style: {
          color: "#5C6596",
          weight: 5,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        },
      });
      layer.addTo(m);
      routeOverlayRef.current = layer;
      const b = layer.getBounds();
      if (b.isValid()) {
        m.fitBounds(b, { padding: [80, 80], maxZoom: 17, animate: true });
      }
      setRouteSummary({
        distanceM: r.distance,
        durationS: r.duration * WALK_DURATION_DISPLAY_MULTIPLIER,
        fromLabel,
        toLabel,
      });
    },
    []
  );

  const requestWalkingRoute = useCallback(async () => {
    if (!map.current) return;
    setRouteError(null);
    clearWalkingRoute();
    setRouteFetching(true);
    try {
      let from: { lng: number; lat: number };
      let fromLabel: string;
      if (useMyLocationStart) {
        from = await new Promise<{ lng: number; lat: number }>((resolve, reject) => {
          if (typeof navigator === "undefined" || !navigator.geolocation) {
            reject(new Error("Location is not available in this browser."));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              resolve({
                lng: pos.coords.longitude,
                lat: pos.coords.latitude,
              }),
            () =>
              reject(
                new Error(
                  "Could not get your location. Allow access in the browser or choose a start building."
                )
              ),
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
          );
        });
        fromLabel = "My location";
      } else {
        const startName = resolveRouteEndpoint(routeFromName, routeFromSearch);
        if (!startName) {
          setRouteError("Select a starting building.");
          return;
        }
        const c = getLngLatForBuilding(startName);
        if (!c) {
          setRouteError("Invalid starting building.");
          return;
        }
        from = c;
        fromLabel = startName;
      }
      const destName = resolveRouteEndpoint(routeToName, routeToSearch);
      if (!destName) {
        setRouteError("Select a destination building.");
        return;
      }
      const to = getLngLatForBuilding(destName);
      if (!to) {
        setRouteError("Invalid destination.");
        return;
      }
      await drawFootRoute(from, to, fromLabel, destName);
    } catch (e) {
      setRouteError(e instanceof Error ? e.message : "Could not load route.");
    } finally {
      setRouteFetching(false);
    }
  }, [
    clearWalkingRoute,
    drawFootRoute,
    getLngLatForBuilding,
    resolveRouteEndpoint,
    routeFromName,
    routeFromSearch,
    routeToName,
    routeToSearch,
    useMyLocationStart,
  ]);

  const handleScheduleFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setScheduleJsonError(null);
      setShowWalkingDirections(true);
      setRouteInputTab("schedule");
      try {
        const text = await file.text();
        const data: unknown = JSON.parse(text);
        const picks = extractScheduleLocationPicks(data);
        if (picks.length === 0) {
          setScheduleJsonError(
            "No meetings with a building code were found in this file."
          );
          setSchedulePicks([]);
          setScheduleSelectKey("");
          setSchedulePlanTitle(null);
          return;
        }
        setSchedulePicks(picks);
        setScheduleSelectKey(picks[0]!.key);
        const root = data as { name?: string };
        setSchedulePlanTitle(
          typeof root.name === "string" && root.name.trim()
            ? root.name.trim()
            : file.name.replace(/\.json$/i, "")
        );
      } catch (err) {
        setScheduleJsonError(
          err instanceof Error ? err.message : "Could not read schedule JSON."
        );
        setSchedulePicks([]);
        setScheduleSelectKey("");
        setSchedulePlanTitle(null);
      }
    },
    []
  );

  const openScheduleFilePicker = useCallback(() => {
    setShowWalkingDirections(true);
    setRouteInputTab("schedule");
    queueMicrotask(() => scheduleFileInputRef.current?.click());
  }, []);

  const requestScheduleWalkingRoute = useCallback(async () => {
    if (!map.current) return;
    setRouteError(null);
    clearWalkingRoute();
    setRouteFetching(true);
    try {
      const pick = schedulePicks.find((p) => p.key === scheduleSelectKey);
      if (!pick) {
        setRouteError("Upload a schedule and choose a class location.");
        return;
      }
      const resolved = lngLatForBuildingCode(
        pick.buildingCode,
        allBuildingsFeaturesRef.current
      );
      if (!resolved) {
        setRouteError(
          `Could not map “${pick.buildingCode}” to a building on the map. Wait for the map to finish loading, or add this abbreviation in ut-building-code-resolve.ts.`
        );
        return;
      }
      const destName = scheduleTargetBuilding.trim();
      if (!destName) {
        setRouteError("Choose a destination building.");
        return;
      }
      const to = getLngLatForBuilding(destName);
      if (!to) {
        setRouteError("That destination is not on the map.");
        return;
      }
      const roomPart = pick.room ? `${pick.room} · ` : "";
      const daysPart = pick.daysLabel ? `${pick.daysLabel} · ` : "";
      const fromLabel = `${pick.buildingCode} · ${roomPart}${daysPart}${pick.courseLabel} → ${resolved.matchedName}`;
      await drawFootRoute(
        { lng: resolved.lng, lat: resolved.lat },
        to,
        fromLabel,
        destName
      );
    } catch (e) {
      setRouteError(e instanceof Error ? e.message : "Could not load route.");
    } finally {
      setRouteFetching(false);
    }
  }, [
    clearWalkingRoute,
    drawFootRoute,
    getLngLatForBuilding,
    schedulePicks,
    scheduleSelectKey,
    scheduleTargetBuilding,
  ]);

  const flyToTargetByName = useCallback((name: string) => {
    if (!map.current) return;
    setMapSearchDropdownDismissed(true);
    setMapSearch(name);
    const key = name.trim().toLowerCase();
    const feature =
      allBuildingsFeaturesRef.current.find(
        (f) => String(f.properties?.name ?? "").trim().toLowerCase() === key
      ) ?? null;

    const list = apartmentsRef.current;
    const matchedTarget = TARGET_BUILDINGS.find((b) => b.name === name);
    const isApartment =
      (feature?.properties?.isApartment as boolean | undefined) ??
      (matchedTarget != null);

    const apartment =
      isApartment
        ? feature
          ? findApartmentForBuilding(String(feature.properties?.name ?? ""), list) ??
            (matchedTarget ? findApartmentForBuilding(matchedTarget.name, list) : null)
          : matchedTarget
            ? findApartmentForBuilding(matchedTarget.name, list)
            : null
        : null;

    const kind: "apartment" | "campus" = isApartment ? "apartment" : "campus";

    if (feature) {
      const props = (feature.properties || {}) as Record<string, unknown>;
      setBuildingPanel({ props, apartment, kind });
      fitMapToBuildingFeatureRef.current(feature);
    } else if (matchedTarget) {
      setBuildingPanel({
        props: { name: matchedTarget.name },
        apartment: findApartmentForBuilding(matchedTarget.name, list),
        kind: "apartment",
      });
      map.current.flyTo([matchedTarget.coords[1], matchedTarget.coords[0]], 18, {
        duration: 0.5,
      });
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      center: [30.288, -97.742],
      zoom: 16,
      minZoom: 14,
      maxZoom: 18,
      zoomControl: false,
    });

    // Carto Voyager: clearer typography & palette than raw OSM tiles (same OSM data underneath).
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map.current);

    map.current.addControl(L.control.zoom({ position: "bottomright" }));

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
            isApartment?: boolean;
            renderHeight?: number;
          };
          const name = (props.name?.toString() || "").toLowerCase();
          const matchedApt = TARGET_BUILDINGS.find((t) =>
            name.includes(t.name.toLowerCase())
          );
          props.isApartment = !!matchedApt;

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

        const searchableMap = new Map<string, SearchableBuilding>();
        for (const f of validBuildings) {
          const raw = String(f.properties?.name ?? "").trim();
          if (!raw) continue;
          const k = raw.toLowerCase();
          if (searchableMap.has(k)) continue;
          const nl = raw.toLowerCase();
          const isApartment = TARGET_BUILDINGS.some((t) =>
            nl.includes(t.name.toLowerCase())
          );
          searchableMap.set(k, { name: raw, isApartment });
        }
        setSearchableBuildings(
          Array.from(searchableMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );

        allBuildingsFeaturesRef.current = validBuildings;

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

        const buildingStyle = (feature?: GeoJSON.Feature) =>
          feature
            ? getBuildingPolygonStyleRef.current(feature)
            : {
                fillColor: "#94a3b8",
                fillOpacity: 0.1,
                color: "#cbd5e1",
                weight: 0.6,
              };

        const roadStyle = () => ({
          color: "#94a3b8",
          weight: 1.5,
          opacity: 0.45,
        });

        const fitMapToBuildingFeature = (feature: GeoJSON.Feature) => {
          if (!map.current) return;
          const gjLayer = L.geoJSON(feature);
          const b = gjLayer.getBounds();
          if (!b.isValid()) return;
          const w = typeof window !== "undefined" ? window.innerWidth : 1280;
          const leftPad = Math.min(420, Math.max(260, Math.round(w * 0.25)));
          const topPad = 80;
          map.current.fitBounds(b, {
            paddingTopLeft: L.point(leftPad + 8, topPad),
            paddingBottomRight: L.point(32, 32),
            maxZoom: 18,
            animate: true,
            duration: 0.55,
          });
        };
        fitMapToBuildingFeatureRef.current = fitMapToBuildingFeature;

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
                  const buildingName = String(props.name || "").trim();
                  if (!buildingName) return;

                  const isApartment = (props.isApartment as boolean) ?? false;
                  const kind: "apartment" | "campus" = isApartment
                    ? "apartment"
                    : "campus";
                  const apartment = isApartment
                    ? findApartmentForBuilding(
                        buildingName,
                        apartmentsRef.current
                      )
                    : null;

                  setBuildingPanel({ props, apartment, kind });
                  fitMapToBuildingFeature(feature as GeoJSON.Feature);

                  if (activeBuildingPopupRef.current && map.current) {
                    map.current.closePopup(activeBuildingPopupRef.current);
                    activeBuildingPopupRef.current = null;
                  }
                  const pathLayer = e.target as L.Polygon;
                  const center = pathLayer.getBounds().getCenter();
                  const label =
                    buildingName.trim() || "Building";
                  const popup = L.popup({
                    className: "building-name-popup",
                    closeButton: true,
                    autoClose: false,
                    closeOnClick: false,
                  })
                    .setLatLng(center)
                    .setContent(
                      `<div style="font-weight:600;font-size:0.875rem;color:#111827;line-height:1.35;max-width:260px;">${escapeHtml(label)}</div>`
                    );
                  popup.openOn(map.current);
                  activeBuildingPopupRef.current = popup;

                  e.originalEvent.stopPropagation();
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
          const label = String((feature.properties?.name as string) ?? initialFlyTo);
          setMapSearch(label);
          fitMapToBuildingFeatureRef.current(feature as GeoJSON.Feature);
        } else {
          const search = aptLower.replace(/\s+/g, " ");
          const target = TARGET_BUILDINGS.find(
            (b) =>
              b.name.toLowerCase() === search ||
              b.name.toLowerCase().includes(search) ||
              search.includes(b.name.toLowerCase())
          );
          if (target) {
            setMapSearch(target.name);
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
      if (activeBuildingPopupRef.current && map.current) {
        map.current.closePopup(activeBuildingPopupRef.current);
        activeBuildingPopupRef.current = null;
      }
      if (routeOverlayRef.current && map.current) {
        map.current.removeLayer(routeOverlayRef.current);
        routeOverlayRef.current = null;
      }
      buildingsLayer.current?.remove();
      roadsLayer.current?.remove();
      map.current?.remove();
      map.current = null;
      buildingsLayer.current = null;
      roadsLayer.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = buildingsLayer.current;
    if (!layer) return;
    layer.eachLayer((l) => {
      const feat = (l as L.Layer & { feature?: GeoJSON.Feature }).feature;
      if (feat) (l as L.Path).setStyle(getBuildingPolygonStyleRef.current(feat));
    });
  }, [compareApartmentIds, apartments]);

  const addrLine = (props: Record<string, unknown>) => {
    if (!props["addr:street"]) return null;
    return `${props["addr:housenumber"] ?? ""} ${props["addr:street"]}`.trim();
  };

  return (
    <div className="relative h-full w-full">
      <ApartmentDetailModal
        isOpen={selectedApartment != null}
        onClose={() => setSelectedApartment(null)}
        apartment={selectedApartment}
        compareKeys={compareKeys}
        onAddedToCompare={fetchCompareKeys}
      />

      {/* Top-right: fly-to search + walking directions */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1100] flex justify-end px-3 pt-3">
        <div className="pointer-events-auto flex w-full max-w-2xl flex-col items-end gap-2">
          <div className="relative w-full">
            <label htmlFor="map-building-search" className="sr-only">
              Search buildings
            </label>
            <input
              id="map-building-search"
              type="search"
              value={mapSearch}
              onChange={(e) => {
                setMapSearchDropdownDismissed(false);
                setMapSearch(e.target.value);
              }}
              onFocus={() => setMapSearchDropdownDismissed(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchResults.length > 0) {
                  e.preventDefault();
                  flyToTargetByName(searchResults[0].name);
                }
              }}
              placeholder="Search campus buildings (OSM)…"
              className="w-full rounded-xl border border-zinc-200 bg-white/95 py-2.5 pl-4 pr-10 text-sm text-zinc-900 shadow-md backdrop-blur placeholder:text-zinc-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
              autoComplete="off"
            />
            <svg
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            {mapSearch.trim() &&
              searchResults.length > 0 &&
              !mapSearchDropdownDismissed && (
              <ul
                className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
                role="listbox"
              >
                {searchResults.map((b) => (
                  <li key={b.name}>
                    <button
                      type="button"
                      role="option"
                      className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm text-zinc-800 hover:bg-primary-50"
                      onClick={() => flyToTargetByName(b.name)}
                    >
                      <span className="min-w-0 truncate">{b.name}</span>
                      <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                        {b.isApartment ? "Apt" : "Campus"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {mapSearch.trim() &&
              searchResults.length === 0 &&
              !mapSearchDropdownDismissed && (
              <p className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500 shadow-lg">
                No matching building.
              </p>
            )}
          </div>

          <div className="w-full overflow-visible rounded-xl border border-zinc-200 bg-white/95 shadow-md backdrop-blur">
            <input
              ref={scheduleFileInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={handleScheduleFile}
            />
            <div className="flex w-full items-stretch">
              <button
                type="button"
                onClick={() => setShowWalkingDirections((v) => !v)}
                className="flex min-w-0 flex-1 items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-zinc-50/80 sm:gap-3 sm:px-5"
                aria-expanded={showWalkingDirections}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-800"
                    aria-hidden
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75L15.75 12 9 17.25" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3.75" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-primary-800">
                      Walking directions
                    </span>
                    {!showWalkingDirections && (
                      <span className="mt-0.5 block text-[11px] font-normal normal-case text-zinc-500">
                        Plan a route or upload your class schedule
                      </span>
                    )}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-zinc-600">
                  {showWalkingDirections ? "Hide" : "Show"}
                  <svg
                    className={`h-5 w-5 text-zinc-500 transition-transform ${showWalkingDirections ? "rotate-180" : ""}`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </span>
              </button>
              <div className="flex shrink-0 flex-col justify-center border-l border-zinc-200 bg-zinc-50/60 px-2 py-2 sm:px-3">
                <button
                  type="button"
                  onClick={openScheduleFilePicker}
                  aria-label="Upload class schedule JSON file"
                  className="whitespace-nowrap rounded-lg bg-primary-700 px-3 py-2 text-center text-xs font-semibold text-white shadow-sm hover:bg-primary-600 sm:text-sm"
                >
                  Upload schedule
                </button>
              </div>
            </div>

          {showWalkingDirections && (
          <div className="border-t border-zinc-100 px-4 pb-4 pt-3 sm:px-5">

            <button
              type="button"
              onClick={openScheduleFilePicker}
              aria-label="Upload class schedule as JSON"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary-300 bg-primary-50/60 px-4 py-3 text-sm font-semibold text-primary-900 transition-colors hover:border-primary-400 hover:bg-primary-50"
            >
              <svg className="h-5 w-5 shrink-0 text-primary-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Upload class schedule (JSON)
            </button>
            {schedulePlanTitle && (
              <p className="mt-2 text-center text-xs text-zinc-600">
                Loaded: <span className="font-medium text-zinc-800">{schedulePlanTitle}</span>
              </p>
            )}
            {scheduleJsonError && (
              <p className="mt-2 text-center text-xs font-medium text-red-700">{scheduleJsonError}</p>
            )}

            <div
              className="mt-3 flex gap-1 rounded-lg bg-zinc-100/90 p-1"
              role="tablist"
              aria-label="Route start mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={routeInputTab === "search"}
                onClick={() => setRouteInputTab("search")}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                  routeInputTab === "search"
                    ? "bg-white text-primary-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Search map
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={routeInputTab === "schedule"}
                onClick={() => setRouteInputTab("schedule")}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                  routeInputTab === "schedule"
                    ? "bg-white text-primary-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                From schedule (JSON)
              </button>
            </div>

            {routeInputTab === "search" && (
              <>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                  <input
                    type="checkbox"
                    checked={useMyLocationStart}
                    onChange={(e) => {
                      setUseMyLocationStart(e.target.checked);
                      if (e.target.checked) {
                        setRouteFromName(null);
                        setRouteFromSearch("");
                      }
                    }}
                    className="rounded border-zinc-300 text-primary-700 focus:ring-primary-500"
                  />
                  Start from my current location
                </label>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="relative">
                    <label htmlFor="route-from" className="mb-1 block text-xs font-medium text-zinc-600">
                      From
                    </label>
                    <input
                      id="route-from"
                      type="search"
                      disabled={useMyLocationStart}
                      value={routeFromSearch}
                      onChange={(e) => {
                        setRouteFromDropdownDismissed(false);
                        setRouteFromSearch(e.target.value);
                        setRouteFromName(null);
                      }}
                      onFocus={() => setRouteFromDropdownDismissed(false)}
                      placeholder={useMyLocationStart ? "Using GPS…" : "Search start building…"}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-zinc-100 disabled:text-zinc-500"
                      autoComplete="off"
                    />
                    {!useMyLocationStart &&
                      routeFromSearch.trim() &&
                      routeFromResults.length > 0 &&
                      !routeFromDropdownDismissed && (
                      <ul className="absolute left-0 right-0 top-full z-[1200] mt-0.5 max-h-[min(22rem,50vh)] overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                        {routeFromResults.map((b) => (
                          <li key={`from-${b.name}`}>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-primary-50"
                              onClick={() => {
                                setRouteFromDropdownDismissed(true);
                                setRouteFromName(b.name);
                                setRouteFromSearch(b.name);
                              }}
                            >
                              <span className="min-w-0 truncate">{b.name}</span>
                              <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-500">
                                {b.isApartment ? "Apt" : "Campus"}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="relative">
                    <label htmlFor="route-to" className="mb-1 block text-xs font-medium text-zinc-600">
                      To
                    </label>
                    <input
                      id="route-to"
                      type="search"
                      value={routeToSearch}
                      onChange={(e) => {
                        setRouteToDropdownDismissed(false);
                        setRouteToSearch(e.target.value);
                        setRouteToName(null);
                      }}
                      onFocus={() => setRouteToDropdownDismissed(false)}
                      placeholder="Search destination building…"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      autoComplete="off"
                    />
                    {routeToSearch.trim() &&
                      routeToResults.length > 0 &&
                      !routeToDropdownDismissed && (
                      <ul className="absolute left-0 right-0 top-full z-[1200] mt-0.5 max-h-[min(22rem,50vh)] overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                        {routeToResults.map((b) => (
                          <li key={`to-${b.name}`}>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-primary-50"
                              onClick={() => {
                                setRouteToDropdownDismissed(true);
                                setRouteToName(b.name);
                                setRouteToSearch(b.name);
                              }}
                            >
                              <span className="min-w-0 truncate">{b.name}</span>
                              <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-500">
                                {b.isApartment ? "Apt" : "Campus"}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            )}

            {routeInputTab === "schedule" && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] leading-snug text-zinc-500">
                    Export must include <code className="rounded bg-zinc-100 px-1">courses</code> and{" "}
                    <code className="rounded bg-zinc-100 px-1">location.building</code> (e.g. GDC, UTC).
                  </p>
                  <button
                    type="button"
                    onClick={openScheduleFilePicker}
                    className="shrink-0 text-xs font-semibold text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-900"
                  >
                    Replace file
                  </button>
                </div>
                <div>
                  <label htmlFor="schedule-from-meeting" className="mb-1 block text-xs font-medium text-zinc-600">
                    From class location
                  </label>
                  <select
                    id="schedule-from-meeting"
                    value={scheduleSelectKey}
                    onChange={(e) => setScheduleSelectKey(e.target.value)}
                    disabled={schedulePicks.length === 0}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
                  >
                    {schedulePicks.length === 0 ? (
                      <option value="">Upload a JSON file first…</option>
                    ) : (
                      schedulePicks.map((p) => (
                        <option key={p.key} value={p.key}>
                          {schedulePickMenuLabel(p)}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label htmlFor="schedule-to-building" className="mb-1 block text-xs font-medium text-zinc-600">
                    To (building on map)
                  </label>
                  <select
                    id="schedule-to-building"
                    value={scheduleTargetBuilding}
                    onChange={(e) => setScheduleTargetBuilding(e.target.value)}
                    disabled={sortedMapBuildingNames.length === 0}
                    className="w-full max-w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
                  >
                    <option value="">
                      {sortedMapBuildingNames.length === 0
                        ? "Loading map buildings…"
                        : "Choose destination…"}
                    </option>
                    {sortedMapBuildingNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  routeInputTab === "schedule"
                    ? requestScheduleWalkingRoute()
                    : requestWalkingRoute()
                }
                disabled={routeFetching}
                className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {routeFetching ? "Calculating…" : "Show walking route"}
              </button>
              {routeSummary && (
                <button
                  type="button"
                  onClick={clearWalkingRoute}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Clear route
                </button>
              )}
            </div>

            {routeSummary && (
              <div className="mt-3 rounded-lg border border-primary-200 bg-primary-50/80 px-3 py-2 text-sm text-primary-950">
                <p className="font-medium">
                  {(routeSummary.distanceM / 1609.34).toFixed(2)} mi ·{" "}
                  {Math.max(1, Math.round(routeSummary.durationS / 60))} min walk
                </p>
                <p className="mt-0.5 text-xs text-primary-900/90">
                  {routeSummary.fromLabel} → {routeSummary.toLabel}
                </p>
              </div>
            )}
            {routeError && (
              <p className="mt-2 text-xs font-medium text-red-700">{routeError}</p>
            )}
          </div>
          )}
          </div>
        </div>
      </div>

      {/* Left panel — target building info (~25% width) */}
      {buildingPanel && (
        <aside className="absolute bottom-0 left-0 top-0 z-[1050] flex w-[min(25vw,420px)] min-w-[260px] max-w-[90vw] flex-col border-r border-zinc-200 bg-white shadow-xl">
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3">
            <h2 className="pr-2 text-sm font-semibold uppercase tracking-wide text-primary-700">
              {buildingPanel.kind === "campus" ? "Campus building" : "Apartment"}
            </h2>
            <button
              type="button"
              onClick={() => setBuildingPanel(null)}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
              aria-label="Close panel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {buildingPanel.apartment?.image_url && (
              <div className="relative mb-4 aspect-[16/10] w-full overflow-hidden rounded-xl bg-zinc-100">
                <Image
                  src={buildingPanel.apartment.image_url}
                  alt={buildingPanel.apartment.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 420px) 90vw, 25vw"
                  unoptimized
                />
              </div>
            )}
            <h3 className="text-lg font-semibold text-zinc-900">
              {String(buildingPanel.props.name ?? "Building")}
            </h3>
            {buildingPanel.kind === "campus" && (
              <p className="mt-1 text-xs text-zinc-500">
                Campus building (OpenStreetMap)—not a housing listing.
              </p>
            )}
            {addrLine(buildingPanel.props) && (
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {addrLine(buildingPanel.props)}
              </p>
            )}
            {buildingPanel.props.height != null && String(buildingPanel.props.height) !== "" && (
              <p className="mt-3 text-xs text-zinc-500">
                Height: {String(buildingPanel.props.height)}m
              </p>
            )}
            {buildingPanel.apartment && (
              <button
                type="button"
                onClick={() => setSelectedApartment(buildingPanel.apartment)}
                className="mt-5 w-full rounded-xl bg-primary-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
              >
                View apartment details
              </button>
            )}
          </div>
        </aside>
      )}

      {loading && (
        <div className="absolute bottom-5 right-5 z-[1000] rounded-full bg-black/70 px-3 py-2 text-xs text-white">
          Updating map data...
        </div>
      )}
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
}
