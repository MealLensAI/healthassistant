import { defaultAvailability } from '@/lib/care/utils'
import type {
  Appointment,
  ChatMessage,
  ConsultationRequest,
  Conversation,
  DeviceSession,
  Dietitian,
  DietitianApplication,
  MissedCall,
  AppNotification,
  PatientAccountSettings,
  PatientFile,
  PatientProfile,
  Payment,
  PaymentQuote,
  SavedPaymentMethod,
  User,
} from '../types'

export const SPECIALTIES = [
  'Diabetes',
  'IBS',
  'Weight Management',
  'PCOS',
  'Heart Health',
  'Sports Nutrition',
  'Pediatric Nutrition',
  'Renal',
  'Clinical Nutrition',
  'Digestive Disorders',
]

export const CONDITIONS = [
  'Diabetes',
  'IBS',
  'PCOS',
  'Heart Disease',
  'Celiac',
  'Obesity',
  'Hypertension',
]

export const COUNTRIES = ['United States', 'United Kingdom', 'Italy', 'Canada', 'India']

const COVER =
  'https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&w=1600&q=80'
const COVER_SALAD =
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1600&q=80'

export const USERS: User[] = [
  {
    id: 'user-sarah',
    name: 'Sarah Bennett',
    email: 'sarah@healthyyou.com',
    role: 'patient',
    avatar:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    country: 'United Kingdom',
  },
  {
    id: 'user-emily',
    name: 'Dr. Emily Carter',
    email: 'emily@healthyyou.com',
    role: 'dietitian',
    avatar:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
    country: 'United States',
    title: 'Clinical Dietitian',
    phone: '+1 415 555 0142',
  },
  {
    id: 'user-marcus',
    name: 'Dr. Marcus Chen',
    email: 'marcus@healthyyou.com',
    role: 'dietitian',
    avatar:
      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
    country: 'Canada',
    title: 'Registered Dietitian',
  },
  {
    id: 'user-admin',
    name: 'Amelia Ward',
    email: 'admin@healthyyou.com',
    role: 'admin',
    avatar:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    title: 'Verification Lead',
  },
  {
    id: 'user-priya',
    name: 'Priya Sharma',
    email: 'priya.sharma@clinic.test',
    role: 'dietitian',
    avatar:
      'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=80',
    country: 'United Kingdom',
    title: 'Diabetes Specialty Dietitian',
    phone: '+44 20 7946 0991',
  },
]

