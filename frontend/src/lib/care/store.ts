import { activeCallFromLive, conversationIdFor } from '@/lib/care/calls'
import { accountAvatar } from '@/lib/care/accountAvatar'
import { defaultAvailability, uid } from '@/lib/care/utils'
import type {
  AppState,
  AvailabilitySlot,
  ConsultationRequest,
  Dietitian,
  DietitianApplication,
  ExperienceItem,
  AppNotification,
  PatientAccountSettings,
  PatientFile,
  PatientProfile,
  Payment,
  SavedPaymentMethod,
  Toast,
  User,
  VideoCallState,
} from './types'

export type Action =
  | { type: 'HYDRATE'; state: AppState }
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'ADD_TOAST'; toast: Omit<Toast, 'id'> }
  | { type: 'REMOVE_TOAST'; id: string }
  | {
      type: 'SEND_MESSAGE'
      conversationId: string
      senderId: string
      text: string
      messageId?: string
      attachments?: { name: string; size: string; url?: string; type?: string; objectKey?: string; bucket?: string; sizeBytes?: number }[]
      status?: import('./types').MessageDeliveryStatus
    }
  | { type: 'UPDATE_MESSAGE_STATUS'; messageId: string; status: import('./types').MessageDeliveryStatus; deliveredAt?: string | null; readAt?: string | null }
  | { type: 'UPSERT_MESSAGE'; message: import('./types').ChatMessage }
  | { type: 'ENSURE_CONVERSATION'; patientId: string; dietitianUserId: string; dietitianName: string }
  | { type: 'REQUEST_CONSULTATION'; request: Omit<ConsultationRequest, 'id'> }
  | { type: 'RESPOND_CONSULTATION'; id: string; status: 'accepted' | 'declined' }
  | { type: 'UPLOAD_FILE'; file: Omit<PatientFile, 'id'> }
    | { type: 'SUBMIT_APPLICATION'; application: DietitianApplication }
    | { type: 'REGISTER_DOCTOR'; user: User }
    | { type: 'REGISTER_USER'; user: User; profile?: PatientProfile }
  | { type: 'UPDATE_AVAILABILITY'; dietitianId: string; availability: AvailabilitySlot[] }
  | { type: 'APPROVE_APPLICATION'; applicationId: string; reviewer: string }
  | { type: 'REQUEST_MORE_INFO'; applicationId: string; message: string; reviewer: string }
  | { type: 'DELETE_APPLICATION'; applicationId: string }
  | { type: 'START_CALL'; call: VideoCallState }
  | { type: 'ANSWER_CALL' }
  | { type: 'END_CALL'; callId?: string }
  | { type: 'COMPLETE_APPOINTMENT'; appointmentId: string }
  | { type: 'CANCEL_APPOINTMENT'; appointmentId: string; status?: 'cancelled' | 'deleted' }
  | { type: 'DELETE_APPOINTMENT'; appointmentId: string }
  | { type: 'DELETE_CONVERSATION'; conversationId: string; userId: string }
  | { type: 'ADD_APPOINTMENT'; patientId: string; dietitianId: string; date: string; time: string; topic: string; kind: 'video' | 'chat' }
  | { type: 'ADD_PAYMENT'; payment: Omit<Payment, 'id' | 'status' | 'paidAt' | 'receipt'> }
  | { type: 'ADD_PAYMENT_METHOD'; method: SavedPaymentMethod }
  | { type: 'UPDATE_PATIENT_PROFILE'; profile: PatientProfile }
  | { type: 'UPDATE_PATIENT_SETTINGS'; settings: PatientAccountSettings }
  | { type: 'END_SESSION'; sessionId: string }
  | { type: 'SET_FILE_SHARE'; ownerId: string; dietitianUserId: string; granted: boolean }
  | { type: 'SET_FILE_ACCESS_BLOCK'; ownerId: string; dietitianUserId: string; blocked: boolean }
  | { type: 'SET_DEFAULT_PAYMENT_METHOD'; patientId: string; methodId: string }
  | { type: 'UPDATE_DIETITIAN_PROFILE'; dietitianId: string; experience: ExperienceItem[] }
  | { type: 'ADD_REVIEW'; dietitianId: string; review: { author: string; authorId: string; rating: number; text: string } }
  | { type: 'DELETE_REVIEW'; dietitianId: string; authorId: string }
  | { type: 'MARK_MISSED_CALLS_SEEN'; userId: string }
  | { type: 'MARK_CONVERSATION_READ'; conversationId: string; userId: string }
  | { type: 'MARK_NOTIFICATION_READ'; id: string }
  | { type: 'MARK_NOTIFICATIONS_READ'; userId: string }
  | {
      type: 'UPDATE_ACCOUNT'
      userId: string
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
    }

