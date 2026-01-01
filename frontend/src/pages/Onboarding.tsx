"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowRight, ArrowLeft, User, MapPin, HeartPulse, Sparkles } from "lucide-react"
import { useSicknessSettings, type SicknessSettings } from "@/hooks/useSicknessSettings"
import Logo from "@/components/Logo"

const Onboarding: React.FC = () => {
    const navigate = useNavigate()
    const { toast } = useToast()
    const { settings: existingSettings, saveSettings } = useSicknessSettings()

    // Complete form data with all required fields
    const [formData, setFormData] = useState({
        age: existingSettings.age,
        gender: existingSettings.gender,
        height: existingSettings.height,
        weight: existingSettings.weight,
        waist: existingSettings.waist,
        activityLevel: existingSettings.activityLevel,
        location: existingSettings.location || '',
        hasSickness: true, // Always true for sickness app
        sicknessType: existingSettings.sicknessType || '',
        goal: existingSettings.goal || ''
    })

    const [currentStep, setCurrentStep] = useState<number>(0)
    const [isSaving, setIsSaving] = useState(false)

    // Steps for onboarding
    const steps = [
        {
            id: 'welcome',
            title: "Welcome to MealLensAI",
            subtitle: "Let's set up your profile",
            icon: <Sparkles className="h-6 w-6" />,
        },
        {
            id: 'personal',
            title: "Basic Information",
            subtitle: "Tell us a bit about yourself",
            icon: <User className="h-6 w-6" />,
        },
        {
            id: 'location',
            title: "Your Location",
            subtitle: "We'll personalize recipes for your region",
            icon: <MapPin className="h-6 w-6" />,
        },
        {
            id: 'health',
            title: "Health Information",
            subtitle: "Help us customize your meal plans",
            icon: <HeartPulse className="h-6 w-6" />,
        },
    ]

    const totalSteps = steps.length
    const currentStepData = steps[currentStep]

    const updateFormData = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const next = () => {
        if (!validateCurrentStep()) {
            return
        }
        setCurrentStep(s => Math.min(s + 1, totalSteps - 1))
    }

    const prev = () => setCurrentStep(s => Math.max(s - 1, 0))

    const validateCurrentStep = (): boolean => {
        const stepId = currentStepData.id

        if (stepId === 'personal') {
            if (!formData.age || formData.age < 10 || formData.age > 120) {
                toast({
                    title: "Invalid Age",
                    description: "Please enter a valid age between 10 and 120.",
                    variant: "destructive"
                })
                return false
            }
            if (!formData.gender) {
                toast({
                    title: "Gender Required",
                    description: "Please select your gender.",
                    variant: "destructive"
                })
                return false
            }
            if (!formData.height || formData.height < 50 || formData.height > 250) {
                toast({
                    title: "Height Required",
                    description: "Please enter your height in cm (50-250).",
                    variant: "destructive"
                })
                return false
            }
            if (!formData.weight || formData.weight < 20 || formData.weight > 300) {
                toast({
                    title: "Weight Required",
                    description: "Please enter your weight in kg (20-300).",
                    variant: "destructive"
                })
                return false
            }
            if (!formData.waist || formData.waist < 60 || formData.waist > 150) {
                toast({
                    title: "Waist Circumference Required",
                    description: "Please enter your waist circumference in cm (60-150).",
                    variant: "destructive"
                })
                return false
            }
        }

        if (stepId === 'location') {
            if (!formData.location || formData.location.trim().length < 2) {
                toast({
                    title: "Location Required",
                    description: "Please enter your location (e.g., Nairobi, Kenya).",
                    variant: "destructive"
                })
                return false
            }
        }

        if (stepId === 'health') {
            if (!formData.sicknessType || formData.sicknessType.trim().length < 2) {
                toast({
                    title: "Health Condition Required",
                    description: "Please specify your health condition.",
                    variant: "destructive"
                })
                return false
            }
            if (!formData.activityLevel) {
                toast({
                    title: "Activity Level Required",
                    description: "Please select your activity level.",
                    variant: "destructive"
                })
                return false
            }
            if (!formData.goal) {
                toast({
                    title: "Health Goal Required",
                    description: "Please select your health goal.",
                    variant: "destructive"
                })
                return false
            }
        }

        return true
    }

    const handleFinish = async () => {
        if (!validateCurrentStep()) {
            return
        }

        setIsSaving(true)
        try {
            // Save all form data
            const dataToSave: Partial<SicknessSettings> = {
                age: formData.age,
                gender: formData.gender as 'male' | 'female' | 'other',
                height: formData.height,
                weight: formData.weight,
                waist: formData.waist,
                activityLevel: formData.activityLevel as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
                location: formData.location,
                hasSickness: true, // Always true for sickness app
                sicknessType: formData.sicknessType,
                goal: formData.goal
            }

            const res = await saveSettings(dataToSave as SicknessSettings)
            if (res.success) {
                toast({ 
                    title: "Profile Created! 🎉", 
                    description: "Your health profile has been saved successfully.",
                    duration: 5000
                })
                navigate('/ai-kitchen', { replace: true })
            } else {
                toast({ 
                    title: "Couldn't Save Settings", 
                    description: "Don't worry, you can update them in Settings later.", 
                    variant: "destructive" 
                })
                navigate('/ai-kitchen', { replace: true })
            }
        } catch (error) {
            console.error('Error saving onboarding data:', error)
            toast({ 
                title: "Something Went Wrong", 
                description: "You can complete your profile in Settings.", 
                variant: "destructive" 
            })
            navigate('/ai-kitchen', { replace: true })
        } finally {
            setIsSaving(false)
        }
    }

    const renderStepContent = () => {
        const stepId = currentStepData.id

        switch (stepId) {
            case 'welcome':
                return (
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
                    </div>
                )

            case 'personal':
                return (
                    <div className="space-y-5">
                        <div className="text-center space-y-2">
                            <div className="inline-flex items-center gap-2 text-blue-600 font-semibold text-sm bg-blue-50 px-4 py-2 rounded-full">
                                {currentStepData.icon}
                                <span>Step 1 of 3</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">{currentStepData.title}</h2>
                            <p className="text-gray-600">{currentStepData.subtitle}</p>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="age" className="text-sm font-medium text-gray-700">Age *</Label>
                                    <Input
                                        id="age"
                                        type="number"
                                        placeholder="Enter your age"
                                        value={formData.age || ''}
                                        onChange={(e) => updateFormData('age', parseInt(e.target.value) || undefined)}
                                        min="10"
                                        max="120"
                                        className="h-12"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">Gender *</Label>
                                    <Select
                                        value={formData.gender || ''}
                                        onValueChange={(value) => updateFormData('gender', value)}
                                    >
                                        <SelectTrigger className="h-12">
                                            <SelectValue placeholder="Select gender" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="height" className="text-sm font-medium text-gray-700">Height (cm) *</Label>
                                    <Input
                                        id="height"
                                        type="number"
                                        placeholder="Enter height in cm"
                                        value={formData.height || ''}
                                        onChange={(e) => updateFormData('height', parseFloat(e.target.value) || undefined)}
                                        min="50"
                                        max="250"
                                        className="h-12"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="weight" className="text-sm font-medium text-gray-700">Weight (kg) *</Label>
                                    <Input
                                        id="weight"
                                        type="number"
                                        placeholder="Enter weight in kg"
                                        value={formData.weight || ''}
                                        onChange={(e) => updateFormData('weight', parseFloat(e.target.value) || undefined)}
                                        min="20"
                                        max="300"
                                        className="h-12"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="waist" className="text-sm font-medium text-gray-700">Waist Circumference (cm) *</Label>
                                <Input
                                    id="waist"
                                    type="number"
                                    placeholder="Enter waist circumference in cm"
                                    value={formData.waist || ''}
                                    onChange={(e) => updateFormData('waist', parseFloat(e.target.value) || undefined)}
                                    min="60"
                                    max="150"
                                    className="h-12"
                                />
                            </div>
                        </div>
                    </div>
                )

            case 'location':
                return (
                    <div className="space-y-5">
                        <div className="text-center space-y-2">
                            <div className="inline-flex items-center gap-2 text-blue-600 font-semibold text-sm bg-blue-50 px-4 py-2 rounded-full">
                                {currentStepData.icon}
                                <span>Step 2 of 3</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">{currentStepData.title}</h2>
                            <p className="text-gray-600">{currentStepData.subtitle}</p>
                        </div>

                        <div className="space-y-2 pt-2">
                            <Label htmlFor="location" className="text-sm font-medium text-gray-700">Your Location *</Label>
                            <Input
                                id="location"
                                placeholder="e.g., Nairobi, Kenya or Nigeria"
                                value={formData.location || ''}
                                onChange={(e) => updateFormData('location', e.target.value)}
                                className="h-12"
                            />
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                                <p className="text-sm text-blue-800">
                                    <span className="font-medium">💡 Why we need this:</span><br />
                                    We'll suggest recipes using locally available ingredients and adapt to your region's cuisine.
                                </p>
                            </div>
                        </div>
                    </div>
                )

            case 'health':
                return (
                    <div className="space-y-5">
                        <div className="text-center space-y-2">
                            <div className="inline-flex items-center gap-2 text-blue-600 font-semibold text-sm bg-blue-50 px-4 py-2 rounded-full">
                                {currentStepData.icon}
                                <span>Step 3 of 3</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">{currentStepData.title}</h2>
                            <p className="text-gray-600">{currentStepData.subtitle}</p>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <Label htmlFor="sickness" className="text-sm font-medium text-gray-700">Health Condition *</Label>
                                <Input
                                    id="sickness"
                                    placeholder="e.g., diabetes, hypertension"
                                    value={formData.sicknessType}
                                    onChange={(e) => updateFormData('sicknessType', e.target.value)}
                                    className="h-12"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700">Activity Level *</Label>
                                <Select
                                    value={formData.activityLevel || ''}
                                    onValueChange={(value) => updateFormData('activityLevel', value)}
                                >
                                    <SelectTrigger className="h-12">
                                        <SelectValue placeholder="Select activity level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sedentary">Sedentary</SelectItem>
                                        <SelectItem value="light">Light</SelectItem>
                                        <SelectItem value="moderate">Moderate</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="very_active">Very Active</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700">Health Goal *</Label>
                                <Select
                                    value={formData.goal || ''}
                                    onValueChange={(value) => updateFormData('goal', value)}
                                >
                                    <SelectTrigger className="h-12">
                                        <SelectValue placeholder="Select your goal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Heal">Heal</SelectItem>
                                        <SelectItem value="Improve">Improve</SelectItem>
                                        <SelectItem value="Manage">Manage</SelectItem>
                                        <SelectItem value="Restore">Restore</SelectItem>
                                        <SelectItem value="Maintain">Maintain</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )

            default:
                return null
        }
    }

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="inline-flex items-center gap-3">
                        <Logo size="sm" />
                        <div>
                            <div className="text-xs text-gray-500">Profile Setup</div>
                        </div>
                    </div>
                    <Link to="/ai-kitchen" className="text-sm text-gray-500 hover:text-gray-700 font-medium">Skip</Link>
                </div>

                {/* Main Card */}
                <Card className="border-0 shadow-2xl overflow-hidden bg-white">
                    {/* Progress Bar */}
                    <div className="h-2 bg-gray-100">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out" 
                            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }} 
                        />
                    </div>

                    {/* Content */}
                    <CardContent className="p-8 md:p-12">
                        <div className="min-h-[400px] flex flex-col">
                            {/* Step Content */}
                            <div className="flex-1">
                                {renderStepContent()}
                            </div>

                            {/* Navigation Buttons */}
                            <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-100">
                                <Button 
                                    variant="ghost" 
                                    onClick={prev} 
                                    disabled={currentStep === 0}
                                    className="gap-2"
                                    size="lg"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back
                                </Button>
                                
                                {currentStep < totalSteps - 1 ? (
                                    <Button 
                                        onClick={next} 
                                        className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                                        size="lg"
                                    >
                                        Continue
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button 
                                        onClick={handleFinish} 
                                        disabled={isSaving}
                                        className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                                        size="lg"
                                    >
                                        {isSaving ? 'Saving...' : 'Get Started'}
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                )}
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
