import type { Element, Root, Text } from 'hast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

interface FootnoteLink {
  id: number
  href: string
  text: string
}

interface Options {
  referenceTitle?: string
}

function extractText(node: Element): string {
  const texts: string[] = []

  function walk(n: Element | Text) {
    if (n.type === 'text') {
      texts.push(n.value)
    }
    else if (n.type === 'element' && n.children) {
      for (const child of n.children) {
        if (child.type === 'text' || child.type === 'element') {
          walk(child)
        }
      }
    }
  }

  walk(node)
  return texts.join('').trim() || node.properties?.href?.toString() || ''
}

const rehypeFootnoteLinks: Plugin<[Options?], Root> = (options = {}) => {
  const { referenceTitle = 'References' } = options

  return (tree) => {
    const links: FootnoteLink[] = []
    const seenUrls = new Set<string>()
    let counter = 1

    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'a' || !node.properties?.href) {
        return
      }

      const href = String(node.properties.href)
      if (!href.startsWith('http://') && !href.startsWith('https://')) {
        return
      }

      if (seenUrls.has(href)) {
        const existingLink = links.find(l => l.href === href)
        if (existingLink && parent && typeof index === 'number') {
          const sup: Element = {
            type: 'element',
            tagName: 'sup',
            properties: { className: ['footnote-ref'] },
            children: [{ type: 'text', value: `[${existingLink.id}]` }],
          }
          parent.children.splice(index + 1, 0, sup)
        }
        return
      }

      const text = extractText(node)
      const id = counter++
      links.push({ id, href, text })
      seenUrls.add(href)

      if (parent && typeof index === 'number') {
        const sup: Element = {
          type: 'element',
          tagName: 'sup',
          properties: { className: ['footnote-ref'] },
          children: [{ type: 'text', value: `[${id}]` }],
        }
        parent.children.splice(index + 1, 0, sup)
      }
    })

    if (links.length === 0) {
      return
    }

    const footnoteSection: Element = {
      type: 'element',
      tagName: 'section',
      properties: { className: ['footnotes'], dataFootnotes: '' },
      children: [
        {
          type: 'element',
          tagName: 'h4',
          properties: {},
          children: [{ type: 'text', value: referenceTitle }],
        },
        {
          type: 'element',
          tagName: 'ol',
          properties: {},
          children: links.map(link => ({
            type: 'element',
            tagName: 'li',
            properties: { id: `user-content-fn-${link.id}` },
            children: [
              {
                type: 'element',
                tagName: 'span',
                properties: {},
                children: [{ type: 'text', value: `${link.text}: ` }],
              },
              {
                type: 'element',
                tagName: 'a',
                properties: { href: link.href },
                children: [{ type: 'text', value: link.href }],
              },
            ],
          } as Element)),
        },
      ],
    }

    tree.children.push(footnoteSection)
  }
}

export default rehypeFootnoteLinks
