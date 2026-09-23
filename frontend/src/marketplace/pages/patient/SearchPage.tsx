import { Navigate, useSearchParams } from 'react-router-dom'

export function SearchPage() {
  const [params] = useSearchParams()
  return <Navigate to={{ pathname: '/dietitians', search: params.toString() }} replace />
}
