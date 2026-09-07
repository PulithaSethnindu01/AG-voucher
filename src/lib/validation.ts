/**
 * Shared frontend validation helpers. These mirror (but do not replace) the
 * authoritative validation enforced by PostgreSQL CHECK constraints and
 * secure RPC functions. Never rely on these alone.
 */

export interface FieldError {
  field: string
  message: string
}

const MOBILE_PATTERN = /^[0-9+][0-9\s-]{6,14}$/

export function validateName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'සම්පූර්ණ නම ඇතුලත් කරන්න.'
  if (trimmed.length < 2) return 'අවම වශයෙන් අකුරු දෙකක්වත් ඇතුලත් විය යුතු ය.'
  if (trimmed.length > 100) return 'අකුරු 100කට වඩා අඩු විය යුතු ය.'
  return null
}

export function validateUserNumber(userNumber: string): string | null {
  const trimmed = userNumber.trim()
  if (!trimmed) return 'සේවා අංකය ඇතුලත් කරන්න.'
  if (trimmed.length < 1) return 'කරුණාකර දිග සේවා අංකයක් ඇතුලත් කරන්න.'
  return null
}

export function validateMobileNumber(mobile: string): string | null {
  const trimmed = mobile.trim()
  if (!trimmed) return 'දුරකතන අංකය ඇතුලත් කරන්න.'
  if (!MOBILE_PATTERN.test(trimmed)) {
    return 'නිවැරදි දුරකතන අංකයක් ඇතුලත් කරන්න.'
  }
  return null
}

export function validatePassword(password: string): string | null {
  if (!password) return 'මුරපදය ඇතුලත් කරන්න.'
  if (password.length < 8) return 'අවම වශයෙන් අකුරු 8ක් වත් ඇතුලත් විය යුතු ය.'
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'අකුරු සහ ඉලක්කම් දෙකම ඇතුලත් විය යුතු ය.'
  }
  return null
}

export function validateRegistration(input: {
  name: string
  userNumber: string
  mobileNumber: string
  password: string
}): FieldError[] {
  const errors: FieldError[] = []
  const nameErr = validateName(input.name)
  if (nameErr) errors.push({ field: 'name', message: nameErr })

  const userNumberErr = validateUserNumber(input.userNumber)
  if (userNumberErr) errors.push({ field: 'userNumber', message: userNumberErr })

  const mobileErr = validateMobileNumber(input.mobileNumber)
  if (mobileErr) errors.push({ field: 'mobileNumber', message: mobileErr })

  const passwordErr = validatePassword(input.password)
  if (passwordErr) errors.push({ field: 'password', message: passwordErr })

  return errors
}

export function validateLogin(input: {
  userNumber: string
  password: string
}): FieldError[] {
  const errors: FieldError[] = []
  if (!input.userNumber.trim()) {
    errors.push({ field: 'userNumber', message: 'සේවා අංකය ඇතුලත් කරන්න.' })
  }
  if (!input.password) {
    errors.push({ field: 'password', message: 'මුරපදය ඇතුලත් කරන්න.' })
  }
  return errors
}
