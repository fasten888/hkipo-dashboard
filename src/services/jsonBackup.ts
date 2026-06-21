import { createBackup, importBackup } from './storage'
import type { AppBackup } from '../types/backup'
import type { AppData } from '../types/store'

export function downloadJsonBackup(data: AppData) {
  const backup = createBackup(data)
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `港股打新备份-${backup.exportedAt.slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function readJsonBackup(file: File) {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('文件不是有效的 JSON')
  }
  return importBackup(parsed as AppBackup)
}
