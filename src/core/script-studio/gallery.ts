import type { RunAt } from './types'

export type GalleryCategory = 'ai' | 'productivity' | 'reading' | 'video' | 'privacy' | 'developer' | 'social'

export const GALLERY_CATEGORIES: GalleryCategory[] = ['ai', 'productivity', 'reading', 'video', 'privacy', 'developer', 'social']

export type GalleryScript = {
  id: string
  name: string
  description: string
  category: GalleryCategory
  /** Human label for where it runs, e.g. "ChatGPT" or "All sites". */
  sites: string
  /** Invasive scripts install switched off so nothing changes until the user opts in. */
  enabledByDefault: boolean
  code: string
}

export const GALLERY_INSTALL_PREFIX = 'gallery:'

type Spec = {
  id: string
  name: string
  description: string
  category: GalleryCategory
  sites: string
  matches: string[]
  grants?: string[]
  runAt?: RunAt
  enabledByDefault?: boolean
  /** Bump when the code changes so installed copies are upgraded. */
  version?: string
  body: string
}

const AI_SITES = [
  'https://chatgpt.com/*',
  'https://chat.openai.com/*',
  'https://claude.ai/*',
  'https://gemini.google.com/*',
  'https://chat.deepseek.com/*',
  'https://www.perplexity.ai/*',
  'https://copilot.microsoft.com/*',
  'https://grok.com/*',
  'https://chat.mistral.ai/*',
]

const ALL_SITES = ['*://*/*']

const ADD_STYLE = String.raw`function addStyle(css) {
  var el = document.createElement('style');
  el.textContent = css;
  (document.head || document.documentElement).appendChild(el);
  return el;
}
`

const TOAST = String.raw`function toast(text) {
  var el = document.createElement('div');
  el.textContent = text;
  el.setAttribute('role', 'status');
  el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;' +
    'padding:8px 14px;border-radius:999px;background:rgba(20,20,20,.92);color:#fff;font:500 13px/1.4 system-ui,sans-serif;' +
    'box-shadow:0 6px 24px rgba(0,0,0,.25);pointer-events:none;transition:opacity .2s ease;opacity:0';
  document.documentElement.appendChild(el);
  requestAnimationFrame(function () { el.style.opacity = '1'; });
  setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 250); }, 1600);
}
`

const NOTE = String.raw`function note(text) {
  if (typeof __ssNote === 'function') __ssNote(text);
}
`

const IS_TYPING = String.raw`function isTyping(target) {
  var el = target instanceof Element ? target : null;
  return !!el && (el.closest('input, textarea, select') !== null || el.isContentEditable);
}
`

const FLOAT_BUTTON = String.raw`function floatButton(label, title, bottom) {
  var b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.title = title;
  b.setAttribute('aria-label', title);
  b.style.cssText = 'position:fixed;right:18px;bottom:' + bottom + 'px;z-index:2147483646;padding:7px 12px;' +
    'border-radius:999px;border:1px solid rgba(127,127,127,.35);background:rgba(24,24,27,.9);color:#fafafa;' +
    'font:500 12px/1.2 system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.2);';
  document.documentElement.appendChild(b);
  return b;
}
`

function build(spec: Spec): GalleryScript {
  const lines = [
    '// ==UserScript==',
    `// @name         ${spec.name}`,
    '// @namespace    https://one-panel.local/script-studio/gallery',
    `// @version      ${spec.version ?? '1.0.0'}`,
    `// @description  ${spec.description}`,
    '// @author       One Panel',
    ...spec.matches.map((m) => `// @match        ${m}`),
    ...(spec.grants ?? ['none']).map((g) => `// @grant        ${g}`),
    `// @run-at       ${spec.runAt ?? 'document-idle'}`,
    '// @noframes',
    '// ==/UserScript==',
    '',
    '(function () {',
    "  'use strict';",
    '',
  ]
  const body = spec.body
    .trim()
    .split('\n')
    .map((line) => (line ? `  ${line}` : line))
    .join('\n')
  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    category: spec.category,
    sites: spec.sites,
    enabledByDefault: spec.enabledByDefault ?? true,
    code: `${lines.join('\n')}${body}\n})();\n`,
  }
}

