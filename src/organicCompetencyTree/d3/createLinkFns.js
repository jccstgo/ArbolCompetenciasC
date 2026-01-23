import * as d3 from 'd3';

export function createLinkFns({ centerX, groundY }) {
  // Link generators
  const generateBranchPath = (d) => {
    const seed = d.target?.data?.id ?? 0;
    const portOffset = Number.isFinite(d?.portOffset) ? d.portOffset : 0;
  
    // Keep the curve mostly inside the corridor between endpoints to reduce crossings/overlaps.
    const sx = d.source.fx + portOffset;
    const sy = d.source.fy;
    const tx = d.target.fx;
    const ty = d.target.fy;
    const dx = tx - sx;
    const dy = ty - sy;
  
    const bend = Math.max(-20, Math.min(20, dx * 0.25));
    const jitter = Math.sin(seed * 0.73) * 3;
  
    const c1x = sx + bend + jitter;
    const c1y = sy + dy * 0.45;
    const c2x = tx - bend - jitter;
    const c2y = sy + dy * 0.55;
  
    return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
  };
  
  const generateRootPath = (d) => {
    const seed = d.target?.data?.id ?? 0;
  
    // Start roots from the base of the trunk, spreading outward
    let sx = d.source.fx;
    let sy = d.source.fy;
    if (d.source?.data?.type === 'trunk') {
      // Roots emerge from different points along the trunk base
      const spreadAngle = (seed % 5 - 2) * 0.3;
      sx = centerX + Math.sin(seed * 0.9 + spreadAngle) * 20;
      sy = groundY + 15;
    }
  
    const tx = d.target.fx;
    const ty = d.target.fy;
    const dx = tx - sx;
    const dy = ty - sy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  
    // More organic root path with natural curves and tapering feel
    const ampBase = 12 + Math.min(22, Math.abs(dx) * 0.15);
    const phase = seed * 0.83;
    const points = [];
    const n = 10; // More points for smoother, more organic curves
  
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      // Asymmetric ease - roots curve more at the start, straighten toward end
      const ease = Math.sin(Math.PI * t * 0.8) * (1 - t * 0.3);
      const amp = ampBase * ease;
  
      // More complex wiggle pattern for organic look
      const wiggleX = Math.sin(t * Math.PI * 2.5 + phase) * amp +
                     Math.sin(t * Math.PI * 4.1 + phase * 1.3) * (amp * 0.3);
      const wiggleY = Math.cos(t * Math.PI * 1.8 + phase * 0.7) * (amp * 0.35) +
                     Math.cos(t * Math.PI * 3.2 + phase * 0.5) * (amp * 0.15);
  
      points.push([sx + dx * t + wiggleX, sy + dy * t + wiggleY]);
    }
  
    return d3.line().curve(d3.curveBasis)(points);
  };
  
  // Generate secondary rootlet paths (small roots branching off main roots)
  const generateRootletPath = (d, side) => {
    const seed = d.target?.data?.id ?? 0;
    const mainPath = generateRootPath(d);
  
    // Get a point along the main root path (around 40-70% of the way)
    let sx = d.source.fx;
    let sy = d.source.fy;
    if (d.source?.data?.type === 'trunk') {
      sx = centerX + Math.sin(seed * 0.9) * 20;
      sy = groundY + 15;
    }
    const tx = d.target.fx;
    const ty = d.target.fy;
    const dx = tx - sx;
    const dy = ty - sy;
  
    const t = 0.4 + (seed % 3) * 0.15;
    const startX = sx + dx * t + Math.sin(seed * 1.2) * 8;
    const startY = sy + dy * t + Math.cos(seed * 0.9) * 4;
  
    // Rootlet extends perpendicular to main root direction
    const perpX = -dy / (Math.sqrt(dx * dx + dy * dy) || 1);
    const perpY = dx / (Math.sqrt(dx * dx + dy * dy) || 1);
  
    const len = 25 + (seed % 4) * 8;
    const endX = startX + perpX * side * len + (side * 10);
    const endY = startY + perpY * side * len + 15;
  
    const cpX = startX + perpX * side * (len * 0.5) + Math.sin(seed) * 5;
    const cpY = startY + perpY * side * (len * 0.5) + 8;
  
    return `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`;
  };
  
  const generateRootletPathDatum = (d) => generateRootletPath(d, d?.rootletSide ?? 1);
  
  const getLinkWidth = (d) => d.type === 'root' ? Math.max(5, 20 - d.target.depth * 3) : Math.max(4, 22 - d.target.depth * 4);
  
  // Root links: thicker near trunk, tapering toward tips
  const getRootLinkWidth = (d) => {
    const depth = d.target?.depth || 1;
    const sourceType = d.source?.data?.type;
  
    // Roots directly from trunk are thickest
    if (sourceType === 'trunk') {
      return 18;
    }
  
    // Progressive thinning
    const baseWidth = 20;
    const decayFactor = 0.6;
    const width = baseWidth * Math.pow(decayFactor, depth);
    return Math.max(5, Math.min(18, width));
  };
  
  // Significantly thicker branches near the trunk, tapering as they extend
  const getBranchLinkWidth = (d) => {
    const depth = d.target?.depth || 1;
    const sourceType = d.source?.data?.type;
  
    // Branches directly from trunk are thickest
    if (sourceType === 'trunk') {
      return 22;
    }
  
    // Progressive thinning based on depth
    // depth 1: ~22px, depth 2: ~14px, depth 3: ~9px, depth 4+: ~5-6px
    const baseWidth = 26;
    const decayFactor = 0.55; // Each level is 55% of the previous
    const width = baseWidth * Math.pow(decayFactor, depth);
    return Math.max(4, Math.min(22, width));
  };
  
  const generateBranchTwigPath = (d) => {
    const sx = d.source.fx, sy = d.source.fy;
    const tx = d.target.fx, ty = d.target.fy;
    const dx = tx - sx, dy = ty - sy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / dist, uy = dy / dist;
    const px = -uy, py = ux;
  
    const side = d.twigSide || 1;
    const startX = tx - ux * 18;
    const startY = ty - uy * 18;
    const len = Math.min(42, dist * 0.25);
    const endX = startX + px * side * len;
    const endY = startY + py * side * len;
    const cpX = (startX + endX) / 2 + ux * 10;
    const cpY = (startY + endY) / 2 + uy * 10;
  
    return `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`;
  };

  return {
    rootPath: generateRootPath,
    rootletPath: generateRootletPathDatum,
    branchPath: generateBranchPath,
    rootWidth: getRootLinkWidth,
    branchWidth: getBranchLinkWidth,
    branchTwigPath: generateBranchTwigPath,
  };
}

