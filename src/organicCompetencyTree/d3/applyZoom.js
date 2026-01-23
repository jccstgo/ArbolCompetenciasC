import * as d3 from 'd3';

export function applyInitialOrSavedZoom({
  svg,
  zoomBehavior,
  zoomRef,
  isFirstRender,
  savedTransform,
  width,
  height,
  centerX,
  groundY,
  linksGroup,
  nodesGroup,
}) {
  // Apply zoom: either restore saved transform or calculate initial
  if (isFirstRender.current) {
    // First render: calculate optimal zoom
    setTimeout(() => {
      const safeBBox = (node) => {
        if (!node) return null;
        try {
          const b = node.getBBox();
          if (!b || !isFinite(b.x) || !isFinite(b.y) || !isFinite(b.width) || !isFinite(b.height)) return null;
          if (b.width <= 0 || b.height <= 0) return null;
          return { x: b.x, y: b.y, width: b.width, height: b.height };
        } catch {
          return null;
        }
      };
  
      // IMPORTANT: don't use `mainGroup.getBBox()` because it includes the background rect.
      const boxes = [safeBBox(linksGroup.node()), safeBBox(nodesGroup.node())].filter(Boolean);
      const bounds = boxes.reduce(
        (acc, b) => {
          if (!acc) return { x: b.x, y: b.y, width: b.width, height: b.height };
          const x1 = Math.min(acc.x, b.x);
          const y1 = Math.min(acc.y, b.y);
          const x2 = Math.max(acc.x + acc.width, b.x + b.width);
          const y2 = Math.max(acc.y + acc.height, b.y + b.height);
          return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
        },
        null,
      ) || { x: centerX - 1, y: groundY - 1, width: 2, height: 2 };
  
      const paddingX = 80;
      const paddingY = 120;
      const rawScale = Math.min((width - paddingX) / bounds.width, (height - paddingY) / bounds.height);
      const scale = Math.max(0.8, Math.min(rawScale * 1.35, 2.6));
      const tx = (width - bounds.width * scale) / 2 - bounds.x * scale;
      const ty = (height - bounds.height * scale) / 2 - bounds.y * scale;
      const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(scale);
      zoomRef.current = initialTransform;
      svg.transition().duration(1000).call(zoomBehavior.transform, initialTransform);
      isFirstRender.current = false;
    }, 100);
  } else if (savedTransform) {
    // Subsequent renders: restore saved transform immediately
    svg.call(zoomBehavior.transform, savedTransform);
  }
}
