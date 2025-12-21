type MetaConfig = {
    title: string
    description: string
    keywords?: string
    url?: string
    image?: string
}

const DEFAULTS: MetaConfig = {
    title: 'MealLensAI - Ingredient Recognition, Recipes & 7-Day Meal Plans ,AI Meal Plan for Chronic Sickness Conditions, Budget & Location-Based Meal Plans',
    description: 'AI ingredient recognition, step-by-step recipes, dish detection, and personalized 7-day meal plans. Includes photo/manual meal planning (breakfast, lunch, dinner, dessert), AI plans for chronic conditions, and budget/location-based plans.',
    keywords: buildKeywords(),
    url: import.meta.env.VITE_FRONTEND_URL || window.location.origin,
    image: '/assets/images/share-image.png'
}

export const ROUTE_SEO: Record<string, Partial<MetaConfig>> = {
    '/landing': {
        title: 'MealLensAI - Ingredient Recognition, Recipes & 7-Day Meal Plans,AI Meal Plan for Chronic Sickness Conditions, Budget & Location-Based Meal Plans',
        description: 'Snap or upload ingredients for instant identification, get step-by-step recipes, detect dishes from photos, and generate personalized 7-day plans incl. breakfast/lunch/dinner/dessert, chronic-condition options, and budget/location-based planning.',
    },
    '/login': {
        title: 'Login - MealLensAI',
        description: 'Sign in to access AI-powered food detection and meal planning.'
    },
    '/signup': {
        title: 'Create Account - MealLensAI',
        description: 'Join MealLensAI to discover recipes and plan meals with AI.'
    },
    '/ai-kitchen': {
        title: 'AI Kitchen - MealLensAI',
        description: 'Detect ingredients and discover recipes instantly with AI.'
    },
    '/detected': {
        title: 'Detect Food - MealLensAI',
        description: 'Capture a meal and let AI identify it with full recipe and steps.'
    },
    '/planner': {
        title: 'Meal Planner - MealLensAI',
        description: 'Generate a 7-day meal plan tailored to your preferences and budget.'
    },
    '/history': {
        title: 'History - MealLensAI',
        description: 'Review your detected ingredients and saved recipes.'
    },
    '/payment': {
        title: 'Subscription - MealLensAI',
        description: 'Start free trial and manage your MealLensAI subscription.'
    },
    '/profile': {
        title: 'Profile - MealLensAI',
        description: 'Manage your MealLensAI account and preferences.'
    },
    '/settings': {
        title: 'Settings - MealLensAI',
        description: 'Configure your app settings and preferences.'
    }
}

export function updateMeta(config: Partial<MetaConfig> = {}) {
    if (typeof document === 'undefined') return
    const meta: MetaConfig = { ...DEFAULTS, ...config }

    // Compute current URL if not provided
    const currentUrl = typeof window !== 'undefined' ? (window.location?.href || `${DEFAULTS.url}`) : DEFAULTS.url
    meta.url = config.url || currentUrl

    // Title
    if (meta.title) document.title = meta.title

    // Description
    setNamedMeta('name', 'description', meta.description)
    setNamedMeta('name', 'keywords', meta.keywords)
    setNamedMeta('name', 'robots', 'index, follow')
    setNamedMeta('name', 'author', 'MealLensAI Team')
    setNamedMeta('name', 'theme-color', '#FF6B6B')

    // Open Graph
    setNamedMeta('property', 'og:title', meta.title)
    setNamedMeta('property', 'og:description', meta.description)
    setNamedMeta('property', 'og:image', meta.image)
    setNamedMeta('property', 'og:url', meta.url)
    setNamedMeta('property', 'og:type', 'website')
    setNamedMeta('property', 'og:site_name', 'MealLensAI')
    setNamedMeta('property', 'og:locale', 'en_US')

    // Twitter
    setNamedMeta('name', 'twitter:card', 'summary_large_image')
    setNamedMeta('name', 'twitter:title', meta.title)
    setNamedMeta('name', 'twitter:description', meta.description)
    setNamedMeta('name', 'twitter:site', '@MealLensAI')
    setNamedMeta('name', 'twitter:image', meta.image)

    // Canonical
    setCanonical((meta.url || DEFAULTS.url) as string)

    // JSON-LD
    ensureJsonLd()
}

function setNamedMeta(attrName: 'name' | 'property', attrValue: string, content?: string) {
    if (!content) return
    let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null
    if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attrName, attrValue)
        document.head.appendChild(el)
    }
    el.setAttribute('content', content)
}

function setCanonical(href: string) {
    if (!href) return
    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!link) {
        link = document.createElement('link')
        link.setAttribute('rel', 'canonical')
        document.head.appendChild(link)
    }
    link.setAttribute('href', href)
}

