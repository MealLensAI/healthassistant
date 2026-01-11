"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronDown, ArrowRight, Trash2 } from "lucide-react"
import { useAuth, safeGetItem } from "@/lib/utils"
import { useAPI, APIError } from "@/lib/api"
import { getCachedHistory, getCachedSettingsHistory, SharedRecipe } from "@/lib/historyPreloader"

const getSourceText = (recipeType: string) => {
  switch (recipeType) {
    case "food_detection":
      return "Food Detect"
    case "ingredient_detection":
      return "Ingredient Detect"
    case "health_meal":
      return "Health Meal"
    case "meal_plan":
      return "Meal Plan"
    default:
      return "Detection"
  }
}

const getItemName = (item: SharedRecipe) => {
  if (item.suggestion) return item.suggestion
  try {
    if (item.detected_foods) {
      const foods = JSON.parse(item.detected_foods)
      if (Array.isArray(foods) && foods.length > 0) {
        return foods[0] + (foods.length > 1 ? ` (+${foods.length - 1})` : '')
      }
    }
  } catch {}
  return "Unknown"
}

// SharedRecipe type is now imported from historyPreloader

// LocalStorage cache keys (for backward compatibility)
const HISTORY_CACHE_KEY = 'meallensai_history_cache'
const HISTORY_CACHE_TIMESTAMP_KEY = 'meallensai_history_cache_timestamp'

