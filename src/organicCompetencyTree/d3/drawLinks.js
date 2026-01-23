import * as d3 from 'd3';

export function drawLinks({ mainGroup, allLinks, linkFns, isFirstRender }) {
  const { rootPath, rootletPath, branchPath, rootWidth, branchWidth, branchTwigPath } = linkFns;

  // Draw links
  const linksGroup = mainGroup.append('g').attr('class', 'links');
  
  const rootLinks = allLinks.filter(l => l.type === 'root');
  
  // Layer 1: Deep shadow for ground depth effect
  linksGroup.selectAll('.root-link-deep-shadow')
    .data(rootLinks)
    .enter().append('path')
    .attr('class', 'root-link-deep-shadow link')
    .attr('d', rootPath)
    .attr('fill', 'none')
    .attr('stroke', '#0A0705')
    .attr('stroke-width', d => isFirstRender.current ? 0 : rootWidth(d) + 8)
    .attr('stroke-linecap', 'round')
    .attr('stroke-opacity', 0.3)
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Layer 2: Shadow layer for roots (darker, gives depth)
  linksGroup.selectAll('.root-link-shadow')
    .data(rootLinks)
    .enter().append('path')
    .attr('class', 'root-link-shadow link')
    .attr('d', rootPath)
    .attr('fill', 'none')
    .attr('stroke', '#1A0F0A')
    .attr('stroke-width', d => isFirstRender.current ? 0 : rootWidth(d) + 5)
    .attr('stroke-linecap', 'round')
    .attr('stroke-opacity', 0.45)
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Layer 3: Main root layer with enhanced gradient
  const rootLinkSel = linksGroup.selectAll('.root-link')
    .data(rootLinks)
    .enter().append('path')
    .attr('class', 'root-link link')
    .attr('d', rootPath)
    .attr('fill', 'none')
    .attr('stroke', 'url(#root-link-gradient)')
    .attr('stroke-width', d => isFirstRender.current ? 0 : rootWidth(d))
    .attr('stroke-linecap', 'round')
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Layer 4: Edge shadow overlay for cylindrical depth
  linksGroup.selectAll('.root-link-edge-shadow')
    .data(rootLinks)
    .enter().append('path')
    .attr('class', 'root-link-edge-shadow link')
    .attr('d', rootPath)
    .attr('fill', 'none')
    .attr('stroke', 'url(#root-link-shadow-gradient)')
    .attr('stroke-width', d => isFirstRender.current ? 0 : rootWidth(d))
    .attr('stroke-linecap', 'round')
    .attr('stroke-opacity', 0.7)
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Layer 5: Texture layer - dark grooves with varied pattern
  linksGroup.selectAll('.root-link-texture')
    .data(rootLinks)
    .enter().append('path')
    .attr('class', 'root-link-texture link')
    .attr('d', rootPath)
    .attr('fill', 'none')
    .attr('stroke', '#2D1B12')
    .attr('stroke-width', d => Math.max(1.5, rootWidth(d) * 0.2))
    .attr('stroke-linecap', 'round')
    .attr('stroke-opacity', 0.45)
    .attr('stroke-dasharray', d => {
      const w = rootWidth(d);
      const seed = d.target?.data?.id ?? 1;
      return `${w * (0.5 + (seed % 3) * 0.2)} ${w * (1.2 + (seed % 4) * 0.3)}`;
    })
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Layer 6: Secondary texture - lighter cracks for organic look
  linksGroup.selectAll('.root-link-texture-light')
    .data(rootLinks)
    .enter().append('path')
    .attr('class', 'root-link-texture-light link')
    .attr('d', rootPath)
    .attr('fill', 'none')
    .attr('stroke', '#8D7B6E')
    .attr('stroke-width', d => Math.max(0.8, rootWidth(d) * 0.1))
    .attr('stroke-linecap', 'round')
    .attr('stroke-opacity', 0.25)
    .attr('stroke-dasharray', d => {
      const w = rootWidth(d);
      const seed = (d.target?.data?.id ?? 1) + 5;
      return `${w * (0.3 + (seed % 2) * 0.3)} ${w * (1.8 + (seed % 5) * 0.2)}`;
    })
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Layer 7: Central highlight gradient for cylindrical shine
  linksGroup.selectAll('.root-link-center-highlight')
    .data(rootLinks)
    .enter().append('path')
    .attr('class', 'root-link-center-highlight link')
    .attr('d', rootPath)
    .attr('fill', 'none')
    .attr('stroke', 'url(#root-link-highlight-gradient)')
    .attr('stroke-width', d => isFirstRender.current ? 0 : rootWidth(d) * 0.85)
    .attr('stroke-linecap', 'round')
    .attr('stroke-opacity', 0.55)
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Layer 8: Main highlight layer
  const rootLinkHighlightSel = linksGroup.selectAll('.root-link-highlight')
    .data(rootLinks)
    .enter().append('path')
    .attr('class', 'root-link-highlight link')
    .attr('d', rootPath)
    .attr('fill', 'none')
    .attr('stroke', '#BCAAA4')
    .attr('stroke-opacity', 0.45)
    .attr('stroke-width', d => isFirstRender.current ? 0 : Math.max(2, rootWidth(d) * 0.32))
    .attr('stroke-linecap', 'round')
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Layer 9: Top specular highlight
  linksGroup.selectAll('.root-link-highlight2')
    .data(rootLinks)
    .enter().append('path')
    .attr('class', 'root-link-highlight2 link')
    .attr('d', rootPath)
    .attr('fill', 'none')
    .attr('stroke', '#D7CCC8')
    .attr('stroke-opacity', 0.25)
    .attr('stroke-width', d => Math.max(1.2, rootWidth(d) * 0.16))
    .attr('stroke-linecap', 'round')
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Layer 10: Fine specular dots for wet/earthy realism
  linksGroup.selectAll('.root-link-specular')
    .data(rootLinks)
    .enter().append('path')
    .attr('class', 'root-link-specular link')
    .attr('d', rootPath)
    .attr('fill', 'none')
    .attr('stroke', 'rgba(240, 235, 230, 0.35)')
    .attr('stroke-width', d => Math.max(0.8, rootWidth(d) * 0.08))
    .attr('stroke-linecap', 'round')
    .attr('stroke-dasharray', d => {
      const w = rootWidth(d);
      return `${w * 0.25} ${w * 3}`;
    })
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Small rootlets branching off main roots - with 3D effect
  rootLinks.filter(l => l.source?.data?.type === 'trunk').forEach((linkData, idx) => {
    const numRootlets = 2 + (idx % 2);
    for (let r = 0; r < numRootlets; r++) {
      const side = r % 2 === 0 ? 1 : -1;
      const rootletWidth = 3 + Math.random() * 2;
  
      // Rootlet shadow
      linksGroup.append('path')
        .datum({ ...linkData, rootletSide: side * (1 + r * 0.5) })
        .attr('class', 'root-rootlet-shadow link')
        .attr('d', rootletPath)
        .attr('fill', 'none')
        .attr('stroke', '#1A0F0A')
        .attr('stroke-width', rootletWidth + 2)
        .attr('stroke-linecap', 'round')
        .attr('stroke-opacity', 0.35)
        .attr('data-source-id', linkData.source.data.id)
        .attr('data-target-id', linkData.target.data.id);
  
      // Main rootlet
      linksGroup.append('path')
        .datum({ ...linkData, rootletSide: side * (1 + r * 0.5) })
        .attr('class', 'root-rootlet link')
        .attr('d', rootletPath)
        .attr('fill', 'none')
        .attr('stroke', 'url(#root-link-gradient)')
        .attr('stroke-width', rootletWidth)
        .attr('stroke-linecap', 'round')
        .attr('stroke-opacity', 0.8)
        .attr('data-source-id', linkData.source.data.id)
        .attr('data-target-id', linkData.target.data.id);
  
      // Rootlet highlight
      linksGroup.append('path')
        .datum({ ...linkData, rootletSide: side * (1 + r * 0.5) })
        .attr('class', 'root-rootlet-highlight link')
        .attr('d', rootletPath)
        .attr('fill', 'none')
        .attr('stroke', '#A1887F')
        .attr('stroke-width', rootletWidth * 0.4)
        .attr('stroke-linecap', 'round')
        .attr('stroke-opacity', 0.4)
        .attr('data-source-id', linkData.source.data.id)
        .attr('data-target-id', linkData.target.data.id);
    }
  });
  
  if (isFirstRender.current) {
    // Animate deep shadow
    linksGroup.selectAll('.root-link-deep-shadow')
      .attr('stroke-width', 0)
      .transition().duration(900).delay((d, i) => i * 70)
      .attr('stroke-width', d => rootWidth(d) + 8);
  
    // Animate shadow
    linksGroup.selectAll('.root-link-shadow')
      .attr('stroke-width', 0)
      .transition().duration(900).delay((d, i) => 10 + i * 70)
      .attr('stroke-width', d => rootWidth(d) + 5);
  
    // Animate main root
    rootLinkSel.transition().duration(900).delay((d, i) => 20 + i * 70).attr('stroke-width', rootWidth);
  
    // Animate edge shadow
    linksGroup.selectAll('.root-link-edge-shadow')
      .attr('stroke-width', 0)
      .transition().duration(900).delay((d, i) => 30 + i * 70)
      .attr('stroke-width', d => rootWidth(d));
  
    // Animate textures
    linksGroup.selectAll('.root-link-texture')
      .attr('stroke-opacity', 0)
      .transition().duration(900).delay((d, i) => 100 + i * 70)
      .attr('stroke-opacity', 0.45);
  
    linksGroup.selectAll('.root-link-texture-light')
      .attr('stroke-opacity', 0)
      .transition().duration(900).delay((d, i) => 110 + i * 70)
      .attr('stroke-opacity', 0.25);
  
    // Animate center highlight
    linksGroup.selectAll('.root-link-center-highlight')
      .attr('stroke-width', 0)
      .transition().duration(900).delay((d, i) => 50 + i * 70)
      .attr('stroke-width', d => rootWidth(d) * 0.85);
  
    // Animate highlights
    rootLinkHighlightSel.transition().duration(900).delay((d, i) => 40 + i * 70).attr('stroke-width', d => Math.max(2, rootWidth(d) * 0.32));
  
    linksGroup.selectAll('.root-link-highlight2')
      .attr('stroke-opacity', 0)
      .transition().duration(900).delay((d, i) => 60 + i * 70)
      .attr('stroke-opacity', 0.25);
  
    linksGroup.selectAll('.root-link-specular')
      .attr('stroke-opacity', 0)
      .transition().duration(900).delay((d, i) => 70 + i * 70)
      .attr('stroke-opacity', 0.35);
  
    // Animate rootlets
    linksGroup.selectAll('.root-rootlet-shadow')
      .attr('stroke-opacity', 0)
      .transition().duration(600).delay((d, i) => 180 + i * 50)
      .attr('stroke-opacity', 0.35);
  
    linksGroup.selectAll('.root-rootlet')
      .attr('stroke-opacity', 0)
      .transition().duration(600).delay((d, i) => 200 + i * 50)
      .attr('stroke-opacity', 0.8);
  
    linksGroup.selectAll('.root-rootlet-highlight')
      .attr('stroke-opacity', 0)
      .transition().duration(600).delay((d, i) => 220 + i * 50)
      .attr('stroke-opacity', 0.4);
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
  
  // Layer 1: Deep shadow for ground contact and depth
  linksGroup.selectAll('.branch-link-deep-shadow')
    .data(branchLinks)
    .enter().append('path')
    .attr('class', 'branch-link branch-link-deep-shadow link')
    .attr('d', branchPath)
    .attr('fill', 'none')
    .attr('stroke', '#0A0705')
    .attr('stroke-width', d => isFirstRender.current ? 0 : branchWidth(d) + 8)
    .attr('stroke-linecap', 'round')
    .attr('stroke-opacity', 0.25)
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Layer 2: Shadow/outline layer for depth
  linksGroup.selectAll('.branch-link-shadow')
    .data(branchLinks)
    .enter().append('path')
    .attr('class', 'branch-link branch-link-shadow link')
    .attr('d', branchPath)
    .attr('fill', 'none')
    .attr('stroke', '#1A0F0A')
    .attr('stroke-width', d => isFirstRender.current ? 0 : branchWidth(d) + 5)
    .attr('stroke-linecap', 'round')
    .attr('stroke-opacity', 0.5)
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Layer 3: Main bark layer with enhanced gradient
  const branchLinkBaseSel = linksGroup.selectAll('.branch-link-base')
    .data(branchLinks)
    .enter().append('path')
    .attr('class', 'branch-link branch-link-base link')
    .attr('d', branchPath)
    .attr('fill', 'none')
    .attr('stroke', 'url(#branch-bark-gradient)')
    .attr('stroke-width', d => isFirstRender.current ? 0 : branchWidth(d))
    .attr('stroke-linecap', 'round')
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Layer 4: Edge shadow overlay for cylindrical depth
  linksGroup.selectAll('.branch-link-edge-shadow')
    .data(branchLinks)
    .enter().append('path')
    .attr('class', 'branch-link branch-link-edge-shadow link')
    .attr('d', branchPath)
    .attr('fill', 'none')
    .attr('stroke', 'url(#branch-shadow-gradient)')
    .attr('stroke-width', d => isFirstRender.current ? 0 : branchWidth(d))
    .attr('stroke-linecap', 'round')
    .attr('stroke-opacity', 0.7)
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Layer 5: Bark texture - dark grooves with varied pattern
  linksGroup.selectAll('.branch-link-texture-dark')
    .data(branchLinks)
    .enter().append('path')
    .attr('class', 'branch-link branch-link-texture-dark link')
    .attr('d', branchPath)
    .attr('fill', 'none')
    .attr('stroke', '#2D1B12')
    .attr('stroke-width', d => Math.max(1.5, branchWidth(d) * 0.18))
    .attr('stroke-linecap', 'round')
    .attr('stroke-opacity', 0.4)
    .attr('stroke-dasharray', d => {
      const w = branchWidth(d);
      const seed = d.target?.data?.id ?? 1;
      return `${w * (0.6 + (seed % 3) * 0.2)} ${w * (1.0 + (seed % 4) * 0.3)}`;
    })
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Layer 6: Secondary bark texture - lighter cracks
  linksGroup.selectAll('.branch-link-texture-light')
    .data(branchLinks)
    .enter().append('path')
    .attr('class', 'branch-link branch-link-texture-light link')
    .attr('d', branchPath)
    .attr('fill', 'none')
    .attr('stroke', '#8D7B6E')
    .attr('stroke-width', d => Math.max(0.8, branchWidth(d) * 0.08))
    .attr('stroke-linecap', 'round')
    .attr('stroke-opacity', 0.3)
    .attr('stroke-dasharray', d => {
      const w = branchWidth(d);
      const seed = (d.target?.data?.id ?? 1) + 7;
      return `${w * (0.4 + (seed % 2) * 0.3)} ${w * (1.5 + (seed % 5) * 0.2)}`;
    })
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Layer 7: Central highlight gradient for cylindrical shine
  linksGroup.selectAll('.branch-link-center-highlight')
    .data(branchLinks)
    .enter().append('path')
    .attr('class', 'branch-link branch-link-center-highlight link')
    .attr('d', branchPath)
    .attr('fill', 'none')
    .attr('stroke', 'url(#branch-highlight-gradient)')
    .attr('stroke-width', d => isFirstRender.current ? 0 : branchWidth(d) * 0.85)
    .attr('stroke-linecap', 'round')
    .attr('stroke-opacity', 0.6)
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Layer 8: Main highlight layer - gives 3D rounded appearance
  const branchLinkHighlightSel = linksGroup.selectAll('.branch-link-highlight')
    .data(branchLinks)
    .enter().append('path')
    .attr('class', 'branch-link branch-link-highlight link')
    .attr('d', branchPath)
    .attr('fill', 'none')
    .attr('stroke', '#BCAAA4')
    .attr('stroke-opacity', 0.5)
    .attr('stroke-width', d => isFirstRender.current ? 0 : Math.max(2, branchWidth(d) * 0.35))
    .attr('stroke-linecap', 'round')
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Layer 9: Top specular highlight for shine
  linksGroup.selectAll('.branch-link-highlight2')
    .data(branchLinks)
    .enter().append('path')
    .attr('class', 'branch-link branch-link-highlight2 link')
    .attr('d', branchPath)
    .attr('fill', 'none')
    .attr('stroke', '#D7CCC8')
    .attr('stroke-opacity', 0.3)
    .attr('stroke-width', d => Math.max(1.2, branchWidth(d) * 0.18))
    .attr('stroke-linecap', 'round')
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Layer 10: Fine specular dot for realism
  linksGroup.selectAll('.branch-link-specular')
    .data(branchLinks)
    .enter().append('path')
    .attr('class', 'branch-link branch-link-specular link')
    .attr('d', branchPath)
    .attr('fill', 'none')
    .attr('stroke', 'rgba(255, 250, 240, 0.4)')
    .attr('stroke-width', d => Math.max(0.8, branchWidth(d) * 0.08))
    .attr('stroke-linecap', 'round')
    .attr('stroke-dasharray', d => {
      const w = branchWidth(d);
      return `${w * 0.3} ${w * 2.5}`;
    })
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  const twigLinks = branchLinks
    .filter(l => l.target?.data?.type === 'branch')
    .map(l => ({ ...l, twigSide: (l.target?.data?.id ?? 0) % 2 === 0 ? 1 : -1 }));
  
  // Twig shadow for depth
  linksGroup.selectAll('.branch-twig-shadow')
    .data(twigLinks)
    .enter().append('path')
    .attr('class', 'branch-twig-shadow link')
    .attr('d', branchTwigPath)
    .attr('fill', 'none')
    .attr('stroke', '#1A0F0A')
    .attr('stroke-opacity', 0.4)
    .attr('stroke-width', d => Math.max(3, branchWidth(d) * 0.35))
    .attr('stroke-linecap', 'round')
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Main twig with bark gradient
  const branchTwigSel = linksGroup.selectAll('.branch-twig')
    .data(twigLinks)
    .enter().append('path')
    .attr('class', 'branch-twig link')
    .attr('d', branchTwigPath)
    .attr('fill', 'none')
    .attr('stroke', 'url(#branch-bark-gradient)')
    .attr('stroke-opacity', 0.85)
    .attr('stroke-width', d => Math.max(2, branchWidth(d) * 0.28))
    .attr('stroke-linecap', 'round')
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);
  
  // Twig highlight for 3D effect
  linksGroup.selectAll('.branch-twig-highlight')
    .data(twigLinks)
    .enter().append('path')
    .attr('class', 'branch-twig-highlight link')
    .attr('d', branchTwigPath)
    .attr('fill', 'none')
    .attr('stroke', '#A1887F')
    .attr('stroke-opacity', 0.4)
    .attr('stroke-width', d => Math.max(1, branchWidth(d) * 0.12))
    .attr('stroke-linecap', 'round')
    .attr('data-source-id', d => d.source.data.id)
    .attr('data-target-id', d => d.target.data.id);

  if (isFirstRender.current) {
    // Animate deep shadow layer
    linksGroup.selectAll('.branch-link-deep-shadow')
      .attr('stroke-width', 0)
      .transition().duration(900).delay((d, i) => 200 + i * 60)
      .attr('stroke-width', d => branchWidth(d) + 8);
  
    // Animate shadow layer
    linksGroup.selectAll('.branch-link-shadow')
      .attr('stroke-width', 0)
      .transition().duration(900).delay((d, i) => 220 + i * 60)
      .attr('stroke-width', d => branchWidth(d) + 5);
  
    // Animate main branch
    branchLinkBaseSel.transition().duration(900).delay((d, i) => 250 + i * 60).attr('stroke-width', branchWidth);
  
    // Animate edge shadow
    linksGroup.selectAll('.branch-link-edge-shadow')
      .attr('stroke-width', 0)
      .transition().duration(900).delay((d, i) => 260 + i * 60)
      .attr('stroke-width', d => branchWidth(d));
  
    // Animate texture layers
    linksGroup.selectAll('.branch-link-texture-dark')
      .attr('stroke-opacity', 0)
      .transition().duration(900).delay((d, i) => 350 + i * 60)
      .attr('stroke-opacity', 0.4);
  
    linksGroup.selectAll('.branch-link-texture-light')
      .attr('stroke-opacity', 0)
      .transition().duration(900).delay((d, i) => 360 + i * 60)
      .attr('stroke-opacity', 0.3);
  
    // Animate center highlight
    linksGroup.selectAll('.branch-link-center-highlight')
      .attr('stroke-width', 0)
      .transition().duration(900).delay((d, i) => 280 + i * 60)
      .attr('stroke-width', d => branchWidth(d) * 0.85);
  
    // Animate highlights
    branchLinkHighlightSel.transition().duration(900).delay((d, i) => 250 + i * 60).attr('stroke-width', d => Math.max(2, branchWidth(d) * 0.35));
  
    linksGroup.selectAll('.branch-link-highlight2')
      .attr('stroke-opacity', 0)
      .transition().duration(900).delay((d, i) => 300 + i * 60)
      .attr('stroke-opacity', 0.3);
  
    linksGroup.selectAll('.branch-link-specular')
      .attr('stroke-opacity', 0)
      .transition().duration(900).delay((d, i) => 320 + i * 60)
      .attr('stroke-opacity', 0.4);
  
    // Animate twigs
    linksGroup.selectAll('.branch-twig-shadow')
      .attr('stroke-opacity', 0)
      .transition().duration(900).delay((d, i) => 340 + i * 70)
      .attr('stroke-opacity', 0.4);
  
    branchTwigSel.attr('stroke-opacity', 0)
      .transition().duration(900).delay((d, i) => 350 + i * 70)
      .attr('stroke-opacity', 0.85);
  
    linksGroup.selectAll('.branch-twig-highlight')
      .attr('stroke-opacity', 0)
      .transition().duration(900).delay((d, i) => 360 + i * 70)
      .attr('stroke-opacity', 0.4);
  }

  return { linksGroup };
}


