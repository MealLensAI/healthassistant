"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Mail, ChevronDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/utils'

const Profile: React.FC = () => {
    const { toast } = useToast()
    const { user } = useAuth()

    // Email from API
    const [email, setEmail] = useState('')
    const [showProfileDropdown, setShowProfileDropdown] = useState(false)

    // Form state
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [changing, setChanging] = useState(false)

    // Visibility toggles
    const [showCurrent, setShowCurrent] = useState(false)
    const [showNew, setShowNew] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    // Fetch user profile on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                console.log('[Profile] Fetching user profile...')
                const result: any = await api.getUserProfile()
                console.log('[Profile] Profile result:', result)
                
                if (result.status === 'success' && result.profile) {
                    // Use the email from the API response
                    const profileEmail = result.profile.email || result.profile.user?.email
                    if (profileEmail) {
                        console.log('[Profile] Setting email from API:', profileEmail)
                        setEmail(profileEmail)
                    } else {
                        console.warn('[Profile] No email found in profile response')
                    }
                } else {
                    console.warn('[Profile] Profile fetch unsuccessful:', result)
                }
            } catch (error) {
                console.error('[Profile] Error fetching user profile:', error)
                // Fallback to localStorage for migration
                try {
                    const raw = localStorage.getItem('user_data')
                    if (raw) {
                        const user = JSON.parse(raw)
                        const fallbackEmail = user?.email
                        if (fallbackEmail) {
                            console.log('[Profile] Using fallback email from localStorage:', fallbackEmail)
                            setEmail(fallbackEmail)
                        }
                    }
                } catch (err) {
                    console.error('[Profile] Error reading from localStorage:', err)
                }
            }
        }

        fetchProfile()
    }, [])

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast({ title: 'Error', description: 'Fill all password fields.', variant: 'destructive' })
            return
        }
        if (newPassword.length < 6) {
            toast({ title: 'Error', description: 'New password must be at least 6 characters.', variant: 'destructive' })
            return
        }
        if (newPassword !== confirmPassword) {
            toast({ title: 'Error', description: 'New passwords do not match.', variant: 'destructive' })
            return
        }
        try {
            setChanging(true)
            const res: any = await api.post('/change-password', {
                current_password: currentPassword,
                new_password: newPassword
            })
            if (res.status === 'success') {
                toast({ title: 'Password Updated', description: 'Please sign in again.' })
                // Clear session & caches then redirect to login
                localStorage.removeItem('access_token')
                localStorage.removeItem('user_data')
                localStorage.removeItem('supabase_refresh_token')
                localStorage.removeItem('supabase_session_id')
                localStorage.removeItem('supabase_user_id')
                localStorage.removeItem('meallensai_user_access_status')
                localStorage.removeItem('meallensai_trial_start')
                localStorage.removeItem('meallensai_subscription_status')
                localStorage.removeItem('meallensai_subscription_expires_at')
                window.location.href = '/login'
            } else {
                toast({ title: 'Error', description: res.message || 'Failed to update password.', variant: 'destructive' })
            }
        } catch (e: any) {
            toast({ title: 'Error', description: e?.message || 'Failed to update password.', variant: 'destructive' })
        } finally {
            setChanging(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            {/* Header - Matching other pages */}
            <header 
                className="px-4 sm:px-6 md:px-8 h-[70px] sm:h-[80px] md:h-[105px] flex items-center border-b"
                style={{ 
                    backgroundColor: '#F9FBFE',
                    borderColor: '#F6FAFE',
                    boxShadow: '0px 2px 2px rgba(227, 227, 227, 0.25)'
                }}
            >
                <div className="flex items-center justify-between w-full gap-2 sm:gap-4">
                    <h1 className="text-lg sm:text-xl md:text-2xl lg:text-[32px] font-medium text-[#2A2A2A] tracking-[0.03em] leading-[130%] truncate" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                        Profile
                    </h1>
                    
                    {/* Profile Dropdown */}
                    <div className="relative flex-shrink-0">
                        <button
                            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                            className="flex items-center h-[36px] sm:h-[40px] md:h-[56px] gap-1.5 sm:gap-2 md:gap-3 px-2 sm:px-3 md:px-5 rounded-[10px] sm:rounded-[12px] md:rounded-[18px] border border-[#E7E7E7] bg-white hover:bg-gray-50 transition-colors"
                        >
                            <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 font-semibold text-[10px] sm:text-xs md:text-sm border border-blue-100">
                                {(user?.displayName || user?.email?.split('@')[0] || 'U').substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs sm:text-sm md:text-[16px] font-medium text-gray-600 hidden lg:block">
                                {user?.displayName || user?.email?.split('@')[0] || 'User'}
                            </span>
                            <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-gray-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showProfileDropdown && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setShowProfileDropdown(false)}
                                />
                                <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-white rounded-[12px] sm:rounded-[15px] shadow-lg border border-gray-200 py-2 sm:py-3 z-50">
                                    <a href="/profile" className="block px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-[15px] text-gray-700 hover:bg-gray-50">Profile</a>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Subtitle */}
                    <p className="text-gray-600 text-[16px]" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                        Manage your account details
                    </p>

                    <Card className="bg-white border border-[#E7E7E7] rounded-[15px] shadow-sm">
                    <CardHeader>
                        <CardTitle>Account</CardTitle>
                        <CardDescription>View your email and update your password.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input id="email" value={email} disabled className="pl-9" />
                            </div>
                        </div>

                        {/* Passwords stacked vertically */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="current-password">Current Password</Label>
                                <div className="relative">
                                    <Input
                                        id="current-password"
                                        type={showCurrent ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrent((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                        aria-label={showCurrent ? 'Hide password' : 'Show password'}
                                    >
                                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <div className="relative">
                                    <Input
                                        id="new-password"
                                        type={showNew ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNew((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                        aria-label={showNew ? 'Hide password' : 'Show password'}
                                    >
                                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm New Password</Label>
                                <div className="relative">
                                    <Input
                                        id="confirm-password"
                                        type={showConfirm ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                    >
                                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <Button className="w-full" onClick={handleChangePassword} disabled={changing}>
                            {changing ? 'Updating...' : 'Update Password'}
                        </Button>
                    </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default Profile


