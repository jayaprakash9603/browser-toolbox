const COMMON = new Set([
  'password',
  'password1',
  'password123',
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty',
  'qwerty123',
  'abc123',
  'letmein',
  'welcome',
  'admin',
  'iloveyou',
  'monkey',
  'dragon',
  'login',
  'starwars',
  'passw0rd',
  'master',
  'hello',
  'freedom',
  'whatever',
  'trustno1',
  '000000',
  '111111',
  '123123',
  '654321',
  '1q2w3e4r',
  'zaq12wsx',
])

export type PasswordStrengthLabel = 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong'

export interface PasswordStrength {
  score: number
  label: PasswordStrengthLabel
  reasons: string[]
}

function hasRepeat(value: string): boolean {
  return /(.)\1{2,}/.test(value)
}

function hasSequence(value: string): boolean {
  const lower = value.toLowerCase()
  const sequences = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'asdfghjkl']
  for (const seq of sequences) {
    for (let i = 0; i <= seq.length - 4; i += 1) {
      const slice = seq.slice(i, i + 4)
      if (lower.includes(slice) || lower.includes([...slice].reverse().join(''))) return true
    }
  }
  return false
}

export function assessPasswordStrength(password: string): PasswordStrength {
  const reasons: string[] = []
  if (!password) {
    return { score: 0, label: 'very_weak', reasons: ['Enter a password to check it locally. Nothing is stored.'] }
  }
  let score = 0
  if (password.length >= 8) score += 15
  if (password.length >= 12) score += 15
  if (password.length >= 16) score += 15
  if (password.length >= 20) score += 10
  else if (password.length < 8) reasons.push('Shorter than 8 characters.')

  const classes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length
  score += classes * 10
  if (classes < 3) reasons.push('Use a mix of upper, lower, numbers and symbols.')

  if (COMMON.has(password.toLowerCase())) {
    score = Math.min(score, 15)
    reasons.push('This matches a common password in the local list.')
  }
  if (hasRepeat(password)) {
    score -= 10
    reasons.push('Repeated characters weaken the password.')
  }
  if (hasSequence(password)) {
    score -= 10
    reasons.push('Keyboard or numeric sequences are easy to guess.')
  }
  score = Math.max(0, Math.min(100, score))
  const label: PasswordStrengthLabel =
    score >= 85 ? 'very_strong' : score >= 70 ? 'strong' : score >= 50 ? 'fair' : score >= 30 ? 'weak' : 'very_weak'
  if (!reasons.length) reasons.push('Checked locally. This is not a guarantee against every guessing attack.')
  return { score, label, reasons }
}
