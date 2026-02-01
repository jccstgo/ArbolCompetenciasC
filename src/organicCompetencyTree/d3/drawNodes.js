import * as d3 from 'd3';
import { nodeConfig } from '../constants.js';
import { getLabelWrapConfig, wrapSvgText } from './textWrap.js';

export function drawNodes({ mainGroup, allNodes, isFirstRender }) {
  // Draw nodes
  const nodesGroup = mainGroup.append('g').attr('class', 'nodes');
  const nodeSelection = nodesGroup.selectAll('.node')
    .data(allNodes)
    .enter()
    .append('g')
    .attr('class', d => `node node-${d.data.id} node-type-${d.data.type}`)
    .attr('transform', d => `translate(${d.fx}, ${d.fy})`)
    .style('cursor', d => d.data.type === 'trunk' ? 'default' : 'grab');

  // Large invisible hit-area so taps/drags work anywhere on the node (Safari/iPad friendly).
  nodeSelection.append('circle')
    .attr('class', 'node-hit-area')
    .attr('cx', 0)
    .attr('cy', (d) => (d.data.type === 'trunk' ? -65 : d.data.type === 'fruit' ? -8 : 0))
    .attr('r', (d) => {
      if (d.data.type === 'trunk') return 140;
      if (d.data.type === 'root') return nodeConfig.root.radius * 2.7;
      if (d.data.type === 'branch') return nodeConfig.branch.radius * 3.0;
      if (d.data.type === 'fruit') return nodeConfig.fruit.radius * 3.4;
      return 44;
    })
    // Use an almost-transparent fill (not fully 0) for more reliable touch hit-testing on Safari.
    .attr('fill', 'rgba(0,0,0,0.001)')
    .style('pointer-events', 'all');
  
  // Foliage (inside node group)
  nodeSelection.each(function(d) {
    const nodeGroup = d3.select(this);
    const leaves = d.leaves || [];
    
    if (leaves.length > 0) {
      const foliageGroup = nodeGroup.append('g').attr('class', 'foliage');
      
      leaves.forEach((leaf, i) => {
        const seed = ((d.data.id ?? 0) * 9973 + i * 1013) % 1000;
        const swayRot = 5.0 + (seed % 9) * 0.58; // ~5.0deg..10.2deg (+~40%)
        const swayX = ((seed % 7) - 3) * 0.75; // ~-2.25px..2.25px (+~40%)
        const swayY = -1.65 + ((seed % 5) - 2) * 0.36; // ~-2.37px..-0.93px (+~40%)
        const dur = 3.6 + (seed % 100) / 100 * 2.1; // 3.6s..5.7s
        const delay = ((leaf.delay ?? 0) + i * 60) / 1000;

        const ellipse = foliageGroup.append('ellipse')
          .attr('class', 'breeze-leaf')
          .attr('cx', leaf.x)
          .attr('cy', leaf.y)
          .attr('fill', leaf.color)
          .style('--leaf-rot', `${leaf.rotation}deg`)
          .style('--sway-rot', `${swayRot}deg`)
          .style('--sway-x', `${swayX}px`)
          .style('--sway-y', `${swayY}px`)
          .style('--breeze-duration', `${dur.toFixed(2)}s`)
          .style('--breeze-delay', `${delay.toFixed(2)}s`);
        
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

  // Avoid tiny ring stroke being the only touch target.
  // (We use `.node-hit-area` for interaction hit-testing.)
  nodeSelection.selectAll('.glow-ring').style('pointer-events', 'none');
  
  // Root nodes (organic, root-like appearance with enhanced 3D)
  const rootNodeGroups = nodeSelection.filter(d => d.data.type === 'root')
    .append('g')
    .attr('class', 'node-shape root-shape');
  
  // Layer 1: Deep shadow for ground depth
  rootNodeGroups.append('ellipse')
    .attr('class', 'root-deep-shadow')
    .attr('cx', 4)
    .attr('cy', 5)
    .attr('fill', 'rgba(0,0,0,0.2)')
    .attr('rx', d => nodeConfig.root.radius + 6)
    .attr('ry', d => nodeConfig.root.radius * 0.85 + 4);
  
  // Layer 2: Main shadow for depth
  rootNodeGroups.append('ellipse')
    .attr('class', 'root-shadow')
    .attr('cx', 2)
    .attr('cy', 3)
    .attr('fill', 'rgba(26, 15, 10, 0.4)')
    .attr('rx', d => nodeConfig.root.radius + 4)
    .attr('ry', d => nodeConfig.root.radius * 0.85 + 3);
  
  // Layer 3: Main root body with enhanced gradient
  rootNodeGroups.append('ellipse')
    .attr('class', 'root-body')
    .attr('fill', 'url(#root-node-gradient)')
    .attr('stroke', '#2D1B12')
    .attr('stroke-width', 3);
  
  // Layer 4: Inner shadow overlay for spherical depth
  rootNodeGroups.append('ellipse')
    .attr('class', 'root-inner-shadow')
    .attr('fill', 'url(#root-node-inner-shadow)')
    .attr('rx', d => nodeConfig.root.radius)
    .attr('ry', d => nodeConfig.root.radius * 0.85);
  
  // Layer 5: Inner texture - bark-like lines with 3D effect (dark + light pairs)
  rootNodeGroups.each(function(d) {
    const g = d3.select(this);
    const r = nodeConfig.root.radius;
    const seed = d.data.id;
  
    // Add bark texture lines on the root body
    for (let i = 0; i < 5; i++) {
      const angle = -0.7 + i * 0.35 + Math.sin(seed + i) * 0.12;
      const x1 = Math.cos(angle) * r * 0.25;
      const y1 = Math.sin(angle) * r * 0.2 - r * 0.25;
      const x2 = Math.cos(angle) * r * 0.75;
      const y2 = Math.sin(angle) * r * 0.65 + r * 0.1;
  
      // Dark groove (shadow)
      g.append('path')
        .attr('class', 'root-texture-dark')
        .attr('d', `M ${x1} ${y1} Q ${(x1+x2)/2 + Math.sin(seed+i)*4} ${(y1+y2)/2} ${x2} ${y2}`)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(26, 15, 10, 0.35)')
        .attr('stroke-width', 1.5 + Math.random() * 0.5)
        .attr('stroke-linecap', 'round');
  
      // Light edge (highlight of groove)
      g.append('path')
        .attr('class', 'root-texture-light')
        .attr('d', `M ${x1 + 1.5} ${y1 + 1} Q ${(x1+x2)/2 + Math.sin(seed+i)*4 + 1.5} ${(y1+y2)/2 + 1} ${x2 + 1.5} ${y2 + 1}`)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(161, 136, 127, 0.2)')
        .attr('stroke-width', 0.8)
        .attr('stroke-linecap', 'round');
    }
  
    // Add additional horizontal texture lines for wood grain effect
    for (let i = 0; i < 3; i++) {
      const yPos = -r * 0.3 + i * r * 0.35;
      const width = r * (0.7 - Math.abs(yPos / r) * 0.3);
  
      g.append('path')
        .attr('class', 'root-grain')
        .attr('d', `M ${-width} ${yPos} Q 0 ${yPos + 2 + Math.sin(seed + i) * 2} ${width} ${yPos}`)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(26, 15, 10, 0.15)')
        .attr('stroke-width', 0.8);
    }
  });
  
  // Layer 6: Main highlight for 3D spherical effect
  rootNodeGroups.append('ellipse')
    .attr('class', 'root-highlight')
    .attr('cx', d => -nodeConfig.root.radius * 0.28)
    .attr('cy', d => -nodeConfig.root.radius * 0.25)
    .attr('rx', d => nodeConfig.root.radius * 0.45)
    .attr('ry', d => nodeConfig.root.radius * 0.35)
    .attr('fill', 'url(#root-node-highlight)');
  
  // Layer 7: Specular highlight for shine
  rootNodeGroups.append('ellipse')
    .attr('class', 'root-specular')
    .attr('cx', d => -nodeConfig.root.radius * 0.35)
    .attr('cy', d => -nodeConfig.root.radius * 0.3)
    .attr('rx', d => nodeConfig.root.radius * 0.2)
    .attr('ry', d => nodeConfig.root.radius * 0.15)
    .attr('fill', 'rgba(240, 235, 230, 0.35)');
  
  // Layer 8: Secondary specular dot
  rootNodeGroups.append('ellipse')
    .attr('class', 'root-specular-dot')
    .attr('cx', d => -nodeConfig.root.radius * 0.4)
    .attr('cy', d => -nodeConfig.root.radius * 0.35)
    .attr('rx', d => nodeConfig.root.radius * 0.08)
    .attr('ry', d => nodeConfig.root.radius * 0.06)
    .attr('fill', 'rgba(255, 255, 255, 0.4)');
  
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
    .attr('class', 'apple-leaf breeze-leaf')
    .attr('cx', d => nodeConfig.fruit.radius * 0.42)
    .attr('cy', d => -nodeConfig.fruit.radius * 1.45)
    .attr('rx', d => nodeConfig.fruit.radius * 0.45)
    .attr('ry', d => nodeConfig.fruit.radius * 0.22)
    .attr('fill', 'url(#leaf-gradient)')
    .attr('stroke', '#1B5E20')
    .attr('stroke-width', 1.5)
    .style('--leaf-rot', `-25deg`)
    .style('--sway-rot', `8.1deg`)
    .style('--sway-x', `1.93px`)
    .style('--sway-y', `-1.68px`)
    .style('--breeze-duration', `4.6s`);
  
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
  
  // Deep shadow layer at the very back for 3D depth
  const canopyShadowCircles = [
    { cx: 5, cy: -55, r: 70 },
    { cx: -25, cy: -65, r: 55 },
    { cx: 30, cy: -60, r: 50 },
  ];
  
  canopyShadowCircles.forEach((c) => {
    canopyGroup.append('circle')
      .attr('class', 'canopy-shadow')
      .attr('cx', c.cx)
      .attr('cy', c.cy)
      .attr('r', isFirstRender.current ? 0 : c.r)
      .attr('fill', '#0D3B12')
      .attr('opacity', 0.5);
  });
  
  // Background foliage layer (darker, larger circles) - scaled up for bigger tree
  const canopyBackCircles = [
    { cx: -50, cy: -90, r: 52 },
    { cx: 55, cy: -85, r: 48 },
    { cx: 0, cy: -110, r: 58 },
    { cx: -35, cy: -20, r: 44 },
    { cx: 42, cy: -15, r: 42 },
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
      .attr('opacity', 0.75);
  });
  
  // Inner shadow layer between back and mid for 3D depth
  const innerShadowCircles = [
    { cx: -20, cy: -60, r: 35 },
    { cx: 25, cy: -55, r: 32 },
    { cx: 0, cy: -20, r: 28 },
  ];
  
  innerShadowCircles.forEach((c) => {
    canopyGroup.append('circle')
      .attr('class', 'canopy-inner-shadow')
      .attr('cx', c.cx)
      .attr('cy', c.cy)
      .attr('r', isFirstRender.current ? 0 : c.r)
      .attr('fill', 'url(#canopy-inner-shadow)')
      .attr('opacity', 0.6);
  });
  
  // Middle foliage layer with improved 3D gradient
  const canopyMidCircles = [
    { cx: -30, cy: -80, r: 50 },
    { cx: 35, cy: -75, r: 46 },
    { cx: 0, cy: -95, r: 55 },
    { cx: -55, cy: -65, r: 40 },
    { cx: 50, cy: -60, r: 38 },
    { cx: -15, cy: -15, r: 35 },
    { cx: 20, cy: -10, r: 33 },
  ];
  
  canopyMidCircles.forEach((c, i) => {
    canopyGroup.append('circle')
      .attr('class', 'canopy-mid')
      .attr('cx', c.cx)
      .attr('cy', c.cy)
      .attr('r', isFirstRender.current ? 0 : c.r)
      .attr('fill', 'url(#canopy-gradient)')
      .attr('opacity', 0.9);
  });
  
  // Front foliage layer (brightest, main visible circles) with enhanced 3D
  const canopyFrontCircles = [
    { cx: -22, cy: -75, r: 45 },
    { cx: 25, cy: -70, r: 42 },
    { cx: 0, cy: -88, r: 48 },
    { cx: -42, cy: -58, r: 35 },
    { cx: 40, cy: -52, r: 34 },
    { cx: 0, cy: -60, r: 40 },
    { cx: -18, cy: -10, r: 30 },
    { cx: 22, cy: -5, r: 28 },
  ];
  
  canopyFrontCircles.forEach((c, i) => {
    // Main foliage circle with gradient
    canopyGroup.append('circle')
      .attr('class', 'canopy-front')
      .attr('cx', c.cx)
      .attr('cy', c.cy)
      .attr('r', isFirstRender.current ? 0 : c.r)
      .attr('fill', 'url(#leaf-gradient)')
      .attr('stroke', '#1B5E20')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.95);
  
    // Individual sphere highlight for 3D effect on each foliage cluster
    canopyGroup.append('circle')
      .attr('class', 'canopy-front-highlight')
      .attr('cx', c.cx - c.r * 0.25)
      .attr('cy', c.cy - c.r * 0.3)
      .attr('r', isFirstRender.current ? 0 : c.r * 0.4)
      .attr('fill', 'rgba(200, 230, 201, 0.35)')
      .attr('opacity', 0.7);
  });
  
  // Top highlight circles simulating sunlight from above-left
  const highlightCircles = [
    { cx: -18, cy: -95, r: 28 },
    { cx: 15, cy: -88, r: 24 },
    { cx: -40, cy: -75, r: 20 },
    { cx: 35, cy: -70, r: 18 },
    { cx: -8, cy: -105, r: 22 },
    { cx: 5, cy: -78, r: 16 },
  ];
  
  highlightCircles.forEach((c) => {
    canopyGroup.append('circle')
      .attr('class', 'canopy-highlight')
      .attr('cx', c.cx)
      .attr('cy', c.cy)
      .attr('r', isFirstRender.current ? 0 : c.r)
      .attr('fill', 'url(#canopy-highlight-gradient)')
      .attr('opacity', 0.6);
  });
  
  // Bright sun spots on top of canopy for dramatic 3D lighting
  const sunSpots = [
    { cx: -12, cy: -100, r: 12 },
    { cx: 8, cy: -92, r: 10 },
    { cx: -30, cy: -82, r: 8 },
  ];
  
  sunSpots.forEach((c) => {
    canopyGroup.append('circle')
      .attr('class', 'canopy-sunspot')
      .attr('cx', c.cx)
      .attr('cy', c.cy)
      .attr('r', isFirstRender.current ? 0 : c.r)
      .attr('fill', 'rgba(255, 255, 240, 0.45)')
      .attr('opacity', 0.5);
  });
  
  // Apply drop shadow to entire canopy
  canopyGroup.attr('filter', 'url(#drop-shadow)');
  
  // Animate canopy on first render - includes all 3D layers
  if (isFirstRender.current) {
    const allCanopyCircles = [
      ...canopyShadowCircles,
      ...canopyBackCircles,
      ...innerShadowCircles,
      ...canopyMidCircles,
      ...canopyFrontCircles,
      ...canopyFrontCircles.map(c => ({ cx: c.cx - c.r * 0.25, cy: c.cy - c.r * 0.3, r: c.r * 0.4 })), // front highlights
      ...highlightCircles,
      ...sunSpots
    ];
    canopyGroup.selectAll('circle')
      .transition()
      .duration(800)
      .delay((d, i) => i * 25)
      .attr('r', function() {
        const el = d3.select(this);
        const cx = parseFloat(el.attr('cx'));
        const cy = parseFloat(el.attr('cy'));
        const match = allCanopyCircles.find(c => Math.abs(c.cx - cx) < 0.1 && Math.abs(c.cy - cy) < 0.1);
        return match?.r || 30;
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
  
  return { nodesGroup, nodeSelection };
}

