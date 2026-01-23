import * as d3 from 'd3';
import { nodeConfig } from '../constants.js';
import { generateLeafPositions } from '../generateLeafPositions.js';

export function computeTreeGeometry({ treeData, width, height, centerX, groundY }) {
  // Process tree data
  const rootsData = { ...treeData, children: treeData.children?.filter(c => c.type === 'root') || [] };
  const branchesData = { ...treeData, children: treeData.children?.filter(c => c.type === 'branch') || [] };
  
  const rootLayout = d3.tree().size([width * 0.35, height * 0.22]).separation((a, b) => a.parent === b.parent ? 1.3 : 1.8);
  const branchLayout = d3
    .tree()
    .nodeSize([190, 90])
    .separation((a, b) => (a.parent === b.parent ? 1.15 : 1.35));
  
  const rootHierarchy = d3.hierarchy(rootsData);
  rootLayout(rootHierarchy);
  const rootNodes = rootHierarchy.descendants().slice(1);
  rootNodes.forEach(d => {
    const offsetX = d.x - width * 0.175;
    d.fx = centerX + offsetX * 0.85 + Math.sin(d.data.id * 1.3) * 20;
    d.fy = groundY + 50 + d.depth * 65 + Math.cos(d.data.id * 0.9) * 12;
    d.leaves = [];
  });
  
  const trunkNode = {
    data: treeData,
    fx: centerX,
    fy: groundY - 175, // Positioned higher to reveal more trunk taper
    depth: 0,
    leaves: generateLeafPositions('trunk', treeData.id)
  };
  
  const effectiveRadius = (t) => {
    if (t === 'trunk') return 85; // Larger radius for bigger canopy
    if (t === 'root') return nodeConfig.root.radius * 1.7;
    if (t === 'branch') return nodeConfig.branch.radius * 1.4;
    if (t === 'fruit') return nodeConfig.fruit.radius * 1.8;
    return 24;
  };
  
  const placed = [
    { fx: trunkNode.fx, fy: trunkNode.fy, data: trunkNode.data },
    ...rootNodes.map((n) => ({ fx: n.fx, fy: n.fy, data: n.data })),
  ];
  
  const isFree = (x, y, type) => {
    const r = effectiveRadius(type);
    const pad = 14;
    for (const p of placed) {
      const pr = effectiveRadius(p.data?.type);
      const min = r + pr + pad;
      const dx = x - p.fx;
      const dy = y - p.fy;
      if (dx * dx + dy * dy < min * min) return false;
    }
    return true;
  };
  
  const findNonOverlapping = ({ x, y }, type, verticalDir) => {
    const stepX = 46;
    const stepY = 40;
    const maxRings = 10;
  
    // Prefer minimal movement first.
    for (let ring = 0; ring <= maxRings; ring++) {
      const yy = y + verticalDir * ring * stepY;
      for (let k = 0; k <= ring + 2; k++) {
        const dx = k * stepX;
        const c1 = { x: x + dx, y: yy };
        const c2 = { x: x - dx, y: yy };
        if (isFree(c1.x, c1.y, type)) return c1;
        if (dx && isFree(c2.x, c2.y, type)) return c2;
      }
    }
  
    return { x, y };
  };
  
  // Planar branch-only hierarchy (fruits are placed under their parent branches later).
  // Keeping a strict layered layout here dramatically reduces link crossings.
  const branchHierarchy = d3.hierarchy(branchesData, (n) => (n?.children || []).filter((c) => c.type === 'branch'));
  branchLayout(branchHierarchy);
  const branchNodes = branchHierarchy.descendants().slice(1);
  
  // Place branches using the planar layout (no random jitter).
  branchNodes.forEach((d) => {
    d.fx = trunkNode.fx + d.x;
    d.fy = trunkNode.fy - d.y;
    d.leaves = generateLeafPositions('branch', d.data.id);
    placed.push({ fx: d.fx, fy: d.fy, data: d.data });
  });
  
  // Place fruits downward from their parent branch, keeping them close but non-overlapping.
  const fruitNodes = [];
  branchNodes.forEach((b) => {
    const fruits = (b?.data?.children || []).filter((c) => c?.type === 'fruit');
    if (!fruits.length) return;
  
    const count = fruits.length;
    const mid = (count - 1) / 2;
  
    fruits.forEach((fruit, i) => {
      const angle = Math.PI / 2 + (i - mid) * 0.32;
      const baseR = 90 + Math.min(40, count * 6);
      const pref = {
        x: b.fx + Math.cos(angle) * baseR,
        y: b.fy + Math.sin(angle) * baseR,
      };
      const pos = findNonOverlapping(pref, 'fruit', +1);
  
      const fn = {
        data: fruit,
        fx: pos.x,
        fy: pos.y,
        depth: b.depth + 1,
        parent: b,
        leaves: generateLeafPositions('fruit', fruit.id),
      };
      fruitNodes.push(fn);
      placed.push({ fx: fn.fx, fy: fn.fy, data: fn.data });
    });
  });
  
  const allNodes = [trunkNode, ...rootNodes, ...branchNodes, ...fruitNodes];
  
  // Build links
  const allLinks = [];
  rootNodes.filter(d => d.depth === 1).forEach(d => allLinks.push({ source: trunkNode, target: d, type: 'root' }));
  rootHierarchy.links().forEach(link => {
    if (link.source.depth >= 1) {
      const s = rootNodes.find(n => n.data.id === link.source.data.id);
      const t = rootNodes.find(n => n.data.id === link.target.data.id);
      if (s && t) allLinks.push({ source: s, target: t, type: 'root' });
    }
  });
  const branchNodeById = new Map(branchNodes.map((n) => [n.data.id, n]));
  
  branchNodes.filter(d => d.depth === 1).forEach(d => allLinks.push({ source: trunkNode, target: d, type: 'branch' }));
  branchHierarchy.links().forEach((link) => {
    if (link.source.depth >= 1) {
      const s = branchNodeById.get(link.source.data.id);
      const t = branchNodeById.get(link.target.data.id);
      if (s && t) allLinks.push({ source: s, target: t, type: 'branch' });
    }
  });
  
  // Fruit links (branch -> fruit)
  fruitNodes.forEach((fn) => {
    if (fn?.parent) allLinks.push({ source: fn.parent, target: fn, type: 'branch' });
  });
  
  return { trunkNode, rootNodes, branchNodes, fruitNodes, allNodes, allLinks };
}

