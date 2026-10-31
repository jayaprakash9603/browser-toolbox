export const workspaceStrings: Record<string, string> = {
  'tools.text.studio.name': 'Text Studio',
  'tools.text.studio.description':
    'One workspace for formatting code, cleaning and analyzing text, converting case, find and replace, and dummy data.',
  'tools.developer.formatter-studio.name': 'Developer Formatter Studio',
  'tools.developer.formatter-studio.description':
    'Paste JSON, XML, YAML, SQL, a regex or an ID and open the matching formatter, validator or generator.',
  'tools.web.toolkit.name': 'Web Toolkit',
  'tools.web.toolkit.description':
    'URLs, links, broken-link checks, redirect tracing and UTM campaign links in one workspace.',
  'tools.design.css-color-studio.name': 'CSS & Color Studio',
  'tools.design.css-color-studio.description':
    'Generate CSS, check contrast and convert colors in one workspace.',
  'tools.security.toolkit.name': 'Security Toolkit',
  'tools.security.toolkit.description':
    'Encode and decode, hash, inspect JWTs, and generate passwords and random values, all locally.',

  'workspace.navigation': '{{name}} sections',
  'workspace.web.note':
    'Link checks run only when you start them and are limited in number. Pages that block cross-origin requests are reported as unverified, not as working.',
  'workspace.security.note':
    'Everything runs locally and nothing is sent anywhere. Decoding a JWT shows its contents but does not verify its signature.',

  'formatterStudio.input': 'Paste or type content',
  'formatterStudio.placeholder': 'JSON, XML, YAML, SQL, a /regex/ or a UUID',
  'formatterStudio.formats': 'Format',
  'formatterStudio.openIn': 'Open in {{format}}',
  'formatterStudio.pick': 'Choose a format',
  'formatterStudio.note': 'Nothing is changed until you open a tool. Your text is passed over as it is.',
  'formatterStudio.chosen': 'Using {{format}} (chosen by you).',
  'formatterStudio.none': 'No format detected. Pick one below.',
  'formatterStudio.jsonInvalid':
    'Detected: JSON (it does not parse yet; the JSON tool will show the error).',
  'formatterStudio.detected': 'Detected: {{format}} ({{confidence}} confidence).',

  'headerToggle.on': 'on',
  'headerToggle.off': 'off',
  'headerToggle.loading': 'loading',
  'headerToggle.changed': '{{name}} turned {{state}}.',
  'headerToggle.unchanged': '{{name}} was not changed. Site access may not have been granted.',

  'support.title': 'Help and feedback',
  'support.email': 'Email Us',
  'support.rate': 'Rate One Panel',
  'support.report.action': 'Report an Issue',
  'support.report.title': 'Report an issue',
  'support.report.hint':
    'Nothing is sent from the extension. You review the report, then choose where to send it.',
  'support.report.issueTitle': 'Title',
  'support.report.tool': 'Tool',
  'support.report.general': 'General / not tool-specific',
  'support.report.description': 'What went wrong?',
  'support.report.steps': 'Steps to reproduce (optional)',
  'support.report.includeDiagnostics': 'Include basic diagnostics',
  'support.report.noPageData':
    'Page content, cookies, tokens and passwords are never attached. Do not paste secrets into the description.',
  'support.report.openGithub': 'Open GitHub issue',
  'support.report.email': 'Email report',
  'support.report.copy': 'Copy report',
  'support.report.copied': 'Copied',

  'readingList.excerpt.title': 'Save selected text',
  'readingList.excerpt.dismiss': 'Dismiss',
  'readingList.excerpt.label': 'Selected text',
  'readingList.excerpt.save': 'Save to Reading List',

  'colorPicker.generatePalette': 'Generate palette',
  'web.copyMarkdown.emptySelection': 'Nothing is selected on the page. Select some text and try again.',
  'htmlBundle.checkLinks': 'Check broken links',
}
