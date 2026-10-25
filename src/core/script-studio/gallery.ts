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
    '// @version      1.0.0',
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
    name: 'Copy Page as Markdown Link',
    description: 'Press Alt+Shift+C to copy the current page as [Title](URL) for notes and chats.',
    category: 'productivity',
    sites: 'All sites',
    matches: ALL_SITES,
    body: TOAST + String.raw`
document.addEventListener('keydown', function (e) {
  if (!(e.altKey && e.shiftKey && e.code === 'KeyC')) return;
  e.preventDefault();
  var title = document.title.replace(/[\[\]]/g, '').trim() || location.hostname;
  navigator.clipboard.writeText('[' + title + '](' + location.href + ')').then(function () {
    toast('Markdown link copied');
  });
});`,
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
    description: 'Press Alt+Shift+D to switch any site to dark mode. Remembered per site.',
    category: 'reading',
    sites: 'All sites',
    matches: ALL_SITES,
    grants: ['GM_getValue', 'GM_setValue'],
    runAt: 'document-start',
    body: String.raw`
var KEY = 'dark:' + location.hostname;
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

apply(GM_getValue(KEY, false));
document.addEventListener('keydown', function (e) {
  if (!(e.altKey && e.shiftKey && e.code === 'KeyD')) return;
  e.preventDefault();
  var next = !style;
  GM_setValue(KEY, next);
  apply(next);
});`,
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
    description: 'Formats raw JSON responses with indentation, plus Raw/Pretty and Copy buttons.',
    category: 'developer',
    sites: 'All sites',
    matches: ALL_SITES,
    runAt: 'document-end',
    body: String.raw`
var pre = document.body && document.body.children.length === 1 ? document.body.querySelector(':scope > pre') : null;
var looksJson = /json/i.test(document.contentType || '') || (pre && /^\s*[\[{]/.test(pre.textContent || ''));
if (!pre || !looksJson) return;

var raw = pre.textContent || '';
var pretty;
try { pretty = JSON.stringify(JSON.parse(raw), null, 2); } catch (e) { return; }

pre.textContent = pretty;
pre.style.cssText = 'font:13px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;padding:16px;margin:0;white-space:pre-wrap;word-break:break-word';

var bar = document.createElement('div');
bar.style.cssText = 'position:sticky;top:0;display:flex;gap:8px;padding:8px 16px;background:rgba(127,127,127,.12);backdrop-filter:blur(6px)';
function button(label, onClick) {
  var b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.style.cssText = 'padding:4px 10px;border-radius:6px;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;font:12px system-ui,sans-serif;cursor:pointer';
  b.onclick = onClick;
  bar.appendChild(b);
  return b;
}
var showingPretty = true;
var toggle = button('Raw', function () {
  showingPretty = !showingPretty;
  pre.textContent = showingPretty ? pretty : raw;
  toggle.textContent = showingPretty ? 'Raw' : 'Pretty';
});
var copy = button('Copy', function () {
  navigator.clipboard.writeText(pre.textContent || '').then(function () {
    copy.textContent = 'Copied';
    setTimeout(function () { copy.textContent = 'Copy'; }, 1200);
  });
});
document.body.insertBefore(bar, pre);`,
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
