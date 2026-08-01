import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/utils';
import LandingNavbar from '@/components/layout/LandingNavbar';
import LandingFooter from '@/components/layout/LandingFooter';
import HeroSection from '@/components/sections/HeroSection';
import ProblemSection from '@/components/sections/ProblemSection';
import FeaturesSection from '@/components/sections/FeaturesSection';
import HowItWorksSection from '@/components/sections/HowItWorksSection';
import ConditionsWeSupportSection from '@/components/sections/ConditionsWeSupportSection';
import AudienceSection from '@/components/sections/AudienceSection';
import PricingSection from '@/components/sections/PricingSection';
import CTASection from '@/components/sections/CTASection';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Logged-in users can still view the landing page and use "Go to app"
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ConditionsWeSupportSection />
        <AudienceSection />
        <PricingSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
};

export default WelcomePage;
