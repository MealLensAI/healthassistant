import React, { useState, useEffect, useRef } from 'react';
import { Camera, List, Upload, Utensils, ChefHat, Plus, Calendar, ChevronLeft, ChevronRight, ChevronDown, User, Check, X, Trash2, Eye, RefreshCw, Clock, Heart, Shield, ArrowLeft } from 'lucide-react';
import RecipeCard from '@/components/RecipeCard';
import EnhancedRecipeCard from '@/components/EnhancedRecipeCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import CookingTutorialModal from '@/components/CookingTutorialModal';
import MealPlanSkeleton from '@/components/MealPlanSkeleton';
import { useToast } from '@/hooks/use-toast';
import { APP_CONFIG } from '@/lib/config';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Swal from 'sweetalert2';

// Countries list for the dropdown
const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia',
  'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador',
  'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau',
  'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
  'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru',
  'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe',
  'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
  'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

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
  breakfast_name?: string;
  breakfast_calories?: number;
  breakfast_protein?: number;
  breakfast_carbs?: number;
  breakfast_fat?: number;
  breakfast_benefit?: string;
  lunch_name?: string;
  lunch_calories?: number;
  lunch_protein?: number;
  lunch_carbs?: number;
  lunch_fat?: number;
  lunch_benefit?: string;
  dinner_name?: string;
  dinner_calories?: number;
  dinner_protein?: number;
  dinner_carbs?: number;
  dinner_fat?: number;
  dinner_benefit?: string;
  snack_name?: string;
  snack_calories?: number;
  snack_protein?: number;
  snack_carbs?: number;
  snack_fat?: number;
  snack_benefit?: string;
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
  is_approved?: boolean;  // false = needs approval, true = approved and visible to user
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

interface AdminDietPlannerProps {
  enterpriseId: string;
  users: UserInfo[];
  onRefresh?: () => void;
}

// Map new goal values to backend API format
const mapGoalToBackendFormat = (goal: string | undefined): string => {
  if (!goal) return 'heal';
  const normalizedGoal = goal.trim();
  const goalMap: Record<string, string> = {
    'Heal': 'heal', 'Improve': 'heal', 'Manage': 'heal', 'Restore': 'heal', 'Maintain': 'maintain',
    'heal': 'heal', 'improve': 'heal', 'manage': 'heal', 'restore': 'heal', 'maintain': 'maintain',
    'Heal Health Condition': 'heal', 'Improve Health Condition': 'heal', 'Manage Health Condition': 'heal',
    'Restore Health Condition': 'heal', 'Maintain Health Condition': 'maintain', 'Heal & Manage Condition': 'heal',
    'Maintain Health': 'maintain', 'lose_weight': 'lose_weight', 'gain_weight': 'gain_weight', 'improve_fitness': 'improve_fitness'
  };
  if (goalMap[normalizedGoal]) return goalMap[normalizedGoal];
  const lowerGoal = normalizedGoal.toLowerCase();
  for (const [key, value] of Object.entries(goalMap)) {
    if (key.toLowerCase() === lowerGoal) return value;
    }
  return lowerGoal.includes('maintain') ? 'maintain' : 'heal';
};

