import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import initialData from './initialData.js';
import { nodeConfig, typeLabels } from './constants.js';
import { generateLeafPositions } from './generateLeafPositions.js';
import {
  countNodes,
  deepClone,
  defaultNameForType,
  findNode,
  findParent,
  getMasteryLevel,
  getMenuOptions,
} from './treeUtils.js';
import ContextMenu from './ui/ContextMenu.jsx';
import DeleteModal from './ui/DeleteModal.jsx';
import Legend from './ui/Legend.jsx';
import MasteryModal from './ui/MasteryModal.jsx';
import RenameModal from './ui/RenameModal.jsx';
import Stats from './ui/Stats.jsx';
import TreeHeader from './ui/TreeHeader.jsx';

// ============================================
// ORGANIC COMPETENCY TREE v10.0
// Preserves zoom on structure changes
// ============================================

// NOTE: Configuration/data/utilities live in `src/organicCompetencyTree/*`.

const getLabelWrapConfig = (nodeType) => {
  if (nodeType === 'trunk') return { maxWidth: 220, maxLines: 20, lineHeight: 1.15 };
  if (nodeType === 'root') return { maxWidth: 140, maxLines: 20, lineHeight: 1.15 };
  if (nodeType === 'branch') return { maxWidth: 150, maxLines: 20, lineHeight: 1.15 };
  return { maxWidth: 130, maxLines: 20, lineHeight: 1.15 }; // fruit
};

const wrapSvgText = (textSel, { maxWidth, maxLines, lineHeight }) => {
  textSel.each(function () {
    const text = d3.select(this);
    const raw = text.text() || '';
    const words = raw.split(/\s+/).filter(Boolean);

    const fontSize = parseFloat(text.attr('font-size')) || 12;
    const lineHeightPx = Math.max(1, fontSize * (lineHeight || 1.15));

    const fits = (tspan, value) => {
      tspan.text(value);
      return tspan.node()?.getComputedTextLength?.() <= maxWidth;
    };

    const splitLongWord = (probeTspan, word) => {
      const parts = [];
      let remaining = word;
      while (remaining.length > 0) {
        let lo = 1;
        let hi = remaining.length;
        let best = 1;
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          if (fits(probeTspan, remaining.slice(0, mid))) {
            best = mid;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }
        parts.push(remaining.slice(0, best));
        remaining = remaining.slice(best);
      }
      return parts;
    };

    text.text(null);

    // Keep existing dy on the <text>. tspans start at dy=0 and then step down in px.
    let tspan = text.append('tspan').attr('x', 0).attr('dy', 0);
    let line = [];
    let lineCount = 1;

    const probe = text.append('tspan').attr('x', 0).attr('dy', 0).style('opacity', 0);

    const commitLine = () => {
      tspan.text(line.join(' '));
      line = [];
      lineCount += 1;
      if (maxLines && lineCount > maxLines) return false;
      tspan = text.append('tspan').attr('x', 0).attr('dy', lineHeightPx);
      return true;
    };

    for (const word of words) {
      const test = line.length ? `${line.join(' ')} ${word}` : word;

      if (fits(probe, test)) {
        line.push(word);
        continue;
      }

      if (line.length) {
        if (!commitLine()) break;
      }

      // Word may still not fit on an empty line => split it.
      if (!fits(probe, word)) {
        const parts = splitLongWord(probe, word);
        for (const part of parts) {
          line = [part];
          if (!commitLine()) break;
        }
        continue;
      }

      line.push(word);
    }

    if (line.length) tspan.text(line.join(' '));

    probe.remove();
    text.selectAll('tspan').filter(function () { return !this.textContent; }).remove();
  });
};

