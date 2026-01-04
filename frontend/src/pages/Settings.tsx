import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrial } from '@/hooks/useTrial';
import { Clock, History, ChevronDown as ChevronDownIcon, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useSicknessSettings } from '@/hooks/useSicknessSettings';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/lib/utils';
import Swal from 'sweetalert2';

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    settings,
    loading,
    updateSettings,
    saveSettings,
    error,
    reloadSettings,
    isHealthProfileComplete,
    hasExistingData
  } = useSicknessSettings();

  const { formattedRemainingTime, isTrialExpired, hasActiveSubscription } = useTrial();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const [localLoading, setLocalLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [lastSavedSettings, setLastSavedSettings] = useState<any>(null);
  const hasInitializedRef = useRef(false);

  // Track last saved settings when they're loaded from backend
  useEffect(() => {
    if (!loading && settings && hasExistingData) {
      // When settings are loaded from backend (after save or initial load), 
      // update lastSavedSettings to match current settings
      // This ensures we only show save button when user actually makes changes
      const settingsCopy = JSON.parse(JSON.stringify(settings));
      setLastSavedSettings(settingsCopy);
      hasInitializedRef.current = true;
    } else if (!loading && !hasExistingData) {
      // No existing data - reset lastSavedSettings so save button shows
      setLastSavedSettings(null);
      hasInitializedRef.current = true;
    }
  }, [loading, settings, hasExistingData]);

  // Check if current settings differ from last saved settings
  const hasUnsavedChanges = () => {
    if (!lastSavedSettings) {
      // No saved data exists - show save button
      return !hasExistingData;
    }
    
    // Compare current settings with last saved
    const fieldsToCompare = [
      'age', 'gender', 'height', 'weight', 'waist', 
      'activityLevel', 'goal', 'sicknessType', 'location', 'hasSickness'
    ];
    
    for (const field of fieldsToCompare) {
      if (settings[field as keyof typeof settings] !== lastSavedSettings[field as keyof typeof lastSavedSettings]) {
        return true;
      }
    }
    
    return false;
  };

  useEffect(() => {
    if (error) {
      toast({
        title: 'Unable to load health settings',
        description: error,
        variant: 'destructive'
      });
    }
  }, [error, toast]);

  // Only disable button when an explicit save is in-flight
  const isActuallyLoading = localLoading;

  const handleSicknessTypeChange = (value: string) => {
    updateSettings({ sicknessType: value });
  };

  const handleSave = async () => {
    setLocalLoading(true);

    // Validate if user chooses "yes"
    if (settings.hasSickness) {
      if (!settings.sicknessType?.trim()) {
        setLocalLoading(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Please specify the type of health condition.',
          confirmButtonColor: '#f97316'
        });
        return;
      }

      // Required fields
      const missingFields = [];
      if (!settings.age) missingFields.push('Age');
      if (!settings.gender) missingFields.push('Gender');
      if (!settings.height) missingFields.push('Height');
      if (!settings.weight) missingFields.push('Weight');
      if (!settings.waist) missingFields.push('Waist Circumference');
      if (!settings.activityLevel) missingFields.push('Activity Level');
      if (!settings.goal) missingFields.push('Health Goal');
      if (!settings.location) missingFields.push('Location');

      if (missingFields.length > 0) {
        setLocalLoading(false);
        Swal.fire({
          icon: 'warning',
          title: 'Incomplete Profile',
          text: `Please provide: ${missingFields.join(', ')}`,
          confirmButtonColor: '#f97316'
        });
        return;
      }

      // Range validations
      if (settings.age && (settings.age < 10 || settings.age > 120)) {
        setLocalLoading(false);
        Swal.fire({
          icon: 'error',
          title: 'Invalid Age',
          text: 'Enter a valid age between 10 and 120.',
          confirmButtonColor: '#f97316'
        });
        return;
      }
      if (settings.height && (settings.height < 50 || settings.height > 250)) {
        setLocalLoading(false);
        Swal.fire({
          icon: 'error',
          title: 'Invalid Height',
          text: 'Height must be between 50 and 250 cm.',
          confirmButtonColor: '#f97316'
        });
        return;
      }
      if (settings.weight && (settings.weight < 20 || settings.weight > 300)) {
        setLocalLoading(false);
        Swal.fire({
          icon: 'error',
          title: 'Invalid Weight',
          text: 'Weight must be between 20 and 300 kg.',
          confirmButtonColor: '#f97316'
        });
        return;
      }
      if (settings.waist && (settings.waist < 60 || settings.waist > 150)) {
        setLocalLoading(false);
        Swal.fire({
          icon: 'error',
          title: 'Invalid Waist',
          text: 'Waist circumference must be 60–150 cm.',
          confirmButtonColor: '#f97316'
        });
        return;
      }
    }

    try {
      const result = await saveSettings(settings);

      if (result.success) {
        // Clear settings history cache to force refresh on History page
        try {
          const userId = localStorage.getItem('user_id') || undefined;
          const cacheKey = userId ? `meallensai_settings_history_cache_${userId}` : 'meallensai_settings_history_cache';
          const timestampKey = userId ? `meallensai_settings_history_cache_timestamp_${userId}` : 'meallensai_settings_history_cache_timestamp';
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(timestampKey);
        } catch (cacheError) {
          // Ignore cache errors
        }
        
        // Update last saved settings to current settings (after save)
        setLastSavedSettings(JSON.parse(JSON.stringify(settings)));
        
        // Reload settings to get the latest from backend (ensures hasSickness is preserved)
        await reloadSettings();
        
        // Exit edit mode after successful save
        setIsEditMode(false);
        
        // Dispatch event to notify History page to refresh
        window.dispatchEvent(new CustomEvent('settingsSaved'));
        
        Swal.fire({
          icon: 'success',
          title: 'Health Information Saved!',
          html: settings.hasSickness
            ? 'Your health information was saved successfully and has been added to your history.<br><br><small>You can view your history by clicking the "View History" button below or going to the History page.</small>'
            : 'Your preference has been saved successfully.',
          confirmButtonColor: '#f97316',
          timer: 3500,
          showConfirmButton: true
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to save health information. Try again.',
          confirmButtonColor: '#f97316'
        });
      }
    } catch (error) {
      console.error('Save error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save health information. Try again.',
        confirmButtonColor: '#f97316'
      });
    } finally {
      setLocalLoading(false);
    }
  }; // ✅ FIXED — handleSave is now properly closed

  // ---------------------------------------------
  // RETURN SECTION (WAS BROKEN BEFORE — NOW FIXED)
  // ---------------------------------------------

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header - Matching other pages */}
      <header 
        className="px-4 sm:px-6 md:px-8 h-[70px] sm:h-[80px] md:h-[105px] flex items-center border-b"
        style={{ 
          backgroundColor: '#F9FBFE',
          borderColor: '#F6FAFE',
          boxShadow: '0px 2px 2px rgba(227, 227, 227, 0.25)'
        }}
      >
        <div className="flex items-center justify-between w-full gap-2 sm:gap-4">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-[32px] font-medium text-[#2A2A2A] tracking-[0.03em] leading-[130%] truncate" style={{ fontFamily: "'Work Sans', sans-serif" }}>
            Health Information
          </h1>
          
          {/* Profile Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center h-[36px] sm:h-[40px] md:h-[56px] gap-1.5 sm:gap-2 md:gap-3 px-2 sm:px-3 md:px-5 rounded-[10px] sm:rounded-[12px] md:rounded-[18px] border border-[#E7E7E7] bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 font-semibold text-[10px] sm:text-xs md:text-sm border border-blue-100">
                {(user?.displayName || user?.email?.split('@')[0] || 'U').substring(0, 2).toUpperCase()}
              </div>
              <span className="text-xs sm:text-sm md:text-[16px] font-medium text-gray-600 hidden lg:block">
                {user?.displayName || user?.email?.split('@')[0] || 'User'}
              </span>
              <ChevronDownIcon className={`h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-gray-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showProfileDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowProfileDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-white rounded-[12px] sm:rounded-[15px] shadow-lg border border-gray-200 py-2 sm:py-3 z-50">
                  <a href="/profile" className="block px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-[15px] text-gray-700 hover:bg-gray-50">Profile</a>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Subtitle */}
          <p className="text-gray-600 text-sm sm:text-base md:text-[16px]" style={{ fontFamily: "'Work Sans', sans-serif" }}>
            Manage your health information and preferences
          </p>

          {/* Error Banner */}
          {error && (
            <div className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 p-3 sm:p-4 text-red-700 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs sm:text-sm font-medium">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => reloadSettings(true)}
                disabled={loading}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Trial Status Banner */}
          {!hasActiveSubscription && (
            <div
              className={`inline-flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium border ${
                isTrialExpired
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-orange-50 border-orange-200 text-orange-700'
              }`}
            >
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{isTrialExpired ? 'Trial expired' : `Trial: ${formattedRemainingTime}`}</span>
            </div>
          )}

          {/* History Button at Top - Show when data exists */}
          {settings.hasSickness && hasExistingData && !isEditMode && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/history')}
                className="flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <History className="h-4 w-4" />
                <span>Health History</span>
              </Button>
            </div>
          )}

          {/* Info Text */}
            <p className="text-gray-500 text-xs sm:text-[14px]" style={{ fontFamily: "'Work Sans', sans-serif" }}>
              This information helps us provide personalized medical meal recommendations
            </p>

          <Card className="bg-white border border-[#E7E7E7] rounded-[12px] sm:rounded-[15px] shadow-sm">
            <CardHeader className="pb-3 sm:pb-4">
                <CardDescription className="text-gray-600 text-xs sm:text-sm" style={{ fontFamily: "'Work Sans', sans-serif" }}>
                  This information helps us provide personalized medical meal recommendations
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">

              {/* SAVED DATA TABLE - Show when data exists and NOT in edit mode */}
              {settings.hasSickness && hasExistingData && !isEditMode && (
                <div className="space-y-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-semibold">Your Saved Health Information</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditMode(true)}
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </Button>
                  </div>
                  
                  <div className="rounded-lg border overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-semibold">Field</TableHead>
                          <TableHead className="font-semibold">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Age</TableCell>
                          <TableCell>{settings.age || 'Not set'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Gender</TableCell>
                          <TableCell className="capitalize">{settings.gender || 'Not set'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Height</TableCell>
                          <TableCell>{settings.height ? `${settings.height} cm` : 'Not set'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Weight</TableCell>
                          <TableCell>{settings.weight ? `${settings.weight} kg` : 'Not set'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Waist Circumference</TableCell>
                          <TableCell>{settings.waist ? `${settings.waist} cm` : 'Not set'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Activity Level</TableCell>
                          <TableCell className="capitalize">{settings.activityLevel?.replace('_', ' ') || 'Not set'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Health Condition</TableCell>
                          <TableCell className="font-semibold text-blue-600">{settings.sicknessType || 'Not specified'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Health Goal</TableCell>
                          <TableCell>{settings.goal || 'Not set'}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Location</TableCell>
                          <TableCell>{settings.location || 'Not set'}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    </div>
                    
                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-gray-200">
                      <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                        <span className="font-medium text-xs sm:text-sm text-gray-700">Age</span>
                        <span className="text-xs sm:text-sm text-gray-600 font-medium">{settings.age || 'Not set'}</span>
                      </div>
                      <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                        <span className="font-medium text-xs sm:text-sm text-gray-700">Gender</span>
                        <span className="text-xs sm:text-sm text-gray-600 capitalize font-medium">{settings.gender || 'Not set'}</span>
                      </div>
                      <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                        <span className="font-medium text-xs sm:text-sm text-gray-700">Height</span>
                        <span className="text-xs sm:text-sm text-gray-600 font-medium">{settings.height ? `${settings.height} cm` : 'Not set'}</span>
                      </div>
                      <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                        <span className="font-medium text-xs sm:text-sm text-gray-700">Weight</span>
                        <span className="text-xs sm:text-sm text-gray-600 font-medium">{settings.weight ? `${settings.weight} kg` : 'Not set'}</span>
                      </div>
                      <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                        <span className="font-medium text-xs sm:text-sm text-gray-700">Waist Circumference</span>
                        <span className="text-xs sm:text-sm text-gray-600 font-medium">{settings.waist ? `${settings.waist} cm` : 'Not set'}</span>
                      </div>
                      <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                        <span className="font-medium text-xs sm:text-sm text-gray-700">Activity Level</span>
                        <span className="text-xs sm:text-sm text-gray-600 capitalize font-medium">{settings.activityLevel?.replace('_', ' ') || 'Not set'}</span>
                      </div>
                      <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                        <span className="font-medium text-xs sm:text-sm text-gray-700">Health Condition</span>
                        <span className="text-xs sm:text-sm font-semibold text-blue-600">{settings.sicknessType || 'Not specified'}</span>
                      </div>
                      <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                        <span className="font-medium text-xs sm:text-sm text-gray-700">Health Goal</span>
                        <span className="text-xs sm:text-sm text-gray-600 font-medium">{settings.goal || 'Not set'}</span>
                      </div>
                      <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                        <span className="font-medium text-xs sm:text-sm text-gray-700">Location</span>
                        <span className="text-xs sm:text-sm text-gray-600 font-medium break-words text-right">{settings.location || 'Not set'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FORM - Show when no data exists OR when in edit mode */}
              {(!hasExistingData || isEditMode) && (
              <div className="space-y-4 sm:space-y-6">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-semibold">
                    {hasExistingData ? 'Edit Health Information' : 'Health Information Details'}
                  </h3>
                  {hasExistingData && isEditMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditMode(false);
                        // Reset to last saved settings
                        if (lastSavedSettings) {
                          Object.keys(lastSavedSettings).forEach(key => {
                            updateSettings({ [key]: lastSavedSettings[key as keyof typeof lastSavedSettings] });
                          });
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>

                {/* Form fields - always visible */}
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Age */}
                      <div className="space-y-2">
                        <Label htmlFor="age">Age *</Label>
                        <Input
                          id="age"
                          type="number"
                          value={settings.age || ''}
                          onChange={(e) =>
                            updateSettings({ age: parseInt(e.target.value) || undefined })
                          }
                        />
                      </div>

                      {/* Gender */}
                      <div className="space-y-2">
                        <Label>Gender *</Label>
                        <Select
                          value={settings.gender || ''}
                          onValueChange={(value) => updateSettings({ gender: value as 'male' | 'female' | 'other' })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Height */}
                      <div className="space-y-2">
                        <Label>Height (cm) *</Label>
                        <Input
                          type="number"
                          value={settings.height || ''}
                          onChange={(e) =>
                            updateSettings({ height: parseFloat(e.target.value) || undefined })
                          }
                        />
                      </div>

                      {/* Weight */}
                      <div className="space-y-2">
                        <Label>Weight (kg) *</Label>
                        <Input
                          type="number"
                          value={settings.weight || ''}
                          onChange={(e) =>
                            updateSettings({ weight: parseFloat(e.target.value) || undefined })
                          }
                        />
                      </div>

                      {/* Waist */}
                      <div className="space-y-2">
                        <Label>Waist Circumference (cm) *</Label>
                        <Input
                          type="number"
                          value={settings.waist || ''}
                          onChange={(e) =>
                            updateSettings({ waist: parseFloat(e.target.value) || undefined })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Activity Level */}
                      <div className="space-y-2">
                        <Label>Activity Level *</Label>
                        <Select
                          value={settings.activityLevel || ''}
                          onValueChange={(value) => updateSettings({ activityLevel: value as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select activity level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sedentary">Sedentary</SelectItem>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="very_active">Very Active</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Sickness Type */}
                      <div className="space-y-2">
                        <Label>Health Condition *</Label>
                        <Input
                          value={settings.sicknessType}
                          onChange={(e) => handleSicknessTypeChange(e.target.value)}
                        />
                      </div>

                      {/* Goal */}
                      <div className="space-y-2">
                        <Label>Health Goal *</Label>
                        <Select
                          value={settings.goal || ''}
                          onValueChange={(value) => updateSettings({ goal: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select your goal" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Heal">Heal</SelectItem>
                            <SelectItem value="Improve">Improve</SelectItem>
                            <SelectItem value="Manage">Manage</SelectItem>
                            <SelectItem value="Restore">Restore</SelectItem>
                            <SelectItem value="Maintain">Maintain</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Location */}
                      <div className="space-y-2">
                        <Label>Location *</Label>
                        <Input
                          value={settings.location || ''}
                          onChange={(e) => updateSettings({ location: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
              
              {/* Save/Cancel buttons - Show when in edit mode or when no data exists */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isActuallyLoading}
                  className="w-full sm:w-auto text-sm sm:text-base"
                >
                  {isActuallyLoading ? 'Saving...' : 'Save Health Information'}
                </Button>
                {isEditMode && hasExistingData && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditMode(false);
                      // Reset to last saved settings
                      if (lastSavedSettings) {
                        Object.keys(lastSavedSettings).forEach(key => {
                          updateSettings({ [key]: lastSavedSettings[key] });
                        });
                      }
                    }}
                    className="w-full sm:w-auto text-sm sm:text-base"
                  >
                    Cancel
                  </Button>
                )}
              </div>
              </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
