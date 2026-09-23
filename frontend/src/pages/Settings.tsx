"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Mail } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/utils'
import EngagementBanners from '@/components/EngagementBanners'

/** Account settings (email / password) — formerly the Profile page. */
const Settings: React.FC = () => {
  const { toast } = useToast()
  const { user } = useAuth()

  const [email, setEmail] = useState('')
  const [isEmailEditable, setIsEmailEditable] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changing, setChanging] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email)
      setIsEmailEditable(false)
      return
    }

    const fetchProfile = async () => {
      try {
        const result: any = await api.getUserProfile()
        if (result.status === 'success' && result.profile) {
          const profileEmail = result.profile.email || result.profile.user?.email
          if (profileEmail) {
            setEmail(profileEmail)
            setIsEmailEditable(false)
            return
          }
        }
      } catch {
        // fall through
      }

      try {
        const raw = localStorage.getItem('user_data')
        if (raw) {
          const storedUser = JSON.parse(raw)
          if (storedUser?.email) {
            setEmail(storedUser.email)
            setIsEmailEditable(false)
            return
          }
        }
      } catch {
        // fall through
      }

      setIsEmailEditable(true)
    }

    void fetchProfile()
  }, [user])

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
        new_password: newPassword,
      })
      if (res.status === 'success') {
        toast({ title: 'Password Updated', description: 'Please sign in again.' })
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
    <div className="min-h-full">
      <EngagementBanners />
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="hy-card p-6">
          <p className="hy-eyebrow">Account</p>
          <h1 className="mt-1 text-2xl font-extrabold text-ink">Settings</h1>
          <p className="mt-2 text-sm text-muted">Manage your email and password.</p>
        </div>

        <Card className="hy-card border-line shadow-none">
          <CardHeader>
            <CardTitle className="text-ink">Account</CardTitle>
            <CardDescription>View your email and update your password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEmailEditable}
                  placeholder={isEmailEditable ? 'Enter your email' : ''}
                  className="pl-9"
                />
              </div>
              {isEmailEditable && (
                <p className="text-xs text-muted">Please enter your email address</p>
              )}
            </div>

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
  )
}

export default Settings
