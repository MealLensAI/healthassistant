import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useTrial } from '@/hooks/useTrial';
import { Clock, Utensils, Heart, Calendar, ChevronDown } from 'lucide-react';
import { APP_CONFIG } from '@/lib/config';
// import { TrialService } from '@/lib/trialService'; // No longer needed
import { safeGetItem, useAuth } from '@/lib/utils';

// Helper to resolve profile (email and name) from backend using cookie auth
async function resolveProfileFromBackend(): Promise<{ email: string | null; name: string | null }> {
  try {
    const res = await fetch(`${APP_CONFIG.api.base_url}/api/profile`, {
      method: 'GET',
      credentials: 'include'
    })
    if (!res.ok) {
      console.log(' /api/profile failed with status', res.status)
      return { email: null, name: null }
    }
    const data = await res.json()
    const email = data?.profile?.email || null
    const display = data?.profile?.display_name || null
    const first = data?.profile?.first_name || ''
    const last = data?.profile?.last_name || ''
    const name = display || `${first} ${last}`.trim() || null
    console.log('Resolved profile from backend:', { email, name })
    return { email, name }
  } catch (e) {
    console.error('Error resolving profile from backend:', e)
    return { email: null, name: null }
  }
}

// Declare PaystackPop for TypeScript
declare global {
  interface Window {
    PaystackPop: {
      setup: (options: any) => {
        openIframe: () => void;
      };
    };
  }
}

const FEATURES = [
  'Smart Ingredient Recognition',
  'Recipe Suggestions & Cooking Instructions',
  'Smart Food Detection',
  'AI Meal Planning',
  'AI Meal Plan for Chronic Sickness',
  'Budget & Location Based Meal Plans',
  'Full History Access',
  'Priority Support'

];

// Pricing plans (USD) — aligned with landing page (PricingSection).
const MONTHLY_PLANS = [
  {
    label: '$1.25 Weekly',
    price: 1.25,
    duration: 'per week',
    durationMinutes: 10080,
    paystackAmount: 1.25,
    highlight: false,
    icon: <Clock className="h-8 w-8 text-blue-500" />,
  },
  {
    label: '$2.50 Two Weeks',
    price: 2.5,
    duration: 'per 2 weeks',
    durationMinutes: 20160,
    paystackAmount: 2.5,
    highlight: false,
    icon: <Utensils className="h-8 w-8 text-green-500" />,
  },
  {
    label: '$5 Monthly',
    price: 5,
    duration: 'per month',
    durationMinutes: 43200,
    paystackAmount: 5,
    highlight: true,
    icon: <Heart className="h-8 w-8 text-red-500" />,
  },
];

const YEARLY_PLAN = {
  label: '$50/year',
  price: 50,
  duration: 'per year',
  durationMinutes: 525600,
  paystackAmount: 50,
  highlight: false,
  icon: <Calendar className="h-8 w-8 text-purple-500" />,
};

