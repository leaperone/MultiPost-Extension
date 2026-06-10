import type { PhrasingContent, Root, RootContent, Table, TableCell, TableRow } from 'mdast'
import type { Plugin } from 'unified'

const remarkFrontmatterTable: Plugin<[], Root> = () => {
  return (tree) => {
    const newChildren: RootContent[] = []

    for (const node of tree.children) {
      const nodeType = node.type as string

      if (nodeType !== 'yaml' && nodeType !== 'toml') {
        newChildren.push(node)
        continue
      }

      const frontmatterValue = (node as unknown as { value: string }).value

      let data: Record<string, unknown>
      try {
        // Simple YAML key-value parser for frontmatter
        data = parseSimpleYaml(frontmatterValue)
      }
      catch {
        newChildren.push(node)
        continue
      }

      if (!data || typeof data !== 'object') {
        newChildren.push(node)
        continue
      }

      const rows: TableRow[] = Object.entries(data).map(([key, value]) => {
        const valueStr = formatValue(value)

        const keyCell: TableCell = {
          type: 'tableCell',
          children: [{ type: 'text', value: key }],
          data: { hProperties: { className: ['frontmatter-key'] } },
        }

        const valueCell: TableCell = {
          type: 'tableCell',
          children: [{ type: 'text', value: valueStr } as PhrasingContent],
          data: { hProperties: { className: ['frontmatter-value'] } },
        }

        return {
          type: 'tableRow',
          children: [keyCell, valueCell],
        } as TableRow
      })

      const tableNode: Table = {
        type: 'table',
        children: rows,
        data: { hProperties: { className: ['frontmatter-table'] } },
      }

      newChildren.push(tableNode)
    }

    tree.children = newChildren
  }
}

function parseSimpleYaml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const lines = text.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) continue
    const key = trimmed.slice(0, colonIndex).trim()
    let value: string | boolean | number = trimmed.slice(colonIndex + 1).trim()
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    // Parse booleans and numbers
    if (value === 'true') value = true as unknown as string
    else if (value === 'false') value = false as unknown as string
    else if (/^-?\d+(\.\d+)?$/.test(value)) value = Number(value) as unknown as string
    result[key] = value
  }
  return result
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.map(v => formatValue(v)).join(', ')
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

export default remarkFrontmatterTable
