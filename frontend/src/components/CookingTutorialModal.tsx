import React, { useEffect, useState } from 'react'
import { ArrowLeft, Globe, Play } from 'lucide-react'
import { useTutorialContent } from '../hooks/useTutorialContent'

interface CookingTutorialModalProps {
  isOpen: boolean
  onClose: () => void
  recipeName: string
  ingredients?: string[]
  /** When true, render in-page under AppTopBar. When false (default), cover the main column only. */
  embedded?: boolean
}

const CookingTutorialModal: React.FC<CookingTutorialModalProps> = ({
  isOpen,
  onClose,
  recipeName,
  ingredients = [],
  embedded = false,
}) => {
  const [activeTab, setActiveTab] = useState<'recipe' | 'videos' | 'articles'>('recipe')
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  const { instructions, youtubeVideos, webResources, loading, loadingResources, generateContent } =
    useTutorialContent()

  useEffect(() => {
    if (isOpen && recipeName) {
      generateContent(recipeName, ingredients)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, recipeName])

  useEffect(() => {
    if (!isOpen) {
      setSelectedVideo(null)
      setActiveTab('recipe')
    }
  }, [isOpen])

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

  if (!isOpen) return null

  const tabs: Array<{ id: typeof activeTab; label: string }> = [
    { id: 'recipe', label: 'Recipe' },
    { id: 'videos', label: 'Video Tutorials' },
    { id: 'articles', label: 'Recommended Articles' },
  ]

  const body = (
    <div className="flex min-h-full flex-col">
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading content…</p>
        </div>
      ) : (
        <>
          {activeTab === 'recipe' && (
            <div>
              {instructions ? (
                <>
                  <div className="mb-5 rounded-2xl border border-leaf/20 bg-leaf-soft px-4 py-3 sm:px-5">
                    <p className="text-sm leading-relaxed text-leaf-deep">
                      Health tip: fiber and phytonutrients in this dish help support digestion and
                      immunity.
                    </p>
                  </div>
                  <div
                    className="prose prose-sm sm:prose-base max-w-none text-left text-foreground prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90"
                    dangerouslySetInnerHTML={{ __html: instructions }}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Loading instructions…</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'videos' && (
            <div>
              {loadingResources ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Loading video tutorials…</p>
                </div>
              ) : youtubeVideos.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                  {youtubeVideos.map((video, index) => (
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
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No video tutorials available for this recipe.
                </p>
              )}
            </div>
          )}

          {activeTab === 'articles' && (
            <div>
              {loadingResources ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Loading articles…</p>
                </div>
              ) : webResources.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                  {webResources.map((resource, index) => (
                    <div
                      key={index}
                      className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
                    >
                      <div className="relative">
                        <img
                          src={
                            resource.image ||
                            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop'
                          }
                          alt={resource.title}
                          className="h-40 w-full object-cover"
                          onError={handleImageError}
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
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No articles available for this recipe.
                </p>
              )}
            </div>
          )}
        </>
      )}

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

  if (embedded) {
    return <div className="min-h-full bg-background px-4 py-6 sm:px-6 sm:py-8 md:px-8">{body}</div>
  }

  // Overlay for pages that still mount the modal beside other content
  return (
    <div className="fixed inset-0 z-50 flex bg-background md:left-[240px]">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 md:px-8">
        {body}
      </div>
    </div>
  )
}

export default CookingTutorialModal
