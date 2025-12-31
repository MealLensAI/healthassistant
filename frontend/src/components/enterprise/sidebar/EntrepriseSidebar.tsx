'use client';

import { Input } from '@/components/ui/input';
import {
  Activity,
  Building2,
  Calendar,
  ChevronDown,
  History,
  LayoutDashboard,
  Search,
  Settings,
  Utensils,
  Users,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Logo from '@/components/Logo';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'meal-plans', label: 'Meal Plans', icon: Calendar },
  { id: 'food-history', label: 'Food History', icon: Utensils },
  { id: 'history', label: 'Health History', icon: History },
  { id: 'settings', label: 'Health Information', icon: Settings },
] as const;

type NavId = typeof navItems[number]['id'];

interface EnterpriseSidebarProps {
  activeItem?: NavId;
  onItemChange?: (item: NavId) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  userName?: string;
  userEmail?: string;
  onSettingsClick?: () => void;
  onSignOut?: () => void;
}

export default function EnterpriseSidebar({ 
  activeItem: controlledActiveItem, 
  onItemChange,
  searchTerm: controlledSearchTerm,
  onSearchChange,
  userName,
  userEmail,
  onSettingsClick,
  onSignOut
}: EnterpriseSidebarProps = {}) {
  const [internalActiveItem, setInternalActiveItem] = useState<NavId>('overview');
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const resolvedName = userName?.trim() || userEmail?.split("@")[0] || "Team Member";
  const initials = resolvedName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "ML";

  const activeItem = controlledActiveItem ?? internalActiveItem;
  const searchTerm = controlledSearchTerm ?? internalSearchTerm;

  const handleItemClick = (item: NavId) => {
    if (onItemChange) {
      onItemChange(item);
    } else {
      setInternalActiveItem(item);
    }
  };

  const handleSearchChange = (term: string) => {
    if (onSearchChange) {
      onSearchChange(term);
    } else {
      setInternalSearchTerm(term);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isUserMenuOpen]);

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-6 py-5">
        <Logo size="sm" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 border border-blue-500'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Menu - Bottom */}
      <div className="border-t border-slate-200 p-4" ref={menuRef}>
        
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1 text-left">
            <span className="block text-sm font-medium text-slate-900">{resolvedName}</span>
            {userEmail && <span className="text-xs text-slate-500">{userEmail}</span>}
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {isUserMenuOpen && (
          <div className="absolute bottom-20 left-4 right-4 rounded-lg border border-slate-200 bg-white shadow-lg p-2">
            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                onSettingsClick?.();
              }}
              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-md"
            >
              Settings
            </button>
            <hr className="my-1 border-slate-200" />
            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                onSignOut?.();
              }}
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-md"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}