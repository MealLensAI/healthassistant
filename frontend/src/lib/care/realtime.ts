import { getSessionUserId } from '@/lib/care/api'
import type { ChatMessage, Conversation } from '@/lib/care/types'

export type CareRealtimeHandlers = {
  onMessage?: (payload: { message: ChatMessage; conversation?: Conversation }) => void
  onMessageStatus?: (payload: { message: ChatMessage }) => void
  onConversationRead?: (payload: { conversationId: string; readerId: string; readAt?: string }) => void
  onCallEnded?: (payload: { callId: string }) => void
  onReady?: () => void
  onError?: (error: Error) => void
}

function baseUrl() {
  return (import.meta.env.VITE_API_URL as string | undefined) || ''
}

function mainAccessToken() {
  try {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) return ''
    return window.localStorage.getItem('access_token') || ''
  } catch {
    return ''
  }
}

function careStreamUrl() {
  return `${baseUrl()}/api/marketplace/stream`
}

/** Authenticated SSE via fetch (EventSource cannot send Authorization headers). */
export function connectCareRealtime(handlers: CareRealtimeHandlers) {
  const userId = getSessionUserId()
  if (!userId) return () => undefined

  const controller = new AbortController()
  let closed = false
  let retryTimer: number | undefined

  const connect = async () => {
    if (closed) return
    try {
      const response = await fetch(careStreamUrl(), {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          ...(userId ? { 'X-User-Id': userId } : {}),
          ...(mainAccessToken() ? { Authorization: `Bearer ${mainAccessToken()}` } : {}),
        },
        signal: controller.signal,
        cache: 'no-store',
      })
      if (!response.ok || !response.body) {
        throw new Error(`Realtime stream failed (${response.status})`)
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (!closed) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() || ''
        for (const chunk of chunks) {
          const lines = chunk.split('\n')
          let eventType = 'message'
          const dataLines: string[] = []
          for (const line of lines) {
            if (line.startsWith('event:')) eventType = line.slice(6).trim()
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
          }
          if (!dataLines.length) continue
          try {
            const data = JSON.parse(dataLines.join('\n')) as Record<string, unknown>
            if (eventType === 'ready') handlers.onReady?.()
            else if (eventType === 'message') handlers.onMessage?.(data as { message: ChatMessage; conversation?: Conversation })
            else if (eventType === 'message_status') handlers.onMessageStatus?.(data as { message: ChatMessage })
            else if (eventType === 'conversation_read') handlers.onConversationRead?.(data as { conversationId: string; readerId: string; readAt?: string })
            else if (eventType === 'call_ended') handlers.onCallEnded?.(data as { callId: string })
          } catch {
            /* ignore malformed frames */
          }
        }
      }
    } catch (error) {
      if (closed || controller.signal.aborted) return
      handlers.onError?.(error instanceof Error ? error : new Error('Realtime disconnected'))
    }
    if (!closed) {
      retryTimer = window.setTimeout(() => {
        void connect()
      }, 2000)
    }
  }

  void connect()

  return () => {
    closed = true
    controller.abort()
    if (retryTimer) window.clearTimeout(retryTimer)
  }
}
