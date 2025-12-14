import { Home, Briefcase, GraduationCap, Building2, Users, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Sidebar = () => {
  const navigate = useNavigate();

  const navItems = [
    { icon: Home, label: "Home", href: "#", active: true },
    { icon: Briefcase, label: "Features", href: "#features" },
    { icon: GraduationCap, label: "How It Works", href: "#how-it-works" },
    { icon: Building2, label: "Organizations", href: "#organizations" },
    { icon: Users, label: "About", href: "#about" },
    { icon: User, label: "Profile", href: "/profile" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-border z-40">
      <div className="p-6">
        {/* Logo */}
        <div className="mb-8">
          <a href="#" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="text-lg font-medium text-foreground">
              Meal<span className="text-primary">Lens</span>AI
            </span>
          </a>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.active;
            
            return (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  if (item.href.startsWith('/')) {
                    e.preventDefault();
                    navigate(item.href);
                  }
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-foreground/70 hover:bg-accent hover:text-foreground"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isActive
                      ? "bg-primary/10"
                      : "bg-transparent"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? "text-primary" : "text-foreground/70"
                    }`}
                  />
                </div>
                <span className={`text-sm font-normal ${isActive ? "text-primary" : ""}`}>{item.label}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
