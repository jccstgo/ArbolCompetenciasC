export function generateLeafPositions(nodeType, nodeId) {
  if (nodeType === 'root') return [];

  const leaves = [];
  const numLeaves = nodeType === 'trunk' ? 20 : nodeType === 'branch' ? 10 : 6;
  const baseRadius = nodeType === 'trunk' ? 50 : nodeType === 'branch' ? 25 : 20;

  for (let i = 0; i < numLeaves; i++) {
    const angle = (i / numLeaves) * Math.PI * 2 + nodeId * 0.5;
    const dist = baseRadius + Math.random() * 15;
    const size = 6 + Math.random() * 8;

    leaves.push({
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - (nodeType === 'trunk' ? 40 : 0),
      rx: size,
      ry: size * 0.6,
      rotation: Math.random() * 360,
      color: `hsl(${85 + Math.random() * 45}, ${55 + Math.random() * 20}%, ${28 + Math.random() * 18}%)`,
      delay: Math.random() * 300,
    });
  }

  return leaves;
}

