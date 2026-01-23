export function drawTrunkAndDecor({ mainGroup, centerX, groundY }) {
  // Draw trunk with organic shape - taller like an oak tree
  const trunkH = 190;
  const trunkTopW = 28;
  const trunkBotW = 70;
  
  // Main trunk shape with more organic curves - oak-like proportions
  const trunkPath = `
    M ${centerX - trunkBotW} ${groundY + 18}
    Q ${centerX - trunkBotW - 6} ${groundY - trunkH * 0.15} ${centerX - trunkBotW + 2} ${groundY - trunkH * 0.3}
    Q ${centerX - trunkBotW - 3} ${groundY - trunkH * 0.5} ${centerX - trunkBotW + 5} ${groundY - trunkH * 0.65}
    Q ${centerX - trunkBotW - 2} ${groundY - trunkH * 0.8} ${centerX - trunkTopW} ${groundY - trunkH}
    Q ${centerX - 10} ${groundY - trunkH - 12} ${centerX} ${groundY - trunkH - 8}
    Q ${centerX + 10} ${groundY - trunkH - 12} ${centerX + trunkTopW} ${groundY - trunkH}
    Q ${centerX + trunkBotW + 2} ${groundY - trunkH * 0.8} ${centerX + trunkBotW - 5} ${groundY - trunkH * 0.65}
    Q ${centerX + trunkBotW + 3} ${groundY - trunkH * 0.5} ${centerX + trunkBotW - 2} ${groundY - trunkH * 0.3}
    Q ${centerX + trunkBotW + 6} ${groundY - trunkH * 0.15} ${centerX + trunkBotW} ${groundY + 18}
    Z
  `;
  
  // Main trunk base shape with shadow
  mainGroup.append('path')
    .attr('d', trunkPath)
    .attr('fill', 'url(#bark-gradient)')
    .attr('stroke', '#1A0F0A')
    .attr('stroke-width', 3)
    .attr('filter', 'url(#drop-shadow)');
  
  // Trunk highlight overlay for cylindrical 3D effect
  mainGroup.append('path')
    .attr('d', trunkPath)
    .attr('fill', 'url(#bark-highlight-gradient)')
    .attr('stroke', 'none');
  
  // Trunk vertical depth gradient overlay
  mainGroup.append('path')
    .attr('d', trunkPath)
    .attr('fill', 'url(#bark-vertical-gradient)')
    .attr('stroke', 'none');
  
  // Left edge shadow for depth
  const leftEdgePath = `
    M ${centerX - trunkBotW} ${groundY + 18}
    Q ${centerX - trunkBotW - 6} ${groundY - trunkH * 0.15} ${centerX - trunkBotW + 2} ${groundY - trunkH * 0.3}
    Q ${centerX - trunkBotW - 3} ${groundY - trunkH * 0.5} ${centerX - trunkBotW + 5} ${groundY - trunkH * 0.65}
    Q ${centerX - trunkBotW - 2} ${groundY - trunkH * 0.8} ${centerX - trunkTopW} ${groundY - trunkH}
    L ${centerX - trunkTopW + 8} ${groundY - trunkH}
    Q ${centerX - trunkBotW + 5} ${groundY - trunkH * 0.8} ${centerX - trunkBotW + 12} ${groundY - trunkH * 0.65}
    Q ${centerX - trunkBotW + 4} ${groundY - trunkH * 0.5} ${centerX - trunkBotW + 9} ${groundY - trunkH * 0.3}
    Q ${centerX - trunkBotW + 1} ${groundY - trunkH * 0.15} ${centerX - trunkBotW + 7} ${groundY + 18}
    Z
  `;
  mainGroup.append('path')
    .attr('d', leftEdgePath)
    .attr('fill', 'rgba(15, 8, 5, 0.35)')
    .attr('stroke', 'none');
  
  // Right edge highlight reflection
  const rightHighlightPath = `
    M ${centerX + trunkBotW - 15} ${groundY + 15}
    Q ${centerX + trunkBotW - 8} ${groundY - trunkH * 0.15} ${centerX + trunkBotW - 12} ${groundY - trunkH * 0.3}
    Q ${centerX + trunkBotW - 5} ${groundY - trunkH * 0.5} ${centerX + trunkBotW - 10} ${groundY - trunkH * 0.65}
    Q ${centerX + trunkBotW - 8} ${groundY - trunkH * 0.8} ${centerX + trunkTopW - 5} ${groundY - trunkH}
    L ${centerX + trunkTopW} ${groundY - trunkH}
    Q ${centerX + trunkBotW + 2} ${groundY - trunkH * 0.8} ${centerX + trunkBotW - 5} ${groundY - trunkH * 0.65}
    Q ${centerX + trunkBotW + 3} ${groundY - trunkH * 0.5} ${centerX + trunkBotW - 2} ${groundY - trunkH * 0.3}
    Q ${centerX + trunkBotW + 6} ${groundY - trunkH * 0.15} ${centerX + trunkBotW} ${groundY + 18}
    Z
  `;
  mainGroup.append('path')
    .attr('d', rightHighlightPath)
    .attr('fill', 'rgba(180, 150, 130, 0.12)')
    .attr('stroke', 'none');
  
  // Trunk bark texture - vertical cracks with 3D depth effect (shadow + highlight pairs)
  const barkLines = [
    { x: centerX - 52, amp: 2, depth: 0.6 },
    { x: centerX - 40, amp: 3, depth: 0.8 },
    { x: centerX - 28, amp: 4, depth: 1.0 },
    { x: centerX - 16, amp: 3, depth: 0.9 },
    { x: centerX - 4, amp: 2, depth: 0.7 },
    { x: centerX + 8, amp: 2, depth: 0.6 },
    { x: centerX + 20, amp: 3, depth: 0.8 },
    { x: centerX + 32, amp: 4, depth: 1.0 },
    { x: centerX + 44, amp: 3, depth: 0.9 },
    { x: centerX + 54, amp: 2, depth: 0.6 },
  ];
  
  barkLines.forEach((bark, i) => {
    const startY = groundY - trunkH * 0.08;
    const endY = groundY - trunkH * 0.88;
    const segments = 12;
    let pathD = `M ${bark.x} ${startY}`;
    let highlightPathD = `M ${bark.x + 2} ${startY}`;
  
    for (let j = 1; j <= segments; j++) {
      const t = j / segments;
      const y = startY + (endY - startY) * t;
      const wobble = Math.sin(i * 2.3 + j * 1.2) * bark.amp;
      pathD += ` L ${bark.x + wobble} ${y}`;
      highlightPathD += ` L ${bark.x + wobble + 2} ${y}`;
    }
  
    // Dark crack (shadow side)
    mainGroup.append('path')
      .attr('d', pathD)
      .attr('fill', 'none')
      .attr('stroke', `rgba(20, 12, 8, ${0.25 * bark.depth})`)
      .attr('stroke-width', 1.5 + bark.depth * 0.8)
      .attr('stroke-linecap', 'round');
  
    // Light edge (highlight side of crack)
    mainGroup.append('path')
      .attr('d', highlightPathD)
      .attr('fill', 'none')
      .attr('stroke', `rgba(140, 110, 90, ${0.15 * bark.depth})`)
      .attr('stroke-width', 0.8 + bark.depth * 0.3)
      .attr('stroke-linecap', 'round');
  });
  
  // Horizontal bark rings with 3D depth effect
  for (let i = 0; i < 8; i++) {
    const ringY = groundY - trunkH * (0.10 + i * 0.11);
    const ringWidth = trunkBotW - (trunkBotW - trunkTopW) * (0.10 + i * 0.11);
    const curveAmt = 2 + Math.sin(i * 1.5) * 1.5;
  
    // Shadow line (below)
    mainGroup.append('path')
      .attr('d', `M ${centerX - ringWidth + 5} ${ringY + 1} Q ${centerX} ${ringY + curveAmt + 1} ${centerX + ringWidth - 5} ${ringY + 1}`)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(20, 12, 8, 0.18)')
      .attr('stroke-width', 1.2);
  
    // Highlight line (above)
    mainGroup.append('path')
      .attr('d', `M ${centerX - ringWidth + 5} ${ringY} Q ${centerX} ${ringY + curveAmt} ${centerX + ringWidth - 5} ${ringY}`)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(160, 130, 110, 0.12)')
      .attr('stroke-width', 0.7);
  }
  
  // Additional knots/bumps for organic 3D texture
  const knots = [
    { x: centerX - 35, y: groundY - trunkH * 0.35, r: 7 },
    { x: centerX + 28, y: groundY - trunkH * 0.55, r: 6 },
    { x: centerX - 15, y: groundY - trunkH * 0.72, r: 5 },
  ];
  
  knots.forEach(knot => {
    // Knot shadow
    mainGroup.append('ellipse')
      .attr('cx', knot.x)
      .attr('cy', knot.y)
      .attr('rx', knot.r)
      .attr('ry', knot.r * 0.7)
      .attr('fill', 'rgba(30, 18, 12, 0.4)');
    // Knot highlight
    mainGroup.append('ellipse')
      .attr('cx', knot.x - 1)
      .attr('cy', knot.y - 1)
      .attr('rx', knot.r * 0.5)
      .attr('ry', knot.r * 0.35)
      .attr('fill', 'rgba(120, 90, 70, 0.25)');
  });
  
  // Decorative roots at base (wider for bigger trunk)
  const rootShapes = [
    { startX: centerX - trunkBotW + 5, endX: centerX - trunkBotW - 35, endY: groundY + 28, cpY: 10 },
    { startX: centerX - trunkBotW + 25, endX: centerX - trunkBotW - 15, endY: groundY + 24, cpY: 6 },
    { startX: centerX + trunkBotW - 5, endX: centerX + trunkBotW + 35, endY: groundY + 28, cpY: 10 },
    { startX: centerX + trunkBotW - 25, endX: centerX + trunkBotW + 15, endY: groundY + 24, cpY: 6 },
    { startX: centerX - 20, endX: centerX - 45, endY: groundY + 30, cpY: 14 },
    { startX: centerX + 20, endX: centerX + 45, endY: groundY + 30, cpY: 14 },
  ];
  
  rootShapes.forEach((root) => {
    const cpX = (root.startX + root.endX) / 2;
    mainGroup.append('path')
      .attr('d', `M ${root.startX} ${groundY + 15} Q ${cpX} ${groundY + root.cpY} ${root.endX} ${root.endY}`)
      .attr('fill', 'none')
      .attr('stroke', '#5D4037')
      .attr('stroke-width', 8)
      .attr('stroke-linecap', 'round');
  
    // Root highlight
    mainGroup.append('path')
      .attr('d', `M ${root.startX} ${groundY + 15} Q ${cpX} ${groundY + root.cpY} ${root.endX} ${root.endY}`)
      .attr('fill', 'none')
      .attr('stroke', '#8D6E63')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .attr('stroke-opacity', 0.5);
  });
  
}

