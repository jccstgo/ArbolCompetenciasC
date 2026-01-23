import * as d3 from 'd3';
import { deepClone, findNode, findParent, getAllChildren } from '../treeUtils.js';

export function confirmDeleteAction({
  deleteModal,
  treeData,
  svgRef,
  setTreeData,
  setDeleteModal,
  setContextMenu,
  applySelectionHighlight,
  selectionRef,
}) {
  if (!deleteModal.nodeId || deleteModal.nodeId === treeData.id) return;

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
}
