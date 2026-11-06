export type TokenKind = 'plain' | 'keyword' | 'type' | 'string' | 'number' | 'comment'
export type Token = { text: string; kind: TokenKind }

const KEYWORDS = new Set(
  [
    'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var',
    'as async await class let new of this throw try catch finally while do export from extends implements in instanceof typeof void yield',
    'fn impl pub use mut self Self match mod trait where loop crate',
    'def elif lambda pass raise with not and or is None True False nil null undefined true false',
  ]
    .join(' ')
    .split(' '),
)

const TOKEN = /(\/\/.*$|#.*$|\/\*.*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`|\b\d[\d_.]*\b|\b[A-Za-z_]\w*\b)/g

/** A deliberately small, language-agnostic highlighter, one line at a time. */
export function tokenize(line: string, hashComments: boolean): Token[] {
  const tokens: Token[] = []
  let last = 0
  for (const match of line.matchAll(TOKEN)) {
    const text = match[0]
    const at = match.index
    if (at > last) tokens.push({ text: line.slice(last, at), kind: 'plain' })
    const kind = classify(text, hashComments)
    if (kind === 'comment') {
      tokens.push({ text: line.slice(at), kind })
      return tokens
    }
    tokens.push({ text, kind })
    last = at + text.length
  }
  if (last < line.length) tokens.push({ text: line.slice(last), kind: 'plain' })
  return tokens
}

function classify(text: string, hashComments: boolean): TokenKind {
  if (text.startsWith('//') || text.startsWith('/*')) return 'comment'
  if (text.startsWith('#')) return hashComments ? 'comment' : 'plain'
  if (/^["'`]/.test(text)) return 'string'
  if (/^\d/.test(text)) return 'number'
  if (KEYWORDS.has(text)) return 'keyword'
  if (/^[A-Z]/.test(text)) return 'type'
  return 'plain'
}

export function usesHashComments(path: string) {
  return /\.(py|rb|sh|bash|zsh|ya?ml|toml|conf|ini|r|pl)$|(^|\/)(Makefile|Dockerfile|\.gitignore|\.env[^/]*)$/i.test(path)
}
