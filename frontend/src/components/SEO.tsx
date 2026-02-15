import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    canonicalUrl?: string;
    ogImage?: string;
    ogType?: string;
    structuredData?: object;
}

const SEO: React.FC<SEOProps> = ({
    title = 'MealLensAI - AI-Powered Meal Planning for Chronic Conditions | Diabetes, Hypertension & More',
    description = 'Transform your health with MealLensAI - AI-powered personalized meal planning for chronic conditions like diabetes, hypertension, and heart disease. Get food recommendations that maintain and improve your health. 7-day free trial.',
    keywords = 'chronic condition meal planning, AI nutrition diabetes, personalized diet planner, food for chronic diseases, AI meal planning, diabetes diet, hypertension nutrition, health condition food recommendations, nutritionist tools, dietitian software, automated meal planning',
    canonicalUrl = 'https://healthassistant.meallensai.com',
    ogImage = 'https://healthassistant.meallensai.com/assets/og-image.jpg',
    ogType = 'website',
    structuredData
}) => {
    const defaultStructuredData = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': 'https://healthassistant.meallensai.com/#organization',
                name: 'MealLensAI',
                url: 'https://healthassistant.meallensai.com',
                logo: {
                    '@type': 'ImageObject',
                    url: 'https://healthassistant.meallensai.com/assets/logo.png',
                    width: 512,
                    height: 512
                },
                description: 'AI-powered meal planning solution for people with chronic conditions',
                sameAs: [
                    'https://twitter.com/meallensai',
                    'https://facebook.com/meallensai'
                ],
                contactPoint: {
                    '@type': 'ContactPoint',
                    email: 'meallensai@gmail.com',
                    telephone: '+274748703778',
                    contactType: 'Customer Support'
                }
            },
            {
                '@type': 'WebSite',
                '@id': 'https://healthassistant.meallensai.com/#website',
                url: 'https://healthassistant.meallensai.com',
                name: 'MealLensAI',
                publisher: {
                    '@id': 'https://healthassistant.meallensai.com/#organization'
                },
                potentialAction: {
                    '@type': 'SearchAction',
                    target: 'https://healthassistant.meallensai.com/search?q={search_term_string}',
                    'query-input': 'required name=search_term_string'
                }
            },
            {
                '@type': ['SoftwareApplication', 'MedicalWebPage'],
                name: 'MealLensAI',
                applicationCategory: 'HealthApplication',
                operatingSystem: 'Web',
                offers: {
                    '@type': 'Offer',
                    price: '5.00',
                    priceCurrency: 'USD',
                    priceValidUntil: '2027-12-31'
                },
                aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: '4.8',
                    ratingCount: '250'
                },
                description: 'AI-powered personalized meal planning for chronic conditions',
                featureList: [
                    'AI ingredient recognition',
                    'Personalized food recommendations for chronic conditions',
                    'Meal planning for diabetes, hypertension, heart disease',
                    'Automated nutrition calculations',
                    'Health progress tracking'
                ]
            },
            {
                '@type': 'FAQPage',
                mainEntity: [
                    {
                        '@type': 'Question',
                        name: 'What chronic conditions does MealLensAI support?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'MealLensAI supports meal planning for diabetes, hypertension, heart disease, high cholesterol, obesity, PCOS, and many other chronic conditions. Our AI provides personalized food recommendations based on your specific health condition.'
                        }
                    },
                    {
                        '@type': 'Question',
                        name: 'How does AI meal planning work for chronic conditions?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'You provide your health data (weight, age, gender, health condition), and our AI automatically generates personalized food recommendations that maintain your health and can help restore or improve your condition over time.'
                        }
                    },
                    {
                        '@type': 'Question',
                        name: 'Is MealLensAI suitable for nutritionists and dietitians?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'Yes! MealLensAI automates manual processes like BMI/BMR calculations, patient tracking, and meal plan generation, allowing nutritionists and dietitians to manage more patients efficiently.'
                        }
                    },
                    {
                        '@type': 'Question',
                        name: 'How much does MealLensAI cost?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'MealLensAI offers a 7-day free trial, then $5/month for full access. We also offer weekly ($1.25/week) and yearly ($50/year) plans. No credit card required for the free trial.'
                        }
                    }
                ]
            }
        ]
    };

    return (
        <Helmet>
            {/* Primary Meta Tags */}
            <title>{title}</title>
            <meta name="title" content={title} />
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords} />
            <link rel="canonical" href={canonicalUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={ogType} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:site_name" content="MealLensAI" />
            <meta property="og:locale" content="en_US" />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={canonicalUrl} />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={ogImage} />
            <meta name="twitter:creator" content="@meallensai" />

            {/* Additional Meta Tags */}
            <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
            <meta name="googlebot" content="index, follow" />
            <meta name="bingbot" content="index, follow" />
            <meta name="language" content="English" />
            <meta name="author" content="MealLensAI" />
            <meta name="publisher" content="MealLensAI" />

            {/* Mobile Meta Tags */}
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <meta name="apple-mobile-web-app-title" content="MealLensAI" />

            {/* Structured Data */}
            <script type="application/ld+json">
                {JSON.stringify(structuredData || defaultStructuredData)}
            </script>
        </Helmet>
    );
};

export default SEO;
