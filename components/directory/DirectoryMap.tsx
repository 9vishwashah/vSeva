import React, { useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Landmark, Building2 } from 'lucide-react';
import maplibregl, { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DirectoryListing, DirectoryPin, DirectoryPinKind } from '../../types';
import { getListingTags } from './listingTags';

// Free, no-API-key vector tiles — a clean/minimal basemap (land, water, main
// roads, area labels) with none of the commercial-POI clutter a raw Google
// Maps embed would show. Swap this URL if the project later adopts a paid
// tile provider (MapTiler/Stadia/etc).
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const PIN_COLORS: Record<DirectoryPinKind, string> = {
  main: '#EA580C', // saffron — the listing's own place (temple/vihar group/etc)
  upashray: '#0891B2',
  bhojanshala: '#65A30D',
  library: '#7C3AED',
};

const FACILITY_LABELS: Record<'upashray' | 'bhojanshala' | 'library', string> = {
  upashray: 'Upashray',
  bhojanshala: 'Bhojanshala',
  library: 'Library',
};

// Same "temple" glyph used for the Temple tag elsewhere, and a generic
// building/hall glyph for every attached facility — rendered once to a
// static SVG string via react-dom/server, since these markers are plain
// DOM elements MapLibre owns directly, not React-rendered.
const TEMPLE_ICON_SVG = renderToStaticMarkup(<Landmark size={17} color="#fff" strokeWidth={2.25} />);
const HALL_ICON_SVG = renderToStaticMarkup(<Building2 size={16} color="#fff" strokeWidth={2.25} />);

