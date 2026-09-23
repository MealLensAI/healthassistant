import type { Appointment, Conversation, Dietitian, PatientFile, PatientProfile, User } from '../types'

export function carePatientIds({
  currentUserId,
  dietitians,
  appointments,
  conversations,
  consultationPatientIds = [],
}: {
  currentUserId: string
  dietitians: Dietitian[]
  appointments: Appointment[]
  conversations: Conversation[]
  consultationPatientIds?: string[]
}) {
  const me = dietitians.find((item) => item.userId === currentUserId)
  const ids = new Set<string>(consultationPatientIds)
  if (me) {
    appointments.forEach((appointment) => {
      if (appointment.dietitianId === me.id) ids.add(appointment.patientId)
    })
  }
  conversations.forEach((conversation) => {
    if (!conversation.participantIds.includes(currentUserId)) return
    conversation.participantIds.forEach((id) => {
      if (id !== currentUserId) ids.add(id)
    })
  })
  return ids
}

export function carePatients(users: User[], patientIds: Set<string>) {
  return users.filter((user) => user.role === 'patient' && patientIds.has(user.id))
}

export function filesForPatient(files: PatientFile[], patientId: string) {
  return files.filter((file) => file.ownerId === patientId)
}

export function emptyPatientProfile(userId: string, name: string, extras: Partial<PatientProfile> = {}): PatientProfile {
  const first = name.split(' ')[0] ?? name
  const { userId: _ignored, ...rest } = extras
  void _ignored
  return {
    userId,
    legalName: name,
    preferredName: first,
    dateOfBirth: '',
    age: 0,
    biologicalSex: '',
    genderIdentity: '',
    primaryLanguage: 'English',
    phone: '',
    emergencyContact: '',
    emergencyPhone: '',
    conditions: [{ name: '', diagnosed: '', physician: '', clinic: '' }],
    heightCm: 0,
    weightKg: 0,
    targetWeightKg: '',
    bmi: 0,
    weightHistory: '',
    allergies: [],
    intolerances: [],
    dietPreferences: [],
    medications: '',
    supplements: '',
    occupation: '',
    sleep: '',
    exercise: '',
    alcohol: '',
    smoking: '',
    ...rest,
  }
}

export function mergePatientProfile(live?: PatientProfile, seed?: PatientProfile): PatientProfile | undefined {
  if (!live && !seed) return undefined
  const base = seed ?? live
  const next = live ?? seed
  if (!base || !next) return undefined
  return {
    ...base,
    ...next,
    conditions: next.conditions?.length ? next.conditions : base.conditions ?? [],
    allergies: next.allergies ?? base.allergies ?? [],
    intolerances: next.intolerances ?? base.intolerances ?? [],
    dietPreferences: next.dietPreferences ?? base.dietPreferences ?? [],
  }
}

export function mergePatientProfiles(live: PatientProfile[] | undefined, seed: PatientProfile[]) {
  const source = live?.length ? live : seed
  const byId = new Map(source.map((item) => [item.userId, item]))
  for (const item of seed) {
    byId.set(item.userId, mergePatientProfile(byId.get(item.userId), item) ?? item)
  }
  return [...byId.values()]
}

export function mergePatientFiles(live: PatientFile[] | undefined, seed: PatientFile[]) {
  if (!live?.length) return seed
  const owners = new Set(live.map((item) => item.ownerId))
  return [...live, ...seed.filter((item) => !owners.has(item.ownerId))]
}

export function patientBlocksFileAccess(blockedIds: string[] | undefined, dietitianUserId: string) {
  return Boolean(blockedIds?.includes(dietitianUserId))
}

export function filesVisibleToViewer({
  files,
  patientId,
  viewerId,
  viewerRole,
  blockedIds,
}: {
  files: PatientFile[]
  patientId: string
  viewerId?: string
  viewerRole?: string
  blockedIds?: string[]
}) {
  const records = filesForPatient(files, patientId)
  if (viewerRole === 'admin' || viewerId === patientId) return records
  if (viewerId && patientBlocksFileAccess(blockedIds, viewerId)) return []
  return records
}

export function isImageFile(file: PatientFile) {
  return (
    file.category === 'photo' ||
    file.url?.startsWith('data:image/') ||
    /\.(png|jpe?g|gif|webp|avif)$/i.test(file.name)
  )
}
