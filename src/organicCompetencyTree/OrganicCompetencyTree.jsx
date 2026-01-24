import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import initialData from './initialData.js';
import { nodeConfig, typeLabels } from './constants.js';
import './organicAnimations.css';
import { getLabelWrapConfig, wrapSvgText } from './d3/textWrap.js';
import { applySelectionStyles, computeSelection, createEmptySelection, getSelectionKind, isNodeVisible } from './d3/selectionHighlight.js';
import { renderFullScene } from './d3/renderFullScene.js';
import { addChildIncremental } from './actions/addChild.js';
import { toggleChildrenCollapsedAction } from './actions/toggleChildrenCollapsed.js';
import { confirmDeleteAction } from './actions/confirmDelete.js';
import {
  countNodes,
  deepClone,
  findNode,
  getAllChildren,
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
import BottomActionBar from './ui/BottomActionBar.jsx';
import SearchBar from './ui/SearchBar.jsx';
import { fontFamily } from './ui/glassStyles.js';

// ============================================
// ORGANIC COMPETENCY TREE v10.0
// Preserves zoom on structure changes
// ============================================

// NOTE: Configuration/data/utilities live in `src/organicCompetencyTree/*`.

export default function OrganicCompetencyTree() {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const zoomRef = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const isFirstRender = useRef(true);
  const linkFnsRef = useRef({ rootPath: null, branchPath: null, rootWidth: null, branchWidth: null });
  const treeDataRef = useRef(null);
  const selectionRef = useRef(createEmptySelection());
  const ambientTimerRef = useRef(null);
  const sapFlowEnabledRef = useRef(true);
  
  const [treeData, setTreeData] = useState(initialData);
  const [contextMenu, setContextMenu] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [nextId, setNextId] = useState(100);
  const [structureVersion, setStructureVersion] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [sapFlowEnabled, setSapFlowEnabled] = useState(true);
  
  const [renameModal, setRenameModal] = useState({ isOpen: false, nodeId: null, currentName: '', nodeType: '' });
  const [masteryModal, setMasteryModal] = useState({ isOpen: false, nodeId: null, currentMastery: 50, nodeName: '' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, nodeId: null, nodeName: '' });
  
  const [renameValue, setRenameValue] = useState('');
  const [masteryValue, setMasteryValue] = useState(50);

  useEffect(() => { treeDataRef.current = treeData; }, [treeData]);
  useEffect(() => { sapFlowEnabledRef.current = sapFlowEnabled; }, [sapFlowEnabled]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    applySelectionStyles({ svgEl, selection: selectionRef.current, nodeConfig, sapFlowEnabled: sapFlowEnabledRef.current });
  }, [sapFlowEnabled]);

  useEffect(() => {
    return () => {
      if (ambientTimerRef.current?.stop) ambientTimerRef.current.stop();
    };
  }, []);

  const getSelectionKindForId = useCallback((id) => getSelectionKind(selectionRef.current, id), []);

  const applySelectionHighlight = useCallback((selectedId) => {
    const svgEl = svgRef.current;
    const model = treeDataRef.current;
    if (!svgEl || !model) return;

    if (!selectedId) {
      const empty = createEmptySelection();
      selectionRef.current = empty;
      applySelectionStyles({ svgEl, selection: empty, nodeConfig, sapFlowEnabled: sapFlowEnabledRef.current });
      setSelectedNodeId(null);
      return;
    }

    if (!isNodeVisible(svgEl, selectedId)) {
      const empty = createEmptySelection();
      selectionRef.current = empty;
      applySelectionStyles({ svgEl, selection: empty, nodeConfig, sapFlowEnabled: sapFlowEnabledRef.current });
      setSelectedNodeId(null);
      return;
    }

    const selection = computeSelection({ model, selectedId, findNode, getAllChildren });
    selectionRef.current = selection;
    applySelectionStyles({ svgEl, selection, nodeConfig, sapFlowEnabled: sapFlowEnabledRef.current });
    setSelectedNodeId(selectedId);
  }, []);

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
    addChildIncremental({
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
    });
  }, [nextId, treeData, dimensions, applySelectionHighlight, getSelectionKindForId]);


  const toggleChildrenCollapsed = useCallback((nodeId) => {
    toggleChildrenCollapsedAction({
      nodeId,
      treeData,
      svgRef,
      setTreeData,
      setStructureVersion,
      setContextMenu,
      applySelectionHighlight,
      selectionRef,
    });
  }, [treeData, applySelectionHighlight]);


  const confirmDelete = useCallback(() => {
    confirmDeleteAction({
      deleteModal,
      treeData,
      svgRef,
      setTreeData,
      setDeleteModal,
      setContextMenu,
      applySelectionHighlight,
      selectionRef,
    });
  }, [deleteModal.nodeId, treeData.id, applySelectionHighlight]);

  const centerOnNode = useCallback((nodeId) => {
    const svgEl = svgRef.current;
    const zoomBehavior = zoomBehaviorRef.current;
    const model = treeDataRef.current;
    if (!svgEl || !zoomBehavior || !model) return;

    const target = findNode(model, nodeId);
    if (!target) return;

    const subtreeIds = [];
    const stack = [target];
    while (stack.length) {
      const next = stack.pop();
      if (!next) continue;
      subtreeIds.push(next.id);
      stack.push(...getAllChildren(next));
    }

    const svg = d3.select(svgEl);
    const nodesGroup = svg.select('.nodes');
    if (nodesGroup.empty()) return;

    const effectiveRadius = (t) => {
      if (t === 'trunk') return 140;
      if (t === 'root') return nodeConfig.root.radius * 2.2;
      if (t === 'branch') return nodeConfig.branch.radius * 2.0;
      if (t === 'fruit') return nodeConfig.fruit.radius * 2.6;
      return 40;
    };

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const id of subtreeIds) {
      const el = nodesGroup.select(`.node-${id}`).node();
      if (!el) continue;
      const d = d3.select(el).datum();
      const x = d?.fx;
      const y = d?.fy;
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const r = effectiveRadius(d?.data?.type);
      minX = Math.min(minX, x - r);
      minY = Math.min(minY, y - r);
      maxX = Math.max(maxX, x + r);
      maxY = Math.max(maxY, y + r);
    }

    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return;

    const boundsW = Math.max(1, maxX - minX);
    const boundsH = Math.max(1, maxY - minY);

    // Leave room for header + floating bottom controls.
    const insetTop = 90;
    const insetBottom = 170;
    const insetSide = 22;

    const availW = Math.max(1, dimensions.width - insetSide * 2);
    const availH = Math.max(1, dimensions.height - insetTop - insetBottom);

    const rawScale = Math.min(availW / boundsW, availH / boundsH);
    const scale = Math.max(0.25, Math.min(rawScale, 3));

    const tx = insetSide + (availW - boundsW * scale) / 2 - minX * scale;
    const ty = insetTop + (availH - boundsH * scale) / 2 - minY * scale;
    const t = d3.zoomIdentity.translate(tx, ty).scale(scale);

    zoomRef.current = t;
    svg.transition().duration(650).call(zoomBehavior.transform, t);
  }, [dimensions.height, dimensions.width]);


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
    renderFullScene({
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
      structureVersion,
    });
  }, [structureVersion, dimensions]);


  const handleMenuAction = (action, nodeId) => {
    if (action === 'addRoot') addChild(nodeId, 'root');
    else if (action === 'addBranch') addChild(nodeId, 'branch');
    else if (action === 'addFruit') addChild(nodeId, 'fruit');
    else if (action === 'toggleChildren') toggleChildrenCollapsed(nodeId);
    else if (action === 'center') { centerOnNode(nodeId); setContextMenu(null); }
    else if (action === 'rename') openRenameModal(nodeId);
    else if (action === 'delete') openDeleteModal(nodeId);
    else if (action === 'editMastery') openMasteryModal(nodeId);
  };

  const selectedNode = selectedNodeId ? findNode(treeData, selectedNodeId) : null;
  const selectedMenuOptions = selectedNode ? getMenuOptions(selectedNode) : [];

  const contextNode = contextMenu ? findNode(treeData, contextMenu.nodeId) : null;
  const contextMenuOptions = contextNode ? getMenuOptions(contextNode) : [];

  // Handle search result selection: center on node and highlight it
  const handleSearchSelect = useCallback((nodeId) => {
    centerOnNode(nodeId);
    applySelectionHighlight(nodeId);
  }, [centerOnNode, applySelectionHighlight]);

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', background: '#0d1b2a', position: 'relative', overflow: 'hidden', fontFamily }}>

      <TreeHeader />
      <SearchBar treeData={treeData} onSelectNode={handleSearchSelect} />
      <Legend />
      <Stats treeData={treeData} countNodes={countNodes} />

      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} style={{ display: 'block' }} />

      <ContextMenu contextMenu={contextMenu} options={contextMenuOptions} onAction={handleMenuAction} containerRef={containerRef} />

      <BottomActionBar
        selectedNode={selectedNode}
        options={selectedMenuOptions}
        sapFlowEnabled={sapFlowEnabled}
        onToggleSapFlow={() => setSapFlowEnabled((v) => !v)}
        onAction={(action, nodeId) => {
          setContextMenu(null);
          handleMenuAction(action, nodeId);
        }}
      />

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
