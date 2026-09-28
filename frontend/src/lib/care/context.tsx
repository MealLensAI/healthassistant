import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import { AppContext } from './appContext'
import {
  APPOINTMENTS,
  APPLICATIONS,
  CONSULTATION_REQUESTS,
  CONVERSATIONS,
  DEVICE_SESSIONS,
  DIETITIANS,
  FILES,
  MESSAGES,
  PATIENT_PROFILES,
  PATIENT_SETTINGS,
  PAYMENT_METHODS,
  PAYMENT_QUOTES,
  PAYMENTS,
  USERS,
  MISSED_CALLS,
  NOTIFICATIONS,
} from './data/mock'
import { uid } from '@/lib/care/utils'
import {
  actionPayload,
  apiEnabled,
  bookAppointmentOnServer,
  fetchCarePulse,
  fetchConversationMessages,
  fetchCatalogApplications,
  fetchCatalogDietitians,
  fetchServerState,
  isRemoteAction,
  loginOnServer,
  mergeCarePulse,
  mergeServerPatch,
  mergeServerState,
  postAction,
  registerAccountOnServer,
  sameAppData,
  setSessionUserId,
} from './api'
import { activeCallFromLive } from '@/lib/care/calls'
import { CallRequestGuard, reconcileCallState } from '@/lib/care/callLifecycle'
import { notifyLocalCallEnded } from '@/lib/care/callControls'
import { connectCareRealtime } from '@/lib/care/realtime'
import { mergePatientFiles, mergePatientProfiles, emptyPatientProfile } from '@/lib/care/patients'
import { appReducer, createInitialState, type Action } from '@/lib/care/store'
import type {
  AppState,
  AvailabilitySlot,
  DietitianApplication,
  ExperienceItem,
  PatientAccountSettings,
  PatientProfile,
  SavedPaymentMethod,
} from './types'

const STORAGE_KEY = 'meallensai.v2'

const seedState = createInitialState({
  users: USERS,
  dietitians: DIETITIANS,
  applications: APPLICATIONS,
  conversations: CONVERSATIONS,
  messages: MESSAGES,
  appointments: APPOINTMENTS,
  files: FILES,
  consultationRequests: CONSULTATION_REQUESTS,
  patientProfiles: PATIENT_PROFILES,
  patientSettings: PATIENT_SETTINGS,
  payments: PAYMENTS,
  paymentQuotes: PAYMENT_QUOTES,
  paymentMethods: PAYMENT_METHODS,
  deviceSessions: DEVICE_SESSIONS,
  missedCalls: MISSED_CALLS,
  notifications: NOTIFICATIONS,
})

function loadState(): AppState {
  if (apiEnabled()) {
    try {
      const userId = window.localStorage.getItem('meallensai.session')
      // /admin must not inherit a MealLens patient session as currentUser —
      // that skipped the admin login form with "Admin access required".
      const onAdminRoute = window.location.pathname.startsWith('/admin')
      const currentUser =
        userId && !onAdminRoute
          ? ({
              id: userId,
              name: 'Member',
              email: '',
              role: 'patient',
              avatar: '',
            } as AppState['currentUser'])
          : null
      const emptyState = createInitialState({ currentUser })
      return {
        ...emptyState,
        currentUser,
        toasts: [],
        liveCalls: [],
        activeCall: null,
      }
    } catch {
      return { ...createInitialState(), currentUser: null, toasts: [], activeCall: null }
    }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedState
    const parsed = JSON.parse(raw) as Partial<AppState> & { mealPlans?: unknown }
    const { mealPlans: _droppedMealPlans, ...stored } = parsed
    void _droppedMealPlans
    const currentUser = (() => {
        if (!parsed.currentUser) return null
        const user = parsed.users?.find((item) => item.id === parsed.currentUser?.id) ?? parsed.currentUser
        const listing = (parsed.dietitians?.length ? parsed.dietitians : seedState.dietitians).find(
          (item) => item.userId === user.id,
        )
        if (!listing) return user
        return {
          ...user,
          name: listing.name,
          avatar: user.avatar || listing.avatar,
          country: listing.country,
          title: listing.title,
        }
      })()
    const liveCalls = parsed.liveCalls ?? seedState.liveCalls
    return {
      ...seedState,
      ...stored,
      users: parsed.users ?? seedState.users,
      toasts: [],
      liveCalls,
      activeCall: activeCallFromLive(currentUser?.id, liveCalls),
      currentUser,
      patientProfiles: mergePatientProfiles(parsed.patientProfiles, seedState.patientProfiles),
      files: mergePatientFiles(parsed.files, seedState.files),
      patientSettings: parsed.patientSettings ?? seedState.patientSettings,
      payments: parsed.payments ?? seedState.payments,
      paymentQuotes: parsed.paymentQuotes ?? seedState.paymentQuotes,
      paymentMethods: parsed.paymentMethods ?? seedState.paymentMethods,
      deviceSessions: parsed.deviceSessions ?? seedState.deviceSessions,
      missedCalls: parsed.missedCalls ?? seedState.missedCalls,
      notifications: parsed.notifications ?? seedState.notifications,
      dietitians: parsed.dietitians?.length ? parsed.dietitians : seedState.dietitians,
    }
  } catch {
    return seedState
  }
}