export function createInitialState(partial?: Partial<AppState>): AppState {
  return {
    currentUser: null,
    users: [],
    dietitians: [],
    applications: [],
    conversations: [],
    messages: [],
    appointments: [],
    files: [],
    consultationRequests: [],
    toasts: [],
    activeCall: null,
    patientProfiles: [],
    patientSettings: [],
    payments: [],
    paymentQuotes: [],
    paymentMethods: [],
    deviceSessions: [],
    missedCalls: [],
    notifications: [],
    liveCalls: [],
    ...partial,
  }
}


export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...action.state, toasts: state.toasts }
    case 'LOGIN':
      return {
        ...state,
        currentUser: action.user,
        toasts: [],
        activeCall: activeCallFromLive(action.user.id, state.liveCalls),
      }
    case 'LOGOUT':
      return { ...state, currentUser: null, activeCall: null }
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, { ...action.toast, id: uid('toast') }],
      }
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter((toast) => toast.id !== action.id) }
    case 'SEND_MESSAGE': {
      const timestamp = new Date().toISOString()
      const messageId = action.messageId || uid('msg')
      if (state.messages.some((item) => item.id === messageId)) return state
      const message = {
        id: messageId,
        conversationId: action.conversationId,
        senderId: action.senderId,
        text: action.text,
        timestamp,
        attachments: action.attachments,
        status: action.status || 'pending',
      }
      return {
        ...state,
        messages: [...state.messages, message],
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.conversationId
            ? { ...conversation, lastMessage: action.text, lastAt: timestamp }
            : conversation,
        ),
      }
    }
    case 'UPDATE_MESSAGE_STATUS':
      return {
        ...state,
        messages: state.messages.map((message) => {
          if (message.id !== action.messageId) return message
          const rank = { pending: 0, failed: 0, sent: 1, delivered: 2, read: 3 } as const
          const current = rank[message.status || 'sent'] ?? 1
          const next = rank[action.status] ?? 1
          if (action.status !== 'failed' && next < current) return message
          return {
            ...message,
            status: action.status,
            deliveredAt: action.deliveredAt !== undefined ? action.deliveredAt : message.deliveredAt,
            readAt: action.readAt !== undefined ? action.readAt : message.readAt,
          }
        }),
      }
    case 'UPSERT_MESSAGE': {
      const existing = state.messages.find((item) => item.id === action.message.id)
      const messages = existing
        ? state.messages.map((item) => (item.id === action.message.id ? { ...item, ...action.message } : item))
        : [...state.messages, action.message]
      return {
        ...state,
        messages,
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.message.conversationId
            ? {
                ...conversation,
                lastMessage: action.message.text || conversation.lastMessage,
                lastAt: action.message.timestamp || conversation.lastAt,
              }
            : conversation,
        ),
      }
    }
    case 'ENSURE_CONVERSATION': {
      const existing = state.conversations.find(
        (conversation) =>
          conversation.participantIds.includes(action.patientId) &&
          conversation.participantIds.includes(action.dietitianUserId),
      )
      if (existing) return state
      const id = conversationIdFor(action.patientId, action.dietitianUserId)
      return {
        ...state,
        conversations: [
          {
            id,
            participantIds: [action.patientId, action.dietitianUserId],
            lastMessage: `Conversation started with ${action.dietitianName}`,
            lastAt: new Date().toISOString(),
          },
          ...state.conversations,
        ],
      }
    }
    case 'REQUEST_CONSULTATION': {
      const exists = state.consultationRequests.some(
        (request) =>
          request.patientId === action.request.patientId &&
          request.dietitianId === action.request.dietitianId &&
          request.status === 'pending',
      )
      if (exists) return state
      return {
        ...state,
        consultationRequests: [
          { ...action.request, id: uid('req') },
          ...state.consultationRequests,
        ],
      }
    }
    case 'RESPOND_CONSULTATION': {
      const request = state.consultationRequests.find((item) => item.id === action.id)
      if (!request) return state
      const nextRequests = state.consultationRequests.map((item) =>
        item.id === action.id ? { ...item, status: action.status } : item,
      )
      if (action.status !== 'accepted') {
        return { ...state, consultationRequests: nextRequests }
      }
      const dietitian = state.dietitians.find((item) => item.id === request.dietitianId)
      if (!dietitian) return { ...state, consultationRequests: nextRequests }
      const conversationId = conversationIdFor(request.patientId, dietitian.userId)
      const hasConversation = state.conversations.some((item) => item.id === conversationId)
      return {
        ...state,
        consultationRequests: nextRequests,
        conversations: hasConversation
          ? state.conversations
          : [
              {
                id: conversationId,
                participantIds: [request.patientId, dietitian.userId],
                lastMessage: 'Consultation accepted. You can now message and meet.',
                lastAt: new Date().toISOString(),
              },
              ...state.conversations,
            ],
        appointments: [
          {
            id: uid('apt'),
            patientId: request.patientId,
            dietitianId: dietitian.id,
            date: nextWeekday(),
            time: '14:00',
            status: 'upcoming',
            type: 'video',
            topic: 'New consultation',
          },
          ...state.appointments,
        ],
      }
    }
    case 'UPLOAD_FILE':
      return {
        ...state,
        files: [{ ...action.file, id: uid('file') }, ...state.files],
      }
    case 'REGISTER_DOCTOR':
    case 'REGISTER_USER': {
      if (state.users.some((item) => item.email.toLowerCase() === action.user.email.toLowerCase())) {
        return state
      }
      const profile = action.type === 'REGISTER_USER' ? action.profile : undefined
      return {
        ...state,
        users: [...state.users, action.user],
        currentUser: action.user,
        patientProfiles: profile
          ? [profile, ...state.patientProfiles.filter((item) => item.userId !== profile.userId)]
          : state.patientProfiles,
      }
    }
    case 'SUBMIT_APPLICATION': {
      const existing = state.applications.filter((item) => item.userId !== action.application.userId)
      const dietitians = upsertPendingDietitian(state.dietitians, action.application)
      const isUpdate = state.applications.some((item) => item.userId === action.application.userId)
      return {
        ...state,
        applications: [action.application, ...existing],
        dietitians,
        notifications: pushAdminNotifications(state, {
          kind: 'registration',
          title: isUpdate ? 'Dietitian registration updated' : 'New dietitian registration',
          body: isUpdate
            ? `${action.application.fullName} updated their dietitian registration and is waiting for review.`
            : `${action.application.fullName} registered as a dietitian and is waiting for verification.`,
          href: `/admin/applications/${action.application.id}`,
          createdAt: action.application.submittedAt,
        }),
      }
    }
    case 'UPDATE_AVAILABILITY':
      return {
        ...state,
        dietitians: state.dietitians.map((dietitian) =>
          dietitian.id === action.dietitianId
            ? { ...dietitian, availability: action.availability }
            : dietitian,
        ),
      }
    case 'APPROVE_APPLICATION': {
      const application = state.applications.find((item) => item.id === action.applicationId)
      if (!application) return state
      const approvedApplication = {
        ...application,
        status: 'approved' as const,
        adminNotes: [...application.adminNotes, `Approved by ${action.reviewer}`],
      }
      return {
        ...state,
        applications: state.applications.map((item) =>
          item.id === action.applicationId ? approvedApplication : item,
        ),
        dietitians: upsertPendingDietitian(state.dietitians, approvedApplication).map((dietitian) =>
          dietitian.userId === application.userId
            ? { ...dietitian, status: 'approved', verified: true, featured: true }
            : dietitian,
        ),
      }
    }
    case 'REQUEST_MORE_INFO': {
      const application = state.applications.find((item) => item.id === action.applicationId)
      if (!application) return state
      return {
        ...state,
        applications: state.applications.map((item) =>
          item.id === action.applicationId
            ? {
                ...item,
                status: 'needs_info',
                moreInfoRequest: action.message,
                adminNotes: [...item.adminNotes, `${action.reviewer}: ${action.message}`],
              }
            : item,
        ),
        dietitians: state.dietitians.map((dietitian) =>
          dietitian.userId === application.userId ? { ...dietitian, status: 'needs_info' } : dietitian,
        ),
      }
    }
    case 'DELETE_APPLICATION': {
      const application = state.applications.find((item) => item.id === action.applicationId)
      const userId = application?.userId
      return {
        ...state,
        applications: state.applications.filter((item) => item.id !== action.applicationId),
        dietitians: userId
          ? state.dietitians.filter(
              (item) => !(item.userId === userId && item.status !== 'approved'),
            )
          : state.dietitians,
      }
    }
    case 'START_CALL': {
      const caller = state.currentUser
      const peerId = action.call.peerId
      if (!caller || !peerId) {
        return { ...state, activeCall: { ...action.call, status: action.call.status ?? 'ringing' } }
      }
      const existing = state.liveCalls.find(
        (item) =>
          (item.callerId === caller.id && item.calleeId === peerId) ||
          (item.callerId === peerId && item.calleeId === caller.id),
      )
      if (existing) {
        return { ...state, activeCall: activeCallFromLive(caller.id, state.liveCalls) }
      }
      const conversationId =
        action.call.conversationId && action.call.conversationId !== 'live'
          ? action.call.conversationId
          : conversationIdFor(caller.id, peerId)
      const live = {
        id: action.call.callId ?? uid('call'),
        conversationId,
        callerId: caller.id,
        calleeId: peerId,
        callerName: caller.name,
        callerAvatar: accountAvatar(caller, state.dietitians, state.applications),
        calleeName: action.call.peerName,
        calleeAvatar: accountAvatar(state.users.find((user) => user.id === peerId), state.dietitians, state.applications) || action.call.peerAvatar,
        status: 'ringing' as const,
        startedAt: new Date().toISOString(),
        offer: null,
        answer: null,
        ice: [],
      }
      return {
        ...state,
        liveCalls: [...state.liveCalls.filter((item) => item.id !== live.id), live],
        activeCall: { ...action.call, conversationId, status: 'ringing', incoming: false, callId: live.id },
      }
    }
    case 'ANSWER_CALL': {
      const userId = state.currentUser?.id
      const liveCalls = state.liveCalls.map((item) =>
        item.calleeId === userId && item.status === 'ringing' ? { ...item, status: 'live' as const } : item,
      )
      return {
        ...state,
        liveCalls,
        activeCall: activeCallFromLive(userId, liveCalls),
      }
    }
    case 'END_CALL': {
      const userId = state.currentUser?.id
      const remaining = []
      const missed = [...state.missedCalls]
      const messages = [...state.messages]
      const conversations = state.conversations.map((item) => ({ ...item }))
      for (const item of state.liveCalls) {
        if ((action.callId && item.id !== action.callId) || (userId && userId !== item.callerId && userId !== item.calleeId)) {
          remaining.push(item)
          continue
        }
        if (item.status === 'ringing') {
          missed.unshift({
            id: uid('miss'),
            userId: item.calleeId,
            peerId: item.callerId,
            peerName: item.callerName,
            createdAt: new Date().toISOString(),
            seen: false,
          })
        }
        const timestamp = new Date().toISOString()
        messages.push({
          id: uid('msg'),
          conversationId: item.conversationId,
          senderId: userId ?? item.callerId,
          text: 'Video call ended',
          timestamp,
          attachments: [],
        })
        const conversation = conversations.find((entry) => entry.id === item.conversationId)
        if (conversation) {
          conversation.lastMessage = 'Video call ended'
          conversation.lastAt = timestamp
        }
      }
      return {
        ...state,
        activeCall: activeCallFromLive(userId, remaining),
        liveCalls: remaining,
        missedCalls: missed,
        messages,
        conversations,
      }
    }
    case 'COMPLETE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.map((appointment) =>
          appointment.id === action.appointmentId
            ? { ...appointment, status: 'completed' }
            : appointment,
        ),
      }
    case 'CANCEL_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments
          .map((appointment) =>
            appointment.id === action.appointmentId
              ? { ...appointment, status: (action.status || 'deleted') as typeof appointment.status }
              : appointment,
          )
          .filter((appointment) => appointment.status !== 'deleted'),
      }
    case 'DELETE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments
          .map((appointment) =>
            appointment.id === action.appointmentId
              ? { ...appointment, status: 'deleted' as const }
              : appointment,
          )
          .filter((appointment) => appointment.status !== 'deleted'),
      }
    case 'DELETE_CONVERSATION': {
      if (!state.conversations.some((item) => item.id === action.conversationId)) return state
      return {
        ...state,
        conversations: state.conversations.filter((item) => item.id !== action.conversationId),
        messages: state.messages.filter((item) => item.conversationId !== action.conversationId),
      }
    }
    case 'ADD_APPOINTMENT':
      return {
        ...state,
        appointments: [
          {
            id: uid('apt'),
            patientId: action.patientId,
            dietitianId: action.dietitianId,
            date: action.date,
            time: action.time,
            status: 'upcoming',
            type: action.kind,
            topic: action.topic,
          },
          ...state.appointments,
        ],
      }
    case 'ADD_PAYMENT': {
      const payment: Payment = {
        ...action.payment,
        id: uid('pay'),
        status: 'paid',
        paidAt: new Date().toISOString(),
        receipt: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      }
      return {
        ...state,
        payments: [payment, ...state.payments],
        paymentQuotes: state.paymentQuotes.map((quote) =>
          quote.id === action.payment.quoteId ? { ...quote, status: 'paid' } : quote,
        ),
      }
    }
    case 'UPDATE_PATIENT_PROFILE': {
      const exists = state.patientProfiles.some((item) => item.userId === action.profile.userId)
      return {
        ...state,
        patientProfiles: exists
          ? state.patientProfiles.map((item) => (item.userId === action.profile.userId ? action.profile : item))
          : [action.profile, ...state.patientProfiles],
      }
    }
    case 'UPDATE_PATIENT_SETTINGS': {
      const exists = state.patientSettings.some((item) => item.userId === action.settings.userId)
      return {
        ...state,
        patientSettings: exists
          ? state.patientSettings.map((item) => (item.userId === action.settings.userId ? action.settings : item))
          : [action.settings, ...state.patientSettings],
      }
    }
    case 'END_SESSION':
      return {
        ...state,
        deviceSessions: state.deviceSessions.filter((session) => session.id !== action.sessionId),
      }
    case 'SET_FILE_SHARE': {
      const blocked = state.patientSettings
        .find((item) => item.userId === action.ownerId)
        ?.blockedFileAccessIds?.includes(action.dietitianUserId)
      if (action.granted && blocked) return state
      return {
        ...state,
        files: state.files.map((file) => {
          if (file.ownerId !== action.ownerId) return file
          if (action.granted) {
            return file.sharedWithId ? file : { ...file, sharedWithId: action.dietitianUserId }
          }
          return file.sharedWithId === action.dietitianUserId ? { ...file, sharedWithId: undefined } : file
        }),
      }
    }
    case 'SET_FILE_ACCESS_BLOCK':
      return {
        ...state,
        patientSettings: state.patientSettings.map((item) => {
          if (item.userId !== action.ownerId) return item
          const blocked = new Set(item.blockedFileAccessIds ?? [])
          if (action.blocked) blocked.add(action.dietitianUserId)
          else blocked.delete(action.dietitianUserId)
          return { ...item, blockedFileAccessIds: [...blocked] }
        }),
        files: action.blocked
          ? state.files.map((file) =>
              file.ownerId === action.ownerId && file.sharedWithId === action.dietitianUserId
                ? { ...file, sharedWithId: undefined }
                : file,
            )
          : state.files,
      }
    case 'SET_DEFAULT_PAYMENT_METHOD':
      return {
        ...state,
        paymentMethods: state.paymentMethods.map((method) =>
          method.patientId === action.patientId
            ? { ...method, isDefault: method.id === action.methodId }
            : method,
        ),
      }
    case 'ADD_PAYMENT_METHOD':
      return {
        ...state,
        paymentMethods: action.method.isDefault
          ? [
              action.method,
              ...state.paymentMethods.map((method) =>
                method.patientId === action.method.patientId ? { ...method, isDefault: false } : method,
              ),
            ]
          : [action.method, ...state.paymentMethods],
      }
    case 'UPDATE_DIETITIAN_PROFILE':
      return {
        ...state,
        dietitians: state.dietitians.map((dietitian) =>
          dietitian.id === action.dietitianId ? { ...dietitian, experience: action.experience } : dietitian,
        ),
      }
    case 'ADD_REVIEW': {
      return {
        ...state,
        dietitians: state.dietitians.map((dietitian) => {
          if (dietitian.id !== action.dietitianId) return dietitian
          const existing = dietitian.reviews.find((item) => item.authorId === action.review.authorId)
          const nextReview = {
            id: existing?.id ?? uid('rv'),
            author: action.review.author,
            authorId: action.review.authorId,
            rating: action.review.rating,
            text: action.review.text,
            date: new Date().toISOString().slice(0, 10),
          }
          const reviews = existing
            ? dietitian.reviews.map((item) => (item.id === existing.id ? nextReview : item))
            : [nextReview, ...dietitian.reviews]
          return { ...dietitian, ...scoreReviews(reviews) }
        }),
      }
    }
    case 'DELETE_REVIEW':
      return {
        ...state,
        dietitians: state.dietitians.map((dietitian) => {
          if (dietitian.id !== action.dietitianId) return dietitian
          return { ...dietitian, ...scoreReviews(dietitian.reviews.filter((item) => item.authorId !== action.authorId)) }
        }),
      }
    case 'MARK_MISSED_CALLS_SEEN':
      return {
        ...state,
        missedCalls: state.missedCalls.map((item) =>
          item.userId === action.userId ? { ...item, seen: true } : item,
        ),
      }
    case 'MARK_CONVERSATION_READ':
      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.conversationId
            ? {
                ...conversation,
                lastReadAt: { ...conversation.lastReadAt, [action.userId]: new Date().toISOString() },
              }
            : conversation,
        ),
      }
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map((item) =>
          item.id === action.id ? { ...item, read: true } : item,
        ),
      }
    case 'MARK_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map((item) =>
          item.userId === action.userId ? { ...item, read: true } : item,
        ),
      }
    case 'UPDATE_ACCOUNT': {
      const users = state.users.map((user) =>
        user.id === action.userId
          ? {
              ...user,
              name: action.name ?? user.name,
              email: action.email ?? user.email,
              phone: action.phone ?? user.phone,
              country: action.country ?? user.country,
              title: action.title ?? user.title,
              avatar: action.avatar ?? user.avatar,
            }
          : user,
      )
      const currentUser =
        state.currentUser?.id === action.userId
          ? users.find((user) => user.id === action.userId) ?? state.currentUser
          : state.currentUser
      const accountUser = users.find((user) => user.id === action.userId)
      const hasListing = state.dietitians.some((item) => item.userId === action.userId)

      let dietitians = state.dietitians.map((dietitian) =>
        dietitian.userId === action.userId
          ? {
              ...dietitian,
              name: action.name ?? dietitian.name,
              country: action.country ?? dietitian.country,
              workplace: action.workplace ?? dietitian.workplace,
              title: action.title ?? dietitian.title,
              bio: action.bio ?? dietitian.bio,
              yearsExperience: action.yearsExperience ?? dietitian.yearsExperience,
              specialties: action.specialties ?? dietitian.specialties,
              languages: action.languages ?? dietitian.languages,
              avatar: action.avatar ?? dietitian.avatar,
              coverImage: action.coverImage ?? dietitian.coverImage,
            }
          : dietitian,
      )

      // New specialists have no listing row yet — create a pending stub so cover/avatar persist.
      if (!hasListing && accountUser?.role === 'dietitian') {
        dietitians = [
          ...dietitians,
          {
            // UUID so API persist + catalog refresh keep the cover/avatar.
            id: uid('dt'),
            userId: action.userId,
            name: action.name ?? accountUser.name,
            title: action.title ?? accountUser.title ?? '',
            country: action.country ?? accountUser.country ?? '',
            specialties: action.specialties ?? [],
            conditions: action.specialties ?? [],
            yearsExperience: action.yearsExperience ?? 0,
            rating: 0,
            reviewCount: 0,
            bio: action.bio ?? '',
            languages: action.languages ?? [],
            workplace: action.workplace ?? '',
            avatar: action.avatar ?? accountUser.avatar ?? '',
            coverImage: action.coverImage ?? '',
            verified: false,
            featured: false,
            education: [],
            experience: [],
            documents: [],
            reviews: [],
            availability: defaultAvailability(),
            status: 'pending',
          },
        ]
      }

      return {
        ...state,
        users,
        currentUser,
        dietitians,
      }
    }
    default:
      return state
  }
}