export default function OrganicCompetencyTree() {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const zoomRef = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const isFirstRender = useRef(true);
  const linkFnsRef = useRef({ rootPath: null, branchPath: null, rootWidth: null, branchWidth: null });
  const treeDataRef = useRef(null);
  const selectionRef = useRef({ selectedId: null, descendants: new Set(), ancestors: new Set() });
  
  const [treeData, setTreeData] = useState(initialData);
  const [contextMenu, setContextMenu] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [nextId, setNextId] = useState(100);
  const [structureVersion, setStructureVersion] = useState(0);
  
  const [renameModal, setRenameModal] = useState({ isOpen: false, nodeId: null, currentName: '', nodeType: '' });
  const [masteryModal, setMasteryModal] = useState({ isOpen: false, nodeId: null, currentMastery: 50, nodeName: '' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, nodeId: null, nodeName: '' });
  
  const [renameValue, setRenameValue] = useState('');
  const [masteryValue, setMasteryValue] = useState(50);

  useEffect(() => { treeDataRef.current = treeData; }, [treeData]);

  const getSelectionKindForId = useCallback((id) => {
    const sel = selectionRef.current;
    if (!sel?.selectedId) return null;
    if (id === sel.selectedId) return 'selected';
    if (sel.descendants?.has?.(id)) return 'desc';
    if (sel.ancestors?.has?.(id)) return 'anc';
    return null;
  }, []);

  const applySelectionHighlight = useCallback((selectedId) => {
    const svgEl = svgRef.current;
    const model = treeDataRef.current;
    if (!svgEl || !model) return;

    const svg = d3.select(svgEl);
    const nodesGroup = svg.select('.nodes');
    if (nodesGroup.empty()) return;

    const childrenAll = (n) =>
      [
        ...(Array.isArray(n?.children) ? n.children : []),
        ...(Array.isArray(n?._children) ? n._children : []),
      ].filter(Boolean);

    const setDefaults = () => {
      selectionRef.current = { selectedId: null, descendants: new Set(), ancestors: new Set() };
      nodesGroup.selectAll('.node').each(function (d) {
        const g = d3.select(this);
        g.classed('hl-desc', false).classed('hl-anc', false).classed('hl-selected', false).style('filter', null);
        const ring = g.select('.glow-ring');
        if (!ring.empty()) {
          const t = d?.data?.type;
          const stroke = t === 'fruit' ? '#FFC107' : t === 'root' ? '#8D6E63' : '#81C784';
          ring.attr('stroke', stroke).attr('stroke-width', 3).attr('opacity', 0);
        }
      });
    };

    if (!selectedId) {
      setDefaults();
      return;
    }

    // If the selected node isn't visible, clear selection to avoid "phantom" highlights.
    const selectedEl = nodesGroup.select(`.node-${selectedId}`);
    if (selectedEl.empty() || selectedEl.node()?.style?.display === 'none') {
      setDefaults();
      return;
    }

    const parentById = new Map();
    const walkParents = (node, parentId) => {
      if (!node) return;
      parentById.set(node.id, parentId);
      childrenAll(node).forEach((k) => walkParents(k, node.id));
    };
    walkParents(model, null);

    const selectedModel = findNode(model, selectedId);
    if (!selectedModel) {
      setDefaults();
      return;
    }

    const descendants = new Set([selectedId]);
    const stack = [...childrenAll(selectedModel)];
    while (stack.length) {
      const next = stack.pop();
      if (!next) continue;
      descendants.add(next.id);
      stack.push(...childrenAll(next));
    }

    const ancestors = new Set();
    let cur = selectedId;
    while (true) {
      const pid = parentById.get(cur);
      if (!pid) break;
      ancestors.add(pid);
      cur = pid;
    }

    selectionRef.current = { selectedId, descendants, ancestors };

    nodesGroup.selectAll('.node').each(function (d) {
      const id = d?.data?.id;
      const kind = id != null ? getSelectionKindForId(id) : null;

      const g = d3.select(this);
      g.classed('hl-desc', kind === 'desc').classed('hl-anc', kind === 'anc').classed('hl-selected', kind === 'selected');

      const ring = g.select('.glow-ring');
      if (!ring.empty()) {
        const baseStroke = d?.data?.type === 'fruit' ? '#FFC107' : d?.data?.type === 'root' ? '#8D6E63' : '#81C784';
        const stroke = kind === 'selected' ? '#FFC107' : kind === 'desc' ? '#FFD54F' : kind === 'anc' ? '#B0BEC5' : baseStroke;
        const width = kind ? (kind === 'selected' ? 5 : 4) : 3;
        const opacity = kind ? (kind === 'selected' ? 0.95 : kind === 'desc' ? 0.72 : 0.66) : 0;

        ring.interrupt().attr('stroke', stroke).attr('stroke-width', width).attr('opacity', opacity);
      }

      if (kind === 'selected' || kind === 'desc') {
        g.style('filter', 'drop-shadow(0 0 10px rgba(255, 193, 7, 0.45))');
      } else if (kind === 'anc') {
        g.style('filter', 'drop-shadow(0 0 10px rgba(176, 190, 197, 0.55))');
      } else {
        g.style('filter', null);
      }
    });
  }, [getSelectionKindForId]);

  useEffect(() => { if (renameModal.isOpen) setRenameValue(renameModal.currentName); }, [renameModal.isOpen, renameModal.currentName]);
  useEffect(() => { if (masteryModal.isOpen) setMasteryValue(masteryModal.currentMastery); }, [masteryModal.isOpen, masteryModal.currentMastery]);

  useEffect(() => {
    const updateDimensions = () => { if (containerRef.current) setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight }); };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const handleClick = (e) => { if (!e.target.closest('.context-menu')) setContextMenu(null); };
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setRenameModal({ isOpen: false, nodeId: null, currentName: '', nodeType: '' });
        setMasteryModal({ isOpen: false, nodeId: null, currentMastery: 50, nodeName: '' });
        setDeleteModal({ isOpen: false, nodeId: null, nodeName: '' });
      }
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => { document.removeEventListener('click', handleClick); document.removeEventListener('keydown', handleEscape); };
  }, []);

  const addChild = useCallback((parentId, childType) => {
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
        .attr('class', 'root-link link')
        .attr('d', rootPath)
        .attr('fill', 'none')
        .attr('stroke', '#4E342E')
        .attr('stroke-width', rootWidth)
        .attr('stroke-linecap', 'round')
        .attr('data-source-id', parentId)
        .attr('data-target-id', childId);

      linksGroup
        .append('path')
        .datum(linkDatum)
        .attr('class', 'root-link-highlight link')
        .attr('d', rootPath)
        .attr('fill', 'none')
        .attr('stroke', '#8D6E63')
        .attr('stroke-opacity', 0.9)
        .attr('stroke-width', (d) => Math.max(2, rootWidth(d) * 0.55))
        .attr('stroke-linecap', 'round')
        .attr('data-source-id', parentId)
        .attr('data-target-id', childId);
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

      if (parentDatum?.data?.type === 'branch' && childType === 'branch' && linkFnsRef.current.branchTwigPath) {
        linksGroup
          .append('path')
          .datum({ ...linkDatum, twigSide: childId % 2 === 0 ? 1 : -1 })
          .attr('class', 'branch-twig link')
          .attr('d', linkFnsRef.current.branchTwigPath)
          .attr('fill', 'none')
          .attr('stroke', '#3E2723')
          .attr('stroke-opacity', 0.7)
          .attr('stroke-width', Math.max(1.8, baseW * 0.28))
          .attr('stroke-linecap', 'round')
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
          .selectAll('.branch-link')
          .filter(function () { return Number(this.dataset?.sourceId) === parentId; })
          .attr('d', branchPath);
      } catch {
        // noop
      }
    }

    const nodeGroup = nodesGroup
      .append('g')
      .datum(nodeDatum)
      .attr('class', `node node-${childId}`)
      .attr('transform', `translate(${fx}, ${fy})`)
      .style('cursor', 'grab')
      .style('display', null);

    // Foliage
    if (nodeDatum.leaves?.length) {
      const foliageGroup = nodeGroup.append('g').attr('class', 'foliage');
      nodeDatum.leaves.forEach((leaf) => {
        foliageGroup
          .append('ellipse')
          .attr('cx', leaf.x)
          .attr('cy', leaf.y)
          .attr('rx', 0)
          .attr('ry', 0)
          .attr('opacity', 0)
          .attr('fill', leaf.color)
          .attr('transform', `rotate(${leaf.rotation} ${leaf.x} ${leaf.y})`)
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
      .attr('opacity', 0);

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

    // Interactions for the newly added node
    const getAllModelChildren = (n) =>
      [
        ...(Array.isArray(n?.children) ? n.children : []),
        ...(Array.isArray(n?._children) ? n._children : []),
      ].filter(Boolean);

    const collectSubtreeIdsFromModel = (nodeId) => {
      const modelRoot = findNode(treeDataRef.current, nodeId);
      if (!modelRoot) return [nodeId];
      const ids = [];
      const stack = [modelRoot];
      while (stack.length) {
        const next = stack.pop();
        if (!next) continue;
        ids.push(next.id);
        stack.push(...getAllModelChildren(next));
      }
      return ids;
    };

    const dragBehavior = d3.drag()
      .on('start', function (event, d) {
        event.sourceEvent.stopPropagation();
        d3.select(this).raise().style('cursor', 'grabbing');
        d3.select(this).select('.glow-ring').transition().duration(120).attr('opacity', 0.85);
        const transform = zoomRef.current || d3.zoomIdentity;
        d.dragStartX = d.fx; d.dragStartY = d.fy;
        const rect = svgEl.getBoundingClientRect();
        d.mouseStartX = (event.sourceEvent.clientX - rect.left - transform.x) / transform.k;
        d.mouseStartY = (event.sourceEvent.clientY - rect.top - transform.y) / transform.k;

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
        const rect = svgEl.getBoundingClientRect();
        const mx = (event.sourceEvent.clientX - rect.left - transform.x) / transform.k;
        const my = (event.sourceEvent.clientY - rect.top - transform.y) / transform.k;
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
          d3.select(this).attr('transform', `translate(${d.fx}, ${d.fy})`);
        }

        linksGroup.selectAll('.root-link-shadow, .root-link, .root-link-texture, .root-link-highlight, .root-link-highlight2, .root-rootlet').attr('d', rootPath);
        linksGroup.selectAll('.branch-link-shadow, .branch-link-base, .branch-link-texture-dark, .branch-link-highlight, .branch-link-highlight2').attr('d', branchPath);
        if (branchTwigPath) linksGroup.selectAll('.branch-twig').attr('d', branchTwigPath);
      })
      .on('end', function (_event, d) {
        d3.select(this).style('cursor', 'grab');
        const kind = getSelectionKindForId(d?.data?.id);
        const baseOpacity = kind ? (kind === 'selected' ? 0.95 : kind === 'desc' ? 0.72 : 0.66) : 0;
        d3.select(this).select('.glow-ring').transition().duration(200).attr('opacity', baseOpacity);
        d.subtreeDrag = null;
      });

    nodeGroup
      .call(dragBehavior)
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
  }, [nextId, treeData, dimensions]);

  const toggleChildrenCollapsed = useCallback((nodeId) => {
    const current = findNode(treeData, nodeId);
    if (!current || current.type === 'fruit') return;

    const getAllChildren = (n) =>
      [
        ...(Array.isArray(n?.children) ? n.children : []),
        ...(Array.isArray(n?._children) ? n._children : []),
      ].filter(Boolean);

    const collectAllDescendantIds = (n) => {
      const ids = [];
      const stack = [...getAllChildren(n)];
      while (stack.length) {
        const next = stack.pop();
        if (!next) continue;
        ids.push(next.id);
        stack.push(...getAllChildren(next));
      }
      return ids;
    };

    const collectVisibleDescendantIds = (children) => {
      const ids = [];
      const stack = [...(Array.isArray(children) ? children : [])];
      while (stack.length) {
        const next = stack.pop();
        if (!next) continue;
        ids.push(next.id);
        if (Array.isArray(next.children)) stack.push(...next.children);
      }
      return ids;
    };

    const isCollapsing = Array.isArray(current.children) && current.children.length > 0;
    const allDescendantIds = collectAllDescendantIds(current);
    const allDescendantSet = new Set(allDescendantIds);

    const visibleIdsAfterExpand = isCollapsing ? [] : collectVisibleDescendantIds(current._children);
    const visibleSet = new Set(visibleIdsAfterExpand);
    const hiddenAfterExpandIds = isCollapsing ? [] : allDescendantIds.filter((id) => !visibleSet.has(id));
    let forceRedraw = false;

    // Fast path: just hide/show existing DOM nodes + links (no full redraw).
    const svgEl = svgRef.current;
    if (svgEl && allDescendantIds.length > 0) {
      const hideIds = isCollapsing ? allDescendantIds : hiddenAfterExpandIds;
      const showIds = isCollapsing ? [] : visibleIdsAfterExpand;

      if (!isCollapsing) {
        const firstId = showIds[0];
        if (firstId && d3.select(svgEl).select(`.node-${firstId}`).empty()) {
          forceRedraw = true;
        }
      }

      if (hideIds.length > 0) {
        const hideNodeSel = d3.select(svgEl).selectAll(hideIds.map((id) => `.node-${id}`).join(', '));
        const hideLinkSel = d3
          .select(svgEl)
          .selectAll('.links path')
          .filter(function () {
            const tid = Number(this.dataset?.targetId);
            return Number.isFinite(tid) && allDescendantSet.has(tid) && !visibleSet.has(tid);
          });
        hideNodeSel.style('display', 'none');
        hideLinkSel.style('display', 'none');
      }

      if (showIds.length > 0) {
        const showNodeSel = d3.select(svgEl).selectAll(showIds.map((id) => `.node-${id}`).join(', '));
        const showLinkSel = d3
          .select(svgEl)
          .selectAll('.links path')
          .filter(function () {
            const tid = Number(this.dataset?.targetId);
            return Number.isFinite(tid) && visibleSet.has(tid);
          });
        showNodeSel.style('display', null);
        showLinkSel.style('display', null);
      }
    }

    setTreeData((prevData) => {
      const newData = deepClone(prevData);
      const node = findNode(newData, nodeId);
      if (!node || node.type === 'fruit') return newData;

      if (Array.isArray(node.children) && node.children.length > 0) {
        node._children = node.children;
        delete node.children;
      } else if (Array.isArray(node._children) && node._children.length > 0) {
        node.children = node._children;
        delete node._children;
      } else {
        return newData;
      }

      return newData;
    });

    if (forceRedraw) {
      setStructureVersion((v) => v + 1);
    }

    setContextMenu(null);
    applySelectionHighlight(selectionRef.current.selectedId);
  }, [treeData]);

  const reorganizeBranchesAndFruits = useCallback(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const rootPath = linkFnsRef.current.rootPath;
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

    const childrenAll = (n) =>
      [
        ...(Array.isArray(n?.children) ? n.children : []),
        ...(Array.isArray(n?._children) ? n._children : []),
      ].filter(Boolean);

    const parentById = new Map();
    const walk = (node, parentId) => {
      if (!node) return;
      parentById.set(node.id, parentId);
      childrenAll(node).forEach((k) => walk(k, node.id));
    };
    walk(model, null);

    // Planar layout for visible branches (reduces link crossings).
    const branchHierarchy = d3.hierarchy(model, (n) =>
      childrenAll(n).filter((c) => c?.type === 'branch' && visibleSet.has(c.id)),
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
    }

    const effectiveRadius = (t) => {
      if (t === 'trunk') return 70;
      if (t === 'root') return nodeConfig.root.radius * 1.7;
      if (t === 'branch') return nodeConfig.branch.radius * 1.5;
      if (t === 'fruit') return nodeConfig.fruit.radius * 1.9;
      return 24;
    };

    const placed = visibleNodeDatums.filter((nd) => nd?.data?.type !== 'fruit'); // fruits will be repositioned

    const isFree = (x, y, t) => {
      const r = effectiveRadius(t);
      const pad = 16;
      for (const p of placed) {
        const pr = effectiveRadius(p?.data?.type);
        const dx = x - (p.fx ?? 0);
        const dy = y - (p.fy ?? 0);
        const min = r + pr + pad;
        if (dx * dx + dy * dy < min * min) return false;
      }
      return true;
    };

    const findNonOverlappingNear = ({ x, y }, t, verticalDir) => {
      const stepX = 44;
      const stepY = 40;
      const maxRings = 10;

      for (let ring = 0; ring <= maxRings; ring++) {
        const yy = y + verticalDir * ring * stepY;
        for (let k = 0; k <= ring + 2; k++) {
          const dx = k * stepX;
          const c1 = { x: x + dx, y: yy };
          const c2 = { x: x - dx, y: yy };
          if (isFree(c1.x, c1.y, t)) return c1;
          if (dx && isFree(c2.x, c2.y, t)) return c2;
        }
      }
      return { x, y };
    };

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

        const pos = findNonOverlappingNear(pref, 'fruit', +1);
        nd.fx = pos.x;
        nd.fy = pos.y;
        nodesGroup.select(`.node-${fid}`).attr('transform', `translate(${nd.fx}, ${nd.fy})`);
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
      .selectAll('.root-link-shadow, .root-link, .root-link-texture, .root-link-highlight, .root-link-highlight2, .root-rootlet')
      .attr('d', rootPath);
    linksGroup
      .selectAll('.branch-link-shadow, .branch-link-base, .branch-link-texture-dark, .branch-link-highlight, .branch-link-highlight2')
      .attr('d', branchPath);
    if (branchTwigPath) linksGroup.selectAll('.branch-twig').attr('d', branchTwigPath);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteModal.nodeId || deleteModal.nodeId === treeData.id) return;

    const getAllChildren = (n) =>
      [
        ...(Array.isArray(n?.children) ? n.children : []),
        ...(Array.isArray(n?._children) ? n._children : []),
      ].filter(Boolean);

    const collectSubtreeIds = (rootId) => {
      const root = findNode(treeData, rootId);
      if (!root) return [rootId];
      const ids = [];
      const stack = [root];
      while (stack.length) {
        const next = stack.pop();
        if (!next) continue;
        ids.push(next.id);
        stack.push(...getAllChildren(next));
      }
      return ids;
    };

    // Fast path: remove only the affected DOM subtree (no full redraw).
    const subtreeIds = collectSubtreeIds(deleteModal.nodeId);
    const svgEl = svgRef.current;
    if (svgEl && subtreeIds.length > 0) {
      const subtreeSet = new Set(subtreeIds);

      // Remove nodes.
      const nodeSelectors = subtreeIds.map((id) => `.node-${id}`).join(', ');
      d3.select(svgEl).selectAll(nodeSelectors).remove();

      // Remove links that touch the removed subtree (parent->child, etc).
      d3
        .select(svgEl)
        .selectAll('.links path')
        .filter(function () {
          const sid = Number(this.dataset?.sourceId);
          const tid = Number(this.dataset?.targetId);
          return (Number.isFinite(sid) && subtreeSet.has(sid)) || (Number.isFinite(tid) && subtreeSet.has(tid));
        })
        .remove();

      // If the selection was inside the deleted subtree, clear it.
      if (selectionRef.current.selectedId && subtreeSet.has(selectionRef.current.selectedId)) {
        applySelectionHighlight(null);
      } else {
        applySelectionHighlight(selectionRef.current.selectedId);
      }
    }

    setTreeData(prevData => {
      const newData = deepClone(prevData);
      const parent = findParent(newData, deleteModal.nodeId);
      if (parent?.children) {
        parent.children = parent.children.filter(c => c.id !== deleteModal.nodeId);
        if (parent.children.length === 0) delete parent.children;
      }
      if (parent?._children) {
        parent._children = parent._children.filter(c => c.id !== deleteModal.nodeId);
        if (parent._children.length === 0) delete parent._children;
      }
      return newData;
    });
    setDeleteModal({ isOpen: false, nodeId: null, nodeName: '' });
    setContextMenu(null);
  }, [deleteModal.nodeId, treeData.id]);

  const saveRename = useCallback(() => {
    if (!renameValue.trim() || !renameModal.nodeId) return;
    const newName = renameValue.trim();
    const existingNode = findNode(treeData, renameModal.nodeId);
    const titleText = existingNode?.mastery !== undefined ? `${newName} — ${existingNode.mastery}%` : newName;
    setTreeData(prevData => { const newData = deepClone(prevData); const targetNode = findNode(newData, renameModal.nodeId); if (targetNode) targetNode.name = newName; return newData; });
    const labelSel = d3.select(svgRef.current).select(`.node-label-${renameModal.nodeId}`);
    labelSel.interrupt();
    labelSel
      .transition()
      .duration(180)
      .attr('opacity', 0)
      .on('end', () => {
        labelSel.text(newName);
        wrapSvgText(labelSel, getLabelWrapConfig(existingNode?.type || 'fruit'));
        labelSel.transition().duration(180).attr('opacity', 1);
      });
    d3.select(svgRef.current).select(`.node-${renameModal.nodeId} title`).text(titleText);
    setRenameModal({ isOpen: false, nodeId: null, currentName: '', nodeType: '' });
  }, [renameValue, renameModal.nodeId, treeData]);

  const saveMastery = useCallback(() => {
    if (!masteryModal.nodeId) return;
    const numValue = Math.min(100, Math.max(0, parseInt(masteryValue) || 0));
    const currentName = findNode(treeData, masteryModal.nodeId)?.name || masteryModal.nodeName;
    setTreeData(prevData => { const newData = deepClone(prevData); const targetNode = findNode(newData, masteryModal.nodeId); if (targetNode) targetNode.mastery = numValue; return newData; });
    const masteryTextSel = d3.select(svgRef.current).select(`.mastery-label-${masteryModal.nodeId}`);
    masteryTextSel
      .transition()
      .duration(300)
      .attr('opacity', 0)
      .transition()
      .duration(300)
      .text(`${numValue}%`)
      .attr('opacity', 1);

    // Resize badge background to fit the new text.
    setTimeout(() => {
      const textEl = masteryTextSel.node();
      if (!textEl) return;
      const bbox = textEl.getBBox();
      d3.select(svgRef.current)
        .select(`.mastery-badge-bg-${masteryModal.nodeId}`)
        .attr('x', bbox.x - 6)
        .attr('y', bbox.y - 3)
        .attr('width', bbox.width + 12)
        .attr('height', bbox.height + 6);
    }, 0);

    d3.select(svgRef.current).select(`.node-${masteryModal.nodeId} title`).text(`${currentName} — ${numValue}%`);
    setMasteryModal({ isOpen: false, nodeId: null, currentMastery: 50, nodeName: '' });
  }, [masteryValue, masteryModal.nodeId, masteryModal.nodeName, treeData]);

  const openRenameModal = (nodeId) => { const node = findNode(treeData, nodeId); setRenameModal({ isOpen: true, nodeId, currentName: node?.name || '', nodeType: typeLabels[node?.type] || '' }); setContextMenu(null); };
  const openMasteryModal = (nodeId) => { const node = findNode(treeData, nodeId); setMasteryModal({ isOpen: true, nodeId, currentMastery: node?.mastery ?? 50, nodeName: node?.name || '' }); setContextMenu(null); };
  const openDeleteModal = (nodeId) => { const node = findNode(treeData, nodeId); setDeleteModal({ isOpen: true, nodeId, nodeName: node?.name || '' }); setContextMenu(null); };

  // Main D3 rendering
  useEffect(() => {
    if (!svgRef.current || !treeData) return;
    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    
    // Save current transform before clearing
    const savedTransform = zoomRef.current;
    
    svg.selectAll('*').remove();

    const defs = svg.append('defs');

    // Gradients
    const skyGrad = defs.append('linearGradient').attr('id', 'sky-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    skyGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f8fbff');
    skyGrad.append('stop').attr('offset', '55%').attr('stop-color', '#eef6ff');
    skyGrad.append('stop').attr('offset', '100%').attr('stop-color', '#e3efff');

    const groundGrad = defs.append('linearGradient').attr('id', 'ground-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    groundGrad.append('stop').attr('offset', '0%').attr('stop-color', '#8D6E63');
    groundGrad.append('stop').attr('offset', '100%').attr('stop-color', '#5D4037');

    const barkGrad = defs.append('linearGradient').attr('id', 'bark-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');
    barkGrad.append('stop').attr('offset', '0%').attr('stop-color', '#4E342E');
    barkGrad.append('stop').attr('offset', '30%').attr('stop-color', '#5D4037');
    barkGrad.append('stop').attr('offset', '50%').attr('stop-color', '#6D4C41');
    barkGrad.append('stop').attr('offset', '70%').attr('stop-color', '#5D4037');
    barkGrad.append('stop').attr('offset', '100%').attr('stop-color', '#3E2723');

    // Branch bark gradient - perpendicular to branch direction for realistic wood look
    const branchBarkGrad = defs.append('linearGradient').attr('id', 'branch-bark-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    branchBarkGrad.append('stop').attr('offset', '0%').attr('stop-color', '#5D4037');
    branchBarkGrad.append('stop').attr('offset', '15%').attr('stop-color', '#6D4C41');
    branchBarkGrad.append('stop').attr('offset', '35%').attr('stop-color', '#795548');
    branchBarkGrad.append('stop').attr('offset', '50%').attr('stop-color', '#8D6E63');
    branchBarkGrad.append('stop').attr('offset', '65%').attr('stop-color', '#795548');
    branchBarkGrad.append('stop').attr('offset', '85%').attr('stop-color', '#6D4C41');
    branchBarkGrad.append('stop').attr('offset', '100%').attr('stop-color', '#4E342E');

    const leafGrad = defs.append('radialGradient').attr('id', 'leaf-gradient').attr('cx', '30%').attr('cy', '30%');
    leafGrad.append('stop').attr('offset', '0%').attr('stop-color', '#81C784');
    leafGrad.append('stop').attr('offset', '100%').attr('stop-color', '#2E7D32');

    // Canopy gradient for middle foliage layer
    const canopyGrad = defs.append('radialGradient').attr('id', 'canopy-gradient').attr('cx', '40%').attr('cy', '35%');
    canopyGrad.append('stop').attr('offset', '0%').attr('stop-color', '#66BB6A');
    canopyGrad.append('stop').attr('offset', '50%').attr('stop-color', '#43A047');
    canopyGrad.append('stop').attr('offset', '100%').attr('stop-color', '#2E7D32');

    const rootNodeGrad = defs.append('radialGradient').attr('id', 'root-node-gradient').attr('cx', '35%').attr('cy', '30%');
    rootNodeGrad.append('stop').attr('offset', '0%').attr('stop-color', '#A1887F');
    rootNodeGrad.append('stop').attr('offset', '60%').attr('stop-color', '#6D4C41');
    rootNodeGrad.append('stop').attr('offset', '100%').attr('stop-color', '#4E342E');

    // Root link gradient - earthy brown tones for underground roots
    const rootLinkGrad = defs.append('linearGradient').attr('id', 'root-link-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    rootLinkGrad.append('stop').attr('offset', '0%').attr('stop-color', '#5D4037');
    rootLinkGrad.append('stop').attr('offset', '20%').attr('stop-color', '#6D4C41');
    rootLinkGrad.append('stop').attr('offset', '40%').attr('stop-color', '#795548');
    rootLinkGrad.append('stop').attr('offset', '60%').attr('stop-color', '#6D4C41');
    rootLinkGrad.append('stop').attr('offset', '80%').attr('stop-color', '#5D4037');
    rootLinkGrad.append('stop').attr('offset', '100%').attr('stop-color', '#4E342E');

    const fruitGrad = defs.append('radialGradient').attr('id', 'fruit-gradient').attr('cx', '30%').attr('cy', '30%');
    fruitGrad.append('stop').attr('offset', '0%').attr('stop-color', '#FFCDD2');
    fruitGrad.append('stop').attr('offset', '55%').attr('stop-color', '#EF5350');
    fruitGrad.append('stop').attr('offset', '100%').attr('stop-color', '#C62828');

    // Filters
    const fruitGlow = defs.append('filter').attr('id', 'fruit-glow').attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%');
    fruitGlow.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'blur');
    fruitGlow.append('feFlood').attr('flood-color', 'rgba(239, 83, 80, 0.65)').attr('result', 'color');
    fruitGlow.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow');
    const fruitMerge = fruitGlow.append('feMerge');
    fruitMerge.append('feMergeNode').attr('in', 'glow');
    fruitMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const shadow = defs.append('filter').attr('id', 'drop-shadow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    shadow.append('feDropShadow').attr('dx', 2).attr('dy', 4).attr('stdDeviation', 3).attr('flood-color', 'rgba(0,0,0,0.4)');

    const mainGroup = svg.append('g').attr('class', 'main-group');

    // Setup zoom behavior
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.25, 3])
      .on('zoom', (event) => {
        zoomRef.current = event.transform;
        mainGroup.attr('transform', event.transform);
      });
    
    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    // Clicking empty space clears selection + context menu.
    svg.on('click', (event) => {
      if (event.defaultPrevented) return;
      setContextMenu(null);
      applySelectionHighlight(null);
    });

    const centerX = width / 2;
    const groundY = height * 0.58;

    // Background (clear)
mainGroup.append('rect').attr('x', -width * 2).attr('y', -height * 2).attr('width', width * 5).attr('height', height * 5).attr('fill', 'url(#sky-gradient)');

// ========================================
// GROUND WITH 3D HILLS - ENHANCED VERSION
// ========================================
const groundRx = Math.min(width * 0.22, 320);
const groundRy = Math.min(height * 0.08, 70);

// Gradientes adicionales para piedras grises y lomas 3D
const stoneGrad = defs.append('radialGradient')
  .attr('id', 'stone-gradient')
  .attr('cx', '30%').attr('cy', '30%');
stoneGrad.append('stop').attr('offset', '0%').attr('stop-color', '#BDBDBD');
stoneGrad.append('stop').attr('offset', '50%').attr('stop-color', '#9E9E9E');
stoneGrad.append('stop').attr('offset', '100%').attr('stop-color', '#616161');

const hillGrad1 = defs.append('radialGradient')
  .attr('id', 'hill-gradient-1')
  .attr('cx', '40%').attr('cy', '35%');
hillGrad1.append('stop').attr('offset', '0%').attr('stop-color', '#7CB342');
hillGrad1.append('stop').attr('offset', '50%').attr('stop-color', '#558B2F');
hillGrad1.append('stop').attr('offset', '100%').attr('stop-color', '#33691E');

const hillGrad2 = defs.append('radialGradient')
  .attr('id', 'hill-gradient-2')
  .attr('cx', '45%').attr('cy', '40%');
hillGrad2.append('stop').attr('offset', '0%').attr('stop-color', '#81C784');
hillGrad2.append('stop').attr('offset', '50%').attr('stop-color', '#66BB6A');
hillGrad2.append('stop').attr('offset', '100%').attr('stop-color', '#43A047');

const hillGrad3 = defs.append('radialGradient')
  .attr('id', 'hill-gradient-3')
  .attr('cx', '38%').attr('cy', '32%');
hillGrad3.append('stop').attr('offset', '0%').attr('stop-color', '#9CCC65');
hillGrad3.append('stop').attr('offset', '50%').attr('stop-color', '#7CB342');
hillGrad3.append('stop').attr('offset', '100%').attr('stop-color', '#558B2F');

// Gradientes para césped denso
const grassGrad = defs.append('linearGradient')
  .attr('id', 'grass-gradient')
  .attr('x1', '0%').attr('y1', '0%')
  .attr('x2', '0%').attr('y2', '100%');
grassGrad.append('stop').attr('offset', '0%').attr('stop-color', '#66BB6A');
grassGrad.append('stop').attr('offset', '100%').attr('stop-color', '#2E7D32');

const grassGrad2 = defs.append('linearGradient')
  .attr('id', 'grass-gradient-2')
  .attr('x1', '0%').attr('y1', '0%')
  .attr('x2', '0%').attr('y2', '100%');
grassGrad2.append('stop').attr('offset', '0%').attr('stop-color', '#81C784');
grassGrad2.append('stop').attr('offset', '100%').attr('stop-color', '#388E3C');

// Definir lomas con efecto 3D
const hills = [
  { cx: centerX, cy: groundY + 45, rx: 200, ry: 55, gradient: 'hill-gradient-1', opacity: 0.85 },
  { cx: centerX - 120, cy: groundY + 35, rx: 140, ry: 45, gradient: 'hill-gradient-2', opacity: 0.9 },
  { cx: centerX + 110, cy: groundY + 38, rx: 150, ry: 48, gradient: 'hill-gradient-3', opacity: 0.88 },
  { cx: centerX - 180, cy: groundY + 30, rx: 90, ry: 35, gradient: 'hill-gradient-2', opacity: 0.92 },
  { cx: centerX + 170, cy: groundY + 32, rx: 95, ry: 38, gradient: 'hill-gradient-3', opacity: 0.9 },
];

// Función para verificar si un punto está dentro de las lomas
const isInsideHills = (x, y) => {
  for (const hill of hills) {
    const dx = x - hill.cx;
    const dy = y - hill.cy;
    const normalizedDist = Math.sqrt((dx * dx) / (hill.rx * hill.rx) + (dy * dy) / (hill.ry * hill.ry));
    if (normalizedDist < 1) return true;
  }
  return false;
};

// Función para calcular elevación
const getHillHeight = (x, y) => {
  let maxElevation = 0;
  hills.forEach(hill => {
    const dx = x - hill.cx;
    const dy = y - hill.cy;
    const normalizedDist = Math.sqrt((dx * dx) / (hill.rx * hill.rx) + (dy * dy) / (hill.ry * hill.ry));
    if (normalizedDist < 1) {
      const elevation = (1 - normalizedDist) * 25;
      maxElevation = Math.max(maxElevation, elevation);
    }
  });
  return maxElevation;
};

// Dibujar sombras de las lomas
hills.forEach(hill => {
  mainGroup.append('ellipse')
    .attr('cx', hill.cx + 4)
    .attr('cy', hill.cy + 8)
    .attr('rx', hill.rx)
    .attr('ry', hill.ry * 0.6)
    .attr('fill', 'rgba(0,0,0,0.12)')
    .attr('filter', 'blur(6px)');
});

// Dibujar lomas
hills.forEach(hill => {
  mainGroup.append('ellipse')
    .attr('cx', hill.cx)
    .attr('cy', hill.cy)
    .attr('rx', hill.rx)
    .attr('ry', hill.ry)
    .attr('fill', `url(#${hill.gradient})`)
    .attr('opacity', hill.opacity)
    .attr('stroke', 'rgba(0,0,0,0.1)')
    .attr('stroke-width', 1);
});

// Capa de tierra base
mainGroup.append('ellipse')
  .attr('cx', centerX)
  .attr('cy', groundY + 55)
  .attr('rx', groundRx)
  .attr('ry', groundRy * 0.8)
  .attr('fill', 'url(#ground-gradient)')
  .attr('opacity', 0.6);

// Textura de tierra
for (let i = 0; i < 8; i++) {
  const y = groundY + 50 + i * 8;
  const amplitude = 5 + Math.sin(i * 0.7) * 3;
  const points = [];
  for (let x = centerX - groundRx + 20; x < centerX + groundRx - 20; x += 10) {
    const wobble = Math.sin(x * 0.05 + i * 1.2) * amplitude;
    points.push([x, y + wobble]);
  }
  mainGroup.append('path')
    .attr('d', d3.line()(points))
    .attr('fill', 'none')
    .attr('stroke', 'rgba(62, 39, 35, 0.2)')
    .attr('stroke-width', 1.5)
    .attr('stroke-linecap', 'round');
}

// CÉSPED DENSO (350 mechones)
const grassDensity = 350;
for (let i = 0; i < grassDensity; i++) {
  const angle = (i / grassDensity) * Math.PI * 2 + Math.random() * 0.15;
  const dist = groundRx * (0.6 + Math.random() * 0.35);
  const baseX = centerX + Math.cos(angle) * dist + (Math.random() - 0.5) * 12;
  const baseY = groundY + 28 + Math.sin(Math.abs(angle)) * groundRy * 0.7 + (Math.random() - 0.5) * 8;
  
  if (!isInsideHills(baseX, baseY)) continue;
  
  const elevation = getHillHeight(baseX, baseY);
  const finalY = baseY - elevation;
  
  const grassGroup = mainGroup.append('g').attr('transform', `translate(${baseX}, ${finalY})`);
  const numBlades = 2 + Math.floor(Math.random() * 3);
  
  for (let b = 0; b < numBlades; b++) {
    const offsetX = (b - numBlades / 2) * 1.2;
    const height = 7 + Math.random() * 5;
    const curve = 2 + Math.random() * 2.5;
    const bendDir = Math.random() > 0.5 ? 1 : -1;
    const bladePath = `M ${offsetX} 0 Q ${offsetX + bendDir * curve} ${-height * 0.6} ${offsetX + bendDir * (curve * 0.3)} ${-height}`;
    const useGrad = Math.floor((baseX / 35) + (baseY / 25)) % 2 === 0 ? 'grass-gradient' : 'grass-gradient-2';
    const brightnessBoost = elevation / 50;
    
    grassGroup.append('path')
      .attr('d', bladePath)
      .attr('fill', 'none')
      .attr('stroke', `url(#${useGrad})`)
      .attr('stroke-width', 1 + Math.random() * 0.4)
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0.7 + Math.random() * 0.25 + brightnessBoost);
  }
}

// PIEDRAS GRISES IRREGULARES
const stones = [
  { x: centerX - 180, y: groundY + 30, size: 24, seed: 1 },
  { x: centerX - 120, y: groundY + 28, size: 20, seed: 2 },
  { x: centerX - 50, y: groundY + 38, size: 14, seed: 4 },
  { x: centerX + 60, y: groundY + 35, size: 18, seed: 5 },
  { x: centerX + 110, y: groundY + 30, size: 22, seed: 6 },
  { x: centerX + 170, y: groundY + 28, size: 19, seed: 7 },
  { x: centerX - 210, y: groundY + 32, size: 12, seed: 8 },
  { x: centerX + 200, y: groundY + 34, size: 13, seed: 9 },
  { x: centerX - 10, y: groundY + 42, size: 16, seed: 10 },
];

stones.forEach((stone) => {
  if (!isInsideHills(stone.x, stone.y)) return;
  
  const elevation = getHillHeight(stone.x, stone.y);
  const adjustedY = stone.y - elevation;
  const stoneGroup = mainGroup.append('g').attr('transform', `translate(${stone.x}, ${adjustedY})`);
  
  // Forma irregular
  const numPoints = 6 + Math.floor(Math.random() * 4);
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const radiusVariation = 0.65 + Math.random() * 0.7;
    const r = stone.size * radiusVariation;
    const jitter = (Math.random() - 0.5) * stone.size * 0.35;
    points.push([Math.cos(angle) * r + jitter, Math.sin(angle) * r * 0.65 + jitter * 0.5]);
  }
  
  // Sombra
  stoneGroup.append('polygon')
    .attr('points', points.map(p => `${p[0] + 2},${p[1] + 4}`).join(' '))
    .attr('fill', 'rgba(0,0,0,0.3)');
  
  // Piedra principal
  stoneGroup.append('polygon')
    .attr('points', points.map(p => `${p[0]},${p[1]}`).join(' '))
    .attr('fill', 'url(#stone-gradient)')
    .attr('stroke', '#757575')
    .attr('stroke-width', 1.5);
  
  // Grietas
  const numCracks = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < numCracks; i++) {
    const startAngle = (i / numCracks) * Math.PI * 2 + Math.random() * 0.5;
    const startR = stone.size * (0.15 + Math.random() * 0.25);
    const endR = stone.size * (0.55 + Math.random() * 0.35);
    const x1 = Math.cos(startAngle) * startR;
    const y1 = Math.sin(startAngle) * startR * 0.7;
    const x2 = Math.cos(startAngle + (Math.random() - 0.5) * 0.4) * endR;
    const y2 = Math.sin(startAngle + (Math.random() - 0.5) * 0.4) * endR * 0.7;
    const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * stone.size * 0.2;
    const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * stone.size * 0.15;
    
    stoneGroup.append('path')
      .attr('d', `M ${x1} ${y1} L ${midX} ${midY} L ${x2} ${y2}`)
      .attr('stroke', 'rgba(50, 50, 50, 0.6)')
      .attr('stroke-width', 1 + Math.random() * 0.5)
      .attr('stroke-linecap', 'round')
      .attr('fill', 'none');
  }
  
  // Imperfecciones (textura)
  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * stone.size * 0.65;
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist * 0.7;
    stoneGroup.append('circle')
      .attr('cx', x).attr('cy', y)
      .attr('r', 0.5 + Math.random() * 1.2)
      .attr('fill', 'rgba(70, 70, 70, 0.45)');
  }
  
  // Vetas
  for (let i = 0; i < 3; i++) {
    const startX = -stone.size * 0.5 + Math.random() * stone.size;
    const startY = -stone.size * 0.3 + Math.random() * stone.size * 0.6;
    const pathData = `M ${startX} ${startY} q ${stone.size * 0.3} ${(Math.random() - 0.5) * 5} ${stone.size * 0.6} ${(Math.random() - 0.5) * 8}`;
    stoneGroup.append('path')
      .attr('d', pathData)
      .attr('stroke', 'rgba(60, 60, 60, 0.35)')
      .attr('stroke-width', 0.8)
      .attr('fill', 'none');
  }
  
  // Highlight
  const highlightPoints = [];
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 - Math.PI * 0.3;
    const r = stone.size * 0.3;
    highlightPoints.push([
      Math.cos(angle) * r - stone.size * 0.2,
      Math.sin(angle) * r * 0.6 - stone.size * 0.25
    ]);
  }
  stoneGroup.append('polygon')
    .attr('points', highlightPoints.map(p => `${p[0]},${p[1]}`).join(' '))
    .attr('fill', 'rgba(200, 200, 200, 0.35)');
});


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
      fy: groundY - 140, // Positioned at top of taller trunk
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

    // Draw trunk with organic shape - taller like an oak tree
    const trunkH = 190;
    const trunkTopW = 32;
    const trunkBotW = 55;

    // Main trunk shape with more organic curves - oak-like proportions
    const trunkPath = `
      M ${centerX - trunkBotW} ${groundY + 18}
      Q ${centerX - trunkBotW - 6} ${groundY - trunkH * 0.15} ${centerX - trunkBotW + 2} ${groundY - trunkH * 0.3}
      Q ${centerX - trunkBotW - 3} ${groundY - trunkH * 0.5} ${centerX - trunkBotW + 5} ${groundY - trunkH * 0.65}
      Q ${centerX - trunkBotW - 2} ${groundY - trunkH * 0.8} ${centerX - trunkTopW} ${groundY - trunkH}
      Q ${centerX - 10} ${groundY - trunkH - 12} ${centerX} ${groundY - trunkH - 8}
      Q ${centerX + 10} ${groundY - trunkH - 12} ${centerX + trunkTopW} ${groundY - trunkH}
      Q ${centerX + trunkBotW + 2} ${groundY - trunkH * 0.8} ${centerX + trunkBotW - 5} ${groundY - trunkH * 0.65}
      Q ${centerX + trunkBotW + 3} ${groundY - trunkH * 0.5} ${centerX + trunkBotW - 2} ${groundY - trunkH * 0.3}
      Q ${centerX + trunkBotW + 6} ${groundY - trunkH * 0.15} ${centerX + trunkBotW} ${groundY + 18}
      Z
    `;

    mainGroup.append('path')
      .attr('d', trunkPath)
      .attr('fill', 'url(#bark-gradient)')
      .attr('stroke', '#3E2723')
      .attr('stroke-width', 2.5)
      .attr('filter', 'url(#drop-shadow)');

    // Trunk bark texture - vertical cracks (more lines for taller trunk)
    const barkLines = [
      { x: centerX - 35, amp: 3 },
      { x: centerX - 25, amp: 4 },
      { x: centerX - 15, amp: 3 },
      { x: centerX - 5, amp: 2 },
      { x: centerX + 5, amp: 3 },
      { x: centerX + 15, amp: 4 },
      { x: centerX + 25, amp: 3 },
      { x: centerX + 35, amp: 2 },
    ];

    barkLines.forEach((bark, i) => {
      const startY = groundY - trunkH * 0.08;
      const endY = groundY - trunkH * 0.88;
      const segments = 10; // More segments for taller trunk
      let pathD = `M ${bark.x} ${startY}`;

      for (let j = 1; j <= segments; j++) {
        const t = j / segments;
        const y = startY + (endY - startY) * t;
        const wobble = Math.sin(i * 2.3 + j * 1.2) * bark.amp;
        pathD += ` L ${bark.x + wobble} ${y}`;
      }

      mainGroup.append('path')
        .attr('d', pathD)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(30, 20, 15, 0.22)')
        .attr('stroke-width', 1.2 + Math.random() * 0.8)
        .attr('stroke-linecap', 'round');
    });

    // Horizontal bark rings (more rings for taller trunk)
    for (let i = 0; i < 7; i++) {
      const ringY = groundY - trunkH * (0.12 + i * 0.12);
      const ringWidth = trunkBotW - (trunkBotW - trunkTopW) * (0.12 + i * 0.12);

      mainGroup.append('path')
        .attr('d', `M ${centerX - ringWidth + 5} ${ringY} Q ${centerX} ${ringY + 2 + Math.random() * 2} ${centerX + ringWidth - 5} ${ringY}`)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(30, 20, 15, 0.12)')
        .attr('stroke-width', 0.8 + Math.random() * 0.5);
    }

    // Decorative roots at base (wider for bigger trunk)
    const rootShapes = [
      { startX: centerX - trunkBotW + 5, endX: centerX - trunkBotW - 35, endY: groundY + 28, cpY: 10 },
      { startX: centerX - trunkBotW + 25, endX: centerX - trunkBotW - 15, endY: groundY + 24, cpY: 6 },
      { startX: centerX + trunkBotW - 5, endX: centerX + trunkBotW + 35, endY: groundY + 28, cpY: 10 },
      { startX: centerX + trunkBotW - 25, endX: centerX + trunkBotW + 15, endY: groundY + 24, cpY: 6 },
      { startX: centerX - 20, endX: centerX - 45, endY: groundY + 30, cpY: 14 },
      { startX: centerX + 20, endX: centerX + 45, endY: groundY + 30, cpY: 14 },
    ];

    rootShapes.forEach((root) => {
      const cpX = (root.startX + root.endX) / 2;
      mainGroup.append('path')
        .attr('d', `M ${root.startX} ${groundY + 15} Q ${cpX} ${groundY + root.cpY} ${root.endX} ${root.endY}`)
        .attr('fill', 'none')
        .attr('stroke', '#5D4037')
        .attr('stroke-width', 8)
        .attr('stroke-linecap', 'round');

      // Root highlight
      mainGroup.append('path')
        .attr('d', `M ${root.startX} ${groundY + 15} Q ${cpX} ${groundY + root.cpY} ${root.endX} ${root.endY}`)
        .attr('fill', 'none')
        .attr('stroke', '#8D6E63')
        .attr('stroke-width', 3)
        .attr('stroke-linecap', 'round')
        .attr('stroke-opacity', 0.5);
    });

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

    linkFnsRef.current = {
      rootPath: generateRootPath,
      branchPath: generateBranchPath,
      rootWidth: getRootLinkWidth,
      branchWidth: getBranchLinkWidth,
      branchTwigPath: generateBranchTwigPath,
    };

    // Draw links
    const linksGroup = mainGroup.append('g').attr('class', 'links');
    
    const rootLinks = allLinks.filter(l => l.type === 'root');

    // Shadow layer for roots (darker, gives depth)
    linksGroup.selectAll('.root-link-shadow')
      .data(rootLinks)
      .enter().append('path')
      .attr('class', 'root-link-shadow link')
      .attr('d', generateRootPath)
      .attr('fill', 'none')
      .attr('stroke', '#1A1209')
      .attr('stroke-width', d => isFirstRender.current ? 0 : getRootLinkWidth(d) + 4)
      .attr('stroke-linecap', 'round')
      .attr('stroke-opacity', 0.35)
      .attr('data-source-id', d => d.source.data.id)
      .attr('data-target-id', d => d.target.data.id);

    // Main root layer with gradient
    const rootLinkSel = linksGroup.selectAll('.root-link')
      .data(rootLinks)
      .enter().append('path')
      .attr('class', 'root-link link')
      .attr('d', generateRootPath)
      .attr('fill', 'none')
      .attr('stroke', 'url(#root-link-gradient)')
      .attr('stroke-width', d => isFirstRender.current ? 0 : getRootLinkWidth(d))
      .attr('stroke-linecap', 'round')
      .attr('data-source-id', d => d.source.data.id)
      .attr('data-target-id', d => d.target.data.id);

    // Texture layer - dark grooves
    linksGroup.selectAll('.root-link-texture')
      .data(rootLinks)
      .enter().append('path')
      .attr('class', 'root-link-texture link')
      .attr('d', generateRootPath)
      .attr('fill', 'none')
      .attr('stroke', '#2D1B0E')
      .attr('stroke-width', d => Math.max(1.5, getRootLinkWidth(d) * 0.18))
      .attr('stroke-linecap', 'round')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-dasharray', d => {
        const w = getRootLinkWidth(d);
        return `${w * 0.6} ${w * 1.4}`;
      })
      .attr('data-source-id', d => d.source.data.id)
      .attr('data-target-id', d => d.target.data.id);

    // Highlight layer
    const rootLinkHighlightSel = linksGroup.selectAll('.root-link-highlight')
      .data(rootLinks)
      .enter().append('path')
      .attr('class', 'root-link-highlight link')
      .attr('d', generateRootPath)
      .attr('fill', 'none')
      .attr('stroke', '#A1887F')
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', d => isFirstRender.current ? 0 : Math.max(2, getRootLinkWidth(d) * 0.35))
      .attr('stroke-linecap', 'round')
      .attr('data-source-id', d => d.source.data.id)
      .attr('data-target-id', d => d.target.data.id);

    // Secondary highlight for more depth
    linksGroup.selectAll('.root-link-highlight2')
      .data(rootLinks)
      .enter().append('path')
      .attr('class', 'root-link-highlight2 link')
      .attr('d', generateRootPath)
      .attr('fill', 'none')
      .attr('stroke', '#BCAAA4')
      .attr('stroke-opacity', 0.2)
      .attr('stroke-width', d => Math.max(1, getRootLinkWidth(d) * 0.15))
      .attr('stroke-linecap', 'round')
      .attr('data-source-id', d => d.source.data.id)
      .attr('data-target-id', d => d.target.data.id);

    // Small rootlets branching off main roots
    rootLinks.filter(l => l.source?.data?.type === 'trunk').forEach((linkData, idx) => {
      // Add 2-3 small rootlets per main root
      const numRootlets = 2 + (idx % 2);
      for (let r = 0; r < numRootlets; r++) {
        const side = r % 2 === 0 ? 1 : -1;
        linksGroup.append('path')
          .datum(linkData)
          .attr('class', 'root-rootlet link')
          .attr('d', generateRootletPath(linkData, side * (1 + r * 0.5)))
          .attr('fill', 'none')
          .attr('stroke', '#5D4037')
          .attr('stroke-width', 3 + Math.random() * 2)
          .attr('stroke-linecap', 'round')
          .attr('stroke-opacity', 0.7)
          .attr('data-source-id', linkData.source.data.id)
          .attr('data-target-id', linkData.target.data.id);
      }
    });

    if (isFirstRender.current) {
      linksGroup.selectAll('.root-link-shadow')
        .attr('stroke-width', 0)
        .transition().duration(900).delay((d, i) => i * 70)
        .attr('stroke-width', d => getRootLinkWidth(d) + 4);

      rootLinkSel.transition().duration(900).delay((d, i) => i * 70).attr('stroke-width', getRootLinkWidth);

      linksGroup.selectAll('.root-link-texture')
        .attr('stroke-opacity', 0)
        .transition().duration(900).delay((d, i) => 100 + i * 70)
        .attr('stroke-opacity', 0.4);

      rootLinkHighlightSel.transition().duration(900).delay((d, i) => i * 70).attr('stroke-width', d => Math.max(2, getRootLinkWidth(d) * 0.35));

      linksGroup.selectAll('.root-link-highlight2')
        .attr('stroke-opacity', 0)
        .transition().duration(900).delay((d, i) => 50 + i * 70)
        .attr('stroke-opacity', 0.2);

      linksGroup.selectAll('.root-rootlet')
        .attr('stroke-opacity', 0)
        .transition().duration(600).delay((d, i) => 200 + i * 50)
        .attr('stroke-opacity', 0.7);
    }

    const branchLinks = allLinks.filter(l => l.type === 'branch');

    // Small per-child "ports" to avoid link overlap near the source node.
    const applyBranchPortOffsets = (links) => {
      const bySource = new Map();
      for (const l of links) {
        const sid = l?.source?.data?.id;
        if (!Number.isFinite(sid)) continue;
        if (!bySource.has(sid)) bySource.set(sid, []);
        bySource.get(sid).push(l);
      }

      for (const list of bySource.values()) {
        list.sort((a, b) => (a.target?.fx ?? 0) - (b.target?.fx ?? 0) || (a.target?.data?.id ?? 0) - (b.target?.data?.id ?? 0));
        const mid = (list.length - 1) / 2;
        const step = 6;
        list.forEach((l, i) => {
          l.portOffset = (i - mid) * step;
        });
      }
    };

    applyBranchPortOffsets(branchLinks);

    // Shadow/outline layer for depth
    linksGroup.selectAll('.branch-link-shadow')
      .data(branchLinks)
      .enter().append('path')
      .attr('class', 'branch-link branch-link-shadow link')
      .attr('d', generateBranchPath)
      .attr('fill', 'none')
      .attr('stroke', '#2D1B0E')
      .attr('stroke-width', d => isFirstRender.current ? 0 : getBranchLinkWidth(d) + 4)
      .attr('stroke-linecap', 'round')
      .attr('stroke-opacity', 0.4)
      .attr('data-source-id', d => d.source.data.id)
      .attr('data-target-id', d => d.target.data.id);

    // Main bark layer
    const branchLinkBaseSel = linksGroup.selectAll('.branch-link-base')
      .data(branchLinks)
      .enter().append('path')
      .attr('class', 'branch-link branch-link-base link')
      .attr('d', generateBranchPath)
      .attr('fill', 'none')
      .attr('stroke', 'url(#branch-bark-gradient)')
      .attr('stroke-width', d => isFirstRender.current ? 0 : getBranchLinkWidth(d))
      .attr('stroke-linecap', 'round')
      .attr('data-source-id', d => d.source.data.id)
      .attr('data-target-id', d => d.target.data.id);

    // Bark texture - dark grooves
    linksGroup.selectAll('.branch-link-texture-dark')
      .data(branchLinks)
      .enter().append('path')
      .attr('class', 'branch-link branch-link-texture-dark link')
      .attr('d', generateBranchPath)
      .attr('fill', 'none')
      .attr('stroke', '#3E2723')
      .attr('stroke-width', d => Math.max(1, getBranchLinkWidth(d) * 0.15))
      .attr('stroke-linecap', 'round')
      .attr('stroke-opacity', 0.35)
      .attr('stroke-dasharray', d => {
        const w = getBranchLinkWidth(d);
        return `${w * 0.8} ${w * 1.2}`;
      })
      .attr('data-source-id', d => d.source.data.id)
      .attr('data-target-id', d => d.target.data.id);

    // Highlight layer - gives 3D rounded appearance
    const branchLinkHighlightSel = linksGroup.selectAll('.branch-link-highlight')
      .data(branchLinks)
      .enter().append('path')
      .attr('class', 'branch-link branch-link-highlight link')
      .attr('d', generateBranchPath)
      .attr('fill', 'none')
      .attr('stroke', '#A1887F')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => isFirstRender.current ? 0 : Math.max(2, getBranchLinkWidth(d) * 0.4))
      .attr('stroke-linecap', 'round')
      .attr('data-source-id', d => d.source.data.id)
      .attr('data-target-id', d => d.target.data.id);

    // Secondary highlight for more depth
    linksGroup.selectAll('.branch-link-highlight2')
      .data(branchLinks)
      .enter().append('path')
      .attr('class', 'branch-link branch-link-highlight2 link')
      .attr('d', generateBranchPath)
      .attr('fill', 'none')
      .attr('stroke', '#BCAAA4')
      .attr('stroke-opacity', 0.25)
      .attr('stroke-width', d => Math.max(1, getBranchLinkWidth(d) * 0.2))
      .attr('stroke-linecap', 'round')
      .attr('data-source-id', d => d.source.data.id)
      .attr('data-target-id', d => d.target.data.id);

    const twigLinks = branchLinks
      .filter(l => l.target?.data?.type === 'branch')
      .map(l => ({ ...l, twigSide: (l.target?.data?.id ?? 0) % 2 === 0 ? 1 : -1 }));

    const branchTwigSel = linksGroup.selectAll('.branch-twig')
      .data(twigLinks)
      .enter().append('path')
      .attr('class', 'branch-twig link')
      .attr('d', generateBranchTwigPath)
      .attr('fill', 'none')
      .attr('stroke', '#3E2723')
      .attr('stroke-opacity', 0.7)
      .attr('stroke-width', d => Math.max(1.8, getBranchLinkWidth(d) * 0.28))
      .attr('stroke-linecap', 'round')
      .attr('data-source-id', d => d.source.data.id)
      .attr('data-target-id', d => d.target.data.id);

    if (isFirstRender.current) {
      // Animate shadow layer
      linksGroup.selectAll('.branch-link-shadow')
        .attr('stroke-width', 0)
        .transition().duration(900).delay((d, i) => 250 + i * 60)
        .attr('stroke-width', d => getBranchLinkWidth(d) + 4);

      // Animate main branch
      branchLinkBaseSel.transition().duration(900).delay((d, i) => 250 + i * 60).attr('stroke-width', getBranchLinkWidth);

      // Animate texture
      linksGroup.selectAll('.branch-link-texture-dark')
        .attr('stroke-opacity', 0)
        .transition().duration(900).delay((d, i) => 350 + i * 60)
        .attr('stroke-opacity', 0.35);

      // Animate highlights
      branchLinkHighlightSel.transition().duration(900).delay((d, i) => 250 + i * 60).attr('stroke-width', d => Math.max(2, getBranchLinkWidth(d) * 0.4));

      linksGroup.selectAll('.branch-link-highlight2')
        .attr('stroke-opacity', 0)
        .transition().duration(900).delay((d, i) => 300 + i * 60)
        .attr('stroke-opacity', 0.25);

      branchTwigSel.attr('stroke-opacity', 0)
        .transition().duration(900).delay((d, i) => 350 + i * 70)
        .attr('stroke-opacity', 0.7);
    }

    // Draw nodes
    const nodesGroup = mainGroup.append('g').attr('class', 'nodes');
    const nodeSelection = nodesGroup.selectAll('.node')
      .data(allNodes)
      .enter()
      .append('g')
      .attr('class', d => `node node-${d.data.id}`)
      .attr('transform', d => `translate(${d.fx}, ${d.fy})`)
      .style('cursor', d => d.data.type === 'trunk' ? 'default' : 'grab');

    // Foliage (inside node group)
    nodeSelection.each(function(d) {
      const nodeGroup = d3.select(this);
      const leaves = d.leaves || [];
      
      if (leaves.length > 0) {
        const foliageGroup = nodeGroup.append('g').attr('class', 'foliage');
        
        leaves.forEach((leaf, i) => {
          const ellipse = foliageGroup.append('ellipse')
            .attr('cx', leaf.x)
            .attr('cy', leaf.y)
            .attr('fill', leaf.color)
            .attr('transform', `rotate(${leaf.rotation} ${leaf.x} ${leaf.y})`);
          
          if (isFirstRender.current) {
            ellipse.attr('rx', 0).attr('ry', 0).attr('opacity', 0)
              .transition().duration(600).delay(400 + leaf.delay + i * 30)
              .attr('rx', leaf.rx).attr('ry', leaf.ry).attr('opacity', 0.85);
          } else {
            ellipse.attr('rx', leaf.rx).attr('ry', leaf.ry).attr('opacity', 0.85);
          }
        });
      }
    });

    // Glow ring
    nodeSelection.append('circle')
      .attr('class', 'glow-ring')
      .attr('r', d => (d.data.type === 'trunk' ? 55 : nodeConfig[d.data.type].radius) + 10)
      .attr('cy', d => d.data.type === 'trunk' ? -45 : 0)
      .attr('fill', 'none')
      .attr('stroke', d => d.data.type === 'fruit' ? '#FFC107' : d.data.type === 'root' ? '#8D6E63' : '#81C784')
      .attr('stroke-width', 3)
      .attr('opacity', 0);

    // Root nodes (organic, root-like appearance)
    const rootNodeGroups = nodeSelection.filter(d => d.data.type === 'root')
      .append('g')
      .attr('class', 'node-shape root-shape');

    // Shadow for depth
    rootNodeGroups.append('ellipse')
      .attr('class', 'root-shadow')
      .attr('cx', 2)
      .attr('cy', 3)
      .attr('fill', 'rgba(0,0,0,0.25)')
      .attr('rx', d => nodeConfig.root.radius + 3)
      .attr('ry', d => nodeConfig.root.radius * 0.85 + 2);

    // Main root body
    rootNodeGroups.append('ellipse')
      .attr('class', 'root-body')
      .attr('fill', 'url(#root-node-gradient)')
      .attr('stroke', '#3E2723')
      .attr('stroke-width', 2.5);

    // Inner texture - bark-like lines
    rootNodeGroups.each(function(d) {
      const g = d3.select(this);
      const r = nodeConfig.root.radius;
      const seed = d.data.id;

      // Add bark texture lines on the root body
      for (let i = 0; i < 4; i++) {
        const angle = -0.6 + i * 0.4 + Math.sin(seed + i) * 0.15;
        const x1 = Math.cos(angle) * r * 0.3;
        const y1 = Math.sin(angle) * r * 0.25 - r * 0.2;
        const x2 = Math.cos(angle) * r * 0.7;
        const y2 = Math.sin(angle) * r * 0.6 + r * 0.1;

        g.append('path')
          .attr('class', 'root-texture')
          .attr('d', `M ${x1} ${y1} Q ${(x1+x2)/2 + Math.sin(seed+i)*3} ${(y1+y2)/2} ${x2} ${y2}`)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(30, 20, 15, 0.25)')
          .attr('stroke-width', 1 + Math.random() * 0.5)
          .attr('stroke-linecap', 'round');
      }
    });

    // Highlight for 3D effect
    rootNodeGroups.append('ellipse')
      .attr('class', 'root-highlight')
      .attr('cx', d => -nodeConfig.root.radius * 0.25)
      .attr('cy', d => -nodeConfig.root.radius * 0.2)
      .attr('rx', d => nodeConfig.root.radius * 0.4)
      .attr('ry', d => nodeConfig.root.radius * 0.3)
      .attr('fill', 'rgba(161, 136, 127, 0.35)');

    // Root tendrils - more organic and varied
    const addRootTendrils = (gSel, nodeId, radius) => {
      const count = 6; // More tendrils for organic look
      for (let i = 0; i < count; i++) {
        // Spread tendrils around the bottom and sides
        const a = -1.1 + (i / (count - 1)) * 2.2 + Math.sin(nodeId * 0.6 + i) * 0.18;
        const len = radius * (1.2 + (i % 3) * 0.3) + Math.abs(Math.cos(nodeId * 0.9 + i)) * radius * 0.7;

        const x0 = Math.sin(a) * radius * 0.6;
        const y0 = radius * 0.5 + Math.abs(Math.sin(a)) * radius * 0.2;

        // More curved, organic path with multiple control points
        const wobble1 = Math.sin(nodeId * 0.8 + i * 1.3) * (radius * 0.2);
        const wobble2 = Math.cos(nodeId * 0.6 + i * 1.7) * (radius * 0.25);

        const x1 = x0 + Math.sin(a) * len * 0.3 + wobble1 * 0.5;
        const y1 = y0 + len * 0.4;
        const x2 = x0 + Math.sin(a) * len * 0.6 + wobble1;
        const y2 = y0 + len * 0.7;
        const x3 = x0 + Math.sin(a) * len * 0.85 + wobble2;
        const y3 = y0 + len;

        // Main tendril with shadow
        gSel.append('path')
          .attr('class', 'root-tendril-shadow')
          .attr('d', `M ${x0+1} ${y0+1} C ${x1+1} ${y1+1}, ${x2+1} ${y2+1}, ${x3+1} ${y3+1}`)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(0,0,0,0.2)')
          .attr('stroke-width', 4 - i * 0.3)
          .attr('stroke-linecap', 'round');

        gSel.append('path')
          .attr('class', 'root-tendril')
          .attr('d', `M ${x0} ${y0} C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`)
          .attr('fill', 'none')
          .attr('stroke', 'url(#root-link-gradient)')
          .attr('stroke-width', 3.5 - i * 0.25)
          .attr('stroke-linecap', 'round');

        // Tendril highlight
        gSel.append('path')
          .attr('class', 'root-tendril-highlight')
          .attr('d', `M ${x0} ${y0} C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`)
          .attr('fill', 'none')
          .attr('stroke', '#8D6E63')
          .attr('stroke-width', 1.2)
          .attr('stroke-linecap', 'round')
          .attr('stroke-opacity', 0.5);

        // Add tiny secondary rootlets on some tendrils
        if (i % 2 === 0) {
          const t = 0.5 + Math.sin(nodeId + i) * 0.2;
          const bx = x0 + (x3 - x0) * t + wobble1 * t;
          const by = y0 + (y3 - y0) * t;
          const side = i % 4 < 2 ? 1 : -1;
          const miniLen = 8 + (nodeId % 4) * 2;

          gSel.append('path')
            .attr('class', 'root-mini-tendril')
            .attr('d', `M ${bx} ${by} Q ${bx + side * miniLen * 0.5} ${by + miniLen * 0.3} ${bx + side * miniLen} ${by + miniLen * 0.8}`)
            .attr('fill', 'none')
            .attr('stroke', '#5D4037')
            .attr('stroke-width', 1.5)
            .attr('stroke-linecap', 'round')
            .attr('stroke-opacity', 0.7);
        }
      }
    };

    rootNodeGroups.each(function (d) {
      const g = d3.select(this);
      addRootTendrils(g, d.data.id, nodeConfig.root.radius);
    });

    const rootBodies = rootNodeGroups.selectAll('ellipse.root-body');
    if (isFirstRender.current) {
      rootBodies.attr('rx', 0).attr('ry', 0);
      rootNodeGroups.selectAll('.root-shadow').attr('rx', 0).attr('ry', 0);
      rootNodeGroups.attr('opacity', 0);
      rootNodeGroups.transition().duration(450).delay((d, i) => i * 55).attr('opacity', 1);
      rootBodies.transition().duration(600).delay((d, i) => i * 55)
        .attr('rx', d => nodeConfig.root.radius)
        .attr('ry', d => nodeConfig.root.radius * 0.85);
      rootNodeGroups.selectAll('.root-shadow').transition().duration(600).delay((d, i) => i * 55)
        .attr('rx', d => nodeConfig.root.radius + 3)
        .attr('ry', d => nodeConfig.root.radius * 0.85 + 2);
    } else {
      rootBodies.attr('rx', d => nodeConfig.root.radius).attr('ry', d => nodeConfig.root.radius * 0.85);
    }

    // Branch nodes
    const branchNodeSel = nodeSelection.filter(d => d.data.type === 'branch');

    // Branch nodes (green like newly created ones)
    const branchOuter = branchNodeSel.append('circle')
      .attr('class', 'node-shape branch-node-outer')
      .attr('fill', 'url(#leaf-gradient)')
      .attr('stroke', '#1B5E20')
      .attr('stroke-width', 2.5);

    const branchInner = branchNodeSel.append('circle')
      .attr('class', 'node-shape branch-node-inner')
      .attr('fill', 'rgba(255,255,255,0.18)')
      .attr('stroke', 'rgba(255,255,255,0.22)')
      .attr('stroke-width', 1.2);

    if (isFirstRender.current) {
      branchOuter.attr('r', 0)
        .transition().duration(600).delay((d, i) => 200 + i * 50)
        .attr('r', d => nodeConfig.branch.radius);
      branchInner.attr('r', 0)
        .transition().duration(600).delay((d, i) => 240 + i * 50)
        .attr('r', d => nodeConfig.branch.radius * 0.6);
    } else {
      branchOuter.attr('r', d => nodeConfig.branch.radius);
      branchInner.attr('r', d => nodeConfig.branch.radius * 0.6);
    }

    // Fruit nodes (apple-like)
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
        // left lobe
        `C ${-w * 0.35} ${top - notch}, ${left} ${-h * 0.45}, ${left} ${-h * 0.05}`,
        // left body to bottom
        `C ${left} ${h * 0.55}, ${-w * 0.45} ${bottom}, 0 ${bottom}`,
        // right body to top
        `C ${w * 0.45} ${bottom}, ${right} ${h * 0.55}, ${right} ${-h * 0.05}`,
        // right lobe back to top
        `C ${right} ${-h * 0.45}, ${w * 0.35} ${top - notch}, 0 ${top}`,
        'Z',
      ].join(' ');
    };

    const fruitNodeGroups = nodeSelection.filter(d => d.data.type === 'fruit')
      .append('g')
      .attr('class', 'node-shape fruit-apple')
      .attr('filter', 'url(#fruit-glow)');

    fruitNodeGroups.append('path')
      .attr('class', 'apple-body')
      .attr('d', d => applePath(nodeConfig.fruit.radius))
      .attr('fill', 'url(#fruit-gradient)')
      .attr('stroke', '#8E1B1B')
      .attr('stroke-width', 2);

    fruitNodeGroups.append('path')
      .attr('class', 'apple-stem')
      .attr('d', d => {
        const r = nodeConfig.fruit.radius;
        return `M ${r * 0.05} ${-r * 1.05} C ${r * 0.15} ${-r * 1.35}, ${r * 0.35} ${-r * 1.45}, ${r * 0.25} ${-r * 1.7}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#5D4037')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round');

    fruitNodeGroups.append('ellipse')
      .attr('class', 'apple-leaf')
      .attr('cx', d => nodeConfig.fruit.radius * 0.42)
      .attr('cy', d => -nodeConfig.fruit.radius * 1.45)
      .attr('rx', d => nodeConfig.fruit.radius * 0.45)
      .attr('ry', d => nodeConfig.fruit.radius * 0.22)
      .attr('fill', 'url(#leaf-gradient)')
      .attr('stroke', '#1B5E20')
      .attr('stroke-width', 1.5)
      .attr('transform', d => `rotate(-25 ${nodeConfig.fruit.radius * 0.42} ${-nodeConfig.fruit.radius * 1.45})`);

    if (isFirstRender.current) {
      fruitNodeGroups.attr('transform', 'scale(0)')
        .transition().duration(650).delay((d, i) => 400 + i * 50)
        .attr('transform', 'scale(1)');
    } else {
      fruitNodeGroups.attr('transform', 'scale(1)');
    }

    // Trunk crown - organic canopy with multiple overlapping circles (larger for oak-like tree)
    const trunkNodes = nodeSelection.filter(d => d.data.type === 'trunk');

    // Create canopy group for layered foliage effect
    const canopyGroup = trunkNodes.append('g').attr('class', 'canopy-group');

    // Background foliage layer (darker, larger circles) - scaled up for bigger tree
    const canopyBackCircles = [
      { cx: -50, cy: -90, r: 52 },
      { cx: 55, cy: -85, r: 48 },
      { cx: 0, cy: -110, r: 58 },
      { cx: -35, cy: -55, r: 44 },
      { cx: 42, cy: -50, r: 42 },
      { cx: -60, cy: -70, r: 38 },
      { cx: 65, cy: -65, r: 36 },
    ];

    canopyBackCircles.forEach((c, i) => {
      canopyGroup.append('circle')
        .attr('class', 'canopy-back')
        .attr('cx', c.cx)
        .attr('cy', c.cy)
        .attr('r', isFirstRender.current ? 0 : c.r)
        .attr('fill', '#1B5E20')
        .attr('opacity', 0.7);
    });

    // Middle foliage layer
    const canopyMidCircles = [
      { cx: -30, cy: -80, r: 50 },
      { cx: 35, cy: -75, r: 46 },
      { cx: 0, cy: -95, r: 55 },
      { cx: -55, cy: -65, r: 40 },
      { cx: 50, cy: -60, r: 38 },
      { cx: -15, cy: -50, r: 35 },
      { cx: 20, cy: -45, r: 33 },
    ];

    canopyMidCircles.forEach((c, i) => {
      canopyGroup.append('circle')
        .attr('class', 'canopy-mid')
        .attr('cx', c.cx)
        .attr('cy', c.cy)
        .attr('r', isFirstRender.current ? 0 : c.r)
        .attr('fill', 'url(#canopy-gradient)')
        .attr('opacity', 0.85);
    });

    // Front foliage layer (brightest, main visible circles)
    const canopyFrontCircles = [
      { cx: -22, cy: -75, r: 45 },
      { cx: 25, cy: -70, r: 42 },
      { cx: 0, cy: -88, r: 48 },
      { cx: -42, cy: -58, r: 35 },
      { cx: 40, cy: -52, r: 34 },
      { cx: 0, cy: -60, r: 40 },
      { cx: -18, cy: -45, r: 30 },
      { cx: 22, cy: -42, r: 28 },
    ];

    canopyFrontCircles.forEach((c, i) => {
      canopyGroup.append('circle')
        .attr('class', 'canopy-front')
        .attr('cx', c.cx)
        .attr('cy', c.cy)
        .attr('r', isFirstRender.current ? 0 : c.r)
        .attr('fill', 'url(#leaf-gradient)')
        .attr('stroke', '#2E7D32')
        .attr('stroke-width', 1)
        .attr('opacity', 0.95);
    });

    // Add highlight circles for depth
    const highlightCircles = [
      { cx: -15, cy: -85, r: 24 },
      { cx: 18, cy: -78, r: 20 },
      { cx: -35, cy: -68, r: 16 },
      { cx: 30, cy: -62, r: 14 },
    ];

    highlightCircles.forEach((c) => {
      canopyGroup.append('circle')
        .attr('class', 'canopy-highlight')
        .attr('cx', c.cx)
        .attr('cy', c.cy)
        .attr('r', isFirstRender.current ? 0 : c.r)
        .attr('fill', '#A5D6A7')
        .attr('opacity', 0.4);
    });

    // Apply drop shadow to entire canopy
    canopyGroup.attr('filter', 'url(#drop-shadow)');

    // Animate canopy on first render
    if (isFirstRender.current) {
      canopyGroup.selectAll('circle')
        .transition()
        .duration(800)
        .delay((d, i) => i * 30)
        .attr('r', function() {
          const el = d3.select(this);
          const targetR = [...canopyBackCircles, ...canopyMidCircles, ...canopyFrontCircles, ...highlightCircles]
            .find(c => c.cx === parseFloat(el.attr('cx')) && c.cy === parseFloat(el.attr('cy')))?.r || 30;
          return targetR;
        });
    }

    // Node symbols
    const symbols = nodeSelection.append('text')
      .attr('class', 'node-symbol')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.data.type === 'trunk' ? '-40px' : '0.35em')
      .attr('font-size', d => nodeConfig[d.data.type].fontSize)
      .attr('fill', d => d.data.type === 'root' ? '#E8E8E8' : d.data.type === 'fruit' ? '#FFF8E1' : '#E8F5E9')
      .attr('pointer-events', 'none')
      .text(d => nodeConfig[d.data.type].symbol);
    
    if (isFirstRender.current) {
      symbols.attr('opacity', 0).transition().delay((d, i) => 350 + i * 40).duration(400).attr('opacity', 1);
    } else {
      symbols.attr('opacity', 1);
    }

    // Node labels
    const labels = nodeSelection.append('text')
      .attr('class', d => `node-label node-label-${d.data.id}`)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.data.type === 'trunk' ? 25 : d.data.type === 'root' ? nodeConfig.root.radius + 12 : nodeConfig[d.data.type].radius + 12)
      .attr('fill', '#E8E8E8')
      .attr('font-size', d => d.data.type === 'trunk' ? '12px' : '9px')
      .attr('font-weight', d => d.data.type === 'trunk' ? '600' : '400')
      .attr('font-family', 'Georgia, serif')
      .attr('pointer-events', 'none')
      .attr('stroke', 'rgba(0,0,0,0.75)')
      .attr('stroke-width', 3)
      .style('paint-order', 'stroke')
      .text(d => d.data.name);

    labels.each(function (d) {
      wrapSvgText(d3.select(this), getLabelWrapConfig(d.data.type));
    });
    
    if (isFirstRender.current) {
      labels.attr('opacity', 0).transition().delay((d, i) => 450 + i * 40).duration(400).attr('opacity', 1);
    } else {
      labels.attr('opacity', 1);
    }

    // Tooltip titles (full text, never truncated)
    nodeSelection.append('title').text(d => d.data.type === 'fruit' && d.data.mastery !== undefined ? `${d.data.name} — ${d.data.mastery}%` : d.data.name);

    // Mastery badges (background + percent text)
    const masteryBadges = nodeSelection.filter(d => d.data.type === 'fruit' && d.data.mastery !== undefined)
      .append('g')
      .attr('class', d => `mastery-badge mastery-badge-${d.data.id}`)
      .attr('pointer-events', 'none');

    masteryBadges.append('rect')
      .attr('class', d => `mastery-badge-bg mastery-badge-bg-${d.data.id}`)
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', 'rgba(13,27,42,0.85)')
      .attr('stroke', 'rgba(255,193,7,0.55)')
      .attr('stroke-width', 1);

    const masteryLabels = masteryBadges.append('text')
      .attr('class', d => `mastery-label mastery-label-${d.data.id}`)
      .attr('text-anchor', 'middle')
      .attr('dy', -nodeConfig.fruit.radius - 10)
      .attr('fill', '#FFC107')
      .attr('font-size', '12px')
      .attr('font-weight', 800)
      .attr('font-family', 'monospace')
      .attr('stroke', 'rgba(0,0,0,0.8)')
      .attr('stroke-width', 3)
      .style('paint-order', 'stroke')
      .text(d => `${d.data.mastery}%`);

    masteryBadges.each(function () {
      const group = d3.select(this);
      const textNode = group.select('text').node();
      if (!textNode) return;
      const bbox = textNode.getBBox();
      group
        .select('rect')
        .attr('x', bbox.x - 6)
        .attr('y', bbox.y - 3)
        .attr('width', bbox.width + 12)
        .attr('height', bbox.height + 6);
    });
    
    if (isFirstRender.current) {
      masteryBadges.attr('opacity', 0).transition().delay((d, i) => 600 + i * 40).duration(400).attr('opacity', 1);
    } else {
      masteryBadges.attr('opacity', 1);
    }

    // Drag
    const getAllModelChildren = (n) => [
      ...(Array.isArray(n?.children) ? n.children : []),
      ...(Array.isArray(n?._children) ? n._children : []),
    ].filter(Boolean);

    const collectSubtreeIdsFromModel = (nodeId) => {
      const modelRoot = findNode(treeDataRef.current, nodeId);
      if (!modelRoot) return [nodeId];
      const ids = [];
      const stack = [modelRoot];
      while (stack.length) {
        const next = stack.pop();
        if (!next) continue;
        ids.push(next.id);
        stack.push(...getAllModelChildren(next));
      }
      return ids;
    };

    const dragBehavior = d3.drag()
      .on('start', function (event, d) {
        event.sourceEvent.stopPropagation();
        d3.select(this).raise().style('cursor', 'grabbing');
        d3.select(this).select('.glow-ring').transition().duration(150).attr('opacity', 0.6);
        const transform = zoomRef.current || d3.zoomIdentity;
        d.dragStartX = d.fx; d.dragStartY = d.fy;
        const rect = svgRef.current.getBoundingClientRect();
        d.mouseStartX = (event.sourceEvent.clientX - rect.left - transform.x) / transform.k;
        d.mouseStartY = (event.sourceEvent.clientY - rect.top - transform.y) / transform.k;

        // When dragging a parent (e.g. branch/root), move its subtree with it.
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
        const rect = svgRef.current.getBoundingClientRect();
        const mx = (event.sourceEvent.clientX - rect.left - transform.x) / transform.k;
        const my = (event.sourceEvent.clientY - rect.top - transform.y) / transform.k;
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
          d3.select(this).attr('transform', `translate(${d.fx}, ${d.fy})`);
        }

        linksGroup.selectAll('.root-link-shadow, .root-link, .root-link-texture, .root-link-highlight, .root-link-highlight2, .root-rootlet').attr('d', generateRootPath);
        linksGroup.selectAll('.branch-link-shadow, .branch-link-base, .branch-link-texture-dark, .branch-link-highlight, .branch-link-highlight2').attr('d', generateBranchPath);
        linksGroup.selectAll('.branch-twig').attr('d', generateBranchTwigPath);
      })
      .on('end', function (_event, d) {
        d3.select(this).style('cursor', 'grab');
        const kind = getSelectionKindForId(d?.data?.id);
        const baseOpacity = kind ? (kind === 'selected' ? 0.95 : kind === 'desc' ? 0.72 : 0.66) : 0;
        d3.select(this).select('.glow-ring').transition().duration(200).attr('opacity', baseOpacity);
        d.subtreeDrag = null;
      });

    // Apply drag behavior only to non-trunk nodes (trunk/canopy is fixed)
    nodeSelection.filter(d => d.data.type !== 'trunk').call(dragBehavior);

    // Set cursor style for trunk to indicate it's not draggable
    nodeSelection.filter(d => d.data.type === 'trunk').style('cursor', 'default');

    // Hover & context
    nodeSelection
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
        const rect = svgRef.current.getBoundingClientRect();
        setContextMenu({ x: event.clientX - rect.left, y: event.clientY - rect.top, nodeId: d.data.id, nodeType: d.data.type, nodeName: d.data.name, mastery: d.data.mastery });
      });

    // If there is an existing selection, re-apply it after a full redraw.
    applySelectionHighlight(selectionRef.current.selectedId);

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

  }, [structureVersion, dimensions]);

  const handleMenuAction = (action, nodeId) => {
    if (action === 'addRoot') addChild(nodeId, 'root');
    else if (action === 'addBranch') addChild(nodeId, 'branch');
    else if (action === 'addFruit') addChild(nodeId, 'fruit');
    else if (action === 'toggleChildren') toggleChildrenCollapsed(nodeId);
    else if (action === 'rename') openRenameModal(nodeId);
    else if (action === 'delete') openDeleteModal(nodeId);
    else if (action === 'editMastery') openMasteryModal(nodeId);
  };

  const contextNode = contextMenu ? findNode(treeData, contextMenu.nodeId) : null;
  const menuOptions = contextNode ? getMenuOptions(contextNode) : [];

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', background: '#0d1b2a', position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      
      <TreeHeader />
      <Legend />
      <Stats treeData={treeData} countNodes={countNodes} />

      <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
        <button
          onClick={() => {
            setContextMenu(null);
            reorganizeBranchesAndFruits();
          }}
          style={{
            padding: '10px 16px',
            background: 'rgba(13,27,42,0.9)',
            border: '1px solid rgba(255,193,7,0.22)',
            borderRadius: '10px',
            color: '#E8E8E8',
            fontSize: '14px',
            fontWeight: 800,
            letterSpacing: '0.5px',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(13,27,42,0.98)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(13,27,42,0.9)')}
        >
          Reorganizar Ramas y Frutos
        </button>
      </div>

      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} style={{ display: 'block' }} />

      <ContextMenu contextMenu={contextMenu} options={menuOptions} onAction={handleMenuAction} containerRef={containerRef} />

      <RenameModal
        isOpen={renameModal.isOpen}
        nodeTypeLabel={renameModal.nodeType}
        value={renameValue}
        setValue={setRenameValue}
        onSave={saveRename}
        onClose={() => setRenameModal({ isOpen: false, nodeId: null, currentName: '', nodeType: '' })}
      />

      <MasteryModal
        isOpen={masteryModal.isOpen}
        nodeName={masteryModal.nodeName}
        value={masteryValue}
        setValue={setMasteryValue}
        getMasteryLevel={getMasteryLevel}
        onSave={saveMastery}
        onClose={() => setMasteryModal({ isOpen: false, nodeId: null, currentMastery: 50, nodeName: '' })}
      />

      <DeleteModal
        isOpen={deleteModal.isOpen}
        nodeName={deleteModal.nodeName}
        onConfirm={confirmDelete}
        onClose={() => setDeleteModal({ isOpen: false, nodeId: null, nodeName: '' })}
      />
    </div>
  );
}
