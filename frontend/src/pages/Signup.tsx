"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, Link, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, Mail, Lock, User, Loader2, CheckCircle, XCircle, Building2 } from "lucide-react"
import { useAuth, safeSetItem } from "@/lib/utils"
import { api, APIError } from "@/lib/api"
import Logo from "@/components/Logo"

const Signup = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const { isAuthenticated, refreshAuth } = useAuth()
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [organizationData, setOrganizationData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    organization_type: "clinic"
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isOrganizationSignup, setIsOrganizationSignup] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || "/"
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleOrganizationInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setOrganizationData(prev => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      toast({
        title: "Validation Error",
        description: "First name is required.",
        variant: "destructive",
      })
      return false
    }
    if (!formData.lastName.trim()) {
      toast({
        title: "Validation Error",
        description: "Last name is required.",
        variant: "destructive",
      })
      return false
    }
    if (!formData.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required.",
        variant: "destructive",
      })
      return false
    }
    if (!formData.email.includes('@')) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      })
      return false
    }
    if (formData.password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      })
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match.",
        variant: "destructive",
      })
      return false
    }

    // Validate organization data if organization signup
    if (isOrganizationSignup) {
      if (!organizationData.name.trim()) {
        toast({
          title: "Validation Error",
          description: "Organization name is required.",
          variant: "destructive",
        })
        return false
      }
      if (!organizationData.email.trim()) {
        toast({
          title: "Validation Error",
          description: "Organization email is required.",
          variant: "destructive",
        })
        return false
      }
      if (!organizationData.email.includes('@')) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid organization email address.",
          variant: "destructive",
        })
        return false
      }
    }

    return true
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      // Use centralized API service for registration
      const registerResult: any = await api.register({
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        signup_type: isOrganizationSignup ? 'organization' : 'individual'
      })

      if (registerResult.status !== 'success') {
        toast({
          title: "Signup Failed",
          description: registerResult.message || "Failed to create account.",
          variant: "destructive",
        })
        return
      }

      // Auto-login after successful registration
      const loginResult: any = await api.login({
        email: formData.email,
        password: formData.password
      })

      if (loginResult.status === 'success') {
        // Store the token in localStorage for future authenticated requests
        if (loginResult.access_token) {
          safeSetItem('access_token', loginResult.access_token)
          if (loginResult.refresh_token) safeSetItem('supabase_refresh_token', loginResult.refresh_token)
          if (loginResult.session_id) safeSetItem('supabase_session_id', loginResult.session_id)
          if (loginResult.user_id) safeSetItem('supabase_user_id', loginResult.user_id)

          // Store user data for auth context
          const userData = {
            uid: loginResult.user_id || loginResult.user_data?.id,
            email: loginResult.user_data?.email || formData.email,
            displayName: `${formData.firstName} ${formData.lastName}`,
            photoURL: null
          }
          safeSetItem('user_data', JSON.stringify(userData))

          // Refresh auth context
          await refreshAuth()

          toast({
            title: "Account Created!",
            description: isOrganizationSignup
              ? "Welcome! Preparing your organization workspace..."
              : "Welcome to MealLensAI! Your account has been successfully created.",
          })

          // If organization signup, register the organization after user creation
          if (isOrganizationSignup) {
            try {
              const orgResult: any = await api.registerEnterprise(organizationData)

              if (orgResult.success) {
                toast({
                  title: "Organization Registered!",
                  description: "Redirecting you to the organization dashboard...",
                })
                navigate('/enterprise', { replace: true })
                return
              } else {
                // Show error to user - this is critical!
                toast({
                  title: "Organization Registration Failed",
                  description: orgResult.error || "Failed to register organization. You can create it later from Enterprise Dashboard.",
                  variant: "destructive",
                  duration: 7000,
                })
                console.error('Failed to register organization:', orgResult.error)
                // Still continue to app - user can create org later
              }
            } catch (error: any) {
              toast({
                title: "Organization Registration Failed",
                description: error.message || "Failed to register organization. You can create it later from Enterprise Dashboard.",
                variant: "destructive",
                duration: 7000,
              })
              console.error('Failed to register organization:', error)
              // Still continue to app - user can create org later
            }
          }

          if (isOrganizationSignup) {
            navigate('/enterprise', { replace: true })
          } else {
            navigate("/onboarding", { replace: true })
          }
        } else {
          toast({
            title: "Signup Failed",
            description: "Failed to retrieve authentication token.",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Auto-login Failed",
          description: loginResult.message || "Account created but login failed. Please try logging in manually.",
          variant: "destructive",
        })
        navigate("/login")
      }
    } catch (error) {
      console.error('Signup error:', error)
      if (error instanceof APIError) {
        toast({
          title: "Signup Failed",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Signup Failed",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: "", color: "" }
    if (password.length < 6) return { strength: 25, label: "Weak", color: "bg-red-500" }
    if (password.length < 8) return { strength: 50, label: "Fair", color: "bg-yellow-500" }
    if (password.length < 12) return { strength: 75, label: "Good", color: "bg-blue-500" }
    return { strength: 100, label: "Strong", color: "bg-green-500" }
  }

  const passwordStrength = getPasswordStrength(formData.password)

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
          <h1 className="text-2xl sm:text-3xl lg:text-3xl font-bold text-gray-900 mb-6 lg:mb-8 text-center">Sign Up</h1>

          {/* Account Type Toggle */}
          <div className="flex bg-[#F6FAFE] p-[4px] rounded-[12px] mb-6 border border-[#D0D0D0] w-full lg:w-[480px]" style={{ height: '55px', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsOrganizationSignup(false)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-[12px] transition-all duration-200 ${
                !isOrganizationSignup
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
              onClick={() => setIsOrganizationSignup(true)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-[12px] transition-all duration-200 ${
                isOrganizationSignup
                  ? 'bg-white text-[#1A76E3] border border-[#1A76E3]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              style={{ padding: '10px' }}
            >
              <Building2 className="h-4 w-4" />
              <span className="font-medium text-sm">Organization</span>
            </button>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleEmailSignup} className="space-y-4">
            {!isOrganizationSignup ? (
              <>
                {/* First Name and Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="Enter First Name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="border-[#D0D0D0] focus:border-[#1A76E3] focus:ring-[#1A76E3] text-sm w-full"
                      style={{ height: '42px', borderRadius: '12px', borderWidth: '1px', padding: '10px 14px' }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Enter Last Name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="border-[#D0D0D0] focus:border-[#1A76E3] focus:ring-[#1A76E3] text-sm w-full"
                      style={{ height: '42px', borderRadius: '12px', borderWidth: '1px', padding: '10px 14px' }}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter Email"
                    value={formData.email}
                    onChange={handleInputChange}
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
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={formData.password}
                      onChange={handleInputChange}
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

                {/* Confirm Password */}
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      Confirm Password
                    </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="pr-10 border-[#D0D0D0] focus:border-[#1A76E3] focus:ring-[#1A76E3] text-sm w-full"
                      style={{ height: '42px', borderRadius: '12px', borderWidth: '1px', padding: '10px 14px' }}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {formData.confirmPassword && (
                    <div className="flex items-center space-x-2 text-sm">
                      {formData.password === formData.confirmPassword ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-600">Passwords match</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-red-600">Passwords do not match</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Organization Name */}
                <div className="space-y-2">
                  <Label htmlFor="orgName" className="text-sm font-medium text-gray-700">
                    Organization Name
                  </Label>
                  <Input
                    id="orgName"
                    name="name"
                    type="text"
                    placeholder="Enter Name"
                    value={organizationData.name}
                    onChange={handleOrganizationInputChange}
                      className="border-[#D0D0D0] focus:border-[#1A76E3] focus:ring-[#1A76E3] text-sm w-full"
                      style={{ height: '42px', borderRadius: '12px', borderWidth: '1px', padding: '10px 14px' }}
                    required
                  />
                </div>

                {/* Organization Email */}
                <div className="space-y-2">
                  <Label htmlFor="orgEmail" className="text-sm font-medium text-gray-700">
                    Organization Email
                  </Label>
                  <Input
                    id="orgEmail"
                    name="email"
                    type="email"
                    placeholder="Enter Email"
                    value={organizationData.email}
                    onChange={handleOrganizationInputChange}
                      className="border-[#D0D0D0] focus:border-[#1A76E3] focus:ring-[#1A76E3] text-sm w-full"
                      style={{ height: '42px', borderRadius: '12px', borderWidth: '1px', padding: '10px 14px' }}
                    required
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="orgPhone" className="text-sm font-medium text-gray-700">
                    Phone Number
                  </Label>
                  <Input
                    id="orgPhone"
                    name="phone"
                    type="tel"
                    placeholder="Enter Email"
                    value={organizationData.phone}
                    onChange={handleOrganizationInputChange}
                      className="border-[#D0D0D0] focus:border-[#1A76E3] focus:ring-[#1A76E3] text-sm w-full"
                      style={{ height: '42px', borderRadius: '12px', borderWidth: '1px', padding: '10px 14px' }}
                  />
                </div>

                {/* User Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter Email"
                    value={formData.email}
                    onChange={handleInputChange}
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
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={formData.password}
                      onChange={handleInputChange}
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

                {/* Confirm Password */}
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      Confirm Password
                    </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="pr-10 border-[#D0D0D0] focus:border-[#1A76E3] focus:ring-[#1A76E3] text-sm w-full"
                      style={{ height: '42px', borderRadius: '12px', borderWidth: '1px', padding: '10px 14px' }}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Sign Up Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="text-white font-semibold transition-all duration-200 mt-6"
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
                  {isOrganizationSignup ? "Registering organization..." : "Creating account..."}
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200"
              >
                Sign in
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
              src="/assets/signup-hero.png"
              alt="Hospital care"
              className="object-cover w-full h-full rounded-lg"
              style={{ borderRadius: '8px' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-lg" />
            <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8 text-white">
              <p className="text-2xl lg:text-3xl xl:text-4xl font-bold leading-tight">
                Let every <span className="text-blue-300">MEAL</span> bring you closer
                <br />
                to recovery.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Signup
