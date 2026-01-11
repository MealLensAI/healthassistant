import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Mail, CheckCircle, XCircle, Clock, User, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/Logo';
import { APP_CONFIG } from '@/lib/config';

interface InvitationDetails {
    id: string;
    email: string;
    role: string;
    message?: string;
    enterprise?: {
        id: string;
        name: string;
        organization_type: string;
    } | null;
    enterprise_name?: string;
    organization_type?: string;
    inviter?: {
        id: string;
        email: string;
        name: string;
    } | null;
}

export default function AcceptInvitation() {
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAccepting, setIsAccepting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [requiresRegistration, setRequiresRegistration] = useState(false);
    const [pendingInvitation, setPendingInvitation] = useState<any>(null);

    useEffect(() => {
        // Check if user is logged in
        const authToken = localStorage.getItem('access_token') || localStorage.getItem('token');
        const userIsLoggedIn = !!authToken;
        setIsLoggedIn(userIsLoggedIn);

        if (token) {
            verifyInvitation().then(() => {
                // After verifying invitation, if user is not logged in, show registration form immediately
                if (!userIsLoggedIn && invitation) {
                    setRequiresRegistration(true);
                    setPendingInvitation(invitation);
                }
            });
        } else {
            setError('Invalid invitation link');
            setIsLoading(false);
        }
    }, [token]);

    const verifyInvitation = async () => {
        try {
            // Properly encode the token for URL path
            const encodedToken = encodeURIComponent(token || '');
            const response = await fetch(`${APP_CONFIG.api.base_url}/api/enterprise/invitation/verify/${encodedToken}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Invalid invitation');
            }

            setInvitation(data.invitation);
        } catch (error: any) {
            setError(error.message || 'Failed to verify invitation');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = async () => {
        setIsAccepting(true);

        try {
            const authToken = localStorage.getItem('access_token') || localStorage.getItem('token');
            const response = await fetch(`${APP_CONFIG.api.base_url}/api/enterprise/invitation/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken && { 'Authorization': `Bearer ${authToken}` })
                },
                body: JSON.stringify({ token })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to accept invitation');
            }

            if (data.requires_registration) {
                // User needs to register first - show registration form
                setRequiresRegistration(true);
                setPendingInvitation(data.invitation || invitation);
                toast({
                    title: 'Create Your Account',
                    description: 'Please create a password to complete your registration and accept the invitation.'
                });
            } else {
                // User is already logged in and invitation accepted
                toast({
                    title: 'Success!',
                    description: 'Invitation accepted! Welcome to the organization. Redirecting to your dashboard...'
                });

                // Clear the stored invitation token
                localStorage.removeItem('invitation_token');

                // Redirect to enterprise dashboard if user is part of an organization, otherwise normal dashboard
                // Check if user has enterprise access
                const userData = localStorage.getItem('user_data');
                const hasEnterprise = userData ? (JSON.parse(userData)?.metadata?.signup_type === 'organization' || JSON.parse(userData)?.user_metadata?.signup_type === 'organization') : false;
                
                setTimeout(() => {
                    navigate(hasEnterprise ? '/enterprise' : '/ai-kitchen', { replace: true });
                }, 1500);
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to accept invitation',
                variant: 'destructive'
            });
        } finally {
            setIsAccepting(false);
        }
    };

    const handleRegisterAndAccept = async (userData: any) => {
        // Invitation is automatically accepted by the backend on registration/login
        // Just redirect to the enterprise dashboard
        toast({
            title: 'Success!',
            description: 'Account created and invitation accepted! Welcome to the organization. Redirecting to your dashboard...'
        });

        // Clear the stored invitation token
        localStorage.removeItem('invitation_token');

        // Redirect to enterprise dashboard since user accepted an organization invitation
        setTimeout(() => {
            navigate('/enterprise', { replace: true });
        }, 1500);
    };

    const handleDecline = () => {
        toast({
            title: 'Declined',
            description: 'Invitation declined'
        });
        navigate('/');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-gray-600">Verifying invitation...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Invalid Invitation</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <Button onClick={() => navigate('/')}>
                            Go to Home
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center space-y-4 pb-6">
                    <div className="flex justify-center">
                        <Logo />
                    </div>
                    <div>
                        <CardTitle className="text-2xl">You're Invited!</CardTitle>
                        <p className="text-gray-600 mt-2">
                            You've been invited to join an organization on MeallensAI
                        </p>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {requiresRegistration && pendingInvitation ? (
                        <RegistrationForm
                            invitation={pendingInvitation}
                            onRegister={handleRegisterAndAccept}
                        />
                    ) : invitation && (
                        <>
                            {/* Organization Info */}
                            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 space-y-4">
                                <div className="flex items-center space-x-3">
                                    <div className="p-3 bg-white">
                                        <Building2 className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Organization</p>
                                        <p className="font-semibold text-lg">
                                            {invitation.enterprise?.name || invitation.enterprise_name || 'Unknown Organization'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <div className="p-3 bg-white">
                                        <Mail className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Your Email</p>
                                        <p className="font-semibold">{invitation.email}</p>
                                    </div>
                                </div>

                                {/* Inviter Info */}
                                {invitation.inviter && (
                                    <div className="flex items-center space-x-3">
                                        <div className="p-3 bg-white">
                                            <User className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Invited By</p>
                                            <p className="font-semibold">
                                                {invitation.inviter.name || invitation.inviter.email || 'Administrator'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center space-x-2">
                                    {(invitation.enterprise?.organization_type || invitation.organization_type) && (
                                        <Badge variant="outline" className="capitalize">
                                            {invitation.enterprise?.organization_type || invitation.organization_type}
                                        </Badge>
                                    )}
                                    {invitation.role && (
                                        <Badge variant="secondary" className="capitalize">
                                            {invitation.role}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Personal Message */}
                            {invitation.message && (
                                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                                    <p className="text-sm font-medium text-blue-900 mb-1">Personal Message</p>
                                    <p className="text-sm text-blue-800 italic">"{invitation.message}"</p>
                                </div>
                            )}

                            {/* Benefits */}
                            <div className="space-y-2">
                                <p className="font-medium">What you'll get:</p>
                                <ul className="space-y-2 text-sm text-gray-600">
                                    <li className="flex items-start space-x-2">
                                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                        <span>Access to AI-powered food detection and analysis</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                        <span>Personalized meal planning tailored to your needs</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                        <span>Nutritional guidance from your healthcare provider</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                        <span>Track your nutrition and health progress</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Action Buttons */}
                            {!isLoggedIn && (
                                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                                    <p className="text-sm text-blue-800">
                                        <strong>Create Your Account:</strong> You'll be able to create your password after accepting this invitation.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-3">
                                <Button
                                    onClick={isLoggedIn ? handleAccept : () => {
                                        setPendingInvitation(invitation);
                                        setRequiresRegistration(true);
                                    }}
                                    className="w-full"
                                    disabled={isAccepting}
                                    size="lg"
                                >
                                    {isAccepting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            {isLoggedIn ? 'Accept Invitation' : 'Create Account & Accept'}
                                        </>
                                    )}
                                </Button>

                                <Button
                                    onClick={handleDecline}
                                    variant="outline"
                                    className="w-full"
                                    disabled={isAccepting}
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Decline
                                </Button>
                            </div>

                            {/* Footer Info */}
                            <div className="text-center text-xs text-gray-500 pt-4 border-t">
                                <p className="flex items-center justify-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>This invitation will expire in 7 days</span>
                                </p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Registration form component for unregistered users
function RegistrationForm({ invitation, onRegister }: { invitation: any, onRegister: (userData: any) => void }) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        password: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast({
                title: 'Error',
                description: 'Passwords do not match',
                variant: 'destructive'
            });
            return;
        }

        if (formData.password.length < 6) {
            toast({
                title: 'Error',
                description: 'Password must be at least 6 characters',
                variant: 'destructive'
            });
            return;
        }

        setIsLoading(true);

        try {
            // Register the user
            const response = await fetch(`${APP_CONFIG.api.base_url}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: invitation.email,
                    password: formData.password,
                    first_name: formData.firstName,
                    last_name: formData.lastName
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // If user already exists (409), try to log them in instead
                if (response.status === 409 && (data.error_type === 'user_already_exists' || data.error_type === 'duplicate_email')) {
                    // User exists, try to log in with the password they provided
                    const loginResponse = await fetch(`${APP_CONFIG.api.base_url}/api/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            email: invitation.email,
                            password: formData.password
                        })
                    });

                    const loginData = await loginResponse.json();

                    if (!loginResponse.ok) {
                        throw new Error(loginData.error || data.message || 'Account exists but login failed. Please use the correct password.');
                    }

                    // Store the auth token
                    if (loginData.access_token) {
                        localStorage.setItem('access_token', loginData.access_token);
                    }

                    // Complete the invitation
                    onRegister(loginData);
                    return;
                }
                throw new Error(data.message || data.error || 'Registration failed');
            }

            // Registration successful, now we need to log the user in
            // Try to log in with the credentials
            const loginResponse = await fetch(`${APP_CONFIG.api.base_url}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: invitation.email,
                    password: formData.password
                })
            });

            const loginData = await loginResponse.json();

            if (!loginResponse.ok) {
                throw new Error(loginData.error || 'Registration successful but login failed');
            }

            // Store the auth token
            if (loginData.access_token) {
                localStorage.setItem('access_token', loginData.access_token);
            }

            // Complete the invitation
            onRegister(loginData);
        } catch (error: any) {
            toast({
                title: 'Registration Failed',
                description: error.message || 'Failed to create account',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Organization Info */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 space-y-4">
                <div className="flex items-center space-x-3">
                    <div className="p-3 bg-white">
                        <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">{invitation.enterprise_name}</h3>
                        <p className="text-sm text-gray-600">Organization</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="p-3 bg-white">
                        <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold">{invitation.email}</h3>
                        <p className="text-sm text-gray-600">Your Email</p>
                    </div>
                </div>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                                id="firstName"
                                type="text"
                                placeholder="First name"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="pl-10"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                                id="lastName"
                                type="text"
                                placeholder="Last name"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="pl-10"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                            id="password"
                            type="password"
                            placeholder="Create a password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="pl-10"
                            required
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirm your password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="pl-10"
                            required
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                >
                    {isLoading ? 'Creating Account...' : 'Create Account & Join Organization'}
                </Button>
            </form>

            <div className="text-center text-xs text-gray-500 pt-4 border-t">
                <p className="flex items-center justify-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>This invitation will expire in 7 days</span>
                </p>
            </div>
        </div>
    );
}

