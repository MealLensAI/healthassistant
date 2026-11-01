import { describe, expect, it } from 'vitest'
import { USERS } from '@/lib/care/data/mock'
import { appReducer, createInitialState } from '@/lib/care/store'
import type { Dietitian, DietitianApplication, User } from '@/lib/care/types'

const patient = USERS.find((item) => item.id === 'user-sarah')!
const admin = USERS.find((item) => item.id === 'user-admin')!

const dietitianUser: User = {
  id: 'user-doc',
  name: 'Dr. Test Doc',
  email: 'doc@care.test',
  role: 'dietitian',
  avatar: '',
  country: 'Nigeria',
  title: 'Clinical Dietitian',
}

const pendingListing: Dietitian = {
  id: 'dt-pending',
  userId: 'user-doc',
  name: 'Dr. Test Doc',
  title: 'Clinical Dietitian',
  country: 'Nigeria',
  specialties: ['Diabetes'],
  conditions: ['Diabetes'],
  yearsExperience: 5,
  rating: 0,
  reviewCount: 0,
  bio: 'Clinical dietitian for tests.',
  languages: ['English'],
  workplace: 'Test Clinic',
  avatar: '',
  coverImage: '',
  verified: false,
  featured: false,
  education: [],
  experience: [],
  documents: [],
  reviews: [],
  availability: [],
  status: 'pending',
}

const application: DietitianApplication = {
  id: 'app-doc',
  userId: 'user-doc',
  fullName: 'Dr. Test Doc',
  email: 'doc@care.test',
  phone: '555',
  country: 'Nigeria',
  yearsExperience: 5,
  bio: 'Clinical dietitian for tests with enough detail.',
  specialties: ['Diabetes'],
  workplace: 'Test Clinic',
  languages: ['English'],
  education: [{ school: 'Test Uni', degree: 'MSc', year: '2018' }],
  experience: [{ role: 'Dietitian', org: 'Test Clinic', years: 'Current' }],
  documents: [
    { kind: 'photo', name: 'Photo', fileName: 'photo.jpg', uploaded: true, url: 'https://example.com/photo.jpg' },
    { kind: 'license', name: 'License', fileName: 'license.pdf', uploaded: true, objectKey: 'user-doc/license.pdf' },
  ],
  status: 'pending',
  submittedAt: '2026-09-16T12:00:00.000Z',
  adminNotes: [],
}

const base = createInitialState({
  users: [patient, admin, dietitianUser],
  dietitians: [pendingListing],
  applications: [application],
  conversations: [
    {
      id: 'conv-test',
      participantIds: [patient.id, dietitianUser.id],
      lastMessage: 'Hello',
      lastAt: '2026-09-15T16:40:00.000Z',
      lastReadAt: {},
    },
  ],
  messages: [],
  currentUser: patient,
})

