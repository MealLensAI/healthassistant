import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import Button from '@/components/ui/Button';
import MealCard from '@/components/MealCard';
import { colors, radius, shadows, spacing } from '@/lib/theme';
import { APP_CONFIG } from '@/lib/config';
import { useSicknessSettings } from '@/hooks/useSicknessSettings';
import { useToast } from '@/lib/toast';
import { api } from '@/lib/api';

const mapGoal = (goal?: string): string => {
  if (!goal) return 'heal';
  const g = goal.toLowerCase();
  if (g.includes('maintain')) return 'maintain';
  if (g.includes('lose')) return 'lose_weight';
  if (g.includes('gain')) return 'gain_weight';
  if (g.includes('fitness')) return 'improve_fitness';
  return 'heal';
};

type InputMode = 'image' | 'ingredients';

interface HealthMeal {
  calories: number;
  carbs: number;
  fat: number;
  fiber: number;
  food_suggestions: string[];
  health_benefit: string;
  ingredients_used: string[];
  protein: number;
}

export default function DetectScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const { settings, isHealthProfileComplete } = useSicknessSettings();
  const [mode, setMode] = useState<InputMode>('ingredients');
  const [ingredientText, setIngredientText] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [meals, setMeals] = useState<HealthMeal[]>([]);
  const [detected, setDetected] = useState<string[]>([]);

  const pickImage = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please grant access to continue.');
      return;
    }
    const res =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.8,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
          });
    if (!res.canceled && res.assets?.[0]) {
      setImage(res.assets[0]);
    }
  };

  const detect = async () => {
    if (!isHealthProfileComplete()) {
      Alert.alert(
        'Complete your health profile',
        'Please fill in your health profile in Settings first.',
        [
          { text: 'Cancel' },
          { text: 'Open Settings', onPress: () => router.push('/settings') },
        ]
      );
      return;
    }
    if (mode === 'ingredients' && !ingredientText.trim()) {
      toast({
        title: 'Missing ingredients',
        description: 'Please list your ingredients.',
        variant: 'destructive',
      });
      return;
    }
    if (mode === 'image' && !image) {
      toast({
        title: 'No image',
        description: 'Please pick or capture an image.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setMeals([]);
    setDetected([]);
    try {
      const formData = new FormData();
      formData.append('age', settings.age?.toString() || '');
      formData.append('weight', settings.weight?.toString() || '');
      formData.append('height', settings.height?.toString() || '');
      formData.append('waist', settings.waist?.toString() || '');
      formData.append('gender', settings.gender || '');
      formData.append('activity_level', settings.activityLevel || '');
      formData.append('condition', settings.sicknessType || '');
      formData.append('goal', mapGoal(settings.goal));
      if (mode === 'image' && image) {
        formData.append('image_or_ingredient_list', 'image');
        const name = image.fileName || image.uri.split('/').pop() || 'photo.jpg';
        const mime = image.mimeType || 'image/jpeg';
        // @ts-ignore RN FormData file shape
        formData.append('image', { uri: image.uri, name, type: mime });
      } else {
        formData.append('image_or_ingredient_list', 'ingredient_list');
        formData.append('ingredient_list', ingredientText);
      }

      const response = await fetch(
        `${APP_CONFIG.api.ai_api_url}/generate_meals_from_ingredients`,
        { method: 'POST', body: formData }
      );
      if (!response.ok) throw new Error('Detection failed');
      const data: any = await response.json();
      if (data.error) throw new Error(data.error);

      const mainIngredients = data.main_ingredients || [];
      const list: string[] = Array.isArray(mainIngredients)
        ? mainIngredients.map((s: string) => String(s).trim()).filter(Boolean)
        : typeof mainIngredients === 'string'
        ? mainIngredients.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];
      setDetected(list);

      const opts: HealthMeal[] = Array.isArray(data.meal_options) ? data.meal_options : [];
      setMeals(opts);

      try {
        await api.saveDetectionHistory({
          recipe_type: 'ingredient_detection',
          suggestion: opts?.[0]?.food_suggestions?.[0] || '',
          detected_foods: JSON.stringify(list),
          ingredients: JSON.stringify(opts?.[0]?.ingredients_used || []),
          analysis_id: `ingredient-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        });
      } catch {}

      if (opts.length === 0) {
        toast({
          title: 'No meals found',
          description: 'The AI could not generate meals. Try different ingredients.',
          variant: 'warning',
        });
      } else {
        toast({
          title: `Found ${opts.length} health meals`,
          description: 'Tap any meal to see details.',
          variant: 'success',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Detection failed',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Health Detect</Text>
        <Text style={styles.headerSub}>Get AI-generated meals from your ingredients</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Mode toggle - outlined pill like web filter */}
        <View style={styles.modeWrap}>
          <Pressable
            style={[styles.modeBtn, mode === 'ingredients' && styles.modeBtnActive]}
            onPress={() => setMode('ingredients')}
          >
            <Ionicons
              name="list-outline"
              size={16}
              color={mode === 'ingredients' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.modeText, mode === 'ingredients' && styles.modeTextActive]}>
              Type Ingredients
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeBtn, mode === 'image' && styles.modeBtnActive]}
            onPress={() => setMode('image')}
          >
            <Ionicons
              name="camera-outline"
              size={16}
              color={mode === 'image' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.modeText, mode === 'image' && styles.modeTextActive]}>
              Upload Image
            </Text>
          </Pressable>
        </View>

        {/* Input area */}
        {mode === 'ingredients' ? (
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>List your ingredients</Text>
            <TextInput
              value={ingredientText}
              onChangeText={setIngredientText}
              placeholder="e.g. tomatoes, onions, beef, rice, bell peppers, garlic, olive oil…"
              placeholderTextColor={colors.textFaint}
              multiline
              style={styles.textArea}
            />
          </View>
        ) : (
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Upload an image of your ingredients</Text>
            {image ? (
              <View style={styles.imagePreview}>
                <Image
                  source={{ uri: image.uri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
                <Pressable style={styles.removeImage} onPress={() => setImage(null)}>
                  <Ionicons name="close" size={18} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <View style={styles.uploadZone}>
                <View style={styles.uploadIcon}>
                  <Ionicons name="cloud-upload-outline" size={28} color={colors.primary} />
                </View>
                <Text style={styles.uploadTitle}>Click to upload</Text>
                <Text style={styles.uploadDesc}>PNG, JPG, JPEG up to 10MB</Text>
                <View style={styles.pickerRow}>
                  <Pressable style={styles.pickerBtn} onPress={() => pickImage('camera')}>
                    <Ionicons name="camera" size={18} color={colors.primary} />
                    <Text style={styles.pickerLabel}>Camera</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.pickerBtn, styles.pickerBtnPrimary]}
                    onPress={() => pickImage('library')}
                  >
                    <Ionicons name="image" size={18} color="#fff" />
                    <Text style={[styles.pickerLabel, { color: '#fff' }]}>Select Image</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        <Button
          title={loading ? 'Analyzing…' : 'Generate Meals'}
          loading={loading}
          onPress={detect}
          size="lg"
          fullWidth
          leftIcon={<Ionicons name="sparkles" size={18} color="#fff" />}
        />

        {detected.length > 0 ? (
          <View style={styles.resultCard}>
            <Text style={styles.sectionTitle}>Detected ingredients</Text>
            <View style={styles.tagRow}>
              {detected.map((name) => (
                <View key={name} style={styles.tag}>
                  <Text style={styles.tagText}>{name}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.mutedHelper}>Generating personalized meals…</Text>
          </View>
        ) : null}

        {meals.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Recommended meals</Text>
            <View style={{ gap: spacing.md }}>
              {meals.map((meal, idx) => (
                <MealCard
                  key={idx}
                  title={meal.food_suggestions?.[0] || 'Health Meal'}
                  calories={meal.calories}
                  protein={meal.protein}
                  carbs={meal.carbs}
                  fat={meal.fat}
                  benefit={meal.health_benefit}
                  imageQuery={meal.food_suggestions?.[0]}
                  onPress={() =>
                    router.push({
                      pathname: '/meal-details',
                      params: {
                        title: meal.food_suggestions?.[0] || 'Health Meal',
                        calories: String(meal.calories || ''),
                        protein: String(meal.protein || ''),
                        carbs: String(meal.carbs || ''),
                        fat: String(meal.fat || ''),
                        benefit: meal.health_benefit || '',
                        ingredients: JSON.stringify(meal.ingredients_used || []),
                      },
                    })
                  }
                />
              ))}
            </View>
          </>
        ) : null}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPage },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.bgHeader,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: { fontSize: 22, fontWeight: '500', color: colors.text, letterSpacing: 0.4 },
  headerSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  content: { padding: spacing.xl, gap: spacing.lg },
  modeWrap: {
    flexDirection: 'row',
    padding: 4,
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeBtnActive: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primary,
  },
  modeText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  modeTextActive: { color: colors.primary, fontWeight: '600' },
  inputCard: {
    padding: spacing.lg,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: 14,
    color: colors.text,
    fontSize: 14,
    textAlignVertical: 'top',
    backgroundColor: colors.bg,
  },
  imagePreview: {
    width: '100%',
    height: 220,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.bgSubtle,
  },
  removeImage: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadZone: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  uploadIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  uploadTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  uploadDesc: { fontSize: 12, color: colors.textMuted },
  pickerRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  pickerLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  resultCard: {
    padding: spacing.lg,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs },
  tag: {
    backgroundColor: colors.primaryTint,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  tagText: { color: colors.primary, fontWeight: '600', fontSize: 12 },
  loading: { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
  mutedHelper: { color: colors.textMuted, fontSize: 13 },
});
