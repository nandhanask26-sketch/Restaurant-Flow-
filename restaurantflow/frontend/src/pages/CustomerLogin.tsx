import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  UtensilsCrossed, 
  ArrowRight, 
  AlertCircle, 
  Mail, 
  Phone, 
  KeyRound, 
  RotateCw, 
  CheckCircle2, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles 
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

export const CustomerLogin: React.FC = () => {
  // Login Mode: 'OTP' (Default) or 'PASSWORD'
  const [loginMode, setLoginMode] = useState<'OTP' | 'PASSWORD'>('OTP');

  // OTP Flow State
  const [step, setStep] = useState<'IDENTIFIER' | 'VERIFY'>('IDENTIFIER');
  const [identifier, setIdentifier] = useState('9876543211');
  const [channel, setChannel] = useState<'EMAIL' | 'PHONE'>('PHONE');
  const [maskedTarget, setMaskedTarget] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');

  // Timer for Resend OTP
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Password Flow State
  const [email, setEmail] = useState('customer@restaurantflow.com');
  const [password, setPassword] = useState('Customer@123');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Navigation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'VERIFY' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Step 1: Send OTP to Email or Phone
  const handleSendOtp = async (e?: React.FormEvent, customTarget?: string) => {
    if (e) e.preventDefault();
    const targetToSend = customTarget || identifier;
    if (!targetToSend.trim()) {
      setError('Please enter your email or phone number');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { data } = await apiClient.post('/auth/otp/send', { identifier: targetToSend.trim() });
      const { channel, maskedTarget, debugCode } = data.data;

      setChannel(channel);
      setMaskedTarget(maskedTarget);
      setDebugCode(debugCode || null);
      setStep('VERIFY');
      setCountdown(60);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMsg(`Verification code sent to your ${channel.toLowerCase()}!`);

      // Auto-focus first OTP cell
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    // Auto-advance
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all 6 digits entered
    if (cleanVal && index === 5 && newDigits.every((d) => d !== '')) {
      handleVerifyOtp(newDigits.join(''));
    }
  };

  // Handle OTP backspace & keyboard navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle pasting full 6-digit code
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

  // Step 2: Verify OTP and Login
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || otpDigits.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post('/auth/otp/verify', {
        identifier: identifier.trim(),
        code: fullCode,
        fullName: fullName.trim() || undefined,
      });

      const { user, accessToken, refreshToken } = data.data;
      setAuth(user, accessToken, refreshToken);

      navigate('/customer/menu');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Standard Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken, restaurantId } = data.data;

      setAuth(user, accessToken, refreshToken, restaurantId);

      if (user.role === 'RESTAURANT_MANAGER') {
        navigate('/manager/dashboard');
      } else {
        navigate('/customer/menu');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-detect input type
  const isInputEmail = identifier.includes('@');

  return (
    <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card p-6 sm:p-8 bg-slate-900/90 border-slate-800 rounded-3xl shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Restaurant<span className="text-brand-400">Flow</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-slate-100">Customer Sign In</h2>
          <p className="text-xs text-slate-400 mt-1">
            {loginMode === 'OTP' 
              ? 'Instant sign in with verification code sent to your email or phone' 
              : 'Sign in using your account email and password'}
          </p>
        </div>

        {/* Tab Switcher: Verification Code (OTP) vs Password */}
        <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setLoginMode('OTP');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 ${
              loginMode === 'OTP'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Verification Code (OTP)
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('PASSWORD');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 ${
              loginMode === 'PASSWORD'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Password
          </button>
        </div>

        {/* Alerts */}
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
        {/* OTP / VERIFICATION CODE MODE */}
        {/* ========================================================================= */}
        {loginMode === 'OTP' && (
          <>
            {step === 'IDENTIFIER' ? (
              <form onSubmit={(e) => handleSendOtp(e)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Address or Mobile Phone Number
                  </label>
                  <div className="relative">
                    {isInputEmail ? (
                      <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-brand-400" />
                    ) : (
                      <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-brand-400" />
                    )}
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. rahul@example.com or 9876543210"
                      className="glass-input pl-10 text-sm"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <span>💡 We'll dispatch a 6-digit security code to this {isInputEmail ? 'email' : 'phone number'}.</span>
                  </p>
                </div>

                {/* Demo Quick Fill Buttons */}
                <div className="pt-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Demo Quick Sign-In
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIdentifier('9876543211');
                        handleSendOtp(undefined, '9876543211');
                      }}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-left text-xs transition group"
                    >
                      <div className="font-semibold text-white group-hover:text-brand-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-400" /> Phone Sign-In
                      </div>
                      <div className="text-[10px] text-slate-400">9876543211</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIdentifier('customer@restaurantflow.com');
                        handleSendOtp(undefined, 'customer@restaurantflow.com');
                      }}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-left text-xs transition group"
                    >
                      <div className="font-semibold text-white group-hover:text-brand-400 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-blue-400" /> Email Sign-In
                      </div>
                      <div className="text-[10px] text-slate-400">customer@...</div>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 shadow-glow mt-2"
                >
                  {loading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Dispatching Code...
                    </>
                  ) : (
                    <>
                      Send Verification Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* STEP 2: ENTER 6-DIGIT VERIFICATION CODE */
              <div className="space-y-5">
                <div className="text-center p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="text-xs text-slate-400">Enter the 6-digit code sent to:</div>
                  <div className="text-sm font-bold text-brand-400 mt-0.5 flex items-center justify-center gap-1.5">
                    {channel === 'EMAIL' ? <Mail className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                    <span>{maskedTarget || identifier}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('IDENTIFIER');
                      setError(null);
                    }}
                    className="text-[11px] text-slate-400 hover:text-white underline mt-1.5 inline-block"
                  >
                    Change Email / Phone
                  </button>
                </div>

                {/* Development Debug Banner */}
                {debugCode && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      Verification Code: <strong className="font-mono text-sm tracking-widest text-amber-200">{debugCode}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const digits = debugCode.split('');
                        setOtpDigits(digits);
                        handleVerifyOtp(debugCode);
                      }}
                      className="px-2 py-1 bg-amber-400 text-slate-950 text-[10px] font-bold rounded-lg hover:bg-amber-300"
                    >
                      Auto-Fill
                    </button>
                  </div>
                )}

                {/* 6 Digit Input Cells */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 text-center">
                    Enter 6-Digit Code
                  </label>
                  <div className="flex justify-between gap-1.5 sm:gap-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (inputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
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

                {/* Verify Button */}
                <button
                  type="button"
                  onClick={() => handleVerifyOtp()}
                  disabled={loading || otpDigits.some((d) => d === '')}
                  className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 shadow-glow"
                >
                  {loading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Verifying & Logging In...
                    </>
                  ) : (
                    <>
                      Verify & Sign In
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Resend Code */}
                <div className="text-center pt-1">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition flex items-center gap-1 mx-auto"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Resend Verification Code
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500">
                      Resend code in <strong className="text-slate-400 font-mono">{countdown}s</strong>
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* PASSWORD LOGIN MODE */}
        {/* ========================================================================= */}
        {loginMode === 'PASSWORD' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="glass-input pl-10 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input pl-10 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 shadow-glow mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In with Password'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        <div className="mt-6 pt-6 border-t border-slate-800 text-center space-y-2">
          <p className="text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/register/customer" className="font-semibold text-brand-400 hover:underline">
              Create Customer Account
            </Link>
          </p>
          <p className="text-xs text-slate-400">
            Are you a restaurant manager?{' '}
            <Link to="/manager/login" className="font-semibold text-amber-400 hover:underline">
              Manager Console
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
