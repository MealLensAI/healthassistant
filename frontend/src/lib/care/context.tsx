import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
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
import { defaultAvailability, uid } from '@/lib/care/utils'
import {
  actionPayload,
  apiEnabled,
  bookAppointmentOnServer,
  cancelAppointmentOnServer,
  fetchServerState,
  isRemoteAction,
  loginOnServer,
  mergeServerState,
  postAction,
  registerAccountOnServer,
  sameAppData,
  setSessionUserId,
} from './api'
import { activeCallFromLive } from '@/lib/care/calls'
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
      const seeded = userId ? seedState.users.find((item) => item.id === userId) ?? null : null
      // Synced MealLensAI accounts use the auth uid (not in mock USERS) — keep a stub so UI can boot.
      const currentUser =
        seeded ||
        (userId
          ? ({
              id: userId,
              name: 'Member',
              email: '',
              role: 'patient',
              avatar: '',
            } as AppState['currentUser'])
          : null)
      return {
        ...seedState,
        currentUser,
        toasts: [],
        liveCalls: seedState.liveCalls,
        activeCall: activeCallFromLive(currentUser?.id, seedState.liveCalls),
      }
    } catch {
      return { ...seedState, currentUser: null, toasts: [], activeCall: null }
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
        const user = seedState.users.find((item) => item.id === parsed.currentUser?.id) ?? parsed.currentUser
        const listing = (parsed.dietitians?.length ? parsed.dietitians : seedState.dietitians).find(
          (item) => item.userId === user.id,
        )
        if (!listing) return user
        return {
          ...user,
          name: listing.name,
          avatar: listing.avatar || user.avatar,
          country: listing.country,
          title: listing.title,
        }
      })()
    const liveCalls = parsed.liveCalls ?? seedState.liveCalls
    return {
      ...seedState,
      ...stored,
      users: seedState.users,
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

interface AppContextValue extends AppState {
  dispatch: (action: Action) => void
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
  sendMessage: (conversationId: string, text: string, attachments?: { name: string; size: string; url?: string; type?: string }[]) => void
  sendPeerMessage: (conversationId: string, senderId: string, text: string) => void
  openConversation: (dietitianUserId: string, dietitianName: string) => string
  bookAppointment: (
    dietitianId: string,
    date: string,
    time: string,
    topic: string,
    kind: 'video' | 'chat',
  ) => Promise<boolean>
  cancelAppointment: (appointmentId: string) => void
  requestConsultation: (dietitianId: string, note: string) => void
  respondConsultation: (id: string, status: 'accepted' | 'declined') => void
  uploadFile: (file: { name: string; category: 'labs' | 'diary' | 'photo' | 'other'; size: string; sharedWithId?: string; url?: string }) => void
  submitApplication: (application: Omit<DietitianApplication, 'id' | 'submittedAt' | 'adminNotes' | 'status'> & { status?: DietitianApplication['status'] }) => void
  updateAvailability: (dietitianId: string, availability: AvailabilitySlot[]) => void
  approveApplication: (applicationId: string) => void
  requestMoreInfo: (applicationId: string, message: string) => void
  startCall: (conversationId: string, peerId: string, peerName: string, peerAvatar: string) => void
  answerCall: () => void
  endCall: () => void
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
  ) => void
}

