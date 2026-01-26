"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Play, Globe, ChevronDown } from "lucide-react"
import { useAuth, safeGetItem } from "@/lib/utils"
import { useAPI } from "@/lib/api"

interface HistoryDetail {
  id: string
  recipe_type: "food_detection" | "ingredient_detection"
  detected_foods?: string
  instructions?: string
  resources?: string
  suggestion?: string
  ingredients?: string
  created_at: string
  youtube_link?: string
  google_link?: string
  resources_link?: string
  youtube?: string
  google?: string
}

const getCachedHistory = (userId?: string): any[] | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const cacheKey = userId ? `meallensai_history_cache_${userId}` : 'meallensai_history_cache';
    const timestampKey = userId ? `meallensai_history_cache_timestamp_${userId}` : 'meallensai_history_cache_timestamp';
    const cached = window.localStorage.getItem(cacheKey);
    const timestamp = window.localStorage.getItem(timestampKey);
    if (!cached || !timestamp) return null;
    const cacheAge = Date.now() - parseInt(timestamp, 10);
    if (cacheAge > 5 * 60 * 1000) return null;
    return JSON.parse(cached);
  } catch (error) {
    return null;
  }
};

/**
 * Normalize resources from API/DB.
 * Meal instructions work because they fetch live from /resources; History uses stored DB data.
 * DB may return resources as string (JSON) or object (e.g. Supabase JSONB). We handle both.
 */
const normalizeResources = (raw: any): { YoutubeSearch: any[]; GoogleSearch: any[] } | null => {
  if (raw == null) return null;
  if (typeof raw === 'object' && !Array.isArray(raw) && raw !== null) {
    const yt = raw.YoutubeSearch ?? raw.youtube ?? raw.YouTube ?? [];
    const goog = raw.GoogleSearch ?? raw.google ?? raw.Google ?? [];
    return { YoutubeSearch: Array.isArray(yt) ? yt : [], GoogleSearch: Array.isArray(goog) ? goog : [] };
  }
  if (typeof raw !== 'string' || !raw.trim() || raw.trim() === '{}') return null;
  try {
    const parsed = JSON.parse(raw);
    return normalizeResources(parsed);
  } catch {
    return null;
  }
};

const HistoryDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userData = safeGetItem('user_data');
  const userId = userData ? JSON.parse(userData)?.uid : undefined;
  const cachedHistory = getCachedHistory(userId);
  const cachedItem = cachedHistory?.find((item: any) => item.id === id);
  
  const [historyDetail, setHistoryDetail] = useState<HistoryDetail | null>(cachedItem ? {
    ...cachedItem,
    youtube_link: cachedItem.youtube_link || cachedItem.youtube || undefined,
    google_link: cachedItem.google_link || cachedItem.google || undefined,
    resources_link: cachedItem.resources_link || cachedItem.resources || undefined
  } : null)
  const [resources, setResources] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'recipe' | 'videos' | 'articles'>('recipe')
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated, loading: authLoading, user } = useAuth()
  const { api } = useAPI()

  // Parse resources from cached item (handles both string and object from API/DB)
  useEffect(() => {
    if (!cachedItem || !historyDetail) return;
    const raw = historyDetail.resources_link ?? historyDetail.resources;
    const parsed = normalizeResources(raw);
    if (parsed) setResources(parsed);
  }, [cachedItem, historyDetail])

  useEffect(() => {
    const fetchHistoryDetail = async () => {
      if (!id) {
        setError("No history ID provided")
        return
      }

      if (cachedItem) {
        fetchHistoryDetailBackground().catch(console.error);
        return;
      }

      setIsLoading(true)
      try {
        const result = await api.getDetectionHistory()
        if (result.status === 'success') {
          let historyData = []
          const resultAny = result as any
          if (resultAny.detection_history) {
            historyData = resultAny.detection_history
          } else if (resultAny.data?.detection_history) {
            historyData = resultAny.data.detection_history
          } else if (Array.isArray(resultAny.data)) {
            historyData = resultAny.data
          } else if (resultAny.data) {
            historyData = [resultAny.data]
          }

          const raw = historyData.find((item: any) => item.id === id)
          if (raw) {
            const detail: HistoryDetail = {
              ...raw,
              youtube_link: raw.youtube_link || raw.youtube || undefined,
              google_link: raw.google_link || raw.google || undefined,
              resources_link: raw.resources_link || raw.resources || undefined
            }
            setHistoryDetail(detail)
            const parsed = normalizeResources(raw.resources_link ?? raw.resources)
            if (parsed) setResources(parsed)
          } else {
            setError("History entry not found")
          }
        }
      } catch (err) {
        console.error("Error fetching history detail:", err)
        if (!cachedItem) {
          setError("Failed to load history detail. Please try again later.")
        }
      } finally {
        setIsLoading(false)
      }
    }

    const fetchHistoryDetailBackground = async () => {
      try {
        const result = await api.getDetectionHistory()
        if (result.status === 'success') {
          let historyData = []
          const resultAny = result as any
          if (resultAny.detection_history) {
            historyData = resultAny.detection_history
          } else if (resultAny.data?.detection_history) {
            historyData = resultAny.data.detection_history
          } else if (Array.isArray(resultAny.data)) {
            historyData = resultAny.data
          } else if (resultAny.data) {
            historyData = [resultAny.data]
          }

          const raw = historyData.find((item: any) => item.id === id)
          if (raw) {
            const detail: HistoryDetail = {
              ...raw,
              youtube_link: raw.youtube_link || raw.youtube || undefined,
              google_link: raw.google_link || raw.google || undefined,
              resources_link: raw.resources_link || raw.resources || undefined
            }
            setHistoryDetail(detail)
            const parsed = normalizeResources(raw.resources_link ?? raw.resources)
            if (parsed) setResources(parsed)
          }
        }
      } catch (err) {
        console.error("Background update failed:", err)
      }
    }

    if (!authLoading && isAuthenticated) {
      fetchHistoryDetail().catch(console.error)
    }
  }, [id, isAuthenticated, authLoading, api, cachedItem])

  const getYouTubeVideoId = (url: string) => {
    if (!url) return null
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[2] && match[2].length === 11) ? match[2] : null
  }

  const formatInstructions = (raw: string) => {
    if (!raw) return ''
    let html = raw
    html = html.replace(/\*\*(.*?)\*\*/g, '<br><strong>$1</strong><br>')
    html = html.replace(/\*\s*(.*?)\s*\*/g, '<p>$1</p>')
    html = html.replace(/(\d+\.)/g, '<br>$1')
    html = html.replace(/\n/g, '<br>')
    return html
  }

  const extractDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return 'website';
    }
  };

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    if (target.src !== 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop') {
      target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop';
    }
  }, []);

  if (!isAuthenticated && !authLoading) {
    navigate('/login')
    return null
  }

  if (isLoading && !historyDetail) {
    return (
      <div className="fixed top-0 right-0 bottom-0 left-0 md:left-[250px] bg-white z-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    )
  }

  if (error || !historyDetail) {
    return (
      <div className="fixed top-0 right-0 bottom-0 left-0 md:left-[250px] bg-white z-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">History Entry Not Found</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">{error || "The requested history entry could not be found."}</p>
          <button
            onClick={() => navigate('/history')}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-[#1A76E3] text-white rounded-[12px] sm:rounded-[15px] font-semibold hover:bg-blue-600 transition-colors text-sm sm:text-base"
          >
            Back to History
          </button>
        </div>
      </div>
    )
  }

  const mealName = useMemo(() => {
    if (historyDetail.suggestion) return historyDetail.suggestion
    try {
      if (historyDetail.detected_foods) {
        const foods = JSON.parse(historyDetail.detected_foods)
        if (Array.isArray(foods) && foods.length > 0) {
          return foods[0]
        }
      }
    } catch {}
    return "Health Meal"
  }, [historyDetail.suggestion, historyDetail.detected_foods])

  // Memoize YouTube videos to prevent re-renders and flickering
  const youtubeVideos = useMemo(() => {
    if (!resources?.YoutubeSearch) return []
    
    // Flatten the array in case it's nested and filter out invalid entries
    const flatVideos = (resources.YoutubeSearch as any[]).flat().filter((item: any) => item && (item.link || item.url || item.videoId))
    
    return flatVideos.map((item: any, idx: number) => {
      // Try to get video ID from multiple sources
      const videoId = item.videoId || getYouTubeVideoId(item.link || item.url || '')
      
      // Always generate YouTube thumbnail from video ID for reliability
      // This ensures we always get a working thumbnail
      const thumbnail = videoId 
        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        : 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop'
      
      return {
        id: `video-${idx}-${videoId || item.link || idx}`,
        title: item.title || 'Untitled Video',
        thumbnail: thumbnail,
        url: item.link || item.url || '',
        videoId: videoId,
        channel: item.channel || '',
      }
    })
  }, [resources?.YoutubeSearch])

  // Memoize web resources to prevent re-renders and flickering
  const webResources = useMemo(() => {
    if (!resources?.GoogleSearch) return []
    
    // Flatten the array in case it's nested and filter out invalid entries
    const flatResources = (resources.GoogleSearch as any[]).flat().filter((item: any) => item && (item.link || item.url || item.title))
    
    return flatResources.map((item: any, idx: number) => {
      // Ensure we have a valid image URL - check multiple possible fields
      let imageUrl = item.image || item.thumbnail || item.pagemap?.cse_image?.[0]?.src || ''
      if (!imageUrl || imageUrl.trim() === '') {
        imageUrl = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop'
      }
      return {
        id: `article-${idx}-${item.link || item.url || idx}`,
        title: item.title || 'Untitled Article',
        description: item.description || item.snippet || '',
        url: item.link || item.url || '#',
        image: imageUrl,
      }
    })
  }, [resources?.GoogleSearch])

  // Stable image error handler to prevent flickering
  const handleVideoImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>, videoId: string | null) => {
    const target = e.target as HTMLImageElement;
    const currentSrc = target.src;
    
    // Prevent infinite error loops
    if (target.dataset.errorHandled === 'true') {
      return;
    }
    
    // Fallback chain for YouTube thumbnails
    if (videoId && currentSrc.includes('youtube.com')) {
      if (currentSrc.includes('maxresdefault')) {
        target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        return;
      } else if (currentSrc.includes('hqdefault')) {
        target.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        return;
      } else if (currentSrc.includes('mqdefault')) {
        target.src = `https://img.youtube.com/vi/${videoId}/sddefault.jpg`;
        return;
      }
    }
    
    // Final fallback - mark as handled to prevent loops
    target.dataset.errorHandled = 'true';
    target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop';
  }, [])

  // Stable image load handler
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.style.opacity = '1';
  }, [])

  return (
    <>
      {/* Content Panel - fullscreen on mobile, respects sidebar on desktop */}
      <div className="fixed top-0 right-0 bottom-0 left-0 md:left-[250px] bg-white z-50 overflow-hidden flex flex-col">
        
        {/* Top Header */}
        <header 
          className="px-4 sm:px-6 md:px-8 h-[70px] sm:h-[80px] md:h-[105px] flex items-center border-b"
          style={{ 
            backgroundColor: '#F9FBFE',
            borderColor: '#F6FAFE',
            boxShadow: '0px 2px 2px rgba(227, 227, 227, 0.25)'
          }}
        >
          <div className="flex items-center justify-between w-full gap-2 sm:gap-4">
            <h1 
              className="text-lg sm:text-xl md:text-2xl lg:text-[32px] font-medium tracking-[0.03em] leading-[130%] truncate" 
              style={{ fontFamily: "'Work Sans', sans-serif", color: '#2A2A2A' }}
            >
              Diet Planner
            </h1>
            
            {/* Profile Button */}
            <button className="flex items-center h-[36px] sm:h-[40px] md:h-[56px] gap-1.5 sm:gap-2 md:gap-3 px-2 sm:px-3 md:px-5 rounded-[10px] sm:rounded-[12px] md:rounded-[18px] border border-[#E7E7E7] bg-white hover:bg-gray-50 transition-colors flex-shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 font-semibold text-[10px] sm:text-xs md:text-sm border border-blue-100">
                {(user?.displayName || user?.email?.split('@')[0] || 'U').substring(0, 2).toUpperCase()}
              </div>
              <span className="text-xs sm:text-sm md:text-[16px] font-medium text-gray-600 hidden lg:block">
                {user?.displayName || user?.email?.split('@')[0] || 'User'}
              </span>
              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-gray-400" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-white px-4 sm:px-6 md:px-8 py-4 sm:py-6">
          
          {/* Back button and Recipe Name Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-gray-400 hover:bg-gray-50 rounded-full transition-colors border border-gray-200 bg-white text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium text-xs sm:text-[14px]">Back</span>
            </button>
            <h2 
              className="text-lg sm:text-xl md:text-[22px] font-semibold truncate" 
              style={{ fontFamily: "'Work Sans', sans-serif", color: '#2A2A2A' }}
            >
              {mealName}
            </h2>
          </div>

          {/* Gray Divider */}
          <div className="border-b border-gray-200 mb-6" />

          {/* Section Title */}
          <h3 
            className="text-base sm:text-lg md:text-[20px] font-medium tracking-[0.03em] leading-[130%] mb-3 sm:mb-4 text-left" 
            style={{ fontFamily: "'Work Sans', sans-serif", color: '#595959' }}
          >
            Cooking instructions
          </h3>

          {/* Tabs Container */}
          <div className="flex justify-start mb-6 sm:mb-8">
            <div className="inline-flex items-center bg-[#F8F9FA] border border-[#E7E7E7] rounded-[12px] sm:rounded-[15px] p-0.5 sm:p-1 w-full sm:w-auto overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab('recipe')}
                className={`px-3 sm:px-6 py-2 sm:py-2.5 rounded-[8px] sm:rounded-[10px] text-xs sm:text-[14px] font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'recipe'
                    ? 'bg-white text-[#1A76E3] border border-[#1A76E3]'
                    : 'text-gray-400 hover:text-gray-600 border border-transparent'
                }`}
              >
                Recipe
              </button>
              <button
                onClick={() => setActiveTab('videos')}
                className={`px-3 sm:px-6 py-2 sm:py-2.5 rounded-[8px] sm:rounded-[10px] text-xs sm:text-[14px] font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'videos'
                    ? 'bg-white text-[#1A76E3] border border-[#1A76E3]'
                    : 'text-gray-400 hover:text-gray-600 border border-transparent'
                }`}
              >
                Video Tutorials
              </button>
              <button
                onClick={() => setActiveTab('articles')}
                className={`px-3 sm:px-6 py-2 sm:py-2.5 rounded-[8px] sm:rounded-[10px] text-xs sm:text-[14px] font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'articles'
                    ? 'bg-white text-[#1A76E3] border border-[#1A76E3]'
                    : 'text-gray-400 hover:text-gray-600 border border-transparent'
                }`}
              >
                Recommended Articles
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'recipe' && historyDetail.instructions && (
            <div>
              {/* Health Tip */}
              <div className="flex items-start gap-2 mb-4 sm:mb-5">
                <span className="text-sm sm:text-base flex-shrink-0">💡</span>
                <p 
                  className="text-sm sm:text-[15px] leading-[140%]"
                  style={{ fontFamily: "'Work Sans', sans-serif", color: '#34C759' }}
                >
                  Health Tip: Provides fiber and Phytonutrients to support digestion and immunity
                </p>
              </div>

              {/* Recipe Content */}
              <div 
                className="text-left prose prose-sm sm:prose-base max-w-none"
                style={{ 
                  fontFamily: "'Work Sans', sans-serif",
                  fontSize: '14px',
                  lineHeight: '170%',
                  color: '#414141'
                }}
                dangerouslySetInnerHTML={{ __html: formatInstructions(historyDetail.instructions) }}
              />
            </div>
          )}

          {activeTab === 'videos' && (
            <div>
              {youtubeVideos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {youtubeVideos.map((video) => (
                    <div 
                      key={video.id} 
                      className="bg-white rounded-[15px] border border-[#E7E7E7] overflow-hidden"
                    >
                      <div className="relative bg-gray-100">
                        <img 
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-[160px] object-cover"
                          loading="lazy"
                          key={`yt-${video.id}-${video.thumbnail}`}
                          onError={(e) => handleVideoImageError(e, video.videoId)}
                          onLoad={handleImageLoad}
                          style={{ opacity: 1, transition: 'opacity 0.2s ease-in' }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div 
                            className="w-11 h-11 bg-red-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-red-700 transition-colors"
                            onClick={() => video.videoId && setSelectedVideo(video.videoId)}
                          >
                            <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 
                          className="font-medium text-[14px] mb-3 line-clamp-2 leading-snug"
                          style={{ fontFamily: "'Work Sans', sans-serif", color: '#414141' }}
                        >
                          {video.title}
                        </h4>
                        <button
                          onClick={() => video.videoId && setSelectedVideo(video.videoId)}
                          className="w-full h-[44px] rounded-[12px] text-[14px] font-medium bg-white text-[#1A76E3] border border-[#1A76E3] hover:bg-[#1A76E3] hover:text-white transition-all duration-200"
                        >
                          Watch Tutorial
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : historyDetail.youtube_link ? (
                <div className="text-center py-20">
                  <a
                    href={historyDetail.youtube_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#1A76E3] font-medium hover:underline"
                  >
                    🎥 Watch Tutorial on YouTube
                  </a>
                </div>
              ) : (
                <div className="text-center py-20 text-gray-500">
                  No video tutorials available for this recipe.
                </div>
              )}
            </div>
          )}

          {activeTab === 'articles' && (
            <div>
              {webResources.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {webResources.map((resource) => (
                    <div 
                      key={resource.id} 
                      className="bg-white rounded-[15px] border border-[#E7E7E7] overflow-hidden"
                    >
                      <div className="relative bg-gray-100">
                        <img 
                          src={resource.image}
                          alt={resource.title}
                          className="w-full h-[160px] object-cover"
                          loading="lazy"
                          key={`article-${resource.id}-${resource.image}`}
                          onError={handleImageError}
                          onLoad={handleImageLoad}
                          style={{ opacity: 1, transition: 'opacity 0.2s ease-in' }}
                        />
                        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[12px] text-gray-600">
                          <Globe className="w-3 h-3" />
                          <span>{extractDomain(resource.url)}</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 
                          className="font-medium text-[14px] mb-3 line-clamp-2 leading-snug"
                          style={{ fontFamily: "'Work Sans', sans-serif", color: '#414141' }}
                        >
                          {resource.title}
                        </h4>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-full h-[44px] rounded-[12px] text-[14px] font-medium bg-white text-[#1A76E3] border border-[#1A76E3] hover:bg-[#1A76E3] hover:text-white transition-all duration-200"
                        >
                          Read Article
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : historyDetail.google_link ? (
                <div className="text-center py-20">
                  <a
                    href={historyDetail.google_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#1A76E3] font-medium hover:underline"
                  >
                    🔍 View Google Search Results
                  </a>
                </div>
              ) : (
                <div className="text-center py-20 text-gray-500">
                  No articles available for this recipe.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]"
          onClick={() => setSelectedVideo(null)}
        >
          <div 
            className="w-full max-w-4xl aspect-video"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`}
              title="Video"
              className="w-full h-full rounded-xl"
              allowFullScreen
              allow="autoplay; encrypted-media"
            />
          </div>
        </div>
      )}
    </>
  )
}

export default HistoryDetailPage
