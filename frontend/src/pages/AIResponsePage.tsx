"use client"

import type { FC } from "react"
import React, { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Upload, X, Check, ChevronDown } from "lucide-react"
import "@/styles/ai-response.css"
import { useAuth } from "@/lib/utils"
import { APP_CONFIG } from "@/lib/config"
import LoadingSpinner from "@/components/LoadingSpinner"
import { useSicknessSettings } from "@/hooks/useSicknessSettings"
import Swal from 'sweetalert2'
import { api } from "@/lib/api"
import CookingTutorialModal from "@/components/CookingTutorialModal"
import MealDetailsModal from "@/components/MealDetailsModal"

// Map new goal values to backend API format
const mapGoalToBackendFormat = (goal: string | undefined): string => {
  if (!goal) return 'heal'; // default
  
  // Normalize: trim whitespace and handle case-insensitive matching
  const normalizedGoal = goal.trim();
  
  const goalMap: Record<string, string> = {
    // New goal values (exact match) - send as lowercase for backend compatibility
    'Heal': 'heal',
    'Improve': 'heal',
    'Manage': 'heal',
    'Restore': 'heal',
    'Maintain': 'maintain',
    // Lowercase versions
    'heal': 'heal',
    'improve': 'heal',
    'manage': 'heal',
    'restore': 'heal',
    'maintain': 'maintain',
    // Legacy values for backward compatibility
    'Heal Health Condition': 'heal',
    'Improve Health Condition': 'heal',
    'Manage Health Condition': 'heal',
    'Restore Health Condition': 'heal',
    'Maintain Health Condition': 'maintain',
    'Heal & Manage Condition': 'heal',
    'Maintain Health': 'maintain',
    'lose_weight': 'lose_weight',
    'gain_weight': 'gain_weight',
    'improve_fitness': 'improve_fitness'
  };
  
  // Try exact match first
  if (goalMap[normalizedGoal]) {
    return goalMap[normalizedGoal];
  }
  
  // Try case-insensitive match
  const lowerGoal = normalizedGoal.toLowerCase();
  for (const [key, value] of Object.entries(goalMap)) {
    if (key.toLowerCase() === lowerGoal) {
      return value;
    }
  }
  
  // Default: if it contains 'maintain', return 'maintain', otherwise 'heal'
  if (lowerGoal.includes('maintain')) {
    return 'maintain';
  }
  
  return 'heal'; // Default fallback
};

interface HealthMeal {
  calories: number
  carbs: number
  fat: number
  fiber: number
  food_suggestions: string[]
  health_benefit: string
  ingredients_used: string[]
  protein: number
  image?: string
}

interface DetectedIngredient {
  name: string
  healthInfo: string
  isWarning: boolean
}