function ensureJsonLd() {
    try {
        const origin = typeof window !== 'undefined' ? (window.location?.origin || DEFAULTS.url) : DEFAULTS.url

        // Organization
        const orgId = 'ld-org'
        if (!document.getElementById(orgId)) {
            const script = document.createElement('script')
            script.type = 'application/ld+json'
            script.id = orgId
            script.text = JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'MealLensAI',
                url: origin,
                logo: origin + '/favicon.ico',
                sameAs: [
                    'https://x.com/MealLensAI'
                ]
            })
            document.head.appendChild(script)
        }

        // Website + SearchAction
        const siteId = 'ld-website'
        if (!document.getElementById(siteId)) {
            const script = document.createElement('script')
            script.type = 'application/ld+json'
            script.id = siteId
            script.text = JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: 'MealLensAI',
                url: origin,
                potentialAction: {
                    '@type': 'SearchAction',
                    target: origin + '/search?q={search_term_string}',
                    'query-input': 'required name=search_term_string'
                }
            })
            document.head.appendChild(script)
        }
    } catch (_) {
        // no-op
    }
}

function buildKeywords(): string {
    const KEYWORDS = [
        'AI recipe finder', 'ai recipe app', 'ai recipes', 'recipe generator', 'recipe ideas', 'smart cooking', 'cooking assistant', 'kitchen ai', 'meal planner', 'meal planning app', 'weekly meal plan', '7-day meal plan', 'budget meal plan', 'cheap meal plan', 'affordable recipes', 'family meal plan', 'healthy meal plan', 'diet meal plan', 'personalized meal plan', 'custom meal plan', 'meal prep', 'meal prep ideas', 'meal prep plan', 'shopping list generator', 'grocery list', 'smart grocery list',
        'ingredient recognition', 'ingredient detector', 'detect ingredients from photo', 'identify ingredients', 'scan ingredients', 'food recognition ai', 'food recognition app', 'food detector', 'dish recognition', 'identify dish from photo', 'what is this food', 'camera recipe app', 'photo to recipe', 'upload photo recipe', 'image to recipe',
        'smart food detection', 'food detection app', 'ai food detection', 'detect meal from image', 'food classifier', 'visual food recognition', 'meal identification',
        'cooking tips', 'step by step recipes', 'guided cooking', 'how to cook', 'cooking instructions', 'kitchen guide', 'culinary assistant', 'home cooking',
        'nutrition insights', 'nutrition info', 'calories per recipe', 'macros per recipe', 'protein rich recipes', 'low carb recipes', 'high protein meals', 'balanced diet', 'nutrition tracking',
        'dietary preferences', 'dietary restrictions', 'gluten free recipes', 'dairy free recipes', 'nut free recipes', 'egg free recipes', 'low sodium recipes', 'low sugar recipes', 'low fat recipes', 'vegan recipes', 'vegetarian recipes', 'keto recipes', 'paleo recipes', 'mediterranean diet', 'dash diet', 'flexitarian diet', 'whole30', 'plant based recipes',
        'weight loss meal plan', 'weight loss recipes', 'weight loss dinners', 'low calorie meals', 'healthy dinners', 'healthy lunches', 'healthy breakfast', 'quick healthy meals', '30 minute recipes', 'easy recipes', 'simple recipes', 'one pot recipes', 'sheet pan recipes', 'air fryer recipes', 'instant pot recipes', 'slow cooker recipes',
        'diabetes meal plan', 'diabetic recipes', 'hypertension meal plan', 'blood pressure diet', 'heart healthy recipes', 'kidney friendly recipes', 'renal diet recipes', 'pcos meal plan', 'thyroid diet recipes', 'celiac diet', 'ibs diet', 'low fodmap recipes', 'cholesterol diet',
        'world cuisines', 'american recipes', 'italian recipes', 'mexican recipes', 'indian recipes', 'chinese recipes', 'thai recipes', 'japanese recipes', 'korean recipes', 'mediterranean recipes', 'middle eastern recipes', 'african recipes', 'nigerian recipes', 'ghanaian recipes', 'kenyan recipes', 'south african recipes', 'ethiopian recipes', 'moroccan recipes', 'tanzanian recipes', 'east african recipes', 'west african recipes', 'caribbean recipes', 'latin recipes',
        'breakfast ideas', 'lunch ideas', 'dinner ideas', 'snack ideas', 'dessert recipes', 'soup recipes', 'salad recipes', 'sandwich recipes', 'pasta recipes', 'rice recipes', 'chicken recipes', 'beef recipes', 'pork recipes', 'seafood recipes', 'fish recipes', 'vegetable recipes', 'vegan dinner', 'vegetarian dinner', 'grill recipes', 'bbq recipes', 'baking recipes', 'bread recipes', 'cake recipes', 'cookie recipes',
        'kid friendly recipes', 'family dinners', 'meal plan for two', 'student meals', 'college meals', 'budget dinners', 'work lunch ideas', 'meal plan shopping list', 'pantry recipes', 'leftover recipes', 'no oven recipes', 'no cook recipes', 'summer recipes', 'winter recipes', 'holiday recipes', 'thanksgiving recipes', 'christmas recipes', 'ramadan recipes', 'easter recipes',
        'food scanner', 'recipe search', 'find recipes by ingredients', 'what to cook', 'cook with what you have', 'smart kitchen app', 'ai kitchen assistant', 'ai meal planner', 'personalized recipes', 'recipe recommendations',
        'youtube cooking resources', 'cooking videos', 'how to cook video', 'google cooking resources', 'cooking tutorials', 'recipe tutorial',
        'macro tracking recipes', 'high fiber recipes', 'low cholesterol recipes', 'heart healthy meals', 'anti inflammatory recipes', 'diabetic friendly meals', 'gluten free dinner', 'keto dinner', 'vegan meal plan', 'vegetarian meal plan', 'low carb dinner',
        'subscribe meal app', 'meal app subscription', 'free trial meal app', 'smart kitchen tools', 'home chef app', 'chef ai', 'culinary ai', 'food ai',
        'meal plan generator', 'recipe generator ai', 'ai grocery list', 'budget grocery list', 'local ingredients recipes', 'seasonal recipes', 'farmers market recipes', 'zero waste recipes', 'leftover makeover recipes',
        'savory recipes', 'sweet recipes', 'spicy recipes', 'comfort food', 'gourmet at home', 'restaurant style recipes', 'copycat recipes', 'meal ideas tonight', 'dinner tonight ideas',

        // Landing feature expansions
        'smart ingredient recognition', 'recognize ingredients from camera', 'snap ingredients get recipes', 'upload ingredients photo get recipes', 'instant ingredient identification', 'ingredient scanner app', 'ingredient recognition ai app', 'identify pantry items from photo',
        'missing ingredients finder', 'what ingredients am i missing', 'suggest missing ingredients for recipe', 'recipe gap filler', 'substitute ingredients suggestions', 'ingredient alternatives ai',
        'step by step cooking instructions', 'guided cooking with timers', 'how to cook step by step', 'interactive cooking guide', 'visual cooking guide', 'voice guided cooking',
        'youtube recipe recommendations', 'youtube cooking suggestions', 'best youtube videos to cook', 'google recipe resources', 'find cooking guides on google', 'recipe research assistant',
        'smart food detection from photo', 'identify prepared dish from image', 'what dish is this from photo', 'dish identification ai', 'photo to full recipe', 'prepared meal to recipe',
        'full recipe with ingredients list', 'generate ingredient list from dish photo', 'auto ingredient list from image', 'auto recipe steps from photo', 'ai generated cooking instructions',
        '7-day meal plan generator', 'weekly meal plan with breakfast lunch dinner dessert', 'meal plan with dessert included', 'personalized weekly meal plan', 'meal plan based on ingredients',
        'ai meal plan for chronic illness', 'meal plan for chronic sickness', 'healing meal plan', 'symptom management diet plan', 'support recovery meal plan', 'well-being meal plan',
        'meal plan for diabetes', 'meal plan for hypertension', 'meal plan for pcos', 'meal plan for thyroid', 'meal plan for kidney disease', 'renal meal plan', 'meal plan for celiac disease', 'gluten free meal plan 7-day', 'ibs low fodmap meal plan', 'cholesterol lowering meal plan', 'heart healthy meal plan 7-day', 'post-surgery recovery meal plan',
        'budget based meal plans', 'low budget weekly meal plan', 'cheap healthy meal plan', 'affordable 7-day meal plan', 'meal plan under $50', 'meal plan under $100', 'frugal meal planning', 'thrifty meal plan',
        'location based meal plans', 'meal plan with local ingredients', 'meal plan near me', 'meal plan for my area', 'regional meal planning', 'local cuisine meal plans',
        'meal plan for kenya', 'meal plan for nigeria', 'meal plan for ghana', 'meal plan for south africa', 'meal plan for usa', 'meal plan for uk', 'meal plan for canada', 'meal plan for india', 'meal plan for europe',
        'ingredient based meal planning', 'plan meals from pantry photo', 'plan meals from grocery receipt', 'pantry scanner to meal plan',
        'breakfast meal plan ideas', 'lunch meal plan ideas', 'dinner meal plan ideas', 'dessert meal plan ideas', 'snack plan ideas',
        'auto shopping list from meal plan', 'generate grocery list from recipes', 'smart grocery planning', 'optimize grocery by budget', 'best stores for your meal plan',
        'personalized ai recipe suggestions', 'recommend recipes from ingredients on hand', 'what can i cook with chicken and rice', 'cook with what i have right now',
        'meal plan with calories and macros', 'macro friendly meal plan', 'high protein weekly plan', 'low carb weekly plan', 'balanced macros meal plan',
        'healthy cheap recipes for students', 'meal plan for students on budget', 'quick meals for busy professionals', 'five ingredient recipes', 'few ingredients dinner ideas',
        'identify allergens in ingredients', 'allergen detection from photo', 'nut free cooking plan', 'dairy free cooking plan', 'egg free meal plan', 'peanut free recipes',
        'recipe instructions with timers', 'recipe steps with checklists', 'interactive recipe mode', 'hands-free cooking mode',
        'one-click add to meal plan', 'convert detected dish to meal plan', 'save recipe to history automatically',
        'export meal plan to calendar', 'share meal plan with family', 'printable meal plan and grocery list',
        'ai cooking coach', 'kitchen copilot', 'culinary copilot', 'smart chef assistant', 'home cook ai',
        'photo-based nutrition estimate', 'estimate calories from photo', 'nutrition estimation from recipe', 'nutrition breakdown per meal',
        'african recipes ai', 'east african recipes ai', 'west african recipes ai', 'nigerian jollof recipe ai', 'kenyan pilau recipe ai', 'ghanaian waakye recipe ai', 'ethiopian injera recipe ai', 'moroccan tagine recipe ai',
        'meal plan for beginners', 'starter meal plan', 'simple starter recipes', 'kid friendly meal plan', 'picky eater meal plan',
        'sunday meal prep plan', 'weekday dinner plan', 'two week meal plan', 'monthly meal plan template',
        'track pantry usage', 'reduce food waste meal plan', 'leftover transformation recipes', 'use up leftovers recipes',
        'cook along youtube', 'watch and cook mode', 'pair recipes with videos', 'cook with video tutorials',
        'search recipes by photo', 'visual search recipes', 'find dishes similar to my photo', 'reverse image recipe search',

        // Chronic disease / condition-specific long-tail (AI-focused)
        'AI for chronic disease meal plans', 'AI meal plan for chronic disease', 'AI nutrition for chronic disease', 'chronic disease diet AI', 'diet planner for chronic illness AI', 'meal plan for chronic patients AI',
        'AI diet for diabetes', 'AI meal plan for diabetes', 'diabetic friendly AI meal plan', 'AI diet for hypertension', 'low sodium AI meal plan', 'heart disease AI meal plan',
        'cholesterol lowering AI diet', 'high cholesterol AI meal plan', 'kidney disease AI meal plan', 'renal diet AI meal plan', 'CKD AI diet plan', 'gout AI diet plan',
        'hypothyroid AI meal plan', 'thyroid disorder AI diet', 'PCOS AI meal plan', 'PCOS weight loss AI diet', 'prediabetes AI meal plan', 'insulin resistance AI diet',
        'fatty liver AI meal plan', 'NAFLD AI diet plan', 'IBS low FODMAP AI meal plan', 'IBD AI diet plan', "Crohn's disease AI meal plan", 'ulcerative colitis AI meal plan',
        'celiac disease AI meal plan', 'gluten intolerance AI diet plan', 'lactose intolerance AI diet plan', 'GERD reflux AI diet plan', 'arthritis anti inflammatory AI diet', 'rheumatoid arthritis AI meal plan',
        'osteoarthritis AI diet plan', 'migraine diet AI plan', 'endometriosis AI diet plan', 'anemia iron rich AI meal plan', 'postpartum recovery AI meal plan', 'supportive oncology AI nutrition plan',
        'autoimmune protocol AIP AI meal plan', 'DASH AI meal plan', 'Mediterranean AI meal plan for heart health', 'low carb diabetic AI meal plan', 'low glycemic AI diet plan', 'plant based AI heart healthy meal plan',
        'low potassium renal AI diet plan', 'low phosphorus kidney AI meal plan'
    ]
    const additional: string[] = []
    const bases = ['ai recipe finder for {diet}', 'meal plan for {diet}', 'easy {diet} dinner', 'quick {diet} recipes']
    const diets = ['vegan', 'vegetarian', 'keto', 'gluten free', 'diabetic', 'low carb', 'high protein', 'paleo', 'mediterranean', 'dash']
    for (const b of bases) {
        for (const d of diets) {
            additional.push(b.replace('{diet}', d))
        }
    }
    const all = KEYWORDS.concat(additional)
    return all.join(', ')
}


