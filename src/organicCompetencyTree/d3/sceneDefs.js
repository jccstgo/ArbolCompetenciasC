export function createSceneDefs(defs) {
  // Gradients
  const skyGrad = defs.append('linearGradient').attr('id', 'sky-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
  skyGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f8fbff');
  skyGrad.append('stop').attr('offset', '55%').attr('stop-color', '#eef6ff');
  skyGrad.append('stop').attr('offset', '100%').attr('stop-color', '#e3efff');
  
  const groundGrad = defs.append('linearGradient').attr('id', 'ground-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
  groundGrad.append('stop').attr('offset', '0%').attr('stop-color', '#8D6E63');
  groundGrad.append('stop').attr('offset', '100%').attr('stop-color', '#5D4037');
  
  // Trunk bark gradient with enhanced 3D lighting effect (light from upper-left)
  const barkGrad = defs.append('linearGradient').attr('id', 'bark-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');
  barkGrad.append('stop').attr('offset', '0%').attr('stop-color', '#2D1B15'); // Deep shadow on left edge
  barkGrad.append('stop').attr('offset', '15%').attr('stop-color', '#4E342E');
  barkGrad.append('stop').attr('offset', '35%').attr('stop-color', '#6D4C41');
  barkGrad.append('stop').attr('offset', '45%').attr('stop-color', '#8D6E63'); // Highlight center-left
  barkGrad.append('stop').attr('offset', '55%').attr('stop-color', '#7D5A4F');
  barkGrad.append('stop').attr('offset', '70%').attr('stop-color', '#5D4037');
  barkGrad.append('stop').attr('offset', '85%').attr('stop-color', '#4E342E');
  barkGrad.append('stop').attr('offset', '100%').attr('stop-color', '#1A0F0A'); // Deep shadow on right edge
  
  // Trunk highlight gradient for 3D cylindrical effect
  const barkHighlightGrad = defs.append('linearGradient').attr('id', 'bark-highlight-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');
  barkHighlightGrad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(255,255,255,0)');
  barkHighlightGrad.append('stop').attr('offset', '25%').attr('stop-color', 'rgba(255,248,225,0.15)');
  barkHighlightGrad.append('stop').attr('offset', '40%').attr('stop-color', 'rgba(255,248,225,0.25)');
  barkHighlightGrad.append('stop').attr('offset', '55%').attr('stop-color', 'rgba(255,248,225,0.08)');
  barkHighlightGrad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(0,0,0,0)');
  
  // Vertical trunk gradient for top-bottom depth
  const barkVertGrad = defs.append('linearGradient').attr('id', 'bark-vertical-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
  barkVertGrad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(139,119,101,0.3)'); // Lighter at top
  barkVertGrad.append('stop').attr('offset', '30%').attr('stop-color', 'rgba(0,0,0,0)');
  barkVertGrad.append('stop').attr('offset', '70%').attr('stop-color', 'rgba(0,0,0,0)');
  barkVertGrad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(0,0,0,0.2)'); // Darker at base
  
  // Branch bark gradient - enhanced cylindrical 3D effect with dramatic lighting
  const branchBarkGrad = defs.append('linearGradient').attr('id', 'branch-bark-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
  branchBarkGrad.append('stop').attr('offset', '0%').attr('stop-color', '#2D1B12'); // Deep shadow edge (top)
  branchBarkGrad.append('stop').attr('offset', '8%').attr('stop-color', '#4E342E');
  branchBarkGrad.append('stop').attr('offset', '20%').attr('stop-color', '#6D4C41');
  branchBarkGrad.append('stop').attr('offset', '35%').attr('stop-color', '#8D6E63'); // Main highlight band
  branchBarkGrad.append('stop').attr('offset', '45%').attr('stop-color', '#A1887F'); // Brightest point
  branchBarkGrad.append('stop').attr('offset', '55%').attr('stop-color', '#8D6E63');
  branchBarkGrad.append('stop').attr('offset', '70%').attr('stop-color', '#6D4C41');
  branchBarkGrad.append('stop').attr('offset', '85%').attr('stop-color', '#5D4037');
  branchBarkGrad.append('stop').attr('offset', '100%').attr('stop-color', '#1A0F0A'); // Deep shadow edge (bottom)
  
  // Branch highlight gradient for top edge shine
  const branchHighlightGrad = defs.append('linearGradient').attr('id', 'branch-highlight-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
  branchHighlightGrad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(255, 248, 230, 0)');
  branchHighlightGrad.append('stop').attr('offset', '25%').attr('stop-color', 'rgba(255, 248, 230, 0.35)');
  branchHighlightGrad.append('stop').attr('offset', '45%').attr('stop-color', 'rgba(255, 248, 230, 0.5)'); // Peak highlight
  branchHighlightGrad.append('stop').attr('offset', '55%').attr('stop-color', 'rgba(255, 248, 230, 0.2)');
  branchHighlightGrad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(255, 248, 230, 0)');
  
  // Branch shadow gradient for bottom edge depth
  const branchShadowGrad = defs.append('linearGradient').attr('id', 'branch-shadow-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
  branchShadowGrad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(0, 0, 0, 0.3)');
  branchShadowGrad.append('stop').attr('offset', '15%').attr('stop-color', 'rgba(0, 0, 0, 0)');
  branchShadowGrad.append('stop').attr('offset', '85%').attr('stop-color', 'rgba(0, 0, 0, 0)');
  branchShadowGrad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(0, 0, 0, 0.4)');
  
  // Branch texture gradient for bark detail
  const branchTextureGrad = defs.append('linearGradient').attr('id', 'branch-texture-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');
  branchTextureGrad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(60, 40, 30, 0.3)');
  branchTextureGrad.append('stop').attr('offset', '50%').attr('stop-color', 'rgba(60, 40, 30, 0)');
  branchTextureGrad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(60, 40, 30, 0.25)');
  
  // Leaf gradient with enhanced 3D spherical lighting
  const leafGrad = defs.append('radialGradient').attr('id', 'leaf-gradient').attr('cx', '25%').attr('cy', '20%').attr('r', '75%');
  leafGrad.append('stop').attr('offset', '0%').attr('stop-color', '#A5D6A7'); // Bright sunlit highlight
  leafGrad.append('stop').attr('offset', '20%').attr('stop-color', '#81C784');
  leafGrad.append('stop').attr('offset', '50%').attr('stop-color', '#4CAF50');
  leafGrad.append('stop').attr('offset', '80%').attr('stop-color', '#388E3C');
  leafGrad.append('stop').attr('offset', '100%').attr('stop-color', '#1B5E20'); // Deep shadow at edge
  
  // Canopy gradient for middle foliage layer - enhanced 3D with light from upper-left
  const canopyGrad = defs.append('radialGradient').attr('id', 'canopy-gradient').attr('cx', '30%').attr('cy', '25%').attr('r', '70%');
  canopyGrad.append('stop').attr('offset', '0%').attr('stop-color', '#81C784'); // Bright highlight
  canopyGrad.append('stop').attr('offset', '25%').attr('stop-color', '#66BB6A');
  canopyGrad.append('stop').attr('offset', '50%').attr('stop-color', '#4CAF50');
  canopyGrad.append('stop').attr('offset', '75%').attr('stop-color', '#388E3C');
  canopyGrad.append('stop').attr('offset', '100%').attr('stop-color', '#1B5E20'); // Deep shadow
  
  // Canopy inner shadow gradient for depth between foliage clusters
  const canopyInnerShadow = defs.append('radialGradient').attr('id', 'canopy-inner-shadow').attr('cx', '50%').attr('cy', '60%').attr('r', '50%');
  canopyInnerShadow.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(27, 94, 32, 0.6)');
  canopyInnerShadow.append('stop').attr('offset', '70%').attr('stop-color', 'rgba(27, 94, 32, 0.2)');
  canopyInnerShadow.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(27, 94, 32, 0)');
  
  // Canopy highlight gradient for top light effect
  const canopyHighlight = defs.append('radialGradient').attr('id', 'canopy-highlight-gradient').attr('cx', '35%').attr('cy', '20%').attr('r', '60%');
  canopyHighlight.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(200, 230, 201, 0.5)'); // Bright sunlit top
  canopyHighlight.append('stop').attr('offset', '40%').attr('stop-color', 'rgba(165, 214, 167, 0.25)');
  canopyHighlight.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(129, 199, 132, 0)');
  
  // Root node gradient - enhanced 3D spherical effect with earthy tones
  const rootNodeGrad = defs.append('radialGradient').attr('id', 'root-node-gradient').attr('cx', '30%').attr('cy', '25%').attr('r', '70%');
  rootNodeGrad.append('stop').attr('offset', '0%').attr('stop-color', '#BCAAA4'); // Bright highlight
  rootNodeGrad.append('stop').attr('offset', '15%').attr('stop-color', '#A1887F');
  rootNodeGrad.append('stop').attr('offset', '40%').attr('stop-color', '#8D6E63');
  rootNodeGrad.append('stop').attr('offset', '65%').attr('stop-color', '#6D4C41');
  rootNodeGrad.append('stop').attr('offset', '85%').attr('stop-color', '#5D4037');
  rootNodeGrad.append('stop').attr('offset', '100%').attr('stop-color', '#3E2723'); // Deep shadow edge
  
  // Root node inner shadow for depth
  const rootNodeInnerShadow = defs.append('radialGradient').attr('id', 'root-node-inner-shadow').attr('cx', '70%').attr('cy', '70%').attr('r', '50%');
  rootNodeInnerShadow.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(62, 39, 35, 0.5)');
  rootNodeInnerShadow.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(62, 39, 35, 0)');
  
  // Root node highlight gradient
  const rootNodeHighlight = defs.append('radialGradient').attr('id', 'root-node-highlight').attr('cx', '25%').attr('cy', '20%').attr('r', '50%');
  rootNodeHighlight.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(215, 204, 200, 0.6)');
  rootNodeHighlight.append('stop').attr('offset', '50%').attr('stop-color', 'rgba(188, 170, 164, 0.3)');
  rootNodeHighlight.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(161, 136, 127, 0)');
  
  // Root link gradient - enhanced cylindrical 3D effect with earthy underground tones
  const rootLinkGrad = defs.append('linearGradient').attr('id', 'root-link-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
  rootLinkGrad.append('stop').attr('offset', '0%').attr('stop-color', '#2D1B12'); // Deep shadow edge
  rootLinkGrad.append('stop').attr('offset', '10%').attr('stop-color', '#4E342E');
  rootLinkGrad.append('stop').attr('offset', '25%').attr('stop-color', '#6D4C41');
  rootLinkGrad.append('stop').attr('offset', '40%').attr('stop-color', '#8D6E63'); // Highlight band
  rootLinkGrad.append('stop').attr('offset', '50%').attr('stop-color', '#A1887F'); // Brightest point
  rootLinkGrad.append('stop').attr('offset', '60%').attr('stop-color', '#8D6E63');
  rootLinkGrad.append('stop').attr('offset', '75%').attr('stop-color', '#6D4C41');
  rootLinkGrad.append('stop').attr('offset', '90%').attr('stop-color', '#4E342E');
  rootLinkGrad.append('stop').attr('offset', '100%').attr('stop-color', '#1A0F0A'); // Deep shadow edge
  
  // Root link highlight gradient for cylindrical shine
  const rootLinkHighlightGrad = defs.append('linearGradient').attr('id', 'root-link-highlight-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
  rootLinkHighlightGrad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(215, 204, 200, 0)');
  rootLinkHighlightGrad.append('stop').attr('offset', '30%').attr('stop-color', 'rgba(215, 204, 200, 0.25)');
  rootLinkHighlightGrad.append('stop').attr('offset', '50%').attr('stop-color', 'rgba(215, 204, 200, 0.4)');
  rootLinkHighlightGrad.append('stop').attr('offset', '70%').attr('stop-color', 'rgba(215, 204, 200, 0.15)');
  rootLinkHighlightGrad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(215, 204, 200, 0)');
  
  // Root link shadow gradient for edge depth
  const rootLinkShadowGrad = defs.append('linearGradient').attr('id', 'root-link-shadow-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
  rootLinkShadowGrad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(0, 0, 0, 0.35)');
  rootLinkShadowGrad.append('stop').attr('offset', '15%').attr('stop-color', 'rgba(0, 0, 0, 0)');
  rootLinkShadowGrad.append('stop').attr('offset', '85%').attr('stop-color', 'rgba(0, 0, 0, 0)');
  rootLinkShadowGrad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(0, 0, 0, 0.4)');
  
  const fruitGrad = defs.append('radialGradient').attr('id', 'fruit-gradient').attr('cx', '30%').attr('cy', '30%');
  fruitGrad.append('stop').attr('offset', '0%').attr('stop-color', '#FFCDD2');
  fruitGrad.append('stop').attr('offset', '55%').attr('stop-color', '#EF5350');
  fruitGrad.append('stop').attr('offset', '100%').attr('stop-color', '#C62828');
  
  // Filters
  const fruitGlow = defs.append('filter').attr('id', 'fruit-glow').attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%');
  fruitGlow.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'blur');
  fruitGlow.append('feFlood').attr('flood-color', 'rgba(239, 83, 80, 0.65)').attr('result', 'color');
  fruitGlow.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow');
  const fruitMerge = fruitGlow.append('feMerge');
  fruitMerge.append('feMergeNode').attr('in', 'glow');
  fruitMerge.append('feMergeNode').attr('in', 'SourceGraphic');
  
  const shadow = defs.append('filter').attr('id', 'drop-shadow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
  shadow.append('feDropShadow').attr('dx', 2).attr('dy', 4).attr('stdDeviation', 3).attr('flood-color', 'rgba(0,0,0,0.4)');
  
}

