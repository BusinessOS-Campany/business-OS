let _scrollY = 0;
const _listeners = new Set();

export function getScrollY() {
  return _scrollY;
}

export function reportScroll(y) {
  _scrollY = y;
  _listeners.forEach((fn) => { try { fn(y); } catch {} });
}

export function listen(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
