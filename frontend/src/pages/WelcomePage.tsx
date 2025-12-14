import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/utils';
import LandingNavbar from '@/components/layout/LandingNavbar';
import LandingFooter from '@/components/layout/LandingFooter';
import HeroSection from '@/components/sections/HeroSection';
import FeaturesSection from '@/components/sections/FeaturesSection';
import HowItWorksSection from '@/components/sections/HowItWorksSection';
import OrganizationsSection from '@/components/sections/OrganizationsSection';
import AboutSection from '@/components/sections/AboutSection';
import CTASection from '@/components/sections/CTASection';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // If a logged-in user hits the landing page, redirect them to the app
  useEffect(() => {
    if (user) {
      // Don't redirect immediately - let them see the landing page if they want
      // They can use the "Go to App" button in the navbar
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <OrganizationsSection />
        <AboutSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
};

export default WelcomePage;
