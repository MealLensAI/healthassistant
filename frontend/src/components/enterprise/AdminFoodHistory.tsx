import React, { useState, useEffect } from 'react';
import { 
  Utensils, 
  User, 
  RefreshCw, 
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import CookingTutorialModal from '@/components/CookingTutorialModal';

interface DetectionRecord {
  id: string;
  recipe_type: string;
  suggestion?: string;
  instructions?: string;
  ingredients?: string;
  detected_foods?: string;
  analysis_id?: string;
  youtube?: string;
  google?: string;
  resources?: string;
  created_at: string;
}

interface UserInfo {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

interface AdminFoodHistoryProps {
  enterpriseId: string;
  users: UserInfo[];
}

const AdminFoodHistory: React.FC<AdminFoodHistoryProps> = ({ 
  enterpriseId, 
  users 
}) => {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [detectionHistory, setDetectionHistory] = useState<DetectionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DetectionRecord | null>(null);
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  // Load detection history when a user is selected
  useEffect(() => {
    if (selectedUser) {
      loadDetectionHistory(selectedUser.user_id);
    } else {
      setDetectionHistory([]);
      setSelectedRecord(null);
    }
  }, [selectedUser, enterpriseId]);

  const loadDetectionHistory = async (userId: string) => {
    setLoading(true);
    try {
      const result: any = await api.getUserDetectionHistory(enterpriseId, userId);
      if (result.success) {
        setDetectionHistory(result.detection_history || []);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load detection history",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to load detection history",
        variant: "destructive"
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
      minute: '2-digit'
    });
  };

  const getRecipeTypeBadge = (type: string) => {
    switch (type) {
      case 'food_detection':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Food Detection</Badge>;
      case 'ingredient_detection':
        return <Badge className="bg-green-100 text-green-700 border-green-300">Ingredient Detection</Badge>;
      case 'health_meal':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-300">Health Meal</Badge>;
      case 'meal_plan':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-300">Meal Plan</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-300">{type}</Badge>;
    }
  };

  const getItemName = (record: DetectionRecord) => {
    if (record.suggestion) return record.suggestion;
    try {
      if (record.detected_foods) {
        const foods = JSON.parse(record.detected_foods);
        if (Array.isArray(foods) && foods.length > 0) {
          return foods[0] + (foods.length > 1 ? ` (+${foods.length - 1})` : '');
        }
      }
    } catch {}
    return "Unknown";
  };

  const parseIngredients = (ingredients?: string): string[] => {
    if (!ingredients) return [];
    try {
      const parsed = JSON.parse(ingredients);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return ingredients.split(',').map(i => i.trim()).filter(Boolean);
    }
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

      {/* Detection History for Selected User */}
      {selectedUser && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Utensils className="h-5 w-5" />
                <span className="truncate">Food Detection History for {getUserName(selectedUser)}</span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDetectionHistory(selectedUser.user_id)}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : detectionHistory.length === 0 ? (
              <div className="text-center py-12">
                <Utensils className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">No food detection history found for this user</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detectionHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {getItemName(record)}
                        </TableCell>
                        <TableCell>
                          {getRecipeTypeBadge(record.recipe_type)}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {formatDate(record.created_at)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowTutorialModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cooking Tutorial Modal - Same UI as user sees */}
      <CookingTutorialModal
        isOpen={showTutorialModal}
        onClose={() => {
          setShowTutorialModal(false);
          setSelectedRecord(null);
        }}
        recipeName={selectedRecord ? getItemName(selectedRecord) : ''}
        ingredients={selectedRecord ? parseIngredients(selectedRecord.ingredients) : []}
      />
    </div>
  );
};

export default AdminFoodHistory;

