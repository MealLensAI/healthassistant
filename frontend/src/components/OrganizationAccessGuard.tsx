import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/utils'
import { useEnterpriseRole } from '@/hooks/useEnterpriseRole'

interface OrganizationAccessGuardProps {
  children: React.ReactNode
}

export default function OrganizationAccessGuard({ children }: OrganizationAccessGuardProps) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { role, isLoading: roleLoading, hasEnterprises, canCreateOrganizations } = useEnterpriseRole()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login')
    }
  }, [authLoading, isAuthenticated, navigate])

  useEffect(() => {
    if (!roleLoading && role !== 'organization' && !hasEnterprises && !canCreateOrganizations) {
      toast({
        title: 'Enterprise access required',
        description: 'You need an organization workspace to view this dashboard.',
        variant: 'destructive'
      })
      navigate('/ai-kitchen', { replace: true })
    }
  }, [roleLoading, role, hasEnterprises, canCreateOrganizations, toast, navigate])

  if (authLoading || roleLoading || !isAuthenticated || role === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <p className="text-gray-600 text-lg font-medium">Verifying organization access…</p>
        </div>
      </div>
    )
  }

  if (role !== 'organization' && !hasEnterprises && !canCreateOrganizations) {
    return null
  }

  return <>{children}</>
}
