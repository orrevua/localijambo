import type maplibregl from 'maplibre-gl';

const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE_PX = 12;

/**
 * Invoke `onPlace` when the user right-clicks (desktop) or presses & holds
 * (mobile) on the map. Returns a cleanup function that detaches all listeners.
 *
 * Desktop right-click and Android long-press both surface as `contextmenu`;
 * iOS Safari does not emit it on the canvas, so we add a touch timer fallback.
 */
export function onMapLongPress(
  map: maplibregl.Map,
  onPlace: (lngLat: maplibregl.LngLat) => void,
): () => void {
  const onContextMenu = (e: maplibregl.MapMouseEvent) => {
    e.preventDefault();
    onPlace(e.lngLat);
  };
  map.on('contextmenu', onContextMenu);

  const canvas = map.getCanvasContainer();
  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  let startPt: { x: number; y: number } | null = null;

  const clearPress = () => {
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = null;
    startPt = null;
  };
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return clearPress();
    const t = e.touches[0];
    startPt = { x: t.clientX, y: t.clientY };
    pressTimer = setTimeout(() => {
      const rect = canvas.getBoundingClientRect();
      onPlace(map.unproject([startPt!.x - rect.left, startPt!.y - rect.top]));
      clearPress();
    }, LONG_PRESS_MS);
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!startPt) return;
    const t = e.touches[0];
    if (
      Math.abs(t.clientX - startPt.x) > MOVE_TOLERANCE_PX ||
      Math.abs(t.clientY - startPt.y) > MOVE_TOLERANCE_PX
    ) {
      clearPress();
    }
  };
  canvas.addEventListener('touchstart', onTouchStart);
  canvas.addEventListener('touchmove', onTouchMove);
  canvas.addEventListener('touchend', clearPress);
  canvas.addEventListener('touchcancel', clearPress);

  return () => {
    map.off('contextmenu', onContextMenu);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', clearPress);
    canvas.removeEventListener('touchcancel', clearPress);
    clearPress();
  };
}
