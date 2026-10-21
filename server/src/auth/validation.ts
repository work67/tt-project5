export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,32}$/
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

export function validateUsername(username: string): string[] {
  return USERNAME_PATTERN.test(username)
    ? []
    : ['Username must be 3–32 characters and contain only letters, numbers and underscores.']
}

export function validatePassword(password: string, username: string): string[] {
  const errors: string[] = []
  if (password.length < PASSWORD_MIN_LENGTH)
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  if (password.length > PASSWORD_MAX_LENGTH)
    errors.push(`Password must be at most ${PASSWORD_MAX_LENGTH} characters.`)
  if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter.')
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter.')
  if (!/[0-9]/.test(password)) errors.push('Password must contain a number.')
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain a symbol.')
  if (username && password.toLowerCase().includes(username.toLowerCase()))
    errors.push('Password must not contain your username.')
  return errors
}
