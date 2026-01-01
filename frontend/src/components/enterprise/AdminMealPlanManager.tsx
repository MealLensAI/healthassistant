import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit, 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  Shield,
  Check,
  X,
  Eye,
  RefreshCw,
  User,
  Clock,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface MealPlan {
  day: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  snack: string;
  breakfast_ingredients?: string[];
  lunch_ingredients?: string[];
  dinner_ingredients?: string[];
  snack_ingredients?: string[];
  breakfast_calories?: number;
  breakfast_protein?: number;
  breakfast_carbs?: number;
  breakfast_fat?: number;
  lunch_calories?: number;
  lunch_protein?: number;
  lunch_carbs?: number;
  lunch_fat?: number;
  dinner_calories?: number;
  dinner_protein?: number;
  dinner_carbs?: number;
  dinner_fat?: number;
  snack_calories?: number;
  snack_protein?: number;
  snack_carbs?: number;
  snack_fat?: number;
}

interface SavedMealPlan {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  meal_plan: MealPlan[];
  created_at: string;
  updated_at: string;
  has_sickness?: boolean;
  sickness_type?: string;
  health_assessment?: any;
  user_info?: any;
  creator_email?: string;  // Email of who created this meal plan
  is_created_by_user?: boolean;  // true if user created it, false if admin created it
}