export const DIETITIANS: Dietitian[] = [
  {
    id: 'dt-emily',
    userId: 'user-emily',
    name: 'Dr. Emily Carter',
    title: 'Clinical Dietitian',
    country: 'United States',
    specialties: ['Diabetes', 'IBS', 'Clinical Nutrition'],
    conditions: ['Diabetes', 'IBS', 'Celiac'],
    yearsExperience: 14,
    rating: 4.8,
    reviewCount: 215,
    bio: 'I am a registered dietitian with 14 years of experience in managing metabolic nutrition skills, with a special focus on diabetes, heart health, and weight management. I help patients translate clinical goals into meals they can actually keep.',
    languages: ['English', 'Spanish'],
    workplace: 'Pacific Nutrition Clinic',
    avatar:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
    coverImage: COVER,
    verified: true,
    featured: true,
    education: [
      { school: 'Stanford University', degree: 'M.S. Clinical Nutrition', year: '2012' },
      { school: 'UCLA', degree: 'B.S. Nutritional Science', year: '2009' },
    ],
    experience: [
      { role: 'Lead Clinical Dietitian', org: 'Pacific Nutrition Clinic', years: '2018 — Present' },
      { role: 'Diabetes Educator', org: 'Bay Area Health', years: '2012 — 2018' },
    ],
    documents: [
      {
        id: 'doc-e1',
        name: 'Practice License',
        kind: 'license',
        fileName: 'emily-license.pdf',
        issuer: 'Health & Care Professions Council',
        issuedOn: '2012-06-18',
        reference: 'DT-44821',
      },
      {
        id: 'doc-e2',
        name: 'University Degree',
        kind: 'degree',
        fileName: 'emily-ms-nutrition.pdf',
        issuer: 'Stanford University',
        issuedOn: '2012-06-12',
        reference: 'M.S. Clinical Nutrition',
      },
      { id: 'doc-e3', name: 'Curriculum Vitae', kind: 'cv', fileName: 'emily-cv.pdf', issuer: 'Pacific Nutrition Clinic' },
    ],
    reviews: [
      {
        id: 'rv-1',
        author: 'Priya S.',
        rating: 5,
        text: 'Emily helped me stabilize my glucose without feeling deprived. Clear, kind, and very practical.',
        date: '2026-07-12',
      },
      {
        id: 'rv-2',
        author: 'James L.',
        rating: 5,
        text: 'The IBS protocol finally made sense. I had my first comfortable week in months.',
        date: '2026-05-03',
      },
    ],
    availability: defaultAvailability(),
    status: 'approved',
  },
  {
    id: 'dt-maria',
    userId: 'user-maria',
    name: 'Maria Lopez',
    title: 'Registered Dietitian',
    country: 'Italy',
    specialties: ['Weight Management', 'PCOS', 'Mediterranean'],
    conditions: ['PCOS', 'Obesity', 'Hypertension'],
    yearsExperience: 9,
    rating: 4.8,
    reviewCount: 90,
    bio: 'Mediterranean-forward care for women managing PCOS, insulin resistance, and sustainable weight change.',
    languages: ['Italian', 'English'],
    workplace: 'Studio Nutrizione Milano',
    avatar:
      'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=400&q=80',
    coverImage: COVER_SALAD,
    verified: true,
    featured: true,
    education: [{ school: 'University of Milan', degree: 'M.Sc. Human Nutrition', year: '2016' }],
    experience: [{ role: 'Clinical Dietitian', org: 'Studio Nutrizione Milano', years: '2016 — Present' }],
    documents: [
      { id: 'doc-m1', name: 'Practice License', kind: 'license', fileName: 'maria-license.pdf' },
      { id: 'doc-m2', name: 'University Degree', kind: 'degree', fileName: 'maria-degree.pdf' },
    ],
    reviews: [
      {
        id: 'rv-3',
        author: 'Giulia R.',
        rating: 5,
        text: 'Thoughtful PCOS plan that respected Italian family meals.',
        date: '2026-06-18',
      },
    ],
    availability: defaultAvailability(),
    status: 'approved',
  },
  {
    id: 'dt-ahmad',
    userId: 'user-ahmad',
    name: 'Ahmad Hassan',
    title: 'Clinical Dietitian',
    country: 'Canada',
    specialties: ['Heart Health', 'Diabetes', 'Renal'],
    conditions: ['Heart Disease', 'Diabetes', 'Hypertension'],
    yearsExperience: 11,
    rating: 4.7,
    reviewCount: 72,
    bio: 'Cardiometabolic nutrition for patients navigating heart disease, diabetes, and kidney-conscious eating.',
    languages: ['English', 'Arabic'],
    workplace: 'Toronto Heart & Nutrition',
    avatar:
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80',
    coverImage: COVER,
    verified: true,
    featured: true,
    education: [{ school: 'University of Toronto', degree: 'M.H.Sc. Nutrition', year: '2014' }],
    experience: [{ role: 'Cardiac Dietitian', org: 'Toronto Heart & Nutrition', years: '2015 — Present' }],
    documents: [
      { id: 'doc-a1', name: 'Practice License', kind: 'license', fileName: 'ahmad-license.pdf' },
      { id: 'doc-a2', name: 'University Degree', kind: 'degree', fileName: 'ahmad-degree.pdf' },
    ],
    reviews: [
      {
        id: 'rv-4',
        author: 'Helen M.',
        rating: 5,
        text: 'After my stent, Ahmad made low-sodium cooking feel doable.',
        date: '2026-04-02',
      },
    ],
    availability: defaultAvailability(),
    status: 'approved',
  },
  {
    id: 'dt-sophia',
    userId: 'user-sophia',
    name: 'Sophia Martin',
    title: 'Dietitian',
    country: 'India',
    specialties: ['Weight Management', 'PCOS', 'Diabetes'],
    conditions: ['PCOS', 'Obesity', 'Diabetes'],
    yearsExperience: 7,
    rating: 4.6,
    reviewCount: 54,
    bio: 'Culturally grounded plans for PCOS and type 2 diabetes, built around home cooking and family rhythms.',
    languages: ['English', 'Hindi'],
    workplace: 'Nourish Clinic Bengaluru',
    avatar:
      'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=400&q=80',
    coverImage: COVER_SALAD,
    verified: true,
    featured: true,
    education: [{ school: 'AIIMS Delhi', degree: 'M.Sc. Dietetics', year: '2018' }],
    experience: [{ role: 'Consulting Dietitian', org: 'Nourish Clinic Bengaluru', years: '2018 — Present' }],
    documents: [
      { id: 'doc-s1', name: 'Practice License', kind: 'license', fileName: 'sophia-license.pdf' },
      { id: 'doc-s2', name: 'University Degree', kind: 'degree', fileName: 'sophia-degree.pdf' },
    ],
    reviews: [],
    availability: defaultAvailability(),
    status: 'approved',
  },
  {
    id: 'dt-elena',
    userId: 'user-elena',
    name: 'Dr. Elena Rossi',
    title: 'Clinical Dietitian',
    country: 'Italy',
    specialties: ['Diabetes', 'Digestive Disorders'],
    conditions: ['Diabetes', 'IBS', 'Celiac'],
    yearsExperience: 15,
    rating: 4.9,
    reviewCount: 134,
    bio: 'Evidence-based Mediterranean protocols for diabetes and complex digestive conditions.',
    languages: ['Italian', 'English', 'French'],
    workplace: 'Roma Clinical Nutrition',
    avatar:
      'https://images.unsplash.com/photo-1651009757985-0f90c8907259?auto=format&fit=crop&w=400&q=80',
    coverImage: COVER,
    verified: true,
    featured: false,
    education: [{ school: 'Sapienza University', degree: 'Ph.D. Nutrition Science', year: '2011' }],
    experience: [{ role: 'Director of Nutrition', org: 'Roma Clinical Nutrition', years: '2013 — Present' }],
    documents: [
      { id: 'doc-el1', name: 'Practice License', kind: 'license', fileName: 'elena-license.pdf' },
    ],
    reviews: [],
    availability: defaultAvailability(),
    status: 'approved',
  },
  {
    id: 'dt-lee',
    userId: 'user-lee',
    name: 'Sarah Lee',
    title: 'Registered Dietitian',
    country: 'United Kingdom',
    specialties: ['IBS', 'Digestive Disorders', 'Sports Nutrition'],
    conditions: ['IBS', 'Celiac'],
    yearsExperience: 8,
    rating: 4.7,
    reviewCount: 61,
    bio: 'Low-FODMAP and performance nutrition for patients who want to eat well without guesswork.',
    languages: ['English'],
    workplace: 'Gut Health London',
    avatar:
      'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=400&q=80',
    coverImage: COVER_SALAD,
    verified: true,
    featured: false,
    education: [{ school: "King's College London", degree: 'M.Sc. Dietetics', year: '2017' }],
    experience: [{ role: 'GI Dietitian', org: 'Gut Health London', years: '2017 — Present' }],
    documents: [
      { id: 'doc-l1', name: 'Practice License', kind: 'license', fileName: 'lee-license.pdf' },
    ],
    reviews: [],
    availability: defaultAvailability(),
    status: 'approved',
  },
  {
    id: 'dt-marcus',
    userId: 'user-marcus',
    name: 'Dr. Marcus Chen',
    title: 'Registered Dietitian',
    country: 'Canada',
    specialties: ['IBS', 'Diabetes'],
    conditions: ['IBS', 'Diabetes'],
    yearsExperience: 10,
    rating: 0,
    reviewCount: 0,
    bio: 'South-east Asian and Canadian food culture, applied to IBS, diabetes, and cardiometabolic recovery.',
    languages: ['English', 'Mandarin'],
    workplace: 'Vancouver Digestive Health',
    avatar:
      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
    coverImage: COVER,
    verified: false,
    featured: false,
    education: [
      { school: 'UBC', degree: 'M.Sc. Human Nutrition', year: '2015' },
      { school: 'McGill University', degree: 'B.Sc. Dietetics', year: '2013' },
    ],
    experience: [
      { role: 'Clinical Dietitian', org: 'Vancouver Digestive Health', years: '2016 — Present' },
      { role: 'GI Nutrition Fellow', org: 'St. Paul’s Hospital', years: '2015 — 2016' },
    ],
    documents: [
      { id: 'doc-mc1', name: 'Practice License', kind: 'license', fileName: 'marcus-license.pdf' },
      { id: 'doc-mc2', name: 'University Degree 1', kind: 'degree', fileName: 'marcus-msc.pdf' },
      { id: 'doc-mc3', name: 'University Degree 2', kind: 'degree', fileName: 'marcus-bsc.pdf' },
    ],
    reviews: [],
    availability: defaultAvailability().map((slot) =>
      slot.day === 'Mon' || slot.day === 'Tue' || slot.day === 'Wed'
        ? { ...slot, start: '12:00', end: '17:00' }
        : slot,
    ),
    status: 'pending',
  },
]

