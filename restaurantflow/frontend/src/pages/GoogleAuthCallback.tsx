import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { RotateCw, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export const GoogleAuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [appDeepLink, setAppDeepLink] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Extract token from hash or query parameters
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const queryParams = new URLSearchParams(window.location.search);

        const idToken =
          hashParams.get('id_token') ||
          hashParams.get('access_token') ||
          queryParams.get('credential') ||
          queryParams.get('token') ||
          queryParams.get('access_token');

        if (!idToken) {
          setError('No authentication token received from Google.');
          setTimeout(() => navigate('/login'), 2500);
          return;
        }

        const { data } = await apiClient.post('/auth/google', {
          credential: idToken,
        });

        const { user, accessToken, refreshToken } = data.data;
        setAuth(user, accessToken, refreshToken);
        setSuccess(true);

        const isManager =
          user.role === 'RESTAURANT_MANAGER' ||
          user.role === 'MANAGER' ||
          user.role === 'ADMIN';

        const destination = isManager ? '/manager/dashboard' : '/customer/dashboard';

        // Deep link back into native APK if user came from Android app
        const deepLink = `restaurantflow://auth/callback?token=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`;
        setAppDeepLink(deepLink);

        if (Capacitor.isNativePlatform()) {
          await Browser.close().catch(() => {});
          navigate(destination, { replace: true });
        } else {
          // On mobile browser, attempt to redirect back to app or navigate locally
          const isMobileDevice = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
          if (isMobileDevice) {
            // Attempt deep link
            setTimeout(() => {
              window.location.href = deepLink;
            }, 300);
          }

          // Also set fallback navigation for regular web browsers
          setTimeout(() => {
            navigate(destination, { replace: true });
          }, 1500);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Google sign-in verification failed.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleAuth();
  }, [navigate, setAuth]);

  return (
    <div className="min-h-screen bg-[#FAF7F0] dark:bg-[#0B0F17] flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-8 bg-white dark:bg-slate-900 border border-[#EADBCC] dark:border-slate-800 rounded-3xl shadow-2xl text-center space-y-4">
        {error ? (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900 dark:text-slate-100">Sign In Failed</h3>
            <p className="text-xs text-rose-500">{error}</p>
            <p className="text-[11px] text-stone-400">Redirecting to login...</p>
          </div>
        ) : success ? (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900 dark:text-slate-100">Authentication Successful!</h3>
            <p className="text-xs text-stone-500 dark:text-slate-400">Welcome to RestaurantFlow.</p>
            {appDeepLink && (
              <a
                href={appDeepLink}
                className="btn-primary w-full py-3 px-4 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 mt-2"
              >
                <span>Return to RestaurantFlow App</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <RotateCw className="w-8 h-8 animate-spin text-brand-600 dark:text-brand-400 mx-auto" />
            <h3 className="text-base font-bold text-stone-900 dark:text-slate-100">Signing in with Google...</h3>
            <p className="text-xs text-stone-500 dark:text-slate-400">Verifying your Google account securely.</p>
          </div>
        )}
      </div>
    </div>
  );
};
