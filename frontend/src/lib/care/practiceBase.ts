/**
 * Practice shell base path — org users live under /enterprise;
 * standalone dietitians under /dietitian.
 */
export function practiceBase(pathname = typeof window !== 'undefined' ? window.location.pathname : ''): string {
  if (pathname === '/enterprise' || pathname.startsWith('/enterprise/')) return '/enterprise'
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return '/admin'
  return '/dietitian'
}

export function practicePath(suffix = '', pathname?: string): string {
  const base = practiceBase(pathname)
  const clean = suffix.replace(/^\//, '')
  return clean ? `${base}/${clean}` : base
}

export function isEnterprisePractice(pathname = typeof window !== 'undefined' ? window.location.pathname : '') {
  return practiceBase(pathname) === '/enterprise'
}
