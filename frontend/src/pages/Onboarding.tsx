"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Logo from "@/components/Logo"

const Onboarding: React.FC = () => {
    const navigate = useNavigate()

    const handleGetStarted = () => {
        navigate('/', { replace: true })
    }

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="inline-flex items-center gap-3">
                        <Logo size="sm" />
                        <div>
                            <div className="text-xs text-gray-500">Welcome</div>
                        </div>
                    </div>
                </div>

                {/* Main Card */}
                <Card className="border-0 shadow-2xl overflow-hidden bg-white">
                    <CardContent className="p-8 md:p-12">
                        <div className="space-y-6 text-center">
                            <div className="flex justify-center">
                                <Logo size="xl" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-gray-900">Welcome to MealLensAI</h2>
                                <p className="text-gray-600 text-lg">Your AI-Powered Kitchen Companion</p>
                            </div>
                            <div className="space-y-4 text-left bg-blue-50 p-6 rounded-lg">
                                <p className="text-gray-700 font-medium">What you'll get:</p>
                                <ul className="space-y-3 text-gray-600">
                                    <li className="flex items-start gap-3">
                                        <span className="text-blue-600 font-bold">✓</span>
                                        <span>AI-powered food and ingredient detection</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-blue-600 font-bold">✓</span>
                                        <span>Personalized meal plans tailored to your health</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-blue-600 font-bold">✓</span>
                                        <span>Smart recipe suggestions based on your location</span>
                                    </li>
                                </ul>
                            </div>
                            <p className="text-sm text-gray-500">Let's get you set up!</p>

                            <div className="flex justify-center pt-4">
                                <Button
                                    onClick={handleGetStarted}
                                    className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                                    size="lg"
                                >
                                    Get Started
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="text-center mt-6 text-sm text-gray-500">
                    By continuing, you agree to our <a className="underline hover:text-gray-700" href="#">Terms</a> and <a className="underline hover:text-gray-700" href="#">Privacy Policy</a>
                </div>
            </div>
        </div>
    )
}

export default Onboarding
