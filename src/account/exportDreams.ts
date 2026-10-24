import type { DreamPayload } from '../crypto/vault'

/** Pretty JSON of decrypted dreams. The result is plaintext. */
export function buildExport(
  decrypted: { id: string; payload: DreamPayload }[],
  exportedAt: Date = new Date(),
): string {
  return JSON.stringify(
    {
      app: 'dreamlog',
      version: 1,
      exportedAt: exportedAt.toISOString(),
      dreams: decrypted.map((d) => ({ id: d.id, ...d.payload })),
    },
    null,
    2,
  )
}

export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
