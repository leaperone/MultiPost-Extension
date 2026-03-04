import { defaultSchema } from 'rehype-sanitize'

/**
 * Sanitize schema for rehype-sanitize
 *
 * rehypeSanitize runs AFTER rehypeMermaid/rehypeKatex/rehypeHighlight,
 * so SVG and KaTeX elements must be allowed here.
 */
export const sanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...(defaultSchema.protocols || {}),
    href: ['http', 'https', 'mailto', 'tel'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'figure',
    'figcaption',
    'section',
    // SVG elements (mermaid)
    'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline',
    'polygon', 'text', 'tspan', 'defs', 'clipPath', 'use', 'marker',
    'pattern', 'mask', 'image', 'switch', 'foreignObject',
    'linearGradient', 'radialGradient', 'stop', 'title', 'desc',
    // KaTeX elements
    'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub',
    'mfrac', 'mover', 'munder', 'msqrt', 'mroot', 'mtable', 'mtr',
    'mtd', 'mtext', 'mspace', 'annotation',
    // Code highlight
    'mark',
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a || []), 'target', 'rel'],
    div: [...(defaultSchema.attributes?.div || []), 'className'],
    section: [...(defaultSchema.attributes?.section || []), 'className'],
    p: [...(defaultSchema.attributes?.p || []), 'className'],
    figure: [...(defaultSchema.attributes?.figure || []), 'className'],
    // SVG attributes
    svg: ['viewBox', 'width', 'height', 'xmlns', 'className', 'role', 'aria-label', 'aria-roledescription', 'style'],
    g: ['transform', 'className', 'id'],
    path: ['d', 'fill', 'stroke', 'strokeWidth', 'className', 'style', 'transform', 'id'],
    rect: ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill', 'stroke', 'className', 'style', 'transform', 'id'],
    circle: ['cx', 'cy', 'r', 'fill', 'stroke', 'className', 'style'],
    ellipse: ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke', 'className', 'style'],
    line: ['x1', 'y1', 'x2', 'y2', 'stroke', 'strokeWidth', 'className', 'style'],
    polyline: ['points', 'fill', 'stroke', 'className', 'style'],
    polygon: ['points', 'fill', 'stroke', 'className', 'style'],
    text: ['x', 'y', 'dx', 'dy', 'textAnchor', 'dominantBaseline', 'className', 'style', 'fill', 'transform', 'fontSize', 'fontFamily', 'fontWeight'],
    tspan: ['x', 'y', 'dx', 'dy', 'className', 'style'],
    clipPath: ['id'],
    use: ['href', 'x', 'y', 'width', 'height'],
    marker: ['id', 'viewBox', 'refX', 'refY', 'markerWidth', 'markerHeight', 'orient', 'fill'],
    linearGradient: ['id', 'x1', 'y1', 'x2', 'y2', 'gradientUnits', 'gradientTransform'],
    radialGradient: ['id', 'cx', 'cy', 'r', 'fx', 'fy', 'gradientUnits'],
    stop: ['offset', 'stopColor', 'stopOpacity', 'style'],
    mask: ['id', 'x', 'y', 'width', 'height', 'maskUnits'],
    pattern: ['id', 'x', 'y', 'width', 'height', 'patternUnits', 'patternTransform'],
    foreignObject: ['x', 'y', 'width', 'height'],
    // KaTeX attributes
    math: ['xmlns', 'display'],
    annotation: ['encoding'],
    span: [...(defaultSchema.attributes?.span || []), 'className', 'style', 'aria-hidden'],
  },
}