const AdminDietPlanner: React.FC<AdminDietPlannerProps> = ({ enterpriseId, users, onRefresh }) => {
  const { toast } = useToast();
  
  // User selection state
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [userMealPlans, setUserMealPlans] = useState<SavedMealPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  
  // Current plan viewing state
  const [currentPlan, setCurrentPlan] = useState<SavedMealPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  
  // Create plan modal state
  const [showInputModal, setShowInputModal] = useState(false);
  const [inputType, setInputType] = useState<'image' | 'ingredient_list' | 'auto_medical'>('ingredient_list');
  const [ingredientList, setIngredientList] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [isAutoGenerateEnabled, setIsAutoGenerateEnabled] = useState(false);

  // Health profile state for selected user
  const [userHealthProfile, setUserHealthProfile] = useState<any>(null);
  
  // Tutorial modal state
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);

  // Load user's meal plans when user is selected
  useEffect(() => {
    if (selectedUser) {
      loadUserMealPlans(selectedUser.user_id);
      loadUserHealthProfile(selectedUser.user_id);
    } else {
      setUserMealPlans([]);
      setCurrentPlan(null);
      setUserHealthProfile(null);
    }
  }, [selectedUser, enterpriseId]);

  const loadUserMealPlans = async (userId: string) => {
    setLoadingPlans(true);
    try {
      const result: any = await api.getUserMealPlans(enterpriseId, userId);
      if (result.success) {
        setUserMealPlans(result.meal_plans || []);
        // Auto-select the first plan if available
        if (result.meal_plans && result.meal_plans.length > 0) {
          setCurrentPlan(result.meal_plans[0]);
        }
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
      setLoadingPlans(false);
    }
  };

  const loadUserHealthProfile = async (userId: string) => {
    try {
      // Use the health history endpoint to get the most recent health profile
      // This contains all historical settings data ordered by created_at desc
      const result: any = await api.getUserHealthHistory(enterpriseId, userId);
      console.log('[AdminDietPlanner] User health history result:', result);
      
      if (result.success && result.health_history && result.health_history.length > 0) {
        // Get the most recent health history record (first in the array since it's ordered by created_at desc)
        const mostRecentRecord = result.health_history[0];
        
        // The health data is stored in the settings_data field
        const settingsData = mostRecentRecord.settings_data || mostRecentRecord;
        console.log('[AdminDietPlanner] Most recent settings_data:', settingsData);
        
        // Handle both camelCase and snake_case field names
        const hasSickness = settingsData.hasSickness || settingsData.has_sickness || false;
        const sicknessType = settingsData.sicknessType || settingsData.sickness_type || '';
        const activityLevel = settingsData.activityLevel || settingsData.activity_level || '';
        
        const healthProfile = {
          has_sickness: hasSickness,
          sickness_type: sicknessType,
          age: settingsData.age,
          weight: settingsData.weight,
          height: settingsData.height,
          waist: settingsData.waist,
          gender: settingsData.gender,
          activity_level: activityLevel,
          goal: settingsData.goal,
          location: settingsData.location
        };
        
        console.log('[AdminDietPlanner] Parsed health profile from history:', healthProfile);
        
        // Set the health profile if user has sickness OR has basic health data
        if (hasSickness || settingsData.age || settingsData.weight || settingsData.height) {
          setUserHealthProfile(healthProfile);
        } else {
          setUserHealthProfile(null);
        }
      } else {
        console.log('[AdminDietPlanner] No health history found for user');
        setUserHealthProfile(null);
      }
    } catch (err) {
      console.error('[AdminDietPlanner] Error loading health profile from history:', err);
      setUserHealthProfile(null);
    }
  };

  const getUserName = (user: UserInfo) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const generateWeekDates = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const formatDateStr = (d: Date) => {
      const day = d.getDate();
      const suffix = day === 1 || day === 21 || day === 31 ? 'st' : 
                    day === 2 || day === 22 ? 'nd' : 
                    day === 3 || day === 23 ? 'rd' : 'th';
      return d.toLocaleDateString('en-US', { month: 'short' }) + ' ' + day + suffix;
    };
    
    return {
      startDate: monday.toISOString().split('T')[0],
      endDate: sunday.toISOString().split('T')[0],
      name: `${formatDateStr(monday)} - ${formatDateStr(sunday)}`
    };
  };

  const weekDates = generateWeekDates(new Date(selectedDate));

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm("Are you sure you want to delete this meal plan? The user will no longer see it.")) {
      return;
    }
    
    try {
      const result: any = await api.deleteUserMealPlan(enterpriseId, planId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Meal plan deleted successfully. User will no longer see this plan."
        });
        if (selectedUser) {
          loadUserMealPlans(selectedUser.user_id);
        }
        if (currentPlan?.id === planId) {
          setCurrentPlan(null);
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

  const handleApprovePlan = async (planId: string) => {
    try {
      const result: any = await api.approveMealPlan(enterpriseId, planId);
      if (result.success) {
        toast({
          title: "Plan Approved! ✅",
          description: "The meal plan is now visible to the user."
        });
        
        // Update the plan in the list to show as approved
        setUserMealPlans(prev => prev.map(plan => 
          plan.id === planId ? { ...plan, is_approved: true } : plan
        ));
        
        // Update current plan if it was the one approved
        if (currentPlan?.id === planId) {
          setCurrentPlan(prev => prev ? { ...prev, is_approved: true } : null);
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
    if (!window.confirm("Are you sure you want to reject this meal plan? It will be deleted and the user will not see it.")) {
        return;
      }
    
    try {
      const result: any = await api.rejectMealPlan(enterpriseId, planId);
      if (result.success) {
        toast({
          title: "Plan Rejected",
          description: "The meal plan has been deleted."
        });
        if (selectedUser) {
          loadUserMealPlans(selectedUser.user_id);
        }
        if (currentPlan?.id === planId) {
          setCurrentPlan(null);
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedUser) {
          toast({
          title: "Error",
        description: "Please select a user first",
            variant: "destructive",
          });
          return;
        }

    // Validation
    if (!isAutoGenerateEnabled && inputType !== 'auto_medical') {
      if (inputType === 'ingredient_list' && !ingredientList.trim()) {
          toast({
          title: "Error",
          description: "Please enter ingredients list",
            variant: "destructive",
          });
          return;
        }
      if (inputType === 'image' && !selectedImage) {
        toast({
          title: "Error",
          description: "Please select an image to upload",
          variant: "destructive",
        });
        return;
      }
    }

    if (isAutoGenerateEnabled && (!location.trim() || !budget.trim())) {
          toast({
            title: "Information Required",
            description: "Please provide both location and budget for auto-generation",
            variant: "destructive",
          });
          return;
    }

    setIsLoading(true);

    try {
      let mealPlanData: MealPlan[] = [];
      let healthAssessment = null;
      let userInfoData = null;

      // Use health profile if available
      const healthProfile = userHealthProfile;
      const hasSickness = healthProfile?.has_sickness || healthProfile?.hasSickness || false;
      const sicknessType = healthProfile?.sickness_type || healthProfile?.sicknessType || '';

      if (isAutoGenerateEnabled) {
        // Auto generate based on location and budget
      const formData = new FormData();
        formData.append('location', location);
        formData.append('budget', budget);

        if (hasSickness && healthProfile) {
          // Use sick_smart_plan for users with health conditions
          formData.append('image_or_ingredient_list', 'ingredient_list');
          formData.append('ingredient_list', '');
          formData.append('age', (healthProfile.age || 30).toString());
          formData.append('weight', (healthProfile.weight || 70).toString());
          formData.append('height', (healthProfile.height || 170).toString());
          formData.append('waist', (healthProfile.waist || 80).toString());
          formData.append('gender', healthProfile.gender || 'male');
          formData.append('activity_level', healthProfile.activity_level || 'moderate');
          formData.append('condition', sicknessType || 'general');
          formData.append('goal', mapGoalToBackendFormat(healthProfile.goal));
          formData.append('budget_state', 'true');

          const response = await fetch(`${APP_CONFIG.api.ai_api_url}/sick_smart_plan`, {
          method: 'POST',
            body: formData,
        });

          if (!response.ok) throw new Error('Failed to generate therapeutic meal plan');

        const data = await response.json();
        if (data.success && data.meal_plan) {
            mealPlanData = data.meal_plan.map((dayPlan: any) => ({
            day: dayPlan.day,
            breakfast: dayPlan.breakfast_name,
            lunch: dayPlan.lunch_name,
            dinner: dayPlan.dinner_name,
            snack: dayPlan.snack_name,
            breakfast_ingredients: dayPlan.breakfast_ingredients,
            lunch_ingredients: dayPlan.lunch_ingredients,
            dinner_ingredients: dayPlan.dinner_ingredients,
            snack_ingredients: dayPlan.snack_ingredients,
            breakfast_name: dayPlan.breakfast_name,
            breakfast_calories: dayPlan.breakfast_calories,
            breakfast_protein: dayPlan.breakfast_protein,
            breakfast_carbs: dayPlan.breakfast_carbs,
            breakfast_fat: dayPlan.breakfast_fat,
            breakfast_benefit: dayPlan.breakfast_benefit,
            lunch_name: dayPlan.lunch_name,
            lunch_calories: dayPlan.lunch_calories,
            lunch_protein: dayPlan.lunch_protein,
            lunch_carbs: dayPlan.lunch_carbs,
            lunch_fat: dayPlan.lunch_fat,
            lunch_benefit: dayPlan.lunch_benefit,
            dinner_name: dayPlan.dinner_name,
            dinner_calories: dayPlan.dinner_calories,
            dinner_protein: dayPlan.dinner_protein,
            dinner_carbs: dayPlan.dinner_carbs,
            dinner_fat: dayPlan.dinner_fat,
            dinner_benefit: dayPlan.dinner_benefit,
            snack_name: dayPlan.snack_name,
            snack_calories: dayPlan.snack_calories,
            snack_protein: dayPlan.snack_protein,
            snack_carbs: dayPlan.snack_carbs,
            snack_fat: dayPlan.snack_fat,
            snack_benefit: dayPlan.snack_benefit,
          }));
            healthAssessment = data.health_assessment;
            userInfoData = data.user_info;
          }
        } else {
          // Use auto_generate_plan for healthy users
          const response = await fetch(`${APP_CONFIG.api.ai_api_url}/auto_generate_plan`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) throw new Error('Failed to generate meal plan');

          const data = await response.json();
          mealPlanData = data.meal_plan;
        }
      } else if (inputType === 'auto_medical') {
        // Medical AI - uses ai_nutrition_plan endpoint
        if (!hasSickness || !healthProfile) {
          throw new Error('User does not have a health condition configured');
        }

        const healthPayload = {
          age: healthProfile.age || 30,
          weight: healthProfile.weight || 70,
          height: healthProfile.height || 170,
          waist: healthProfile.waist || 80,
          gender: healthProfile.gender || 'male',
          activity_level: healthProfile.activity_level || 'moderate',
          condition: sicknessType || 'general',
          goal: mapGoalToBackendFormat(healthProfile.goal),
          location: healthProfile.location || 'USA'
        };

        const response = await fetch(`${APP_CONFIG.api.ai_api_url}/ai_nutrition_plan`, {
            method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(healthPayload),
          });

        if (!response.ok) throw new Error('Failed to generate medical nutrition plan');

          const data = await response.json();
          if (data.success && data.meal_plan) {
          mealPlanData = data.meal_plan.map((dayPlan: any) => ({
              day: dayPlan.day,
              breakfast: dayPlan.breakfast_name,
              lunch: dayPlan.lunch_name,
              dinner: dayPlan.dinner_name,
              snack: dayPlan.snack_name,
              breakfast_ingredients: dayPlan.breakfast_ingredients,
              lunch_ingredients: dayPlan.lunch_ingredients,
              dinner_ingredients: dayPlan.dinner_ingredients,
              snack_ingredients: dayPlan.snack_ingredients,
              breakfast_name: dayPlan.breakfast_name,
              breakfast_calories: dayPlan.breakfast_calories,
              breakfast_protein: dayPlan.breakfast_protein,
              breakfast_carbs: dayPlan.breakfast_carbs,
              breakfast_fat: dayPlan.breakfast_fat,
              breakfast_benefit: dayPlan.breakfast_benefit,
              lunch_name: dayPlan.lunch_name,
              lunch_calories: dayPlan.lunch_calories,
              lunch_protein: dayPlan.lunch_protein,
              lunch_carbs: dayPlan.lunch_carbs,
              lunch_fat: dayPlan.lunch_fat,
              lunch_benefit: dayPlan.lunch_benefit,
              dinner_name: dayPlan.dinner_name,
              dinner_calories: dayPlan.dinner_calories,
              dinner_protein: dayPlan.dinner_protein,
              dinner_carbs: dayPlan.dinner_carbs,
              dinner_fat: dayPlan.dinner_fat,
              dinner_benefit: dayPlan.dinner_benefit,
              snack_name: dayPlan.snack_name,
              snack_calories: dayPlan.snack_calories,
              snack_protein: dayPlan.snack_protein,
              snack_carbs: dayPlan.snack_carbs,
              snack_fat: dayPlan.snack_fat,
              snack_benefit: dayPlan.snack_benefit,
            }));
          healthAssessment = data.health_assessment;
          userInfoData = data.user_info;
          }
        } else {
        // Regular meal plan generation (ingredient_list or image)
        const formData = new FormData();
      formData.append('image_or_ingredient_list', inputType);

      if (inputType === 'ingredient_list') {
        formData.append('ingredient_list', ingredientList);
        } else if (inputType === 'image' && selectedImage) {
          formData.append('image', selectedImage);
      }

        if (hasSickness && healthProfile) {
          // Use sick_smart_plan
          formData.append('age', (healthProfile.age || 30).toString());
          formData.append('weight', (healthProfile.weight || 70).toString());
          formData.append('height', (healthProfile.height || 170).toString());
          formData.append('waist', (healthProfile.waist || 80).toString());
          formData.append('gender', healthProfile.gender || 'male');
          formData.append('activity_level', healthProfile.activity_level || 'moderate');
          formData.append('condition', sicknessType || 'general');
          formData.append('goal', mapGoalToBackendFormat(healthProfile.goal));
          formData.append('location', healthProfile.location || 'USA');
        formData.append('budget_state', 'false');
        formData.append('budget', '0');

        const response = await fetch(`${APP_CONFIG.api.ai_api_url}/sick_smart_plan`, {
          method: 'POST',
          body: formData,
        });

          if (!response.ok) throw new Error('Failed to generate therapeutic meal plan');

        const data = await response.json();
        if (data.success && data.meal_plan) {
            mealPlanData = data.meal_plan.map((dayPlan: any) => ({
            day: dayPlan.day,
            breakfast: dayPlan.breakfast_name,
            lunch: dayPlan.lunch_name,
            dinner: dayPlan.dinner_name,
            snack: dayPlan.snack_name,
            breakfast_ingredients: dayPlan.breakfast_ingredients,
            lunch_ingredients: dayPlan.lunch_ingredients,
            dinner_ingredients: dayPlan.dinner_ingredients,
            snack_ingredients: dayPlan.snack_ingredients,
            breakfast_name: dayPlan.breakfast_name,
            breakfast_calories: dayPlan.breakfast_calories,
            breakfast_protein: dayPlan.breakfast_protein,
            breakfast_carbs: dayPlan.breakfast_carbs,
            breakfast_fat: dayPlan.breakfast_fat,
            breakfast_benefit: dayPlan.breakfast_benefit,
            lunch_name: dayPlan.lunch_name,
            lunch_calories: dayPlan.lunch_calories,
            lunch_protein: dayPlan.lunch_protein,
            lunch_carbs: dayPlan.lunch_carbs,
            lunch_fat: dayPlan.lunch_fat,
            lunch_benefit: dayPlan.lunch_benefit,
            dinner_name: dayPlan.dinner_name,
            dinner_calories: dayPlan.dinner_calories,
            dinner_protein: dayPlan.dinner_protein,
            dinner_carbs: dayPlan.dinner_carbs,
            dinner_fat: dayPlan.dinner_fat,
            dinner_benefit: dayPlan.dinner_benefit,
            snack_name: dayPlan.snack_name,
            snack_calories: dayPlan.snack_calories,
            snack_protein: dayPlan.snack_protein,
            snack_carbs: dayPlan.snack_carbs,
            snack_fat: dayPlan.snack_fat,
            snack_benefit: dayPlan.snack_benefit,
          }));
            healthAssessment = data.health_assessment;
            userInfoData = data.user_info;
        }
      } else {
          // Use smart_plan for healthy users
        const response = await fetch(`${APP_CONFIG.api.ai_api_url}/smart_plan`, {
          method: 'POST',
          body: formData,
        });

          if (!response.ok) throw new Error('Failed to generate meal plan');

        const data = await response.json();
          mealPlanData = data.meal_plan;
        }
      }

      // Save the meal plan for the user via enterprise API
      const planData = {
        name: weekDates.name,
        start_date: weekDates.startDate,
        end_date: weekDates.endDate,
        meal_plan: mealPlanData,
        has_sickness: hasSickness,
        sickness_type: sicknessType,
        health_assessment: healthAssessment,
        user_info: userInfoData
      };

      const saveResult: any = await api.createUserMealPlan(enterpriseId, selectedUser.user_id, planData);
      
      if (saveResult.success) {
        setShowInputModal(false);
        setIngredientList('');
        setSelectedImage(null);
        setImagePreview(null);
        setLocation('');
        setBudget('');
        setIsAutoGenerateEnabled(false);
        setInputType('ingredient_list');

        Swal.fire({
          icon: 'success',
          title: 'Meal Plan Created!',
          text: `Meal plan for ${getUserName(selectedUser)} has been created. The user can now see this plan.`,
          confirmButtonColor: '#1A76E3',
          timer: 3000
        });

        // Refresh the meal plans list
        loadUserMealPlans(selectedUser.user_id);
        } else {
        throw new Error(saveResult.error || 'Failed to save meal plan');
        }

    } catch (error: any) {
      console.error('Error generating meal plan:', error);
      
      let errorMessage = error?.message || 'Failed to generate meal plan';
      if (errorMessage.includes('duplicate key value') && errorMessage.includes('unique_user_week')) {
        Swal.fire({
          icon: 'warning',
          title: 'Duplicate Plan',
          text: 'A meal plan for this week already exists for this user. Please choose a different week.',
          confirmButtonColor: '#1A76E3'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Generation Failed',
          text: errorMessage,
          confirmButtonColor: '#1A76E3'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecipeClick = (recipeName: string, mealType: string) => {
    if (!currentPlan) return;

    const cleanName = recipeName.replace(/\s*\(buy:[^)]*\)/, '').trim();
    const dayPlan = currentPlan.meal_plan?.find(plan => plan.day === selectedDay);
    let ingredients: string[] = [];

    if (dayPlan) {
      switch (mealType) {
        case 'breakfast': ingredients = dayPlan.breakfast_ingredients || []; break;
        case 'lunch': ingredients = dayPlan.lunch_ingredients || []; break;
        case 'dinner': ingredients = dayPlan.dinner_ingredients || []; break;
        case 'snack': ingredients = dayPlan.snack_ingredients || []; break;
      }
    }

    setSelectedRecipe(cleanName);
    setSelectedIngredients(ingredients);
    setShowTutorialModal(true);
  };

  const getRecipesForSelectedDay = () => {
    if (!currentPlan?.meal_plan) return [];
    
    const dayPlan = currentPlan.meal_plan.find(mp => mp.day === selectedDay);
    if (!dayPlan) return [];

    const extractFoodName = (mealDescription: string): string => {
      return mealDescription?.replace(/\s*\(buy:[^)]*\)/, '').trim() || '';
    };

    const hasSickness = currentPlan.has_sickness;

    const recipes = [
      {
        title: extractFoodName(dayPlan.breakfast),
        type: 'breakfast',
        time: '15 mins',
        rating: 5,
        originalTitle: dayPlan.breakfast,
        name: hasSickness ? (dayPlan.breakfast_name || extractFoodName(dayPlan.breakfast)) : undefined,
        ingredients: hasSickness ? (dayPlan.breakfast_ingredients || []) : undefined,
        calories: hasSickness ? dayPlan.breakfast_calories : undefined,
        protein: hasSickness ? dayPlan.breakfast_protein : undefined,
        carbs: hasSickness ? dayPlan.breakfast_carbs : undefined,
        fat: hasSickness ? dayPlan.breakfast_fat : undefined,
        benefit: hasSickness ? dayPlan.breakfast_benefit : undefined
      },
      {
        title: extractFoodName(dayPlan.lunch),
        type: 'lunch',
        time: '25 mins',
        rating: 4,
        originalTitle: dayPlan.lunch,
        name: hasSickness ? (dayPlan.lunch_name || extractFoodName(dayPlan.lunch)) : undefined,
        ingredients: hasSickness ? (dayPlan.lunch_ingredients || []) : undefined,
        calories: hasSickness ? dayPlan.lunch_calories : undefined,
        protein: hasSickness ? dayPlan.lunch_protein : undefined,
        carbs: hasSickness ? dayPlan.lunch_carbs : undefined,
        fat: hasSickness ? dayPlan.lunch_fat : undefined,
        benefit: hasSickness ? dayPlan.lunch_benefit : undefined
      },
      {
        title: extractFoodName(dayPlan.dinner),
        type: 'dinner',
        time: '35 mins',
        rating: 5,
        originalTitle: dayPlan.dinner,
        name: hasSickness ? (dayPlan.dinner_name || extractFoodName(dayPlan.dinner)) : undefined,
        ingredients: hasSickness ? (dayPlan.dinner_ingredients || []) : undefined,
        calories: hasSickness ? dayPlan.dinner_calories : undefined,
        protein: hasSickness ? dayPlan.dinner_protein : undefined,
        carbs: hasSickness ? dayPlan.dinner_carbs : undefined,
        fat: hasSickness ? dayPlan.dinner_fat : undefined,
        benefit: hasSickness ? dayPlan.dinner_benefit : undefined
      },
    ];

    if (dayPlan.snack) {
      recipes.push({
        title: extractFoodName(dayPlan.snack),
        type: 'snack',
        time: '5 mins',
        rating: 4,
        originalTitle: dayPlan.snack,
        name: hasSickness ? (dayPlan.snack_name || extractFoodName(dayPlan.snack)) : undefined,
        ingredients: hasSickness ? (dayPlan.snack_ingredients || []) : undefined,
        calories: hasSickness ? dayPlan.snack_calories : undefined,
        protein: hasSickness ? dayPlan.snack_protein : undefined,
        carbs: hasSickness ? dayPlan.snack_carbs : undefined,
        fat: hasSickness ? dayPlan.snack_fat : undefined,
        benefit: hasSickness ? dayPlan.snack_benefit : undefined
      });
    }

    return recipes;
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
    return (
      <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
        <Shield className="w-3 h-3" />
        <span>Regular Plan</span>
      </div>
    );
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
          <ChefHat className="w-3 h-3" />
          <span>{creatorEmail ? `Created by ${creatorEmail}` : 'Created by Admin'}</span>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* User Selection */}
      <div className="mb-6">
        <Label htmlFor="user-select" className="text-sm font-semibold text-slate-700 mb-2 block">
          Select Member to Manage Meal Plans
        </Label>
        <Select
          value={selectedUser?.user_id || ""}
          onValueChange={(userId) => {
            const user = users.find(u => u.user_id === userId);
            if (user) {
              setSelectedUser(user);
            }
          }}
        >
          <SelectTrigger id="user-select" className="w-full max-w-md">
            <SelectValue placeholder="Choose a user to manage their meal plans" />
          </SelectTrigger>
          <SelectContent>
            {users.length === 0 ? (
              <SelectItem value="no-users" disabled>No members available</SelectItem>
            ) : (
              users.map((user) => {
                const userName = getUserName(user);
                return (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {userName} ({user.email})
                  </SelectItem>
                );
              })
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Selected User's Meal Plans */}
      {selectedUser && (
              <>
          {/* Header with Create Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-xl p-4 shadow-sm border">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Meal Plans for {getUserName(selectedUser)}
              </h2>
              <p className="text-sm text-slate-500">
                {userMealPlans.length} meal plan{userMealPlans.length !== 1 ? 's' : ''} • 
                {userHealthProfile?.has_sickness ? ` Health condition: ${userHealthProfile.sickness_type}` : ' No health condition'}
              </p>
                </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => loadUserMealPlans(selectedUser.user_id)}
                disabled={loadingPlans}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingPlans ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={() => setShowInputModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Plan
              </Button>
          </div>
        </div>

          {/* Meal Plans List */}
          {loadingPlans ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : userMealPlans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 mb-4">No meal plans found for this user</p>
                <Button onClick={() => setShowInputModal(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Meal Plan
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
              {/* Plans List */}
              <div className="lg:col-span-1 space-y-3 order-2 lg:order-1">
                <h3 className="font-semibold text-slate-700 px-1">Saved Plans</h3>
                {userMealPlans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => setCurrentPlan(plan)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      currentPlan?.id === plan.id
                        ? 'border-blue-500 bg-blue-50'
                        : plan.is_approved 
                          ? 'border-green-200 hover:border-green-300 bg-green-50/50'
                          : 'border-orange-200 hover:border-orange-300 bg-orange-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">{plan.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {renderSicknessIndicator(plan)}
                          {renderCreatorIndicator(plan)}
                          {/* Status Badge */}
                          {plan.is_approved ? (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              <Check className="w-3 h-3 mr-1" />
                              Approved
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-700 text-xs">
                              <Eye className="w-3 h-3 mr-1" />
                              Pending Review
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>Updated {new Date(plan.updated_at).toLocaleDateString()}</span>
                        </div>
                        
                        {/* Quick Stats */}
                        {plan.health_assessment?.daily_calories && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                              {Math.round(plan.health_assessment.daily_calories)} kcal/day
                            </span>
                            {plan.health_assessment.bmr && (
                              <span className="text-xs bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">
                                BMR: {Math.round(plan.health_assessment.bmr)}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Approve/Reject Buttons - Only show for unapproved plans */}
                        {!plan.is_approved && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprovePlan(plan.id);
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRejectPlan(plan.id);
                              }}
                              className="text-red-600 border-red-300 hover:bg-red-50 text-xs h-7"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                      {/* Delete button - only for approved plans */}
                      {plan.is_approved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePlan(plan.id);
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
        </div>

              {/* Plan Details */}
              <div className="lg:col-span-2 order-1 lg:order-2">
                {currentPlan ? (
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <CardTitle>{currentPlan.name}</CardTitle>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {renderSicknessIndicator(currentPlan)}
                            {currentPlan.is_approved ? (
                              <Badge className="bg-green-100 text-green-700">
                                <Check className="w-3 h-3 mr-1" />
                                Approved - User can see this
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-100 text-orange-700">
                                <Eye className="w-3 h-3 mr-1" />
                                Pending Review - User cannot see this yet
                              </Badge>
                            )}
                          </div>
                        </div>
                        {/* Action Buttons for Plan Details - Only show for unapproved plans */}
                        {!currentPlan.is_approved && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              onClick={() => handleApprovePlan(currentPlan.id)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline">Approve & Send to User</span>
                              <span className="sm:hidden">Approve</span>
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleRejectPlan(currentPlan.id)}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
              </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Meal Plan Summary */}
                      <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200">
                        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                          Health Profile & Nutrition Goals
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {/* Sickness Info */}
                          {currentPlan.has_sickness && currentPlan.sickness_type && (
                            <div className="bg-white p-3 rounded-lg border border-red-100">
                              <div className="text-xs text-red-600 font-medium">Health Condition</div>
                              <div className="text-sm font-semibold text-red-700 capitalize">{currentPlan.sickness_type}</div>
                            </div>
                          )}
                          
                          {/* User Info from user_info */}
                          {currentPlan.user_info && (
                            <>
                              {currentPlan.user_info.age && (
                                <div className="bg-white p-3 rounded-lg border border-slate-100">
                                  <div className="text-xs text-slate-500 font-medium">Age</div>
                                  <div className="text-sm font-semibold text-slate-800">
                                    {currentPlan.user_info.age} years
                                  </div>
                                </div>
                              )}
                              {currentPlan.user_info.weight && (
                                <div className="bg-white p-3 rounded-lg border border-slate-100">
                                  <div className="text-xs text-slate-500 font-medium">Weight</div>
                                  <div className="text-sm font-semibold text-slate-800">
                                    {currentPlan.user_info.weight} kg
                                  </div>
                                </div>
                              )}
                              {currentPlan.user_info.height && (
                                <div className="bg-white p-3 rounded-lg border border-slate-100">
                                  <div className="text-xs text-slate-500 font-medium">Height</div>
                                  <div className="text-sm font-semibold text-slate-800">
                                    {currentPlan.user_info.height} cm
                                  </div>
                                </div>
                              )}
                              {currentPlan.user_info.gender && (
                                <div className="bg-white p-3 rounded-lg border border-slate-100">
                                  <div className="text-xs text-slate-500 font-medium">Gender</div>
                                  <div className="text-sm font-semibold text-slate-800 capitalize">
                                    {currentPlan.user_info.gender}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                          
                          {/* Health Assessment Data */}
                          {currentPlan.health_assessment && (
                            <>
                              {/* Daily Calories */}
                              {currentPlan.health_assessment.daily_calories && (
                                <div className="bg-white p-3 rounded-lg border border-green-100">
                                  <div className="text-xs text-green-600 font-medium">Daily Calories</div>
                                  <div className="text-sm font-semibold text-green-700">
                                    {Math.round(currentPlan.health_assessment.daily_calories)} kcal
                                  </div>
                                </div>
                              )}
                              
                              {/* BMR */}
                              {currentPlan.health_assessment.bmr && (
                                <div className="bg-white p-3 rounded-lg border border-yellow-100">
                                  <div className="text-xs text-yellow-600 font-medium">BMR</div>
                                  <div className="text-sm font-semibold text-yellow-700">
                                    {Math.round(currentPlan.health_assessment.bmr)} kcal
                                  </div>
                                </div>
                              )}
                              
                              {/* WHtR */}
                              {currentPlan.health_assessment.whtr && (
                                <div className="bg-white p-3 rounded-lg border border-blue-100">
                                  <div className="text-xs text-blue-600 font-medium">WHtR</div>
                                  <div className="text-sm font-semibold text-blue-700">
                                    {currentPlan.health_assessment.whtr.toFixed(2)}
                                  </div>
                                  {currentPlan.health_assessment.whtr_category && (
                                    <div className="text-xs text-blue-500 mt-1">
                                      {currentPlan.health_assessment.whtr_category}
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        
                        {/* Health Goal if available */}
                        {currentPlan.user_info?.goal && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <span className="text-xs text-slate-500">Health Goal: </span>
                            <span className="text-sm font-medium text-slate-700 capitalize">
                              {currentPlan.user_info.goal.replace('_', ' ')}
                            </span>
                          </div>
                        )}
                        
                        {/* Condition if available */}
                        {currentPlan.user_info?.condition && (
                          <div className="mt-2">
                            <span className="text-xs text-slate-500">Condition: </span>
                            <span className="text-sm font-medium text-red-600 capitalize">
                              {currentPlan.user_info.condition}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Day Tabs */}
                      <div className="mb-6 overflow-x-auto">
                        <div className="inline-flex items-center h-[44px] bg-[#F7F7F7] border border-[#E7E7E7] rounded-[10px] p-1 gap-1">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                              className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-all ${
                    selectedDay === day
                      ? 'bg-white text-gray-800 border border-[#E7E7E7]'
                      : 'text-gray-400 hover:text-gray-500'
                  }`}
                >
                              {day.substring(0, 3)}
                </button>
              ))}
          </div>
        </div>

                      {/* Recipes Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {getRecipesForSelectedDay().map((recipe, index) => {
                          if (currentPlan.has_sickness) {
                      return (
                        <EnhancedRecipeCard
                          key={`${selectedDay}-${recipe.type}-${index}`}
                          mealType={recipe.type as 'breakfast' | 'lunch' | 'dinner' | 'snack'}
                          name={recipe.name || recipe.title}
                          ingredients={recipe.ingredients || []}
                          calories={recipe.calories}
                          protein={recipe.protein}
                          carbs={recipe.carbs}
                          fat={recipe.fat}
                          benefit={recipe.benefit}
                          onClick={() => handleRecipeClick(recipe.originalTitle || recipe.title, recipe.type)}
                        />
                      );
                    }
                    return (
                      <RecipeCard
                        key={`${selectedDay}-${recipe.type}-${index}`}
                        title={recipe.title}
                        originalTitle={recipe.originalTitle}
                        time={recipe.time}
                        rating={recipe.rating}
                        mealType={recipe.type as any}
                        onClick={() => handleRecipeClick(recipe.originalTitle || recipe.title, recipe.type)}
                      />
                    );
                  })}
                </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Eye className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500">Select a meal plan to view details</p>
                    </CardContent>
                  </Card>
          )}
        </div>
      </div>
          )}
        </>
      )}

      {/* Create Plan Modal */}
      {showInputModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 md:p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#2D3436]">Create Meal Plan</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Creating for: <span className="font-medium text-slate-700">{getUserName(selectedUser)}</span>
                </p>
            </div>
              <button
                onClick={() => setShowInputModal(false)}
                className="text-[#1e293b] hover:text-blue-500 transition-colors text-3xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Week Selection */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-semibold text-[#2D3436] mb-2">
                Select Week
              </label>
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <p className="text-sm text-[#1e293b] mt-2">
                Creating plan for: {weekDates.name}
              </p>
            </div>

            {/* Auto-Generate Toggle */}
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Utensils className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-green-800">Auto Generate with Budget & Location</h3>
                    <p className="text-xs text-green-700 truncate">
                      {userHealthProfile?.has_sickness
                        ? `Health-aware plan for: ${userHealthProfile.sickness_type}`
                        : 'Generate health-aware meal plan based on location and budget'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAutoGenerateEnabled(!isAutoGenerateEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${isAutoGenerateEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAutoGenerateEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* Health Profile Indicator - Always show for enterprise admin */}
            <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-300">
                <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="text-sm font-semibold text-green-900">🏥 Medical-Grade AI Nutrition Plan</span>
              </div>
              <div className="space-y-2">
                {userHealthProfile ? (
                  <>
                    {userHealthProfile.has_sickness && userHealthProfile.sickness_type ? (
                      <p className="text-sm text-green-800">
                        User has health condition: <strong>{userHealthProfile.sickness_type}</strong>
                      </p>
                    ) : userHealthProfile.has_sickness ? (
                      <p className="text-sm text-orange-700">
                        User has health condition but <strong>condition type not specified</strong>
                      </p>
                    ) : (
                      <p className="text-sm text-green-800">
                        Creating <strong>health-aware meal plan</strong> using user's profile data
                      </p>
                    )}
                    {/* Show user's health data summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 p-2 bg-white/50 rounded-lg text-xs">
                      {userHealthProfile.age && (
                        <div><span className="text-gray-500">Age:</span> <strong>{userHealthProfile.age}</strong></div>
                      )}
                      {userHealthProfile.gender && (
                        <div><span className="text-gray-500">Gender:</span> <strong className="capitalize">{userHealthProfile.gender}</strong></div>
                      )}
                      {userHealthProfile.height && (
                        <div><span className="text-gray-500">Height:</span> <strong>{userHealthProfile.height}cm</strong></div>
                      )}
                      {userHealthProfile.weight && (
                        <div><span className="text-gray-500">Weight:</span> <strong>{userHealthProfile.weight}kg</strong></div>
                      )}
                      {userHealthProfile.waist && (
                        <div><span className="text-gray-500">Waist:</span> <strong>{userHealthProfile.waist}cm</strong></div>
                      )}
                      {userHealthProfile.activity_level && (
                        <div><span className="text-gray-500">Activity:</span> <strong className="capitalize">{userHealthProfile.activity_level.replace('_', ' ')}</strong></div>
                      )}
                      {userHealthProfile.goal && (
                        <div><span className="text-gray-500">Goal:</span> <strong className="capitalize">{userHealthProfile.goal}</strong></div>
                      )}
                      {userHealthProfile.location && (
                        <div><span className="text-gray-500">Location:</span> <strong>{userHealthProfile.location}</strong></div>
                  )}
                </div>
                    <ul className="text-xs text-green-700 space-y-1 ml-4 mt-2">
                      <li>• Full nutritional breakdown (calories, protein, carbs, fats)</li>
                      <li>• Health assessment (WHtR, BMR, daily calorie needs)</li>
                      <li>• Condition-specific health benefits for each meal</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-green-800">
                      Create a <strong>health-aware meal plan</strong> for this user with:
                    </p>
                    <ul className="text-xs text-green-700 space-y-1 ml-4">
                      <li>• Full nutritional breakdown (calories, protein, carbs, fats)</li>
                      <li>• Health assessment (WHtR, BMR, daily calorie needs)</li>
                      <li>• Condition-specific health benefits for each meal</li>
                    </ul>
                    <p className="text-xs text-orange-600 mt-2">
                      💡 <strong>Note:</strong> User's health profile not found. Medical AI will use default values.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Toggle Buttons - Always show Medical AI for enterprise admin */}
            {!isAutoGenerateEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <button
                  onClick={() => setInputType('ingredient_list')}
                  className={`p-6 rounded-xl border-2 transition-all ${inputType === 'ingredient_list'
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-[#e2e8f0] bg-white text-[#2D3436] hover:border-blue-400'}`}
                >
                  <div className="flex items-center justify-center">
                    <List className="w-6 h-6 mr-4" />
                    <div>
                      <div className="font-semibold text-lg">Type Ingredients</div>
                      <div className="text-sm opacity-90">Enter manually</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setInputType('image')}
                  className={`p-6 rounded-xl border-2 transition-all ${inputType === 'image'
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-[#e2e8f0] bg-white text-[#2D3436] hover:border-blue-400'}`}
                >
                  <div className="flex items-center justify-center">
                    <Camera className="w-6 h-6 mr-4" />
                    <div>
                      <div className="font-semibold text-lg">Upload Image</div>
                      <div className="text-sm opacity-90">Take a photo</div>
                    </div>
                  </div>
                </button>

                {/* Medical AI Button - Always show for enterprise admin */}
                  <button
                    onClick={() => setInputType('auto_medical')}
                  className={`p-4 rounded-xl border-2 transition-all sm:col-span-2 ${inputType === 'auto_medical'
                      ? 'border-green-500 bg-green-500 text-white'
                    : 'border-green-200 bg-gradient-to-br from-green-50 to-blue-50 text-green-800 hover:border-green-400'}`}
                  >
                    <div className="flex items-center justify-center">
                      <span className="text-2xl mr-3">🏥</span>
                      <div>
                        <div className="font-semibold">Medical AI</div>
                        <div className="text-sm opacity-90">
                        {userHealthProfile?.has_sickness 
                          ? `Auto-generate for ${userHealthProfile.sickness_type}` 
                          : 'Auto-generate health-aware plan'}
                        </div>
                      </div>
                    </div>
                  </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {isAutoGenerateEnabled ? (
                <div className="space-y-6">
                  <div className="p-4 border rounded-xl bg-green-50 border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                        <Utensils className="w-5 h-5 text-green-600" />
                      <h3 className="text-lg font-semibold text-green-800">
                        Health-Aware Auto Generation
                      </h3>
                    </div>
                    <p className="text-sm text-green-700">
                      {userHealthProfile?.has_sickness
                        ? `Creating a personalized meal plan based on health condition: ${userHealthProfile.sickness_type}`
                        : "Creating a health-aware meal plan based on location and budget preferences."}
                    </p>
                    <ul className="text-xs text-green-600 mt-2 space-y-1 ml-4">
                      <li>• Full nutritional breakdown for each meal</li>
                      <li>• Health assessment included</li>
                      <li>• Condition-specific benefits</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#2D3436] mb-2">Location</label>
                      <select
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full p-3 border border-green-300 rounded-lg focus:border-green-500 focus:outline-none"
                        disabled={isLoading}
                      >
                        <option value="">Select a country</option>
                        {countries.map(country => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#2D3436] mb-2">Weekly Budget</label>
                      <input
                        type="number"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        placeholder="e.g., 15000"
                        className="w-full p-3 border border-green-300 rounded-lg focus:border-green-500 focus:outline-none"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
              ) : inputType === 'auto_medical' ? (
                <div className="space-y-6">
                    <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">🏥</span>
                        <div>
                          <h3 className="text-xl font-bold text-green-900">Medical AI Nutrition Plan</h3>
                        <p className="text-sm text-green-700">Personalized meal plans with detailed nutrition for {getUserName(selectedUser)}</p>
                        </div>
                      </div>
                    
                    {/* Show user's health profile data if available */}
                    {userHealthProfile && (
                      <div className="p-3 bg-white/70 border border-green-200 rounded-lg mb-4">
                        <div className="text-xs font-semibold text-green-800 mb-2">Using Health Profile Data:</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-green-700">
                          {userHealthProfile.age && <div>Age: <strong>{userHealthProfile.age}</strong></div>}
                          {userHealthProfile.gender && <div>Gender: <strong className="capitalize">{userHealthProfile.gender}</strong></div>}
                          {userHealthProfile.height && <div>Height: <strong>{userHealthProfile.height}cm</strong></div>}
                          {userHealthProfile.weight && <div>Weight: <strong>{userHealthProfile.weight}kg</strong></div>}
                          {userHealthProfile.waist && <div>Waist: <strong>{userHealthProfile.waist}cm</strong></div>}
                          {userHealthProfile.activity_level && <div>Activity: <strong className="capitalize">{userHealthProfile.activity_level.replace('_', ' ')}</strong></div>}
                          {userHealthProfile.sickness_type && <div>Condition: <strong>{userHealthProfile.sickness_type}</strong></div>}
                          {userHealthProfile.goal && <div>Goal: <strong className="capitalize">{userHealthProfile.goal}</strong></div>}
                          {userHealthProfile.location && <div>Location: <strong>{userHealthProfile.location}</strong></div>}
                        </div>
                      </div>
                    )}
                    
                      <div className="p-4 bg-blue-100 border border-blue-300 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-blue-600">✨</span>
                          <span className="font-semibold text-blue-900">What You'll Get</span>
                        </div>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Complete 7-day meal plan with exact portions</li>
                          <li>• Detailed nutritional breakdown</li>
                          <li>• Health assessment (WHtR, BMR, daily calorie needs)</li>
                        {userHealthProfile?.sickness_type ? (
                          <li>• Condition-specific health benefits for: <strong>{userHealthProfile.sickness_type}</strong></li>
                        ) : (
                          <li>• Condition-specific health benefits based on user profile</li>
                        )}
                        </ul>
                      </div>
                    </div>
                  
                  {/* Warning only if no health profile at all */}
                  {!userHealthProfile && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800">
                        <strong>⚠️ Note:</strong> This user doesn't have a health profile configured. 
                        The Medical AI will generate a general health-aware meal plan with default values. 
                        For best results, set up the user's health profile in the Health Information section first.
                      </p>
                        </div>
                  )}
                  
                  {/* Warning if health condition is marked but no condition type specified */}
                  {userHealthProfile?.has_sickness && !userHealthProfile?.sickness_type && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>💡 Tip:</strong> User has marked "has health condition" but hasn't specified the condition type. 
                        For better meal recommendations, update the user's health profile with their specific condition.
                      </p>
                    </div>
                  )}
                </div>
              ) : inputType === 'ingredient_list' ? (
                <div>
                  <label className="block text-lg font-semibold text-[#2D3436] mb-3">List ingredients</label>
                  <textarea
                    value={ingredientList}
                    onChange={(e) => setIngredientList(e.target.value)}
                    placeholder="e.g., tomatoes, onions, beef, rice, bell peppers, garlic, olive oil..."
                    className="w-full h-32 p-4 border-2 border-[#e2e8f0] rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
                    disabled={isLoading}
                  />
                </div>
              ) : inputType === 'image' ? (
                <div>
                  <label className="block text-lg font-semibold text-[#2D3436] mb-3">Upload an image of ingredients</label>
                  <div className="border-2 border-dashed border-[#e2e8f0] rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                    {imagePreview ? (
                      <div className="space-y-4">
                        <img src={imagePreview} alt="Preview" className="max-w-full h-48 object-cover mx-auto rounded-lg" />
                        <button
                          type="button"
                          onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                          className="text-blue-500 hover:text-blue-600"
                        >
                          Choose different image
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="w-12 h-12 text-[#e2e8f0] mx-auto" />
                        <div>
                          <p className="text-[#2D3436] font-medium">Click to upload</p>
                          <p className="text-[#1e293b] text-sm">PNG, JPG, JPEG up to 10MB</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                          id="admin-file-upload"
                          disabled={isLoading}
                        />
                        <label
                          htmlFor="admin-file-upload"
                          className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
                        >
                          Select Image
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-blue-500 text-white font-bold text-lg rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    <span>Generating Plan...</span>
                  </>
                ) : (
                  <>
                    <Utensils className="w-6 h-6 mr-3" />
                    <span>Generate Meal Plan for {getUserName(selectedUser)}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Cooking Tutorial Modal */}
      <CookingTutorialModal
        isOpen={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
        recipeName={selectedRecipe || ''}
        ingredients={selectedIngredients}
      />
    </div>
  );
};

export default AdminDietPlanner;
