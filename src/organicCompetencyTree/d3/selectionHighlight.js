import * as d3 from 'd3';

export const createEmptySelection = () => ({
  selectedId: null,
  descendants: new Set(),
  ancestors: new Set(),
});

export const getSelectionKind = (selection, id) => {
  if (!selection?.selectedId) return null;
  if (id === selection.selectedId) return 'selected';
  if (selection.descendants?.has?.(id)) return 'desc';
  if (selection.ancestors?.has?.(id)) return 'anc';
  return null;
};

const baseStrokeForType = (t) => {
  if (t === 'fruit') return '#FFC107';
  if (t === 'root') return '#8D6E63';
  return '#81C784';
};

export const isNodeVisible = (svgEl, nodeId) => {
  const nodesGroup = d3.select(svgEl).select('.nodes');
  if (nodesGroup.empty()) return false;
  const sel = nodesGroup.select(`.node-${nodeId}`);
  if (sel.empty()) return false;
  return sel.node()?.style?.display !== 'none';
};

export const computeSelection = ({ model, selectedId, findNode, getAllChildren }) => {
  const parentById = new Map();
  const walkParents = (node, parentId) => {
    if (!node) return;
    parentById.set(node.id, parentId);
    getAllChildren(node).forEach((k) => walkParents(k, node.id));
  };
  walkParents(model, null);

  const selectedModel = findNode(model, selectedId);
  if (!selectedModel) return createEmptySelection();

  const descendants = new Set([selectedId]);
  const stack = [...getAllChildren(selectedModel)];
  while (stack.length) {
    const next = stack.pop();
    if (!next) continue;
    descendants.add(next.id);
    stack.push(...getAllChildren(next));
  }

  const ancestors = new Set();
  let cur = selectedId;
  while (true) {
    const pid = parentById.get(cur);
    if (!pid) break;
    ancestors.add(pid);
    cur = pid;
  }

  return { selectedId, descendants, ancestors };
};

export const applySelectionStyles = ({ svgEl, selection, nodeConfig, sapFlowEnabled = true }) => {
  const nodesGroup = d3.select(svgEl).select('.nodes');
  if (nodesGroup.empty()) return;

  nodesGroup.selectAll('.node').each(function (d) {
    const id = d?.data?.id;
    const kind = id != null ? getSelectionKind(selection, id) : null;

    const g = d3.select(this);
    g.classed('hl-desc', kind === 'desc').classed('hl-anc', kind === 'anc').classed('hl-selected', kind === 'selected');

    const ring = g.select('.glow-ring');
    if (!ring.empty()) {
      const stroke = kind === 'selected'
        ? '#FFC107'
        : kind === 'desc'
          ? '#FFD54F'
          : kind === 'anc'
            ? '#B0BEC5'
            : baseStrokeForType(d?.data?.type);

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

    // When clearing selection, ensure ring is reset to its base stroke as the hover code expects it.
    if (!kind && ring && !ring.empty()) {
      ring.attr('stroke', baseStrokeForType(d?.data?.type));
    }
  });

  // Activate "sap flow" on branch links within the selected subtree.
  const linksGroup = d3.select(svgEl).select('.links');
  if (!linksGroup.empty()) {
    const selectedId = selection?.selectedId ?? null;
    const descendants = selection?.descendants instanceof Set ? selection.descendants : new Set();
    const isLargeSelection = descendants.size > 90;

    linksGroup.selectAll('.sap-flow').each(function () {
      const sid = Number(this.dataset?.sourceId);
      const tid = Number(this.dataset?.targetId);

      const active = !!sapFlowEnabled && !!selectedId && Number.isFinite(sid) && Number.isFinite(tid) && (
        // For small selections, animate the whole subtree.
        (!isLargeSelection && descendants.has(sid) && descendants.has(tid)) ||
        // For huge selections (e.g., selecting trunk), animate only the "first hop" from selected.
        (isLargeSelection && sid === selectedId && descendants.has(tid))
      );

      d3.select(this).classed('sap-active', active);
    });
  }
};
