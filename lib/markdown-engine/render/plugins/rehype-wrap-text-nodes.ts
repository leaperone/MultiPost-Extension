import type { Element, ElementContent, Root, Text } from 'hast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

const BLOCK_ELEMENTS = new Set([
  'p',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'td',
  'th',
  'blockquote',
  'figcaption',
])

function isNonEmptyText(node: ElementContent): node is Text {
  return node.type === 'text' && node.value.trim().length > 0
}

function wrapTextWithSpan(child: ElementContent): ElementContent {
  if (isNonEmptyText(child)) {
    return { type: 'element', tagName: 'span', properties: {}, children: [child] }
  }
  return child
}

const rehypeWrapTextNodes: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'element', (node: Element) => {
      if (BLOCK_ELEMENTS.has(node.tagName) && node.children?.length) {
        node.children = node.children.map(wrapTextWithSpan)
      }
    })
  }
}

export default rehypeWrapTextNodes
