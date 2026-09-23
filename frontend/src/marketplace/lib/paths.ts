/**
 * Marketplace routes — same paths as meallensaidieticnafrontend 3,
 * except patient home is /dietitians (main app already owns /).
 */

export function carePath(path = '') {
  if (!path || path === '/') return '/dietitians'
  const clean = path.startsWith('/') ? path : `/${path}`
  if (clean === '/care' || clean === '/search') return '/dietitians'
  // Source uses /care/:id for consult — keep those
  if (clean.startsWith('/care/')) {
    const rest = clean.slice('/care/'.length)
    // Legacy prefixed URLs from earlier merge: /care/appointments etc.
    if (
      rest === 'appointments' ||
      rest.startsWith('appointments/') ||
      rest === 'messages' ||
      rest.startsWith('messages/') ||
      rest === 'files' ||
      rest.startsWith('files/') ||
      rest === 'payments' ||
      rest.startsWith('payments/') ||
      rest === 'profile' ||
      rest.startsWith('profile/') ||
      rest === 'settings' ||
      rest.startsWith('settings/') ||
      rest === 'dietitian' ||
      rest.startsWith('dietitian/') ||
      rest === 'admin' ||
      rest.startsWith('admin/') ||
      rest === 'login' ||
      rest.startsWith('onboarding/') ||
      rest === 'search' ||
      rest.startsWith('dietitians/')
    ) {
      if (rest === 'search') return '/dietitians'
      if (rest === 'settings' || rest.startsWith('settings/')) return '/care-settings'
      if (rest === 'profile' || rest.startsWith('profile/')) return '/profile'
      if (rest.startsWith('dietitians/')) return `/${rest}`
      if (rest === 'login') return '/login'
      return `/${rest}`
    }
    // Real consult route /care/:id
    return clean
  }
  return clean
}

export const careRoutes = {
  home: '/dietitians',
  login: '/login',
  search: '/search',
  appointments: '/appointments',
  messages: '/messages',
  files: '/files',
  payments: '/payment',
  profile: '/profile',
  // Avoid colliding — care prefs stay separate from account /settings
  settings: '/care-settings',
  dietitian: '/dietitian',
  dietitianApply: '/dietitian/apply',
  dietitianAvailability: '/dietitian/availability',
  dietitianAppointments: '/dietitian/appointments',
  dietitianMessages: '/dietitian/messages',
  dietitianFiles: '/dietitian/files',
  dietitianSettings: '/dietitian/settings',
  dietitianProfile: '/dietitian/profile',
  admin: '/admin',
  adminDietitians: '/admin/dietitians',
  adminSettings: '/admin/settings',
  onboardingPatient: '/onboarding/patient',
  onboardingDoctor: '/onboarding/doctor',
  dietitianPublic: (id: string) => `/dietitians/${id}`,
  consult: (id: string) => `/care/${id}`,
  messageThread: (id: string) => `/messages/${id}`,
  dietitianMessageThread: (id: string) => `/dietitian/messages/${id}`,
  dietitianPatient: (id: string) => `/dietitian/patients/${id}`,
  dietitianListing: (id: string) => `/dietitian/dietitians/${id}`,
  adminApplication: (id: string) => `/admin/applications/${id}`,
  adminDietitian: (id: string) => `/admin/dietitians/${id}`,
  adminPublic: (id: string) => `/admin/public/${id}`,
  adminPatient: (id: string) => `/admin/patients/${id}`,
}