export const APPLICATIONS: DietitianApplication[] = [
  {
    id: 'app-marcus',
    userId: 'user-marcus',
    fullName: 'Dr. Marcus Chen',
    email: 'marcus@healthyyou.com',
    phone: '+1 604 555 0144',
    country: 'Canada',
    yearsExperience: 10,
    bio: 'South-east Asian and Canadian food culture, applied to IBS, diabetes, and cardiometabolic recovery. I have spent a decade in outpatient GI nutrition.',
    specialties: ['IBS', 'Diabetes'],
    workplace: 'Vancouver Digestive Health',
    languages: ['English', 'Mandarin'],
    education: [
      { school: 'UBC', degree: 'M.Sc. Human Nutrition', year: '2015' },
      { school: 'McGill University', degree: 'B.Sc. Dietetics', year: '2013' },
    ],
    experience: [
      { role: 'Clinical Dietitian', org: 'Vancouver Digestive Health', years: '2016 — Present' },
      { role: 'GI Nutrition Fellow', org: 'St. Paul’s Hospital', years: '2015 — 2016' },
    ],
    documents: [
      {
        kind: 'photo',
        name: 'Profile Photo',
        fileName: 'marcus-photo.jpg',
        uploaded: true,
        url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
      },
      { kind: 'license', name: 'Practice License', fileName: 'marcus-license.pdf', uploaded: true },
      { kind: 'degree1', name: 'University Degree 1', fileName: 'marcus-msc.pdf', uploaded: true },
      { kind: 'degree2', name: 'University Degree 2', fileName: 'marcus-bsc.pdf', uploaded: true },
    ],
    status: 'pending',
    submittedAt: '2026-09-10T09:00:00.000Z',
    adminNotes: [],
  },
  {
    id: 'app-priya',
    userId: 'user-priya',
    fullName: 'Priya Sharma',
    email: 'priya.sharma@clinic.test',
    phone: '+44 20 7946 0991',
    country: 'United Kingdom',
    yearsExperience: 6,
    bio: 'Diabetes specialty dietitian focused on South Asian dietary patterns, gestational diabetes, and culturally specific carbohydrate counting.',
    specialties: ['Diabetes', 'PCOS'],
    workplace: 'NHS Community Nutrition',
    languages: ['English', 'Hindi', 'Gujarati'],
    education: [
      { school: 'Kingston University', degree: 'M.Sc. Dietetics', year: '2019' },
      { school: 'University of Leeds', degree: 'B.Sc. Nutrition', year: '2017' },
    ],
    experience: [
      { role: 'Diabetes Specialty Dietitian', org: 'NHS Community Nutrition', years: '2020 — Present' },
      { role: 'Rotational Dietitian', org: 'Leeds Teaching Hospitals', years: '2017 — 2020' },
    ],
    documents: [
      {
        kind: 'photo',
        name: 'Profile Photo',
        fileName: 'priya-photo.jpg',
        uploaded: true,
        url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=80',
      },
      { kind: 'license', name: 'Practice License', fileName: 'priya-hpc.pdf', uploaded: true },
      { kind: 'degree1', name: 'University Degree 1', fileName: 'priya-msc.pdf', uploaded: true },
      { kind: 'degree2', name: 'University Degree 2', fileName: 'priya-bsc.pdf', uploaded: true },
    ],
    status: 'pending',
    submittedAt: '2026-09-12T14:20:00.000Z',
    adminNotes: [],
  },
]

