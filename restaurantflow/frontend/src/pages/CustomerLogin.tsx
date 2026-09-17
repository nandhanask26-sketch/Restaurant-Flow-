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
  KeyRound,
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
  const [fallbackOtp, setFallbackOtp] = useState<string | null>(null);

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

  useEffect(() => {
    if (isAuthenticated && user) {
      const isManager =
        user.role === 'RESTAURANT_MANAGER' ||
        user.role === 'MANAGER' ||
        user.role === 'ADMIN';
      navigate(isManager ? '/manager/dashboard' : '/customer/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

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

      if (resData?.fallbackOtp) {
        setFallbackOtp(resData.fallbackOtp);
        const digits = resData.fallbackOtp.split('').slice(0, 6);
        setOtpDigits(digits);
        setSuccessMsg(`Verification code: ${resData.fallbackOtp}`);
      } else {
        setFallbackOtp(null);
        setOtpDigits(['', '', '', '', '', '']);
        setSuccessMsg(`6-digit verification code sent to ${masked}`);
      }

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
        {/* EMAIL OTP INPUT STEP */}
        {/* ========================================================================= */}
        {step === 'INPUT' && (
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

            {/* Quick-Verify / Fallback Code Badge */}
            {fallbackOtp && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="text-xs text-emerald-300">
                    <span className="font-semibold">Verification Code:</span>{' '}
                    <span className="font-mono font-bold tracking-widest text-white text-sm bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                      {fallbackOtp}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const digits = fallbackOtp.split('').slice(0, 6);
                    setOtpDigits(digits);
                    handleVerifyOtp(fallbackOtp);
                  }}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 ml-2"
                >
                  Verify Now
                </button>
              </div>
            )}

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