const AppContext = createContext<AppContextValue | null>(null)

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
  stateRef.current = state

  const hydrateFromServer = useCallback((server: Parameters<typeof mergeServerState>[1]) => {
    const next = mergeServerState(stateRef.current, server)
    if (sameAppData(stateRef.current, next)) return
    reduce({ type: 'HYDRATE', state: next })
  }, [])

  const dispatch = useCallback((action: Action) => {
    if (apiEnabled() && isRemoteAction(action)) {
      if (action.type !== 'START_CALL') reduce(action)
      void postAction(action.type, actionPayload(action))
        .then((server) => {
          hydrateFromServer(server)
        })
        .catch(() => {
          reduce({
            type: 'ADD_TOAST',
            toast: { type: 'error', message: 'Could not save that change to the server.' },
          })
        })
      return
    }
    reduce(action)
  }, [hydrateFromServer])

  useEffect(() => {
    if (!apiEnabled()) return
    // Don't poll/hydrate until the care session user id is known — anonymous
    // /state responses were wiping booked appointments and blanking the inbox.
    if (!state.currentUser?.id) return
    let cancelled = false
    void fetchServerState()
      .then((server) => {
        if (cancelled) return
        hydrateFromServer(server)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [hydrateFromServer, state.currentUser?.id])

  useEffect(() => {
    if (!apiEnabled() || !state.currentUser) return
    const timer = window.setInterval(() => {
      void fetchServerState()
        .then((server) => {
          hydrateFromServer(server)
        })
        .catch(() => undefined)
    }, state.activeCall ? 800 : 2000)
    return () => window.clearInterval(timer)
  }, [hydrateFromServer, state.currentUser?.id, Boolean(state.activeCall)])

  useEffect(() => {
    if (apiEnabled()) return
    const { toasts: _toasts, activeCall: _call, ...persistable } = state
    void _toasts
    void _call
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable))
  }, [state])

  const toast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    reduce({ type: 'ADD_TOAST', toast: { type, message } })
  }, [])

  const login = useCallback(
    (userId: string) => {
      if (apiEnabled()) {
        void loginOnServer(userId)
          .then(async ({ user }) => {
            const server = await fetchServerState()
            hydrateFromServer({ ...server, currentUser: user })
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
          const server = await fetchServerState()
          hydrateFromServer({ ...server, currentUser: user })
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
    (conversationId: string, text: string, attachments?: { name: string; size: string; url?: string; type?: string }[]) => {
      if (!state.currentUser) return
      dispatch({
        type: 'SEND_MESSAGE',
        conversationId,
        senderId: state.currentUser.id,
        text,
        attachments,
      })
    },
    [state.currentUser],
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
          const server = await bookAppointmentOnServer({ dietitianId, date, time, topic, kind })
          hydrateFromServer({ ...server, currentUser: state.currentUser })
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
    [state.currentUser, toast, hydrateFromServer],
  )

  const cancelAppointment = useCallback(
    (appointmentId: string) => {
      if (apiEnabled()) {
        void cancelAppointmentOnServer(appointmentId)
          .then((server) => {
            hydrateFromServer({ ...server, currentUser: stateRef.current.currentUser })
            toast('info', 'Appointment cancelled.')
          })
          .catch(() => {
            toast('error', 'Could not cancel that appointment.')
          })
        return
      }
      reduce({ type: 'CANCEL_APPOINTMENT', appointmentId })
      toast('info', 'Appointment cancelled.')
    },
    [toast, hydrateFromServer],
  )

  const openConversation = useCallback(
    (peerUserId: string, peerName: string) => {
      if (!state.currentUser) return ''
      const existing = state.conversations.find(
        (conversation) =>
          conversation.participantIds.includes(state.currentUser!.id) &&
          conversation.participantIds.includes(peerUserId),
      )
      if (existing) return existing.id
      const iAmDietitian = state.currentUser.role === 'dietitian'
      dispatch({
        type: 'ENSURE_CONVERSATION',
        patientId: iAmDietitian ? peerUserId : state.currentUser.id,
        dietitianUserId: iAmDietitian ? state.currentUser.id : peerUserId,
        dietitianName: iAmDietitian ? state.currentUser.name : peerName,
      })
      return `conv-${[state.currentUser.id, peerUserId].sort().join('-')}`
    },
    [state.currentUser, state.conversations],
  )

  const requestConsultation = useCallback(
    (dietitianId: string, note: string) => {
      if (!state.currentUser) return
      dispatch({
        type: 'REQUEST_CONSULTATION',
        request: {
          patientId: state.currentUser.id,
          dietitianId,
          status: 'pending',
          createdAt: new Date().toISOString(),
          note,
        },
      })
      toast('success', 'Consultation requested. The dietitian will respond shortly.')
    },
    [state.currentUser, toast],
  )

  const respondConsultation = useCallback(
    (id: string, status: 'accepted' | 'declined') => {
      dispatch({ type: 'RESPOND_CONSULTATION', id, status })
      toast(status === 'accepted' ? 'success' : 'info', status === 'accepted' ? 'Consultation accepted.' : 'Request declined.')
    },
    [toast],
  )

  const uploadFile = useCallback(
    (file: { name: string; category: 'labs' | 'diary' | 'photo' | 'other'; size: string; sharedWithId?: string; url?: string }) => {
      if (!state.currentUser) return
      dispatch({
        type: 'UPLOAD_FILE',
        file: {
          ownerId: state.currentUser.id,
          name: file.name,
          category: file.category,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          sharedWithId: file.sharedWithId,
          url: file.url,
        },
      })
      toast('success', `${file.name} uploaded.`)
    },
    [state.currentUser, toast],
  )

  const submitApplication = useCallback(
    (application: Omit<DietitianApplication, 'id' | 'submittedAt' | 'adminNotes' | 'status'> & { status?: DietitianApplication['status'] }) => {
      if (!state.currentUser) return
      const payload: DietitianApplication = {
        ...application,
        id: uid('app'),
        userId: state.currentUser.id,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        adminNotes: [],
      }
      dispatch({ type: 'SUBMIT_APPLICATION', application: payload })
      const dietitian = state.dietitians.find((item) => item.userId === state.currentUser?.id)
      if (dietitian && dietitian.availability.length === 0) {
        dispatch({ type: 'UPDATE_AVAILABILITY', dietitianId: dietitian.id, availability: defaultAvailability() })
      }
      toast('success', 'Application submitted for admin verification.')
    },
    [state.currentUser, state.dietitians, toast],
  )

  const updateAvailability = useCallback((dietitianId: string, availability: AvailabilitySlot[]) => {
    dispatch({ type: 'UPDATE_AVAILABILITY', dietitianId, availability })
    toast('success', 'Availability saved.')
  }, [toast])

  const approveApplication = useCallback(
    (applicationId: string) => {
      dispatch({ type: 'APPROVE_APPLICATION', applicationId, reviewer: state.currentUser?.name ?? 'Admin' })
      toast('success', 'Dietitian approved and now visible to patients.')
    },
    [state.currentUser, toast],
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

  const startCall = useCallback(
    (conversationId: string, peerId: string, peerName: string, peerAvatar: string) => {
      if (state.activeCall?.incoming && (state.activeCall.peerId === peerId || !peerId)) {
        dispatch({ type: 'ANSWER_CALL' })
        return
      }
      dispatch({
        type: 'START_CALL',
        call: { conversationId, peerId, peerName, peerAvatar, status: 'ringing' },
      })
    },
    [state.activeCall],
  )

  const answerCall = useCallback(() => {
    dispatch({ type: 'ANSWER_CALL' })
  }, [])

  const endCall = useCallback(() => {
    dispatch({ type: 'END_CALL' })
  }, [])

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
    (profile: PatientProfile) => {
      dispatch({ type: 'UPDATE_PATIENT_PROFILE', profile })
      toast('success', 'Clinical profile saved.')
    },
    [toast],
  )

  const savePatientSettings = useCallback(
    (settings: PatientAccountSettings) => {
      dispatch({ type: 'UPDATE_PATIENT_SETTINGS', settings })
      toast('success', 'Settings saved.')
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
    (dietitianUserId: string, granted: boolean) => {
      if (!state.currentUser) return
      dispatch({
        type: 'SET_FILE_SHARE',
        ownerId: state.currentUser.id,
        dietitianUserId,
        granted,
      })
      toast(granted ? 'success' : 'info', granted ? 'File access granted.' : 'File access revoked.')
    },
    [state.currentUser, toast],
  )

  const setFileAccessBlock = useCallback(
    (dietitianUserId: string, blocked: boolean) => {
      if (!state.currentUser) return
      dispatch({
        type: 'SET_FILE_ACCESS_BLOCK',
        ownerId: state.currentUser.id,
        dietitianUserId,
        blocked,
      })
      toast(
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
    (dietitianId: string, experience: ExperienceItem[]) => {
      dispatch({ type: 'UPDATE_DIETITIAN_PROFILE', dietitianId, experience })
      toast('success', 'Work experience updated.')
    },
    [toast],
  )

  const addReview = useCallback(
    (dietitianId: string, rating: number, text: string) => {
      if (!state.currentUser) return
      dispatch({
        type: 'ADD_REVIEW',
        dietitianId,
        review: {
          author: state.currentUser.name,
          authorId: state.currentUser.id,
          rating,
          text,
        },
      })
      toast('success', 'Review saved.')
    },
    [state.currentUser, toast],
  )

  const deleteReview = useCallback(
    (dietitianId: string) => {
      if (!state.currentUser) return
      dispatch({ type: 'DELETE_REVIEW', dietitianId, authorId: state.currentUser.id })
      toast('info', 'Review deleted.')
    },
    [state.currentUser, toast],
  )

  const markMissedCallsSeen = useCallback(() => {
    if (!state.currentUser) return
    dispatch({ type: 'MARK_MISSED_CALLS_SEEN', userId: state.currentUser.id })
  }, [state.currentUser])

  const markConversationRead = useCallback(
    (conversationId: string) => {
      if (!state.currentUser) return
      dispatch({ type: 'MARK_CONVERSATION_READ', conversationId, userId: state.currentUser.id })
    },
    [state.currentUser],
  )

  const markNotificationRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', id })
  }, [])

  const markNotificationsRead = useCallback(() => {
    if (!state.currentUser) return
    dispatch({ type: 'MARK_NOTIFICATIONS_READ', userId: state.currentUser.id })
  }, [state.currentUser])

  const saveAccount = useCallback(
    (
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
      if (!state.currentUser) return
      dispatch({ type: 'UPDATE_ACCOUNT', userId: state.currentUser.id, ...details })
      toast('success', message)
    },
    [state.currentUser, toast],
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
      sendPeerMessage,
      openConversation,
      bookAppointment,
      cancelAppointment,
      requestConsultation,
      respondConsultation,
      uploadFile,
      submitApplication,
      updateAvailability,
      approveApplication,
      requestMoreInfo,
      startCall,
      answerCall,
      endCall,
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
    }),
    [
      state,
      login,
      registerAccount,
      logout,
      toast,
      sendMessage,
      sendPeerMessage,
      openConversation,
      bookAppointment,
      cancelAppointment,
      requestConsultation,
      respondConsultation,
      uploadFile,
      submitApplication,
      updateAvailability,
      approveApplication,
      requestMoreInfo,
      startCall,
      answerCall,
      endCall,
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
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used within AppProvider')
  return value
}
