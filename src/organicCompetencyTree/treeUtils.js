export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function getAllChildren(node) {
  const visible = Array.isArray(node?.children) ? node.children : [];
  const hidden = Array.isArray(node?._children) ? node._children : [];
  return [...visible, ...hidden];
}

export function findNode(node, id) {
  if (node.id === id) return node;
  for (const child of getAllChildren(node)) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

export function findParent(node, id, parent = null) {
  if (node.id === id) return parent;
  for (const child of getAllChildren(node)) {
    const found = findParent(child, id, node);
    if (found) return found;
  }
  return null;
}

export function countNodes(node, type) {
  let count = node.type === type ? 1 : 0;
  getAllChildren(node).forEach((child) => (count += countNodes(child, type)));
  return count;
}

export function getMasteryLevel(value) {
  if (value >= 90) return { text: '★ Experto', color: '#4CAF50' };
  if (value >= 80) return { text: 'Avanzado', color: '#8BC34A' };
  if (value >= 60) return { text: 'Intermedio', color: '#FFC107' };
  if (value >= 40) return { text: 'Básico', color: '#FF9800' };
  return { text: 'Inicial', color: '#f44336' };
}

export function getMenuOptions(node) {
  const nodeType = node?.type;
  const hasChildren = (node?.children?.length ?? 0) > 0 || (node?._children?.length ?? 0) > 0;
  const isCollapsed = (node?.children?.length ?? 0) === 0 && (node?._children?.length ?? 0) > 0;

  const childTypes = Array.from(
    new Set(
      getAllChildren(node)
        .map((c) => c?.type)
        .filter(Boolean),
    ),
  );

  const getCollapseTargetLabel = () => {
    const hasRoots = childTypes.includes('root');
    const hasBranches = childTypes.includes('branch');
    const hasFruits = childTypes.includes('fruit');

    // Prefer explicit labels users recognize in the diagram.
    if (hasRoots && hasBranches) return 'Raíces y Ramas';
    if (hasBranches && hasFruits) return 'Ramas y Frutos';
    if (hasRoots) return 'Raíces';
    if (hasBranches) return 'Ramas';
    if (hasFruits) return 'Frutos';
    return 'Elementos';
  };

  const options = [];

  if (nodeType === 'trunk') {
    options.push(
      { label: 'Agregar Raíz', icon: '🌱', action: 'addRoot' },
      { label: 'Agregar Rama', icon: '🌿', action: 'addBranch' },
    );
  } else if (nodeType === 'root') {
    options.push({ label: 'Agregar Raíz', icon: '🌱', action: 'addRoot' });
  } else if (nodeType === 'branch') {
    options.push(
      { label: 'Agregar Rama', icon: '🌿', action: 'addBranch' },
      { label: 'Agregar Fruto', icon: '🍊', action: 'addFruit' },
    );
  } else if (nodeType === 'fruit') {
    options.push({ label: 'Editar Dominio %', icon: '📊', action: 'editMastery' });
  }

  if (nodeType !== 'fruit' && hasChildren) {
    const targetLabel = getCollapseTargetLabel();
    options.push({
      label: isCollapsed ? `Expandir ${targetLabel}` : `Colapsar ${targetLabel}`,
      icon: isCollapsed ? '+' : '−',
      iconColor: '#4CAF50',
      action: 'toggleChildren',
    });
  }

  options.push({ label: 'Renombrar', icon: '✏️', action: 'rename' });
  if (nodeType !== 'trunk') options.push({ label: 'Eliminar', icon: '🗑️', action: 'delete', danger: true });

  return options;
}

export function defaultNameForType(childType) {
  if (childType === 'root') return 'Nueva Raíz';
  if (childType === 'branch') return 'Nueva Rama';
  return 'Nueva Competencia';
}
