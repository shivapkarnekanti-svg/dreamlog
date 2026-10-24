const KEY = 'dreamlog.anthropicKey'

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function setApiKey(value: string): boolean {
  try {
    localStorage.setItem(KEY, value.trim())
    return true
  } catch {
    return false
  }
}

export function clearApiKey(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // storage unavailable; nothing to clear
  }
}
