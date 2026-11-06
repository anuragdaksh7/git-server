import type { ReactNode } from 'react'

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'paragraph'; text: string }

const LIST_ITEM = /^\s*[-*]\s/
const BLOCK_START = /^(```|#{1,6}\s|\s*[-*]\s)/

function parse(source: string): Block[] {
  const blocks: Block[] = []
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('```')) {
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++])
      i++
      blocks.push({ kind: 'code', text: body.join('\n') })
    } else if (/^#{1,6}\s/.test(line)) {
      const [, hashes, text] = line.match(/^(#+)\s+(.*)$/)!
      blocks.push({ kind: 'heading', level: hashes.length, text })
      i++
    } else if (LIST_ITEM.test(line)) {
      const items: string[] = []
      while (i < lines.length && LIST_ITEM.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ''))
      blocks.push({ kind: 'list', items })
    } else if (line.trim() === '') {
      i++
    } else {
      const body: string[] = []
      while (i < lines.length && lines[i].trim() !== '' && !BLOCK_START.test(lines[i])) body.push(lines[i++])
      blocks.push({ kind: 'paragraph', text: body.join(' ') })
    }
  }
  return blocks
}

function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) return <code key={i}>{part.slice(1, -1)}</code>
    if (part.startsWith('**') && part.endsWith('**') && part.length > 3) return <strong key={i}>{part.slice(2, -2)}</strong>
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link && /^(https?:|mailto:|\/|#)/.test(link[2])) {
      return (
        <a key={i} href={link[2]} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      )
    }
    return part
  })
}

/** Renders a safe subset of Markdown (headings, paragraphs, lists, code) as React elements. */
export function Markdown({ source }: { source: string }) {
  return (
    <div className="markdown">
      {parse(source).map((block, i) => {
        switch (block.kind) {
          case 'heading': {
            const Tag = `h${Math.min(block.level + 1, 6)}` as 'h2'
            return <Tag key={i}>{inline(block.text)}</Tag>
          }
          case 'code':
            return <pre key={i}>{block.text}</pre>
          case 'list':
            return (
              <ul key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{inline(item)}</li>
                ))}
              </ul>
            )
          default:
            return <p key={i}>{inline(block.text)}</p>
        }
      })}
    </div>
  )
}
