import * as d3 from 'd3';
import { deepClone, findNode, getAllChildren } from '../treeUtils.js';

export function toggleChildrenCollapsedAction({
  nodeId,
  treeData,
  svgRef,
  setTreeData,
  setStructureVersion,
  setContextMenu,
  applySelectionHighlight,
  selectionRef,
}) {
  const current = findNode(treeData, nodeId);
  if (!current || current.type === 'fruit') return;

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
}
