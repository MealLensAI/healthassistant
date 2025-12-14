"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Lock, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { api, APIError } from "@/lib/api"
import { useAuth } from "@/lib/utils"
import Logo from "@/components/Logo"

function useHashParams() {
    const { hash } = useLocation()
    return useMemo(() => {
        const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
        return params
    }, [hash])
}

const ResetPassword: React.FC = () => {
    const { toast } = useToast()
    const navigate = useNavigate()
    const params = useHashParams()
    const { clearSession } = useAuth()

    const [accessToken, setAccessToken] = useState<string>("")
    const [newPassword, setNewPassword] = useState<string>("")
    const [confirmPassword, setConfirmPassword] = useState<string>("")
    const [submitting, setSubmitting] = useState<boolean>(false)

    useEffect(() => {
        // Supabase recovery links generally land with tokens in URL hash
        const token = params.get('access_token') || params.get('token') || ""
        setAccessToken(token)
        const error = params.get('error') || params.get('error_code')
        if (error) {
            toast({ title: 'Link error', description: 'Your reset link may be invalid or expired.', variant: 'destructive' })
        }
        // Ensure any existing session is cleared so user is not auto-logged in
        try { clearSession() } catch { }
        // Remove hash from address bar after reading it
        try {
            const url = new URL(window.location.href)
            if (url.hash) {
                window.history.replaceState({}, '', `${url.origin}/reset-password`)
            }
        } catch { }
    }, [params, toast])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!accessToken) {
            toast({ title: 'Invalid link', description: 'Missing or expired reset token.', variant: 'destructive' })
            return
        }
        if (!newPassword || newPassword.length < 6) {
            toast({ title: 'Weak password', description: 'Use at least 6 characters.', variant: 'destructive' })
            return
        }
        if (newPassword !== confirmPassword) {
            toast({ title: 'Mismatch', description: "Passwords don't match.", variant: 'destructive' })
            return
        }
        setSubmitting(true)
        try {
            const res: any = await api.resetPassword({ access_token: accessToken, new_password: newPassword })
            if (res?.status === 'success') {
                toast({ title: 'Password updated', description: 'Please sign in.' })
                setTimeout(() => navigate('/login'), 1000)
            } else {
                toast({ title: 'Error', description: res?.message || 'Unable to reset password.', variant: 'destructive' })
            }
        } catch (err) {
            const msg = err instanceof APIError ? err.message : 'Unable to reset password.'
            toast({ title: 'Error', description: msg, variant: 'destructive' })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[url('/placeholder.svg?height=100&width=100')] opacity-5"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <Logo size="lg" />
                    </div>
                    <p className="text-gray-600 text-lg">Set a new password</p>
                </div>

                <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
                    <CardHeader className="space-y-1 pb-6">
                        <CardTitle className="text-2xl font-bold text-center text-gray-900">Reset Password</CardTitle>
                        <p className="text-center text-gray-600">Enter a new password for your account</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                                    New Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Enter new password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="pl-10 h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm" className="text-sm font-medium text-gray-700">
                                    Confirm Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="confirm"
                                        type="password"
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-10 h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                                        required
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={submitting}
                                className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                                        Saving new password...
                                    </>
                                ) : (
                                    "Save new password"
                                )}
                            </Button>
                        </form>

                        <div className="text-center">
                            <p className="text-sm text-gray-600">
                                Changed your mind?{" "}
                                <Link
                                    to="/login"
                                    className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200"
                                >
                                    Back to login
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default ResetPassword


