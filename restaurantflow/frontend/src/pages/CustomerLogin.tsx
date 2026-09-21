import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Mail,
  RotateCw,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

export const CustomerLogin: React.FC = () => {
  // Input states
  const [emailAddress, setEmailAddress] = useState('');

  // OTP Verification Flow State
  const [step, setStep] = useState<'INPUT' | 'VERIFY'>('INPUT');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);

  // Timers: 5-minute expiry timer & 30-second resend cooldown
  const [expirySeconds, setExpirySeconds] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const { isAuthenticated, user, setAuth } = useAuthStore();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const googleBtnContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      const isManager =
        user.role === 'RESTAURANT_MANAGER' ||
        user.role === 'MANAGER' ||
        user.role === 'ADMIN';
      navigate(isManager ? '/manager/dashboard' : '/customer/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Initialize Google Identity Services if client ID is present
  useEffect(() => {
    const initGoogleGsi = () => {
      const google = (window as any).google;
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (google?.accounts?.id && clientId && googleBtnContainerRef.current) {
        try {
          google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: any) => {
              if (response.credential) {
                setLoading(true);
                setError(null);
                try {
                  const { data } = await apiClient.post('/auth/google', {
                    credential: response.credential,
                  });
                  const { user, accessToken, refreshToken } = data.data;
                  setAuth(user, accessToken, refreshToken);
                  navigate('/customer/dashboard');
                } catch (authErr: any) {
                  setError(authErr.response?.data?.message || 'Google sign-in failed. Please try again.');
                } finally {
                  setLoading(false);
                }
              }
            },
          });

          google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'filled_blue',
            size: 'large',
            width: 320,
            shape: 'pill',
            text: 'continue_with',
          });
        } catch (err) {
          console.warn('GSI render error:', err);
        }
      }
    };

    initGoogleGsi();
    const timer = setTimeout(initGoogleGsi, 1200);
    return () => clearTimeout(timer);
  }, [step]);

  // Google Sign-In Trigger
  const handleGoogleSignIn = () => {
    setError(null);
    const google = (window as any).google;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!google?.accounts?.id) {
      setError('Google Sign-In is loading. Please check your internet connection or use Email OTP below.');
      return;
    }

    if (!clientId) {
      setError('Google Client ID is not configured yet in VITE_GOOGLE_CLIENT_ID. Please use Email OTP below to receive your 6-digit code.');
      return;
    }

    setLoading(true);
    google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: any) => {
        if (response.credential) {
          try {
            const { data } = await apiClient.post('/auth/google', {
              credential: response.credential,
            });
            const { user, accessToken, refreshToken } = data.data;
            setAuth(user, accessToken, refreshToken);
            navigate('/customer/dashboard');
          } catch (authErr: any) {
            setError(authErr.response?.data?.message || 'Google sign-in failed. Please try again.');
          } finally {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      },
    });

    google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed()) {
        setError('Google popup was suppressed by your browser. Please allow popups or use Email OTP below.');
        setLoading(false);
      } else if (notification.isSkippedMoment()) {
        setLoading(false);
      }
    });
  };

  // Expiry and Resend Countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'VERIFY') {
      interval = setInterval(() => {
        setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step]);

  // Format seconds to MM:SS
  const formatTimer = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 1. Send Email OTP
  const handleSendOtp = async (customEmail?: string) => {
    const targetEmail = (customEmail || emailAddress).trim().toLowerCase();

    if (!targetEmail || !targetEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { data } = await apiClient.post('/auth/email/send-otp', { email: targetEmail });
      const resData = data?.data;

      // Mask email for UI display (e.g., na••••@gmail.com)
      const [name, domain] = targetEmail.split('@');
      const masked = `${name.slice(0, 2)}••••@${domain}`;

      setEmailAddress(targetEmail);
      setMaskedEmail(masked);
      setStep('VERIFY');
      setExpirySeconds(300);
      setResendCooldown(resData?.cooldownSeconds || 30);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMsg(`A 6-digit verification code has been sent to ${masked}. Please check your email inbox.`);

      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      console.error('Failed to send OTP:', err);
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to dispatch verification code. Please check your email and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle OTP Digits Change
  const handleOtpChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit upon filling all 6 digits
    if (cleanVal && index === 5 && newDigits.every((d) => d !== '')) {
      handleVerifyOtp(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split('');
      setOtpDigits(digits);
      inputRefs.current[5]?.focus();
      handleVerifyOtp(pasted);
    }
  };

  // 3. Verify Email OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const otp = codeToVerify || otpDigits.join('');
    if (otp.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    if (expirySeconds === 0) {
      setError('This verification code has expired. Please request a new code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post('/auth/email/verify-otp', {
        email: emailAddress,
        otp,
      });

      const { user, accessToken, refreshToken } = data.data;
      setAuth(user, accessToken, refreshToken);
      navigate('/customer/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Invalid or expired verification code. Please check and try again.'
      );
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex items-center justify-center p-4 selection:bg-brand-500 selection:text-white relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="glass-card max-w-md w-full p-6 sm:p-8 rounded-3xl relative z-10 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
        {/* Back Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => {
              if (step === 'VERIFY') {
                setStep('INPUT');
                setError(null);
                setSuccessMsg(null);
              } else {
                navigate('/');
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold border border-slate-700/50 hover:border-slate-600 transition-all group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{step === 'VERIFY' ? 'Back' : 'Back to Home'}</span>
          </button>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Restaurant<span className="text-brand-400">Flow</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-slate-100">Customer Login</h2>
          <p className="text-xs text-slate-400 mt-1">
            Sign in with your Email Address to receive a verification code
          </p>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* EMAIL OTP / GOOGLE LOGIN INPUT STEP */}
        {/* ========================================================================= */}
        {step === 'INPUT' && (
          <div className="space-y-4">
            {/* Google Sign-In Option */}
            <div className="space-y-2">
              <div ref={googleBtnContainerRef} className="flex justify-center empty:hidden"></div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md transition-all border border-slate-200 active:scale-[0.99] disabled:opacity-50"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
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
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-800"></div>
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Or Continue With Email
              </span>
              <div className="flex-1 h-px bg-slate-800"></div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendOtp();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="Enter your email (e.g. name@gmail.com)"
                  className="glass-input pl-10 text-sm"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                We will send a 6-digit verification code to your email.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !emailAddress.includes('@')}
              className="btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-glow mt-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  Sending Verification Code...
                </>
              ) : (
                <>
                  Send Verification Code
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6-DIGIT OTP VERIFICATION SCREEN */}
        {/* ========================================================================= */}
        {step === 'VERIFY' && (
          <div className="space-y-5">
            <div className="text-center p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs text-slate-400">Enter the 6-digit code sent to:</div>
              <div className="text-sm font-bold text-brand-400 mt-0.5 flex items-center justify-center gap-1.5 font-mono">
                <Mail className="w-3.5 h-3.5" />
                <span>{maskedEmail || emailAddress}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('INPUT');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-[11px] text-slate-400 hover:text-white underline mt-1.5 inline-block"
              >
                Change Email Address
              </button>
            </div>

            {/* 6 Digit Numeric Input Cells */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-300">
                  Verification Code
                </label>
                <span className={`text-[11px] font-mono font-semibold ${expirySeconds < 60 ? 'text-rose-400' : 'text-slate-400'}`}>
                  Expires in {formatTimer(expirySeconds)}
                </span>
              </div>
              <div className="flex justify-between gap-1.5 sm:gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl text-white outline-none transition"
                  />
                ))}
              </div>
            </div>

            {/* Verify & Continue Button */}
            <button
              type="button"
              onClick={() => handleVerifyOtp()}
              disabled={loading || otpDigits.some((d) => d === '') || expirySeconds === 0}
              className="btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-glow disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  Verifying Code...
                </>
              ) : (
                <>
                  Verify & Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Resend Code Button & Cooldown */}
            <div className="text-center pt-1">
              {canResend ? (
                <button
                  type="button"
                  onClick={() => handleSendOtp(emailAddress)}
                  className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition flex items-center gap-1 mx-auto"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Resend Verification Code
                </button>
              ) : (
                <span className="text-xs text-slate-500">
                  Resend code in <strong className="text-slate-400 font-mono">{resendCooldown}s</strong>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
