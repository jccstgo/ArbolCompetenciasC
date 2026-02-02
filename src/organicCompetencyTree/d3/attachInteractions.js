import * as d3 from 'd3';
import { findNode, getAllChildren } from '../treeUtils.js';

export function attachInteractions({
  svg,
  svgRef,
  treeData,
  treeDataRef,
  nodesGroup,
  nodeSelection,
  linksGroup,
  linkFns,
  zoomRef,
  setContextMenu,
  applySelectionHighlight,
  getSelectionKindForId,
  selectionRef,
}) {
  const { rootPath, rootletPath, branchPath, branchTwigPath } = linkFns;

  const getSvgPixelPoint = (dragEvent) => {
    const svgEl = svgRef.current;
    if (!svgEl) return [0, 0];

    if (Number.isFinite(dragEvent?.x) && Number.isFinite(dragEvent?.y)) {
      return [dragEvent.x, dragEvent.y];
    }

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

  // Drag
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
  
  const dragBehavior = d3.drag()
    .container(() => svgRef.current)
    .touchable(true)
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
      if (!Number.isFinite(px) || !Number.isFinite(py)) {
        d.dragReady = false;
        return;
      }
      d.dragReady = true;
      d.mouseStartX = (px - transform.x) / transform.k;
      d.mouseStartY = (py - transform.y) / transform.k;
  
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
      if (d.dragReady === false) return;
      const transform = zoomRef.current || d3.zoomIdentity;
      const [px, py] = getSvgPixelPoint(event);
      if (!Number.isFinite(px) || !Number.isFinite(py)) return;
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
      linksGroup.selectAll('.root-rootlet, .root-rootlet-shadow, .root-rootlet-highlight').attr('d', rootletPath);
      linksGroup.selectAll('.branch-link-deep-shadow, .branch-link-shadow, .branch-link-base, .branch-link-edge-shadow, .branch-link-texture-dark, .branch-link-texture-light, .branch-link-center-highlight, .branch-link-highlight, .branch-link-highlight2, .branch-link-specular, .branch-sap-flow').attr('d', branchPath);
      linksGroup.selectAll('.branch-twig, .branch-twig-shadow, .branch-twig-highlight, .twig-sap-flow').attr('d', branchTwigPath);
    })
    .on('end', function (_event, d) {
      const nodeEl = this?.closest?.('.node') || this?.parentNode;
      const nodeSel = nodeEl ? d3.select(nodeEl) : d3.select(this);
      nodeSel.style('cursor', 'grab');
      const kind = getSelectionKindForId(d?.data?.id);
      const baseOpacity = kind ? (kind === 'selected' ? 0.95 : kind === 'desc' ? 0.72 : 0.66) : 0;
      nodeSel.select('.glow-ring').transition().duration(200).attr('opacity', baseOpacity);
      if (d.subtreeDrag?.subtree?.length) {
        for (const item of d.subtreeDrag.subtree) {
          const dataNode = item?.d?.data;
          if (!dataNode) continue;
          if (Number.isFinite(item.d.fx) && Number.isFinite(item.d.fy)) {
            dataNode.pos = { x: item.d.fx, y: item.d.fy };
          }
        }
      } else if (d?.data && Number.isFinite(d.fx) && Number.isFinite(d.fy)) {
        d.data.pos = { x: d.fx, y: d.fy };
      }
      d.subtreeDrag = null;
      d.dragReady = null;
    });
  
  // Apply drag behavior only to non-trunk nodes (trunk/canopy is fixed).
  // Bind drag to the `.node-hit-area` element (not the `<g>`) for better iPad/Safari touch behavior.
  nodeSelection
    .filter((d) => d.data.type !== 'trunk')
    .selectAll('.node-hit-area')
    .call(dragBehavior);

  // Set cursor style for trunk to indicate it's not draggable.
  nodeSelection.filter((d) => d.data.type === 'trunk').style('cursor', 'default');
  
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
  
}