// MealCard component that fetches images like Diet Planner
const MealCard: React.FC<{ meal: HealthMeal; onViewDetails: () => void }> = ({ meal, onViewDetails }) => {
  const [foodImage, setFoodImage] = useState<string>('')
  const [imageLoading, setImageLoading] = useState(true)

  useEffect(() => {
    const fetchFoodImage = async () => {
      const foodName = meal.food_suggestions?.[0] || "healthy meal"
      try {
        const response = await fetch('https://get-images-qa23.onrender.com/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: foodName }),
        })
        if (!response.ok) throw new Error('HTTP error')
        const data = await response.json()
        if (data.image_url && !data.error) {
          setFoodImage(data.image_url)
        } else {
          setFoodImage('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop')
        }
      } catch (error) {
        setFoodImage('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop')
      } finally {
        setImageLoading(false)
      }
    }
    fetchFoodImage()
  }, [meal.food_suggestions])

  return (
    <div className="bg-white rounded-[15px] border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      {/* Meal Image - Same size as Diet Planner cards */}
      <div className="relative h-[140px] overflow-hidden bg-gray-100">
        {imageLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <img 
            src={foodImage} 
            alt={meal.food_suggestions?.[0] || "Meal"}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'
            }}
          />
        )}
        {/* Calorie Badge */}
        <div className="absolute bottom-2 right-2 bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
          🔥 {meal.calories}kcal
        </div>
      </div>

      {/* Meal Info */}
      <div className="p-4">
        <h4 className="font-semibold text-gray-800 text-[14px] mb-3 line-clamp-2 leading-tight">
          {meal.food_suggestions?.[0] || "Health Meal"}
        </h4>

        {/* Nutrition Info - Compact */}
        <div className="flex gap-1.5 sm:gap-2 mb-3 overflow-x-auto scrollbar-hide -mx-1 px-1">
          <div className="w-[55px] min-w-[55px] sm:w-[69px] sm:min-w-[69px] h-[65px] sm:h-[75px] bg-[#FEF5EF] border border-[#FDE8DC] rounded-[8px] sm:rounded-[10px] p-1.5 sm:p-2 text-center flex flex-col items-center justify-center gap-[2px] flex-shrink-0">
            <span className="text-xs sm:text-sm">🍖</span>
            <p className="font-bold text-gray-800 text-[11px] sm:text-[13px]">{meal.protein}g</p>
            <p className="text-[9px] sm:text-[10px] text-gray-500">Protein</p>
          </div>
          <div className="w-[55px] min-w-[55px] sm:w-[69px] sm:min-w-[69px] h-[65px] sm:h-[75px] bg-[#FEF5EF] border border-[#FDE8DC] rounded-[8px] sm:rounded-[10px] p-1.5 sm:p-2 text-center flex flex-col items-center justify-center gap-[2px] flex-shrink-0">
            <span className="text-xs sm:text-sm">🌾</span>
            <p className="font-bold text-gray-800 text-[11px] sm:text-[13px]">{meal.carbs}g</p>
            <p className="text-[9px] sm:text-[10px] text-gray-500">Carbs</p>
          </div>
          <div className="w-[55px] min-w-[55px] sm:w-[69px] sm:min-w-[69px] h-[65px] sm:h-[75px] bg-[#FEF5EF] border border-[#FDE8DC] rounded-[8px] sm:rounded-[10px] p-1.5 sm:p-2 text-center flex flex-col items-center justify-center gap-[2px] flex-shrink-0">
            <span className="text-xs sm:text-sm">💧</span>
            <p className="font-bold text-gray-800 text-[11px] sm:text-[13px]">{meal.fat}g</p>
            <p className="text-[9px] sm:text-[10px] text-gray-500">Fats</p>
          </div>
        </div>

        {/* Health Benefit */}
        <div className="flex items-start gap-1.5 mb-3">
          <span className="text-green-500 text-sm">✓</span>
          <p className="text-[12px] text-orange-500 line-clamp-2 leading-relaxed">{meal.health_benefit}</p>
        </div>

        {/* View Details Button */}
        <button
          onClick={onViewDetails}
          className="w-full py-2.5 border-[1.5px] border-[#1A76E3] text-[#1A76E3] rounded-[10px] text-[13px] font-semibold hover:bg-[#1A76E3] hover:text-white transition-all duration-200"
        >
          View Meal Details
        </button>
      </div>
    </div>
  )
}

