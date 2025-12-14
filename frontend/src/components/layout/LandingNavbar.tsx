import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/utils";

const LandingNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Organizations", href: "#organizations" },
    { name: "About", href: "#about" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background border-b border-border py-4"
          : "bg-background py-6"
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="text-xl font-normal text-foreground">
            Meal<span className="text-primary">Lens</span>AI
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-foreground hover:text-primary text-sm font-normal transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            {!user ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-foreground hover:text-primary text-sm font-normal"
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </Button>
                <Button 
                  variant="hero" 
                  size="sm"
                  className="bg-primary hover:bg-blue-deep text-white"
                  onClick={() => navigate('/signup')}
                >
                  Get Started
                </Button>
              </>
            ) : (
              <Button 
                variant="hero" 
                size="sm"
                className="bg-primary hover:bg-blue-deep text-white"
                onClick={() => navigate('/planner')}
              >
                Go to App
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-foreground hover:text-primary font-normal py-2 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                {!user ? (
                  <>
                    <Button 
                      variant="outline" 
                      className="w-full border-border text-foreground hover:bg-accent"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        navigate('/login');
                      }}
                    >
                      Sign In
                    </Button>
                    <Button 
                      variant="hero" 
                      className="w-full bg-primary hover:bg-orange-deep text-white rounded-full"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        navigate('/signup');
                      }}
                    >
                      Get Started
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="hero" 
                    className="w-full bg-primary hover:bg-orange-deep text-white rounded-full"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate('/planner');
                    }}
                  >
                    Go to App
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default LandingNavbar;
