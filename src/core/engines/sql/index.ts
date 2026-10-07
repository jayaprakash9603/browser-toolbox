import { format, type SqlLanguage } from 'sql-formatter'

export type SqlDialect = SqlLanguage

export const SQL_DIALECTS: { id: SqlDialect; name: string }[] = [
  { id: 'sql', name: 'Standard SQL' },
  { id: 'mysql', name: 'MySQL' },
  { id: 'postgresql', name: 'PostgreSQL' },
  { id: 'sqlite', name: 'SQLite' },
  { id: 'mariadb', name: 'MariaDB' },
  { id: 'transactsql', name: 'T-SQL (SQL Server)' },
  { id: 'plsql', name: 'PL/SQL (Oracle)' },
  { id: 'bigquery', name: 'BigQuery' },
  { id: 'snowflake', name: 'Snowflake' },
  { id: 'redshift', name: 'Redshift' },
]

export type SqlResult = { ok: true; value: string } | { ok: false; error: string }

export function formatSql(source: string, dialect: SqlDialect = 'sql'): SqlResult {
  if (!source.trim()) return { ok: false, error: 'Input is empty.' }
  try {
    return { ok: true, value: format(source, { language: dialect, keywordCase: 'upper' }) }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message.split('\n')[0] : 'Could not format SQL.' }
  }
}

export function minifySql(source: string): SqlResult {
  if (!source.trim()) return { ok: false, error: 'Input is empty.' }
  try {
    return { ok: true, value: format(source, { language: 'sql', expressionWidth: Number.MAX_SAFE_INTEGER, keywordCase: 'preserve' }).replace(/\s+/g, ' ').trim() }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message.split('\n')[0] : 'Could not minify SQL.' }
  }
}

export function validateSql(source: string): { valid: boolean; error?: string } {
  const result = formatSql(source)
  return result.ok ? { valid: true } : { valid: false, error: result.error }
}