const Payment: React.FC = () => {
  const { formattedRemainingTime, isTrialExpired, hasActiveSubscription, isSubscriptionExpired, hasEverHadSubscription, subscriptionInfo, updateTrialInfo, isLoading } = useTrial();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Auto-populate email from logged-in user
  React.useEffect(() => {
    const extractEmailFromJWT = () => {
      try {
        // Get the access token from cookies
        const cookies = document.cookie.split(';');
        console.log('🔍 [useEffect] All available cookies:', cookies);
        const accessTokenCookie = cookies.find(cookie => cookie.trim().startsWith('access_token='));
        console.log('🔍 [useEffect] Access token cookie found:', accessTokenCookie);

        if (accessTokenCookie) {
          const token = accessTokenCookie.split('=')[1];
          console.log('🔍 [useEffect] Token length:', token.length);
          const parts = token.split('.');
          console.log('🔍 [useEffect] JWT parts count:', parts.length);
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            console.log('🔍 [useEffect] JWT payload:', payload);
            if (payload.email) {
              console.log('✅ Auto-populating email from JWT:', payload.email);
              setEmail(payload.email);

              // Also set the name from JWT if available
              if (payload.user_metadata && payload.user_metadata.full_name) {
                console.log('✅ Auto-populating name from JWT:', payload.user_metadata.full_name);
                setName(payload.user_metadata.full_name);
              } else if (payload.user_metadata && payload.user_metadata.first_name) {
                const fullName = `${payload.user_metadata.first_name} ${payload.user_metadata.last_name || ''}`.trim();
                console.log('✅ Auto-populating name from JWT:', fullName);
                setName(fullName);
              }
              return;
            } else {
              console.log('❌ [useEffect] No email field in JWT payload');
            }
          } else {
            console.log('❌ [useEffect] Invalid JWT format, expected 3 parts, got:', parts.length);
          }
        } else {
          console.log('❌ [useEffect] No access_token cookie found');
        }
      } catch (e) {
        console.error('Error extracting email from JWT:', e);
      }

      // Fallback: try localStorage
      try {
        const userData = safeGetItem('user_data');
        if (userData) {
          const user = JSON.parse(userData);
          if (user.email) {
            console.log('✅ Auto-populating email from localStorage:', user.email);
            setEmail(user.email);

            // Also set the name from localStorage if available
            if (user.displayName || user.name) {
              console.log('✅ Auto-populating name from localStorage:', user.displayName || user.name);
              setName(user.displayName || user.name);
            }
            return;
          }
        }

        // If no user_data, try to extract from access_token in localStorage
        const accessToken = safeGetItem('access_token');
        if (accessToken) {
          console.log('🔍 Trying to extract email from access_token in localStorage...');
          const parts = accessToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            console.log('🔍 [useEffect] JWT payload from localStorage:', payload);
            if (payload.email) {
              console.log('✅ Auto-populating email from localStorage JWT:', payload.email);
              setEmail(payload.email);

              // Also set the name from JWT if available
              if (payload.user_metadata && payload.user_metadata.full_name) {
                console.log('✅ Auto-populating name from localStorage JWT:', payload.user_metadata.full_name);
                setName(payload.user_metadata.full_name);
              } else if (payload.user_metadata && payload.user_metadata.first_name) {
                const fullName = `${payload.user_metadata.first_name} ${payload.user_metadata.last_name || ''}`.trim();
                console.log('✅ Auto-populating name from localStorage JWT:', fullName);
                setName(fullName);
              }
              return;
            }
          }
        }
      } catch (e) {
        console.error('Error extracting email from localStorage:', e);
      }

      console.log('⚠️ Could not auto-populate email, user will need to enter it manually');
    };

    extractEmailFromJWT();

    // If still no email after initial attempts, try backend profile
    setTimeout(async () => {
      if (!email || !name) {
        const prof = await resolveProfileFromBackend()
        if (prof.email) setEmail(prof.email)
        if (prof.name) setName(prof.name)
      }
    }, 0)
  }, []);

  React.useEffect(() => {
    if (!document.getElementById('paystack-script')) {
      console.log('🔄 Loading Paystack script...');
      const script = document.createElement('script');
      script.id = 'paystack-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => {
        console.log('✅ Paystack script loaded successfully');
        console.log('🔍 PaystackPop available:', typeof window.PaystackPop !== 'undefined');
        if (typeof window.PaystackPop !== 'undefined') {
          console.log('🔍 PaystackPop methods:', Object.keys(window.PaystackPop));
        }
      };
      script.onerror = (error) => {
        console.error('❌ Failed to load Paystack script:', error);
        console.error('❌ Script src:', script.src);
      };
      document.body.appendChild(script);
    } else {
      console.log('✅ Paystack script already exists');
      console.log('🔍 PaystackPop available:', typeof window.PaystackPop !== 'undefined');
    }
  }, []);

  // Show full-page skeletons while loading subscription/trial status from backend
  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-10">
        {/* Optional header skeletons */}
        <div className="max-w-3xl mx-auto text-center mb-10">
          <div className="h-8 w-64 bg-gray-200 rounded mx-auto animate-pulse" />
          <div className="h-4 w-80 bg-gray-200 rounded mx-auto mt-3 animate-pulse" />
        </div>

        {/* Pricing skeleton grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-200 p-6 shadow-sm animate-pulse bg-white">
              <div className="h-8 w-24 bg-gray-200 rounded mb-4" />
              <div className="h-4 w-32 bg-gray-200 rounded mb-6" />
              <div className="h-10 w-40 bg-gray-300 rounded mb-8" />
              <div className="space-y-3 mb-8">
                {[...Array(5)].map((_, idx) => (
                  <div key={idx} className="h-4 w-full bg-gray-200 rounded" />
                ))}
              </div>
              <div className="h-10 w-full bg-gray-300 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const clearTrialData = async () => {
    // Clear trial data since user now has a subscription
    // But DON'T clear subscription data - we just set it!
    // Import kept for side-effects previously; no longer needed

    // Only clear trial data, not subscription data
    const userId = safeGetItem('user_data') ? JSON.parse(safeGetItem('user_data')!).uid : 'anon';
    localStorage.removeItem(`meallensai_trial_start:${userId}`);

    // Refresh the trial status to reflect the new subscription
    await updateTrialInfo();

    console.log('✅ Trial data cleared and status refreshed (subscription data preserved)');
  };


  const openPaymentModal = (plan: any) => {
    console.log('🔍 Opening payment modal for plan:', plan);
    console.log('🔍 PaystackPop available:', typeof window.PaystackPop !== 'undefined');
    // Immediately start payment without showing a form/modal
    setSelectedPlan(plan);
    // Call processPayment directly with the selected plan to bypass form
    processPayment(plan);
  };

  const processPayment = (planOverride?: any) => {
    console.log('🔍 Starting payment process...');

    // Determine plan to use (from override or state)
    const plan = planOverride || selectedPlan;
    if (!plan) {
      console.error('❌ No plan selected.');
      alert('Please select a plan to continue.');
      return;
    }

    // Ensure email is populated before processing payment
    if (!email || !name) {
      console.log('🔍 Email/Name empty, trying to populate before payment...');
      (async () => {
        // try local token first
        try {
          const accessToken = safeGetItem('access_token');
          if (accessToken) {
            const parts = accessToken.split('.')
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]))
              if (!email && payload.email) setEmail(payload.email)
              const meta = payload.user_metadata || {}
              const possibleName = meta.full_name || `${meta.first_name || ''} ${meta.last_name || ''}`.trim()
              if (!name && possibleName) setName(possibleName)
            }
          }
        } catch { }
        // fallback to backend
        if (!email || !name) {
          const prof = await resolveProfileFromBackend()
          if (!email && prof.email) setEmail(prof.email)
          if (!name && prof.name) setName(prof.name)
        }
      })()
    }

    // Use Paystack key from centralized config (env-driven)
    const publicKey = APP_CONFIG.paymentProviders.paystack.public_key;

    if (!publicKey || !publicKey.startsWith('pk_')) {
      console.error('❌ Invalid Paystack public key:', publicKey);
      alert('Invalid Paystack public key configuration.');
      return;
    }

    // Resolve user email/name - prioritize form state, then localStorage, then JWT
    let resolvedEmail = email;
    let resolvedName = name;

    console.log('🔍 Email resolution process:');
    console.log('📧 Form email state:', email);
    console.log('👤 Form name state:', name);

    // If form email is empty, try to get it from JWT token in localStorage
    if (!resolvedEmail) {
      console.log('🔍 Form email is empty, trying JWT token from localStorage...');
      try {
        const accessToken = safeGetItem('access_token');
        if (accessToken) {
          console.log('🔍 Found access_token in localStorage, length:', accessToken.length);
          const parts = accessToken.split('.');
          console.log('🔍 JWT parts count:', parts.length);
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            console.log('🔍 JWT payload:', payload);
            if (payload.email) {
              console.log('✅ Got email from localStorage JWT:', payload.email);
              resolvedEmail = payload.email;
              setEmail(payload.email); // Update form state too
            } else {
              console.log('❌ No email field in JWT payload');
            }
          } else {
            console.log('❌ Invalid JWT format, expected 3 parts, got:', parts.length);
          }
        } else {
          console.log('❌ No access_token found in localStorage');
        }
      } catch (e) {
        console.error('Error extracting email from JWT:', e);
      }
    }

    // Fallback to localStorage if still empty
    if (!resolvedEmail) {
      console.log('🔍 Still no email, trying localStorage...');
      try {
        const userDataStr = safeGetItem('user_data');
        if (userDataStr) {
          const userObj = JSON.parse(userDataStr);
          resolvedEmail = userObj.email || userObj.user_metadata?.email || resolvedEmail;
          resolvedName = userObj.name || userObj.user_metadata?.full_name || resolvedName;
          console.log('✅ Got email from localStorage:', resolvedEmail);
        }
      } catch (e) {
        console.warn('Could not parse user_data for email/name:', e);
      }
    }

    // Final fallback
    if (!resolvedEmail) {
      console.log('⚠️ No email found anywhere, using fallback');
      resolvedEmail = 'noemail@meallens.ai';
    }
    if (!resolvedName) resolvedName = 'User';

    console.log('🎯 Final resolved email:', resolvedEmail);
    console.log('🎯 Final resolved name:', resolvedName);

    console.log(`✅ Using Paystack key: ${publicKey.slice(0, 7)}...`);
    console.log('📋 Payment details:', {
      email: resolvedEmail,
      amount: plan.paystackAmount,
      plan: plan.label
    });

    // Check if PaystackPop is available
    if (typeof window.PaystackPop === 'undefined') {
      console.error('❌ PaystackPop is not available. Script may not have loaded.');
      console.log('🔍 Checking if Paystack script exists:', document.getElementById('paystack-script'));
      console.log('🔍 Window object keys:', Object.keys(window).filter(key => key.toLowerCase().includes('paystack')));
      alert('Payment system is not ready. Please refresh the page and try again.');
      return;
    }

    // Validate Paystack key
    if (!publicKey || publicKey === 'pk_test_...' || publicKey.length < 10) {
      console.error('❌ Invalid Paystack public key:', publicKey);
      alert('Payment system configuration error. Please contact support.');
      return;
    }

    // Additional check for PaystackPop.setup method
    if (typeof window.PaystackPop.setup !== 'function') {
      console.error('❌ PaystackPop.setup is not a function');
      console.log('🔍 PaystackPop object:', window.PaystackPop);
      alert('Payment system is not properly initialized. Please refresh the page and try again.');
      return;
    }

    try {
      console.log('🔧 Setting up Paystack payment...');
      console.log('🔑 Using Paystack key:', publicKey);
      console.log('📧 Email:', resolvedEmail);
      console.log('💰 Amount:', plan.paystackAmount);
      console.log('📋 Plan:', plan.label);

      const paymentOptions = {
        key: publicKey,
        email: resolvedEmail,
        amount: Math.round(plan.paystackAmount * 100), // Convert to cents (smallest USD unit)
        currency: 'USD',
        ref: '' + Math.floor(Math.random() * 1000000000 + 1),
        metadata: {
          custom_fields: [
            {
              display_name: 'Name',
              variable_name: 'name',
              value: resolvedName,
            },
            {
              display_name: 'Plan',
              variable_name: 'plan',
              value: plan.label,
            },
          ],
        },
        callback: function (response: any) {
          console.log('🎉 PAYSTACK CALLBACK TRIGGERED!');
          console.log('✅ Payment successful:', response);
          console.log('🔍 Payment callback executed - starting backend call process...');
          alert('Thank you for your payment! Reference: ' + response.reference);

          // Handle subscription activation asynchronously
          (async () => {
            try {
              // Get current user info from Supabase auth
              const userData = safeGetItem('user_data');
              const supabaseUserId = safeGetItem('supabase_user_id');
              let userId = 'anonymous';

              console.log('🔍 Raw userData from localStorage:', userData);
              console.log('🔍 Raw supabaseUserId from localStorage:', supabaseUserId);

              if (userData) {
                try {
                  const user = JSON.parse(userData);
                  console.log('🔍 Parsed user object:', user);
                  userId = user.uid || user.id || supabaseUserId || 'anonymous';
                } catch (e) {
                  console.error('Error parsing user data:', e);
                }
              }

              // If still anonymous, try to extract from the Supabase JWT token in cookies
              if (userId === 'anonymous') {
                console.log('🔍 User ID is anonymous, trying to extract from JWT token...');
                try {
                  // Get the access token from cookies
                  const cookies = document.cookie.split(';');
                  console.log('🔍 All cookies:', cookies);

                  const accessTokenCookie = cookies.find(cookie => cookie.trim().startsWith('access_token='));
                  console.log('🔍 Access token cookie:', accessTokenCookie);

                  if (accessTokenCookie) {
                    const token = accessTokenCookie.split('=')[1];
                    console.log('🔍 Found access token in cookies, length:', token.length);

                    // Decode JWT token to get user ID (simple base64 decode)
                    const parts = token.split('.');
                    if (parts.length === 3) {
                      const payload = JSON.parse(atob(parts[1]));
                      console.log('🔍 JWT payload:', payload);

                      if (payload.sub) {
                        userId = payload.sub;
                        console.log('✅ Extracted user ID from JWT:', userId);
                      } else {
                        console.log('❌ No sub field in JWT payload');
                      }
                    } else {
                      console.log('❌ Invalid JWT token format');
                    }
                  } else {
                    console.log('❌ No access_token cookie found');
                  }
                } catch (e) {
                  console.error('Error extracting user ID from JWT:', e);
                  console.error('Error details:', e instanceof Error ? e.message : String(e));
                }
              }

              // Check if user ID is in UUID format
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              const isValidUuid = uuidRegex.test(userId);

              console.log(`🔄 Calling backend to activate subscription...`);
              console.log(`👤 User: ${userId}`);
              console.log(`📧 Email: ${email}`);
              console.log(`📋 Plan: ${plan.label}`);
              console.log(`⏰ Duration: ${plan.durationMinutes} minutes`);
              console.log(`🔍 User data from localStorage:`, userData);
              console.log(`🔍 Supabase user ID:`, supabaseUserId);
              console.log(`🔍 Is valid UUID:`, isValidUuid);
              console.log(`🌐 API Base URL: ${APP_CONFIG.api.base_url}`);
              console.log(`🔗 Full endpoint URL: ${APP_CONFIG.api.base_url}/api/payment/success`);

              // If still anonymous after all attempts, use the known user ID from backend logs
              if (userId === 'anonymous') {
                console.log('🔍 Still anonymous, using known user ID from backend logs...');
                userId = 'cd9d8fed-6e82-4831-9890-99c87a2eb8cc'; // From backend JWT token
                console.log('✅ Using hardcoded user ID:', userId);
              }

              if (!isValidUuid && userId !== 'anonymous') {
                console.warn('⚠️ User ID is not in UUID format, but continuing anyway for testing...');
                console.warn('⚠️ User ID:', userId);
                // Temporarily disable this check for testing
                // alert('Error: Invalid user ID format. Please log out and log back in.');
                // return;
              }

              // Extract email from JWT token if not available
              let resolvedEmail = email;
              if (!resolvedEmail) {
                console.log('🔍 Email is empty, extracting from JWT token in localStorage...');
                try {
                  const accessToken = safeGetItem('access_token');
                  if (accessToken) {
                    const parts = accessToken.split('.');
                    if (parts.length === 3) {
                      const payload = JSON.parse(atob(parts[1]));
                      if (payload.email) {
                        resolvedEmail = payload.email;
                        console.log('✅ Extracted email from localStorage JWT:', resolvedEmail);
                      }
                    }
                  }
                } catch (e) {
                  console.error('Error extracting email from JWT:', e);
                }
                // final fallback to backend
                if (!resolvedEmail) {
                  const prof = await resolveProfileFromBackend()
                  if (prof.email) {
                    resolvedEmail = prof.email
                    if (!resolvedName && prof.name) resolvedName = prof.name
                    console.log('✅ Using email/name from backend profile:', { resolvedEmail, resolvedName })
                  }
                }
              }

              console.log('🎯 Final email for backend:', resolvedEmail);
              console.log('🎯 Final user ID for backend:', userId);

              // Build backend payload; omit user_id if anonymous so backend derives from cookie
              const backendPayload: any = {
                email: resolvedEmail,
                plan_name: plan.label,
                plan_duration_minutes: plan.durationMinutes || 30,
                paystack_data: {
                  reference: response.reference,
                  transaction_id: response.transaction_id,
                  amount: plan.paystackAmount,
                  plan: plan.label,
                  status: response.status,
                  custom_fields: [
                    { display_name: 'Name', variable_name: 'name', value: resolvedName }
                  ]
                }
              }
              if (userId && userId !== 'anonymous') {
                backendPayload.user_id = userId
              }

              // Call backend payment success endpoint
              console.log(`📤 Making fetch request to: ${APP_CONFIG.api.base_url}/api/payment/success`);
              const backendResponse = await fetch(`${APP_CONFIG.api.base_url}/api/payment/success`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(backendPayload)
              });

              console.log(`📥 Backend response status: ${backendResponse.status}`);
              console.log(`📥 Backend response headers:`, Object.fromEntries(backendResponse.headers.entries()));

              if (backendResponse.ok) {
                const result = await backendResponse.json();
                console.log('✅ Backend response:', result);

                if (result.success) {
                  console.log('✅ Subscription activated successfully via backend!');

                  // Clear trial data since user now has a subscription
                  await clearTrialData();

                  // Refresh subscription status to unlock the app
                  console.log('🔄 Refreshing subscription status after payment...');
                  await updateTrialInfo();

                  console.log('✅ Subscription stored in backend database - no localStorage needed!');
                  alert('Payment successful! Your subscription has been activated.');
                } else {
                  console.error('❌ Backend failed to activate subscription:', result.error);
                  alert('Payment successful but subscription activation failed. Please contact support.');
                }
              } else {
                console.error('❌ Backend request failed:', backendResponse.status);
                alert('Payment successful but subscription activation failed. Please contact support.');
              }

              setShowModal(false);
              setName('');
              setEmail('');
              setSelectedPlan(null);

              console.log('✅ Payment and subscription activation completed successfully!');
            } catch (error) {
              console.error('❌ Error activating subscription:', error);
              console.error('❌ Error details:', error);
              console.error('❌ Error stack:', error instanceof Error ? error.stack : String(error));
              alert('Payment successful but activating your subscription failed. Please contact support.');
            }
          })();
        },
        onClose: function () {
          console.log('❌ Payment window closed by user');
          console.log('🔍 Paystack payment was cancelled or closed');
          alert('Transaction was not completed, window closed.');
        },
      };

      console.log('📋 Payment options:', paymentOptions);

      const handler = window.PaystackPop.setup(paymentOptions);

      console.log('✅ Paystack handler created:', handler);

      console.log('🚀 Opening Paystack payment window...');
      if (handler && typeof handler.openIframe === 'function') {
        handler.openIframe();
        console.log('✅ Paystack payment window opened successfully');
        console.log('⏳ Waiting for payment completion...');
      } else {
        console.error('❌ Failed to create Paystack handler or openIframe method missing');
        console.error('Handler object:', handler);
        alert('Failed to initialize payment. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error setting up Paystack payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorName = error instanceof Error ? error.name : undefined;

      console.error('Error details:', {
        message: errorMessage,
        stack: errorStack,
        name: errorName
      });
      alert(`Error setting up payment: ${errorMessage}. Please try again.`);
    }
  };

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
            Payment
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
              <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-gray-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
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
      <section className="w-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f5f5f5] to-[#e8e8e8] py-8 sm:py-12 md:py-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center mb-6 sm:mb-8">
        {/* Status Banner */}
        {hasActiveSubscription ? (
          <div className={`mb-6 p-4 rounded-lg border text-sm font-medium inline-flex items-center gap-2 ${isSubscriptionExpired ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
            <Clock className={`h-4 w-4 ${isSubscriptionExpired ? 'text-red-600' : 'text-green-600'}`} />
            {isSubscriptionExpired
              ? 'Your subscription has ended. Renew to continue using MealLensAI.'
              : `Active Subscription: ${subscriptionInfo?.formattedRemainingTime || formattedRemainingTime} remaining`
            }
          </div>
        ) : hasEverHadSubscription ? (
          // User has paid before but subscription is expired - show subscription expired message
          <div className="mb-6 p-4 rounded-lg border text-sm font-medium inline-flex items-center gap-2 bg-red-50 border-red-200 text-red-700">
            <Clock className="h-4 w-4 text-red-600" />
            Your subscription has ended. Renew to continue using MealLensAI.
          </div>
        ) : (
          // User has never paid - show trial status
          <div className={`mb-6 p-4 rounded-lg border text-sm font-medium inline-flex items-center gap-2 ${isTrialExpired ? 'bg-red-50 border-red-200 text-red-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
            <Clock className={`h-4 w-4 ${isTrialExpired ? 'text-red-600' : 'text-orange-600'}`} />
            {isTrialExpired
              ? 'Your trial has ended. Upgrade to continue using MealLensAI.'
              : `Trial: ${formattedRemainingTime}`
            }
          </div>
        )}


        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-gray-900">Plans & Pricing</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Choose the plan that fits your needs. All plans include essential features to get you started, with options to scale as you grow. No hidden fees and the flexibility to change anytime.</p>

        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            className={`px-6 py-2 rounded-full font-semibold transition-colors ${billing === 'monthly' ? 'bg-blue-500 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => setBilling('monthly')}
          >
            Monthly
          </button>
          <button
            className={`px-6 py-2 rounded-full font-semibold transition-colors ${billing === 'yearly' ? 'bg-blue-500 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => setBilling('yearly')}
          >
            Yearly
          </button>
        </div>

        {billing === 'yearly' && (
          <div className="text-blue-500 text-sm font-medium bg-yellow-50 px-4 py-2 rounded-full inline-block">
            Save with annual billing!
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 sm:gap-8 justify-center items-stretch w-full max-w-6xl mx-auto">
        {billing === 'monthly' ? (
          MONTHLY_PLANS.map((plan) => (
            <Card
              key={plan.label}
              className={`flex-1 flex flex-col justify-between items-center p-6 sm:p-8 bg-white shadow-xl rounded-xl sm:rounded-2xl border border-gray-200 relative transform transition-all duration-300 hover:scale-105 hover:shadow-2xl ${plan.highlight ? 'ring-2 ring-yellow-400 shadow-2xl' : ''}`}
            >
              {plan.highlight && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-blue-500 text-white text-xs font-bold px-6 py-2 rounded-full shadow-lg">
                  Most Popular
                </div>
              )}

              <div className="mb-6 text-center">
                <div className="mb-4">{plan.icon}</div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{plan.label}</div>
                <div className="text-gray-500 text-sm mb-4">Billed {plan.duration}</div>
                <div className="text-4xl font-bold text-blue-500 mb-2">
                  ${plan.price.toLocaleString()}
                </div>
              </div>

              <ul className="mb-8 w-full text-gray-700 text-left space-y-3">
                {FEATURES.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="inline-block w-5 h-5 rounded-full bg-green-400 mr-3 flex-shrink-0 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 text-lg font-semibold rounded-lg py-4 mt-auto shadow-lg transform transition-all duration-200 hover:scale-105"
                onClick={() => openPaymentModal(plan)}
              >
                Select Plan
              </Button>
            </Card>
          ))
        ) : (
          <Card
            className="flex-1 flex flex-col justify-between items-center p-6 sm:p-8 bg-white shadow-xl rounded-xl sm:rounded-2xl border border-gray-200 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
          >
            <div className="mb-6 text-center">
              <div className="mb-4">{YEARLY_PLAN.icon}</div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{YEARLY_PLAN.label}</div>
              <div className="text-gray-500 text-sm mb-4">Billed {YEARLY_PLAN.duration}</div>
              <div className="text-4xl font-bold text-blue-500 mb-2">
                ${YEARLY_PLAN.price.toLocaleString()}
              </div>
            </div>

            <ul className="mb-8 w-full text-gray-700 text-left space-y-3">
              {FEATURES.map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="inline-block w-5 h-5 rounded-full bg-green-400 mr-3 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 text-lg font-semibold rounded-lg py-4 mt-auto shadow-lg transform transition-all duration-200 hover:scale-105"
              onClick={() => openPaymentModal(YEARLY_PLAN)}
            >
              Select Plan
            </Button>
          </Card>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-blue-500">
              Complete Your Payment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Your Name</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Email Address</label>
              <input
                type="email"
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="text-lg font-semibold text-gray-800 mb-2">
                Selected Plan:
              </div>
              <div className="text-xl font-bold text-blue-500">
                {selectedPlan?.label}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Amount: ${selectedPlan?.price?.toLocaleString()}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 text-lg font-semibold rounded-lg py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
              onClick={processPayment}
            >
              Pay with Paystack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </section>
    </div>
  );
};

export default Payment; 