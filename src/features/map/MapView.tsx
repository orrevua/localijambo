import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useLocation, useNavigate } from 'react-router';
import { useMap } from './useMap.ts';
import { onMapLongPress } from './mapLongPress.ts';
import { renderTreeMarkers } from './treeMarkers.ts';
import { jamboPinSvg } from './jamboPin.ts';
import { listVisible } from '../../data/treesRepo.ts';
import { onTreesChanged } from '../../sync/syncEvents.ts';
import { useAddTreeModal } from '../add-tree/useAddTreeModal.ts';
import { useTreeDetailModal } from '../tree-detail/useTreeDetailModal.ts';
import { distanceMeters, formatDistance, jamboTone, treeName } from '../../lib/jamboStatus.ts';
import type { JamboTone } from '../../lib/jamboStatus.ts';
import Icon from '../../components/Icon.tsx';
import { useI18n } from '../../i18n/useI18n.ts';
import StatusChip from '../../components/StatusChip.tsx';
import type { Tree } from '../../types/tree.ts';
import styles from './MapView.module.css';

type Status = 'loading' | 'ready' | 'error';
type Filter = 'all' | JamboTone;

const FILTERS: Filter[] = ['all', 'ripe', 'fruiting', 'flowering', 'resting'];

const FOCUS_ZOOM = 17;

export interface MapFocusState {
  focus?: { lon: number; lat: number };
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { map, locating, userPos: startPos } = useMap(containerRef);
  const { open, placing, cancelPlacing } = useAddTreeModal();
  const { open: openDetail } = useTreeDetailModal();
  const location = useLocation();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [trees, setTrees] = useState<Tree[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [filter, setFilter] = useState<Filter>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [center, setCenter] = useState<{ lon: number; lat: number } | null>(null);
  const [locatingMe, setLocatingMe] = useState(false);
  const [myPos, setMyPos] = useState<{ lon: number; lat: number } | null>(null);
  const userPos = myPos ?? startPos;

  // "You are here" dot.
  useEffect(() => {
    if (!map || !userPos) return;
    const el = document.createElement('div');
    el.className = styles.userDot;
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([userPos.lon, userPos.lat])
      .addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, userPos]);

  // Load trees, and reload whenever one is added, edited, deleted or synced.
  useEffect(() => {
    let active = true;
    const load = () => {
      listVisible()
        .then((data) => {
          if (!active) return;
          setTrees(data);
          setStatus('ready');
        })
        .catch(() => {
          if (active) setStatus('error');
        });
    };
    load();
    const off = onTreesChanged(load);
    return () => {
      active = false;
      off();
    };
  }, []);

  const visible = useMemo(
    () => (filter === 'all' ? trees : trees.filter((t) => jamboTone(t) === filter)),
    [trees, filter],
  );

  // Draw the pins for the current filter.
  useEffect(() => {
    if (!map) return;
    const markers = renderTreeMarkers(map, visible, (id) => openDetail(id));
    return () => markers.forEach((m) => m.remove());
  }, [map, visible, openDetail]);

  // Long-press / right-click still drops a jambo straight away.
  useEffect(() => {
    if (!map) return;
    return onMapLongPress(map, (lngLat) => open({ lon: lngLat.lng, lat: lngLat.lat }));
  }, [map, open]);

  // Track the map centre so the list can sort by distance.
  useEffect(() => {
    if (!map) return;
    const update = () => {
      const c = map.getCenter();
      setCenter({ lon: c.lng, lat: c.lat });
    };
    update();
    map.on('moveend', update);
    return () => {
      map.off('moveend', update);
    };
  }, [map]);

  const flyTo = useCallback(
    (p: { lon: number; lat: number }) => {
      map?.flyTo({ center: [p.lon, p.lat], zoom: Math.max(map.getZoom(), FOCUS_ZOOM) });
    },
    [map],
  );

  // Fly to a tree when arriving from "Show on map", or after saving one.
  const focus = (location.state as MapFocusState | null)?.focus;
  useEffect(() => {
    if (!map || !focus) return;
    flyTo(focus);
    navigate('.', { replace: true, state: null });
  }, [map, focus, flyTo, navigate]);

  const nearby = useMemo(() => {
    if (!center) return visible;
    return visible
      .map((t) => ({ t, d: distanceMeters(center, t) }))
      .sort((a, b) => a.d - b.d)
      .map(({ t }) => t);
  }, [visible, center]);

  function locateMe() {
    if (!map || !('geolocation' in navigator)) return;
    setLocatingMe(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lon: pos.coords.longitude, lat: pos.coords.latitude };
        setMyPos(p);
        flyTo(p);
        setLocatingMe(false);
      },
      () => setLocatingMe(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  }

  function confirmPlacement() {
    if (!map) return;
    const c = map.getCenter();
    open({ lon: c.lng, lat: c.lat });
  }

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.map} />

