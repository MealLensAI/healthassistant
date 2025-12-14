"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, Link, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 flex items-center justify-center p-2 sm:p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/placeholder.svg?height=100&width=100')] opacity-5"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-4 sm:mb-8">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-gray-600 text-sm sm:text-lg">Smart Food Detection & Recipe Generation</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4 sm:pb-6">
            <CardTitle className="text-2xl font-bold text-center text-gray-900">Welcome Back</CardTitle>
            <p className="text-center text-gray-600">Sign in to your account to continue</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email/Password Form */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
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

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <Link
                  to="/forgot-password"
                  className="text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </Link>
              </div>
            </form>

            {/* Sign Up Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Login
