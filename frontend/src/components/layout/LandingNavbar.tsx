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
    { name: "Why", href: "#why" },
    { name: "Features", href: "#features" },
    { name: "How it works", href: "#how-it-works" },
    { name: "Conditions", href: "#conditions" },
    { name: "Who it's for", href: "#who" },
    { name: "Pricing", href: "#pricing" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between">
          <a
            href="#"
            className={`font-display text-xl tracking-tight transition-colors ${
              isScrolled ? "text-primary" : "text-white"
            }`}
          >
            MealLensAI
          </a>

          <div className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isScrolled
                    ? "text-foreground/80 hover:text-primary"
                    : "text-white/85 hover:text-white"
                }`}
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {!user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className={
                    isScrolled
                      ? "text-foreground hover:text-primary"
                      : "text-white hover:text-white hover:bg-white/10"
                  }
                  onClick={() => navigate("/login")}
                >
                  Sign in
                </Button>
                <Button
                  variant="hero"
                  size="sm"
                  className={
                    isScrolled
                      ? "bg-primary hover:bg-blue-deep text-white"
                      : "bg-white text-primary hover:bg-white/90"
                  }
                  onClick={() => navigate("/signup")}
                >
                  Start free
                </Button>
              </>
            ) : (
              <Button
                variant="hero"
                size="sm"
                className={
                  isScrolled
                    ? "bg-primary hover:bg-blue-deep text-white"
                    : "bg-white text-primary hover:bg-white/90"
                }
                onClick={() => navigate("/planner")}
              >
                Go to app
              </Button>
            )}
          </div>

          <button
            className={`lg:hidden p-2 ${
              isScrolled ? "text-foreground" : "text-white"
            }`}
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

        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 py-4 border-t border-border bg-background rounded-b-2xl -mx-1 px-3">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-foreground hover:text-primary font-medium py-2 transition-colors"
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
                      className="w-full"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        navigate("/login");
                      }}
                    >
                      Sign in
                    </Button>
                    <Button
                      variant="hero"
                      className="w-full bg-primary hover:bg-blue-deep text-white"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        navigate("/signup");
                      }}
                    >
                      Start free
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="hero"
                    className="w-full bg-primary hover:bg-blue-deep text-white"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate("/planner");
                    }}
                  >
                    Go to app
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
