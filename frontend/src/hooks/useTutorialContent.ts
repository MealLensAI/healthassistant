import { useState } from 'react';
import { useSicknessSettings } from './useSicknessSettings';
import { APP_CONFIG } from '@/lib/config';

interface VideoResource {
  title: string;
  thumbnail: string;
  url: string;
  videoId?: string;
  channel?: string;
}

interface WebResource {
  title: string;
  description: string;
  url: string;
  image?: string;
}

export const useTutorialContent = () => {
  const { getSicknessInfo } = useSicknessSettings();
  const [instructions, setInstructions] = useState('');
  const [youtubeVideos, setYoutubeVideos] = useState<VideoResource[]>([]);
  const [webResources, setWebResources] = useState<WebResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);

  // Helper to extract YouTube video ID from a URL
  const getYouTubeVideoId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2] && match[2].length === 11) ? match[2] : null;
  };

  const generateContent = async (recipeName: string, ingredients?: string[]) => {
    setLoading(true);
    setInstructions('');
    setYoutubeVideos([]);
    setWebResources([]);

    try {
      const sicknessInfo = getSicknessInfo();

      // 1. Get cooking instructions first
      const requestBody = {
        food_name: recipeName,
        ingredients: ingredients || []
      };

      // Add sickness information if user has sickness
      if (sicknessInfo) {
        requestBody.sickness = sicknessInfo.sicknessType;
      }

      // Use different endpoint based on sickness status
      const endpoint = sicknessInfo ? `${APP_CONFIG.api.ai_api_url}/sick_meal_plan_instructions` : `${APP_CONFIG.api.ai_api_url}/meal_plan_instructions`;

      const instrRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!instrRes.ok) {
        throw new Error(`HTTP error! status: ${instrRes.status}`);
      }

      const instrData = await instrRes.json();

      // The API returns markdown, so convert to HTML (same as the HTML code)
      let htmlInstructions = instrData.instructions || '';
      htmlInstructions = htmlInstructions
        .replace(/\*\*(.*?)\*\*/g, '<br><strong>$1</strong><br>')
        .replace(/\*\s*(.*?)\s*\*/g, '<p>$1</p>')
        .replace(/(\d+\.)/g, '<br>$1');
      setInstructions(htmlInstructions);

      // Instructions are loaded, now start loading resources
      setLoading(false);
      setLoadingResources(true);

      // 2. Get resources (YouTube and Google) using the correct form data
      const formData = new FormData();
      formData.append('food_choice_index', recipeName);
      const resRes = await fetch(`${APP_CONFIG.api.ai_api_url}/resources`, {
        method: 'POST',
        body: formData,
      });

      if (!resRes.ok) {
        throw new Error(`HTTP error! status: ${resRes.status}`);
      }

      const resData = await resRes.json();

      // Check if response contains GNU make
      const responseString = JSON.stringify(resData);
      if (responseString.toLowerCase().includes('gnu make')) {
        console.error('🚨 CRITICAL: API response contains GNU make content!');
        console.error('Full response:', resData);
      }

      // Flatten and parse YouTube resources (same as HTML code)
      const ytResults = (resData.YoutubeSearch || []).flat().map((item: any) => ({
        title: item.title,
        thumbnail: item.thumbnail || (getYouTubeVideoId(item.link) ? `https://img.youtube.com/vi/${getYouTubeVideoId(item.link)}/maxresdefault.jpg` : ''),
        url: item.link,
        videoId: getYouTubeVideoId(item.link),
        channel: item.channel || '',
      }));
      setYoutubeVideos(ytResults);

      // Flatten and parse Google resources (same as HTML code)
      const googleResults = (resData.GoogleSearch || []).flat().map((item: any) => ({
        title: item.title,
        description: item.description,
        url: item.link,
        image: item.image || '',
      }));

      // Check processed results for GNU make
      const processedString = JSON.stringify(googleResults);
      if (processedString.toLowerCase().includes('gnu make')) {
        console.error('🚨 CRITICAL: Processed Google results contain GNU make content!');
        console.error('Processed results:', googleResults);

        // TEMPORARY FIX: Filter out GNU make content and show error message
        const filteredResults = googleResults.filter(item =>
          !item.title.toLowerCase().includes('gnu make') &&
          !item.description.toLowerCase().includes('gnu make')
        );

        if (filteredResults.length === 0) {
          console.warn('⚠️ All Google results filtered out due to GNU make content. API needs to be fixed.');
          // Show a fallback message instead of GNU make content
          setWebResources([{
            title: '⚠️ Google Search Temporarily Unavailable',
            description: 'The search API is currently returning incorrect results. Please try again later or contact support.',
            url: '#',
            image: ''
          }]);
        } else {
          setWebResources(filteredResults);
        }
      } else {
        setWebResources(googleResults);
      }

    } catch (error) {
      console.error('[useTutorialContent] Error generating content:', error);
      setInstructions('Failed to load instructions. Please try again.');
      setYoutubeVideos([]);
      setWebResources([]);
    } finally {
      setLoading(false);
      setLoadingResources(false);
    }
  };

  return {
    instructions,
    youtubeVideos,
    webResources,
    loading,
    loadingResources,
    generateContent
  };
};