const SPECS: Spec[] = [
  // ── AI chatbots ─────────────────────────────────────────────
  {
    id: 'chatgpt-wide',
    name: 'ChatGPT Wide Mode',
    description: 'Uses the full window width for ChatGPT conversations instead of a narrow column.',
    category: 'ai',
    sites: 'ChatGPT',
    matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
    runAt: 'document-start',
    body: ADD_STYLE + String.raw`
addStyle([
  ':root, body, main { --thread-content-max-width: min(96vw, 1400px) !important; }',
  '[class*="thread-content-max-width"], div[class*="md:max-w-3xl"], div[class*="xl:max-w-[48rem]"], div[class*="lg:max-w-[40rem]"] {',
  '  max-width: min(96%, 1400px) !important;',
  '}'
].join('\n'));`,
  },
  {
    id: 'claude-wide',
    name: 'Claude Wide Mode',
    description: 'Widens the Claude chat column and composer so long answers and code need less scrolling.',
    category: 'ai',
    sites: 'Claude',
    matches: ['https://claude.ai/*'],
    runAt: 'document-start',
    body: ADD_STYLE + String.raw`
addStyle([
  'div[class*="max-w-3xl"], div[class*="max-w-[60ch]"], div[class*="max-w-[75ch]"], fieldset[class*="max-w-"] {',
  '  max-width: min(96%, 1400px) !important;',
  '}'
].join('\n'));`,
  },
  {
    id: 'gemini-wide',
    name: 'Gemini Wide Mode',
    description: 'Lets Gemini conversations and the input box stretch across the window.',
    category: 'ai',
    sites: 'Gemini',
    matches: ['https://gemini.google.com/*'],
    runAt: 'document-start',
    body: ADD_STYLE + String.raw`
addStyle([
  '.conversation-container, user-query, model-response, .input-area-container, .bottom-container {',
  '  max-width: min(96%, 1400px) !important;',
  '}'
].join('\n'));`,
  },
  {
    id: 'ai-ctrl-enter',
    name: 'AI Chat: Ctrl+Enter to Send',
    description: 'Enter adds a new line and Ctrl/⌘+Enter sends, so half-written prompts never go out by accident.',
    category: 'ai',
    sites: 'ChatGPT, Claude, Gemini, DeepSeek, Perplexity, Copilot, Grok, Mistral',
    matches: AI_SITES,
    runAt: 'document-start',
    body: String.raw`
var SEND = 'button[data-testid="send-button"], button[aria-label*="Send" i], button[aria-label*="Submit" i], button[type="submit"]';

function isComposer(el) {
  return !!el && (el.tagName === 'TEXTAREA' || el.isContentEditable);
}

window.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter' || e.isComposing || e.shiftKey || e.altKey || !e.isTrusted) return;
  var el = e.target;
  if (!isComposer(el)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if (e.ctrlKey || e.metaKey) {
    var form = el.closest('form');
    var btn = (form && form.querySelector(SEND)) || document.querySelector(SEND);
    if (btn && !btn.disabled) btn.click();
    return;
  }
  if (el.tagName === 'TEXTAREA') {
    el.setRangeText('\n', el.selectionStart, el.selectionEnd, 'end');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', shiftKey: true, bubbles: true, cancelable: true }));
  }
}, true);`,
  },
  {
    id: 'ai-chat-export',
    name: 'AI Chat Exporter (Markdown)',
    description: 'Adds an Export button that saves the current AI conversation as a Markdown file.',
    category: 'ai',
    sites: 'ChatGPT, Claude, Gemini and more',
    matches: AI_SITES,
    body: FLOAT_BUTTON + String.raw`
function collect() {
  var out = [];
  var roles = document.querySelectorAll('[data-message-author-role]');
  if (roles.length) {
    roles.forEach(function (n) {
      out.push({ role: n.getAttribute('data-message-author-role'), text: n.innerText.trim() });
    });
    return out;
  }
  var claude = document.querySelectorAll('[data-testid="user-message"], .font-claude-response, .font-claude-message');
  if (claude.length) {
    claude.forEach(function (n) {
      out.push({ role: n.matches('[data-testid="user-message"]') ? 'user' : 'assistant', text: n.innerText.trim() });
    });
    return out;
  }
  var gemini = document.querySelectorAll('user-query, model-response');
  if (gemini.length) {
    gemini.forEach(function (n) {
      out.push({ role: n.tagName.toLowerCase() === 'user-query' ? 'user' : 'assistant', text: n.innerText.trim() });
    });
    return out;
  }
  var main = document.querySelector('main') || document.body;
  return [{ role: 'page', text: main.innerText.trim() }];
}

function exportChat() {
  var title = document.title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'chat';
  var md = '# ' + title + '\n\n_Exported ' + new Date().toLocaleString() + ' from ' + location.href + '_\n\n';
  collect().forEach(function (m) {
    var who = m.role === 'user' ? 'You' : m.role === 'page' ? 'Conversation' : 'Assistant';
    md += '## ' + who + '\n\n' + m.text + '\n\n';
  });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
  a.download = title.slice(0, 80) + '.md';
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
}

floatButton('Export', 'Export this chat as Markdown', 72).addEventListener('click', exportChat);`,
  },
  {
    id: 'ai-prompt-library',
    name: 'AI Prompt Library',
    description: 'A Prompts button with reusable prompts you can insert into any AI chat box, and save your own.',
    category: 'ai',
    sites: 'ChatGPT, Claude, Gemini and more',
    matches: AI_SITES,
    grants: ['GM_getValue', 'GM_setValue'],
    body: FLOAT_BUTTON + String.raw`
var DEFAULTS = [
  { name: 'Summarize', text: 'Summarize the following in 5 bullet points:\n\n' },
  { name: 'Explain simply', text: 'Explain this like I am new to the topic, with one example:\n\n' },
  { name: 'Review code', text: 'Review this code for bugs, edge cases and readability. Suggest concrete fixes:\n\n' },
  { name: 'Make it shorter', text: 'Rewrite this to be half as long without losing meaning:\n\n' },
  { name: 'Translate to English', text: 'Translate the following to natural English:\n\n' }
];
var lastEditable = null;

document.addEventListener('focusin', function (e) {
  var el = e.target;
  if (el && (el.tagName === 'TEXTAREA' || el.isContentEditable)) lastEditable = el;
}, true);

function prompts() {
  return GM_getValue('prompts', DEFAULTS);
}

function insert(text) {
  var el = lastEditable && lastEditable.isConnected ? lastEditable : document.querySelector('textarea, [contenteditable="true"]');
  if (!el) return;
  el.focus();
  if (el.tagName === 'TEXTAREA') {
    el.setRangeText(text, el.selectionStart, el.selectionEnd, 'end');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    document.execCommand('insertText', false, text);
  }
}

var panel = null;
function closePanel() {
  if (panel) { panel.remove(); panel = null; }
}

function row(label, onClick, onDelete) {
  var wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;gap:4px;align-items:center';
  var b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.style.cssText = 'flex:1;text-align:left;padding:8px 10px;border-radius:8px;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer';
  b.onmouseenter = function () { b.style.background = 'rgba(127,127,127,.18)'; };
  b.onmouseleave = function () { b.style.background = 'transparent'; };
  b.onclick = onClick;
  wrap.appendChild(b);
  if (onDelete) {
    var x = document.createElement('button');
    x.type = 'button';
    x.textContent = '×';
    x.title = 'Delete prompt';
    x.setAttribute('aria-label', 'Delete ' + label);
    x.style.cssText = 'width:28px;height:28px;border-radius:6px;border:0;background:transparent;color:inherit;cursor:pointer;opacity:.6';
    x.onclick = onDelete;
    wrap.appendChild(x);
  }
  return wrap;
}

function openPanel() {
  if (panel) return closePanel();
  panel = document.createElement('div');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Prompt library');
  panel.style.cssText = 'position:fixed;right:18px;bottom:156px;z-index:2147483646;width:260px;max-height:50vh;overflow:auto;padding:6px;' +
    'border-radius:12px;border:1px solid rgba(127,127,127,.35);background:rgba(24,24,27,.97);color:#fafafa;font:13px/1.4 system-ui,sans-serif;' +
    'box-shadow:0 12px 32px rgba(0,0,0,.3)';
  var list = prompts();
  list.forEach(function (p, i) {
    panel.appendChild(row(p.name, function () { insert(p.text); closePanel(); }, function () {
      var next = prompts().slice();
      next.splice(i, 1);
      GM_setValue('prompts', next);
      closePanel();
      openPanel();
    }));
  });
  panel.appendChild(row('+ Save a new prompt', function () {
    var name = window.prompt('Prompt name');
    if (!name) return;
    var text = window.prompt('Prompt text');
    if (!text) return;
    GM_setValue('prompts', prompts().concat([{ name: name, text: text }]));
    closePanel();
    openPanel();
  }));
  document.documentElement.appendChild(panel);
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closePanel();
});
floatButton('Prompts', 'Open prompt library', 114).addEventListener('click', openPanel);`,
  },
  {
    id: 'ai-token-counter',
    name: 'AI Prompt Word & Token Counter',
    description: 'Shows words, characters and an estimated token count while you type a prompt.',
    category: 'ai',
    sites: 'ChatGPT, Claude, Gemini and more',
    matches: AI_SITES,
    body: String.raw`
var badge = document.createElement('div');
badge.setAttribute('aria-live', 'polite');
badge.style.cssText = 'position:fixed;left:18px;bottom:18px;z-index:2147483646;padding:4px 10px;border-radius:999px;' +
  'background:rgba(24,24,27,.88);color:#e4e4e7;font:500 11px/1.4 system-ui,sans-serif;pointer-events:none;display:none';
document.documentElement.appendChild(badge);

function update(el) {
  var text = el.tagName === 'TEXTAREA' ? el.value : el.innerText;
  text = (text || '').trim();
  if (!text) { badge.style.display = 'none'; return; }
  var words = text.split(/\s+/).length;
  var tokens = Math.ceil(text.length / 4);
  badge.textContent = words + ' words · ' + text.length + ' chars · ~' + tokens + ' tokens';
  badge.style.display = 'block';
}

document.addEventListener('input', function (e) {
  var el = e.target;
  if (el && (el.tagName === 'TEXTAREA' || el.isContentEditable)) update(el);
}, true);`,
  },
  {
    id: 'code-copy-button',
    name: 'Copy Button for Code Blocks',
    description: 'Adds a one-click Copy button to every code block, great for AI answers, docs and blogs.',
    category: 'developer',
    sites: 'All sites',
    matches: ALL_SITES,
    body: String.raw`
function enhance(pre) {
  if (pre.dataset.opCopy) return;
  pre.dataset.opCopy = '1';
  if (getComputedStyle(pre).position === 'static') pre.style.position = 'relative';
  var b = document.createElement('button');
  b.type = 'button';
  b.textContent = 'Copy';
  b.setAttribute('aria-label', 'Copy code');
  b.style.cssText = 'position:absolute;top:6px;right:6px;z-index:5;padding:2px 8px;border-radius:6px;' +
    'border:1px solid rgba(127,127,127,.4);background:rgba(30,30,30,.85);color:#fff;font:12px system-ui,sans-serif;cursor:pointer';
  b.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    var text = Array.prototype.filter.call(pre.childNodes, function (n) { return n !== b; })
      .map(function (n) { return n.textContent; }).join('');
    navigator.clipboard.writeText(text).then(function () {
      b.textContent = 'Copied';
      setTimeout(function () { b.textContent = 'Copy'; }, 1200);
    });
  });
  pre.appendChild(b);
}

function scan() {
  document.querySelectorAll('pre').forEach(enhance);
}

var timer = 0;
new MutationObserver(function () {
  clearTimeout(timer);
  timer = setTimeout(scan, 300);
}).observe(document.body, { childList: true, subtree: true });
scan();`,
  },

  // ── Productivity ────────────────────────────────────────────
  {
    id: 'back-to-top',
    name: 'Back to Top Button',
    description: 'Shows a floating ↑ button after you scroll down a long page.',
    category: 'productivity',
    sites: 'All sites',
    matches: ALL_SITES,
    body: FLOAT_BUTTON + String.raw`
var btn = floatButton('↑ Top', 'Back to top', 18);
btn.style.display = 'none';
btn.addEventListener('click', function () {
  var smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
});
window.addEventListener('scroll', function () {
  btn.style.display = window.scrollY > 600 ? 'block' : 'none';
}, { passive: true });`,
  },
  {
    id: 'copy-markdown-link',
    name: 'Copy Page as Markdown',
    description:
      'Press Alt+Shift+M to copy the whole page (or your selection) as clean Markdown, or Alt+Shift+L for just a [Title](URL) link.',
    category: 'productivity',
    sites: 'All sites',
    matches: ALL_SITES,
    version: '1.2.0',
    body: TOAST + NOTE + String.raw`
var SKIP_TAGS = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|SVG|CANVAS|IFRAME|BUTTON|INPUT|SELECT|TEXTAREA|OPTION|DIALOG|VIDEO|AUDIO|OBJECT|EMBED|MAP|LINK|META)$/;
var SKIP_ALWAYS = 'nav, aside, [role="navigation"], [role="complementary"], [role="search"], [role="dialog"], [aria-modal="true"], .sr-only, .visually-hidden';
var SITE_CHROME = 'header, footer, [role="banner"], [role="contentinfo"]';
var BLOCK_TAGS = /^(DIV|SECTION|ARTICLE|MAIN|HEADER|FOOTER|FIGURE|DETAILS|SUMMARY|ADDRESS|DL|DD|FIELDSET|CENTER|HGROUP|BODY|FORM)$/;
var BLOCK_DISPLAY = /^(block|flex|grid|table|list-item|flow-root)/;

function flat(s) { return s.replace(/\s+/g, ' ').trim(); }
function block(s) { s = s.trim(); return s ? '\n\n' + s + '\n\n' : ''; }
function spaced(inner, md) { return (/^\s/.test(inner) ? ' ' : '') + md + (/\s$/.test(inner) ? ' ' : ''); }
function wrap(mark, inner) {
  var t = inner.trim();
  if (!t || /\n\n/.test(t)) return inner;
  return spaced(inner, mark + flat(t) + mark);
}
function styleOf(el) { return el.isConnected ? getComputedStyle(el) : null; }
function kids(el, ctx) {
  var out = '';
  for (var c = el.firstChild; c; c = c.nextSibling) out += convert(c, ctx);
  return out;
}
// aria-hidden marks icons and duplicated marquee copies, but also visible text whose parent carries the
// accessible name (<span aria-label="305+"><span aria-hidden="true">305+</span></span>); keep only that case.
function skipHidden(el) {
  if (el.getAttribute('aria-hidden') !== 'true') return false;
  var icon = /icon|material|glyph|emoji|\bfa\b|fa-/i.test(String(el.className)) || /^[a-z]+(?:_[a-z]+)+$/.test(el.textContent.trim());
  return icon || !(el.parentElement && el.parentElement.hasAttribute('aria-label'));
}

function convert(node, ctx) {
  if (node.nodeType === 3) return node.nodeValue.replace(/\s+/g, ' ');
  if (node.nodeType === 11) return kids(node, ctx);
  if (node.nodeType !== 1) return '';
  var out = convertElement(node, ctx);
  // Items laid out side by side in a flex or grid row have no whitespace between them in the HTML.
  return ctx.flex && out && !/^\n\n/.test(out) ? ' ' + out + ' ' : out;
}

function convertElement(el, parentCtx) {
  var tag = el.tagName.toUpperCase();
  if (SKIP_TAGS.test(tag) || el.matches(SKIP_ALWAYS) || skipHidden(el)) return '';
  if (!parentCtx.selection && el.matches(SITE_CHROME) && !el.closest('article, main, [role="main"]')) return '';
  var cs = styleOf(el);
  if (el.hidden || (cs && (cs.display === 'none' || cs.visibility === 'hidden'))) return '';
  var ctx = { selection: parentCtx.selection, flex: !!cs && /flex|grid/.test(cs.display) };

  var level = /^H([1-6])$/.exec(tag);
  if (level) {
    var heading = flat(kids(el, ctx));
    return heading ? block(new Array(+level[1] + 1).join('#') + ' ' + heading) : '';
  }
  switch (tag) {
    case 'P': return block(kids(el, ctx));
    case 'BR': return '\n';
    case 'HR': return block('---');
    case 'STRONG': case 'B': return wrap('**', kids(el, ctx));
    case 'EM': case 'I': case 'CITE': return wrap('_', kids(el, ctx));
    case 'DEL': case 'S': case 'STRIKE': return wrap('~~', kids(el, ctx));
    case 'CODE': case 'KBD': case 'SAMP': {
      var code = el.textContent.replace(/\s+/g, ' ');
      if (!code.trim()) return '';
      return code.indexOf('\x60') >= 0 ? '\x60\x60 ' + code + ' \x60\x60' : '\x60' + code + '\x60';
    }
    case 'PRE': {
      var codeEl = el.querySelector('code');
      var lang = (String((codeEl || el).className).match(/(?:language|lang)-([\w+#-]+)/) || [])[1] || '';
      var text = ((el.isConnected && el.innerText) || el.textContent).replace(/\n+$/, '');
      return text.trim() ? block('\x60\x60\x60' + lang + '\n' + text + '\n\x60\x60\x60') : '';
    }
    case 'A': return link(el, ctx);
    case 'IMG': return image(el);
    case 'UL': case 'OL': return block(list(el, ctx));
    case 'LI': return block('- ' + tidy(kids(el, ctx)).replace(/\n{2,}/g, '\n'));
    case 'BLOCKQUOTE': {
      var quote = tidy(kids(el, ctx));
      return quote ? block(quote.split('\n').map(function (l) { return l ? '> ' + l : '>'; }).join('\n')) : '';
    }
    case 'TABLE': return block(table(el, ctx));
    case 'DT': {
      var term = flat(kids(el, ctx));
      return term ? block('**' + term + '**') : '';
    }
    case 'FIGCAPTION': {
      var caption = flat(kids(el, ctx));
      return caption ? block('_' + caption + '_') : '';
    }
  }
  var inner = kids(el, ctx);
  var isBlock = cs ? BLOCK_DISPLAY.test(cs.display) : BLOCK_TAGS.test(tag);
  return isBlock ? block(inner) : inner;
}

function link(el, ctx) {
  var inner = kids(el, ctx);
  var href = el.getAttribute('href') || '';
  if (!href || href.charAt(0) === '#' || /^javascript:/i.test(href)) return inner;
  var url = el.href.replace(/\(/g, '%28').replace(/\)/g, '%29');
  if (/\n\n/.test(inner)) {
    // Card links wrap whole blocks; keep the card readable and link its heading instead.
    var card = tidy(inner);
    var heading = /^(#{1,6}) (.+)$/m.exec(card);
    if (heading) return block(card.replace(heading[0], heading[1] + ' [' + heading[2] + '](' + url + ')'));
  }
  var label = flat(inner.replace(/(^|\n)#{1,6} /g, '$1').replace(/\*\*/g, ''));
  if (!label) label = flat(el.getAttribute('aria-label') || el.title || '');
  if (!label) return '';
  var md = '[' + label + '](' + url + ')';
  return /\n\n/.test(inner) ? block(md) : spaced(inner, md);
}

function image(el) {
  var alt = flat(el.getAttribute('alt') || '');
  var src = el.currentSrc || el.src || '';
  if (!alt || !src || /^data:/i.test(src)) return '';
  if (el.isConnected && el.getBoundingClientRect().width < 40) return '';
  return '![' + alt + '](' + src + ')';
}

function list(el, ctx) {
  var ordered = el.tagName.toUpperCase() === 'OL';
  var n = parseInt(el.getAttribute('start') || '1', 10) || 1;
  var out = [];
  for (var li = el.firstElementChild; li; li = li.nextElementSibling) {
    if (li.tagName.toUpperCase() !== 'LI') continue;
    var cs = styleOf(li);
    if (li.hidden || (cs && cs.display === 'none')) continue;
    var text = tidy(kids(li, ctx)).replace(/\n{2,}/g, '\n');
    if (!text) continue;
    var marker = ordered ? n++ + '. ' : '- ';
    out.push(marker + text.split('\n').join('\n' + new Array(marker.length + 1).join(' ')));
  }
  return out.join('\n');
}

function table(el, ctx) {
  var rows = Array.prototype.filter.call(el.rows, function (r) {
    var cs = styleOf(r);
    return !(cs && cs.display === 'none');
  });
  if (!rows.length) return '';
  var grid = rows.map(function (r) {
    return Array.prototype.map.call(r.cells, function (c) { return flat(kids(c, ctx)).replace(/\|/g, '\\|'); });
  });
  var cols = Math.max.apply(null, grid.map(function (r) { return r.length; }));
  if (cols < 2) {
    return rows.map(function (r) { return r.cells[0] ? kids(r.cells[0], ctx) : ''; }).join('\n\n');
  }
  grid.forEach(function (r) { while (r.length < cols) r.push(''); });
  function line(r) { return '| ' + r.join(' | ') + ' |'; }
  var out = [line(grid[0]), '|' + new Array(cols + 1).join(' --- |')];
  for (var i = 1; i < grid.length; i++) out.push(line(grid[i]));
  return out.join('\n');
}

function tidy(md) {
  var out = [];
  var fence = false;
  var listy = false;
  md.replace(/\r/g, '').split('\n').forEach(function (line) {
    if (/^\s*\x60\x60\x60/.test(line)) { fence = !fence; listy = false; out.push(line.trim()); return; }
    if (fence) { out.push(line); return; }
    line = line.replace(/[ \t]+$/, '').replace(/(\S)[ \t]{2,}/g, '$1 ');
    if (!line.trim()) { listy = false; out.push(''); return; }
    var marker = /^\s*(?:[-*+]|\d+\.)\s/.test(line);
    if (!marker && !(listy && /^\s/.test(line))) line = line.replace(/^\s+/, '');
    listy = marker || (listy && /^\s/.test(line));
    out.push(line);
  });
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function pickRoot() {
  var body = document.body;
  if (!body) return document.documentElement;
  var total = (body.innerText || '').length;
  var best = null;
  var bestLen = 0;
  document.querySelectorAll('article, main, [role="main"]').forEach(function (c) {
    var len = (c.innerText || '').length;
    if (len > bestLen) { best = c; bestLen = len; }
  });
  return best && bestLen >= total * 0.3 ? best : body;
}

function selectionFragment() {
  var sel = window.getSelection();
  if (!sel || sel.isCollapsed || !String(sel).trim()) return null;
  var frag = document.createDocumentFragment();
  for (var i = 0; i < sel.rangeCount; i++) {
    var range = sel.getRangeAt(i);
    var part = range.cloneContents();
    // Selecting inside a list clones bare <li>s, so put them back in a list of the same kind.
    if (Array.prototype.some.call(part.children, function (c) { return c.tagName === 'LI'; })) {
      var anchor = range.commonAncestorContainer;
      var owner = (anchor.nodeType === 1 ? anchor : anchor.parentNode).closest('ol, ul');
      var listEl = document.createElement(owner ? owner.tagName : 'ul');
      listEl.appendChild(part);
      part = listEl;
    }
    frag.appendChild(part);
  }
  return frag;
}

function title() {
  return (document.title || '').replace(/[\[\]]/g, '').trim() || location.hostname;
}

function legacyCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:-1000px;left:0;opacity:0';
  document.documentElement.appendChild(ta);
  ta.select();
  var ok = false;
  try { ok = document.execCommand('copy'); } catch (e) {}
  ta.remove();
  if (!ok) throw new Error('Clipboard blocked');
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).catch(function () { legacyCopy(text); });
  }
  return new Promise(function (resolve) { legacyCopy(text); resolve(); });
}

function failed() {
  toast('Could not copy: this page blocked the clipboard');
  note('Copy failed because this page blocked clipboard access.');
}

function copyLink() {
  var md = '[' + title() + '](' + location.href + ')';
  copyText(md).then(function () {
    toast('Markdown link copied');
    note('Copied the link ' + md);
  }, failed);
}

function copyPage() {
  var frag = selectionFragment();
  var md = frag ? tidy(convert(frag, { selection: true })) : '';
  var fromSelection = !!md;
  if (!md) md = tidy(convert(pickRoot(), { selection: false }));
  if (!md) {
    toast('Nothing to copy on this page');
    note('Found no readable text to copy on this page.');
    return;
  }
  if (!fromSelection) {
    if (!/^# /m.test(md)) md = '# ' + title() + '\n\n' + md;
    md += '\n\n---\n\nSource: ' + location.href;
  }
  var words = (md.match(/[\p{L}\p{N}]+/gu) || []).length.toLocaleString();
  var what = fromSelection ? 'selection' : 'page';
  copyText(md).then(function () {
    toast('Copied ' + what + ' as Markdown · ' + words + ' words');
    note('Copied the ' + what + ' as Markdown: ' + words + ' words, ' + md.length.toLocaleString() + ' characters.');
  }, failed);
}

// Not Alt+Shift+C: that is the extension's Color picker shortcut, which Chrome handles before the page.
document.addEventListener('keydown', function (e) {
  if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey || e.repeat) return;
  if (e.code === 'KeyM') { e.preventDefault(); copyPage(); }
  else if (e.code === 'KeyL') { e.preventDefault(); copyLink(); }
}, true);

note('Ready. Press Alt+Shift+M to copy this page as Markdown, or Alt+Shift+L for just the link.');`,
  },
  {
    id: 'external-links-new-tab',
    name: 'Open External Links in New Tab',
    description: 'Links that leave the current site open in a new tab, so you never lose your place.',
    category: 'productivity',
    sites: 'All sites',
    matches: ALL_SITES,
    body: String.raw`
document.addEventListener('click', function (e) {
  if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  var a = e.target instanceof Element ? e.target.closest('a[href]') : null;
  if (!a || a.target) return;
  var url;
  try { url = new URL(a.href, location.href); } catch (err) { return; }
  if (!/^https?:$/.test(url.protocol) || url.hostname === location.hostname) return;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
}, true);`,
  },
  {
    id: 'no-leave-prompts',
    name: 'Block "Leave Site?" Prompts',
    description: 'Stops pages from showing "Changes you made may not be saved" dialogs when you close or leave them.',
    category: 'productivity',
    sites: 'All sites',
    matches: ALL_SITES,
    runAt: 'document-start',
    enabledByDefault: false,
    body: String.raw`
var add = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (type, listener, options) {
  if (type === 'beforeunload') return;
  return add.call(this, type, listener, options);
};
Object.defineProperty(window, 'onbeforeunload', {
  configurable: true,
  get: function () { return null; },
  set: function () {}
});`,
  },
  {
    id: 'enable-copy',
    name: 'Allow Copy, Select & Right-Click',
    description: 'Re-enables text selection, copying and the right-click menu on sites that block them.',
    category: 'productivity',
    sites: 'All sites',
    matches: ALL_SITES,
    runAt: 'document-start',
    enabledByDefault: false,
    body: ADD_STYLE + String.raw`
['copy', 'cut', 'paste', 'selectstart', 'contextmenu', 'dragstart'].forEach(function (type) {
  window.addEventListener(type, function (e) { e.stopImmediatePropagation(); }, true);
});
addStyle('*, *::before, *::after { -webkit-user-select: text !important; user-select: text !important; }');`,
  },
  {
    id: 'password-reveal',
    name: 'Reveal Password on Double-Click',
    description: 'Double-click any password field to show or hide what you typed.',
    category: 'productivity',
    sites: 'All sites',
    matches: ALL_SITES,
    body: String.raw`
document.addEventListener('dblclick', function (e) {
  var el = e.target;
  if (!(el instanceof HTMLInputElement)) return;
  if (el.type === 'password') { el.type = 'text'; el.dataset.opRevealed = '1'; }
  else if (el.dataset.opRevealed) { el.type = 'password'; delete el.dataset.opRevealed; }
}, true);`,
  },

  // ── Reading ─────────────────────────────────────────────────
  {
    id: 'dark-mode-everywhere',
    name: 'Dark Mode Everywhere',
    description:
      'Turns every site dark as it loads and leaves sites that already have a dark theme alone. Press Alt+Shift+D to switch it off or on for a site.',
    category: 'reading',
    sites: 'All sites',
    matches: ALL_SITES,
    grants: ['GM_getValue', 'GM_setValue'],
    runAt: 'document-start',
    version: '1.1.0',
    body: TOAST + NOTE + String.raw`
var host = location.hostname;
var KEY = 'site:' + host;
var legacy = GM_getValue('dark:' + host, null);
// 'auto' darkens unless the site is already dark; 'on' and 'off' are the user's choice for this site.
var pref = GM_getValue(KEY, legacy === true ? 'on' : 'auto');
var style = null;

function apply(on) {
  if (on && !style) {
    style = document.createElement('style');
    style.textContent = 'html { filter: invert(1) hue-rotate(180deg) !important; background: #fff !important; }' +
      'img, video, picture, canvas, iframe, embed, object, [style*="background-image"] { filter: invert(1) hue-rotate(180deg) !important; }';
    document.documentElement.appendChild(style);
  } else if (!on && style) {
    style.remove();
    style = null;
  }
}

function luminance(color) {
  var m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,\/]\s*([\d.]+)(%?))?/.exec(color || '');
  if (!m) return null;
  var alpha = m[4] === undefined ? 1 : parseFloat(m[4]) / (m[5] ? 100 : 1);
  if (alpha < 0.5) return null;
  var c = [m[1], m[2], m[3]].map(function (v) {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

// Samples the page-wide background under a grid of points, so a dark wrapper inside a white body counts as
// dark while light cards, buttons and image panels on a dark page don't.
function pageIsDark() {
  var root = document.documentElement;
  var minWidth = innerWidth * 0.6;
  var dark = 0;
  var light = 0;
  for (var y = 1; y <= 4; y++) {
    for (var x = 1; x <= 4; x++) {
      var hits = document.elementsFromPoint ? document.elementsFromPoint(innerWidth * x / 5, innerHeight * y / 5) : [];
      var stack = hits.concat([document.body, root]);
      for (var i = 0; i < stack.length; i++) {
        var el = stack[i];
        if (!el || (el !== document.body && el !== root && el.getBoundingClientRect().width < minWidth)) continue;
        var l = luminance(getComputedStyle(el).backgroundColor);
        if (l === null) continue;
        if (l < 0.18) dark++; else light++;
        break;
      }
    }
  }
  if (dark !== light) return dark > light;
  var text = luminance(getComputedStyle(document.body).color);
  return text !== null && text > 0.5;
}

function autoCheck() {
  if (pref !== 'auto' || !style || !document.body) return;
  if (pageIsDark()) {
    apply(false);
    note(host + ' already has a dark theme, so it was left as is. Press Alt+Shift+D to force dark mode here.');
  }
}

if (pref === 'off') {
  note('Off for ' + host + ' because you switched it off. Press Alt+Shift+D to turn it back on.');
} else {
  apply(true);
  note('Dark mode is on for ' + host + '. Press Alt+Shift+D to switch it off for this site.');
  if (pref === 'auto') {
    document.addEventListener('DOMContentLoaded', autoCheck, { once: true });
    window.addEventListener('load', autoCheck, { once: true });
  }
}

document.addEventListener('keydown', function (e) {
  if (!(e.altKey && e.shiftKey && e.code === 'KeyD') || e.ctrlKey || e.metaKey || e.repeat) return;
  e.preventDefault();
  pref = style ? 'off' : 'on';
  GM_setValue(KEY, pref);
  apply(pref === 'on');
  toast(pref === 'on' ? 'Dark mode on for ' + host : 'Dark mode off for ' + host);
  note(pref === 'on'
    ? 'Dark mode is on for ' + host + ' (you turned it on). Press Alt+Shift+D to switch it off.'
    : 'Off for ' + host + ' because you switched it off. Press Alt+Shift+D to turn it back on.');
}, true);`,
  },
  {
    id: 'reading-progress',
    name: 'Reading Progress Bar',
    description: 'A thin bar at the top of the page shows how far you have read.',
    category: 'reading',
    sites: 'All sites',
    matches: ALL_SITES,
    body: String.raw`
var bar = document.createElement('div');
bar.setAttribute('aria-hidden', 'true');
bar.style.cssText = 'position:fixed;top:0;left:0;right:0;height:3px;z-index:2147483647;transform-origin:0 50%;' +
  'transform:scaleX(0);background:linear-gradient(90deg,#6366f1,#22d3ee);pointer-events:none;transition:transform .1s linear';
document.documentElement.appendChild(bar);

function update() {
  var max = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
}
window.addEventListener('scroll', update, { passive: true });
window.addEventListener('resize', update);
update();`,
  },
  {
    id: 'selection-word-count',
    name: 'Selection Word Counter',
    description: 'Shows the word and character count of any text you select.',
    category: 'reading',
    sites: 'All sites',
    matches: ALL_SITES,
    body: String.raw`
var pill = document.createElement('div');
pill.style.cssText = 'position:fixed;right:18px;top:18px;z-index:2147483647;padding:4px 10px;border-radius:999px;' +
  'background:rgba(24,24,27,.9);color:#fafafa;font:500 11px/1.4 system-ui,sans-serif;pointer-events:none;display:none';
document.documentElement.appendChild(pill);

var timer = 0;
document.addEventListener('selectionchange', function () {
  clearTimeout(timer);
  timer = setTimeout(function () {
    var text = String(window.getSelection() || '').trim();
    if (!text) { pill.style.display = 'none'; return; }
    pill.textContent = text.split(/\s+/).length + ' words · ' + text.length + ' chars';
    pill.style.display = 'block';
  }, 150);
});`,
  },
  {
    id: 'wikipedia-reader',
    name: 'Wikipedia Comfortable Reader',
    description: 'Hides donation banners and gives Wikipedia articles larger, easier-to-read text.',
    category: 'reading',
    sites: 'Wikipedia',
    matches: ['https://*.wikipedia.org/*'],
    runAt: 'document-start',
    body: ADD_STYLE + String.raw`
addStyle([
  '#siteNotice, #centralNotice, .cn-fundraising, .frb, .wmde-banner { display: none !important; }',
  '.mw-body-content { font-size: 1.06rem !important; line-height: 1.75 !important; }',
  '.mw-body-content p { max-width: 75ch; }'
].join('\n'));`,
  },
  {
    id: 'hn-dark',
    name: 'Hacker News Dark & Wide',
    description: 'A dark theme and full-width layout for Hacker News.',
    category: 'reading',
    sites: 'Hacker News',
    matches: ['https://news.ycombinator.com/*'],
    runAt: 'document-start',
    body: ADD_STYLE + String.raw`
addStyle([
  'html, body { background: #18181b !important; }',
  '#hnmain { width: 100% !important; max-width: 1200px; background: #1f1f23 !important; }',
  'td, .commtext, .comment { color: #d4d4d8 !important; }',
  'a:link, .titleline > a { color: #f4f4f5 !important; }',
  'a:visited, .titleline > a:visited { color: #a1a1aa !important; }',
  '.subtext, .subtext a, .comhead, .comhead a, .sitestr, .age a, .rank { color: #8b8b94 !important; }',
  '#hnmain > tbody > tr:first-child > td { background: #ff6600 !important; }',
  'input, textarea { background: #27272a !important; color: #f4f4f5 !important; border: 1px solid #3f3f46 !important; }'
].join('\n'));`,
  },

  // ── Video ───────────────────────────────────────────────────
  {
    id: 'youtube-hide-shorts',
    name: 'YouTube: Hide Shorts',
    description: 'Removes Shorts shelves, the Shorts tab and Shorts videos from YouTube feeds and search.',
    category: 'video',
    sites: 'YouTube',
    matches: ['https://www.youtube.com/*'],
    runAt: 'document-start',
    body: ADD_STYLE + String.raw`
addStyle([
  'ytd-reel-shelf-renderer, ytd-rich-shelf-renderer[is-shorts], grid-shelf-view-model,',
  'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),',
  'ytd-guide-entry-renderer:has(a[title="Shorts"]), ytd-mini-guide-entry-renderer[aria-label="Shorts"],',
  'ytd-video-renderer:has(a[href^="/shorts/"]), ytd-grid-video-renderer:has(a[href^="/shorts/"]),',
  'ytd-rich-item-renderer:has(a[href^="/shorts/"]), yt-chip-cloud-chip-renderer:has([title="Shorts"]) {',
  '  display: none !important;',
  '}'
].join('\n'));`,
  },
  {
    id: 'youtube-focus',
    name: 'YouTube Focus Mode',
    description: 'Hides the home feed, recommendations, comments and end-screen cards so you watch only what you came for.',
    category: 'video',
    sites: 'YouTube',
    matches: ['https://www.youtube.com/*'],
    runAt: 'document-start',
    enabledByDefault: false,
    body: ADD_STYLE + String.raw`
addStyle([
  'ytd-browse[page-subtype="home"] #contents, ytd-browse[page-subtype="home"] #chips-wrapper,',
  'ytd-watch-flexy #secondary, ytd-watch-flexy #comments, .ytp-endscreen-content, .ytp-ce-element {',
  '  display: none !important;',
  '}'
].join('\n'));`,
  },
  {
    id: 'youtube-auto-hd',
    name: 'YouTube Auto HD',
    description: 'Picks 1080p (or the best available below it) automatically for every YouTube video.',
    category: 'video',
    sites: 'YouTube',
    matches: ['https://www.youtube.com/*'],
    body: String.raw`
var TARGET = 'hd1080';
var ORDER = ['highres', 'hd2880', 'hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny'];

function apply() {
  var player = document.getElementById('movie_player');
  if (!player || typeof player.getAvailableQualityLevels !== 'function') return false;
  var levels = player.getAvailableQualityLevels() || [];
  if (!levels.length) return false;
  var limit = ORDER.indexOf(TARGET);
  var pick = levels.filter(function (l) { return ORDER.indexOf(l) >= limit; })[0] || levels[levels.length - 1];
  if (typeof player.setPlaybackQualityRange === 'function') player.setPlaybackQualityRange(pick, pick);
  if (typeof player.setPlaybackQuality === 'function') player.setPlaybackQuality(pick);
  return true;
}

function retry() {
  var tries = 0;
  var id = setInterval(function () {
    if (apply() || ++tries > 20) clearInterval(id);
  }, 500);
}

window.addEventListener('yt-navigate-finish', retry);
retry();`,
  },
  {
    id: 'video-speed',
    name: 'Video Speed Controller',
    description: 'Control any HTML5 video: S slower, D faster, R reset to 1×. Works on most video sites.',
    category: 'video',
    sites: 'All sites',
    matches: ALL_SITES,
    body: TOAST + IS_TYPING + String.raw`
function activeVideo() {
  var videos = Array.prototype.slice.call(document.querySelectorAll('video'));
  var playing = videos.filter(function (v) { return !v.paused; });
  var pool = playing.length ? playing : videos;
  return pool.sort(function (a, b) { return b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight; })[0];
}

document.addEventListener('keydown', function (e) {
  if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
  var key = e.key.toLowerCase();
  if (key !== 's' && key !== 'd' && key !== 'r') return;
  var v = activeVideo();
  if (!v) return;
  e.preventDefault();
  e.stopPropagation();
  var rate = key === 'r' ? 1 : Math.min(16, Math.max(0.1, v.playbackRate + (key === 'd' ? 0.25 : -0.25)));
  v.playbackRate = Math.round(rate * 100) / 100;
  toast(v.playbackRate + '×');
}, true);`,
  },
  {
    id: 'pip-shortcut',
    name: 'Picture-in-Picture Shortcut',
    description: 'Press Alt+P to pop the main video out into a floating window, even where the site hides the button.',
    category: 'video',
    sites: 'All sites',
    matches: ALL_SITES,
    body: String.raw`
document.addEventListener('keydown', function (e) {
  if (!(e.altKey && e.code === 'KeyP')) return;
  e.preventDefault();
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture();
    return;
  }
  var videos = Array.prototype.slice.call(document.querySelectorAll('video'));
  var v = videos.sort(function (a, b) { return b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight; })[0];
  if (!v) return;
  v.removeAttribute('disablepictureinpicture');
  v.requestPictureInPicture().catch(function () {});
});`,
  },
  {
    id: 'no-autoplay',
    name: 'Stop Autoplaying Videos',
    description: 'Pauses videos that start on their own until you click or press a key on the page.',
    category: 'video',
    sites: 'All sites',
    matches: ALL_SITES,
    runAt: 'document-start',
    enabledByDefault: false,
    body: String.raw`
var interacted = false;
['pointerdown', 'keydown', 'touchstart'].forEach(function (type) {
  window.addEventListener(type, function () { interacted = true; }, true);
});
document.addEventListener('play', function (e) {
  var media = e.target;
  if (!interacted && media instanceof HTMLMediaElement) media.pause();
}, true);`,
  },

  // ── Privacy ─────────────────────────────────────────────────
  {
    id: 'clean-url-params',
    name: 'Remove Tracking Parameters',
    description: 'Strips utm_*, fbclid, gclid and similar tracking tags from the address bar and from links you click.',
    category: 'privacy',
    sites: 'All sites',
    matches: ALL_SITES,
    runAt: 'document-start',
    body: String.raw`
var PARAMS = /^(utm_[a-z_]+|fbclid|gclid|dclid|gbraid|wbraid|msclkid|mc_cid|mc_eid|igshid|yclid|_hsenc|_hsmi|ref_src|oly_anon_id|oly_enc_id|vero_id|mkt_tok)$/i;

function clean(href) {
  var url;
  try { url = new URL(href, location.href); } catch (e) { return href; }
  var keys = [];
  url.searchParams.forEach(function (_, key) { if (PARAMS.test(key)) keys.push(key); });
  if (!keys.length) return href;
  keys.forEach(function (key) { url.searchParams.delete(key); });
  return url.toString();
}

var current = clean(location.href);
if (current !== location.href) history.replaceState(history.state, '', current);

document.addEventListener('click', function (e) {
  var a = e.target instanceof Element ? e.target.closest('a[href]') : null;
  if (a) {
    var next = clean(a.href);
    if (next !== a.href) a.href = next;
  }
}, true);`,
  },
  {
    id: 'google-clean-links',
    name: 'Google: Direct Result Links',
    description: 'Makes Google search results link straight to the site, without redirect or click-tracking pings.',
    category: 'privacy',
    sites: 'Google Search',
    matches: [
      'https://www.google.com/*',
      'https://www.google.co.uk/*',
      'https://www.google.co.in/*',
      'https://www.google.ca/*',
      'https://www.google.com.au/*',
      'https://www.google.de/*',
    ],
    body: String.raw`
function fix(a) {
  a.removeAttribute('ping');
  a.removeAttribute('onmousedown');
  var href = a.getAttribute('href') || '';
  if (href.indexOf('/url?') === 0) {
    var real = new URL(href, location.origin).searchParams;
    var target = real.get('q') || real.get('url');
    if (target && /^https?:/.test(target)) a.href = target;
  }
}

function scan() {
  document.querySelectorAll('a[ping], a[href^="/url?"], a[onmousedown]').forEach(fix);
}

new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
scan();`,
  },

  // ── Developer ───────────────────────────────────────────────
  {
    id: 'json-viewer',
    name: 'JSON Pretty Viewer',
    description:
      'Formats raw JSON responses (API URLs, .json files) with colours, Raw/Pretty and Copy buttons. Other pages are left untouched.',
    category: 'developer',
    sites: 'All sites',
    matches: ALL_SITES,
    runAt: 'document-end',
    version: '1.1.0',
    body: NOTE + String.raw`
var body = document.body;
var source = body ? body.querySelector(':scope > pre') : null;
var raw = source ? source.textContent || '' : '';
// Chrome adds its own "Pretty-print" container next to the <pre> on JSON responses.
var extras = body ? Array.prototype.filter.call(body.children, function (el) {
  return el !== source && !el.classList.contains('json-formatter-container');
}).length : 1;
var looksJson = /json/i.test(document.contentType || '') || (source && extras === 0 && /^\s*[\[{]/.test(raw));
if (!source || !looksJson) {
  note('Nothing to format here: this page is not a raw JSON response. Open a JSON file or API URL, such as https://api.github.com, to see the viewer.');
  return;
}

var data;
try { data = JSON.parse(raw); } catch (e) {
  note('This looks like JSON but is not valid (' + e.message + '), so it was left as is.');
  return;
}
var pretty = JSON.stringify(data, null, 2);

function size(n) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB'; }
function describe(v) {
  if (Array.isArray(v)) return 'Array of ' + v.length.toLocaleString() + (v.length === 1 ? ' item' : ' items');
  if (v && typeof v === 'object') {
    var keys = Object.keys(v).length;
    return 'Object with ' + keys.toLocaleString() + (keys === 1 ? ' key' : ' keys');
  }
  return typeof v;
}
function escapeHtml(s) {
  return s.replace(/[&<>]/g, function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'; });
}
function highlight(json) {
  return escapeHtml(json).replace(/("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, function (m, str, colon, lit) {
    if (str) return '<span class="' + (colon ? 'k' : 's') + '">' + str + '</span>' + (colon || '');
    return '<span class="' + (lit ? 'l' : 'n') + '">' + m + '</span>';
  });
}

var css = document.createElement('style');
css.textContent = [
  '#op-json-bar{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:8px;padding:8px 16px;font:12px/1.4 system-ui,sans-serif;background:rgba(127,127,127,.12);backdrop-filter:blur(8px);border-bottom:1px solid rgba(127,127,127,.2)}',
  '#op-json-bar button{padding:4px 10px;border-radius:6px;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;font:inherit;cursor:pointer}',
  '#op-json-bar button:hover{background:rgba(127,127,127,.15)}',
  '#op-json-bar span{margin-left:auto;opacity:.7}',
  '#op-json{margin:0;padding:16px;font:13px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;word-break:break-word;tab-size:2}',
  '#op-json .k{color:#0550ae}#op-json .s{color:#116329}#op-json .n{color:#b35900}#op-json .l{color:#8250df}',
  '@media (prefers-color-scheme: dark){html{background:#0d1117;color:#e6edf3}#op-json .k{color:#79c0ff}#op-json .s{color:#7ee787}#op-json .n{color:#ffa657}#op-json .l{color:#d2a8ff}}'
].join('\n');
(document.head || document.documentElement).appendChild(css);

var view = document.createElement('pre');
view.id = 'op-json';
var colours = raw.length < 2000000;
function render(showPretty) {
  if (!showPretty) view.textContent = raw;
  else if (colours) view.innerHTML = highlight(pretty);
  else view.textContent = pretty;
}

var bar = document.createElement('div');
bar.id = 'op-json-bar';
function button(label, onClick) {
  var b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.onclick = onClick;
  bar.appendChild(b);
  return b;
}
var showingPretty = true;
var toggle = button('Raw', function () {
  showingPretty = !showingPretty;
  render(showingPretty);
  toggle.textContent = showingPretty ? 'Raw' : 'Pretty';
});
var copy = button('Copy', function () {
  navigator.clipboard.writeText(showingPretty ? pretty : raw).then(function () {
    copy.textContent = 'Copied';
    setTimeout(function () { copy.textContent = 'Copy'; }, 1200);
  });
});
var info = document.createElement('span');
info.textContent = describe(data) + ' · ' + size(raw.length);
bar.appendChild(info);

Array.prototype.forEach.call(body.children, function (el) { el.style.display = 'none'; });
render(true);
body.appendChild(bar);
body.appendChild(view);
note('Formatted this JSON response: ' + describe(data).toLowerCase() + ', ' + size(raw.length) + '. Use Raw/Pretty and Copy at the top of the page.');`,
  },
  {
    id: 'outline-debugger',
    name: 'CSS Layout Outliner',
    description: 'Press Alt+Shift+O to outline every element on the page, handy for debugging layouts.',
    category: 'developer',
    sites: 'All sites',
    matches: ALL_SITES,
    body: ADD_STYLE + TOAST + String.raw`
var style = null;
document.addEventListener('keydown', function (e) {
  if (!(e.altKey && e.shiftKey && e.code === 'KeyO')) return;
  e.preventDefault();
  if (style) {
    style.remove();
    style = null;
    toast('Outlines off');
  } else {
    style = addStyle('* { outline: 1px solid rgba(255, 64, 129, .45) !important; outline-offset: -1px !important; }');
    toast('Outlines on');
  }
});`,
  },
  {
    id: 'stackoverflow-focus',
    name: 'Stack Overflow Focus',
    description: 'Hides Hot Network Questions, promos and cookie banners, and highlights the accepted answer.',
    category: 'developer',
    sites: 'Stack Overflow & Stack Exchange',
    matches: [
      'https://stackoverflow.com/*',
      'https://*.stackexchange.com/*',
      'https://superuser.com/*',
      'https://serverfault.com/*',
      'https://askubuntu.com/*',
    ],
    runAt: 'document-start',
    body: ADD_STYLE + String.raw`
addStyle([
  '#hot-network-questions, .s-sidebarwidget--yellow, .js-consent-banner, #onetrust-consent-sdk, .js-announcement-banner { display: none !important; }',
  '.accepted-answer { border-left: 4px solid #22c55e !important; padding-left: 12px !important; }'
].join('\n'));`,
  },
  {
    id: 'github-wide',
    name: 'GitHub Full-Width Code',
    description: 'Lets GitHub file views, diffs and READMEs use the full window width.',
    category: 'developer',
    sites: 'GitHub',
    matches: ['https://github.com/*'],
    runAt: 'document-start',
    body: ADD_STYLE + String.raw`
addStyle([
  '.container-xl, .container-lg, .application-main .container-xl, .Layout.Layout--flowRow-until-md { max-width: none !important; }',
  '.repository-content, .markdown-body { max-width: none !important; }'
].join('\n'));`,
  },

  // ── Social ──────────────────────────────────────────────────
  {
    id: 'reddit-old',
    name: 'Reddit: Always Use Old Reddit',
    description: 'Redirects www.reddit.com to the faster, compact old.reddit.com layout.',
    category: 'social',
    sites: 'Reddit',
    matches: ['https://www.reddit.com/*'],
    runAt: 'document-start',
    enabledByDefault: false,
    body: String.raw`
var SKIP = /^\/(media|mod|poll|settings|topics|community-points|appeals|notifications)(\/|$)/;
if (!SKIP.test(location.pathname)) {
  location.replace('https://old.reddit.com' + location.pathname + location.search + location.hash);
}`,
  },
  {
    id: 'x-declutter',
    name: 'X (Twitter): Declutter Sidebar',
    description: 'Hides Trending, Who to follow and Premium upsells from the X sidebar.',
    category: 'social',
    sites: 'X / Twitter',
    matches: ['https://x.com/*', 'https://twitter.com/*'],
    runAt: 'document-start',
    body: ADD_STYLE + String.raw`
addStyle([
  '[aria-label="Timeline: Trending now"], [aria-label="Who to follow"],',
  '[data-testid="sidebarColumn"] section:has([aria-label="Who to follow"]),',
  '[data-testid="sidebarColumn"] div:has(> a[href="/i/premium_sign_up"]), aside[aria-label="Subscribe to Premium"] {',
  '  display: none !important;',
  '}'
].join('\n'));`,
  },
]

export const GALLERY_SCRIPTS: GalleryScript[] = SPECS.map(build)

export function galleryInstallUrl(id: string): string {
  return `${GALLERY_INSTALL_PREFIX}${id}`
}