export interface AppContextValue extends AppState {
  refreshCare: () => Promise<void>
  dispatch: (action: Action) => Promise<boolean>
  login: (userId: string) => void
  registerAccount: (details: {
    name: string
    email: string
    phone?: string
    country?: string
    role: 'patient' | 'dietitian'
    condition?: string
    allergies?: string
    goal?: string
  }) => Promise<boolean>
  logout: () => void
  toast: (type: 'success' | 'error' | 'info', message: string) => void
  sendMessage: (
    conversationId: string,
    text: string,
    attachments?: { name: string; size: string; url?: string; type?: string; objectKey?: string; bucket?: string; sizeBytes?: number }[],
    peerId?: string,
  ) => Promise<void>
  retryMessage: (messageId: string) => Promise<void>
  sendPeerMessage: (conversationId: string, senderId: string, text: string) => void
  openConversation: (dietitianUserId: string, dietitianName: string) => Promise<string>
  deleteConversation: (conversationId: string) => Promise<boolean>
  bookAppointment: (
    dietitianId: string,
    date: string,
    time: string,
    topic: string,
    kind: 'video' | 'chat',
  ) => Promise<boolean>
  cancelAppointment: (appointmentId: string) => Promise<boolean>
  requestConsultation: (dietitianId: string, note: string) => void
  respondConsultation: (id: string, status: 'accepted' | 'declined') => Promise<boolean>
  uploadFile: (file: { name: string; category: 'labs' | 'diary' | 'photo' | 'other'; size: string; sharedWithId?: string; url?: string; objectKey?: string; bucket?: string; mimeType?: string; sizeBytes?: number }) => void
  submitApplication: (application: Omit<DietitianApplication, 'id' | 'submittedAt' | 'adminNotes' | 'status'> & { status?: DietitianApplication['status'] }) => Promise<boolean>
  updateAvailability: (dietitianId: string, availability: AvailabilitySlot[]) => void
  approveApplication: (applicationId: string) => void
  requestMoreInfo: (applicationId: string, message: string) => void
  deleteApplication: (applicationId: string) => Promise<boolean>
  startCall: (conversationId: string, peerId: string, peerName: string, peerAvatar: string) => Promise<boolean>
  answerCall: () => Promise<boolean>
  endCall: () => Promise<boolean>
  dismissCall: (callId: string) => void
  payQuote: (quoteId: string, methodId: string) => void
  addPaymentMethod: (method: Omit<SavedPaymentMethod, 'id' | 'patientId'>) => void
  savePatientProfile: (profile: PatientProfile) => void
  savePatientSettings: (settings: PatientAccountSettings) => void
  endSession: (sessionId: string) => void
  setFileShare: (dietitianUserId: string, granted: boolean) => void
  setFileAccessBlock: (dietitianUserId: string, blocked: boolean) => void
  setDefaultPaymentMethod: (methodId: string) => void
  updateDietitianProfile: (dietitianId: string, experience: ExperienceItem[]) => void
  addReview: (dietitianId: string, rating: number, text: string) => void
  deleteReview: (dietitianId: string) => void
  markMissedCallsSeen: () => void
  markConversationRead: (conversationId: string) => void
  markNotificationRead: (id: string) => void
  markNotificationsRead: () => void
  saveAccount: (
    details: {
      name?: string
      email?: string
      phone?: string
      country?: string
      workplace?: string
      title?: string
      bio?: string
      yearsExperience?: number
      specialties?: string[]
      languages?: string[]
      avatar?: string
      coverImage?: string
    },
    message?: string,
  ) => Promise<void>
}