export const NOTIFICATIONS: AppNotification[] = APPLICATIONS.filter(
  (item) => item.status === 'pending' || item.status === 'needs_info',
).map((item) => ({
  id: `ntf-${item.id}`,
  userId: 'user-admin',
  kind: 'registration',
  title: 'New dietitian registration',
  body: `${item.fullName} registered as a dietitian and is waiting for verification.`,
  href: `/admin/applications/${item.id}`,
  createdAt: item.submittedAt,
  read: false,
}))

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-emily',
    participantIds: ['user-sarah', 'user-emily'],
    lastMessage: 'I uploaded this week’s food diary and the new labs.',
    lastAt: '2026-09-15T16:40:00.000Z',
    lastReadAt: {
      'user-sarah': '2026-09-15T16:40:00.000Z',
      'user-emily': '2026-09-15T09:24:00.000Z',
    },
  },
  {
    id: 'conv-maria',
    participantIds: ['user-sarah', 'user-maria'],
    lastMessage: 'Let’s keep the evening carbs earlier this week.',
    lastAt: '2026-09-14T11:12:00.000Z',
    lastReadAt: {
      'user-sarah': '2026-09-14T11:12:00.000Z',
      'user-maria': '2026-09-14T11:12:00.000Z',
    },
  },
]

export const MISSED_CALLS: MissedCall[] = [
  {
    id: 'miss-1',
    userId: 'user-emily',
    peerId: 'user-sarah',
    peerName: 'Sarah Bennett',
    createdAt: '2026-09-15T18:10:00.000Z',
    seen: false,
  },
]

