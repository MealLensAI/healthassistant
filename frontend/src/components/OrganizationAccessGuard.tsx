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
  const { isAuthenticated, loading: authLoading, user } = useAuth()
  const { role, isLoading: roleLoading, hasEnterprises, canCreateOrganizations, error } = useEnterpriseRole()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login')
    }
  }, [authLoading, isAuthenticated, navigate])

  useEffect(() => {
    // Check signup_type from localStorage as primary fallback
    let hasOrganizationSignupType = false
    try {
      const userDataStr = typeof window !== 'undefined' ? localStorage.getItem('user_data') : null
      if (userDataStr) {
        const userData = JSON.parse(userDataStr)
        const userMetadata = userData?.metadata || userData?.user_metadata || {}
        const signupType = userMetadata.signup_type || userMetadata.signupType
        hasOrganizationSignupType = signupType === 'organization'
      }
    } catch (e) {
      // Ignore parsing errors
    }

    // If signup_type is organization, allow access immediately - don't wait for API
    if (hasOrganizationSignupType) {
      return // Allow access, don't redirect
    }

    // Only redirect if user doesn't have organization access AND doesn't have signup_type=organization
    // Wait for roleLoading to complete before making decision
    if (!roleLoading && role !== 'organization' && !hasEnterprises && !canCreateOrganizations) {
      toast({
        title: 'Enterprise access required',
        description: 'You need an organization workspace to view this dashboard.',
        variant: 'destructive'
      })
      navigate('/ai-kitchen', { replace: true })
    }
  }, [roleLoading, role, hasEnterprises, canCreateOrganizations, error, user, toast, navigate])

  // Check signup_type early - if organization, skip loading and allow access
  let hasOrganizationSignupType = false
  try {
    const userDataStr = typeof window !== 'undefined' ? localStorage.getItem('user_data') : null
    if (userDataStr) {
      const userData = JSON.parse(userDataStr)
      const userMetadata = userData?.metadata || userData?.user_metadata || {}
      const signupType = userMetadata.signup_type || userMetadata.signupType
      hasOrganizationSignupType = signupType === 'organization'
    }
  } catch (e) {
    // Ignore parsing errors
  }

  // Show loading only if we're still loading AND user doesn't have signup_type=organization
  if ((authLoading || roleLoading || !isAuthenticated || role === null) && !hasOrganizationSignupType) {
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

  // Final check: Allow if user has organization access OR signup_type=organization
  if (role !== 'organization' && !hasEnterprises && !canCreateOrganizations && !hasOrganizationSignupType) {
    return null
  }

  return <>{children}</>
}
