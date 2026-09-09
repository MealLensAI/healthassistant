import React, { useEffect, useState } from 'react';
import { Heart, User, RefreshCw, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import CookingTutorialModal from '@/components/CookingTutorialModal';
import { imageCache } from '@/lib/imageCache';
import {
  fetchUserFoodForYou,
  type FoodForYouItem,
  type FoodForYouMealType,
} from '@/lib/supabaseFoodForYou';

interface UserInfo {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

interface AdminFoodForYouProps {
  users: UserInfo[];
}

const mealTypeLabel: Record<FoodForYouMealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const FoodImage: React.FC<{ name: string; className?: string }> = ({
  name,
  className = '',
}) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    imageCache
      .getImage(name)
      .then((src) => {
        if (!cancelled) setUrl(src);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (loading) {
    return (
      <div className={`bg-slate-100 animate-pulse ${className}`} />
    );
  }

  if (url) {
    return <img src={url} alt={name} className={`object-cover ${className}`} />;
  }

  return (
    <div
      className={`bg-blue-50 flex items-center justify-center text-blue-700 text-sm font-semibold px-3 text-center ${className}`}
    >
      {name}
    </div>
  );
};

const AdminFoodForYou: React.FC<AdminFoodForYouProps> = ({ users }) => {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [foods, setFoods] = useState<FoodForYouItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'box' | 'list'>('box');
  const [selectedFood, setSelectedFood] = useState<FoodForYouItem | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (selectedUser) {
      loadFoodForYou(selectedUser.user_id);
    } else {
      setFoods([]);
      setUpdatedAt(null);
      setSelectedFood(null);
    }
  }, [selectedUser]);

  const loadFoodForYou = async (userId: string) => {
    setLoading(true);
    try {
      const result = await fetchUserFoodForYou(userId);
      setFoods(result.foods);
      setUpdatedAt(result.updatedAt);
    } catch (err: any) {
      setFoods([]);
      setUpdatedAt(null);
      toast({
        title: 'Error',
        description: err?.message || 'Failed to load Food for you',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openFood = (food: FoodForYouItem) => {
    setSelectedFood(food);
    setShowTutorial(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Select User
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {users.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No users in this organization yet</p>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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

      {selectedUser && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Heart className="h-5 w-5" />
                  <span className="truncate">Food for you for {getUserName(selectedUser)}</span>
                </CardTitle>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setViewMode('box')}
                      aria-label="Box view"
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        viewMode === 'box'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      Box
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      aria-label="List view"
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        viewMode === 'list'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      List
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadFoodForYou(selectedUser.user_id)}
                    disabled={loading}
                    className="flex-1 sm:flex-none"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
              {updatedAt && (
                <p className="text-sm text-slate-500">
                  Same list the member currently sees · updated {formatDate(updatedAt)}
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              </div>
            ) : foods.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">This member has no Food for you list yet</p>
              </div>
            ) : viewMode === 'box' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {foods.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => openFood(food)}
                    className="text-left group rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="relative h-40 overflow-hidden">
                      <FoodImage
                        name={food.name}
                        className="w-full h-full group-hover:scale-[1.03] transition-transform duration-500"
                      />
                      <span className="absolute top-3 left-3 rounded-full bg-white/95 border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-800">
                        {mealTypeLabel[food.mealType]}
                      </span>
                      {food.calories !== undefined && (
                        <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/80 text-white px-2.5 py-1 text-[11px] font-semibold">
                          {food.calories} kcal
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-slate-900 text-[15px] leading-snug line-clamp-2 mb-3">
                        {food.name}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {food.protein !== undefined && (
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-800">
                            <span className="text-slate-500">Protein </span>
                            {food.protein}g
                          </span>
                        )}
                        {food.carbs !== undefined && (
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-800">
                            <span className="text-slate-500">Carbs </span>
                            {food.carbs}g
                          </span>
                        )}
                        {food.fat !== undefined && (
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-800">
                            <span className="text-slate-500">Fat </span>
                            {food.fat}g
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-blue-600 group-hover:underline">
                        Cooking instructions
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {foods.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => openFood(food)}
                    className="w-full flex gap-4 text-left rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <FoodImage
                      name={food.name}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <h3 className="font-semibold text-slate-900 text-[15px] sm:text-base leading-snug line-clamp-2">
                          {food.name}
                        </h3>
                        {food.calories !== undefined && (
                          <span className="flex-shrink-0 text-xs font-semibold text-slate-500">
                            {food.calories} kcal
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mb-2">
                        {mealTypeLabel[food.mealType]}
                        {food.day ? ` · ${food.day}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {food.protein !== undefined && (
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-800">
                            Protein {food.protein}g
                          </span>
                        )}
                        {food.carbs !== undefined && (
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-800">
                            Carbs {food.carbs}g
                          </span>
                        )}
                        {food.fat !== undefined && (
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-800">
                            Fat {food.fat}g
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-blue-600">
                        Tap for cooking instructions
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <CookingTutorialModal
        isOpen={showTutorial}
        onClose={() => {
          setShowTutorial(false);
          setSelectedFood(null);
        }}
        recipeName={selectedFood?.name || ''}
        ingredients={selectedFood?.ingredients || []}
      />
    </div>
  );
};

export default AdminFoodForYou;
