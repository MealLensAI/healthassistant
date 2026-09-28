export type Role = 'patient' | 'dietitian' | 'admin'

export type ApplicationStatus = 'draft' | 'pending' | 'approved' | 'needs_info' | 'rejected'
export type DietitianStatus = 'approved' | 'pending' | 'needs_info'
export type AppointmentStatus = 'upcoming' | 'completed' | 'cancelled' | 'deleted'
export type AppointmentType = 'video' | 'chat'
export type RequestStatus = 'pending' | 'accepted' | 'declined'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  avatar: string
  country?: string
  title?: string
  phone?: string
}

export interface EducationItem {
  school: string
  degree: string
  year: string
}

export interface ExperienceItem {
  role: string
  org: string
  years: string
}

export interface Review {
  id: string
  author: string
  authorId?: string
  rating: number
  text: string
  date: string
}

export interface CredentialDocument {
  id: string
  name: string
  kind: 'license' | 'degree' | 'cv' | 'photo'
  fileName: string
  issuer?: string
  issuedOn?: string
  reference?: string
  url?: string
  objectKey?: string
  bucket?: string
  mimeType?: string
  sizeBytes?: number
}

export interface AvailabilitySlot {
  day: string
  enabled: boolean
  start: string
  end: string
}

export interface Dietitian {
  id: string
  userId: string
  name: string
  title: string
  country: string
  specialties: string[]
  conditions: string[]
  yearsExperience: number
  rating: number
  reviewCount: number
  bio: string
  languages: string[]
  workplace: string
  avatar: string
  coverImage: string
  verified: boolean
  featured: boolean
  education: EducationItem[]
  experience: ExperienceItem[]
  documents: CredentialDocument[]
  reviews: Review[]
  availability: AvailabilitySlot[]
  status: DietitianStatus
}

export interface ApplicationDocument {
  kind: 'photo' | 'license' | 'degree1' | 'degree2' | 'cv'
  name: string
  fileName: string
  uploaded: boolean
  url?: string
  objectKey?: string
  bucket?: string
  mimeType?: string
  sizeBytes?: number
}

export interface DietitianApplication {
  id: string
  userId: string
  fullName: string
  email: string
  phone: string
  country: string
  yearsExperience: number
  bio: string
  specialties: string[]
  workplace: string
  languages: string[]
  education: EducationItem[]
  experience?: ExperienceItem[]
  documents: ApplicationDocument[]
  status: ApplicationStatus
  submittedAt: string
  adminNotes: string[]
  moreInfoRequest?: string
}

export interface MessageAttachment {
  name: string
  size: string
  url?: string
  type?: string
  objectKey?: string
  bucket?: string
  sizeBytes?: number
}

export type MessageDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  text: string
  timestamp: string
  attachments?: MessageAttachment[]
  status?: MessageDeliveryStatus
  deliveredAt?: string | null
  readAt?: string | null
}

export interface Conversation {
  id: string
  participantIds: string[]
  lastMessage: string
  lastAt: string
  lastReadAt?: Record<string, string>
  hiddenFor?: string[]
}

export interface Appointment {
  id: string
  patientId: string
  dietitianId: string
  date: string
  time: string
  status: AppointmentStatus
  type: AppointmentType
  topic: string
}

export interface PatientFile {
  id: string
  ownerId: string
  sharedWithId?: string
  name: string
  category: 'labs' | 'diary' | 'photo' | 'other'
  size: string
  uploadedAt: string
  url?: string
  objectKey?: string
  bucket?: string
  mimeType?: string
  sizeBytes?: number
}

export interface ConsultationRequest {
  id: string
  patientId: string
  dietitianId: string
  status: RequestStatus
  createdAt: string
  note: string
}

export interface VideoCallState {
  conversationId: string
  peerId: string
  peerName: string
  peerAvatar: string
  status?: 'ringing' | 'live'
  incoming?: boolean
  callId?: string
}

export interface CallSessionDescription {
  type: string
  sdp?: string
}

export interface CallIceCandidate {
  id: string
  fromId: string
  candidate: {
    candidate?: string
    sdpMid?: string | null
    sdpMLineIndex?: number | null
  }
}

export interface LiveCall {
  id: string
  conversationId: string
  callerId: string
  calleeId: string
  callerName: string
  callerAvatar: string
  calleeName: string
  calleeAvatar: string
  status: 'ringing' | 'live'
  startedAt: string
  offer?: CallSessionDescription | null
  answer?: CallSessionDescription | null
  ice?: CallIceCandidate[]
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

export interface MissedCall {
  id: string
  userId: string
  peerId: string
  peerName: string
  createdAt: string
  seen: boolean
}

export interface SearchFilters {
  query: string
  country: string
  specialty: string
  condition: string
}

export interface PatientCondition {
  name: string
  diagnosed: string
  physician: string
  clinic: string
}

export interface PatientProfile {
  userId: string
  legalName: string
  preferredName: string
  dateOfBirth: string
  age: number
  biologicalSex: string
  genderIdentity: string
  primaryLanguage: string
  phone: string
  emergencyContact: string
  emergencyPhone: string
  conditions: PatientCondition[]
  heightCm: number
  weightKg: number
  targetWeightKg: string
  bmi: number
  weightHistory: string
  allergies: string[]
  intolerances: string[]
  dietPreferences: string[]
  medications: string
  supplements: string
  occupation: string
  sleep: string
  exercise: string
  alcohol: string
  smoking: string
}

export interface PatientAccountSettings {
  userId: string
  email: string
  phone: string
  twoFactorSms: boolean
  twoFactorApp: boolean
  timeZone: string
  remind24h: boolean
  remind1h: boolean
  notifyPush: boolean
  notifyEmail: boolean
  notifySms: boolean
  quietHours: boolean
  quietFrom: string
  quietTo: string
  blurBackground: boolean
  cameraDefaultOn: boolean
  micDefaultOn: boolean
  blockedFileAccessIds: string[]
}

export interface DeviceSession {
  id: string
  userId: string
  device: string
  location: string
  lastActive: string
  current: boolean
}

export interface PaymentQuote {
  id: string
  patientId: string
  title: string
  description: string
  amount: number
  currency: string
  dietitianName?: string
  kind: 'consult' | 'package' | 'followup'
  status: 'open' | 'paid'
}

export interface Payment {
  id: string
  patientId: string
  quoteId?: string
  amount: number
  currency: string
  method: string
  status: 'paid'
  paidAt: string
  receipt: string
  description: string
}

export interface SavedPaymentMethod {
  id: string
  patientId: string
  label: string
  kind: 'card' | 'wallet' | 'hsa'
  last4?: string
  expiry?: string
  isDefault: boolean
}

export interface AppNotification {
  id: string
  userId: string
  kind: 'registration' | 'application' | 'info'
  title: string
  body: string
  href?: string
  createdAt: string
  read: boolean
}

export interface AppState {
  currentUser: User | null
  users: User[]
  dietitians: Dietitian[]
  applications: DietitianApplication[]
  conversations: Conversation[]
  messages: ChatMessage[]
  appointments: Appointment[]
  files: PatientFile[]
  consultationRequests: ConsultationRequest[]
  toasts: Toast[]
  activeCall: VideoCallState | null
  patientProfiles: PatientProfile[]
  patientSettings: PatientAccountSettings[]
  payments: Payment[]
  paymentQuotes: PaymentQuote[]
  paymentMethods: SavedPaymentMethod[]
  deviceSessions: DeviceSession[]
  missedCalls: MissedCall[]
  notifications: AppNotification[]
  liveCalls: LiveCall[]
}
