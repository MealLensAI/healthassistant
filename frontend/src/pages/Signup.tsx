"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, Link, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/placeholder.svg?height=100&width=100')] opacity-5"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-gray-600 text-lg">Join the Smart Food Revolution</p>
        </div>

        {/* Signup Card */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center text-gray-900">
              {isOrganizationSignup ? "Register Your Organization" : "Create Your Account"}
            </CardTitle>
            <p className="text-center text-gray-600">
              {isOrganizationSignup
                ? "Set up your organization and start inviting patients"
                : "Start your journey with AI-powered food detection"
              }
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Signup Type Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setIsOrganizationSignup(false)}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-all duration-200 ${!isOrganizationSignup
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                <User className="h-4 w-4" />
                <span className="font-medium">Individual</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOrganizationSignup(true)}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-all duration-200 ${isOrganizationSignup
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                <Building2 className="h-4 w-4" />
                <span className="font-medium">Organization</span>
              </button>
            </div>

            {/* Email Signup Form */}
            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                    First Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                    Last Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  {isOrganizationSignup ? "Your Email Address" : "Email Address"}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={isOrganizationSignup ? "your.email@organization.com" : "Enter your email"}
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                {isOrganizationSignup && (
                  <p className="text-xs text-gray-500">
                    This will be your login email for managing the organization
                  </p>
                )}
              </div>

              {/* Organization Details */}
              {isOrganizationSignup && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-blue-600">
                      <Building2 className="h-5 w-5" />
                      <h3 className="font-semibold">Organization Details</h3>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orgName" className="text-sm font-medium text-gray-700">
                        Organization Name *
                      </Label>
                      <Input
                        id="orgName"
                        name="name"
                        type="text"
                        placeholder="e.g., Dr. Smith Medical Clinic"
                        value={organizationData.name}
                        onChange={handleOrganizationInputChange}
                        className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orgEmail" className="text-sm font-medium text-gray-700">
                        Organization Email *
                      </Label>
                      <Input
                        id="orgEmail"
                        name="email"
                        type="email"
                        placeholder="contact@organization.com"
                        value={organizationData.email}
                        onChange={handleOrganizationInputChange}
                        className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orgPhone" className="text-sm font-medium text-gray-700">
                        Phone Number
                      </Label>
                      <Input
                        id="orgPhone"
                        name="phone"
                        type="tel"
                        placeholder="+1234567890"
                        value={organizationData.phone}
                        onChange={handleOrganizationInputChange}
                        className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orgAddress" className="text-sm font-medium text-gray-700">
                        Address
                      </Label>
                      <Input
                        id="orgAddress"
                        name="address"
                        type="text"
                        placeholder="123 Main St, City, State"
                        value={organizationData.address}
                        onChange={handleOrganizationInputChange}
                        className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orgType" className="text-sm font-medium text-gray-700">
                        Organization Type *
                      </Label>
                      <select
                        id="orgType"
                        name="organization_type"
                        value={organizationData.organization_type}
                        onChange={handleOrganizationInputChange}
                        className="w-full h-12 px-3 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                        required
                      >
                        <option value="clinic">Clinic</option>
                        <option value="hospital">Hospital</option>
                        <option value="doctor">Individual Doctor</option>
                        <option value="nutritionist">Nutritionist</option>
                        <option value="wellness">Wellness Center</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleInputChange}
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

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Password strength:</span>
                      <span className={`font-medium ${passwordStrength.strength <= 25 ? 'text-red-600' :
                        passwordStrength.strength <= 50 ? 'text-yellow-600' :
                          passwordStrength.strength <= 75 ? 'text-blue-600' : 'text-green-600'
                        }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.strength}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>

                {/* Password Match Indicator */}
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

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    {isOrganizationSignup ? "Registering organization..." : "Creating account..."}
                  </>
                ) : (
                  isOrganizationSignup ? "Register Organization" : "Create Account"
                )}
              </Button>
            </form>

            {/* Sign In Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200"
                >
                  Sign in here
                </Link>
              </p>
              {isOrganizationSignup && (
                <p className="text-xs text-gray-500 mt-2">
                  After registration, you'll be able to invite patients and manage your organization
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Signup
