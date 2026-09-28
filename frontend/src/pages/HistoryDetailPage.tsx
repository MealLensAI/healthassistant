"use client"

import { useEffect, useState, useMemo, useCallback, type SyntheticEvent } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Play, Globe } from "lucide-react"
import { useAuth, safeGetItem } from "@/lib/utils"
import { useAPI } from "@/lib/api"
import { usePageHeader } from "@/components/PageHeaderContext"

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

  // Parse resources from cached item
  useEffect(() => {
    if (cachedItem && historyDetail) {
      try {
        let resourcesToParse = null;
        if (historyDetail.resources_link && typeof historyDetail.resources_link === 'string' && historyDetail.resources_link.trim() !== '{}' && historyDetail.resources_link.trim() !== '') {
          resourcesToParse = historyDetail.resources_link;
        } else if (historyDetail.resources && typeof historyDetail.resources === 'string' && historyDetail.resources.trim() !== '{}' && historyDetail.resources.trim() !== '') {
          resourcesToParse = historyDetail.resources;
        }
        if (resourcesToParse) {
          const parsed = JSON.parse(resourcesToParse);
          setResources(parsed);
        }
      } catch (e) {
        console.error("[HistoryDetail] Error parsing resources from cache:", e);
      }
    }
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
            
            try {
              let resourcesToParse = null;
              if (detail.resources_link && typeof detail.resources_link === 'string' && detail.resources_link.trim() !== '{}' && detail.resources_link.trim() !== '') {
                resourcesToParse = detail.resources_link;
              } else if (detail.resources && typeof detail.resources === 'string' && detail.resources.trim() !== '{}' && detail.resources.trim() !== '') {
                resourcesToParse = detail.resources;
              }
              if (resourcesToParse) {
                setResources(JSON.parse(resourcesToParse));
              }
            } catch (e) {
              console.error("[HistoryDetail] Error parsing resources:", e);
            }
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
            
            try {
              if (detail.resources_link && typeof detail.resources_link === 'string' && detail.resources_link.trim() !== '{}' && detail.resources_link.trim() !== '') {
                setResources(JSON.parse(detail.resources_link))
              } else if (detail.resources && typeof detail.resources === 'string' && detail.resources.trim() !== '{}' && detail.resources.trim() !== '') {
                setResources(JSON.parse(detail.resources))
              }
            } catch (e) {
              // Ignore
            }
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

  const handleImageError = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    if (target.src !== 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop') {
      target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop';
    }
  }, []);

  const mealName = useMemo(() => {
    if (!historyDetail) return 'Cooking instructions'
    if (historyDetail.suggestion) return historyDetail.suggestion
    try {
      if (historyDetail.detected_foods) {
        const foods = JSON.parse(historyDetail.detected_foods)
        if (Array.isArray(foods) && foods.length > 0) {
          return foods[0]
        }
      }
    } catch {
      /* ignore */
    }
    return 'Health Meal'
  }, [historyDetail])

  const youtubeVideos = useMemo(() => {
    if (!resources?.YoutubeSearch) return []

    return (resources.YoutubeSearch as any[]).flat().map((item: any, idx: number) => {
      const videoId = getYouTubeVideoId(item.link || item.url)
      let thumbnail = ''
      if (videoId) {
        thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      } else if (item.thumbnail) {
        thumbnail = item.thumbnail
      } else {
        thumbnail = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop'
      }
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

  const webResources = useMemo(() => {
    if (!resources?.GoogleSearch) return []

    return (resources.GoogleSearch as any[]).flat().map((item: any, idx: number) => {
      let imageUrl = item.image || item.thumbnail || ''
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

  const handleVideoImageError = useCallback(
    (e: SyntheticEvent<HTMLImageElement>, videoId: string | null) => {
      const target = e.target as HTMLImageElement
      if (!target.dataset.fallbackAttempted) {
        target.dataset.fallbackAttempted = 'true'
        if (videoId) {
          target.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        } else {
          target.src =
            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop'
        }
      } else {
        target.src =
          'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop'
      }
    },
    [],
  )

  const handleImageLoad = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement
    target.style.opacity = '1'
  }, [])

  usePageHeader(mealName)

  if (!isAuthenticated && !authLoading) {
    navigate('/login')
    return null
  }

  if (isLoading && !historyDetail) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background px-4 py-16">
        <div className="flex flex-col items-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading content…</p>
        </div>
      </div>
    )
  }

  if (error || !historyDetail) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background px-4 py-16">
        <div className="max-w-md text-center">
          <h2 className="mb-3 font-display text-2xl font-bold text-foreground">
            History entry not found
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {error || 'The requested history entry could not be found.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Back to History
          </button>
        </div>
      </div>
    )
  }

  const tabs: Array<{ id: 'recipe' | 'videos' | 'articles'; label: string }> = [
    { id: 'recipe', label: 'Recipe' },
    { id: 'videos', label: 'Video Tutorials' },
    { id: 'articles', label: 'Recommended Articles' },
  ]

  return (
    <div className="min-h-full bg-background px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="button"
          onClick={() => navigate('/history')}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground shadow-soft transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Cooking instructions
          </p>
          <h2 className="mt-1 truncate font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {mealName}
          </h2>
        </div>
      </div>

      <div className="mb-6 inline-flex w-full max-w-xl items-center gap-1 overflow-x-auto rounded-full border border-border bg-secondary p-1 scrollbar-hide sm:w-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-soft'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'recipe' && historyDetail.instructions ? (
        <div>
          <div className="mb-5 rounded-2xl border border-leaf/20 bg-leaf-soft px-4 py-3 sm:px-5">
            <p className="text-sm leading-relaxed text-leaf-deep">
              Health tip: fiber and phytonutrients in this dish help support digestion and immunity.
            </p>
          </div>
          <div
            className="prose prose-sm sm:prose-base max-w-none text-left text-foreground prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90"
            dangerouslySetInnerHTML={{ __html: formatInstructions(historyDetail.instructions) }}
          />
        </div>
      ) : null}

      {activeTab === 'videos' ? (
        <div>
          {youtubeVideos.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {youtubeVideos.map((video) => (
                <div
                  key={video.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
                >
                  <div className="relative bg-secondary">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="h-40 w-full object-cover"
                      loading="lazy"
                      onError={(e) => handleVideoImageError(e, video.videoId)}
                      onLoad={handleImageLoad}
                    />
                    <button
                      type="button"
                      className="absolute inset-0 grid place-items-center bg-black/20 transition-colors hover:bg-black/30"
                      onClick={() => video.videoId && setSelectedVideo(video.videoId)}
                      aria-label={`Play ${video.title}`}
                    >
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-red-600 shadow-lg">
                        <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
                      </span>
                    </button>
                  </div>
                  <div className="p-4">
                    <h4 className="mb-3 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                      {video.title}
                    </h4>
                    <button
                      type="button"
                      onClick={() => video.videoId && setSelectedVideo(video.videoId)}
                      className="flex h-11 w-full items-center justify-center rounded-full border border-primary text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      Watch Tutorial
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : historyDetail.youtube_link ? (
            <div className="py-16 text-center">
              <a
                href={historyDetail.youtube_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Watch tutorial on YouTube
              </a>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No video tutorials available for this recipe.
            </p>
          )}
        </div>
      ) : null}

      {activeTab === 'articles' ? (
        <div>
          {webResources.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {webResources.map((resource) => (
                <div
                  key={resource.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
                >
                  <div className="relative bg-secondary">
                    <img
                      src={resource.image}
                      alt={resource.title}
                      className="h-40 w-full object-cover"
                      loading="lazy"
                      onError={handleImageError}
                      onLoad={handleImageLoad}
                    />
                    <div className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
                      <Globe className="h-3 w-3" />
                      <span>{extractDomain(resource.url)}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="mb-3 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                      {resource.title}
                    </h4>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-11 w-full items-center justify-center rounded-full border border-primary text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      Read Article
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : historyDetail.google_link ? (
            <div className="py-16 text-center">
              <a
                href={historyDetail.google_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-primary hover:underline"
              >
                View Google search results
              </a>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No articles available for this recipe.
            </p>
          )}
        </div>
      ) : null}

      {selectedVideo ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div className="aspect-video w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <iframe
              src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`}
              title="Video"
              className="h-full w-full rounded-2xl"
              allowFullScreen
              allow="autoplay; encrypted-media"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default HistoryDetailPage
