import { fileSizeLabel } from '@/lib/care/utils'
import type { MessageAttachment } from '@/lib/care/types'

export function readLocalFile(file: File) {
  if (file.size > 10 * 1024 * 1024) return Promise.reject(new Error('Choose a file smaller than 10 MB.'))
  return new Promise<{ name: string; size: string; url: string; type: string }>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      resolve({
        name: file.name,
        size: fileSizeLabel(file.size),
        url: String(reader.result ?? ''),
        type: file.type,
      })
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function isImageAttachment(file: Pick<MessageAttachment, 'name' | 'url' | 'type'>) {
  if (file.type?.startsWith('image/')) return true
  if (file.url?.startsWith('data:image/')) return true
  return /\.(png|jpe?g|gif|webp|avif)$/i.test(file.name)
}

export function fileCategoryFromName(name: string, type = '') {
  if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif)$/i.test(name)) return 'photo' as const
  if (name.toLowerCase().includes('lab')) return 'labs' as const
  if (name.toLowerCase().includes('diary')) return 'diary' as const
  return 'other' as const
}
