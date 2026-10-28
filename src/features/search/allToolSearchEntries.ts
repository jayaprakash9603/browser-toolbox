import type { ToolSearchEntry } from '@/core/registry'
import { TOOLS as PDF_TOOLS } from '@/tools/files/pdf-toolkit/toolList'

function tab(
  id: string,
  labelKey: string,
  fallback: string,
  tab: string,
  extra?: Record<string, string>,
): ToolSearchEntry {
  return {
    id,
    labelKey,
    fallbackLabel: fallback,
    params: { tab, ...extra },
  }
}

function focus(
  id: string,
  labelKey: string,
  fallback: string,
  focus: string,
  keywords?: string[],
): ToolSearchEntry {
  return { id, labelKey, fallbackLabel: fallback, keywords, params: { focus } }
}

export const TOOL_SEARCH_ENTRIES: Record<string, ToolSearchEntry[]> = {
  'developer.json-toolkit': [
    tab('format', 'dev.tabFormat', 'Format', 'format'),
    {
      id: 'validate',
      labelKey: 'dev.tabValidate',
      fallbackLabel: 'Validate',
      aliases: ['validate json', 'json validator'],
      params: { tab: 'validate' },
    },
    tab('tree', 'dev.tabTree', 'Tree', 'tree'),
    tab('path', 'dev.tabPath', 'JSON Path', 'path', undefined),
    tab('convert', 'dev.tabConvert', 'Convert', 'convert'),
    {
      id: 'convert-csv',
      labelKey: 'dev.convert.csv',
      fallbackLabel: 'JSON to CSV',
      params: { tab: 'convert', target: 'csv' },
    },
    {
      id: 'convert-xml',
      labelKey: 'dev.convert.xml',
      fallbackLabel: 'JSON to XML',
      params: { tab: 'convert', target: 'xml' },
    },
    {
      id: 'convert-ts',
      labelKey: 'dev.convert.ts',
      fallbackLabel: 'JSON to TypeScript',
      params: { tab: 'convert', target: 'ts' },
    },
    {
      id: 'convert-markdown',
      labelKey: 'dev.convert.markdown',
      fallbackLabel: 'JSON to Markdown',
      params: { tab: 'convert', target: 'markdown' },
    },
  ],
  'developer.yaml-toolkit': [
    tab('validate', 'dev.tabValidate', 'Validate', 'validate'),
    {
      id: 'convert',
      labelKey: 'dev.yamlToJson',
      fallbackLabel: 'YAML to JSON',
      params: { tab: 'convert' },
    },
    {
      id: 'fromJson',
      labelKey: 'dev.jsonToYaml',
      fallbackLabel: 'JSON to YAML',
      params: { tab: 'fromJson' },
    },
  ],
  'developer.xml-toolkit': [
    tab('format', 'dev.tabFormat', 'Format', 'format'),
    tab('validate', 'dev.tabValidate', 'Validate', 'validate'),
    {
      id: 'convert',
      labelKey: 'dev.tabConvertJson',
      fallbackLabel: 'XML to JSON',
      params: { tab: 'convert' },
    },
  ],
  'developer.sql-toolkit': [
    tab('format', 'dev.tabFormat', 'Format', 'format'),
    { id: 'minify', labelKey: 'text.minify', fallbackLabel: 'Minify', params: { tab: 'minify' } },
  ],
  'developer.regex-toolkit': [
    tab('test', 'dev.tabTest', 'Test', 'test'),
    tab('replace', 'dev.tabReplace', 'Replace', 'replace'),
    tab('library', 'dev.tabLibrary', 'Library', 'library'),
  ],
  'developer.id-toolkit': [
    tab('generate', 'dev.tabGenerate', 'Generate', 'generate'),
    tab('validate', 'dev.tabValidate', 'Validate', 'validate'),
    {
      id: 'uuid-v4',
      labelKey: 'dev.uuidV4',
      fallbackLabel: 'UUID v4',
      params: { tab: 'generate', kind: 'uuid-v4' },
    },
    {
      id: 'uuid-v7',
      labelKey: 'dev.uuidV7',
      fallbackLabel: 'UUID v7',
      params: { tab: 'generate', kind: 'uuid-v7' },
    },
    {
      id: 'nanoid',
      labelKey: 'dev.nanoid',
      fallbackLabel: 'NanoID',
      params: { tab: 'generate', kind: 'nanoid' },
    },
  ],
  'datetime.toolkit': [
    tab('timestamp', 'dt.tabTimestamp', 'Timestamp', 'timestamp'),
    tab('calc', 'dt.tabCalc', 'Calculator', 'calc'),
    tab('zones', 'dt.tabZones', 'Time zones', 'zones'),
    { id: 'cron', labelKey: 'dt.tabCron', fallbackLabel: 'Cron', params: { tab: 'cron' } },
    {
      id: 'toDate',
      labelKey: 'dev.tabToDate',
      fallbackLabel: 'Timestamp to date',
      params: { tab: 'timestamp', subtab: 'toDate' },
    },
    {
      id: 'toTimestamp',
      labelKey: 'dev.tabToTimestamp',
      fallbackLabel: 'Date to timestamp',
      params: { tab: 'timestamp', subtab: 'toTimestamp' },
    },
    {
      id: 'now',
      labelKey: 'dev.tabNow',
      fallbackLabel: 'Now',
      params: { tab: 'timestamp', subtab: 'now' },
    },
  ],
  'security.hash-toolkit': [
    tab('checksum', 'hashToolkit.tab.checksum', 'Checksum', 'checksum'),
    tab('integrity', 'hashToolkit.tab.integrity', 'Integrity', 'integrity'),
    tab('evidence', 'hashToolkit.tab.evidence', 'Evidence', 'evidence'),
    {
      id: 'hmac',
      labelKey: 'hashToolkit.tab.hmac',
      fallbackLabel: 'HMAC',
      params: { tab: 'hmac' },
    },
  ],
  'security.random-generator': [
    {
      id: 'number',
      labelKey: 'security.rndNumber',
      fallbackLabel: 'Random number',
      params: { tab: 'number' },
    },
    {
      id: 'string',
      labelKey: 'security.rndString',
      fallbackLabel: 'Random string',
      params: { tab: 'string' },
    },
    { id: 'hex', labelKey: 'security.rndHex', fallbackLabel: 'Random hex', params: { tab: 'hex' } },
    { id: 'uuid', labelKey: 'security.rndUuid', fallbackLabel: 'UUID', params: { tab: 'uuid' } },
    {
      id: 'nanoid',
      labelKey: 'security.rndNanoid',
      fallbackLabel: 'NanoID',
      params: { tab: 'nanoid' },
    },
  ],
  'security.encoder-decoder': [
    ...(['base64', 'url', 'html', 'unicode', 'hex'] as const).flatMap((kind) => [
      {
        id: `${kind}-encode`,
        labelKey: 'security.encode',
        fallbackLabel: `Encode ${kind}`,
        keywords: [kind],
        params: { tab: kind, mode: 'encode' },
      },
      {
        id: `${kind}-decode`,
        labelKey: 'security.decode',
        fallbackLabel: `Decode ${kind}`,
        keywords: [kind],
        params: { tab: kind, mode: 'decode' },
      },
    ]),
  ],
  'security.password-generator': [
    focus('optUpper', 'security.optUpper', 'Uppercase', 'optUpper'),
    focus('optLower', 'security.optLower', 'Lowercase', 'optLower'),
    focus('optNumbers', 'security.optNumbers', 'Numbers', 'optNumbers'),
    focus('optSymbols', 'security.optSymbols', 'Symbols', 'optSymbols'),
    focus('optNoAmbiguous', 'security.optNoAmbiguous', 'No ambiguous', 'optNoAmbiguous'),
  ],
  'text.formatter': [
    ...(
      ['json', 'javascript', 'typescript', 'html', 'xml', 'css', 'markdown', 'plain-text'] as const
    ).map((format) => ({
      id: format,
      labelKey: `text.format.${format}`,
      fallbackLabel: format,
      keywords: ['format', 'formatter', 'beautify', 'minify', format],
      aliases:
        format === 'json'
          ? ['format json', 'json format', 'json formatter', 'format json code']
          : [`format ${format}`, `${format} formatter`],
      params: { format },
    })),
  ],
  'text.analyzer': [
    tab('metrics', 'text.tabMetrics', 'Metrics', 'metrics'),
    tab('lines', 'text.tabLines', 'Lines', 'lines'),
  ],
  'text.line-tools': [
    tab('dedupe', 'text.tabDedupe', 'Dedupe', 'dedupe'),
    tab('sort', 'text.tabSort', 'Sort', 'sort'),
    tab('reverse', 'text.tabReverse', 'Reverse', 'reverse'),
    tab('shuffle', 'text.tabShuffle', 'Shuffle', 'shuffle'),
    tab('numbering', 'text.tabNumbering', 'Numbering', 'numbering'),
    tab('empty', 'text.tabRemoveEmpty', 'Remove empty', 'empty'),
  ],
  'text.dummy-data': [
    {
      id: 'paragraphs',
      labelKey: 'text.paragraphs',
      fallbackLabel: 'Paragraphs',
      params: { mode: 'paragraphs' },
    },
    {
      id: 'sentences',
      labelKey: 'text.sentences',
      fallbackLabel: 'Sentences',
      params: { mode: 'sentences' },
    },
    { id: 'words', labelKey: 'text.words', fallbackLabel: 'Words', params: { mode: 'words' } },
    {
      id: 'lorem',
      labelKey: 'text.variantLorem',
      fallbackLabel: 'Lorem ipsum',
      params: { variant: 'lorem' },
    },
    {
      id: 'random',
      labelKey: 'text.variantRandom',
      fallbackLabel: 'Random',
      params: { variant: 'random' },
    },
  ],
  'text.case-converter': [
    ...(
      [
        'lower',
        'upper',
        'title',
        'sentence',
        'camel',
        'pascal',
        'snake',
        'kebab',
        'constant',
      ] as const
    ).map((style) => ({
      id: style,
      labelKey: `case.${style}`,
      fallbackLabel: style,
      params: { focus: style },
    })),
  ],
  'text.find-replace': [
    focus('caseSensitive', 'text.caseSensitive', 'Case sensitive', 'caseSensitive'),
    focus('wholeWord', 'text.wholeWord', 'Whole word', 'wholeWord'),
    focus('regex', 'text.regex', 'Regex', 'regex'),
  ],
  'text.whitespace-cleaner': [
    focus('trimEveryLine', 'text.trimEveryLine', 'Trim every line', 'trimEveryLine'),
    focus(
      'collapseMultipleSpaces',
      'text.collapseMultipleSpaces',
      'Collapse spaces',
      'collapseMultipleSpaces',
    ),
    focus(
      'normalizeLineBreaks',
      'text.normalizeLineBreaks',
      'Normalize line breaks',
      'normalizeLineBreaks',
    ),
    focus('removeBlankLines', 'text.removeBlankLines', 'Remove blank lines', 'removeBlankLines'),
  ],
  'data.data-scraper': [
    {
      id: 'auto',
      labelKey: 'dataScraper.autoDetect',
      fallbackLabel: 'Auto-detect grid',
      params: {},
    },
    { id: 'pick', labelKey: 'dataScraper.pickRows', fallbackLabel: 'Pick rows', params: {} },
    {
      id: 'export',
      labelKey: 'dataScraper.title',
      fallbackLabel: 'Export CSV / Excel',
      params: {},
    },
  ],
  'data.universal-converter': [
    {
      id: 'csv-json',
      labelKey: 'data.csvToJson',
      fallbackLabel: 'CSV to JSON',
      params: { from: 'csv', to: 'json' },
    },
    {
      id: 'json-csv',
      labelKey: 'data.jsonToCsv',
      fallbackLabel: 'JSON to CSV',
      params: { from: 'json', to: 'csv' },
    },
    {
      id: 'json-xml',
      labelKey: 'data.jsonToXml',
      fallbackLabel: 'JSON to XML',
      params: { from: 'json', to: 'xml' },
    },
    {
      id: 'xml-json',
      labelKey: 'data.xmlToJson',
      fallbackLabel: 'XML to JSON',
      params: { from: 'xml', to: 'json' },
    },
  ],
  'design.palette-generator': [
    ...(['complementary', 'analogous', 'triadic', 'monochromatic', 'random'] as const).map(
      (mode) => ({
        id: mode,
        labelKey: `design.mode.${mode}`,
        fallbackLabel: mode,
        params: { mode },
      }),
    ),
  ],
  'design.css-generator': [
    tab('ui-style', 'css.gen.ui-style', 'UI styles', 'ui-style'),
    tab('background', 'css.gen.background', 'Background effects', 'background'),
    tab('button', 'css.gen.button', 'Button effects', 'button'),
    tab('hover', 'css.gen.hover', 'Card hover effects', 'hover'),
    tab('loader', 'css.gen.loader', 'Loaders', 'loader'),
    tab('text-effect', 'css.gen.text-effect', 'Text effects', 'text-effect'),
    tab('gradient', 'css.gen.gradient', 'Gradient', 'gradient'),
    tab('glass', 'css.gen.glass', 'Glassmorphism', 'glass'),
    tab('shadow', 'css.gen.shadow', 'Box shadow', 'shadow'),
    tab('text-shadow', 'css.gen.text-shadow', 'Text shadow', 'text-shadow'),
    tab('filter', 'css.gen.filter', 'Filters', 'filter'),
    tab('radius', 'css.gen.radius', 'Border radius', 'radius'),
    tab('border', 'css.gen.border', 'Border', 'border'),
    tab('clip-path', 'css.gen.clip-path', 'Clip path', 'clip-path'),
    tab('transform', 'css.gen.transform', 'Transform', 'transform'),
    tab('animation', 'css.gen.animation', 'Animation', 'animation'),
    tab('flexbox', 'css.gen.flexbox', 'Flexbox', 'flexbox'),
    tab('grid', 'css.gen.grid', 'Grid', 'grid'),
  ],
  'generators.qr-toolkit': [
    tab('generate', 'qr.generate', 'Generate', 'generate'),
    tab('decode', 'qr.decode', 'Decode', 'decode'),
    ...(['text', 'url', 'wifi', 'email', 'phone', 'sms', 'contact', 'geo', 'event'] as const).map(
      (preset) => ({
        id: `preset-${preset}`,
        labelKey: `qr.preset.${preset}`,
        fallbackLabel: preset,
        params: { tab: 'generate', preset },
      }),
    ),
  ],
  'web.url-toolkit': [
    tab('parse', 'web.tabParse', 'Parse', 'parse'),
    tab('encode', 'web.tabEncode', 'Encode', 'encode'),
    tab('clean', 'web.tabClean', 'Clean', 'clean'),
  ],
  'web.link-toolkit': [
    {
      id: 'all',
      labelKey: 'web.filter.all',
      fallbackLabel: 'All links',
      params: { filter: 'all' },
    },
    {
      id: 'internal',
      labelKey: 'web.filter.internal',
      fallbackLabel: 'Internal',
      params: { filter: 'internal' },
    },
    {
      id: 'external',
      labelKey: 'web.filter.external',
      fallbackLabel: 'External',
      params: { filter: 'external' },
    },
  ],
  'web.html-bundle': [
    focus('htmlOnly', 'htmlBundle.htmlOnly', 'HTML only', 'htmlOnly'),
    focus('sameFolderOnly', 'htmlBundle.sameFolderOnly', 'Same folder only', 'sameFolderOnly'),
  ],
  'storage.inspector': [
    {
      id: 'local',
      labelKey: 'storage.local',
      fallbackLabel: 'localStorage',
      params: { tab: 'local' },
    },
    {
      id: 'session',
      labelKey: 'storage.session',
      fallbackLabel: 'sessionStorage',
      params: { tab: 'session' },
    },
  ],
  'seo.toolkit': [
    tab('overview', 'seo.tabOverview', 'Overview', 'overview'),
    tab('content', 'seo.tabContent', 'Content', 'content'),
    tab('headings', 'seo.tabHeadings', 'Headings', 'headings'),
    tab('links', 'seo.tabLinks', 'Links', 'links'),
    tab('images', 'seo.tabImages', 'Images', 'images'),
    tab('schema', 'seo.tabSchema', 'Schema', 'schema'),
    tab('social', 'seo.tabSocial', 'Social', 'social'),
    tab('performance', 'seo.tabPerformance', 'Speed', 'performance'),
    tab('issues', 'seo.tabIssues', 'Issues', 'issues'),
    tab('advanced', 'seo.tabAdvanced', 'Advanced', 'advanced'),
  ],
  'productivity.timer': [
    tab('countdown', 'timer.countdown', 'Countdown', 'countdown'),
    tab('stopwatch', 'timer.stopwatch', 'Stopwatch', 'stopwatch'),
    {
      id: 'pomodoro',
      labelKey: 'timer.pomodoro',
      fallbackLabel: 'Pomodoro',
      params: { tab: 'pomodoro' },
    },
  ],
  'image.image-toolkit': [
    tab('resize', 'image.resize', 'Resize', 'resize'),
    tab('crop', 'image.crop', 'Crop', 'crop'),
    tab('convert', 'image.convert', 'Convert', 'convert'),
    { id: 'base64', labelKey: 'image.base64', fallbackLabel: 'Base64', params: { tab: 'base64' } },
    tab('info', 'image.info', 'Info', 'info'),
  ],
  'image.image-downloader': [
    {
      id: 'filters',
      labelKey: 'imageDownloader.filters',
      fallbackLabel: 'Filters',
      keywords: ['filter images'],
      params: {},
    },
    {
      id: 'zip',
      labelKey: 'imageDownloader.modeZip',
      fallbackLabel: 'ZIP download',
      keywords: ['zip', 'bulk'],
      params: { mode: 'zip' },
    },
  ],
  'files.file-toolkit': [
    {
      id: 'convert',
      labelKey: 'fs.search.convert',
      fallbackLabel: 'Batch convert files',
      keywords: [
        'csv to excel',
        'json to csv',
        'yaml to json',
        'png to webp',
        'jpg to png',
        'image converter',
      ],
      params: { tab: 'convert' },
    },
    {
      id: 'write',
      labelKey: 'fs.search.write',
      fallbackLabel: 'Text to PDF or Word',
      aliases: [
        'text to pdf',
        'text to word',
        'text to docx',
        'markdown to pdf',
        'markdown to word',
        'txt to rtf',
      ],
      params: { tab: 'write' },
    },
    {
      id: 'pdf',
      labelKey: 'fs.search.imagesToPdf',
      fallbackLabel: 'Images to PDF',
      aliases: ['jpg to pdf', 'png to pdf', 'photos to pdf'],
      params: { tab: 'pdf' },
    },
    {
      id: 'archive',
      labelKey: 'fs.search.archive',
      fallbackLabel: 'ZIP and GZIP',
      aliases: ['zip files', 'unzip', 'extract zip', 'gzip', 'gunzip', 'compress file'],
      params: { tab: 'archive' },
    },
    {
      id: 'inspect',
      labelKey: 'fs.search.inspect',
      fallbackLabel: 'Checksum and file info',
      aliases: [
        'sha256',
        'md5',
        'checksum',
        'file hash',
        'file to base64',
        'base64 to file',
        'hex viewer',
      ],
      params: { tab: 'inspect' },
    },
    tab('view', 'fs.search.view', 'View CSV, JSON and text', 'view'),
  ],
  'files.pdf-toolkit': PDF_TOOLS.map((tool) => ({
    id: tool.id,
    labelKey: `pdf.tools.${tool.id}.name`,
    fallbackLabel: tool.name,
    aliases: tool.aliases,
    params: { tab: tool.id },
  })),
  'screenshots.capture': [
    {
      id: 'visible',
      labelKey: 'capture.captureVisible',
      fallbackLabel: 'Visible area',
      params: { focus: 'capture-visible' },
    },
    {
      id: 'area',
      labelKey: 'capture.captureArea',
      fallbackLabel: 'Select area',
      params: { focus: 'capture-area' },
    },
    {
      id: 'full',
      labelKey: 'capture.captureFull',
      fallbackLabel: 'Full page',
      params: { focus: 'capture-full' },
    },
  ],
  'qa.test-data-generator': [
    {
      id: 'json',
      labelKey: 'qa.formatJson',
      fallbackLabel: 'JSON format',
      params: { format: 'json' },
    },
    { id: 'csv', labelKey: 'qa.formatCsv', fallbackLabel: 'CSV format', params: { format: 'csv' } },
  ],
  'qa.element-inspector': [
    tab('overview', 'inspectorEl.tab.overview', 'Overview', 'overview'),
    tab('box', 'inspectorEl.tab.box', 'Box model', 'box'),
    tab('styles', 'qa.computedStyles', 'Computed styles', 'styles', { focus: 'section-computed' }),
    tab('selectors', 'qa.selectors', 'Selectors', 'selectors', { focus: 'section-selectors' }),
    tab('a11y', 'inspectorEl.tab.a11y', 'Accessibility', 'a11y'),
    focus('text', 'qa.text', 'Text', 'section-text'),
    focus('attributes', 'qa.attributes', 'Attributes', 'section-attributes'),
  ],
  'privacy.ad-blocker': [
    focus('filterLists', 'adblock.filterLists', 'Filter lists', 'filterLists'),
    focus('allowlist', 'adblock.allowlistTitle', 'Allowlist', 'allowlist'),
    focus('plus-youtube', 'settings.adblockYoutube', 'YouTube ads', 'plus-youtube'),
    focus('plus-popups', 'adblock.plus.popups', 'Block popups', 'plus-popups'),
    focus('plus-cookies', 'adblock.plus.cookies', 'Cookie banners', 'plus-cookies'),
    focus('plus-distractions', 'adblock.plus.distractions', 'Distractions', 'plus-distractions'),
    focus('plus-tracking', 'adblock.plus.tracking', 'Tracking', 'plus-tracking'),
    focus(
      'plus-notifications',
      'adblock.plus.notifications',
      'Notifications',
      'plus-notifications',
    ),
    {
      id: 'list-ads',
      labelKey: 'adblock.list.ads',
      fallbackLabel: 'Ads filter list',
      params: { focus: 'list-ads' },
    },
    {
      id: 'list-privacy',
      labelKey: 'adblock.list.privacy',
      fallbackLabel: 'Privacy filter list',
      params: { focus: 'list-privacy' },
    },
    {
      id: 'list-annoyances',
      labelKey: 'adblock.list.annoyances',
      fallbackLabel: 'Annoyances filter list',
      params: { focus: 'list-annoyances' },
    },
    {
      id: 'list-youtube',
      labelKey: 'adblock.list.youtube',
      fallbackLabel: 'YouTube filter list',
      params: { focus: 'list-youtube' },
    },
  ],
  'privacy.web-protection': [
    focus('categories', 'protection.categoriesTitle', 'Categories', 'categories'),
    focus('guards', 'protection.guardsTitle', 'Guards', 'guards'),
    focus('suite', 'protection.suiteTitle', 'Protection suite', 'suite'),
  ],
  'calculators.unit-converter': [],
  'calculators.base-converter': [],
  'sites.instagram': [
    {
      id: 'caption',
      labelKey: 'sites.instagram.caption.title',
      fallbackLabel: 'Caption formatter',
      params: { focus: 'caption' },
    },
  ],
  'sites.twitter': [
    {
      id: 'search',
      labelKey: 'sites.twitter.search.title',
      fallbackLabel: 'Advanced search',
      params: {},
    },
  ],
  'sites.linkedin': [
    {
      id: 'post',
      labelKey: 'sites.linkedin.post.title',
      fallbackLabel: 'Post preview',
      params: {},
    },
  ],
  'web.tech-stack': [
    { id: 'scan', labelKey: 'web.techStack.empty', fallbackLabel: 'Scan page', params: {} },
  ],
  'web.redirect-tracer': [
    {
      id: 'trace',
      labelKey: 'web.redirectTracer.empty',
      fallbackLabel: 'Redirect trace',
      params: {},
    },
  ],
  'web.link-checker': [
    { id: 'check', labelKey: 'web.linkChecker.run', fallbackLabel: 'Check links', params: {} },
  ],
  'web.utm-builder': [
    { id: 'build', labelKey: 'web.utm.base', fallbackLabel: 'UTM builder', params: {} },
  ],
  'web.copy-markdown': [
    {
      id: 'article',
      labelKey: 'web.copyMarkdown.article',
      fallbackLabel: 'Copy article',
      params: {},
    },
  ],
  'design.font-inspector': [
    {
      id: 'inspect',
      labelKey: 'design.fontInspector.title',
      fallbackLabel: 'Font inspector',
      params: {},
    },
  ],
  'design.responsive-viewer': [
    {
      id: 'preview',
      labelKey: 'design.responsive.url',
      fallbackLabel: 'Responsive preview',
      params: {},
    },
  ],
  'design.svg-grabber': [
    { id: 'grab', labelKey: 'design.svg.copySvg', fallbackLabel: 'SVG grabber', params: {} },
  ],
  'design.layout-wireframe': [
    { id: 'wireframe', labelKey: 'design.wireframe.title', fallbackLabel: 'Wireframe', params: {} },
  ],
  'security.totp': [
    { id: 'codes', labelKey: 'security.totp.add', fallbackLabel: 'TOTP codes', params: {} },
  ],
  'text.read-aloud': [
    { id: 'speak', labelKey: 'text.readAloud.play', fallbackLabel: 'Read aloud', params: {} },
  ],
}
