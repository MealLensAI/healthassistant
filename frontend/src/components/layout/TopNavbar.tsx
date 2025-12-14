import { Menu, HelpCircle, MessageSquare, Grid3x3 } from "lucide-react";
import { useAuth } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const TopNavbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-border z-30 flex items-center justify-between px-6">
      {/* Left: Hamburger and Logo */}
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-accent rounded-lg transition-colors">
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg font-normal text-foreground">
            Meal<span className="text-primary">Lens</span>AI
          </span>
        </div>
      </div>

      {/* Right: Icons and Profile */}
      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-accent rounded-lg transition-colors">
          <HelpCircle className="w-5 h-5 text-foreground/70" />
        </button>
        <button className="p-2 hover:bg-accent rounded-lg transition-colors">
          <MessageSquare className="w-5 h-5 text-foreground/70" />
        </button>
        <button className="p-2 hover:bg-accent rounded-lg transition-colors">
          <Grid3x3 className="w-5 h-5 text-foreground/70" />
        </button>
        {user ? (
          <button
            onClick={() => navigate('/profile')}
            className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm hover:bg-primary/20 transition-colors"
          >
            {(user?.displayName || user?.email?.split('@')[0] || 'U').substring(0, 1).toUpperCase()}
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 text-sm font-normal text-foreground/70 hover:text-foreground transition-colors"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
};

export default TopNavbar;
