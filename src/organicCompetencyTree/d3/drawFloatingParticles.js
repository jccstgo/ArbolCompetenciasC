import * as d3 from 'd3';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function wrap(v, min, max) {
  const span = max - min;
  if (span <= 0) return min;
  if (v < min) return v + span;
  if (v > max) return v - span;
  return v;
}

export function drawFloatingParticles({ svg, container, width, height, groundY }) {
  const root = container ?? svg;
  if (!root) return null;

  const yMax = clamp(groundY - 12, 40, height - 40);

  const overlay = root
    .append('g')
    .attr('class', 'ambient-overlay')
    .style('pointer-events', 'none');

  // Keep particles subtle so they don't hurt readability of node labels.
  // Slightly denser ambient particles to give more life without cluttering labels.
  const pollenCount = clamp(Math.round((width * height) / 52000), 22, 54);
  const leafCount = clamp(Math.round(width / 95), 10, 20);

  const pollen = Array.from({ length: pollenCount }, (_, i) => ({
    id: `p-${i}`,
    x: rand(0, width),
    y: rand(20, yMax),
    r: rand(1.2, 2.4),
    vx: rand(-10, 10),
    vy: rand(-6, -1),
    tw: rand(1.2, 2.2),
    phase: rand(0, Math.PI * 2),
    alpha: rand(0.18, 0.35),
  }));

  const leafPath = 'M 0 -7 C 6 -7 9 -1 0 7 C -9 -1 -6 -7 0 -7 Z';

  const leaves = Array.from({ length: leafCount }, (_, i) => ({
    id: `l-${i}`,
    x: rand(0, width),
    y: rand(-40, yMax),
    size: rand(0.8, 1.25),
    vx: rand(-12, 12),
    vy: rand(18, 38),
    rot: rand(0, 360),
    vr: rand(-40, 40),
    swayAmp: rand(10, 22),
    swaySpeed: rand(0.6, 1.4),
    phase: rand(0, Math.PI * 2),
    alpha: rand(0.14, 0.22),
  }));

  const pollenSel = overlay
    .append('g')
    .attr('class', 'pollen-layer')
    .selectAll('circle')
    .data(pollen, (d) => d.id)
    .join('circle')
    .attr('r', (d) => d.r)
    .attr('cx', (d) => d.x)
    .attr('cy', (d) => d.y)
    .attr('fill', '#FFD54F')
    .attr('opacity', (d) => d.alpha)
    .style('mix-blend-mode', 'multiply');

  const leafSel = overlay
    .append('g')
    .attr('class', 'leaves-layer')
    .selectAll('path')
    .data(leaves, (d) => d.id)
    .join('path')
    .attr('d', leafPath)
    .attr('fill', '#66BB6A')
    .attr('stroke', 'rgba(46,125,50,0.65)')
    .attr('stroke-width', 0.8)
    .attr('opacity', (d) => d.alpha)
    .style('mix-blend-mode', 'multiply')
    .attr('transform', (d) => `translate(${d.x},${d.y}) rotate(${d.rot}) scale(${d.size})`);

  if (prefersReducedMotion()) return null;

  let prev = 0;
  const timer = d3.timer((elapsed) => {
    const dt = Math.max(0, (elapsed - prev) / 1000);
    prev = elapsed;
    const t = elapsed / 1000;

    for (const p of pollen) {
      p.x = wrap(p.x + p.vx * dt, -20, width + 20);
      p.y = wrap(p.y + p.vy * dt, 10, yMax);
    }

    for (const l of leaves) {
      const sway = Math.sin(t * l.swaySpeed + l.phase) * l.swayAmp;
      l.x = wrap(l.x + l.vx * dt + sway * dt, -40, width + 40);
      l.y += l.vy * dt;
      l.rot += l.vr * dt;

      if (l.y > yMax) {
        l.y = rand(-70, -20);
        l.x = rand(0, width);
        l.rot = rand(0, 360);
      }
    }

    pollenSel
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('opacity', (d) => d.alpha * (0.75 + 0.25 * Math.sin(t * d.tw + d.phase)));

    leafSel.attr('transform', (d) => `translate(${d.x},${d.y}) rotate(${d.rot}) scale(${d.size})`);
  });

  return timer;
}
