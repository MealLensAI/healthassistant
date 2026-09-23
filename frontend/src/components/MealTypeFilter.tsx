
import React from 'react';
import { Coffee, Utensils, Moon, Cookie } from 'lucide-react';

interface MealTypeFilterProps {
  selectedType: string;
  onTypeSelect: (type: string) => void;
}

const mealTypes = [
  { id: 'all', label: 'All Recipes', icon: Utensils },
  { id: 'breakfast', label: 'Breakfast', icon: Coffee },
  { id: 'lunch', label: 'Lunch', icon: Utensils },
  { id: 'dinner', label: 'Dinner', icon: Moon },
  { id: 'snack', label: 'Dessert', icon: Cookie }
];

const MealTypeFilter: React.FC<MealTypeFilterProps> = ({ selectedType, onTypeSelect }) => {
  return (
    <div className="border-b border-[#e2e8f0] mb-6">
      {/* Scrollable row on mobile, normal layout on desktop */}
      <div className="flex gap-4 sm:gap-6 overflow-x-auto sm:overflow-x-visible whitespace-nowrap sm:whitespace-normal py-1">
        {mealTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => onTypeSelect(type.id)}
              className={`shrink-0 flex items-center gap-2 pb-2 sm:pb-3 px-1 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
                selectedType === type.id
                  ? 'text-primary border-primary'
                  : 'text-[#1e293b] border-transparent hover:text-primary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {type.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MealTypeFilter;
