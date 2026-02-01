import * as d3 from 'd3';
import { createSceneDefs } from './sceneDefs.js';
import { drawBackgroundAndGround } from './drawBackgroundAndGround.js';
import { drawFloatingParticles } from './drawFloatingParticles.js';
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
  ambientTimerRef,
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

  if (ambientTimerRef?.current) {
    ambientTimerRef.current.stop();
    ambientTimerRef.current = null;
  }

  svg.selectAll('*').remove();

  const defs = svg.append('defs');
  createSceneDefs(defs);

  const centerX = width / 2;
  const groundY = height * 0.58;

  const backgroundGroup = svg.append('g').attr('class', 'background-group').style('pointer-events', 'none');
  const mainGroup = svg.append('g').attr('class', 'main-group');

  // Setup zoom behavior.
  const zoomBehavior = d3
    .zoom()
    // Keep default touch behavior (1-finger pan + 2-finger pinch), but don't start zoom when touching a node
    // so dragging a node on tablets doesn't fight with panning.
    .filter((event) => {
      const isWithinNode = (targetEl) => {
        let el = targetEl;
        const svgEl = svgRef.current;
        while (el && el !== svgEl) {
          if (el.classList?.contains?.('node')) return true;
          el = el.parentNode;
        }
        return false;
      };

      const t = event?.type;
      if (t === 'wheel') return true;
      if (t === 'mousedown') return event.button === 0;

      const touches = event?.touches;
      if (touches && touches.length > 1) return true; // allow pinch anywhere

      const target = event?.target;
      if (isWithinNode(target)) return false; // 1-finger on node => drag, not pan

      return true;
    })
    .scaleExtent([0.25, 3])
    .on('zoom', (event) => {
      zoomRef.current = event.transform;
      mainGroup.attr('transform', event.transform);

      // Parallax: move the cloud layer a bit less than the scene to create depth.
      const t = event.transform;
      const px = t.x * 0.35;
      const py = t.y * 0.35;
      const pk = 1 + (t.k - 1) * 0.12;
      backgroundGroup.select('.bg-clouds').attr('transform', d3.zoomIdentity.translate(px, py).scale(pk));
    });

  zoomBehaviorRef.current = zoomBehavior;
  svg.call(zoomBehavior);

  // Clicking empty space clears selection + context menu.
  svg.on('click', (event) => {
    if (event.defaultPrevented) return;
    setContextMenu(null);
    applySelectionHighlight(null);
  });

  drawBackgroundAndGround({ defs, backgroundGroup, mainGroup, width, height, centerX, groundY });

  // Ambient particles must be drawn AFTER the background so they aren't covered by it.
  // (These particles live inside `mainGroup`, so they zoom/pan with the scene.)
  if (ambientTimerRef) {
    ambientTimerRef.current = drawFloatingParticles({ svg, container: mainGroup, width, height, groundY });
  } else {
    drawFloatingParticles({ svg, container: mainGroup, width, height, groundY });
  }

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
