import { describe, expect, it } from 'vitest'
import { APPLICATIONS, CONVERSATIONS, DIETITIANS, MESSAGES, USERS } from './data/mock'
import { appReducer, createInitialState } from './store'

const base = createInitialState({
  users: USERS,
  dietitians: DIETITIANS,
  applications: APPLICATIONS,
  conversations: CONVERSATIONS,
  messages: MESSAGES,
  currentUser: USERS[0],
})

describe('appReducer', () => {
  it('approves an application and publishes the dietitian', () => {
    const next = appReducer(base, {
      type: 'APPROVE_APPLICATION',
      applicationId: 'app-marcus',
      reviewer: 'Amelia Ward',
    })
    expect(next.applications.find((item) => item.id === 'app-marcus')?.status).toBe('approved')
    expect(next.dietitians.find((item) => item.id === 'dt-marcus')?.status).toBe('approved')
    expect(next.dietitians.find((item) => item.id === 'dt-marcus')?.verified).toBe(true)
  })

  it('creates a public listing when an application-only specialist is approved', () => {
    const next = appReducer(base, {
      type: 'APPROVE_APPLICATION',
      applicationId: 'app-priya',
      reviewer: 'Amelia Ward',
    })
    const priya = next.dietitians.find((item) => item.userId === 'user-priya')
    expect(next.applications.find((item) => item.id === 'app-priya')?.status).toBe('approved')
    expect(priya?.status).toBe('approved')
    expect(priya?.verified).toBe(true)
    expect(priya?.avatar).toContain('unsplash')
    expect(priya?.availability.length).toBe(7)
  })

  it('notifies admins when someone registers as a dietitian', () => {
    const next = appReducer(base, {
      type: 'SUBMIT_APPLICATION',
      application: {
        ...APPLICATIONS[1]!,
        id: 'app-nina',
        userId: 'user-nina',
        fullName: 'Nina Cole',
      },
    })
    expect(next.notifications[0]?.userId).toBe('user-admin')
    expect(next.notifications[0]?.kind).toBe('registration')
    expect(next.notifications[0]?.title).toBe('New dietitian registration')
    expect(next.notifications[0]?.body).toContain('Nina Cole registered as a dietitian')
    expect(next.notifications[0]?.href).toBe('/admin/applications/app-nina')
    expect(next.notifications[0]?.read).toBe(false)
  })

  it('requests more information without publishing the profile', () => {
    const next = appReducer(base, {
      type: 'REQUEST_MORE_INFO',
      applicationId: 'app-priya',
      message: 'Need a clearer license scan',
      reviewer: 'Amelia Ward',
    })
    expect(next.applications.find((item) => item.id === 'app-priya')?.status).toBe('needs_info')
    expect(next.applications.find((item) => item.id === 'app-priya')?.moreInfoRequest).toContain('clearer license')
  })

  it('sends a message and updates the conversation preview', () => {
    const next = appReducer(base, {
      type: 'SEND_MESSAGE',
      conversationId: 'conv-emily',
      senderId: 'user-sarah',
      text: 'See you Thursday',
    })
    expect(next.messages.at(-1)?.text).toBe('See you Thursday')
    expect(next.conversations.find((item) => item.id === 'conv-emily')?.lastMessage).toBe('See you Thursday')
  })

  it('prevents duplicate pending consultation requests', () => {
    const first = appReducer(base, {
      type: 'REQUEST_CONSULTATION',
      request: {
        patientId: 'user-sarah',
        dietitianId: 'dt-sophia',
        status: 'pending',
        createdAt: '2026-09-15T00:00:00.000Z',
        note: 'Help with PCOS',
      },
    })
    const second = appReducer(first, {
      type: 'REQUEST_CONSULTATION',
      request: {
        patientId: 'user-sarah',
        dietitianId: 'dt-sophia',
        status: 'pending',
        createdAt: '2026-09-15T00:00:00.000Z',
        note: 'Help with PCOS',
      },
    })
    expect(second.consultationRequests.filter((item) => item.dietitianId === 'dt-sophia')).toHaveLength(1)
  })

  it('accepting a request opens a conversation and books an appointment', () => {
    const requested = appReducer(base, {
      type: 'REQUEST_CONSULTATION',
      request: {
        patientId: 'user-sarah',
        dietitianId: 'dt-sophia',
        status: 'pending',
        createdAt: '2026-09-15T00:00:00.000Z',
        note: 'Help with PCOS',
      },
    })
    const requestId = requested.consultationRequests[0]?.id
    expect(requestId).toBeTruthy()
    const accepted = appReducer(requested, { type: 'RESPOND_CONSULTATION', id: requestId!, status: 'accepted' })
    expect(accepted.consultationRequests[0]?.status).toBe('accepted')
    expect(accepted.conversations.some((item) => item.participantIds.includes('user-sophia') || item.id.includes('sophia'))).toBe(true)
    expect(accepted.appointments[0]?.dietitianId).toBe('dt-sophia')
  })

  it('records a quote payment and marks the quote paid', () => {
    const withQuotes = createInitialState({
      ...base,
      paymentQuotes: [
        {
          id: 'quote-test',
          patientId: 'user-sarah',
          title: 'Video consult',
          description: '45 min',
          amount: 85,
          currency: 'GBP',
          kind: 'consult',
          status: 'open',
        },
      ],
      payments: [],
    })
    const next = appReducer(withQuotes, {
      type: 'ADD_PAYMENT',
      payment: {
        patientId: 'user-sarah',
        quoteId: 'quote-test',
        amount: 85,
        currency: 'GBP',
        method: 'Visa •4242',
        description: 'Video consult',
      },
    })
    expect(next.payments[0]?.amount).toBe(85)
    expect(next.paymentQuotes[0]?.status).toBe('paid')
  })

  it('adds and deletes a patient review on a specialist', () => {
    const added = appReducer(base, {
      type: 'ADD_REVIEW',
      dietitianId: 'dt-emily',
      review: { author: 'Sarah Bennett', authorId: 'user-sarah', rating: 5, text: 'Excellent care.' },
    })
    expect(added.dietitians.find((item) => item.id === 'dt-emily')?.reviews[0]?.authorId).toBe('user-sarah')
    const removed = appReducer(added, { type: 'DELETE_REVIEW', dietitianId: 'dt-emily', authorId: 'user-sarah' })
    expect(removed.dietitians.find((item) => item.id === 'dt-emily')?.reviews.some((item) => item.authorId === 'user-sarah')).toBe(false)
  })

  it('rings a video call that the other person can answer', () => {
    const ringing = appReducer(base, {
      type: 'START_CALL',
      call: {
        conversationId: 'conv-emily',
        peerId: 'user-emily',
        peerName: 'Dr. Emily Carter',
        peerAvatar: '',
      },
    })
    expect(ringing.activeCall?.status).toBe('ringing')
    expect(ringing.liveCalls[0]?.calleeId).toBe('user-emily')
    const emily = USERS.find((item) => item.id === 'user-emily')!
    const incoming = appReducer(ringing, { type: 'LOGIN', user: emily })
    expect(incoming.activeCall?.incoming).toBe(true)
    expect(incoming.activeCall?.peerId).toBe('user-sarah')
    const live = appReducer(incoming, { type: 'ANSWER_CALL' })
    expect(live.activeCall?.status).toBe('live')
    expect(live.liveCalls[0]?.status).toBe('live')
    const ended = appReducer(live, { type: 'END_CALL' })
    expect(ended.activeCall).toBeNull()
    expect(ended.liveCalls).toEqual([])
    expect(ended.messages.at(-1)?.text).toBe('Video call ended')
  })

  it('stores a preview url when a file is uploaded', () => {
    const next = appReducer(base, {
      type: 'UPLOAD_FILE',
      file: {
        ownerId: 'user-sarah',
        name: 'plate.jpg',
        category: 'photo',
        size: '20 KB',
        uploadedAt: '2026-09-16T00:00:00.000Z',
        url: 'data:image/jpeg;base64,xx',
      },
    })
    expect(next.files[0]?.url).toContain('data:image')
    expect(next.files[0]?.name).toBe('plate.jpg')
  })
})
