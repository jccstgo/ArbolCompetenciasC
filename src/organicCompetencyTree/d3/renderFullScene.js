import * as d3 from 'd3';
import { createSceneDefs } from './sceneDefs.js';
import { drawBackgroundAndGround } from './drawBackgroundAndGround.js';
import { computeTreeGeometry } from './computeTreeGeometry.js';
import { drawTrunkAndDecor } from './drawTrunkAndDecor.js';
import { createLinkFns } from './createLinkFns.js';
import { drawLinks } from './drawLinks.js';
import { drawNodes } from './drawNodes.js';
import { attachInteractions } from './attachInteractions.js';
import { applyInitialOrSavedZoom } from './applyZoom.js';

export function renderFullScene({
  svgRef,
  treeData,
  treeDataRef,
  dimensions,
  zoomRef,
  zoomBehaviorRef,
  linkFnsRef,
  isFirstRender,
  selectionRef,
  setContextMenu,
  applySelectionHighlight,
  getSelectionKindForId,
}) {
  if (!svgRef.current || !treeData) return;

  const svg = d3.select(svgRef.current);
  const { width, height } = dimensions;

  // Save current transform before clearing.
  const savedTransform = zoomRef.current;

  svg.selectAll('*').remove();

  const defs = svg.append('defs');
  createSceneDefs(defs);

  const mainGroup = svg.append('g').attr('class', 'main-group');

  // Setup zoom behavior.
  const zoomBehavior = d3
    .zoom()
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

  drawBackgroundAndGround({ defs, mainGroup, width, height, centerX, groundY });

  const { allNodes, allLinks } = computeTreeGeometry({
    treeData,
    width,
    height,
    centerX,
    groundY,
  });

  drawTrunkAndDecor({ mainGroup, centerX, groundY });

  const linkFns = createLinkFns({ centerX, groundY });
  linkFnsRef.current = linkFns;

  const { linksGroup } = drawLinks({ mainGroup, allLinks, linkFns, isFirstRender });
  const { nodesGroup, nodeSelection } = drawNodes({ mainGroup, allNodes, isFirstRender });

  attachInteractions({
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
  });

  applyInitialOrSavedZoom({
    svg,
    zoomBehavior,
    zoomRef,
    isFirstRender,
    savedTransform,
    width,
    height,
    centerX,
    groundY,
    linksGroup,
    nodesGroup,
  });
}
