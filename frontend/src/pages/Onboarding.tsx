"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"

const Onboarding: React.FC = () => {
    const navigate = useNavigate()

    const handleGetStarted = () => {
        navigate('/', { replace: true })
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="mb-10 text-center">
                    <Logo size="xl" />
                </div>

                <div className="rounded-2xl border border-border bg-card p-8 md:p-10 shadow-soft text-center">
                    <h1 className="font-display text-3xl font-bold text-foreground tracking-tight mb-3">
                        Welcome to MealLensAI
                    </h1>
                    <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                        Your food companion for eating right with chronic conditions.
                    </p>

                    <div className="text-left bg-leaf-soft rounded-2xl p-6 mb-8 space-y-3">
                        <p className="font-semibold text-foreground">What you can do:</p>
                        <ul className="space-y-2.5 text-muted-foreground text-[15px]">
                            <li>Scan ingredients and get meal ideas</li>
                            <li>Build weekly plans for your health condition</li>
                            <li>Cook with clear, step-by-step instructions</li>
                        </ul>
                    </div>

                    <Button
                        onClick={handleGetStarted}
                        className="rounded-full bg-primary hover:bg-blue-deep px-8"
                        size="lg"
                    >
                        Get started
                    </Button>
                </div>

                <p className="text-center mt-6 text-sm text-muted-foreground">
                    By continuing, you agree to our Terms and Privacy Policy
                </p>
            </div>
        </div>
    )
}

export default Onboarding