function scoreReviews(reviews: Dietitian['reviews']) {
  const reviewCount = reviews.length
  const rating = reviewCount
    ? Number((reviews.reduce((sum, item) => sum + item.rating, 0) / reviewCount).toFixed(1))
    : 0
  return { reviews, reviewCount, rating }
}

function nextWeekday() {
  const date = new Date()
  date.setDate(date.getDate() + ((1 + 7 - date.getDay()) % 7 || 7))
  return date.toISOString().slice(0, 10)
}

function pushAdminNotifications(
  state: AppState,
  item: Pick<AppNotification, 'kind' | 'title' | 'body' | 'href' | 'createdAt'>,
): AppNotification[] {
  const extras = state.users
    .filter((user) => user.role === 'admin')
    .map((admin) => ({
      id: uid('ntf'),
      userId: admin.id,
      kind: item.kind,
      title: item.title,
      body: item.body,
      href: item.href,
      createdAt: item.createdAt,
      read: false,
    }))
  return [...extras, ...state.notifications]
}

function upsertPendingDietitian(dietitians: Dietitian[], application: DietitianApplication): Dietitian[] {
  const existing = dietitians.find((item) => item.userId === application.userId)
  const photoUrl = application.documents.find((doc) => doc.kind === 'photo')?.url
  const next: Dietitian = {
    id: existing?.id ?? `dt-${application.userId.replace(/^user-/, '')}`,
    userId: application.userId,
    name: application.fullName,
    title: existing?.title || 'Dietitian',
    country: application.country,
    specialties: application.specialties,
    conditions: application.specialties,
    yearsExperience: application.yearsExperience,
    rating: existing?.rating ?? 0,
    reviewCount: existing?.reviewCount ?? 0,
    bio: application.bio,
    languages: application.languages,
    workplace: application.workplace,
    avatar: existing?.avatar || photoUrl || '',
    coverImage: existing?.coverImage || '',
    verified: application.status === 'approved',
    featured: application.status === 'approved',
    education: application.education,
    experience: application.experience?.length
      ? application.experience
      : [],
    documents: application.documents.map((doc) => ({
      id: existing?.documents.find((item) => item.fileName === doc.fileName)?.id ?? uid('doc'),
      name: doc.name,
      kind: doc.kind === 'photo' ? 'photo' : doc.kind === 'license' ? 'license' : doc.kind === 'cv' ? 'cv' : 'degree',
      fileName: doc.fileName,
      url: doc.url,
    })),
    reviews: existing?.reviews ?? [],
    availability: existing?.availability?.length ? existing.availability : defaultAvailability(),
    status:
      application.status === 'approved'
        ? 'approved'
        : application.status === 'needs_info'
          ? 'needs_info'
          : 'pending',
  }

  if (existing) {
    return dietitians.map((item) => (item.userId === application.userId ? { ...item, ...next, id: item.id } : item))
  }
  return [...dietitians, next]
}
