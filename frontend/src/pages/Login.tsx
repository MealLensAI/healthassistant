"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, Link, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, Mail, Lock, Loader2, User, Building2 } from "lucide-react"
import { useAuth, safeSetItem, safeGetItem } from "@/lib/utils"
import { api, APIError } from "@/lib/api"
import Logo from "@/components/Logo"

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const { isAuthenticated, refreshAuth } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isOrganizationLogin, setIsOrganizationLogin] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || "/ai-kitchen"
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Use centralized API service
      const result = await api.login({ email, password })
      console.log('[Login] /api/login response:', result)

      if (result.status === 'success' && result.access_token) {
        // Store the token and user data
        safeSetItem('access_token', result.access_token)
        // Verify token is readable immediately
        console.log('[Login] token saved. Read-back length:', safeGetItem('access_token')?.length || 0)
        safeSetItem('supabase_refresh_token', result.refresh_token || '')
        safeSetItem('supabase_session_id', result.session_id || '')
        safeSetItem('supabase_user_id', result.user_id || '')

        // Store user data
        const displayName = (result.user_data?.email || email).split('@')[0]
        const userData = {
          uid: result.user_id || result.user_data?.id || '',
          email: result.user_data?.email || email,
          displayName,
          photoURL: null
        }
        safeSetItem('user_data', JSON.stringify(userData))

        // Update auth context - skip verification since we just logged in
        await refreshAuth(true)

        // Show success toast
        toast({
          title: "Welcome back!",
          description: "You have been successfully logged in.",
        })

        // Wait for React to process state updates before redirecting
        // This ensures isAuthenticated is true when ProtectedRoute checks it
        await new Promise(resolve => {
          // Use requestAnimationFrame to wait for next render cycle
          requestAnimationFrame(() => {
            setTimeout(() => {
              resolve(undefined)
            }, 100)
          })
        })

        // Check if user is an organization user and redirect accordingly
        // Priority 1: Check signup_type from user metadata (most reliable)
        const userMetadata = result.user_data?.metadata || {}
        const signupType = userMetadata.signup_type || userMetadata.signupType
        
        console.log('[Login] User metadata:', userMetadata)
        console.log('[Login] Signup type from metadata:', signupType)
        
        if (signupType === 'organization') {
          console.log('🔄 User registered as organization, redirecting to enterprise dashboard')
          navigate('/enterprise', { replace: true })
          return
        }
        
        // Priority 2: Check if user owns organizations (fallback for existing users)
        try {
          console.log('[Login] Checking for organization ownership...')
          const enterprisesResponse = await api.getMyEnterprises()
          console.log('[Login] Enterprises response:', enterprisesResponse)
          
          // Check if user owns organizations (enterprises array with items)
          if (enterprisesResponse.success && enterprisesResponse.enterprises && Array.isArray(enterprisesResponse.enterprises) && enterprisesResponse.enterprises.length > 0) {
            // User owns at least one organization - redirect to enterprise dashboard
            console.log('🔄 User is organization owner, redirecting to enterprise dashboard')
            navigate('/enterprise', { replace: true })
            return
          } else {
            console.log('[Login] User does not own any organizations, redirecting to user dashboard')
          }
        } catch (error) {
          console.error('[Login] Failed to check enterprise ownership:', error)
          // Continue with normal redirect on error - don't block login
        }

        // Redirect to intended page (for regular users)
        const from = location.state?.from?.pathname || "/ai-kitchen"
        console.log('🔄 Redirecting after login to:', from)
        navigate(from, { replace: true })
      } else {
        toast({
          title: "Login Failed",
          description: result.message || "Invalid email or password.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Login error:', error)
      if (error instanceof APIError) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Login Failed",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    const targetEmail = email.trim()
    if (!targetEmail) {
      toast({ title: "Email required", description: "Enter your email above first.", variant: "destructive" })
      return
    }
    setIsResetting(true)
    try {
      await api.requestPasswordReset(targetEmail)
      toast({ title: "Check your email", description: "If an account exists, we sent a reset link." })
    } catch (err) {
      // Backend returns generic success; still show success to avoid enumeration
      toast({ title: "Check your email", description: "If an account exists, we sent a reset link." })
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Column - Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-white px-4 sm:px-6 md:px-8 lg:px-12 lg:pl-[80px] py-8 lg:py-0 lg:pt-[64px] lg:pr-[32px]">
        <div className="w-full max-w-md lg:max-w-none lg:w-[480px]">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6 lg:mb-8">
            <Logo size="lg" />
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-3xl font-bold text-gray-900 mb-6 lg:mb-8 text-center">Welcome back</h1>

          {/* Account Type Toggle */}
          <div className="flex bg-[#F6FAFE] p-[4px] rounded-[12px] mb-6 border border-[#D0D0D0] w-full lg:w-[480px]" style={{ height: '55px', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsOrganizationLogin(false)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-[12px] transition-all duration-200 ${
                !isOrganizationLogin
                  ? 'bg-white text-[#1A76E3] border border-[#1A76E3]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              style={{ padding: '10px' }}
            >
              <User className="h-4 w-4" />
              <span className="font-medium text-sm">Individual</span>
            </button>
            <button
              type="button"
              onClick={() => setIsOrganizationLogin(true)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-[12px] transition-all duration-200 ${
                isOrganizationLogin
                  ? 'bg-white text-[#1A76E3] border border-[#1A76E3]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              style={{ padding: '10px' }}
            >
              <Building2 className="h-4 w-4" />
              <span className="font-medium text-sm">Organization</span>
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-[#D0D0D0] focus:border-[#1A76E3] focus:ring-[#1A76E3] text-sm w-full"
                style={{ height: '42px', borderRadius: '12px', borderWidth: '1px', padding: '10px 14px' }}
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 border-[#D0D0D0] focus:border-[#1A76E3] focus:ring-[#1A76E3] text-sm w-full"
                  style={{ height: '42px', borderRadius: '12px', borderWidth: '1px', padding: '10px 14px' }}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="text-white font-semibold transition-all duration-200"
              className="w-full sm:w-auto"
              style={{
                width: '180px',
                height: '42px',
                borderRadius: '12px',
                borderWidth: '1px',
                borderColor: '#1356A5',
                backgroundColor: '#1A76E3',
                padding: '10px',
                boxShadow: '3px 3px 3px 0px rgba(72, 146, 234, 1)',
                fontSize: '15px'
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>

          {/* Sign Up Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Column - Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-50">
        <div className="relative w-full h-full flex items-center justify-center p-8 lg:p-12">
          <div className="relative w-full max-w-md aspect-[3/4] flex items-center">
            <img
              src="/assets/login-hero.png"
              alt="Healthy eating"
              className="object-cover w-full h-full rounded-lg"
              style={{ borderRadius: '8px' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-lg" />
            <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8 text-white">
              <p className="text-2xl lg:text-3xl xl:text-4xl font-bold leading-tight">
                The right <span className="text-blue-300">FOOD</span> can be part of your healing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
