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
  if (!trimmed) return 'Name is required.'
  if (trimmed.length < 2) return 'Name must be at least 2 characters.'
  if (trimmed.length > 100) return 'Name must be under 100 characters.'
  return null
}

export function validateUserNumber(userNumber: string): string | null {
  const trimmed = userNumber.trim()
  if (!trimmed) return 'User number is required.'
  if (trimmed.length < 1) return 'User number is too short.'
  return null
}

export function validateMobileNumber(mobile: string): string | null {
  const trimmed = mobile.trim()
  if (!trimmed) return 'Mobile number is required.'
  if (!MOBILE_PATTERN.test(trimmed)) {
    return 'Enter a valid mobile number.'
  }
  return null
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.'
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain both letters and numbers.'
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
    errors.push({ field: 'userNumber', message: 'User number is required.' })
  }
  if (!input.password) {
    errors.push({ field: 'password', message: 'Password is required.' })
  }
  return errors
}
