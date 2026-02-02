import * as d3 from 'd3';
import { nodeConfig } from '../constants.js';
import { getAllChildren } from '../treeUtils.js';

export function reorganizeBranchesAndFruitsAction({
  svgRef,
  treeDataRef,
  linkFnsRef,
}) {
  const svgEl = svgRef.current;
  if (!svgEl) return;

  const rootPath = linkFnsRef.current.rootPath;
  const rootletPath = linkFnsRef.current.rootletPath;
  const branchPath = linkFnsRef.current.branchPath;
  const branchTwigPath = linkFnsRef.current.branchTwigPath;
  if (!rootPath || !branchPath) return;

  const svg = d3.select(svgEl);
  const nodesGroup = svg.select('.nodes');
  const linksGroup = svg.select('.links');
  if (nodesGroup.empty() || linksGroup.empty()) return;

  const visibleNodeDatums = [];
  nodesGroup.selectAll('.node').each(function (nd) {
    if (this?.style?.display === 'none') return;
    visibleNodeDatums.push(nd);
  });

  const nodeById = new Map();
  for (const nd of visibleNodeDatums) {
    const id = nd?.data?.id;
    if (id != null) nodeById.set(id, nd);
  }

  const model = treeDataRef.current;
  if (!model) return;

  const trunkDatum = nodeById.get(model.id);
  if (!trunkDatum) return;

  const visibleSet = new Set(nodeById.keys());

  const parentById = new Map();
  const walk = (node, parentId) => {
    if (!node) return;
    parentById.set(node.id, parentId);
    getAllChildren(node).forEach((k) => walk(k, node.id));
  };
  walk(model, null);

  const effectiveRadius = (t) => {
    if (t === 'trunk') return 70;
    if (t === 'root') return nodeConfig.root.radius * 1.7;
    if (t === 'branch') return nodeConfig.branch.radius * 1.5;
    if (t === 'fruit') return nodeConfig.fruit.radius * 1.9;
    return 24;
  };

  const isFree = (x, y, t, placedList) => {
    const r = effectiveRadius(t);
    const pad = 16;
    for (const p of placedList) {
      const pr = effectiveRadius(p?.data?.type);
      const dx = x - (p.fx ?? 0);
      const dy = y - (p.fy ?? 0);
      const min = r + pr + pad;
      if (dx * dx + dy * dy < min * min) return false;
    }
    return true;
  };

  const findNonOverlappingNear = ({ x, y }, t, verticalDir, placedList) => {
    const stepX = 44;
    const stepY = 40;
    const maxRings = 10;

    for (let ring = 0; ring <= maxRings; ring++) {
      const yy = y + verticalDir * ring * stepY;
      for (let k = 0; k <= ring + 2; k++) {
        const dx = k * stepX;
        const c1 = { x: x + dx, y: yy };
        const c2 = { x: x - dx, y: yy };
        if (isFree(c1.x, c1.y, t, placedList)) return c1;
        if (dx && isFree(c2.x, c2.y, t, placedList)) return c2;
      }
    }
    return { x, y };
  };

  // Planar layout for visible roots (downwards).
  const groundY = (trunkDatum.fy ?? 0) + 140;
  const rootBaseY = groundY + 55;

  const rootHierarchy = d3.hierarchy(model, (n) =>
    getAllChildren(n).filter((c) => c?.type === 'root' && visibleSet.has(c.id)),
  );
  d3
    .tree()
    .nodeSize([190, 90])
    .separation((a, b) => (a.parent === b.parent ? 1.2 : 1.5))(rootHierarchy);

  const rootNodes = rootHierarchy.descendants().slice(1);
  const placedRoots = [trunkDatum];
  for (const h of rootNodes) {
    const id = h?.data?.id;
    const nd = id != null ? nodeById.get(id) : null;
    if (!nd) continue;

    const pref = {
      x: trunkDatum.fx + h.x + Math.sin(id * 0.9) * 8,
      y: rootBaseY + h.y + Math.cos(id * 0.6) * 4,
    };

    const pos = findNonOverlappingNear(pref, 'root', +1, placedRoots);
    nd.fx = pos.x;
    nd.fy = pos.y;
    nodesGroup.select(`.node-${id}`).attr('transform', `translate(${nd.fx}, ${nd.fy})`);
    if (nd?.data) nd.data.pos = { x: nd.fx, y: nd.fy };
    placedRoots.push(nd);
  }

  // Planar layout for visible branches (reduces link crossings).
  const branchHierarchy = d3.hierarchy(model, (n) =>
    getAllChildren(n).filter((c) => c?.type === 'branch' && visibleSet.has(c.id)),
  );
  d3
    .tree()
    .nodeSize([190, 90])
    .separation((a, b) => (a.parent === b.parent ? 1.15 : 1.35))(branchHierarchy);

  const branchNodes = branchHierarchy.descendants().slice(1);
  for (const h of branchNodes) {
    const id = h?.data?.id;
    const nd = id != null ? nodeById.get(id) : null;
    if (!nd) continue;
    nd.fx = trunkDatum.fx + h.x;
    nd.fy = trunkDatum.fy - h.y;
    nodesGroup.select(`.node-${id}`).attr('transform', `translate(${nd.fx}, ${nd.fy})`);
    if (nd?.data) nd.data.pos = { x: nd.fx, y: nd.fy };
  }

  const placed = visibleNodeDatums.filter((nd) => nd?.data?.type !== 'fruit'); // fruits will be repositioned

  // Reposition visible fruits under their visible parent branch (downwards), avoiding overlaps.
  const fruitsByParent = new Map();
  for (const [id, nd] of nodeById.entries()) {
    if (nd?.data?.type !== 'fruit') continue;
    const pid = parentById.get(id);
    if (pid == null) continue;
    if (!visibleSet.has(pid)) continue;
    if (!fruitsByParent.has(pid)) fruitsByParent.set(pid, []);
    fruitsByParent.get(pid).push(id);
  }

  for (const [pid, fids] of fruitsByParent.entries()) {
    const parentNd = nodeById.get(pid);
    if (!parentNd) continue;

    fids.sort((a, b) => (nodeById.get(a)?.fx ?? 0) - (nodeById.get(b)?.fx ?? 0) || a - b);

    const count = Math.max(1, fids.length);
    const mid = (count - 1) / 2;
    const baseR = 95 + Math.min(50, count * 7);

    fids.forEach((fid, i) => {
      const nd = nodeById.get(fid);
      if (!nd) return;

      const angle = Math.PI / 2 + (i - mid) * 0.32;
      const pref = {
        x: (parentNd.fx ?? 0) + Math.cos(angle) * baseR,
        y: (parentNd.fy ?? 0) + Math.sin(angle) * baseR,
      };

      const pos = findNonOverlappingNear(pref, 'fruit', +1, placed);
      nd.fx = pos.x;
      nd.fy = pos.y;
      nodesGroup.select(`.node-${fid}`).attr('transform', `translate(${nd.fx}, ${nd.fy})`);
      if (nd?.data) nd.data.pos = { x: nd.fx, y: nd.fy };
      placed.push(nd);
    });
  }

  // Recompute per-source "ports" using the (new) target positions to reduce link overlaps.
  const baseLinks = linksGroup.selectAll('.branch-link-base').data();
  const bySource = new Map();
  for (const l of baseLinks) {
    const sid = l?.source?.data?.id;
    if (!Number.isFinite(sid)) continue;
    if (!bySource.has(sid)) bySource.set(sid, []);
    bySource.get(sid).push(l);
  }
  for (const list of bySource.values()) {
    list.sort((a, b) => (a.target?.fx ?? 0) - (b.target?.fx ?? 0) || (a.target?.data?.id ?? 0) - (b.target?.data?.id ?? 0));
    const mid = (list.length - 1) / 2;
    const step = 6;
    list.forEach((l, i) => { l.portOffset = (i - mid) * step; });
  }

  // Update links after repositioning.
  linksGroup
    .selectAll('.root-link-deep-shadow, .root-link-shadow, .root-link, .root-link-edge-shadow, .root-link-texture, .root-link-texture-light, .root-link-center-highlight, .root-link-highlight, .root-link-highlight2, .root-link-specular')
    .attr('d', rootPath);
  if (rootletPath) linksGroup.selectAll('.root-rootlet, .root-rootlet-shadow, .root-rootlet-highlight').attr('d', rootletPath);
  linksGroup
    .selectAll('.branch-link-deep-shadow, .branch-link-shadow, .branch-link-base, .branch-link-edge-shadow, .branch-link-texture-dark, .branch-link-texture-light, .branch-link-center-highlight, .branch-link-highlight, .branch-link-highlight2, .branch-link-specular')
    .attr('d', branchPath);
  if (branchTwigPath) linksGroup.selectAll('.branch-twig, .branch-twig-shadow, .branch-twig-highlight').attr('d', branchTwigPath);
}
