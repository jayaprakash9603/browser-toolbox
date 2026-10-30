import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { CATEGORIES } from '@/core/registry/categories'
import { toolRegistry } from '@/core/registry'
import i18n from '@/i18n'
import { registerModules } from '@/modules'

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name)
    return entry.isDirectory() ? listTypeScriptFiles(file) : /\.tsx?$/.test(file) ? [file] : []
  })
}

function collectTranslationKeys(
  text: string,
  filePath: string,
): Array<{ key: string; hasCount: boolean }> {
  const source = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const keys: Array<{ key: string; hasCount: boolean }> = []
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const expression = node.expression
      const name = ts.isIdentifier(expression)
        ? expression.text
        : ts.isPropertyAccessExpression(expression)
          ? expression.name.text
          : ''
      const key = node.arguments[0]
      if (
        name === 't' &&
        key &&
        (ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key))
      ) {
        const options = node.arguments[1]
        const hasCount =
          options &&
          ts.isObjectLiteralExpression(options) &&
          options.properties.some((property) =>
            ts.isPropertyAssignment(property)
              ? property.name.getText() === 'count'
              : ts.isShorthandPropertyAssignment(property) && property.name.text === 'count',
          )
        keys.push({ key: key.text, hasCount: Boolean(hasCount) })
      }
    }
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText(source) === 'i18nKey' &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      keys.push({ key: node.initializer.text, hasCount: false })
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return keys
}

function hasEnglishKey(
  translations: Record<string, unknown>,
  key: string,
  hasCount: boolean,
): boolean {
  if (Object.hasOwn(translations, key)) return true
  return (
    hasCount &&
    Object.hasOwn(translations, `${key}_one`) &&
    Object.hasOwn(translations, `${key}_other`)
  )
}

describe('English localization', () => {
  it('initializes English as the supported and fallback locale', () => {
    expect(i18n.language).toBe('en')
    expect(i18n.options.supportedLngs).toContain('en')
    expect(i18n.options.fallbackLng).toEqual(['en'])
  })

  it('translates common labels and plural counts', () => {
    expect(i18n.t('nav.home')).toBe('Home')
    expect(i18n.t('common.entries', { count: 1 })).toBe('1 entry stored locally.')
    expect(i18n.t('common.entries', { count: 2 })).toBe('2 entries stored locally.')
  })

  it('provides English names and descriptions for every registered item', () => {
    registerModules()
    const missingKeys: string[] = []

    for (const tool of toolRegistry.getAll()) {
      for (const field of ['name', 'description']) {
        const key = `tools.${tool.id}.${field}`
        if (!i18n.exists(key)) missingKeys.push(key)
      }
    }

    for (const category of CATEGORIES) {
      for (const field of ['name', 'description']) {
        const key = `categories.${category.id}.${field}`
        if (!i18n.exists(key)) missingKeys.push(key)
      }
    }

    expect(missingKeys).toEqual([])
  })

  it('resolves every statically referenced translation key', () => {
    const sourceRoot = resolve(process.cwd(), 'src')
    const missingKeys = new Set<string>()
    const translations = i18n.getResourceBundle('en', 'translation') as Record<string, unknown>

    for (const file of listTypeScriptFiles(sourceRoot)) {
      const text = readFileSync(file, 'utf8')
      if (!/\bt\s*\(|\bi18nKey\s*=/.test(text)) continue
      for (const { key, hasCount } of collectTranslationKeys(text, file)) {
        if (!hasEnglishKey(translations, key, hasCount)) {
          missingKeys.add(`${relative(sourceRoot, file)}: ${key}`)
        }
      }
    }

    expect([...missingKeys]).toEqual([])
  }, 20_000)
})
