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
    const parentSel = d3.select(svgEl).select(`.node-${nodeId}`);
    const parentDatum = parentSel.empty() ? null : parentSel.datum();
    const parentX = Number.isFinite(parentDatum?.fx) ? parentDatum.fx : 0;
    const parentY = Number.isFinite(parentDatum?.fy) ? parentDatum.fy : 0;

    const collapseDur = 420;
    const expandDur = 520;
    const collapseEase = d3.easeCubicIn;
    const expandEase = d3.easeCubicOut;

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

      // Smooth collapse: fade + drift toward the parent before hiding.
      if (Number.isFinite(parentX) && Number.isFinite(parentY)) {
        hideNodeSel
          .style('pointer-events', 'none')
          .interrupt()
          .transition()
          .duration(collapseDur)
          .ease(collapseEase)
          .style('opacity', 0)
          .attr('transform', `translate(${parentX}, ${parentY})`)
          .on('end', function (event, d) {
            const sel = d3.select(this);
            sel.style('display', 'none').style('opacity', null).style('pointer-events', null);
            if (Number.isFinite(d?.fx) && Number.isFinite(d?.fy)) {
              sel.attr('transform', `translate(${d.fx}, ${d.fy})`);
            } else {
              sel.attr('transform', null);
            }
          });

        hideLinkSel
          .style('pointer-events', 'none')
          .interrupt()
          .transition()
          .duration(Math.max(180, Math.round(collapseDur * 0.85)))
          .ease(collapseEase)
          .style('opacity', 0)
          .on('end', function () {
            d3.select(this).style('display', 'none').style('opacity', null).style('pointer-events', null);
          });
      } else {
        hideNodeSel.style('display', 'none');
        hideLinkSel.style('display', 'none');
      }
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

      // Smooth expand: show at parent and ease into their saved positions.
      if (Number.isFinite(parentX) && Number.isFinite(parentY)) {
        showNodeSel
          .interrupt()
          .style('display', null)
          .style('pointer-events', 'none')
          .style('opacity', 0)
          .attr('transform', `translate(${parentX}, ${parentY})`)
          .transition()
          .duration(expandDur)
          .ease(expandEase)
          .style('opacity', 1)
          .attr('transform', (d) => `translate(${d.fx}, ${d.fy})`)
          .on('end', function () {
            d3.select(this).style('pointer-events', null).style('opacity', null);
          });

        showLinkSel
          .interrupt()
          .style('display', null)
          .style('pointer-events', 'none')
          .style('opacity', 0)
          .transition()
          .duration(Math.max(220, Math.round(expandDur * 0.9)))
          .ease(expandEase)
          .style('opacity', 1)
          .on('end', function () {
            d3.select(this).style('pointer-events', null).style('opacity', null);
          });
      } else {
        showNodeSel.style('display', null);
        showLinkSel.style('display', null);
      }
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
