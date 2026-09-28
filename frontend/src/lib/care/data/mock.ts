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

/** Offline/demo users only — no fake dietitian catalog. */
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
    id: 'user-admin',
    name: 'Amelia Ward',
    email: 'admin@healthyyou.com',
    role: 'admin',
    avatar:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    title: 'Verification Lead',
  },
]

/** Marketplace listings come from admin-approved Supabase rows only. */
export const DIETITIANS: Dietitian[] = []

export const APPLICATIONS: DietitianApplication[] = []

export const CONVERSATIONS: Conversation[] = []

export const MESSAGES: ChatMessage[] = []

export const APPOINTMENTS: Appointment[] = []

export const FILES: PatientFile[] = []

export const CONSULTATION_REQUESTS: ConsultationRequest[] = []

export const NOTIFICATIONS: AppNotification[] = []

export const MISSED_CALLS: MissedCall[] = []

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
]

export const PAYMENT_QUOTES: PaymentQuote[] = []

export const PAYMENTS: Payment[] = []

export const DEMO_ACCOUNTS = [
  {
    userId: 'user-sarah',
    label: 'Patient',
    detail: 'Sarah Bennett — discover dietitians, message, and video consult',
  },
  {
    userId: 'user-admin',
    label: 'Admin',
    detail: 'Amelia Ward — credential queue, document check, approval',
  },
] as const