// A listing is one universal card, not one category — it can have its own
// place PLUS an Upashray/Bhojanshala/Library each at a different address.
// Every one of those gets its own pin here, all linking back to the same
// listing/slug, so "show me Upashrays on the map" still opens the right card.
const buildPins = (listings: DirectoryListing[]): DirectoryPin[] => {
  const pins: DirectoryPin[] = [];
  listings.forEach((l) => {
    if (l.latitude != null && l.longitude != null) {
      const tags = getListingTags(l).map((t) => t.label).join(' · ') || 'Listing';
      pins.push({ key: `${l.id}-main`, listingId: l.id, slug: l.slug, kind: 'main', label: l.name, tagLabel: tags, latitude: l.latitude, longitude: l.longitude });
    }
    (['upashray', 'bhojanshala', 'library'] as const).forEach((kind) => {
      const facility = l[kind];
      if (facility?.latitude != null && facility?.longitude != null) {
        pins.push({ key: `${l.id}-${kind}`, listingId: l.id, slug: l.slug, kind, label: facility.name || l.name, tagLabel: FACILITY_LABELS[kind], latitude: facility.latitude, longitude: facility.longitude });
      }
    });
  });
  return pins;
};

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface DirectoryMapProps {
  listings: DirectoryListing[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
  height?: string | number;
}

const DirectoryMap: React.FC<DirectoryMapProps> = ({ listings, selectedId, onSelect, className = '', height = '100%' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Record<string, MapLibreMarker>>({});
  const popupRef = useRef<maplibregl.Popup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [72.9, 19.1], // Mumbai/Navi Mumbai region — sensible default for this community
      zoom: 9,
      attributionControl: { compact: true },
    });
    mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    // MapLibre sizes its internal WebGL canvas to the container's dimensions
    // AT CONSTRUCTION TIME only — it doesn't watch for later layout changes on
    // its own. This container's final height (sticky panels, calc(100vh-...),
    // a card that grows once content loads) often isn't settled on the very
    // first paint, so without this the canvas gets stuck at a too-short size
    // while the surrounding div (and MapLibre's own DOM controls, which use
    // ordinary CSS positioning) correctly fill the rest — exactly the
    // "map cut off, blank space below" symptom this fixes.
    const resizeObserver = new ResizeObserver(() => mapRef.current?.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      popupRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const pins = buildPins(listings);

    const renderMarkers = () => {
      // Clear stale markers, then draw the current filtered set.
      Object.values(markersRef.current).forEach((m: MapLibreMarker) => m.remove());
      markersRef.current = {};

      pins.forEach((pin) => {
        const isSelected = selectedId === pin.listingId;
        const color = PIN_COLORS[pin.kind];
        const size = isSelected ? 44 : 36;

        // Classic map-pin (teardrop) shape: a circle with one square corner,
        // rotated 45°, so the pointed tip lands exactly on the coordinate —
        // much more legible at a glance than a flat dot, and each type gets
        // its own icon+color instead of every place looking the same.
        const el = document.createElement('button');
        el.type = 'button';
        el.setAttribute('aria-label', `${pin.label} — ${pin.tagLabel}`);
        el.style.cssText = `
          width:${size}px;height:${size}px;
          border-radius:50% 50% 50% 0;
          background:${color};
          border:2.5px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,0.35);
          cursor:pointer;
          transform:rotate(-45deg);
          transition:width 150ms ease,height 150ms ease;
          display:flex;align-items:center;justify-content:center;
          ${isSelected ? `outline:3px solid ${color}55;` : ''}
        `;
        const iconWrap = document.createElement('div');
        iconWrap.style.transform = 'rotate(45deg)';
        iconWrap.innerHTML = pin.kind === 'main' ? TEMPLE_ICON_SVG : HALL_ICON_SVG;
        el.appendChild(iconWrap);

        el.onclick = (e) => {
          e.stopPropagation();
          onSelect?.(pin.listingId);

          popupRef.current?.remove();
          popupRef.current = new maplibregl.Popup({ offset: 28, closeButton: true, maxWidth: '220px' })
            .setLngLat([pin.longitude, pin.latitude])
            .setHTML(
              `<div style="font-family:inherit;padding:2px 0;">
                 <p style="margin:0 0 4px;font-weight:800;font-size:13px;color:#241C17;">${escapeHtml(pin.label)}</p>
                 <span style="display:inline-block;font-size:10px;font-weight:700;color:${color};background:${color}18;padding:2px 8px;border-radius:9999px;">${escapeHtml(pin.tagLabel)}</span>
               </div>`
            )
            .addTo(map);
        };

        // anchor 'bottom' — the teardrop's pointed tip (post-rotation) sits
        // at the element's bottom-center, which must land on the coordinate.
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([pin.longitude, pin.latitude])
          .addTo(map);

        markersRef.current[pin.key] = marker;
      });
    };

    // Markers/popups are plain HTML overlays positioned via the map's camera
    // projection — that's available the instant the map is constructed, and
    // neither needs the vector tile STYLE to have finished loading. Gating
    // this behind the 'load' event (as an earlier version did) meant a slow
    // or blocked tile fetch could leave every marker missing indefinitely
    // even though the map container itself looked fine.
    renderMarkers();

    if (pins.length > 0) {
      const bounds = pins.reduce(
        (b, p) => b.extend([p.longitude, p.latitude]),
        new maplibregl.LngLatBounds([pins[0].longitude, pins[0].latitude], [pins[0].longitude, pins[0].latitude])
      );
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 300 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings]);

  // Re-style markers (selected halo) without refetching/rebuilding everything.
  useEffect(() => {
    const pins = buildPins(listings);
    pins.forEach((pin) => {
      const marker = markersRef.current[pin.key];
      if (!marker) return;
      const el = marker.getElement();
      const isSelected = selectedId === pin.listingId;
      const color = PIN_COLORS[pin.kind];
      const size = isSelected ? 44 : 36;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.outline = isSelected ? `3px solid ${color}55` : 'none';
    });

    if (selectedId) {
      const selectedPin = pins.find((p) => p.listingId === selectedId);
      if (selectedPin && mapRef.current) {
        mapRef.current.flyTo({ center: [selectedPin.longitude, selectedPin.latitude], zoom: Math.max(mapRef.current.getZoom(), 13), duration: 400 });
      }
    }
  }, [selectedId, listings]);

  return <div ref={containerRef} className={className} style={{ height, width: '100%' }} />;
};

export default DirectoryMap;
