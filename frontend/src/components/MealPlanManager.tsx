import React, { useState } from 'react';
import { Calendar, Plus, Trash2, Copy, Edit, ChevronLeft, ChevronRight, MoreVertical, Heart, Shield } from 'lucide-react';
import { SavedMealPlan, useMealPlans } from '../hooks/useMealPlans';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from './LoadingSpinner';

interface MealPlanManagerProps {
  onNewPlan: () => void;
  onEditPlan: (plan: SavedMealPlan) => void;
  onSelectPlan?: (plan: SavedMealPlan) => void;
  filterBySickness?: boolean; // Add filter parameter
}

const MealPlanManager: React.FC<MealPlanManagerProps> = ({ onNewPlan, onEditPlan, onSelectPlan, filterBySickness }) => {
  const { savedPlans, currentPlan, selectMealPlan, deleteMealPlan, duplicateMealPlan, generateWeekDates, loading } = useMealPlans(filterBySickness);
  const { toast } = useToast();

  // Debug logging for filtering
  console.log('[MealPlanManager] Filtering by sickness:', {
    filterBySickness,
    totalPlans: savedPlans.length,
    planTypes: savedPlans.map(p => ({ id: p.id, name: p.name, hasSickness: p.hasSickness, sicknessType: p.sicknessType }))
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const handleDeletePlan = async (plan: SavedMealPlan) => {
    if (confirm(`Are you sure you want to delete "${plan.name}"?`)) {
      try {
        await deleteMealPlan(plan.id); // <-- await here!
        toast({
          title: "Plan Deleted",
          description: `"${plan.name}" has been deleted successfully.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete meal plan. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDuplicatePlan = (plan: SavedMealPlan) => {
    try {
      const weekDates = generateWeekDates(selectedDate);
      duplicateMealPlan(plan.id, selectedDate);
      toast({
        title: "Plan Duplicated",
        description: `"${plan.name}" has been duplicated for ${weekDates.name}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate meal plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getCurrentWeekDates = () => {
    const weekDates = generateWeekDates(selectedDate);
    return formatDateRange(weekDates.startDate, weekDates.endDate);
  };

  const renderSicknessIndicator = (plan: SavedMealPlan) => {
    // Debug logging
    console.log('[MealPlanManager] Rendering sickness indicator for plan:', {
      id: plan.id,
      name: plan.name,
      hasSickness: plan.hasSickness,
      sicknessType: plan.sicknessType,
      planData: plan
    });

    if (plan.hasSickness) {
      return (
        <div className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
          <Heart className="w-3 h-3" />
          <span>{plan.sicknessType || 'Health Plan'}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
          <Shield className="w-3 h-3" />
          <span>Regular Plan</span>
        </div>
      );
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-[#e2e8f0]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-[#2D3436]">Meal Plans</h2>
        <button
          onClick={onNewPlan}
          className="flex items-center gap-2 bg-[#FF6B6B] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-[#FF8E53] transition-colors text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          New Plan
        </button>
      </div>

      {/* Week Selector */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3">
          <h3 className="text-base sm:text-lg font-semibold text-[#2D3436]">Week of {getCurrentWeekDates()}</h3>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 text-[#FF6B6B] hover:text-[#FF8E53] transition-colors text-sm sm:text-base"
          >
            <Calendar className="w-4 h-4" />
            Change Week
          </button>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousWeek}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#2D3436]" />
          </button>

          <div className="text-center">
            <div className="text-sm text-[#1e293b]">
              {selectedDate.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
              })}
            </div>
          </div>

          <button
            onClick={handleNextWeek}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[#2D3436]" />
          </button>
        </div>

        {showDatePicker && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:border-[#FF6B6B] focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Saved Plans */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-[#2D3436] mb-3 sm:mb-4">Saved Plans</h3>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-500">
            <LoadingSpinner />
            <p className="mt-3">Loading your meal plans...</p>
          </div>
        ) : savedPlans.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No saved meal plans yet</p>
            <p className="text-sm">Create your first plan to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedPlans.map((plan) => (
              <div
                key={plan.id}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-all cursor-pointer ${currentPlan?.id === plan.id
                  ? 'border-[#FF6B6B] bg-[#FF6B6B]/5'
                  : 'border-gray-200 hover:border-[#FF6B6B]/50 hover:bg-gray-50'
                  }`}
                onClick={() => {
                  selectMealPlan(plan.id);
                  if (onSelectPlan) onSelectPlan(plan);
                }}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm sm:text-base text-[#2D3436] truncate">{plan.name}</h4>
                      {renderSicknessIndicator(plan)}
                    </div>
                    <p className="text-xs sm:text-sm text-[#1e293b]">
                      {formatDateRange(plan.startDate, plan.endDate)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500">
                      Updated {new Date(plan.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditPlan(plan);
                      }}
                      className="p-2 text-gray-600 hover:text-[#FF6B6B] transition-colors"
                      title="Edit Plan"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicatePlan(plan);
                      }}
                      className="p-2 text-gray-600 hover:text-[#FF6B6B] transition-colors"
                      title="Duplicate Plan"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlan(plan);
                      }}
                      className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MealPlanManager; 