const AIResponsePage: FC = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showIngredientModal, setShowIngredientModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [ingredientList, setIngredientList] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [detectedIngredients, setDetectedIngredients] = useState<DetectedIngredient[]>([])
  const [healthMeals, setHealthMeals] = useState<HealthMeal[]>([])
  const [showResults, setShowResults] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showCookingModal, setShowCookingModal] = useState(false)
  const [showMealDetailsModal, setShowMealDetailsModal] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<HealthMeal | null>(null)
  const [selectedMealName, setSelectedMealName] = useState("")
  const [selectedMealIngredients, setSelectedMealIngredients] = useState<string[]>([])
  
  const { user, isAuthenticated, loading } = useAuth()
  const { settings: sicknessSettings, isHealthProfileComplete } = useSicknessSettings()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    navigate('/login')
    return null
  }

  const handleUploadClick = () => {
    setShowUploadModal(true)
  }

  const handleListIngredientsClick = () => {
    setShowIngredientModal(true)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleDetect = async (inputType: "image" | "ingredient_list" = "image") => {
    if (inputType === "image" && !selectedImage) {
      Swal.fire({
        icon: 'warning',
        title: 'No Image Selected',
        text: 'Please upload or capture an image first.',
        confirmButtonColor: '#1A76E3'
      })
      return
    }

    if (inputType === "ingredient_list" && !ingredientList.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'No Ingredients',
        text: 'Please enter your ingredients.',
        confirmButtonColor: '#1A76E3'
      })
      return
    }

    if (!isHealthProfileComplete()) {
      Swal.fire({
        icon: 'info',
        title: 'Health Profile Required',
        text: 'Please complete your health profile in Settings first.',
        confirmButtonColor: '#1A76E3'
      })
      return
    }

    setShowUploadModal(false)
    setShowIngredientModal(false)
    setIsLoading(true)
    setShowResults(false)

    const formData = new FormData()
    formData.append("age", sicknessSettings.age?.toString() || "")
    formData.append("weight", sicknessSettings.weight?.toString() || "")
    formData.append("height", sicknessSettings.height?.toString() || "")
    formData.append("waist", sicknessSettings.waist?.toString() || "")
    formData.append("gender", sicknessSettings.gender || "")
    formData.append("activity_level", sicknessSettings.activityLevel || "")
    formData.append("condition", sicknessSettings.sicknessType || "")
    formData.append("goal", mapGoalToBackendFormat(sicknessSettings.goal))
    
    if (inputType === "image" && selectedImage) {
      formData.append("image_or_ingredient_list", "image")
      formData.append("image", selectedImage)
    } else {
      formData.append("image_or_ingredient_list", "ingredient_list")
      formData.append("ingredient_list", ingredientList)
    }

    try {
      const response = await fetch(`${APP_CONFIG.api.ai_api_url}/generate_meals_from_ingredients`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to detect ingredients")
      }

      const data = await response.json()
      console.log("Detection response:", data)
      console.log("Meal options from API:", data.meal_options)
      console.log("Main ingredients from API:", data.main_ingredients)

      if (data.error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.error,
          confirmButtonColor: '#1A76E3'
        })
        return
      }

      // Parse detected ingredients from main_ingredients
      const mainIngredients = data.main_ingredients || []
      const ingredientsList = Array.isArray(mainIngredients)
        ? mainIngredients.map((ingredient: string) => ingredient.trim()).filter((s: string) => s.length > 0)
        : typeof mainIngredients === 'string'
        ? mainIngredients.split(',').map((ingredient: string) => ingredient.trim()).filter((s: string) => s.length > 0)
        : []
      
      // Check if we got any ingredients
      if (ingredientsList.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'No Ingredients Detected',
          text: 'Could not detect any ingredients from the input. Please try again.',
          confirmButtonColor: '#1A76E3'
        })
        setIsLoading(false)
        return
      }
      
      // Create ingredient objects with health info based on sickness type
      const parsedIngredients: DetectedIngredient[] = ingredientsList.map((name: string) => {
        // Simple health assessment based on ingredient and condition
        const isHighRisk = checkIngredientRisk(name, sicknessSettings.sicknessType || "")
        return {
          name: name.charAt(0).toUpperCase() + name.slice(1),  // Capitalize first letter
          healthInfo: isHighRisk 
            ? `May affect ${sicknessSettings.sicknessType}` 
            : `Good for ${sicknessSettings.sicknessType} management`,
          isWarning: isHighRisk
        }
      })

      setDetectedIngredients(parsedIngredients)

      // Process meal options - should have full nutrition data
      let mealsWithImages: HealthMeal[] = []
      
      if (data.meal_options && Array.isArray(data.meal_options)) {
        // Full meal objects with nutrition data from the new API
        mealsWithImages = data.meal_options.map((meal: HealthMeal, index: number) => ({
          ...meal,
          image: getMealImage(meal.food_suggestions?.[0] || "meal", index)
        }))
      } else {
        // Fallback if no meal_options (shouldn't happen with the new API)
        console.warn("No meal_options in response, this shouldn't happen with /generate_meals_from_ingredients")
        mealsWithImages = []
      }

      setHealthMeals(mealsWithImages)
      setShowResults(true)
    } catch (error) {
      console.error("Error detecting ingredients:", error)
      Swal.fire({
        icon: 'error',
        title: 'Detection Failed',
        text: 'Failed to detect ingredients. Please try again.',
        confirmButtonColor: '#1A76E3'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const checkIngredientRisk = (ingredient: string, condition: string): boolean => {
    const lowerIngredient = ingredient.toLowerCase()
    const lowerCondition = condition.toLowerCase()
    
    // High cholesterol risks
    if (lowerCondition.includes('cholesterol')) {
      return ['butter', 'cheese', 'bacon', 'sausage', 'fatty', 'fried'].some(r => lowerIngredient.includes(r))
    }
    // Diabetes risks
    if (lowerCondition.includes('diabetes') || lowerCondition.includes('sugar')) {
      return ['sugar', 'candy', 'sweet', 'syrup', 'honey'].some(r => lowerIngredient.includes(r))
    }
    // Heart disease risks
    if (lowerCondition.includes('heart')) {
      return ['salt', 'sodium', 'fried', 'processed'].some(r => lowerIngredient.includes(r))
    }
    return false
  }

  const getMealImage = (_mealName: string, index: number): string => {
    // Use Unsplash food images as placeholders
    const foodImages = [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1482049016gy215f-d4b5923e8331?w=400&h=300&fit=crop',
    ]
    return foodImages[index % foodImages.length]
  }

  const handleViewMealDetails = (meal: HealthMeal) => {
    setSelectedMeal(meal)
    setShowMealDetailsModal(true)
  }

  const handleGetCookingInstructions = async () => {
    if (!selectedMeal) return
    
    const mealName = selectedMeal.food_suggestions?.[0] || "Health Meal"
    setSelectedMealName(mealName)
    setSelectedMealIngredients(selectedMeal.ingredients_used || [])
    
    // Close meal details modal and open cooking modal
    setShowMealDetailsModal(false)
    setShowCookingModal(true)
    
    // Fetch instructions and resources, then save to history with complete data
    try {
      const sicknessInfo = sicknessSettings.sicknessType ? {
        sicknessType: sicknessSettings.sicknessType
      } : null

      // 1. Get cooking instructions
      const requestBody: any = {
        food_name: mealName,
        ingredients: selectedMeal.ingredients_used || []
      }

      if (sicknessInfo) {
        requestBody.sickness = sicknessInfo.sicknessType
      }

      const endpoint = sicknessInfo 
        ? `${APP_CONFIG.api.ai_api_url}/sick_meal_plan_instructions` 
        : `${APP_CONFIG.api.ai_api_url}/meal_plan_instructions`

      const instrRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!instrRes.ok) {
        throw new Error(`Failed to fetch instructions: ${instrRes.status}`)
      }

      const instrData = await instrRes.json()
      let instructions = instrData.instructions || ''

      // 2. Get resources (YouTube and Google)
      const formData = new FormData()
      formData.append('food_choice_index', mealName)
      
      const resRes = await fetch(`${APP_CONFIG.api.ai_api_url}/resources`, {
        method: 'POST',
        body: formData,
      })

      if (!resRes.ok) {
        throw new Error(`Failed to fetch resources: ${resRes.status}`)
      }

      const resData = await resRes.json()
      
      // Extract YouTube and Google resources
      const youtubeResults = (resData.YoutubeSearch || []).flat()
      const googleResults = (resData.GoogleSearch || []).flat()
      
      // Get first YouTube link if available
      const youtubeLink = youtubeResults.length > 0 ? youtubeResults[0].link : ""
      
      // Get first Google link if available
      const googleLink = googleResults.length > 0 ? googleResults[0].link : ""
      
      // Create resources JSON with full data
      const resourcesJson = JSON.stringify({
        YoutubeSearch: youtubeResults,
        GoogleSearch: googleResults
      })

      // 3. Save to history with complete data
      const analysisId = `ingredient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const historyData = {
        recipe_type: "ingredient_detection",
        suggestion: mealName,
        instructions: instructions,
        ingredients: JSON.stringify(selectedMeal.ingredients_used || []),
        detected_foods: JSON.stringify(detectedIngredients.map(i => i.name)),
        analysis_id: analysisId,
        youtube_link: youtubeLink,
        google_link: googleLink,
        resources_link: resourcesJson
      }
      
      console.log("[AIResponse] Saving ingredient detection to history with complete data:", {
        ...historyData,
        resources_link: "..." // Don't log full resources JSON
      })
      
      const saveResult = await api.saveDetectionHistory(historyData)
      
      if (saveResult.status === 'success') {
        console.log("[AIResponse] ✅ Ingredient detection saved to history successfully with resources")
      } else {
        console.warn("[AIResponse] ⚠️ Failed to save to history:", saveResult.message)
      }
    } catch (historyError) {
      console.error("[AIResponse] Error fetching resources or saving to history:", historyError)
      // Modal is already open, it will handle loading its own content
    }
  }

  const handleNewDetection = () => {
    setShowResults(false)
    setSelectedImage(null)
    setImagePreview(null)
    setIngredientList("")
    setDetectedIngredients([])
    setHealthMeals([])
    setSelectedMeal(null)
    setShowMealDetailsModal(false)
    setShowCookingModal(false)
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
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
            Ingredients Detector
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
                  <a href="/settings" className="block px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-[15px] text-gray-700 hover:bg-gray-50">Settings</a>
                  <a href="/history" className="block px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-[15px] text-gray-700 hover:bg-gray-50">History</a>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-6"></div>
            <p className="text-xl text-gray-600 font-medium">Detecting Ingredients.....</p>
          </div>
        )}

        {/* Initial State - Choose Detection Method */}
        {!isLoading && !showResults && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold text-center text-gray-800 mb-2">
              Choose how you want to detect
            </h2>
            <p className="text-center text-gray-500 mb-10">your ingredients.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Upload Image Card */}
              <button
                onClick={handleUploadClick}
                className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-6 sm:p-8 md:p-10 hover:border-blue-300 hover:shadow-lg transition-all duration-300 text-center group"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                  <Upload className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-blue-500 group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Upload image</h3>
                <p className="text-gray-500 text-xs sm:text-sm">Choose an Existing photo<br/>from your device</p>
              </button>

              {/* List Ingredients Card */}
              <button
                onClick={handleListIngredientsClick}
                className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-6 sm:p-8 md:p-10 hover:border-blue-300 hover:shadow-lg transition-all duration-300 text-center group"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-gray-600 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">List Ingredients</h3>
                <p className="text-gray-500 text-xs sm:text-sm">Type your ingredients<br/>manually</p>
              </button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Results State */}
        {!isLoading && showResults && (
          <div>
            {/* Header with Detect Button */}
            <div className="flex items-center justify-between mb-6">
              <h2 
                className="text-[24px] font-medium tracking-[0.03em] leading-[130%]"
                style={{ fontFamily: "'Work Sans', sans-serif", color: '#414141' }}
              >
                Detected Ingredients
              </h2>
              <button
                onClick={handleNewDetection}
                className="px-6 py-3 bg-[#1A76E3] text-white rounded-[15px] font-semibold hover:bg-blue-600 transition-colors"
              >
                Detect Ingredient
              </button>
            </div>

            {/* Detected Ingredients Card - Figma style */}
            {/* Width: 782px, Height: auto, Radius: 15px, Border: 1px #E7E7E7, Padding: 32px top/bottom, 24px left/right, Gap: 20px */}
            <div 
              className="bg-white rounded-[12px] sm:rounded-[15px] border border-[#E7E7E7] mb-6 sm:mb-8 max-w-[782px] w-full"
              style={{ padding: '16px 16px' }}
            >
              {/* 2 columns layout with separator lines */}
              <div className="flex flex-col gap-5">
                {/* Group ingredients into rows of 2 */}
                {Array.from({ length: Math.ceil(detectedIngredients.length / 2) }, (_, rowIndex) => {
                  const startIdx = rowIndex * 2
                  const rowIngredients = detectedIngredients.slice(startIdx, startIdx + 2)
                  const isLastRow = rowIndex === Math.ceil(detectedIngredients.length / 2) - 1
                  
                  return (
                    <div key={rowIndex}>
                      {/* Row with 2 ingredients */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                        {rowIngredients.map((ingredient, colIndex) => (
                          <div key={colIndex} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-blue-500">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 text-[15px]">{ingredient.name}</p>
                              {/* Only show warning text for risky ingredients */}
                              {ingredient.isWarning && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-sm">⚠️</span>
                                  <p className="text-[13px] text-red-500">
                                    {ingredient.healthInfo}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Separator line - Width: 735px, Border: 1px #E7E7E7 */}
                      {!isLastRow && (
                        <div className="border-b border-[#E7E7E7] mt-3 sm:mt-5" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Suggested Meals Section - Left aligned */}
            <div>
              <h3 
                className="text-[20px] font-semibold mb-5 text-left"
                style={{ fontFamily: "'Work Sans', sans-serif", color: '#414141' }}
              >
                Suggested Meals ({healthMeals.length})
              </h3>
              
              {/* Grid with same card size as Diet Planner */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {healthMeals.map((meal, index) => (
                  <MealCard 
                    key={index}
                    meal={meal}
                    onViewDetails={() => handleViewMealDetails(meal)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl max-w-lg w-full p-4 sm:p-6 my-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Upload Ingredient Image</h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 transition-colors mb-6"
            >
              {imagePreview ? (
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-h-[200px] mx-auto rounded-lg object-contain"
                />
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Click to upload</p>
                  <p className="text-gray-400 text-sm mt-1">PNG, JPG, JPEG up to 10MB</p>
                </>
              )}
            </div>

            {/* Detect Button */}
            <button
              onClick={() => handleDetect("image")}
              disabled={!selectedImage}
              className="w-full py-4 bg-[#1A76E3] text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Detect
            </button>
          </div>
        </div>
      )}

      {/* Ingredient List Modal */}
      {showIngredientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl max-w-lg w-full p-4 sm:p-6 my-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">List Your Ingredients</h3>
              <button 
                onClick={() => setShowIngredientModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Ingredient Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What ingredients do you have?
              </label>
              <textarea
                value={ingredientList}
                onChange={(e) => setIngredientList(e.target.value)}
                placeholder="e.g., chicken, tomatoes, basil, olive oil, garlic..."
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-700"
              />
              <p className="text-xs text-gray-400 mt-2">
                Separate ingredients with commas
              </p>
            </div>

            {/* Detect Button */}
            <button
              onClick={() => handleDetect("ingredient_list")}
              disabled={!ingredientList.trim()}
              className="w-full py-4 bg-[#1A76E3] text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Detect
            </button>
          </div>
        </div>
      )}

      {/* Meal Details Modal */}
      <MealDetailsModal
        isOpen={showMealDetailsModal}
        onClose={() => setShowMealDetailsModal(false)}
        meal={selectedMeal}
        onGetCookingInstructions={handleGetCookingInstructions}
      />

      {/* Cooking Tutorial Modal */}
      <CookingTutorialModal
        isOpen={showCookingModal}
        onClose={() => setShowCookingModal(false)}
        recipeName={selectedMealName}
        ingredients={selectedMealIngredients}
      />
    </div>
  )
}

export default AIResponsePage