export const MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-emily',
    senderId: 'user-emily',
    text: 'Good morning Sarah — how did breakfast sit with you after yesterday’s adjustments?',
    timestamp: '2026-09-15T09:12:00.000Z',
  },
  {
    id: 'msg-2',
    conversationId: 'conv-emily',
    senderId: 'user-sarah',
    text: 'Much better. The oats + chia mix kept me steady until lunch.',
    timestamp: '2026-09-15T09:20:00.000Z',
  },
  {
    id: 'msg-3',
    conversationId: 'conv-emily',
    senderId: 'user-emily',
    text: 'Wonderful. If you can share this week’s food diary and the new labs, I’ll refine Thursday’s meal plan before our video consult.',
    timestamp: '2026-09-15T09:24:00.000Z',
  },
  {
    id: 'msg-4',
    conversationId: 'conv-emily',
    senderId: 'user-sarah',
    text: 'I uploaded this week’s food diary and the new labs.',
    timestamp: '2026-09-15T16:40:00.000Z',
    attachments: [{ name: 'food-diary-sep.pdf', size: '420 KB' }],
  },
  {
    id: 'msg-5',
    conversationId: 'conv-maria',
    senderId: 'user-maria',
    text: 'Let’s keep the evening carbs earlier this week.',
    timestamp: '2026-09-14T11:12:00.000Z',
  },
]

