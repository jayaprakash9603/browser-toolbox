export type EdgeCaseGroupId =
  | 'whitespace'
  | 'length'
  | 'unicode'
  | 'numbers'
  | 'emails'
  | 'dates'
  | 'files'
  | 'security'

export type EdgeCaseTag = 'valid' | 'invalid'

export interface EdgeCase {
  label: string
  value: string
  tag?: EdgeCaseTag
}

export interface EdgeCaseGroup {
  id: EdgeCaseGroupId
  items: readonly EdgeCase[]
}

const DECOMPOSED_E = 'e\u0301'
const COMPOSED_E = '\u00e9'

export const EDGE_CASE_GROUPS: readonly EdgeCaseGroup[] = [
  {
    id: 'whitespace',
    items: [
      { label: 'Empty string', value: '' },
      { label: 'Single space', value: ' ' },
      { label: 'Only spaces', value: '     ' },
      { label: 'Tab', value: '\t' },
      { label: 'Line feed', value: '\n' },
      { label: 'CRLF', value: '\r\n' },
      { label: 'Leading and trailing spaces', value: '  padded value  ' },
      { label: 'Non-breaking space', value: '\u00a0' },
      { label: 'Zero-width space', value: 'zero\u200bwidth' },
      { label: 'Byte order mark', value: '\ufeffbom' },
      { label: 'Literal "null"', value: 'null' },
      { label: 'Literal "undefined"', value: 'undefined' },
    ],
  },
  {
    id: 'length',
    items: [
      { label: '1 character', value: 'a' },
      { label: '255 characters', value: 'a'.repeat(255) },
      { label: '256 characters', value: 'a'.repeat(256) },
      { label: '1,024 characters', value: 'a'.repeat(1024) },
      { label: 'Long word (no breaks)', value: 'Supercalifragilistic'.repeat(12) },
    ],
  },
  {
    id: 'unicode',
    items: [
      { label: 'Emoji with modifiers', value: '😀 👍🏽 👨‍👩‍👧‍👦 🏳️‍🌈' },
      { label: 'Right-to-left text', value: 'مرحبا بالعالم' },
      { label: 'Hebrew mixed with numbers', value: 'שלום 123 עולם' },
      { label: 'RTL override', value: 'invoice\u202egpj.exe' },
      { label: 'CJK', value: '测试数据 テスト 데이터' },
      { label: 'Accents and diacritics', value: 'Ünïcödé Çàfé Ñoño' },
      { label: 'Combining marks (Zalgo)', value: 'Z̵̡̢͈a̷̧͔l̶̨̛g̸̡̛o̵̢͝' },
      { label: 'Decomposed vs composed é', value: `${DECOMPOSED_E} / ${COMPOSED_E}` },
      { label: 'Astral plane (𝕌𝕟𝕚)', value: '𝕌𝕟𝕚𝕔𝕠𝕕𝕖' },
      { label: 'Four-byte CJK extension', value: '𠜎𠜱𠝹' },
    ],
  },
  {
    id: 'numbers',
    items: [
      { label: 'Zero', value: '0' },
      { label: 'Negative zero', value: '-0' },
      { label: 'Negative number', value: '-1' },
      { label: 'Max safe integer', value: '9007199254740991' },
      { label: 'Beyond safe integer', value: '9007199254740993' },
      { label: 'Int32 max + 1', value: '2147483648' },
      { label: 'Leading zeros', value: '00042' },
      { label: 'Float precision (0.1 + 0.2)', value: '0.30000000000000004' },
      { label: 'Scientific notation', value: '1e309' },
      { label: 'Infinity', value: 'Infinity' },
      { label: 'NaN', value: 'NaN' },
      { label: 'Thousands separators', value: '1,000,000' },
      { label: 'Currency string', value: '$1,234.56' },
      { label: 'Hexadecimal', value: '0xDEADBEEF' },
    ],
  },
  {
    id: 'emails',
    items: [
      { label: 'Simple', value: 'user@example.com', tag: 'valid' },
      { label: 'Plus tag', value: 'user+tag@example.com', tag: 'valid' },
      { label: 'Subdomain', value: 'user@mail.example.co.uk', tag: 'valid' },
      { label: 'Quoted local part', value: '"john doe"@example.com', tag: 'valid' },
      { label: 'Unicode local part', value: 'münchen@example.com', tag: 'valid' },
      { label: 'Missing @', value: 'userexample.com', tag: 'invalid' },
      { label: 'Double @', value: 'user@@example.com', tag: 'invalid' },
      { label: 'Trailing dot', value: 'user@example.com.', tag: 'invalid' },
      { label: 'Leading dot', value: '.user@example.com', tag: 'invalid' },
      { label: 'Space inside', value: 'user name@example.com', tag: 'invalid' },
      { label: 'No domain', value: 'user@', tag: 'invalid' },
    ],
  },
  {
    id: 'dates',
    items: [
      { label: 'Leap day', value: '2024-02-29', tag: 'valid' },
      { label: 'Non-leap Feb 29', value: '2023-02-29', tag: 'invalid' },
      { label: 'Unix epoch', value: '1970-01-01T00:00:00Z', tag: 'valid' },
      { label: 'Y2K boundary', value: '2000-01-01', tag: 'valid' },
      { label: 'Year 2038 boundary', value: '2038-01-19T03:14:07Z', tag: 'valid' },
      { label: 'End of year', value: '2024-12-31T23:59:59Z', tag: 'valid' },
      { label: 'Leap second', value: '2016-12-31T23:59:60Z' },
      { label: 'US vs ISO (01/02/2024)', value: '01/02/2024' },
      { label: 'Month 13', value: '2024-13-01', tag: 'invalid' },
      { label: 'Day 00', value: '2024-01-00', tag: 'invalid' },
      { label: 'Far future', value: '9999-12-31' },
    ],
  },
  {
    id: 'files',
    items: [
      { label: 'Path traversal', value: '../../etc/passwd' },
      { label: 'Windows reserved name', value: 'CON.txt' },
      { label: 'Trailing dot/space', value: 'file. ' },
      { label: 'Double extension', value: 'photo.jpg.exe' },
      { label: 'No extension', value: 'README' },
      { label: 'Spaces in name', value: 'my report final (2).pdf' },
      { label: 'Unicode name', value: '文件名.txt' },
      { label: 'Very long name', value: `${'a'.repeat(250)}.txt` },
      { label: 'Hidden file', value: '.env' },
      { label: 'Null byte injection', value: 'image.png\u0000.php' },
    ],
  },
  {
    id: 'security',
    items: [
      { label: 'Script tag', value: '<script>alert(1)</script>' },
      { label: 'Image onerror', value: '"><img src=x onerror=alert(1)>' },
      { label: 'JS URL', value: 'javascript:alert(document.cookie)' },
      { label: 'SQL OR 1=1', value: "' OR '1'='1" },
      { label: 'SQL comment drop', value: "'; DROP TABLE users;--" },
      { label: 'Template injection', value: '${7*7}' },
      { label: 'Handlebars injection', value: '{{constructor.constructor("alert(1)")()}}' },
      { label: 'Format string', value: '%s%s%s%n' },
      { label: 'Log4Shell', value: '${jndi:ldap://127.0.0.1/a}' },
      { label: 'Command injection', value: '; cat /etc/passwd' },
      { label: 'CSV formula', value: '=1+1+cmd|"/c calc"!A0' },
      { label: 'NoSQL operator', value: '{"$gt": ""}' },
    ],
  },
]

const GROUP_INDEX = new Map(EDGE_CASE_GROUPS.map((group) => [group.id, group]))

export function edgeCaseGroup(id: EdgeCaseGroupId): EdgeCaseGroup | undefined {
  return GROUP_INDEX.get(id)
}
