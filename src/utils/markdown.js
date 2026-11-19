import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

/**
 * Чек-листы: «- [ ] пункт» и «- [x] пункт».
 * markdown-it такого не умеет, поэтому подменяем маркер на span-квадратик
 * до рендера. Классы стилизуются в base.css (.md-task).
 */
function taskListPlugin(mdInstance) {
  mdInstance.core.ruler.after('inline', 'task-list', (state) => {
    const tokens = state.tokens

    for (let index = 2; index < tokens.length; index += 1) {
      const inline = tokens[index]
      if (inline.type !== 'inline') continue
      if (tokens[index - 1].type !== 'paragraph_open') continue
      if (tokens[index - 2].type !== 'list_item_open') continue

      const children = inline.children
      if (!children?.length || children[0].type !== 'text') continue

      const match = /^\[([ xX])\]\s+/.exec(children[0].content)
      if (!match) continue

      children[0].content = children[0].content.slice(match[0].length)

      const marker = new state.Token('html_inline', '', 0)
      const done = match[1].toLowerCase() === 'x'
      marker.content = `<span class="md-task${done ? ' md-task--done' : ''}"></span>`
      children.unshift(marker)
    }
  })
}

/**
 * Подчёркивание: ++текст++.
 * Закрывающие «++» не считаются разметкой, если сразу за ними идёт слово
 * или плюс — поэтому «C++» и «A++B++C» остаются обычным текстом.
 */
function underlinePlugin(mdInstance) {
  mdInstance.inline.ruler.before('emphasis', 'underline', (state, silent) => {
    const { src, pos } = state
    if (src.charCodeAt(pos) !== 0x2b || src.charCodeAt(pos + 1) !== 0x2b) return false

    let end = pos + 2
    while (end < src.length - 1) {
      if (src.charCodeAt(end) === 0x2b && src.charCodeAt(end + 1) === 0x2b) break
      end += 1
    }
    if (end >= src.length - 1) return false

    const content = src.slice(pos + 2, end)
    if (!content.trim() || /^\s|\s$/.test(content)) return false

    // За «++» не должно идти слово или ещё один плюс: иначе это «C++» / «a++b»
    if (/[0-9A-Za-zА-Яа-яЁё_+]/.test(src.charAt(end + 2))) return false

    if (!silent) {
      const inner = state.md.parseInline(content, state.env)[0]
      state.push('u_open', 'u', 1)
      for (const child of inner?.children ?? []) {
        child.level = 0
        state.tokens.push(child)
      }
      state.push('u_close', 'u', -1)
    }

    state.pos = end + 2
    return true
  })
}

/**
 * Markdown для отзывов «Как проходил».
 *
 * html: false — сырой HTML в тексте не исполняется (markdown-it его экранирует),
 * DOMPurify — вторая страховка перед v-html.
 */
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false
})
  .use(taskListPlugin)
  .use(underlinePlugin)

const renderToken = (tokens, index, options, _env, self) => self.renderToken(tokens, index, options)
const defaultLinkOpen = md.renderer.rules.link_open || renderToken

// Внешние ссылки открываются в новой вкладке
md.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const href = tokens[index].attrGet('href') ?? ''

  if (/^https?:\/\//i.test(href)) {
    tokens[index].attrSet('target', '_blank')
    tokens[index].attrSet('rel', 'noopener noreferrer')
  }

  return defaultLinkOpen(tokens, index, options, env, self)
}

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    's',
    'del',
    'u',
    'span',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'code',
    'pre',
    'a',
    'hr'
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class']
}

/** Markdown → безопасный HTML (для v-html). */
export function renderMarkdown(text = '') {
  if (!text) return ''
  return DOMPurify.sanitize(md.render(String(text)), PURIFY_CONFIG)
}
