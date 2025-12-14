import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/utils';
import { APP_CONFIG } from '@/lib/config';

const LogoutAndLogin: React.FC = () => {
    const navigate = useNavigate();
    const { clearSession } = useAuth();

    useEffect(() => {
        const handleLogoutAndRedirect = async () => {
            try {
                // Clear the current session
                clearSession();

                // Call backend logout to clear any httpOnly cookies
                try {
                    await fetch(`${APP_CONFIG.api.base_url}/api/logout`, {
                        method: 'POST',
                        credentials: 'include'
                    });
                } catch (error) {
                    console.log('Backend logout failed, continuing...');
                }

                // Redirect to login page
                setTimeout(() => {
                    navigate('/login');
                }, 500);

            } catch (error) {
                console.error('Error during logout:', error);
                // Even if logout fails, redirect to login
                navigate('/login');
            }
        };

        handleLogoutAndRedirect();
    }, [clearSession, navigate]);

    return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Logging out...</h2>
                <p className="text-gray-600">Please wait while we log you out and redirect you to the login page.</p>
            </div>
        </div>
    );
};

export default LogoutAndLogin;
