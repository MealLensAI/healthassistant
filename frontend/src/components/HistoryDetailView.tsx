import React, { useState } from 'react'
import { ArrowLeft, Globe, Play } from 'lucide-react'

interface HistoryDetailViewProps {
  recipeName: string
  ingredients?: string[]
  instructions: string
  resources?: string
  onClose: () => void
}

const HistoryDetailView: React.FC<HistoryDetailViewProps> = ({
  recipeName,
  instructions,
  resources,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'recipe' | 'videos' | 'articles'>('recipe')
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)

  const parsedResources = React.useMemo(() => {
    if (!resources) return { YoutubeSearch: [], GoogleSearch: [] }

    try {
      const parsed = typeof resources === 'string' ? JSON.parse(resources) : resources
      return {
        YoutubeSearch: parsed.YoutubeSearch || parsed.youtube || parsed.YouTube || [],
        GoogleSearch: parsed.GoogleSearch || parsed.google || parsed.Google || [],
      }
    } catch {
      return { YoutubeSearch: [], GoogleSearch: [] }
    }
  }, [resources])

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement
    target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop'
  }

  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return 'website'
    }
  }

  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  const youtubeVideos = React.useMemo(() => {
    if (!parsedResources.YoutubeSearch?.length) return []

    return parsedResources.YoutubeSearch.flat()
      .map((video: any) => {
        const videoData = Array.isArray(video) ? video[0] : video
        const videoId =
          videoData?.videoId ||
          videoData?.id ||
          (videoData?.link ? getYouTubeVideoId(videoData.link) : null)
        const thumbnail =
          videoData?.thumbnail ||
          (videoId
            ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            : 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop')
        const title = videoData?.title || videoData?.snippet?.title || 'Video Tutorial'

        return {
          videoId,
          thumbnail,
          title,
          link: videoData?.link || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : ''),
        }
      })
      .filter((v: any) => v.videoId)
  }, [parsedResources.YoutubeSearch])

  const webResources = React.useMemo(() => {
    if (!parsedResources.GoogleSearch?.length) return []

    return parsedResources.GoogleSearch.flat()
      .map((resource: any) => {
        const resourceData = Array.isArray(resource) ? resource[0] : resource
        return {
          title: resourceData?.title || resourceData?.snippet?.title || 'Article',
          url: resourceData?.link || resourceData?.url || '#',
          image:
            resourceData?.image ||
            resourceData?.thumbnails?.default?.url ||
            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop',
        }
      })
      .filter((r: any) => r.url && r.url !== '#')
  }, [parsedResources.GoogleSearch])

  const tabs: Array<{ id: typeof activeTab; label: string }> = [
    { id: 'recipe', label: 'Recipe' },
    { id: 'videos', label: 'Video Tutorials' },
    { id: 'articles', label: 'Recommended Articles' },
  ]

  return (
    <div className="min-h-full bg-background px-4 py-6 sm:px-6 sm:py-8 md:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="button"
          onClick={onClose}
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
            {recipeName}
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

      {activeTab === 'recipe' ? (
        <div>
          <div className="mb-5 rounded-2xl border border-leaf/20 bg-leaf-soft px-4 py-3 sm:px-5">
            <p className="text-sm leading-relaxed text-leaf-deep">
              Health tip: fiber and phytonutrients in this dish help support digestion and immunity.
            </p>
          </div>
          <div
            className="prose prose-sm sm:prose-base max-w-none text-left text-foreground prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90"
            dangerouslySetInnerHTML={{ __html: instructions }}
          />
        </div>
      ) : null}

      {activeTab === 'videos' ? (
        <div>
          {youtubeVideos.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {youtubeVideos.map((video: any, index: number) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
                >
                  <div className="relative">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="h-40 w-full object-cover"
                      onError={handleImageError}
                    />
                    <button
                      type="button"
                      className="absolute inset-0 grid place-items-center bg-black/20"
                      onClick={() => video.videoId && setSelectedVideo(video.videoId)}
                    >
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-red-600 shadow-lg">
                        <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
                      </span>
                    </button>
                  </div>
                  <div className="p-4">
                    <h4 className="mb-3 line-clamp-2 text-sm font-semibold text-foreground">
                      {video.title}
                    </h4>
                    <button
                      type="button"
                      onClick={() => video.videoId && setSelectedVideo(video.videoId)}
                      className="flex h-11 w-full items-center justify-center rounded-full border border-primary text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      Watch Tutorial
                    </button>
                  </div>
                </div>
              ))}
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
              {webResources.map((resource: any, index: number) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
                >
                  <div className="relative">
                    <img
                      src={resource.image}
                      alt={resource.title}
                      className="h-40 w-full object-cover"
                      onError={handleImageError}
                    />
                    <div className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      <span>{extractDomain(resource.url)}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="mb-3 line-clamp-2 text-sm font-semibold text-foreground">
                      {resource.title}
                    </h4>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-11 w-full items-center justify-center rounded-full border border-primary text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      Read Article
                    </a>
                  </div>
                </div>
              ))}
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

export default HistoryDetailView