interface UserInfo {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

interface AdminMealPlanManagerProps {
  enterpriseId: string;
  users: UserInfo[];
  onRefresh?: () => void;
}

const AdminMealPlanManager: React.FC<AdminMealPlanManagerProps> = ({ 
  enterpriseId, 
  users,
  onRefresh 
}) => {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [userMealPlans, setUserMealPlans] = useState<SavedMealPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SavedMealPlan | null>(null);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Load meal plans when a user is selected
  useEffect(() => {
    if (selectedUser) {
      loadUserMealPlans(selectedUser.user_id);
    } else {
      setUserMealPlans([]);
      setSelectedPlan(null);
    }
  }, [selectedUser, enterpriseId]);

  const loadUserMealPlans = async (userId: string) => {
    setLoading(true);
    try {
      const result: any = await api.getUserMealPlans(enterpriseId, userId);
      if (result.success) {
        setUserMealPlans(result.meal_plans || []);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load meal plans",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to load meal plans",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePlan = async (planId: string) => {
    try {
      const result: any = await api.approveMealPlan(enterpriseId, planId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Meal plan approved successfully"
        });
        if (selectedUser) {
          loadUserMealPlans(selectedUser.user_id);
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to approve meal plan",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to approve meal plan",
        variant: "destructive"
      });
    }
  };

  const handleRejectPlan = async (planId: string) => {
    const reason = window.prompt("Enter rejection reason (optional):");
    try {
      const result: any = await api.rejectMealPlan(enterpriseId, planId, reason || undefined);
      if (result.success) {
        toast({
          title: "Meal Plan Rejected",
          description: "The meal plan has been rejected"
        });
        if (selectedUser) {
          loadUserMealPlans(selectedUser.user_id);
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to reject meal plan",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to reject meal plan",
        variant: "destructive"
      });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm("Are you sure you want to delete this meal plan?")) {
      return;
    }
    
    try {
      const result: any = await api.deleteUserMealPlan(enterpriseId, planId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Meal plan deleted successfully"
        });
        if (selectedUser) {
          loadUserMealPlans(selectedUser.user_id);
        }
        if (selectedPlan?.id === planId) {
          setSelectedPlan(null);
          setShowPlanDetails(false);
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete meal plan",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to delete meal plan",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderSicknessIndicator = (plan: SavedMealPlan) => {
    if (plan.has_sickness) {
      return (
        <div className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
          <Heart className="w-3 h-3" />
          <span>{plan.sickness_type || 'Health Plan'}</span>
        </div>
      );
    }
  };

  const renderCreatorIndicator = (plan: SavedMealPlan) => {
    // Check if we have creator information
    const isCreatedByUser = plan.is_created_by_user !== undefined ? plan.is_created_by_user : true;
    const creatorEmail = plan.creator_email;
    
    if (isCreatedByUser) {
      return (
        <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium border border-blue-200">
          <User className="w-3 h-3" />
          <span>{creatorEmail ? `Created by ${creatorEmail}` : 'Created by User'}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-full text-xs font-medium border border-purple-200">
          <User className="w-3 h-3" />
          <span>{creatorEmail ? `Created by ${creatorEmail}` : 'Created by Admin'}</span>
        </div>
      );
    }
  };
    return (
      <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
        <Shield className="w-3 h-3" />
        <span>Regular Plan</span>
      </div>
    );
  };

  const getUserName = (user: UserInfo) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email;
  };

  return (
    <div className="space-y-6">
      {/* User Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Select User
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No users in this organization yet</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => (
                <button
                  key={user.user_id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedUser?.user_id === user.user_id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-medium text-slate-900">{getUserName(user)}</div>
                  <div className="text-sm text-slate-500">{user.email}</div>
                  {user.role && (
                    <Badge variant="outline" className="mt-2 text-xs capitalize">
                      {user.role}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meal Plans for Selected User */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Meal Plans for {getUserName(selectedUser)}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadUserMealPlans(selectedUser.user_id)}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : userMealPlans.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">No meal plans found for this user</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userMealPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedPlan?.id === plan.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900">{plan.name}</h4>
                          {renderSicknessIndicator(plan)}
                          {renderCreatorIndicator(plan)}
                          <Badge className="bg-green-100 text-green-700 border-green-300">Active</Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                          {formatDateRange(plan.start_date, plan.end_date)}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>Updated {formatDateTime(plan.updated_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* View Details Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setShowPlanDetails(true);
                            setExpandedDay(null);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>

                        {/* Delete Button - deletes the plan so user won't see it */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePlan(plan.id)}
                          className="border-red-500 text-red-600 hover:bg-red-50"
                          title="Delete this plan (user will no longer see it)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan Details Modal/Panel */}
      {showPlanDetails && selectedPlan && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {selectedPlan.name}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPlanDetails(false);
                  setSelectedPlan(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Plan Info */}
              <div className="flex flex-wrap gap-3 mb-4">
                {renderSicknessIndicator(selectedPlan)}
                <Badge className="bg-green-100 text-green-700 border-green-300">Active</Badge>
                <span className="text-sm text-slate-600">
                  {formatDateRange(selectedPlan.start_date, selectedPlan.end_date)}
                </span>
              </div>

              {/* Weekly Meals */}
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900">Weekly Meals</h4>
                {selectedPlan.meal_plan && selectedPlan.meal_plan.length > 0 ? (
                  <div className="space-y-2">
                    {selectedPlan.meal_plan.map((dayPlan, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedDay(expandedDay === dayPlan.day ? null : dayPlan.day)}
                          className={`w-full flex items-center justify-between p-3 ${
                            expandedDay === dayPlan.day 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'bg-slate-50 hover:bg-slate-100'
                          }`}
                        >
                          <span className="font-medium">{dayPlan.day}</span>
                          <ChevronDown 
                            className={`w-4 h-4 transition-transform ${
                              expandedDay === dayPlan.day ? 'rotate-180' : ''
                            }`} 
                          />
                        </button>
                        
                        {expandedDay === dayPlan.day && (
                          <div className="p-4 space-y-3 bg-white">
                            {/* Breakfast */}
                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">🥞</span>
                                <span className="font-medium text-slate-800">Breakfast</span>
                              </div>
                              <p className="text-slate-700">{dayPlan.breakfast}</p>
                              {dayPlan.breakfast_calories && (
                                <div className="flex gap-4 mt-2 text-xs text-slate-600">
                                  <span>🔥 {dayPlan.breakfast_calories} cal</span>
                                  <span>🍗 {dayPlan.breakfast_protein}g protein</span>
                                  <span>🌾 {dayPlan.breakfast_carbs}g carbs</span>
                                  <span>💧 {dayPlan.breakfast_fat}g fat</span>
                                </div>
                              )}
                            </div>

                            {/* Lunch */}
                            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">🍽️</span>
                                <span className="font-medium text-slate-800">Lunch</span>
                              </div>
                              <p className="text-slate-700">{dayPlan.lunch}</p>
                              {dayPlan.lunch_calories && (
                                <div className="flex gap-4 mt-2 text-xs text-slate-600">
                                  <span>🔥 {dayPlan.lunch_calories} cal</span>
                                  <span>🍗 {dayPlan.lunch_protein}g protein</span>
                                  <span>🌾 {dayPlan.lunch_carbs}g carbs</span>
                                  <span>💧 {dayPlan.lunch_fat}g fat</span>
                                </div>
                              )}
                            </div>

                            {/* Dinner */}
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">🍛</span>
                                <span className="font-medium text-slate-800">Dinner</span>
                              </div>
                              <p className="text-slate-700">{dayPlan.dinner}</p>
                              {dayPlan.dinner_calories && (
                                <div className="flex gap-4 mt-2 text-xs text-slate-600">
                                  <span>🔥 {dayPlan.dinner_calories} cal</span>
                                  <span>🍗 {dayPlan.dinner_protein}g protein</span>
                                  <span>🌾 {dayPlan.dinner_carbs}g carbs</span>
                                  <span>💧 {dayPlan.dinner_fat}g fat</span>
                                </div>
                              )}
                            </div>

                            {/* Snack */}
                            {dayPlan.snack && (
                              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">🍪</span>
                                  <span className="font-medium text-slate-800">Snack</span>
                                </div>
                                <p className="text-slate-700">{dayPlan.snack}</p>
                                {dayPlan.snack_calories && (
                                  <div className="flex gap-4 mt-2 text-xs text-slate-600">
                                    <span>🔥 {dayPlan.snack_calories} cal</span>
                                    <span>🍗 {dayPlan.snack_protein}g protein</span>
                                    <span>🌾 {dayPlan.snack_carbs}g carbs</span>
                                    <span>💧 {dayPlan.snack_fat}g fat</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">No meal data available</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleDeletePlan(selectedPlan.id)}
                  className="border-red-500 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminMealPlanManager;