describe('appReducer', () => {
  it('approves an application and publishes the dietitian', () => {
    const next = appReducer(base, {
      type: 'APPROVE_APPLICATION',
      applicationId: 'app-doc',
      reviewer: 'Amelia Ward',
    })
    expect(next.applications.find((item) => item.id === 'app-doc')?.status).toBe('approved')
    expect(next.dietitians.find((item) => item.id === 'dt-pending')?.status).toBe('approved')
    expect(next.dietitians.find((item) => item.id === 'dt-pending')?.verified).toBe(true)
  })

  it('notifies admins when a patient books an appointment', () => {
    const live = { ...pendingListing, status: 'approved' as const, verified: true }
    const next = appReducer({ ...base, dietitians: [live] }, {
      type: 'ADD_APPOINTMENT',
      patientId: patient.id,
      dietitianId: live.id,
      date: '2026-11-04',
      time: '10:00',
      topic: 'First consult',
      kind: 'video',
    })
    expect(next.appointments[0]?.patientId).toBe(patient.id)
    expect(next.notifications[0]?.userId).toBe('user-admin')
    expect(next.notifications[0]?.title).toBe('New appointment booked')
    expect(next.notifications[0]?.href).toBe('/admin/bookings')
    expect(next.notifications[0]?.body).toContain(patient.name)
    expect(next.notifications[0]?.body).toContain(live.name)
  })

  it('notifies admins when someone registers as a dietitian', () => {
    const next = appReducer(base, {
      type: 'SUBMIT_APPLICATION',
      application: {
        ...application,
        id: 'app-nina',
        userId: 'user-nina',
        fullName: 'Nina Cole',
      },
    })
    expect(next.notifications[0]?.userId).toBe('user-admin')
    expect(next.notifications[0]?.kind).toBe('registration')
    expect(next.notifications[0]?.title).toBe('New dietitian registration')
  })

  it('requests more information without publishing the profile', () => {
    const next = appReducer(base, {
      type: 'REQUEST_MORE_INFO',
      applicationId: 'app-doc',
      message: 'Need a clearer license scan',
      reviewer: 'Amelia Ward',
    })
    expect(next.applications.find((item) => item.id === 'app-doc')?.status).toBe('needs_info')
    expect(next.applications.find((item) => item.id === 'app-doc')?.moreInfoRequest).toContain('clearer license')
  })

  it('sends a message and updates the conversation preview', () => {
    const next = appReducer(base, {
      type: 'SEND_MESSAGE',
      conversationId: 'conv-test',
      senderId: 'user-sarah',
      text: 'See you Thursday',
    })
    expect(next.messages.at(-1)?.text).toBe('See you Thursday')
    expect(next.conversations.find((item) => item.id === 'conv-test')?.lastMessage).toBe('See you Thursday')
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
    const live = {
      ...pendingListing,
      status: 'approved' as const,
      verified: true,
      reviews: [] as Dietitian['reviews'],
    }
    const withListing = { ...base, dietitians: [live] }
    const added = appReducer(withListing, {
      type: 'ADD_REVIEW',
      dietitianId: 'dt-pending',
      review: { author: 'Sarah Bennett', authorId: 'user-sarah', rating: 5, text: 'Excellent care.' },
    })
    expect(added.dietitians.find((item) => item.id === 'dt-pending')?.reviews[0]?.authorId).toBe('user-sarah')
    const removed = appReducer(added, { type: 'DELETE_REVIEW', dietitianId: 'dt-pending', authorId: 'user-sarah' })
    expect(removed.dietitians.find((item) => item.id === 'dt-pending')?.reviews.some((item) => item.authorId === 'user-sarah')).toBe(false)
  })

  it('rings a video call that the other person can answer', () => {
    const ringing = appReducer(base, {
      type: 'START_CALL',
      call: {
        conversationId: 'conv-test',
        peerId: dietitianUser.id,
        peerName: dietitianUser.name,
        peerAvatar: '',
      },
    })
    expect(ringing.activeCall?.status).toBe('ringing')
    expect(ringing.liveCalls[0]?.calleeId).toBe(dietitianUser.id)
    const incoming = appReducer(ringing, { type: 'LOGIN', user: dietitianUser })
    expect(incoming.activeCall?.incoming).toBe(true)
    expect(incoming.activeCall?.peerId).toBe('user-sarah')
    const live = appReducer(incoming, { type: 'ANSWER_CALL' })
    expect(live.activeCall?.status).toBe('live')
    const ended = appReducer(live, { type: 'END_CALL' })
    expect(ended.activeCall).toBeNull()
    expect(ended.liveCalls).toEqual([])
  })

  it('counts an appointment only after a live call ends', () => {
    const booked = {
      ...base,
      dietitians: [{ ...pendingListing, status: 'approved' as const, verified: true }],
      appointments: [
        {
          id: 'apt-1',
          patientId: patient.id,
          dietitianId: pendingListing.id,
          date: '2026-10-12',
          time: '10:00',
          status: 'upcoming' as const,
          type: 'video' as const,
          topic: 'Consultation',
          visitKind: 'consultation' as const,
        },
      ],
    }
    const ringing = appReducer(booked, {
      type: 'START_CALL',
      call: {
        conversationId: 'conv-test',
        peerId: dietitianUser.id,
        peerName: dietitianUser.name,
        peerAvatar: '',
      },
    })
    const incoming = appReducer(ringing, { type: 'LOGIN', user: dietitianUser })
    const live = appReducer(incoming, { type: 'ANSWER_CALL' })
    expect(live.appointments[0]?.status).toBe('upcoming')
    const ended = appReducer(live, { type: 'END_CALL' })
    expect(ended.appointments[0]?.status).toBe('completed')
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