      {locating && (
        <div className={styles.loading}>
          <span className={styles.spinner} aria-hidden="true" />
          <p>{t.map.finding}</p>
        </div>
      )}

      {placing ? (
        <>
          <div className={styles.placeBanner} role="status">
            {t.map.placeHint}
          </div>
          <div
            className={styles.crosshair}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: jamboPinSvg('new') }}
          />
          <div className={styles.placeBar}>
            <button type="button" className="btn btn-ghost" onClick={cancelPlacing}>
              {t.map.cancel}
            </button>
            <button
              type="button"
              className={styles.fabSmall}
              onClick={locateMe}
              disabled={locatingMe}
              aria-label={t.map.locate}
            >
              <Icon name="locate" />
            </button>
            <button type="button" className="btn" onClick={confirmPlacement} disabled={!map}>
              <Icon name="check" size={20} /> {t.map.placeHere}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.filters} role="radiogroup" aria-label={t.map.filterLabel}>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={filter === f}
                className={`${styles.filter} ${filter === f ? styles.filterOn : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? t.map.all : t.tone[f]}
              </button>
            ))}
          </div>

          <div className={styles.fabs}>
            <button
              type="button"
              className={styles.fabSmall}
              onClick={locateMe}
              disabled={locatingMe}
              aria-label={t.map.locate}
            >
              <Icon name="locate" />
            </button>
          </div>

          <section className={`${styles.sheet} ${sheetOpen ? styles.sheetOpen : ''}`}>
            <button
              type="button"
              className={styles.sheetHandle}
              onClick={() => setSheetOpen((v) => !v)}
              aria-expanded={sheetOpen}
            >
              <span className={styles.grabber} aria-hidden="true" />
              <span className={styles.sheetTitle}>
                {status === 'loading'
                  ? t.map.loading
                  : status === 'error'
                    ? t.map.error
                    : visible.length === 0
                      ? filter === 'all'
                        ? t.map.empty
                        : t.map.noMatch
                      : t.map.count(visible.length)}
              </span>
              <Icon name={sheetOpen ? 'chevronDown' : 'chevronUp'} size={20} />
            </button>
            {sheetOpen && (
              <ul className={styles.sheetList}>
                {nearby.map((tree) => (
                  <li key={tree.id}>
                    <button
                      type="button"
                      className={styles.row}
                      onClick={() => {
                        flyTo(tree);
                        setSheetOpen(false);
                        openDetail(tree.id);
                      }}
                    >
                      <span
                        className={styles.rowPin}
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{ __html: jamboPinSvg(jamboTone(tree)) }}
                      />
                      <span className={styles.rowText}>
                        <span className={styles.rowName}>{treeName(tree)}</span>
                        {center && (
                          <span className={styles.rowMeta}>
                            {t.map.away(formatDistance(distanceMeters(center, tree)))}
                          </span>
                        )}
                      </span>
                      <StatusChip tree={tree} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
