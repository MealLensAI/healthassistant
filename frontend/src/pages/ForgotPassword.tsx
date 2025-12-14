"use client"

import type React from "react"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Mail, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { api, APIError } from "@/lib/api"
import Logo from "@/components/Logo"

const ForgotPassword: React.FC = () => {
    const { toast } = useToast()
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const targetEmail = email.trim()
        if (!targetEmail) {
            toast({ title: "Email required", description: "Please enter your email.", variant: "destructive" })
            return
        }
        setIsSubmitting(true)
        try {
            const origin = typeof window !== 'undefined' ? window.location.origin : ''
            const redirectUrl = `${origin.replace(/\/$/, '')}/reset-password`
            await api.post('/forgot-password', { email: targetEmail, redirect_url: redirectUrl }, { skipAuth: true })
            toast({ title: "Check your email", description: "If an account exists, we sent a reset link." })
            setTimeout(() => navigate("/login"), 1200)
        } catch (err) {
            if (err instanceof APIError) {
                // Backend returns generic message; still show success-like feedback
                toast({ title: "Check your email", description: "If an account exists, we sent a reset link." })
                setTimeout(() => navigate("/login"), 1200)
            } else {
                toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" })
            }
        } finally {
            setIsSubmitting(false)
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
                    <p className="text-gray-600 text-lg">Reset your password</p>
                </div>

                <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
                    <CardHeader className="space-y-1 pb-6">
                        <CardTitle className="text-2xl font-bold text-center text-gray-900">Forgot Password</CardTitle>
                        <p className="text-center text-gray-600">Enter your email to receive a reset link</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
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

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                                        Sending reset link...
                                    </>
                                ) : (
                                    "Send reset link"
                                )}
                            </Button>
                        </form>

                        <div className="text-center">
                            <p className="text-sm text-gray-600">
                                Remembered your password?{" "}
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

export default ForgotPassword