export const APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    patientId: 'user-sarah',
    dietitianId: 'dt-emily',
    date: '2026-09-18',
    time: '14:00',
    status: 'upcoming',
    type: 'video',
    topic: 'Diabetes meal plan review',
  },
  {
    id: 'apt-2',
    patientId: 'user-sarah',
    dietitianId: 'dt-maria',
    date: '2026-09-22',
    time: '10:30',
    status: 'upcoming',
    type: 'chat',
    topic: 'PCOS check-in',
  },
  {
    id: 'apt-3',
    patientId: 'user-sarah',
    dietitianId: 'dt-emily',
    date: '2026-09-04',
    time: '15:00',
    status: 'completed',
    type: 'video',
    topic: 'Initial consultation',
  },
]

export const FILES: PatientFile[] = [
  {
    id: 'file-1',
    ownerId: 'user-sarah',
    sharedWithId: 'user-emily',
    name: 'HbA1c-labs-september.pdf',
    category: 'labs',
    size: '280 KB',
    uploadedAt: '2026-09-15T16:32:00.000Z',
  },
  {
    id: 'file-2',
    ownerId: 'user-sarah',
    sharedWithId: 'user-emily',
    name: 'food-diary-sep.pdf',
    category: 'diary',
    size: '420 KB',
    uploadedAt: '2026-09-15T16:38:00.000Z',
  },
  {
    id: 'file-3',
    ownerId: 'user-sarah',
    name: 'breakfast-photo.jpg',
    category: 'photo',
    size: '1.2 MB',
    uploadedAt: '2026-09-13T08:11:00.000Z',
    url: 'https://images.unsplash.com/photo-1493770348161-369560ae630e?auto=format&fit=crop&w=1200&q=80',
  },
]

export const CONSULTATION_REQUESTS: ConsultationRequest[] = [
  {
    id: 'req-1',
    patientId: 'user-sarah',
    dietitianId: 'dt-ahmad',
    status: 'pending',
    createdAt: '2026-09-13T10:00:00.000Z',
    note: 'Looking for heart-health support alongside my diabetes plan.',
  },
]

export const PATIENT_PROFILES: PatientProfile[] = [
  {
    userId: 'user-sarah',
    legalName: 'Sarah Elizabeth Bennett',
    preferredName: 'Sarah',
    dateOfBirth: '1992-04-18',
    age: 34,
    biologicalSex: 'Female',
    genderIdentity: 'Woman',
    primaryLanguage: 'English',
    phone: '+44 7700 900184',
    emergencyContact: 'James Bennett (partner)',
    emergencyPhone: '+44 7700 900185',
    conditions: [
      {
        name: 'Type 2 Diabetes',
        diagnosed: '2021-06-12',
        physician: 'Dr. Helen Okonkwo',
        clinic: 'Camden Metabolic Clinic',
      },
      {
        name: 'IBS',
        diagnosed: '2019-11-03',
        physician: 'Dr. Helen Okonkwo',
        clinic: 'Camden Metabolic Clinic',
      },
    ],
    heightCm: 165,
    weightKg: 72.4,
    targetWeightKg: '64–68',
    bmi: 26.6,
    weightHistory: 'Gained ~8kg after diagnosis in 2021; stable for the last 6 months.',
    allergies: ['Peanuts', 'Shellfish'],
    intolerances: ['Lactose', 'High-FODMAP onion/garlic'],
    dietPreferences: ['Mediterranean-forward', 'Low-FODMAP when flaring'],
    medications: 'Metformin 500mg twice daily; Ramipril 2.5mg daily',
    supplements: 'Vitamin D3 2000 IU; Magnesium glycinate 200mg at night',
    occupation: 'Product manager — mostly sedentary, 2 office days',
    sleep: '6.5–7 hours, later bedtime on weeknights',
    exercise: '2x strength, 1x 40-min walk most weeks',
    alcohol: '2–3 glasses of wine per week',
    smoking: 'Never',
  },
]

