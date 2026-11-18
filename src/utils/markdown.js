import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

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
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel']
}

/** Markdown → безопасный HTML (для v-html). */
export function renderMarkdown(text = '') {
  if (!text) return ''
  return DOMPurify.sanitize(md.render(String(text)), PURIFY_CONFIG)
}
