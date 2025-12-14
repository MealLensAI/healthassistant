"use client"

import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { LogOut, Utensils, User, Settings, ChevronDown, Building2 } from "lucide-react"
import Logo from "@/components/Logo"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/utils"
import { useEnterpriseRole } from "@/hooks/useEnterpriseRole"

const Navbar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const { user, signOut, isAuthenticated } = useAuth()
  const { hasEnterprises, isOrganizationOwner, canCreateOrganizations, isLoading: enterpriseLoading } = useEnterpriseRole()

  const isActive = (path: string) => location.pathname === path

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      })
      navigate("/login")
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Get user data for display
  const userEmail = user?.email || "user@example.com"
  const userDisplayName = user?.displayName || userEmail.split('@')[0] || "User"
  const userInitials = userDisplayName ? userDisplayName.charAt(0).toUpperCase() : "U"

  // Don't render navbar if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return (
    <nav className="bg-white shadow-md border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo and App Name */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Logo size="sm" />
            <div>
              <p className="text-xs text-gray-500 hidden sm:block">AI Health Nutrition</p>
              <p className="text-xs text-gray-500 hidden sm:block">Better Health From Your Food.</p>
            </div>
          </div>

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex items-center space-x-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/planner")}
              className={`transition-colors ${isActive("/planner")
                ? "text-blue-500 bg-blue-50 border border-blue-200 font-semibold"
                : "text-gray-700 hover:text-blue-500 hover:bg-blue-50"
                }`}
            >
              Health Meal Planner
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/health-meals")}
              className={`transition-colors ${isActive("/health-meals")
                ? "text-blue-500 bg-blue-50 border border-blue-200 font-semibold"
                : "text-gray-700 hover:text-blue-500 hover:bg-blue-50"
                }`}
            >
              Generate Health Meals
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/history")}
              className={`transition-colors ${isActive("/history")
                ? "text-blue-500 bg-blue-50 border border-blue-200 font-semibold"
                : "text-gray-700 hover:text-blue-500 hover:bg-blue-50"
                }`}
            >
              History
            </Button>
          </div>

          {/* User Actions with Dropdown */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 sm:h-12 w-auto rounded-full flex items-center space-x-1 sm:space-x-3 px-2 sm:px-3 hover:bg-gray-100 border border-gray-200"
                >
                  <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full text-white font-bold text-sm sm:text-lg shadow-md">
                    {userInitials}
                  </div>
                  <span className="hidden md:block text-xs sm:text-sm font-medium text-gray-700 max-w-[100px] truncate">{userDisplayName}</span>
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userDisplayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Health Information</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/payment")}>
                  <span className="mr-2">💳</span>
                  <span>Payment</span>
                </DropdownMenuItem>
                {/* STRICT: Only show enterprise features to organization owners or users who can create organizations */}
                {!enterpriseLoading && (canCreateOrganizations || hasEnterprises) && (
                  <DropdownMenuItem onClick={() => navigate("/enterprise")}>
                    <Building2 className="mr-2 h-4 w-4" />
                    <span>
                      {hasEnterprises ? 'My Organizations' : 'Enterprise Dashboard'}
                      {hasEnterprises && <span className="ml-1 text-xs text-blue-600">●</span>}
                    </span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-100 py-2">
          <div className="grid grid-cols-3 gap-1">

            <Button
              variant="ghost"
              onClick={() => navigate("/planner")}
              className={`flex flex-col items-center justify-center h-14 text-[10px] sm:text-xs space-y-0.5 sm:space-y-1 transition-colors px-1 ${isActive("/planner")
                ? "text-blue-500 bg-blue-50 border border-blue-200 font-semibold"
                : "text-gray-700 hover:text-blue-500 hover:bg-blue-50"
                }`}
            >
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="leading-tight">Planner</span>
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate("/health-meals")}
              className={`flex flex-col items-center justify-center h-14 text-[10px] sm:text-xs space-y-0.5 sm:space-y-1 transition-colors px-1 ${isActive("/health-meals")
                ? "text-blue-500 bg-blue-50 border border-blue-200 font-semibold"
                : "text-gray-700 hover:text-blue-500 hover:bg-blue-50"
                }`}
            >
              <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="leading-tight">Meals</span>
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate("/history")}
              className={`flex flex-col items-center justify-center h-14 text-[10px] sm:text-xs space-y-0.5 sm:space-y-1 transition-colors px-1 ${isActive("/history")
                ? "text-blue-500 bg-blue-50 border border-blue-200 font-semibold"
                : "text-gray-700 hover:text-blue-500 hover:bg-blue-50"
                }`}
            >
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="leading-tight">History</span>
            </Button>

          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