export const PATIENT_SETTINGS: PatientAccountSettings[] = [
  {
    userId: 'user-sarah',
    email: 'sarah@healthyyou.com',
    phone: '+44 7700 900184',
    twoFactorSms: true,
    twoFactorApp: false,
    timeZone: 'Europe/London',
    remind24h: true,
    remind1h: true,
    notifyPush: true,
    notifyEmail: true,
    notifySms: false,
    quietHours: true,
    quietFrom: '21:00',
    quietTo: '07:30',
    blurBackground: true,
    cameraDefaultOn: true,
    micDefaultOn: true,
    blockedFileAccessIds: [],
  },
]

export const DEVICE_SESSIONS: DeviceSession[] = [
  {
    id: 'sess-1',
    userId: 'user-sarah',
    device: 'MacBook Air · Chrome',
    location: 'London, UK',
    lastActive: 'Now',
    current: true,
  },
  {
    id: 'sess-2',
    userId: 'user-sarah',
    device: 'iPhone 15 · Safari',
    location: 'London, UK',
    lastActive: 'Yesterday, 8:14 PM',
    current: false,
  },
  {
    id: 'sess-emily-1',
    userId: 'user-emily',
    device: 'MacBook Pro · Chrome',
    location: 'San Francisco, US',
    lastActive: 'Now',
    current: true,
  },
  {
    id: 'sess-emily-2',
    userId: 'user-emily',
    device: 'iPhone 15 · Safari',
    location: 'San Francisco, US',
    lastActive: 'Today, 7:40 AM',
    current: false,
  },
]

export const PAYMENT_METHODS: SavedPaymentMethod[] = [
  {
    id: 'pm-1',
    patientId: 'user-sarah',
    label: 'Visa',
    kind: 'card',
    last4: '4242',
    expiry: '09/28',
    isDefault: true,
  },
  {
    id: 'pm-2',
    patientId: 'user-sarah',
    label: 'Apple Pay',
    kind: 'wallet',
    isDefault: false,
  },
  {
    id: 'pm-3',
    patientId: 'user-sarah',
    label: 'HSA / FSA card',
    kind: 'hsa',
    last4: '8811',
    expiry: '12/27',
    isDefault: false,
  },
]

export const PAYMENT_QUOTES: PaymentQuote[] = [
  {
    id: 'quote-1',
    patientId: 'user-sarah',
    title: 'Video consult — Dr. Emily Carter',
    description: '45-minute metabolic nutrition consult, including a written summary.',
    amount: 85,
    currency: 'GBP',
    dietitianName: 'Dr. Emily Carter',
    kind: 'consult',
    status: 'open',
  },
  {
    id: 'quote-3',
    patientId: 'user-sarah',
    title: 'Chat follow-up',
    description: 'Async check-in after your last session.',
    amount: 35,
    currency: 'GBP',
    dietitianName: 'Dr. Emily Carter',
    kind: 'followup',
    status: 'paid',
  },
]

export const PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    patientId: 'user-sarah',
    quoteId: 'quote-3',
    amount: 35,
    currency: 'GBP',
    method: 'Visa •4242',
    status: 'paid',
    paidAt: '2026-09-08T11:20:00.000Z',
    receipt: 'INV-1048',
    description: 'Chat follow-up — Dr. Emily Carter',
  },
  {
    id: 'pay-2',
    patientId: 'user-sarah',
    amount: 85,
    currency: 'GBP',
    method: 'Apple Pay',
    status: 'paid',
    paidAt: '2026-08-21T09:05:00.000Z',
    receipt: 'INV-1012',
    description: 'Initial video consult — Dr. Emily Carter',
  },
]

export const DEMO_ACCOUNTS = [
  {
    userId: 'user-sarah',
    label: 'Patient',
    detail: 'Sarah Bennett — discover dietitians, message, and video consult',
  },
  {
    userId: 'user-emily',
    label: 'Dietitian',
    detail: 'Dr. Emily Carter — approved specialist with active patients',
  },
  {
    userId: 'user-marcus',
    label: 'Applicant',
    detail: 'Dr. Marcus Chen — pending verification, set availability',
  },
  {
    userId: 'user-admin',
    label: 'Admin',
    detail: 'Amelia Ward — credential queue, document check, approval',
  },
] as const
