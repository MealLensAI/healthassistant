import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Globe, ChevronDown } from 'lucide-react';
import { useTutorialContent } from '../hooks/useTutorialContent';
import { useAuth } from '@/lib/utils';

interface CookingTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeName: string;
  ingredients?: string[];
}

const CookingTutorialModal: React.FC<CookingTutorialModalProps> = ({ 
  isOpen, 
  onClose, 
  recipeName,
  ingredients = []
}) => {
  const [activeTab, setActiveTab] = useState<'recipe' | 'videos' | 'articles'>('recipe');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const { instructions, youtubeVideos, webResources, loading, loadingResources, generateContent } = useTutorialContent();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && recipeName) {
      console.log('[CookingTutorialModal] Opening modal and generating content for:', recipeName, ingredients);
      generateContent(recipeName, ingredients);
    }
  }, [isOpen, recipeName, ingredients]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedVideo(null);
      setActiveTab('recipe');
    }
  }, [isOpen]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    const currentSrc = target.src;
    
    // Prevent infinite error loops
    if (target.dataset.errorHandled === 'true') {
      return;
    }
    
    // Check if this is a YouTube thumbnail and try fallback resolutions
    const ytMatch = currentSrc.match(/img\.youtube\.com\/vi\/([^/]+)\//);
    if (ytMatch) {
      const videoId = ytMatch[1];
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
  };

  const extractDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return 'website';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay for mobile - covers entire screen */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Content Panel - fullscreen on mobile, respects sidebar on desktop */}
      <div className="fixed top-0 right-0 bottom-0 left-0 md:left-[250px] bg-white z-50 overflow-hidden flex flex-col">
        
        {/* Top Header - Diet Planner with Profile - aligned with sidebar logo height (105px) */}
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

        {/* Main Content Area - no blue line */}
        <div className="flex-1 overflow-y-auto bg-white px-4 sm:px-6 md:px-8 py-4 sm:py-6">
          
          {/* Back button and Recipe Name Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-gray-400 hover:bg-gray-50 rounded-full transition-colors border border-gray-200 bg-white text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium text-xs sm:text-[14px]">Back</span>
            </button>
            <h2 
              className="text-lg sm:text-xl md:text-[22px] font-semibold truncate" 
              style={{ fontFamily: "'Work Sans', sans-serif", color: '#2A2A2A' }}
            >
              {recipeName}
            </h2>
          </div>

          {/* Gray Divider */}
          <div className="border-b border-gray-200 mb-6" />

          {/* Section Title - Left aligned */}
          <h3 
            className="text-base sm:text-lg md:text-[20px] font-medium tracking-[0.03em] leading-[130%] mb-3 sm:mb-4 text-left" 
            style={{ fontFamily: "'Work Sans', sans-serif", color: '#595959' }}
          >
            Cooking instructions
          </h3>

          {/* Tabs Container - Gray border around all tabs, left aligned */}
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

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Loading content...</p>
            </div>
          ) : (
            <>
              {/* Recipe Tab Content */}
              {activeTab === 'recipe' && (
                <div>
                  {instructions ? (
                    <>
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

                      {/* Recipe Content - left aligned */}
                      <div 
                        className="text-left prose prose-sm sm:prose-base max-w-none"
                        style={{ 
                          fontFamily: "'Work Sans', sans-serif",
                          fontSize: '14px',
                          lineHeight: '170%',
                          color: '#414141'
                        }}
                        dangerouslySetInnerHTML={{ __html: instructions }}
                      />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-gray-600">Loading instructions...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Videos Tab Content */}
              {activeTab === 'videos' && (
                <div>
                  {loadingResources ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-gray-600">Loading video tutorials...</p>
                    </div>
                  ) : youtubeVideos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                      {youtubeVideos.map((video, index) => (
                        <div 
                          key={index} 
                          className="bg-white rounded-[15px] border border-[#E7E7E7] overflow-hidden"
                        >
                          <div className="relative">
                            <img 
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-[160px] object-cover"
                              onError={handleImageError}
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
                  ) : (
                    <div className="text-center py-20 text-gray-500">
                      No video tutorials available for this recipe.
                    </div>
                  )}
                </div>
              )}

              {/* Articles Tab Content */}
              {activeTab === 'articles' && (
                <div>
                  {loadingResources ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-gray-600">Loading articles...</p>
                    </div>
                  ) : webResources.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                      {webResources.map((resource, index) => (
                        <div 
                          key={index} 
                          className="bg-white rounded-[15px] border border-[#E7E7E7] overflow-hidden"
                        >
                          <div className="relative">
                            <img 
                              src={resource.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop'}
                              alt={resource.title}
                              className="w-full h-[160px] object-cover"
                              onError={handleImageError}
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
                  ) : (
                    <div className="text-center py-20 text-gray-500">
                      No articles available for this recipe.
                    </div>
                  )}
                </div>
              )}
            </>
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
  );
};

export default CookingTutorialModal;
