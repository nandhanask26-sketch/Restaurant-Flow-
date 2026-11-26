import React from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { apiClient } from '../api/client';

export type GoogleAuthPortal = 'CUSTOMER' | 'MANAGER';

export interface GoogleAuthSuccessPayload {
  user: any;
  accessToken: string;
  refreshToken: string;
  restaurantId?: string | null;
}

interface GoogleSignInButtonProps {
  portal: GoogleAuthPortal;
  disabled?: boolean;
  label?: string;
  onLoadingChange: (loading: boolean) => void;
  onError: (message: string | null) => void;
  onSuccess: (payload: GoogleAuthSuccessPayload) => void;
}

/**
 * Shared Google OAuth button supporting Capacitor Chrome Custom Tabs,
 * Google Identity Services token popup, and redirect fallback.
 */
export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  portal,
  disabled = false,
  label = 'Continue with Google',
  onLoadingChange,
  onError,
  onSuccess,
}) => {
  const handleGoogleSignIn = async () => {
    onError(null);
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      onError(
        'Google OAuth requires your Google Client ID. Please add VITE_GOOGLE_CLIENT_ID in your frontend .env file.'
      );
      return;
    }

    const oauthState = portal.toLowerCase();

    // 1. Mobile APK (Android Capacitor): Open Google OAuth in Chrome Custom Tab
    if (Capacitor.isNativePlatform()) {
      try {
        onLoadingChange(true);
        const redirectUri = 'https://restaurantflow-frontend.onrender.com/auth/google/callback';
        const nonce = Math.random().toString(36).substring(2);
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token%20id_token&scope=openid%20email%20profile&prompt=select_account&nonce=${nonce}&state=${encodeURIComponent(oauthState)}`;
        await Browser.open({ url: authUrl, windowName: '_system' });
      } catch {
        onError('Failed to launch Google Sign-In browser. Please try again.');
      } finally {
        onLoadingChange(false);
      }
      return;
    }

    // 2. Web Browser: Use Google OAuth 2.0 Account Chooser (prompt: select_account)
    const google = (window as any).google;
    if (google?.accounts?.oauth2) {
      try {
        onLoadingChange(true);
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          prompt: 'select_account',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.access_token) {
              try {
                const { data } = await apiClient.post('/auth/google', {
                  credential: tokenResponse.access_token,
                  portal,
                });
                const { user, accessToken, refreshToken, restaurantId } = data.data;
                onSuccess({ user, accessToken, refreshToken, restaurantId });
              } catch (authErr: any) {
                onError(
                  authErr.response?.data?.message || 'Google sign-in failed. Please try again.'
                );
              } finally {
                onLoadingChange(false);
              }
            } else {
              onLoadingChange(false);
              if (tokenResponse?.error && tokenResponse.error !== 'user_cancelled') {
                onError(`Google sign-in failed: ${tokenResponse.error}`);
              }
            }
          },
          error_callback: () => {
            onLoadingChange(false);
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (oauthErr) {
        console.warn('Fallback to redirect OAuth:', oauthErr);
      }
    }

    // 3. Fallback: Full page redirect to Google OAuth account chooser
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const nonce = Math.random().toString(36).substring(2);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token%20id_token&scope=openid%20email%20profile&prompt=select_account&nonce=${nonce}&state=${encodeURIComponent(oauthState)}`;
    window.location.href = authUrl;
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={disabled}
      className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-stone-50 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-stone-800 dark:text-slate-100 font-semibold text-sm flex items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all border border-[#E2DDD3] dark:border-slate-700/80 hover:border-stone-300 dark:hover:border-slate-600 active:scale-[0.99] disabled:opacity-50"
    >
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
};
