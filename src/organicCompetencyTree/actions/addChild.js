import * as d3 from 'd3';
import { nodeConfig } from '../constants.js';
import { generateLeafPositions } from '../generateLeafPositions.js';
import { getLabelWrapConfig, wrapSvgText } from '../d3/textWrap.js';
import { deepClone, defaultNameForType, findNode, getAllChildren } from '../treeUtils.js';

export function addChildIncremental({
  parentId,
  childType,
  nextId,
  treeData,
  treeDataRef,
  dimensions,
  svgRef,
  linkFnsRef,
  zoomRef,
  selectionRef,
  setTreeData,
  setNextId,
  setContextMenu,
  setStructureVersion,
  applySelectionHighlight,
  getSelectionKindForId,
}) {
  const childId = nextId;
  const child = { id: childId, name: defaultNameForType(childType), type: childType, mastery: childType === 'fruit' ? 50 : undefined };

  const parentModel = findNode(treeData, parentId);
  const parentIsCollapsed = !!parentModel && (parentModel.children?.length ?? 0) === 0 && (parentModel._children?.length ?? 0) > 0;

  setTreeData((prevData) => {
    const newData = deepClone(prevData);
    const parent = findNode(newData, parentId);
    if (!parent) return newData;

    const targetList = Array.isArray(parent.children)
      ? parent.children
      : Array.isArray(parent._children)
        ? parent._children
        : (parent.children = []);

    targetList.push(child);
    return newData;
  });

  setNextId((prev) => prev + 1);

  // If the parent is currently collapsed, keep the new node hidden until expanded.
  if (parentIsCollapsed) {
    setContextMenu(null);
    return;
  }

  const svgEl = svgRef.current;
  const rootPath = linkFnsRef.current.rootPath;
  const rootletPath = linkFnsRef.current.rootletPath;
  const branchPath = linkFnsRef.current.branchPath;
  const rootWidth = linkFnsRef.current.rootWidth;
  const branchWidth = linkFnsRef.current.branchWidth;
  const branchTwigPath = linkFnsRef.current.branchTwigPath;

  if (!svgEl || !rootPath || !branchPath || !rootWidth || !branchWidth) {
    // Fallback to a full redraw if the scene isn't initialized yet.
    setStructureVersion((v) => v + 1);
    setContextMenu(null);
    return;
  }

  const svg = d3.select(svgEl);
  const mainGroup = svg.select('.main-group');
  const linksGroup = mainGroup.select('.links');
  const nodesGroup = mainGroup.select('.nodes');

  const parentSel = svg.select(`.node-${parentId}`);
  if (mainGroup.empty() || linksGroup.empty() || nodesGroup.empty() || parentSel.empty()) {
    setStructureVersion((v) => v + 1);
    setContextMenu(null);
    return;
  }

  const parentDatum = parentSel.datum();
  const baseX = parentDatum?.fx ?? dimensions.width / 2;
  const baseY = parentDatum?.fy ?? dimensions.height * 0.58;
  const parentDepth = parentDatum?.depth ?? 0;

  const jitter = (seed) => Math.sin(seed * 1.37) * 18 + Math.cos(seed * 0.91) * 10;
  const dir = childId % 2 === 0 ? 1 : -1;

  const effectiveRadius = (t) => {
    if (t === 'trunk') return 60;
    if (t === 'root') return nodeConfig.root.radius * 1.55; // includes tendrils
    if (t === 'branch') return nodeConfig.branch.radius * 1.25;
    if (t === 'fruit') return nodeConfig.fruit.radius * 1.6; // includes apple leaf/stem
    return 20;
  };

  const getVisibleNodes = () => {
    const nodes = [];
    nodesGroup.selectAll('.node').each(function (nd) {
      const el = this;
      if (el && el.style && el.style.display === 'none') return;
      nodes.push(nd);
    });
    return nodes;
  };

  const isFree = (x, y, t, allNodes) => {
    const r = effectiveRadius(t);
    const pad = 14;
    for (const n of allNodes) {
      if (!n) continue;
      const nx = n.fx ?? 0;
      const ny = n.fy ?? 0;
      const nr = effectiveRadius(n.data?.type);
      const min = r + nr + pad;
      const dx = x - nx;
      const dy = y - ny;
      if (dx * dx + dy * dy < min * min) return false;
    }
    return true;
  };

  const findNonOverlappingPosition = (preferred, t) => {
    const allNodes = getVisibleNodes();
    // Don't collide against the node we're adding (not in list yet), but do collide against the parent too.
    const maxRings = 10;
    const stepX = 38;
    const stepY = 34;

    const candidates = [];
    const push = (x, y) => candidates.push({ x, y });

    push(preferred.x, preferred.y);

    const verticalDir = t === 'branch' ? -1 : 1;
    const baseDy = Math.abs(preferred.y - baseY);

    for (let ring = 0; ring <= maxRings; ring++) {
      const dy = baseDy + ring * stepY;
      for (let k = 0; k <= ring + 2; k++) {
        const dx = k * stepX;
        push(preferred.x + dx, baseY + verticalDir * dy);
        if (dx) push(preferred.x - dx, baseY + verticalDir * dy);
      }
    }

    for (const c of candidates) {
      if (isFree(c.x, c.y, t, allNodes)) return { fx: c.x, fy: c.y };
    }

    // Worst case: accept preferred.
    return { fx: preferred.x, fy: preferred.y };
  };

  // Preferred directions:
  // - roots: down
  // - branches: up
  // - fruits: down (from their parent branch), per request
  let prefX = baseX;
  let prefY = baseY;
  if (childType === 'root') {
    prefX = baseX + dir * (120 + jitter(childId));
    prefY = baseY + 110 + Math.abs(Math.cos(childId * 0.45)) * 28;
  } else if (childType === 'branch') {
    prefX = baseX + dir * (150 + jitter(childId));
    prefY = baseY - 135 - Math.abs(Math.sin(childId * 0.55)) * 35;
  } else {
    // fruit: create downward from the parent
    prefX = baseX + dir * (80 + jitter(childId) * 0.55);
    prefY = baseY + 120 + Math.abs(Math.sin(childId * 0.8)) * 26;
  }

  const { fx, fy } = findNonOverlappingPosition({ x: prefX, y: prefY }, childType);

  const nodeDatum = {
    data: child,
    fx,
    fy,
    depth: parentDepth + 1,
    leaves: generateLeafPositions(childType, childId),
  };

  const linkType = childType === 'root' ? 'root' : 'branch';
  const linkDatum = { source: parentDatum, target: nodeDatum, type: linkType };

  if (linkType === 'root') {
    linksGroup
      .append('path')
      .datum(linkDatum)
      .attr('class', 'root-link-shadow link')
      .attr('d', rootPath)
      .attr('fill', 'none')
      .attr('stroke', '#1A1209')
      .attr('stroke-width', (d) => rootWidth(d) + 4)
      .attr('stroke-linecap', 'round')
      .attr('stroke-opacity', 0.35)
      .attr('data-source-id', parentId)
      .attr('data-target-id', childId);

    linksGroup
      .append('path')
      .datum(linkDatum)
      .attr('class', 'root-link link')
      .attr('d', rootPath)
      .attr('fill', 'none')
      .attr('stroke', 'url(#root-link-gradient)')
      .attr('stroke-width', rootWidth)
      .attr('stroke-linecap', 'round')
      .attr('data-source-id', parentId)
      .attr('data-target-id', childId);

    linksGroup
      .append('path')
      .datum(linkDatum)
      .attr('class', 'root-link-texture link')
      .attr('d', rootPath)
      .attr('fill', 'none')
      .attr('stroke', '#2D1B0E')
      .attr('stroke-width', (d) => Math.max(1.5, rootWidth(d) * 0.18))
      .attr('stroke-linecap', 'round')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-dasharray', (d) => {
        const w = rootWidth(d);
        return `${w * 0.6} ${w * 1.4}`;
      })
      .attr('data-source-id', parentId)
      .attr('data-target-id', childId);

    linksGroup
      .append('path')
      .datum(linkDatum)
      .attr('class', 'root-link-highlight link')
      .attr('d', rootPath)
      .attr('fill', 'none')
      .attr('stroke', '#A1887F')
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', (d) => Math.max(2, rootWidth(d) * 0.35))
      .attr('stroke-linecap', 'round')
      .attr('data-source-id', parentId)
      .attr('data-target-id', childId);

    linksGroup
      .append('path')
      .datum(linkDatum)
      .attr('class', 'root-link-highlight2 link')
      .attr('d', rootPath)
      .attr('fill', 'none')
      .attr('stroke', '#BCAAA4')
      .attr('stroke-opacity', 0.2)
      .attr('stroke-width', (d) => Math.max(1, rootWidth(d) * 0.15))
      .attr('stroke-linecap', 'round')
      .attr('data-source-id', parentId)
      .attr('data-target-id', childId);

    // Small rootlets for trunk -> root links (same style as the example).
    if (parentDatum?.data?.type === 'trunk' && rootletPath) {
      const numRootlets = 2 + (childId % 2);
      for (let r = 0; r < numRootlets; r++) {
        const side = r % 2 === 0 ? 1 : -1;
        linksGroup
          .append('path')
          .datum({ ...linkDatum, rootletSide: side * (1 + r * 0.5) })
          .attr('class', 'root-rootlet link')
          .attr('d', rootletPath)
          .attr('fill', 'none')
          .attr('stroke', '#5D4037')
          .attr('stroke-width', 3 + Math.random() * 2)
          .attr('stroke-linecap', 'round')
          .attr('stroke-opacity', 0.7)
          .attr('data-source-id', parentId)
          .attr('data-target-id', childId);
      }
    }
  } else {
    const baseW = branchWidth(linkDatum);

    // Shadow layer
    linksGroup
      .append('path')
      .datum(linkDatum)
      .attr('class', 'branch-link branch-link-shadow link')
      .attr('d', branchPath)
      .attr('fill', 'none')
      .attr('stroke', '#2D1B0E')
      .attr('stroke-width', baseW + 4)
      .attr('stroke-linecap', 'round')
      .attr('stroke-opacity', 0.4)
      .attr('data-source-id', parentId)
      .attr('data-target-id', childId);

    // Main bark layer
    linksGroup
      .append('path')
      .datum(linkDatum)
      .attr('class', 'branch-link branch-link-base link')
      .attr('d', branchPath)
      .attr('fill', 'none')
      .attr('stroke', 'url(#branch-bark-gradient)')
      .attr('stroke-width', baseW)
      .attr('stroke-linecap', 'round')
      .attr('data-source-id', parentId)
      .attr('data-target-id', childId);

    // Bark texture
    linksGroup
      .append('path')
      .datum(linkDatum)
      .attr('class', 'branch-link branch-link-texture-dark link')
      .attr('d', branchPath)
      .attr('fill', 'none')
      .attr('stroke', '#3E2723')
      .attr('stroke-width', Math.max(1, baseW * 0.15))
      .attr('stroke-linecap', 'round')
      .attr('stroke-opacity', 0.35)
      .attr('stroke-dasharray', `${baseW * 0.8} ${baseW * 1.2}`)
      .attr('data-source-id', parentId)
      .attr('data-target-id', childId);

    // Highlight layer
    linksGroup
      .append('path')
      .datum(linkDatum)
      .attr('class', 'branch-link branch-link-highlight link')
      .attr('d', branchPath)
      .attr('fill', 'none')
      .attr('stroke', '#A1887F')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', Math.max(2, baseW * 0.4))
      .attr('stroke-linecap', 'round')
      .attr('data-source-id', parentId)
      .attr('data-target-id', childId);

    // Secondary highlight
    linksGroup
      .append('path')
      .datum(linkDatum)
      .attr('class', 'branch-link branch-link-highlight2 link')
      .attr('d', branchPath)
      .attr('fill', 'none')
      .attr('stroke', '#BCAAA4')
      .attr('stroke-opacity', 0.25)
      .attr('stroke-width', Math.max(1, baseW * 0.2))
      .attr('stroke-linecap', 'round')
      .attr('data-source-id', parentId)
      .attr('data-target-id', childId);

    // "Sap flow" overlay: hidden by default and activated by selection styling.
    linksGroup
      .append('path')
      .datum(linkDatum)
      .attr('class', 'branch-sap-flow sap-flow link')
      .attr('d', branchPath)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255, 213, 79, 0.75)')
      .attr('stroke-width', (d) => Math.max(1.7, Math.min(3.8, branchWidth(d) * 0.22)))
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', (d) => {
        const w = branchWidth(d);
        const on = Math.max(8, w * 0.42);
        const off = Math.max(18, w * 1.35);
        return `${on} ${off}`;
      })
      .style('--sap-speed', (d) => {
        const seed = d?.target?.data?.id ?? 0;
        const base = 1.55 + (seed % 5) * 0.08;
        return `${base.toFixed(2)}s`;
      })
      .attr('data-source-id', parentId)
      .attr('data-target-id', childId);

    if (parentDatum?.data?.type === 'branch' && childType === 'branch' && linkFnsRef.current.branchTwigPath) {
      const twigDatum = { ...linkDatum, twigSide: childId % 2 === 0 ? 1 : -1 };

      linksGroup
        .append('path')
        .datum(twigDatum)
        .attr('class', 'branch-twig link')
        .attr('d', linkFnsRef.current.branchTwigPath)
        .attr('fill', 'none')
        .attr('stroke', '#3E2723')
        .attr('stroke-opacity', 0.7)
        .attr('stroke-width', Math.max(1.8, baseW * 0.28))
        .attr('stroke-linecap', 'round')
        .attr('data-source-id', parentId)
        .attr('data-target-id', childId);

      linksGroup
        .append('path')
        .datum(twigDatum)
        .attr('class', 'twig-sap-flow sap-flow link')
        .attr('d', linkFnsRef.current.branchTwigPath)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255, 235, 170, 0.6)')
        .attr('stroke-width', (d) => Math.max(1.3, Math.min(3.0, branchWidth(d) * 0.18)))
        .attr('stroke-linecap', 'round')
        .attr('stroke-dasharray', (d) => {
          const w = branchWidth(d);
          const on = Math.max(6, w * 0.34);
          const off = Math.max(14, w * 1.15);
          return `${on} ${off}`;
        })
        .style('--sap-speed', (d) => {
          const seed = (d?.target?.data?.id ?? 0) + 3;
          const base = 1.35 + (seed % 7) * 0.08;
          return `${base.toFixed(2)}s`;
        })
        .attr('data-source-id', parentId)
        .attr('data-target-id', childId);
    }

    // Recompute small per-child "ports" for this source to reduce link overlaps near the parent.
    try {
      const siblings = linksGroup
        .selectAll('.branch-link-base')
        .filter(function () { return Number(this.dataset?.sourceId) === parentId; })
        .data();

      siblings.sort((a, b) => (a.target?.fx ?? 0) - (b.target?.fx ?? 0) || (a.target?.data?.id ?? 0) - (b.target?.data?.id ?? 0));
      const mid = (siblings.length - 1) / 2;
      const step = 6;
      siblings.forEach((l, i) => { l.portOffset = (i - mid) * step; });

      linksGroup
        .selectAll('.branch-link, .branch-sap-flow')
        .filter(function () { return Number(this.dataset?.sourceId) === parentId; })
        .attr('d', branchPath);

      if (branchTwigPath) {
        linksGroup
          .selectAll('.branch-twig, .twig-sap-flow')
          .filter(function () { return Number(this.dataset?.sourceId) === parentId; })
          .attr('d', branchTwigPath);
      }
    } catch {
      // noop
    }
  }

  const nodeGroup = nodesGroup
    .append('g')
    .datum(nodeDatum)
    .attr('class', `node node-${childId} node-type-${childType}`)
    .attr('transform', `translate(${fx}, ${fy})`)
    .style('cursor', 'grab')
    .style('display', null);

  // Foliage
  if (nodeDatum.leaves?.length) {
    const foliageGroup = nodeGroup.append('g').attr('class', 'foliage');
    nodeDatum.leaves.forEach((leaf, i) => {
      const seed = ((childId ?? 0) * 9973 + i * 1013) % 1000;
      const swayRot = 5.0 + (seed % 9) * 0.58; // ~5.0deg..10.2deg
      const swayX = ((seed % 7) - 3) * 0.75; // ~-2.25px..2.25px
      const swayY = -1.65 + ((seed % 5) - 2) * 0.36; // ~-2.37px..-0.93px
      const dur = 3.6 + (seed % 100) / 100 * 2.1; // 3.6s..5.7s
      const delay = ((leaf.delay ?? 0) + i * 60) / 1000;

      foliageGroup
        .append('ellipse')
        .attr('class', 'breeze-leaf')
        .attr('cx', leaf.x)
        .attr('cy', leaf.y)
        .attr('rx', 0)
        .attr('ry', 0)
        .attr('opacity', 0)
        .attr('fill', leaf.color)
        .style('--leaf-rot', `${leaf.rotation}deg`)
        .style('--sway-rot', `${swayRot}deg`)
        .style('--sway-x', `${swayX}px`)
        .style('--sway-y', `${swayY}px`)
        .style('--breeze-duration', `${dur.toFixed(2)}s`)
        .style('--breeze-delay', `${delay.toFixed(2)}s`)
        .transition()
        .duration(450)
        .attr('rx', leaf.rx)
        .attr('ry', leaf.ry)
        .attr('opacity', 0.85);
    });
  }

  // Glow ring
  nodeGroup
    .append('circle')
    .attr('class', 'glow-ring')
    .attr('r', (nodeConfig[childType].radius || 14) + 10)
    .attr('cy', 0)
    .attr('fill', 'none')
    .attr('stroke', childType === 'fruit' ? '#FFC107' : childType === 'root' ? '#8D6E63' : '#81C784')
    .attr('stroke-width', 3)
    .attr('opacity', 0)
    .style('pointer-events', 'none');

  // Shape per type
  if (childType === 'root') {
    const rootGroup = nodeGroup.append('g').attr('class', 'node-shape root-shape');
    rootGroup
      .append('ellipse')
      .attr('class', 'root-body')
      .attr('rx', 0)
      .attr('ry', 0)
      .attr('fill', 'url(#root-node-gradient)')
      .attr('stroke', '#3E2723')
      .attr('stroke-width', 2)
      .transition()
      .duration(500)
      .attr('rx', nodeConfig.root.radius)
      .attr('ry', nodeConfig.root.radius * 0.85);

    const r = nodeConfig.root.radius;
    for (let i = 0; i < 4; i++) {
      const a = -0.9 + (i / 3) * 1.8 + Math.sin(childId * 0.6 + i) * 0.12;
      const len = r * (1.4 + (i % 2) * 0.35) + Math.abs(Math.cos(childId * 0.9 + i)) * r * 0.6;
      const x0 = Math.sin(a) * r * 0.55;
      const y0 = r * 0.55;
      const x1 = x0 + Math.sin(a) * len * 0.35;
      const y1 = y0 + len * 0.55;
      const x2 = x0 + Math.sin(a) * len * 0.7 + Math.sin(childId * 0.8 + i * 1.7) * (r * 0.25);
      const y2 = y0 + len;

      rootGroup
        .append('path')
        .attr('class', 'root-tendril')
        .attr('d', `M ${x0} ${y0} Q ${x1} ${y1} ${x2} ${y2}`)
        .attr('fill', 'none')
        .attr('stroke', '#3E2723')
        .attr('stroke-width', 1.6)
        .attr('stroke-linecap', 'round')
        .attr('opacity', 0)
        .transition()
        .duration(500)
        .attr('opacity', 0.85);
    }
  } else if (childType === 'branch') {
    nodeGroup
      .append('circle')
      .attr('class', 'node-shape')
      .attr('fill', 'url(#leaf-gradient)')
      .attr('stroke', '#2E7D32')
      .attr('stroke-width', 2)
      .attr('r', 0)
      .transition()
      .duration(500)
      .attr('r', nodeConfig.branch.radius);
  } else if (childType === 'fruit') {
    const applePath = (r) => {
      const w = r * 1.15;
      const h = r * 1.3;
      const top = -h * 0.75;
      const bottom = h * 0.78;
      const left = -w;
      const right = w;
      const notch = h * 0.18;

      return [
        `M 0 ${top}`,
        `C ${-w * 0.35} ${top - notch}, ${left} ${-h * 0.45}, ${left} ${-h * 0.05}`,
        `C ${left} ${h * 0.55}, ${-w * 0.45} ${bottom}, 0 ${bottom}`,
        `C ${w * 0.45} ${bottom}, ${right} ${h * 0.55}, ${right} ${-h * 0.05}`,
        `C ${right} ${-h * 0.45}, ${w * 0.35} ${top - notch}, 0 ${top}`,
        'Z',
      ].join(' ');
    };

    const appleGroup = nodeGroup.append('g').attr('class', 'node-shape fruit-apple').attr('filter', 'url(#fruit-glow)');
    appleGroup
      .append('path')
      .attr('class', 'apple-body')
      .attr('d', applePath(nodeConfig.fruit.radius))
      .attr('fill', 'url(#fruit-gradient)')
      .attr('stroke', '#8E1B1B')
      .attr('stroke-width', 2);
    appleGroup
      .append('path')
      .attr('class', 'apple-stem')
      .attr('d', () => {
        const r = nodeConfig.fruit.radius;
        return `M ${r * 0.05} ${-r * 1.05} C ${r * 0.15} ${-r * 1.35}, ${r * 0.35} ${-r * 1.45}, ${r * 0.25} ${-r * 1.7}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#5D4037')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round');
    appleGroup
      .append('ellipse')
      .attr('class', 'apple-leaf')
      .attr('cx', nodeConfig.fruit.radius * 0.42)
      .attr('cy', -nodeConfig.fruit.radius * 1.45)
      .attr('rx', nodeConfig.fruit.radius * 0.45)
      .attr('ry', nodeConfig.fruit.radius * 0.22)
      .attr('fill', 'url(#leaf-gradient)')
      .attr('stroke', '#1B5E20')
      .attr('stroke-width', 1.5)
      .attr('transform', `rotate(-25 ${nodeConfig.fruit.radius * 0.42} ${-nodeConfig.fruit.radius * 1.45})`);

    appleGroup.attr('transform', 'scale(0)').transition().duration(550).attr('transform', 'scale(1)');
  }

  // Symbol (skip empty ones, e.g. fruit)
  if (nodeConfig[childType].symbol) {
    nodeGroup
      .append('text')
      .attr('class', 'node-symbol')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', nodeConfig[childType].fontSize)
      .attr('fill', childType === 'root' ? '#E8E8E8' : childType === 'fruit' ? '#FFF8E1' : '#E8F5E9')
      .attr('pointer-events', 'none')
      .attr('opacity', 0)
      .text(nodeConfig[childType].symbol)
      .transition()
      .duration(350)
      .attr('opacity', 1);
  }

  // Label
  const labelDy = childType === 'root' ? nodeConfig.root.radius + 12 : nodeConfig[childType].radius + 12;
  const labelSel = nodeGroup
    .append('text')
    .attr('class', `node-label node-label-${childId}`)
    .attr('text-anchor', 'middle')
    .attr('dy', labelDy)
    .attr('fill', '#E8E8E8')
    .attr('font-size', '9px')
    .attr('font-weight', '400')
    .attr('font-family', 'Georgia, serif')
    .attr('pointer-events', 'none')
    .attr('stroke', 'rgba(0,0,0,0.75)')
    .attr('stroke-width', 3)
    .style('paint-order', 'stroke')
    .text(child.name);
  wrapSvgText(labelSel, getLabelWrapConfig(childType));

  // Title tooltip
  nodeGroup.append('title').text(childType === 'fruit' && child.mastery !== undefined ? `${child.name} — ${child.mastery}%` : child.name);

  // Mastery badge for fruit
  if (childType === 'fruit' && child.mastery !== undefined) {
    const badge = nodeGroup.append('g').attr('class', `mastery-badge mastery-badge-${childId}`).attr('pointer-events', 'none');
    badge
      .append('rect')
      .attr('class', `mastery-badge-bg mastery-badge-bg-${childId}`)
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', 'rgba(13,27,42,0.85)')
      .attr('stroke', 'rgba(255,193,7,0.55)')
      .attr('stroke-width', 1);

    const t = badge
      .append('text')
      .attr('class', `mastery-label mastery-label-${childId}`)
      .attr('text-anchor', 'middle')
      .attr('dy', -nodeConfig.fruit.radius - 10)
      .attr('fill', '#FFC107')
      .attr('font-size', '12px')
      .attr('font-weight', 800)
      .attr('font-family', 'monospace')
      .attr('stroke', 'rgba(0,0,0,0.8)')
      .attr('stroke-width', 3)
      .style('paint-order', 'stroke')
      .text(`${child.mastery}%`);

    const bbox = t.node()?.getBBox?.();
    if (bbox) {
      badge
        .select('rect')
        .attr('x', bbox.x - 6)
        .attr('y', bbox.y - 3)
        .attr('width', bbox.width + 12)
        .attr('height', bbox.height + 6);
    }
  }

  // Large invisible hit-area so taps/drags work anywhere on the node (Safari/iPad friendly).
  // Add it last so it sits above all node art and reliably receives touch events.
  const hitArea = nodeGroup
    .append('circle')
    .attr('class', 'node-hit-area')
    .attr('cx', 0)
    .attr('cy', childType === 'fruit' ? -8 : 0)
    .attr('r', () => {
      if (childType === 'root') return nodeConfig.root.radius * 2.7;
      if (childType === 'branch') return nodeConfig.branch.radius * 3.0;
      if (childType === 'fruit') return nodeConfig.fruit.radius * 3.4;
      return 44;
    })
    .attr('fill', 'rgba(0,0,0,0.001)')
    .style('pointer-events', 'all')
    .style('cursor', 'grab');

  // Interactions for the newly added node
  const collectSubtreeIdsFromModel = (nodeId) => {
    const model = treeDataRef?.current || treeData;
    const modelRoot = findNode(model, nodeId);
    if (!modelRoot) return [nodeId];
    const ids = [];
    const stack = [modelRoot];
    while (stack.length) {
      const next = stack.pop();
      if (!next) continue;
      ids.push(next.id);
      stack.push(...getAllChildren(next));
    }
    return ids;
  };

  const getSvgPixelPoint = (dragEvent) => {
    const se = dragEvent?.sourceEvent ?? dragEvent;
    const pt = d3.pointer(se, svgEl);
    if (Number.isFinite(pt?.[0]) && Number.isFinite(pt?.[1])) return pt;

    const rect = svgEl.getBoundingClientRect();
    const t = se?.touches?.[0] || se?.changedTouches?.[0];
    if (t && Number.isFinite(t.clientX) && Number.isFinite(t.clientY)) {
      return [t.clientX - rect.left, t.clientY - rect.top];
    }

    if (Number.isFinite(se?.clientX) && Number.isFinite(se?.clientY)) {
      return [se.clientX - rect.left, se.clientY - rect.top];
    }

    return [0, 0];
  };

  const dragBehavior = d3.drag()
    .filter((event) => {
      // Avoid starting drag during pinch-zoom (multi-touch).
      if (event?.touches) return event.touches.length === 1;
      // Keep d3's default mouse filter behavior (only primary button, no ctrl).
      return !event?.ctrlKey && !event?.button;
    })
    .on('start', function (event, d) {
      event.sourceEvent?.stopPropagation?.();
      event.sourceEvent?.preventDefault?.();
      setContextMenu(null);
      applySelectionHighlight(d?.data?.id);
      const nodeEl = this?.closest?.('.node') || this?.parentNode;
      const nodeSel = nodeEl ? d3.select(nodeEl) : d3.select(this);
      nodeSel.raise().style('cursor', 'grabbing');
      nodeSel.select('.glow-ring').transition().duration(150).attr('opacity', 0.6);
      const transform = zoomRef.current || d3.zoomIdentity;
      d.dragStartX = d.fx; d.dragStartY = d.fy;
      const [px, py] = getSvgPixelPoint(event);
      d.mouseStartX = (px - transform.x) / transform.k;
      d.mouseStartY = (py - transform.y) / transform.k;

      const subtreeIds = collectSubtreeIdsFromModel(d.data.id);
      const nodesSel = nodesGroup.selectAll(subtreeIds.map((id) => `.node-${id}`).join(', '));
      const subtree = [];
      nodesSel.each(function (nd) {
        subtree.push({ el: this, d: nd, startFx: nd.fx, startFy: nd.fy });
      });
      d.subtreeDrag = { subtree, dragStartX: d.fx, dragStartY: d.fy };
    })
    .on('drag', function (event, d) {
      const transform = zoomRef.current || d3.zoomIdentity;
      const [px, py] = getSvgPixelPoint(event);
      const mx = (px - transform.x) / transform.k;
      const my = (py - transform.y) / transform.k;
      d.fx = d.dragStartX + (mx - d.mouseStartX);
      d.fy = d.dragStartY + (my - d.mouseStartY);

      const deltaX = d.subtreeDrag ? d.fx - d.subtreeDrag.dragStartX : 0;
      const deltaY = d.subtreeDrag ? d.fy - d.subtreeDrag.dragStartY : 0;

      if (d.subtreeDrag?.subtree?.length) {
        for (const item of d.subtreeDrag.subtree) {
          item.d.fx = item.startFx + deltaX;
          item.d.fy = item.startFy + deltaY;
          d3.select(item.el).attr('transform', `translate(${item.d.fx}, ${item.d.fy})`);
        }
      } else {
        const nodeEl = this?.closest?.('.node') || this?.parentNode;
        const nodeSel = nodeEl ? d3.select(nodeEl) : d3.select(this);
        nodeSel.attr('transform', `translate(${d.fx}, ${d.fy})`);
      }

      linksGroup.selectAll('.root-link-deep-shadow, .root-link-shadow, .root-link, .root-link-edge-shadow, .root-link-texture, .root-link-texture-light, .root-link-center-highlight, .root-link-highlight, .root-link-highlight2, .root-link-specular').attr('d', rootPath);
      if (rootletPath) linksGroup.selectAll('.root-rootlet, .root-rootlet-shadow, .root-rootlet-highlight').attr('d', rootletPath);
      linksGroup.selectAll('.branch-link-deep-shadow, .branch-link-shadow, .branch-link-base, .branch-link-edge-shadow, .branch-link-texture-dark, .branch-link-texture-light, .branch-link-center-highlight, .branch-link-highlight, .branch-link-highlight2, .branch-link-specular, .branch-sap-flow').attr('d', branchPath);
      if (branchTwigPath) linksGroup.selectAll('.branch-twig, .branch-twig-shadow, .branch-twig-highlight, .twig-sap-flow').attr('d', branchTwigPath);
    })
    .on('end', function (_event, d) {
      const nodeEl = this?.closest?.('.node') || this?.parentNode;
      const nodeSel = nodeEl ? d3.select(nodeEl) : d3.select(this);
      nodeSel.style('cursor', 'grab');
      const kind = getSelectionKindForId(d?.data?.id);
      const baseOpacity = kind ? (kind === 'selected' ? 0.95 : kind === 'desc' ? 0.72 : 0.66) : 0;
      nodeSel.select('.glow-ring').transition().duration(200).attr('opacity', baseOpacity);
      d.subtreeDrag = null;
    });

  hitArea.call(dragBehavior);

  nodeGroup
    .on('mouseenter', function (_event, d) {
      const kind = getSelectionKindForId(d?.data?.id);
      const opacity = kind ? (kind === 'selected' ? 1 : 0.9) : 0.55;
      d3.select(this).select('.glow-ring').transition().duration(120).attr('opacity', opacity);
    })
    .on('mouseleave', function (_event, d) {
      const kind = getSelectionKindForId(d?.data?.id);
      const baseOpacity = kind ? (kind === 'selected' ? 0.95 : kind === 'desc' ? 0.72 : 0.66) : 0;
      d3.select(this).select('.glow-ring').transition().duration(120).attr('opacity', baseOpacity);
    })
    .on('click', function (event, d) {
      event.stopPropagation();
      setContextMenu(null);
      applySelectionHighlight(d?.data?.id);
    })
    .on('contextmenu', function (event, d) {
      event.preventDefault(); event.stopPropagation();
      const rect = svgEl.getBoundingClientRect();
      setContextMenu({ x: event.clientX - rect.left, y: event.clientY - rect.top, nodeId: d.data.id, nodeType: d.data.type, nodeName: d.data.name, mastery: d.data.mastery });
    });

  // Ensure selection highlight is applied to the newly created node if needed.
  applySelectionHighlight(selectionRef.current.selectedId);
  setContextMenu(null);
}
