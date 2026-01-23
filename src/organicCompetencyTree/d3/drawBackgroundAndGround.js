import * as d3 from 'd3';

export function drawBackgroundAndGround({ defs, mainGroup, width, height, centerX, groundY }) {
  // Background (clear)
  mainGroup.append('rect').attr('x', -width * 2).attr('y', -height * 2).attr('width', width * 5).attr('height', height * 5).attr('fill', 'url(#sky-gradient)');
  
  // ========================================
  // GROUND WITH 3D HILLS - ENHANCED VERSION
  // ========================================
  const groundRx = Math.min(width * 0.22, 320);
  const groundRy = Math.min(height * 0.08, 70);
  
  // Gradientes adicionales para piedras grises y lomas 3D
  const stoneGrad = defs.append('radialGradient')
  .attr('id', 'stone-gradient')
  .attr('cx', '30%').attr('cy', '30%');
  stoneGrad.append('stop').attr('offset', '0%').attr('stop-color', '#BDBDBD');
  stoneGrad.append('stop').attr('offset', '50%').attr('stop-color', '#9E9E9E');
  stoneGrad.append('stop').attr('offset', '100%').attr('stop-color', '#616161');
  
  const hillGrad1 = defs.append('radialGradient')
  .attr('id', 'hill-gradient-1')
  .attr('cx', '40%').attr('cy', '35%');
  hillGrad1.append('stop').attr('offset', '0%').attr('stop-color', '#7CB342');
  hillGrad1.append('stop').attr('offset', '50%').attr('stop-color', '#558B2F');
  hillGrad1.append('stop').attr('offset', '100%').attr('stop-color', '#33691E');
  
  const hillGrad2 = defs.append('radialGradient')
  .attr('id', 'hill-gradient-2')
  .attr('cx', '45%').attr('cy', '40%');
  hillGrad2.append('stop').attr('offset', '0%').attr('stop-color', '#81C784');
  hillGrad2.append('stop').attr('offset', '50%').attr('stop-color', '#66BB6A');
  hillGrad2.append('stop').attr('offset', '100%').attr('stop-color', '#43A047');
  
  const hillGrad3 = defs.append('radialGradient')
  .attr('id', 'hill-gradient-3')
  .attr('cx', '38%').attr('cy', '32%');
  hillGrad3.append('stop').attr('offset', '0%').attr('stop-color', '#9CCC65');
  hillGrad3.append('stop').attr('offset', '50%').attr('stop-color', '#7CB342');
  hillGrad3.append('stop').attr('offset', '100%').attr('stop-color', '#558B2F');
  
  // Gradientes para césped denso
  const grassGrad = defs.append('linearGradient')
  .attr('id', 'grass-gradient')
  .attr('x1', '0%').attr('y1', '0%')
  .attr('x2', '0%').attr('y2', '100%');
  grassGrad.append('stop').attr('offset', '0%').attr('stop-color', '#66BB6A');
  grassGrad.append('stop').attr('offset', '100%').attr('stop-color', '#2E7D32');
  
  const grassGrad2 = defs.append('linearGradient')
  .attr('id', 'grass-gradient-2')
  .attr('x1', '0%').attr('y1', '0%')
  .attr('x2', '0%').attr('y2', '100%');
  grassGrad2.append('stop').attr('offset', '0%').attr('stop-color', '#81C784');
  grassGrad2.append('stop').attr('offset', '100%').attr('stop-color', '#388E3C');
  
  // Definir lomas con efecto 3D
  const hills = [
  { cx: centerX, cy: groundY + 45, rx: 200, ry: 55, gradient: 'hill-gradient-1', opacity: 0.85 },
  { cx: centerX - 120, cy: groundY + 35, rx: 140, ry: 45, gradient: 'hill-gradient-2', opacity: 0.9 },
  { cx: centerX + 110, cy: groundY + 38, rx: 150, ry: 48, gradient: 'hill-gradient-3', opacity: 0.88 },
  { cx: centerX - 180, cy: groundY + 30, rx: 90, ry: 35, gradient: 'hill-gradient-2', opacity: 0.92 },
  { cx: centerX + 170, cy: groundY + 32, rx: 95, ry: 38, gradient: 'hill-gradient-3', opacity: 0.9 },
  ];
  
  // Función para verificar si un punto está dentro de las lomas
  const isInsideHills = (x, y) => {
  for (const hill of hills) {
  const dx = x - hill.cx;
  const dy = y - hill.cy;
  const normalizedDist = Math.sqrt((dx * dx) / (hill.rx * hill.rx) + (dy * dy) / (hill.ry * hill.ry));
  if (normalizedDist < 1) return true;
  }
  return false;
  };
  
  // Función para calcular elevación
  const getHillHeight = (x, y) => {
  let maxElevation = 0;
  hills.forEach(hill => {
  const dx = x - hill.cx;
  const dy = y - hill.cy;
  const normalizedDist = Math.sqrt((dx * dx) / (hill.rx * hill.rx) + (dy * dy) / (hill.ry * hill.ry));
  if (normalizedDist < 1) {
    const elevation = (1 - normalizedDist) * 25;
    maxElevation = Math.max(maxElevation, elevation);
  }
  });
  return maxElevation;
  };
  
  // Dibujar sombras de las lomas
  hills.forEach(hill => {
  mainGroup.append('ellipse')
  .attr('cx', hill.cx + 4)
  .attr('cy', hill.cy + 8)
  .attr('rx', hill.rx)
  .attr('ry', hill.ry * 0.6)
  .attr('fill', 'rgba(0,0,0,0.12)')
  .attr('filter', 'blur(6px)');
  });
  
  // Dibujar lomas
  hills.forEach(hill => {
  mainGroup.append('ellipse')
  .attr('cx', hill.cx)
  .attr('cy', hill.cy)
  .attr('rx', hill.rx)
  .attr('ry', hill.ry)
  .attr('fill', `url(#${hill.gradient})`)
  .attr('opacity', hill.opacity)
  .attr('stroke', 'rgba(0,0,0,0.1)')
  .attr('stroke-width', 1);
  });
  
  // Capa de tierra base
  mainGroup.append('ellipse')
  .attr('cx', centerX)
  .attr('cy', groundY + 55)
  .attr('rx', groundRx)
  .attr('ry', groundRy * 0.8)
  .attr('fill', 'url(#ground-gradient)')
  .attr('opacity', 0.6);
  
  // Textura de tierra
  for (let i = 0; i < 8; i++) {
  const y = groundY + 50 + i * 8;
  const amplitude = 5 + Math.sin(i * 0.7) * 3;
  const points = [];
  for (let x = centerX - groundRx + 20; x < centerX + groundRx - 20; x += 10) {
  const wobble = Math.sin(x * 0.05 + i * 1.2) * amplitude;
  points.push([x, y + wobble]);
  }
  mainGroup.append('path')
  .attr('d', d3.line()(points))
  .attr('fill', 'none')
  .attr('stroke', 'rgba(62, 39, 35, 0.2)')
  .attr('stroke-width', 1.5)
  .attr('stroke-linecap', 'round');
  }
  
  // CÉSPED DENSO (350 mechones)
  const grassDensity = 350;
  for (let i = 0; i < grassDensity; i++) {
  const angle = (i / grassDensity) * Math.PI * 2 + Math.random() * 0.15;
  const dist = groundRx * (0.6 + Math.random() * 0.35);
  const baseX = centerX + Math.cos(angle) * dist + (Math.random() - 0.5) * 12;
  const baseY = groundY + 28 + Math.sin(Math.abs(angle)) * groundRy * 0.7 + (Math.random() - 0.5) * 8;
  
  if (!isInsideHills(baseX, baseY)) continue;
  
  const elevation = getHillHeight(baseX, baseY);
  const finalY = baseY - elevation;
  
  const grassGroup = mainGroup.append('g').attr('transform', `translate(${baseX}, ${finalY})`);
  const numBlades = 2 + Math.floor(Math.random() * 3);
  
  for (let b = 0; b < numBlades; b++) {
  const offsetX = (b - numBlades / 2) * 1.2;
  const height = 7 + Math.random() * 5;
  const curve = 2 + Math.random() * 2.5;
  const bendDir = Math.random() > 0.5 ? 1 : -1;
  const bladePath = `M ${offsetX} 0 Q ${offsetX + bendDir * curve} ${-height * 0.6} ${offsetX + bendDir * (curve * 0.3)} ${-height}`;
  const useGrad = Math.floor((baseX / 35) + (baseY / 25)) % 2 === 0 ? 'grass-gradient' : 'grass-gradient-2';
  const brightnessBoost = elevation / 50;
  
  grassGroup.append('path')
    .attr('d', bladePath)
    .attr('fill', 'none')
    .attr('stroke', `url(#${useGrad})`)
    .attr('stroke-width', 1 + Math.random() * 0.4)
    .attr('stroke-linecap', 'round')
    .attr('opacity', 0.7 + Math.random() * 0.25 + brightnessBoost);
  }
  }
  
  // PIEDRAS GRISES IRREGULARES
  const stones = [
  { x: centerX - 180, y: groundY + 30, size: 24, seed: 1 },
  { x: centerX - 120, y: groundY + 28, size: 20, seed: 2 },
  { x: centerX - 50, y: groundY + 38, size: 14, seed: 4 },
  { x: centerX + 60, y: groundY + 35, size: 18, seed: 5 },
  { x: centerX + 110, y: groundY + 30, size: 22, seed: 6 },
  { x: centerX + 170, y: groundY + 28, size: 19, seed: 7 },
  { x: centerX - 210, y: groundY + 32, size: 12, seed: 8 },
  { x: centerX + 200, y: groundY + 34, size: 13, seed: 9 },
  { x: centerX - 10, y: groundY + 42, size: 16, seed: 10 },
  ];
  
  stones.forEach((stone) => {
  if (!isInsideHills(stone.x, stone.y)) return;
  
  const elevation = getHillHeight(stone.x, stone.y);
  const adjustedY = stone.y - elevation;
  const stoneGroup = mainGroup.append('g').attr('transform', `translate(${stone.x}, ${adjustedY})`);
  
  // Forma irregular
  const numPoints = 6 + Math.floor(Math.random() * 4);
  const points = [];
  for (let i = 0; i < numPoints; i++) {
  const angle = (i / numPoints) * Math.PI * 2;
  const radiusVariation = 0.65 + Math.random() * 0.7;
  const r = stone.size * radiusVariation;
  const jitter = (Math.random() - 0.5) * stone.size * 0.35;
  points.push([Math.cos(angle) * r + jitter, Math.sin(angle) * r * 0.65 + jitter * 0.5]);
  }
  
  // Sombra
  stoneGroup.append('polygon')
  .attr('points', points.map(p => `${p[0] + 2},${p[1] + 4}`).join(' '))
  .attr('fill', 'rgba(0,0,0,0.3)');
  
  // Piedra principal
  stoneGroup.append('polygon')
  .attr('points', points.map(p => `${p[0]},${p[1]}`).join(' '))
  .attr('fill', 'url(#stone-gradient)')
  .attr('stroke', '#757575')
  .attr('stroke-width', 1.5);
  
  // Grietas
  const numCracks = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < numCracks; i++) {
  const startAngle = (i / numCracks) * Math.PI * 2 + Math.random() * 0.5;
  const startR = stone.size * (0.15 + Math.random() * 0.25);
  const endR = stone.size * (0.55 + Math.random() * 0.35);
  const x1 = Math.cos(startAngle) * startR;
  const y1 = Math.sin(startAngle) * startR * 0.7;
  const x2 = Math.cos(startAngle + (Math.random() - 0.5) * 0.4) * endR;
  const y2 = Math.sin(startAngle + (Math.random() - 0.5) * 0.4) * endR * 0.7;
  const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * stone.size * 0.2;
  const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * stone.size * 0.15;
  
  stoneGroup.append('path')
    .attr('d', `M ${x1} ${y1} L ${midX} ${midY} L ${x2} ${y2}`)
    .attr('stroke', 'rgba(50, 50, 50, 0.6)')
    .attr('stroke-width', 1 + Math.random() * 0.5)
    .attr('stroke-linecap', 'round')
    .attr('fill', 'none');
  }
  
  // Imperfecciones (textura)
  for (let i = 0; i < 15; i++) {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.random() * stone.size * 0.65;
  const x = Math.cos(angle) * dist;
  const y = Math.sin(angle) * dist * 0.7;
  stoneGroup.append('circle')
    .attr('cx', x).attr('cy', y)
    .attr('r', 0.5 + Math.random() * 1.2)
    .attr('fill', 'rgba(70, 70, 70, 0.45)');
  }
  
  // Vetas
  for (let i = 0; i < 3; i++) {
  const startX = -stone.size * 0.5 + Math.random() * stone.size;
  const startY = -stone.size * 0.3 + Math.random() * stone.size * 0.6;
  const pathData = `M ${startX} ${startY} q ${stone.size * 0.3} ${(Math.random() - 0.5) * 5} ${stone.size * 0.6} ${(Math.random() - 0.5) * 8}`;
  stoneGroup.append('path')
    .attr('d', pathData)
    .attr('stroke', 'rgba(60, 60, 60, 0.35)')
    .attr('stroke-width', 0.8)
    .attr('fill', 'none');
  }
  
  // Highlight
  const highlightPoints = [];
  for (let i = 0; i < 4; i++) {
  const angle = (i / 4) * Math.PI * 2 - Math.PI * 0.3;
  const r = stone.size * 0.3;
  highlightPoints.push([
    Math.cos(angle) * r - stone.size * 0.2,
    Math.sin(angle) * r * 0.6 - stone.size * 0.25
  ]);
  }
  stoneGroup.append('polygon')
  .attr('points', highlightPoints.map(p => `${p[0]},${p[1]}`).join(' '))
  .attr('fill', 'rgba(200, 200, 200, 0.35)');
  });
  
  
}