function parseApiError(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { detail?: string }
    if (parsed.detail) return parsed.detail
  } catch {
    /* keep raw */
  }
  return raw || 'Could not create that account.'
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, reduce] = useReducer(appReducer, undefined, loadState)
  const stateRef = useRef(state)
  const statePollInFlight = useRef(false)
  const endedCallIds = useRef(new Set<string>())
  const pendingCallStarts = useRef(new Set<string>())
  const pendingCallRequests = useRef(new Map<string, ReturnType<typeof postAction>>())
  const callRequests = useRef(new CallRequestGuard())
  stateRef.current = state

  const reconcileCalls = useCallback((next: AppState) => (
    reconcileCallState(stateRef.current, next, endedCallIds.current, pendingCallStarts.current)
  ), [])

  const dismissCall = useCallback((callId: string) => {
    if (!callId) return
    endedCallIds.current.add(callId)
    pendingCallStarts.current.delete(callId)
    callRequests.current.changed()
    const next = reconcileCalls(stateRef.current)
    stateRef.current = next
    reduce({ type: 'HYDRATE', state: next })
  }, [reconcileCalls])

  const hydrateFromServer = useCallback((server: Parameters<typeof mergeServerState>[1], requestedCallVersion: number) => {
    const protectedServer = callRequests.current.protect(server, stateRef.current.liveCalls, requestedCallVersion)
    const next = reconcileCalls(mergeServerState(stateRef.current, protectedServer))
    if (sameAppData(stateRef.current, next)) return
    stateRef.current = next
    reduce({ type: 'HYDRATE', state: next })
  }, [reconcileCalls])

  const refreshCare = useCallback(async () => {
    if (!apiEnabled()) return
    const userId = stateRef.current.currentUser?.id
    if (!userId) return
    const requestedCallVersion = callRequests.current.capture()
    const server = await fetchServerState()
    if (stateRef.current.currentUser?.id === userId) hydrateFromServer(server, requestedCallVersion)
  }, [hydrateFromServer])

  const applyServerPatch = useCallback((response: Parameters<typeof mergeServerPatch>[1]) => {
    const next = reconcileCalls(mergeServerPatch(stateRef.current, response))
    if (sameAppData(stateRef.current, next)) return
    stateRef.current = next
    reduce({ type: 'HYDRATE', state: next })
  }, [reconcileCalls])

  const applyPulse = useCallback((pulse: Parameters<typeof mergeCarePulse>[1]) => {
    const next = reconcileCalls(mergeCarePulse(stateRef.current, pulse))
    const previousCallId = stateRef.current.activeCall?.callId
    if (previousCallId && !next.liveCalls.some((call) => call.id === previousCallId)) {
      endedCallIds.current.add(previousCallId)
    }
    if (sameAppData(stateRef.current, next)) return
    stateRef.current = next
    reduce({ type: 'HYDRATE', state: next })
  }, [reconcileCalls])

  const dispatch = useCallback(async (action: Action): Promise<boolean> => {
    const callAction = action.type === 'START_CALL' || action.type === 'ANSWER_CALL' || action.type === 'END_CALL'
    const callId = action.type === 'START_CALL' ? action.call.callId : stateRef.current.activeCall?.callId
    if (action.type === 'END_CALL' && !action.callId && !callId) return true
    if (callAction) callRequests.current.changed()
    if (action.type === 'END_CALL' && (action.callId || callId)) {
      action = { ...action, callId: action.callId || callId }
      // Notify the media channel before the local reducer tears down the peer.
      notifyLocalCallEnded(action.callId!)
      endedCallIds.current.add(action.callId!)
      pendingCallStarts.current.delete(action.callId!)
    }
    if (apiEnabled() && isRemoteAction(action)) {
      // Call lifecycle must apply locally first so WebRTC can open media without
      // waiting on a slow Supabase rewrite (and so the peer rings immediately).
      if (action.type === 'START_CALL' && callId) pendingCallStarts.current.add(callId)
      const optimisticLocal =
        callAction ||
        action.type === 'CANCEL_APPOINTMENT' ||
        action.type === 'DELETE_APPOINTMENT'
      if (optimisticLocal) {
        stateRef.current = appReducer(stateRef.current, action)
        reduce({ type: 'HYDRATE', state: stateRef.current })
      }
      const requestedCallVersion = callRequests.current.capture()
      try {
        if (action.type === 'END_CALL' && action.callId) {
          // A quick cancel must arrive after START has created the server row.
          await pendingCallRequests.current.get(action.callId)?.catch(() => undefined)
        }
        const request = postAction(action.type, actionPayload(action))
        if (action.type === 'START_CALL' && callId) pendingCallRequests.current.set(callId, request)
        const server = await request
        const acceptCalls = callAction
          ? callRequests.current.acknowledged(requestedCallVersion)
          : callRequests.current.isCurrent(requestedCallVersion)
        if (action.type === 'START_CALL' && callId) pendingCallStarts.current.delete(callId)
        applyServerPatch(acceptCalls ? server : {
          ...server,
          patch: { ...server.patch, liveCalls: undefined },
        })
        return true
      } catch (error) {
        if (action.type === 'START_CALL' || action.type === 'ANSWER_CALL') {
          if (callId) dismissCall(callId)
        }
        if (!['MARK_CONVERSATION_READ', 'MARK_NOTIFICATION_READ', 'MARK_NOTIFICATIONS_READ', 'MARK_MISSED_CALLS_SEEN'].includes(action.type)) {
          reduce({ type: 'ADD_TOAST', toast: { type: 'error', message: error instanceof Error ? error.message : 'Could not save that change to the server.' } })
        }
        return false
      } finally {
        if (action.type === 'START_CALL' && callId) {
          pendingCallStarts.current.delete(callId)
          pendingCallRequests.current.delete(callId)
        }
      }
    }
    reduce(action)
    return true
  }, [applyServerPatch, dismissCall])

  useEffect(() => {
    if (!apiEnabled()) return
    // Don't poll/hydrate until the care session user id is known — anonymous
    // /state responses were wiping booked appointments and blanking the inbox.
    if (!state.currentUser?.id) return
    let cancelled = false
    const refreshCatalog = async () => {
      const [dietitiansRes, applicationsRes] = await Promise.all([
        fetchCatalogDietitians().catch(() => null),
        stateRef.current.currentUser?.role === 'patient' ? Promise.resolve(null) : fetchCatalogApplications().catch(() => null),
      ])
      if (cancelled) return
      const current = stateRef.current
      const viewerId = current.currentUser?.id
      let dietitians = dietitiansRes?.dietitians ?? current.dietitians
      // Don't blank the specialist's own cover/avatar if catalog momentarily omits them.
      if (viewerId && dietitiansRes?.dietitians) {
        const localMine = current.dietitians.find((item) => item.userId === viewerId)
        const catalogMine = dietitians.find((item) => item.userId === viewerId)
        if (localMine && !catalogMine) {
          dietitians = [...dietitians, localMine]
        } else if (localMine && catalogMine) {
          dietitians = dietitians.map((item) =>
            item.userId === viewerId
              ? {
                  ...item,
                  avatar: item.avatar || localMine.avatar,
                  coverImage: item.coverImage || localMine.coverImage,
                }
              : item,
          )
        }
      }
      const next = {
        ...current,
        dietitians,
        applications: applicationsRes?.applications ?? current.applications,
      }
      if (!sameAppData(current, next)) {
        stateRef.current = next
        reduce({ type: 'HYDRATE', state: next })
      }
    }
    void refreshCatalog()
    const requestedCallVersion = callRequests.current.capture()
    void fetchServerState()
      .then((server) => {
        if (cancelled) return
        hydrateFromServer(server, requestedCallVersion)
      })
      .catch(() => undefined)
    // Re-read catalog from Supabase so admin deletes show up without a full reload.
    const catalogTimer = window.setInterval(() => {
      void refreshCatalog()
    }, 15_000)
    return () => {
      cancelled = true
      window.clearInterval(catalogTimer)
    }
  }, [hydrateFromServer, state.currentUser?.id])

  useEffect(() => {
    if (!apiEnabled() || !state.currentUser) return
    // Pulse only: inbox headers + live calls + notifications. Never re-download the catalog.
    const timer = window.setInterval(() => {
      if (statePollInFlight.current) return
      statePollInFlight.current = true
      const requestedCallVersion = callRequests.current.capture()
      void fetchCarePulse()
        .then((pulse) => {
          // A request started before START/ANSWER/END cannot undo that action.
          applyPulse(callRequests.current.protect(pulse, stateRef.current.liveCalls, requestedCallVersion))
        })
        .catch(() => undefined)
        .finally(() => { statePollInFlight.current = false })
    }, state.activeCall ? 2000 : 5000)
    return () => window.clearInterval(timer)
  }, [applyPulse, state.currentUser?.id, Boolean(state.activeCall)])

  // Instant chat delivery over authenticated SSE (not the 5s pulse).
  useEffect(() => {
    if (!apiEnabled() || !state.currentUser?.id) return
    const myId = state.currentUser.id
    const deliveredBuffer = new Set<string>()
    let flushTimer: number | undefined
    const flushDelivered = () => {
      const ids = [...deliveredBuffer]
      deliveredBuffer.clear()
      if (!ids.length) return
      void postAction('MARK_MESSAGE_DELIVERED', { messageIds: ids }).catch(() => undefined)
    }
    const disconnect = connectCareRealtime({
      onCallEnded: ({ callId }) => dismissCall(callId),
      onMessage: ({ message, conversation }) => {
        if (!message?.id) return
        reduce({
          type: 'UPSERT_MESSAGE',
          message: { ...message, status: message.status || 'sent' },
        })
        if (conversation?.id) {
          applyServerPatch({ patch: { conversations: [conversation] } })
        }
        if (message.senderId && message.senderId !== myId) {
          deliveredBuffer.add(message.id)
          if (flushTimer) window.clearTimeout(flushTimer)
          flushTimer = window.setTimeout(flushDelivered, 120)
        }
      },
      onMessageStatus: ({ message }) => {
        if (!message?.id) return
        reduce({
          type: 'UPDATE_MESSAGE_STATUS',
          messageId: message.id,
          status: (message.status as 'sent' | 'delivered' | 'read') || 'sent',
          deliveredAt: message.deliveredAt,
          readAt: message.readAt,
        })
      },
      onConversationRead: ({ conversationId, readerId, readAt }) => {
        if (!conversationId || !readerId || readerId === myId) return
        const stamp = readAt || new Date().toISOString()
        for (const message of stateRef.current.messages) {
          if (message.conversationId !== conversationId) continue
          if (message.senderId !== myId) continue
          reduce({
            type: 'UPDATE_MESSAGE_STATUS',
            messageId: message.id,
            status: 'read',
            readAt: stamp,
            deliveredAt: message.deliveredAt || stamp,
          })
        }
      },
    })
    return () => {
      if (flushTimer) window.clearTimeout(flushTimer)
      disconnect()
    }
  }, [applyServerPatch, dismissCall, state.currentUser?.id])

  useEffect(() => {
    if (!apiEnabled() || !state.currentUser?.id) return
    let cancelled = false
    const seen = new Map<string, string>()
    let inFlight = false
    const refresh = async () => {
      if (inFlight) return
      inFlight = true
      try {
        const conversations = stateRef.current.conversations.filter((item) => item.participantIds.includes(state.currentUser!.id))
        for (const conversation of conversations) {
          if (cancelled) return
          if (seen.get(conversation.id) === conversation.lastAt) continue
          try {
            const response = await fetchConversationMessages(conversation.id, { limit: 100 })
            if (cancelled) return
            applyServerPatch({ patch: { messages: response.messages } })
            seen.set(conversation.id, conversation.lastAt)
          } catch { /* Retry on the next poll. */ }
        }
      } finally { inFlight = false }
    }
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 2000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [state.currentUser?.id, applyServerPatch])

  useEffect(() => {
    if (apiEnabled()) return
    const { toasts: _toasts, activeCall: _call, ...persistable } = state
    void _toasts
    void _call
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable))
  }, [state])

  const toastTimers = useRef(new Map<string, number>())
  useEffect(() => {
    const timers = toastTimers.current
    for (const item of state.toasts) {
      if (!timers.has(item.id)) timers.set(item.id, window.setTimeout(() => reduce({ type: 'REMOVE_TOAST', id: item.id }), 5000))
    }
    for (const [id, timer] of timers) {
      if (!state.toasts.some((item) => item.id === id)) { window.clearTimeout(timer); timers.delete(id) }
    }
  }, [state.toasts])
  useEffect(() => {
    const timers = toastTimers.current
    return () => { timers.forEach(window.clearTimeout); timers.clear() }
  }, [])

  const toast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    reduce({ type: 'ADD_TOAST', toast: { type, message } })
  }, [])

  const login = useCallback(
    (userId: string) => {
      if (apiEnabled()) {
        void loginOnServer(userId)
          .then(async ({ user }) => {
            const requestedCallVersion = callRequests.current.capture()
            const server = await fetchServerState()
            hydrateFromServer({ ...server, currentUser: user }, requestedCallVersion)
            toast('success', `Signed in as ${user.name}`)
          })
          .catch(() => {
            toast('error', 'Could not reach the API. Start the Python backend on port 8000.')
          })
        return
      }
      const user = state.users.find((item) => item.id === userId)
      if (!user) return
      dispatch({ type: 'LOGIN', user })
      toast('success', `Signed in as ${user.name}`)
    },
    [hydrateFromServer, state.users, toast],
  )

  const registerAccount = useCallback(
    async (details: {
      name: string
      email: string
      phone?: string
      country?: string
      role: 'patient' | 'dietitian'
      condition?: string
      allergies?: string
      goal?: string
    }) => {
      const name = details.name.trim()
      const email = details.email.trim().toLowerCase()
      const phone = details.phone?.trim()
      const country = details.country?.trim()
      const profile =
        details.role === 'patient'
          ? emptyPatientProfile('pending', name, {
              phone: phone ?? '',
              conditions: [{ name: details.condition?.trim() || '', diagnosed: '', physician: '', clinic: '' }],
              allergies: details.allergies
                ?.split(',')
                .map((item) => item.trim())
                .filter(Boolean) ?? [],
              dietPreferences: details.goal?.trim() ? [details.goal.trim()] : [],
            })
          : undefined
      if (apiEnabled()) {
        try {
          const { user } = await registerAccountOnServer({
            name,
            email,
            phone,
            country,
            role: details.role,
            profile: profile ? { ...profile, userId: '' } : undefined,
          })
          const requestedCallVersion = callRequests.current.capture()
          const server = await fetchServerState()
          hydrateFromServer({ ...server, currentUser: user }, requestedCallVersion)
          toast(
            'success',
            details.role === 'dietitian'
              ? `Welcome, ${user.name}. Upload your documents so admin can verify you.`
              : `Welcome, ${user.name}. Your care workspace is ready.`,
          )
          return true
        } catch (error) {
          toast('error', error instanceof Error ? parseApiError(error.message) : 'Could not create that account.')
          return false
        }
      }
      if (state.users.some((item) => item.email.toLowerCase() === email)) {
        toast('error', 'That email is already registered')
        return false
      }
      const user = {
        id: uid('user'),
        name,
        email,
        role: details.role,
        avatar: '',
        country: country || undefined,
        phone: phone || undefined,
        title: details.role === 'dietitian' ? 'Dietitian' : undefined,
      }
      dispatch({
        type: 'REGISTER_USER',
        user,
        profile: profile ? { ...profile, userId: user.id } : undefined,
      })
      toast(
        'success',
        details.role === 'dietitian'
          ? `Welcome, ${user.name}. Upload your documents so admin can verify you.`
          : `Welcome, ${user.name}. Your care workspace is ready.`,
      )
      return true
    },
    [hydrateFromServer, state.users, toast],
  )

  const logout = useCallback(() => {
    setSessionUserId(null)
    dispatch({ type: 'LOGOUT' })
  }, [dispatch])

  const sendMessage = useCallback(
    async (
      conversationId: string,
      text: string,
      attachments?: { name: string; size: string; url?: string; type?: string; objectKey?: string; bucket?: string; sizeBytes?: number }[],
      peerId?: string,
      existingMessageId?: string,
    ) => {
      if (!state.currentUser) throw new Error('Your care session is still loading.')
      const messageId = existingMessageId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : uid('msg'))
      // Paint immediately (pending), then sync in the background.
      reduce({
        type: 'SEND_MESSAGE',
        conversationId,
        senderId: state.currentUser.id,
        text,
        attachments,
        messageId,
        status: 'pending',
      })
      if (!apiEnabled()) {
        reduce({ type: 'UPDATE_MESSAGE_STATUS', messageId, status: 'sent' })
        return
      }
      try {
        const { ensureCareAccount, readHealthAppUser } = await import('@/lib/care/embeddedAuth')
        if (readHealthAppUser()) await ensureCareAccount()
        const server = await postAction('SEND_MESSAGE', {
          conversationId,
          senderId: state.currentUser.id,
          text,
          attachments,
          messageId,
          ...(peerId ? { peerId } : {}),
        })
        reduce({ type: 'UPDATE_MESSAGE_STATUS', messageId, status: 'sent' })
        applyServerPatch(server)
      } catch (error) {
        reduce({ type: 'UPDATE_MESSAGE_STATUS', messageId, status: 'failed' })
        throw error
      }
    },
    [state.currentUser, applyServerPatch],
  )

  const retryMessage = useCallback(
    async (messageId: string) => {
      const message = stateRef.current.messages.find((item) => item.id === messageId)
      const me = stateRef.current.currentUser
      if (!message || !me || message.senderId !== me.id) return
      const peerId = stateRef.current.conversations
        .find((item) => item.id === message.conversationId)
        ?.participantIds.find((id) => id !== me.id)
      reduce({ type: 'UPDATE_MESSAGE_STATUS', messageId, status: 'pending' })
      try {
        await sendMessage(
          message.conversationId,
          message.text,
          message.attachments,
          peerId,
          message.id,
        )
      } catch {
        reduce({ type: 'UPDATE_MESSAGE_STATUS', messageId, status: 'failed' })
      }
    },
    [sendMessage],
  )

  const sendPeerMessage = useCallback((conversationId: string, senderId: string, text: string) => {
    dispatch({ type: 'SEND_MESSAGE', conversationId, senderId, text })
  }, [])

  const bookAppointment = useCallback(
    async (dietitianId: string, date: string, time: string, topic: string, kind: 'video' | 'chat') => {
      if (!state.currentUser) {
        toast('error', 'Your care session is still loading. Try booking again in a moment.')
        return false
      }
      // Match meallensaidieticnafrontend: persist via dedicated appointments API, then hydrate.
      if (apiEnabled()) {
        try {
          const { ensureCareAccount, readHealthAppUser } = await import('@/lib/care/embeddedAuth')
          if (readHealthAppUser()) await ensureCareAccount()
          const server = await bookAppointmentOnServer({ dietitianId, date, time, topic, kind })
          applyServerPatch(server)
          toast('success', `Appointment booked for ${date} at ${time}.`)
          return true
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Could not book that appointment.'
          toast('error', message.includes('Sign in') ? 'Sign in again to book an appointment.' : 'Could not book that appointment. Please try again.')
          return false
        }
      }
      reduce({
        type: 'ADD_APPOINTMENT',
        patientId: state.currentUser.id,
        dietitianId,
        date,
        time,
        topic,
        kind,
      })
      toast('success', `Appointment booked for ${date} at ${time}.`)
      return true
    },
    [state.currentUser, toast, applyServerPatch],
  )

  const cancelAppointment = useCallback(async (appointmentId: string) => {
    // Keep the row mounted so the Delete button can spin until the server confirms.
    if (!apiEnabled()) {
      reduce({ type: 'CANCEL_APPOINTMENT', appointmentId, status: 'deleted' })
      toast('info', 'Appointment deleted.')
      return true
    }
    try {
      const { cancelAppointmentOnServer } = await import('@/lib/care/api')
      const server = await cancelAppointmentOnServer(appointmentId)
      applyServerPatch(server)
      toast('info', 'Appointment deleted.')
      return true
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Could not delete that appointment.')
      return false
    }
  }, [applyServerPatch, toast])

  const openConversation = useCallback(
    async (peerUserId: string, peerName: string) => {
      if (!state.currentUser) return ''
      const existing = stateRef.current.conversations.find(
        (conversation) =>
          conversation.participantIds.includes(state.currentUser!.id) &&
          conversation.participantIds.includes(peerUserId) &&
          !String(conversation.id).startsWith('conv-'),
      )
      if (existing) return existing.id
      const iAmDietitian = state.currentUser.role === 'dietitian'
      const patientId = iAmDietitian ? peerUserId : state.currentUser.id
      const dietitianUserId = iAmDietitian ? state.currentUser.id : peerUserId
      const dietitianName = iAmDietitian ? state.currentUser.name : peerName
      const { conversationIdFor } = await import('@/lib/care/calls')
      const localId = conversationIdFor(patientId, dietitianUserId)
      if (!apiEnabled()) reduce({
        type: 'ENSURE_CONVERSATION',
        patientId,
        dietitianUserId,
        dietitianName,
      })
      if (apiEnabled()) {
        try {
          const server = await postAction('ENSURE_CONVERSATION', { patientId, dietitianUserId, dietitianName })
          applyServerPatch(server)
          const fromPatch = (server.patch?.conversations || []).find(
            (item) =>
              item.participantIds?.includes(patientId) && item.participantIds?.includes(dietitianUserId),
          )
          if (fromPatch?.id) return fromPatch.id
          const after = stateRef.current.conversations.find(
            (conversation) =>
              conversation.participantIds.includes(patientId) &&
              conversation.participantIds.includes(dietitianUserId) &&
              !String(conversation.id).startsWith('conv-'),
          )
          if (after) return after.id
        } catch (error) {
          toast('error', error instanceof Error ? error.message : 'Could not open this conversation.')
          return ''
        }
      }
      return localId
    },
    [state.currentUser, applyServerPatch],
  )

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      if (!state.currentUser) return false
      const action: Action = {
        type: 'DELETE_CONVERSATION',
        conversationId,
        userId: state.currentUser.id,
      }
      reduce(action)
      if (apiEnabled()) {
        try {
          const server = await postAction(action.type, actionPayload(action))
          applyServerPatch(server)
        } catch {
          toast('error', 'Could not delete that conversation.')
          const requestedCallVersion = callRequests.current.capture()
          void fetchServerState().then((snapshot) => hydrateFromServer(snapshot, requestedCallVersion)).catch(() => undefined)
          return false
        }
      }
      toast('info', 'Conversation removed from your inbox.')
      return true
    },
    [state.currentUser, applyServerPatch, hydrateFromServer, toast],
  )

  const requestConsultation = useCallback(
    async (dietitianId: string, note: string) => {
      if (!state.currentUser) return
      const saved = await dispatch({
        type: 'REQUEST_CONSULTATION',
        request: {
          patientId: state.currentUser.id,
          dietitianId,
          status: 'pending',
          createdAt: new Date().toISOString(),
          note,
        },
      })
      if (saved) toast('success', 'Consultation requested. The dietitian will respond shortly.')
    },
    [state.currentUser, toast],
  )

  const respondConsultation = useCallback(
    async (id: string, status: 'accepted' | 'declined') => {
      const saved = await dispatch({ type: 'RESPOND_CONSULTATION', id, status })
      if (saved) toast(status === 'accepted' ? 'success' : 'info', status === 'accepted' ? 'Consultation accepted.' : 'Request declined.')
      return saved
    },
    [toast],
  )

  const uploadFile = useCallback(
    async (file: { name: string; category: 'labs' | 'diary' | 'photo' | 'other'; size: string; sharedWithId?: string; url?: string; objectKey?: string; bucket?: string; mimeType?: string; sizeBytes?: number }) => {
      if (!state.currentUser) return
      // Auto-share with the patient's linked dietitian so charts are not empty.
      let sharedWithId = file.sharedWithId
      if (!sharedWithId && state.currentUser.role === 'patient') {
        const fromAppointment = state.appointments.find(
          (item) => item.patientId === state.currentUser!.id && item.status === 'upcoming',
        )
        const listing = fromAppointment
          ? state.dietitians.find((item) => item.id === fromAppointment.dietitianId)
          : state.dietitians.find((item) =>
              state.conversations.some(
                (conversation) =>
                  conversation.participantIds.includes(state.currentUser!.id) &&
                  conversation.participantIds.includes(item.userId),
              ),
            )
        sharedWithId = listing?.userId
      }
      const saved = await dispatch({
        type: 'UPLOAD_FILE',
        file: {
          ownerId: state.currentUser.id,
          name: file.name,
          category: file.category,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          sharedWithId,
          url: file.url,
          objectKey: file.objectKey,
          bucket: file.bucket,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
        },
      })
      if (saved) toast('success', `${file.name} uploaded.`)
    },
    [state.currentUser, state.appointments, state.dietitians, state.conversations, toast],
  )

  const submitApplication = useCallback(
    async (application: Omit<DietitianApplication, 'id' | 'submittedAt' | 'adminNotes' | 'status'> & { status?: DietitianApplication['status'] }) => {
      if (!state.currentUser) return false
      const payload: DietitianApplication = {
        ...application,
        id: crypto.randomUUID(),
        userId: state.currentUser.id,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        adminNotes: [],
      }
      if (apiEnabled()) {
        try {
          const server = await postAction('SUBMIT_APPLICATION', { application: payload })
          applyServerPatch(server)
          // Refresh catalogs so admin + this dietitian see the persisted Supabase row.
          try {
            const [apps, diets] = await Promise.all([fetchCatalogApplications(), fetchCatalogDietitians()])
            dispatch({
              type: 'HYDRATE',
              state: {
                ...stateRef.current,
                applications: apps.applications,
                dietitians: diets.dietitians,
              },
            })
          } catch {
            /* patch already applied */
          }
        } catch (error) {
          toast('error', error instanceof Error ? error.message : 'Your application was not saved. Please try submitting again.')
          return false
        }
      } else {
        dispatch({ type: 'SUBMIT_APPLICATION', application: payload })
      }
      toast('success', 'Application submitted for admin verification.')
      return true
    },
    [state.currentUser, dispatch, applyServerPatch, toast],
  )

  const updateAvailability = useCallback(
    async (dietitianId: string, availability: AvailabilitySlot[]) => {
      if (apiEnabled()) {
        try {
          const server = await postAction('UPDATE_AVAILABILITY', { dietitianId, availability })
          applyServerPatch(server)
          toast('success', 'Availability saved.')
        } catch (error) {
          toast('error', error instanceof Error ? error.message : 'Could not save availability.')
        }
        return
      }
      dispatch({ type: 'UPDATE_AVAILABILITY', dietitianId, availability })
      toast('success', 'Availability saved.')
    },
    [dispatch, applyServerPatch, toast],
  )

  const approveApplication = useCallback(
    async (applicationId: string) => {
      const reviewer = state.currentUser?.name ?? 'Admin'
      if (apiEnabled()) {
        try {
          const server = await postAction('APPROVE_APPLICATION', { applicationId, reviewer })
          applyServerPatch(server)
          try {
            const [apps, diets] = await Promise.all([fetchCatalogApplications(), fetchCatalogDietitians()])
            dispatch({
              type: 'HYDRATE',
              state: {
                ...stateRef.current,
                applications: apps.applications,
                dietitians: diets.dietitians,
              },
            })
          } catch {
            /* patch already applied */
          }
        } catch (error) {
          toast('error', error instanceof Error ? error.message : 'Approval was not saved. Please try again.')
          return
        }
      } else {
        dispatch({ type: 'APPROVE_APPLICATION', applicationId, reviewer })
      }
      toast('success', 'Dietitian approved and now visible to patients.')
    },
    [state.currentUser, dispatch, applyServerPatch, toast],
  )

  const requestMoreInfo = useCallback(
    (applicationId: string, message: string) => {
      dispatch({
        type: 'REQUEST_MORE_INFO',
        applicationId,
        message,
        reviewer: state.currentUser?.name ?? 'Admin',
      })
      toast('info', 'More information requested from the applicant.')
    },
    [state.currentUser, toast],
  )

  const deleteApplicationRecord = useCallback(
    async (applicationId: string) => {
      if (apiEnabled()) {
        try {
          const { deleteApplication } = await import('@/lib/care/api')
          const server = await deleteApplication(applicationId)
          applyServerPatch(server)
          // Authoritative catalog refresh so deleted apps never linger.
          try {
            const { fetchCatalogApplications, fetchCatalogDietitians } = await import('@/lib/care/api')
            const [apps, diets] = await Promise.all([fetchCatalogApplications(), fetchCatalogDietitians()])
            dispatch({ type: 'HYDRATE', state: { ...stateRef.current, applications: apps.applications, dietitians: diets.dietitians } })
          } catch {
            /* patch already applied */
          }
        } catch {
          toast('error', 'Could not delete this application. Please try again.')
          return false
        }
      } else {
        dispatch({ type: 'DELETE_APPLICATION', applicationId })
      }
      toast('success', 'Application removed from the verification queue.')
      return true
    },
    [applyServerPatch, dispatch, toast],
  )

  const startCall = useCallback(
    async (conversationId: string, peerId: string, peerName: string, peerAvatar: string) => {
      if (state.activeCall?.incoming && (state.activeCall.peerId === peerId || !peerId)) {
        return dispatch({ type: 'ANSWER_CALL' })
      }
      const callId = uid('call')
      return dispatch({
        type: 'START_CALL',
        call: { conversationId, peerId, peerName, peerAvatar, status: 'ringing', callId },
      })
    },
    [state.activeCall, dispatch],
  )

  // Client-side missed-call timeout if pulse expiry is delayed.
  useEffect(() => {
    if (!state.activeCall || state.activeCall.status !== 'ringing' || state.activeCall.incoming) return
    const timer = window.setTimeout(() => {
      if (stateRef.current.activeCall?.callId === state.activeCall?.callId && stateRef.current.activeCall?.status === 'ringing') {
        dispatch({ type: 'END_CALL' })
        toast('info', 'Call not answered — marked as missed.')
      }
    }, 45_000)
    return () => window.clearTimeout(timer)
  }, [state.activeCall?.callId, state.activeCall?.status, state.activeCall?.incoming, toast])

  const answerCall = useCallback(() => {
    return dispatch({ type: 'ANSWER_CALL' })
  }, [dispatch])

  const endCall = useCallback(() => {
    return dispatch({ type: 'END_CALL' })
  }, [dispatch])

  const payQuote = useCallback(
    (quoteId: string, methodId: string) => {
      if (!state.currentUser) return
      const quote = state.paymentQuotes.find((item) => item.id === quoteId)
      const method = state.paymentMethods.find((item) => item.id === methodId)
      if (!quote || quote.status === 'paid' || !method) return
      const methodLabel = method.last4 ? `${method.label} •${method.last4}` : method.label
      dispatch({
        type: 'ADD_PAYMENT',
        payment: {
          patientId: state.currentUser.id,
          quoteId: quote.id,
          amount: quote.amount,
          currency: quote.currency,
          method: methodLabel,
          description: quote.title,
        },
      })
      toast('success', `Paid ${quote.title}. Receipt saved.`)
    },
    [state.currentUser, state.paymentQuotes, state.paymentMethods, toast],
  )

  const savePatientProfile = useCallback(
    async (profile: PatientProfile) => {
      const saved = await dispatch({ type: 'UPDATE_PATIENT_PROFILE', profile })
      if (saved) toast('success', 'Clinical profile saved.')
    },
    [toast],
  )

  const savePatientSettings = useCallback(
    async (settings: PatientAccountSettings) => {
      const saved = await dispatch({ type: 'UPDATE_PATIENT_SETTINGS', settings })
      if (saved) toast('success', 'Settings saved.')
    },
    [toast],
  )

  const endSession = useCallback(
    (sessionId: string) => {
      dispatch({ type: 'END_SESSION', sessionId })
      toast('info', 'Signed out of that device.')
    },
    [toast],
  )

  const setFileShare = useCallback(
    async (dietitianUserId: string, granted: boolean) => {
      if (!state.currentUser) return
      const saved = await dispatch({
        type: 'SET_FILE_SHARE',
        ownerId: state.currentUser.id,
        dietitianUserId,
        granted,
      })
      if (saved) toast(granted ? 'success' : 'info', granted ? 'File access granted.' : 'File access revoked.')
    },
    [state.currentUser, toast],
  )

  const setFileAccessBlock = useCallback(
    async (dietitianUserId: string, blocked: boolean) => {
      if (!state.currentUser) return
      const saved = await dispatch({
        type: 'SET_FILE_ACCESS_BLOCK',
        ownerId: state.currentUser.id,
        dietitianUserId,
        blocked,
      })
      if (saved) toast(
        blocked ? 'info' : 'success',
        blocked ? 'That dietitian can no longer see your files.' : 'That dietitian is no longer blocked from your files.',
      )
    },
    [state.currentUser, toast],
  )

  const setDefaultPaymentMethod = useCallback(
    (methodId: string) => {
      if (!state.currentUser) return
      dispatch({ type: 'SET_DEFAULT_PAYMENT_METHOD', patientId: state.currentUser.id, methodId })
      toast('success', 'Default payment method updated.')
    },
    [state.currentUser, toast],
  )

  const addPaymentMethod = useCallback(
    (method: Omit<SavedPaymentMethod, 'id' | 'patientId'>) => {
      if (!state.currentUser) return
      dispatch({
        type: 'ADD_PAYMENT_METHOD',
        method: { ...method, id: uid('pm'), patientId: state.currentUser.id },
      })
      toast('success', 'Payment method saved.')
    },
    [state.currentUser, toast],
  )

  const updateDietitianProfile = useCallback(
    async (dietitianId: string, experience: ExperienceItem[]) => {
      const saved = await dispatch({ type: 'UPDATE_DIETITIAN_PROFILE', dietitianId, experience })
      if (saved) toast('success', 'Work experience updated.')
    },
    [toast],
  )

  const addReview = useCallback(
    async (dietitianId: string, rating: number, text: string) => {
      if (!state.currentUser) return
      const saved = await dispatch({
        type: 'ADD_REVIEW',
        dietitianId,
        review: {
          author: state.currentUser.name,
          authorId: state.currentUser.id,
          rating,
          text,
        },
      })
      if (saved) toast('success', 'Review saved.')
    },
    [state.currentUser, toast],
  )

  const deleteReview = useCallback(
    async (dietitianId: string) => {
      if (!state.currentUser) return
      const saved = await dispatch({ type: 'DELETE_REVIEW', dietitianId, authorId: state.currentUser.id })
      if (saved) toast('info', 'Review deleted.')
    },
    [state.currentUser, toast],
  )

  const markMissedCallsSeen = useCallback(() => {
    if (!state.currentUser) return
    dispatch({ type: 'MARK_MISSED_CALLS_SEEN', userId: state.currentUser.id })
  }, [state.currentUser])

  const markConversationRead = useCallback(
    (conversationId: string) => {
      const userId = stateRef.current.currentUser?.id
      if (!userId) return
      dispatch({ type: 'MARK_CONVERSATION_READ', conversationId, userId })
    },
    [dispatch],
  )

  const markNotificationRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', id })
  }, [])

  const markNotificationsRead = useCallback(() => {
    if (!state.currentUser) return
    dispatch({ type: 'MARK_NOTIFICATIONS_READ', userId: state.currentUser.id })
  }, [state.currentUser])

  const saveAccount = useCallback(
    async (
      details: {
        name?: string
        email?: string
        phone?: string
        country?: string
        workplace?: string
        title?: string
        bio?: string
        yearsExperience?: number
        specialties?: string[]
        languages?: string[]
        avatar?: string
        coverImage?: string
      },
      message = 'Listing saved.',
    ) => {
      if (!state.currentUser) throw new Error('Your account is still loading. Please retry.')
      const action: Action = { type: 'UPDATE_ACCOUNT', userId: state.currentUser.id, ...details }
      if (apiEnabled()) {
        const server = await postAction(action.type, actionPayload(action))
        applyServerPatch(server)
      } else reduce(action)
      toast('success', message)
    },
    [state.currentUser, toast, applyServerPatch],
  )

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      dispatch,
      login,
      registerAccount,
      logout,
      toast,
      sendMessage,
      retryMessage,
      sendPeerMessage,
      openConversation,
      deleteConversation,
      bookAppointment,
      cancelAppointment,
      requestConsultation,
      respondConsultation,
      uploadFile,
      submitApplication,
      updateAvailability,
      approveApplication,
      requestMoreInfo,
      deleteApplication: deleteApplicationRecord,
      startCall,
      answerCall,
      endCall,
      dismissCall,
      payQuote,
      addPaymentMethod,
      savePatientProfile,
      savePatientSettings,
      endSession,
      setFileShare,
      setFileAccessBlock,
      setDefaultPaymentMethod,
      updateDietitianProfile,
      addReview,
      deleteReview,
      markMissedCallsSeen,
      markConversationRead,
      markNotificationRead,
      markNotificationsRead,
      saveAccount,
      refreshCare,
    }),
    [
      state,
      login,
      registerAccount,
      logout,
      toast,
      sendMessage,
      retryMessage,
      sendPeerMessage,
      openConversation,
      deleteConversation,
      bookAppointment,
      cancelAppointment,
      requestConsultation,
      respondConsultation,
      uploadFile,
      submitApplication,
      updateAvailability,
      approveApplication,
      requestMoreInfo,
      deleteApplicationRecord,
      startCall,
      answerCall,
      endCall,
      dismissCall,
      payQuote,
      addPaymentMethod,
      savePatientProfile,
      savePatientSettings,
      endSession,
      setFileShare,
      setFileAccessBlock,
      setDefaultPaymentMethod,
      updateDietitianProfile,
      addReview,
      deleteReview,
      markMissedCallsSeen,
      markConversationRead,
      markNotificationRead,
      markNotificationsRead,
      saveAccount,
      refreshCare,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used within AppProvider')
  return value
}
