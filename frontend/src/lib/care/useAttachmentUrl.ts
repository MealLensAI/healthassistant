import { useEffect, useState } from 'react'
import { apiEnabled, resolveCareAsset } from '@/lib/care/api'

/** Resolve chat/file attachment to a browser-openable URL (signed R2 or blob for data:). */
export function useAttachmentUrl(file?: {
  url?: string
  objectKey?: string
  bucket?: string
}) {
  const url = file?.url
  const objectKey = file?.objectKey
  const bucket = file?.bucket
  const [resolved, setResolved] = useState('')

  useEffect(() => {
    let disposed = false
    let objectUrl = ''

    if (url?.startsWith('data:')) {
      void fetch(url)
        .then((response) => response.blob())
        .then((blob) => {
          if (disposed) return
          const previewable = /^(application\/pdf|text\/plain|image\/(png|jpeg|gif|webp|avif))$/i.test(blob.type)
          objectUrl = URL.createObjectURL(
            previewable ? blob : new Blob([blob], { type: 'application/octet-stream' }),
          )
          setResolved(objectUrl)
        })
        .catch(() => setResolved(''))
      return () => {
        disposed = true
        if (objectUrl) URL.revokeObjectURL(objectUrl)
      }
    }

    if (url?.startsWith('http://') || url?.startsWith('https://') || url?.startsWith('blob:')) {
      setResolved(url)
      return
    }

    if (objectKey && apiEnabled()) {
      void resolveCareAsset(bucket || '', objectKey)
        .then((result) => {
          if (!disposed) setResolved(result.url || '')
        })
        .catch(() => {
          if (!disposed) setResolved('')
        })
      return () => {
        disposed = true
      }
    }

    setResolved(url || '')
    return () => {
      disposed = true
    }
  }, [url, objectKey, bucket])

  return resolved
}