const setCachedHistory = (history: SharedRecipe[], userId?: string) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cacheKey = userId ? `${HISTORY_CACHE_KEY}_${userId}` : HISTORY_CACHE_KEY;
      const timestampKey = userId ? `${HISTORY_CACHE_TIMESTAMP_KEY}_${userId}` : HISTORY_CACHE_TIMESTAMP_KEY;
      window.localStorage.setItem(cacheKey, JSON.stringify(history));
      window.localStorage.setItem(timestampKey, Date.now().toString());
    }
  } catch (error) {
    console.error('Error caching history:', error);
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

export function HistoryPage() {
  const navigate = useNavigate()
  
  const userData = safeGetItem('user_data');
  const userId = userData ? JSON.parse(userData)?.uid : undefined;
  
  // Get cached data immediately (even if stale) to prevent empty screen
  const cachedHistory = getCachedHistory(userId);
  const cachedSettingsHistory = getCachedSettingsHistory(userId);
  
  const [history, setHistory] = useState<SharedRecipe[]>(cachedHistory || [])
  const [settingsHistory, setSettingsHistory] = useState<any[]>(cachedSettingsHistory || [])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>("ingredient_detection")
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { api } = useAPI()
  const isFetchingHistoryRef = useRef(false)
  const lastFetchTimeRef = useRef<number>(0)

  useEffect(() => {
    const fetchHistory = async () => {
      if (authLoading || !isAuthenticated) {
        return
      }

      // Show cached data immediately if available (for better UX), but always fetch from backend
      if (cachedHistory && cachedHistory.length > 0) {
        setHistory(cachedHistory)
      }

      // Always fetch from backend when authenticated to ensure we have the latest data
      setIsLoading(true)
      setError(null)

      try {
        const result = await api.getDetectionHistory()

        if (result.status === 'success') {
          let historyData: any[] = []
          if ((result as any).detection_history) {
            historyData = (result as any).detection_history
          } else if (result.data?.detection_history) {
            historyData = result.data.detection_history
          } else if (Array.isArray(result.data)) {
            historyData = result.data
          } else if (result.data) {
            historyData = [result.data]
          } else {
            historyData = []
          }
          setHistory(historyData)
          setCachedHistory(historyData, userId)
          setError(null)
        } else {
          // Only set error if we don't have cached data to show
          if (!cachedHistory || cachedHistory.length === 0) {
            setError(result.message || 'Failed to load history.')
          }
        }
      } catch (err) {
        console.error("❌ Error fetching detection history:", err)
        // Only set error if we don't have cached data to show
        if (!cachedHistory || cachedHistory.length === 0) {
          if (err instanceof APIError) {
            setError(err.message)
          } else {
            setError("Failed to load history. Please try again later.")
          }
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchHistory().catch(console.error)
  }, [isAuthenticated, authLoading, api, userId])

  // Fetch settings history when health_history tab is active
  useEffect(() => {
    // Prevent multiple simultaneous fetches
    let isMounted = true
    let fetchTimeout: NodeJS.Timeout | null = null
    
    const fetchSettingsHistory = async (retryCount = 0) => {
      if (activeFilter !== "health_history" || !isAuthenticated || authLoading) {
        return
      }
      
      // Prevent concurrent fetches - if already fetching, skip
      if (isFetchingHistoryRef.current) {
        console.log('⏸️ History fetch already in progress, skipping...')
        return
      }
      
      // Rate limiting - don't fetch more than once per 2 seconds
      const now = Date.now()
      if (now - lastFetchTimeRef.current < 2000 && retryCount === 0) {
        console.log('⏸️ Rate limiting: too soon since last fetch, skipping...')
        return
      }
      
      isFetchingHistoryRef.current = true
      lastFetchTimeRef.current = now

      // Show cached data immediately if available (for better UX)
      const cached = getCachedSettingsHistory(userId)
      if (cached && cached.length > 0 && isMounted) {
        setSettingsHistory(cached)
      }

      // Always fetch from backend when authenticated to ensure we have the latest data
      if (isMounted) {
        setIsLoadingSettings(true)
      }

      try {
        const result = await api.getUserSettingsHistory('health_profile', 50)
        
        if (!isMounted) return
        
        if ((result as any).status === 'success') {
          // Try multiple possible response structures
          const historyData = (result as any).history || 
                              (result as any).data?.history || 
                              (result as any).data || 
                              []
          setSettingsHistory(Array.isArray(historyData) ? historyData : [])
          
          // Cache the updated history
          try {
            const settingsCacheKey = userId 
              ? `meallensai_settings_history_cache_${userId}` 
              : 'meallensai_settings_history_cache';
            const settingsTimestampKey = userId 
              ? `meallensai_settings_history_cache_timestamp_${userId}` 
              : 'meallensai_settings_history_cache_timestamp';
            window.localStorage.setItem(settingsCacheKey, JSON.stringify(historyData));
            window.localStorage.setItem(settingsTimestampKey, Date.now().toString());
          } catch (cacheError) {
            console.error('Error caching settings history:', cacheError);
          }
        } else {
          console.warn('⚠️ Health settings history API returned non-success:', result)
          // Only clear if we don't have cached data
          const cached = getCachedSettingsHistory(userId)
          if (!cached || cached.length === 0) {
            setSettingsHistory([])
          }
        }
      } catch (err: any) {
        console.error("❌ Error fetching health settings history:", err)
        
        // Retry on connection errors (up to 2 retries with exponential backoff)
        const isConnectionError = err?.message?.includes('Resource temporarily unavailable') || 
                                  err?.message?.includes('ConnectionTerminated') ||
                                  err?.message?.includes('ReadError')
        
        if (isConnectionError && retryCount < 2 && isMounted) {
          const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s
          console.log(`⏳ Retrying history fetch in ${delay}ms (attempt ${retryCount + 1}/2)...`)
          fetchTimeout = setTimeout(() => {
            fetchSettingsHistory(retryCount + 1).catch(console.error)
          }, delay)
          return
        }
        
        // Only clear if we don't have cached data
        const cached = getCachedSettingsHistory(userId)
        if (!cached || cached.length === 0) {
          setSettingsHistory([])
        }
      } finally {
        if (isMounted) {
          setIsLoadingSettings(false)
        }
        isFetchingHistoryRef.current = false
      }
    }

    // Debounce the fetch to prevent excessive calls
    fetchTimeout = setTimeout(() => {
      fetchSettingsHistory().catch(console.error)
    }, 100)
    
    // Listen for settings saved event to refresh history
    const handleSettingsSaved = () => {
      if (activeFilter === "health_history" && isMounted) {
        // Clear any pending timeout
        if (fetchTimeout) {
          clearTimeout(fetchTimeout)
        }
        // Fetch immediately when settings are saved
        fetchSettingsHistory().catch(console.error)
      }
    }
    
    window.addEventListener('settingsSaved', handleSettingsSaved)
    
    return () => {
      isMounted = false
      isFetchingHistoryRef.current = false
      if (fetchTimeout) {
        clearTimeout(fetchTimeout)
      }
      window.removeEventListener('settingsSaved', handleSettingsSaved)
    }
  }, [activeFilter, isAuthenticated, authLoading, userId]) // Removed api and cachedSettingsHistory from deps

  const handleDeleteHistory = async (recordId: string) => {
    if (!window.confirm('Are you sure you want to delete this settings history entry? This action cannot be undone.')) {
      return
    }

    setDeletingId(recordId)
    try {
      const result = await api.deleteSettingsHistory(recordId)
      if ((result as any).status === 'success') {
        setSettingsHistory(prev => prev.filter(record => record.id !== recordId))
      } else {
        alert((result as any).message || 'Failed to delete history entry')
      }
    } catch (err) {
      console.error("Error deleting settings history:", err)
      if (err instanceof APIError) {
        alert(err.message)
      } else {
        alert('Failed to delete history entry. Please try again.')
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (!isAuthenticated && !authLoading) {
    navigate('/login')
    return null
  }

  // Filter history based on active filter
  const filteredHistory = history.filter(item => {
    if (activeFilter === "ingredient_detection") return item.recipe_type === "ingredient_detection"
    return false // health_history shows settings history, not detection history
  })

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
            History
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
        {/* Filter Tabs - Only Ingredient Detections and Health History */}
        <div className="flex justify-start mb-6 sm:mb-8">
          <div className="inline-flex items-center bg-white border border-[#E7E7E7] rounded-[12px] sm:rounded-[15px] p-0.5 sm:p-1 gap-1 sm:gap-[10px] w-full sm:w-auto">
            <button
              onClick={() => setActiveFilter("ingredient_detection")}
              className={`flex-1 sm:flex-none px-2 sm:px-[10px] py-2 sm:py-[10px] rounded-[8px] sm:rounded-[10px] text-xs sm:text-[14px] font-medium transition-all duration-200 border-2 ${
                activeFilter === "ingredient_detection"
                  ? 'bg-[#F6FAFE] text-[#1A76E3] border-[#1A76E3]'
                  : 'text-gray-500 hover:text-gray-700 border-transparent'
              }`}
              style={{ fontFamily: "'Work Sans', sans-serif" }}
            >
              Ingredient Detections
            </button>
            <button
              onClick={() => setActiveFilter("health_history")}
              className={`flex-1 sm:flex-none px-2 sm:px-[10px] py-2 sm:py-[10px] rounded-[8px] sm:rounded-[10px] text-xs sm:text-[14px] font-medium transition-all duration-200 border-2 ${
                activeFilter === "health_history"
                  ? 'bg-[#F6FAFE] text-[#1A76E3] border-[#1A76E3]'
                  : 'text-gray-500 hover:text-gray-700 border-transparent'
              }`}
              style={{ fontFamily: "'Work Sans', sans-serif" }}
            >
              Health History
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* Loading State - Only show if no cached data */}
        {!error && !isLoading && !isLoadingSettings && ((activeFilter === "ingredient_detection" && filteredHistory.length === 0 && !cachedHistory) || (activeFilter === "health_history" && settingsHistory.length === 0 && !cachedSettingsHistory)) && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No history found</p>
            <p className="text-gray-400 mt-2">
              {activeFilter === "ingredient_detection" 
                ? "Start detecting ingredients to see your history here"
                : "Update your health information to see history here"}
            </p>
          </div>
        )}

        {/* History Table - Desktop */}
        {!error && ((activeFilter === "ingredient_detection" && filteredHistory.length > 0) || (activeFilter === "health_history" && settingsHistory.length > 0)) && (
          <div className="bg-white border border-[#E7E7E7] overflow-hidden rounded-lg">
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F7F7F7] border-b border-[#E7E7E7]">
                  {activeFilter === "health_history" ? (
                    <>
                      <th 
                        className="text-left"
                        style={{ 
                          padding: '10px 12px',
                          fontFamily: "'Work Sans', sans-serif",
                          fontSize: '16px',
                          fontWeight: 400,
                          lineHeight: '130%',
                          letterSpacing: '3%',
                          color: '#414141'
                        }}
                      >
                        DATE & TIME
                      </th>
                      <th 
                        className="text-left"
                        style={{ 
                          padding: '10px 12px',
                          fontFamily: "'Work Sans', sans-serif",
                          fontSize: '16px',
                          fontWeight: 400,
                          lineHeight: '130%',
                          letterSpacing: '3%',
                          color: '#414141'
                        }}
                      >
                        CHANGES MADE
                      </th>
                      <th 
                        className="text-left"
                        style={{ 
                          padding: '10px 12px',
                          fontFamily: "'Work Sans', sans-serif",
                          fontSize: '16px',
                          fontWeight: 400,
                          lineHeight: '130%',
                          letterSpacing: '3%',
                          color: '#414141'
                        }}
                      >
                        DETAILS
                      </th>
                      <th 
                        className="text-left"
                        style={{ 
                          padding: '10px 12px',
                          fontFamily: "'Work Sans', sans-serif",
                          fontSize: '16px',
                          fontWeight: 400,
                          lineHeight: '130%',
                          letterSpacing: '3%',
                          color: '#414141'
                        }}
                      >
                        ACTIONS
                      </th>
                    </>
                  ) : (
                    <>
                      <th 
                        className="text-left"
                        style={{ 
                          padding: '10px 12px',
                          fontFamily: "'Work Sans', sans-serif",
                          fontSize: '16px',
                          fontWeight: 400,
                          lineHeight: '130%',
                          letterSpacing: '3%',
                          color: '#414141'
                        }}
                      >
                        Name
                      </th>
                      <th 
                        className="text-left"
                        style={{ 
                          padding: '10px 12px',
                          fontFamily: "'Work Sans', sans-serif",
                          fontSize: '16px',
                          fontWeight: 400,
                          lineHeight: '130%',
                          letterSpacing: '3%',
                          color: '#414141'
                        }}
                      >
                        Source
                      </th>
                      <th 
                        className="text-left"
                        style={{ 
                          padding: '10px 12px',
                          fontFamily: "'Work Sans', sans-serif",
                          fontSize: '16px',
                          fontWeight: 400,
                          lineHeight: '130%',
                          letterSpacing: '3%',
                          color: '#414141'
                        }}
                      >
                        Date
                      </th>
                      <th 
                        className="text-left"
                        style={{ 
                          padding: '10px 12px',
                          fontFamily: "'Work Sans', sans-serif",
                          fontSize: '16px',
                          fontWeight: 400,
                          lineHeight: '130%',
                          letterSpacing: '3%',
                          color: '#414141'
                        }}
                      >
                        Action
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {activeFilter === "ingredient_detection" && filteredHistory.map((item, index) => (
                  <tr 
                    key={item.id || index} 
                    className="border-b border-[#E7E7E7] last:border-b-0 hover:bg-gray-50 transition-colors"
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <span 
                        className="text-gray-800"
                        style={{ 
                          fontFamily: "'Work Sans', sans-serif",
                          fontSize: '16px',
                          fontWeight: 400,
                          lineHeight: '130%',
                          letterSpacing: '3%',
                          color: '#414141'
                        }}
                      >
                        {getItemName(item)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span 
                        className="text-gray-600"
                        style={{ 
                          fontFamily: "'Work Sans', sans-serif",
                          fontSize: '16px',
                          fontWeight: 400,
                          lineHeight: '130%',
                          letterSpacing: '3%'
                        }}
                      >
                        {getSourceText(item.recipe_type)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span 
                        className="text-gray-600"
                        style={{ 
                          fontFamily: "'Work Sans', sans-serif",
                          fontSize: '16px',
                          fontWeight: 400,
                          lineHeight: '130%',
                          letterSpacing: '3%'
                        }}
                      >
                        {formatDate(item.created_at)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button
                        onClick={() => navigate(`/history/${item.id}`)}
                        className="flex items-center gap-2 text-[#1A76E3] font-medium hover:underline"
                        style={{ 
                          fontFamily: "'Work Sans', sans-serif",
                          fontSize: '16px',
                          fontWeight: 400,
                          lineHeight: '130%',
                          letterSpacing: '3%'
                        }}
                      >
                        View Details
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {activeFilter === "health_history" && settingsHistory.map((record, index) => {
                  const formatFieldName = (fieldName: string): string => {
                    const fieldMap: Record<string, string> = {
                      'hasSickness': 'Health Condition',
                      'sicknessType': 'Condition Type',
                      'age': 'Age',
                      'gender': 'Gender',
                      'height': 'Height',
                      'weight': 'Weight',
                      'waist': 'Waist Circumference',
                      'activityLevel': 'Activity Level',
                      'goal': 'Health Goal',
                      'location': 'Location'
                    };
                    const cleanField = fieldName.replace(' (removed)', '');
                    return fieldMap[cleanField] || cleanField.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
                  };

                  const meaningfulFields = record.changed_fields 
                    ? record.changed_fields.filter((field: any) => {
                        const fieldStr = String(field);
                        const isNumericIndex = /^\d+$/.test(fieldStr);
                        const isNumberedRemoved = /^\d+\s*\(removed\)$/.test(fieldStr);
                        return !isNumericIndex && !isNumberedRemoved && typeof field === 'string';
                      })
                    : [];

                  return (
                    <tr 
                      key={record.id || index} 
                      className="border-b border-[#E7E7E7] last:border-b-0 hover:bg-gray-50 transition-colors"
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <span 
                          className="text-gray-600"
                          style={{ 
                            fontFamily: "'Work Sans', sans-serif",
                            fontSize: '16px',
                            fontWeight: 400,
                            lineHeight: '130%',
                            letterSpacing: '3%'
                          }}
                        >
                          {formatDateTime(record.created_at)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div className="flex flex-wrap gap-2">
                          {meaningfulFields.length > 0 ? (
                            meaningfulFields.map((field: string, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium"
                                style={{
                                  backgroundColor: '#FFF4E6',
                                  color: '#FF8C00',
                                  border: '1px solid #FFE5CC'
                                }}
                              >
                                {formatFieldName(field)}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 italic">Settings updated</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <details className="cursor-pointer" onToggle={(e) => {
                          const target = e.target as HTMLDetailsElement;
                          const icon = target.querySelector('svg');
                          if (icon) {
                            if (target.open) {
                              icon.classList.add('rotate-90');
                            } else {
                              icon.classList.remove('rotate-90');
                            }
                          }
                        }}>
                          <summary className="text-[#1A76E3] hover:text-blue-800 text-sm font-medium flex items-center gap-1.5 list-none cursor-pointer">
                            <ChevronDown className="h-4 w-4 text-[#1A76E3] transition-transform" />
                            View details
                          </summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs space-y-2">
                            {(() => {
                              const details = record.settings_data || {};
                              const meaningfulData = Object.entries(details)
                                .filter(([key]) => !/^\d+$/.test(key) && key !== 'id' && details[key] !== null && details[key] !== undefined && details[key] !== '')
                                .map(([key, value]: [string, any]) => {
                                  const fieldNameMap: Record<string, string> = {
                                    'hasSickness': 'Has Health Condition',
                                    'sicknessType': 'Condition Type',
                                    'age': 'Age',
                                    'gender': 'Gender',
                                    'height': 'Height (cm)',
                                    'weight': 'Weight (kg)',
                                    'waist': 'Waist Circumference (cm)',
                                    'activityLevel': 'Activity Level',
                                    'goal': 'Health Goal',
                                    'location': 'Location'
                                  };

                                  const formattedKey = fieldNameMap[key] || key
                                    .replace(/([A-Z])/g, ' $1')
                                    .replace(/^./, str => str.toUpperCase())
                                    .trim();

                                  let formattedValue = String(value);
                                  if (typeof value === 'boolean') {
                                    formattedValue = value ? 'Yes' : 'No';
                                  } else if (key === 'gender') {
                                    formattedValue = String(value).charAt(0).toUpperCase() + String(value).slice(1);
                                  } else if (key === 'activityLevel' || key === 'goal') {
                                    formattedValue = String(value)
                                      .split('_')
                                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                      .join(' ');
                                  }

                                  return [formattedKey, formattedValue];
                                });

                              return meaningfulData.length > 0 ? (
                                meaningfulData.map((entry, idx: number) => {
                                  const [key, value] = entry;
                                  return (
                                    <div key={idx} className="flex justify-between gap-4">
                                      <span className="font-medium text-gray-700">{key}:</span>
                                      <span className="text-gray-600 text-right">{value}</span>
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-gray-500 italic">No saved data</p>
                              );
                            })()}
                          </div>
                        </details>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <button
                          onClick={() => handleDeleteHistory(record.id)}
                          disabled={deletingId === record.id}
                          className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                          title="Delete this entry"
                        >
                          {deletingId === record.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-[#E7E7E7]">
              {activeFilter === "ingredient_detection" && filteredHistory.map((item, index) => (
                <div key={item.id || index} className="p-4 space-y-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Name</div>
                    <div className="text-sm font-medium text-gray-800">{getItemName(item)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Source</div>
                    <div className="text-sm text-gray-600">{getSourceText(item.recipe_type)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Date</div>
                    <div className="text-sm text-gray-600">{formatDate(item.created_at)}</div>
                  </div>
                  <button
                    onClick={() => navigate(`/history/${item.id}`)}
                    className="w-full flex items-center justify-center gap-2 text-[#1A76E3] font-medium py-2 border border-[#1A76E3] rounded-lg hover:bg-[#1A76E3] hover:text-white transition-colors"
                  >
                    View Details
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {activeFilter === "health_history" && settingsHistory.map((record, index) => {
                const formatFieldName = (fieldName: string): string => {
                  const fieldMap: Record<string, string> = {
                    'hasSickness': 'Health Condition',
                    'sicknessType': 'Condition Type',
                    'age': 'Age',
                    'gender': 'Gender',
                    'height': 'Height',
                    'weight': 'Weight',
                    'waist': 'Waist Circumference',
                    'activityLevel': 'Activity Level',
                    'goal': 'Health Goal',
                    'location': 'Location'
                  };
                  const cleanField = fieldName.replace(' (removed)', '');
                  return fieldMap[cleanField] || cleanField.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
                };

                const meaningfulFields = record.changed_fields 
                  ? record.changed_fields.filter((field: any) => {
                      const fieldStr = String(field);
                      const isNumericIndex = /^\d+$/.test(fieldStr);
                      const isNumberedRemoved = /^\d+\s*\(removed\)$/.test(fieldStr);
                      return !isNumericIndex && !isNumberedRemoved && typeof field === 'string';
                    })
                  : [];

                return (
                  <div key={record.id || index} className="p-4 space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Date & Time</div>
                      <div className="text-sm text-gray-600">{formatDateTime(record.created_at)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-2">Changes Made</div>
                      <div className="flex flex-wrap gap-2">
                        {meaningfulFields.length > 0 ? (
                          meaningfulFields.map((field: string, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium"
                              style={{
                                backgroundColor: '#FFF4E6',
                                color: '#FF8C00',
                                border: '1px solid #FFE5CC'
                              }}
                            >
                              {formatFieldName(field)}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500 italic text-sm">Settings updated</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <details className="cursor-pointer">
                        <summary className="text-[#1A76E3] hover:text-blue-800 text-sm font-medium flex items-center gap-1.5 list-none cursor-pointer">
                          <ChevronDown className="h-4 w-4 text-[#1A76E3] transition-transform" />
                          View details
                        </summary>
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs space-y-2">
                          {(() => {
                            const details = record.settings_data || {};
                            const meaningfulData = Object.entries(details)
                              .filter(([key]) => !/^\d+$/.test(key) && key !== 'id' && details[key] !== null && details[key] !== undefined && details[key] !== '')
                              .map(([key, value]: [string, any]) => {
                                const fieldNameMap: Record<string, string> = {
                                  'hasSickness': 'Has Health Condition',
                                  'sicknessType': 'Condition Type',
                                  'age': 'Age',
                                  'gender': 'Gender',
                                  'height': 'Height (cm)',
                                  'weight': 'Weight (kg)',
                                  'waist': 'Waist Circumference (cm)',
                                  'activityLevel': 'Activity Level',
                                  'goal': 'Health Goal',
                                  'location': 'Location'
                                };

                                const formattedKey = fieldNameMap[key] || key
                                  .replace(/([A-Z])/g, ' $1')
                                  .replace(/^./, str => str.toUpperCase())
                                  .trim();

                                let formattedValue = String(value);
                                if (typeof value === 'boolean') {
                                  formattedValue = value ? 'Yes' : 'No';
                                } else if (key === 'gender') {
                                  formattedValue = String(value).charAt(0).toUpperCase() + String(value).slice(1);
                                } else if (key === 'activityLevel' || key === 'goal') {
                                  formattedValue = String(value)
                                    .split('_')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ');
                                }

                                return [formattedKey, formattedValue];
                              });

                            return meaningfulData.length > 0 ? (
                              meaningfulData.map((entry, idx: number) => {
                                const [key, value] = entry;
                                return (
                                  <div key={idx} className="flex justify-between gap-4">
                                    <span className="font-medium text-gray-700">{key}:</span>
                                    <span className="text-gray-600 text-right">{value}</span>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-gray-500 italic">No saved data</p>
                            );
                          })()}
                        </div>
                      </details>
                    </div>
                    <button
                      onClick={() => handleDeleteHistory(record.id)}
                      disabled={deletingId === record.id}
                      className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 py-2 border border-red-300 rounded-lg"
                      title="Delete this entry"
                    >
                      {deletingId === record.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HistoryPage
