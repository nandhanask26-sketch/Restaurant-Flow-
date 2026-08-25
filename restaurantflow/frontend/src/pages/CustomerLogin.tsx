import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  UtensilsCrossed, 
  ArrowRight, 
  AlertCircle, 
  Mail, 
  Phone, 
  RotateCw, 
  CheckCircle2, 
  Lock, 
  Eye, 
  EyeOff, 
  Smartphone,
  X,
  User,
  Plus,
  ShieldCheck
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

interface GoogleAccountOption {
  name: string;
  email: string;
  avatar: string;
}

export const CustomerLogin: React.FC = () => {
  // Primary Method: 'MOBILE' | 'EMAIL'
  const [authMethod, setAuthMethod] = useState<'MOBILE' | 'EMAIL'>('MOBILE');
  
  // For Email: Sub-mode 'OTP' | 'PASSWORD'
  const [emailMode, setEmailMode] = useState<'OTP' | 'PASSWORD'>('OTP');

  // Input states (clean & empty for production)
  const [mobileNumber, setMobileNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification Flow State
  const [step, setStep] = useState<'INPUT' | 'VERIFY'>('INPUT');
  const [activeIdentifier, setActiveIdentifier] = useState('');
  const [activeChannel, setActiveChannel] = useState<'EMAIL' | 'PHONE'>('PHONE');
  const [maskedTarget, setMaskedTarget] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);

  // Google Account Picker Modal State
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);

  // Suggested Google accounts
  const googleAccounts: GoogleAccountOption[] = [
    {
      name: 'Nandhana S K',
      email: 'nandhanask26@gmail.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nandhana',
    },
    {
      name: 'Customer Account',
      email: 'customer@restaurantflow.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Customer',
    },
  ];

  // Countdown timer
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown effect for OTP resend
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

  // 1. Send OTP (Mobile or Email)
  const handleSendOtp = async (customIdentifier?: string, customChannel?: 'EMAIL' | 'PHONE') => {
    const target = customIdentifier || (authMethod === 'MOBILE' ? mobileNumber : emailAddress);
    const targetChannel = customChannel || (authMethod === 'MOBILE' ? 'PHONE' : 'EMAIL');

    if (!target.trim()) {
      setError(`Please enter your ${targetChannel === 'PHONE' ? 'mobile phone number' : 'email address'}`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { data } = await apiClient.post('/auth/otp/send', { identifier: target.trim() });
      const { channel, maskedTarget } = data.data;

      setActiveIdentifier(target.trim());
      setActiveChannel(channel);
      setMaskedTarget(maskedTarget);
      setStep('VERIFY');
      setCountdown(60);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMsg(
        channel === 'EMAIL'
          ? `Automatic verification code dispatched to your verified email: ${maskedTarget}`
          : `Automatic OTP dispatched to your mobile number: ${maskedTarget}`
      );

      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to dispatch verification code. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Select Google Account -> Automatically dispatch verification code to that Google email
  const handleSelectGoogleAccount = (selectedEmail: string) => {
    setGoogleModalOpen(false);
    setShowCustomGoogleInput(false);
    setCustomGoogleEmail('');
    setAuthMethod('EMAIL');
    setEmailMode('OTP');
    setEmailAddress(selectedEmail);
    handleSendOtp(selectedEmail, 'EMAIL');
  };

  // 3. Handle OTP input cells
  const handleOtpChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (cleanVal && index === 5 && newDigits.every((d) => d !== '')) {
      handleVerifyOtp(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
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

  // 4. Verify OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post('/auth/otp/verify', {
        identifier: activeIdentifier,
        code,
      });

      const { user, accessToken, refreshToken } = data.data;
      setAuth(user, accessToken, refreshToken);
      navigate('/customer/menu');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired verification code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Email Password Sign In
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post('/auth/login', { email: emailAddress, password });
      const { user, accessToken, refreshToken, restaurantId } = data.data;

      setAuth(user, accessToken, refreshToken, restaurantId);

      if (user.role === 'RESTAURANT_MANAGER') {
        navigate('/manager/dashboard');
      } else {
        navigate('/customer/menu');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please verify email and password.');
    } finally {
      setLoading(false);
    }
  };

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
            Sign in with Google, mobile OTP, or verified email
          </p>
        </div>

        {/* ========================================================================= */}
        {/* TOP: GOOGLE 1-CLICK SIGN IN */}
        {/* ========================================================================= */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setGoogleModalOpen(true)}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-800 font-semibold text-sm flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all border border-slate-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
        <div className="relative flex py-2 items-center mb-5">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Or sign in with
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Method Switcher: Mobile Number vs Email Address */}
        <div className="flex bg-slate-950/90 p-1 rounded-2xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('MOBILE');
              setStep('INPUT');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 ${
              authMethod === 'MOBILE'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Mobile Number
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod('EMAIL');
              setStep('INPUT');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 ${
              authMethod === 'EMAIL'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Email Address
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
        {/* 1. MOBILE NUMBER SIGN IN (MEESHO / AMAZON STYLE OTP) */}
        {/* ========================================================================= */}
        {authMethod === 'MOBILE' && (
          <>
            {step === 'INPUT' ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mobile Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-brand-400" />
                    <input
                      type="tel"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="Enter 10-digit mobile number"
                      className="glass-input pl-10 text-sm tracking-wide"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>We will send an automatic 6-digit OTP to verify your mobile number.</span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 shadow-glow mt-2"
                >
                  {loading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Sending OTP to Mobile...
                    </>
                  ) : (
                    <>
                      Send Verification Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : null}
          </>
        )}

        {/* ========================================================================= */}
        {/* 2. EMAIL ADDRESS SIGN IN (OTP or PASSWORD) */}
        {/* ========================================================================= */}
        {authMethod === 'EMAIL' && (
          <>
            {step === 'INPUT' ? (
              <div className="space-y-4">
                {/* Sub-mode selector for Email */}
                <div className="flex justify-center gap-4 text-xs font-semibold pb-1 border-b border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => setEmailMode('OTP')}
                    className={`pb-1 transition ${
                      emailMode === 'OTP'
                        ? 'text-brand-400 border-b-2 border-brand-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Verification Code (OTP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailMode('PASSWORD')}
                    className={`pb-1 transition ${
                      emailMode === 'PASSWORD'
                        ? 'text-brand-400 border-b-2 border-brand-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Use Password
                  </button>
                </div>

                {emailMode === 'OTP' ? (
                  <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-brand-400" />
                        <input
                          type="email"
                          required
                          value={emailAddress}
                          onChange={(e) => setEmailAddress(e.target.value)}
                          placeholder="Enter your email address"
                          className="glass-input pl-10 text-sm"
                          autoFocus
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>A 6-digit verification code will be sent to your email inbox.</span>
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 shadow-glow"
                    >
                      {loading ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          Sending Email Code...
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
                  <form onSubmit={handlePasswordLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={emailAddress}
                          onChange={(e) => setEmailAddress(e.target.value)}
                          placeholder="Enter your email address"
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
                          placeholder="Enter your password"
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
              </div>
            ) : null}
          </>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: 6-DIGIT OTP VERIFICATION SCREEN */}
        {/* ========================================================================= */}
        {step === 'VERIFY' && (
          <div className="space-y-5">
            <div className="text-center p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs text-slate-400">Enter the 6-digit code sent to:</div>
              <div className="text-sm font-bold text-brand-400 mt-0.5 flex items-center justify-center gap-1.5">
                {activeChannel === 'EMAIL' ? <Mail className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                <span>{maskedTarget || activeIdentifier}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('INPUT');
                  setError(null);
                }}
                className="text-[11px] text-slate-400 hover:text-white underline mt-1.5 inline-block"
              >
                Change {activeChannel === 'EMAIL' ? 'Email' : 'Phone Number'}
              </button>
            </div>

            {/* 6 Digit Numeric Input Cells */}
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
                  Verifying & Signing In...
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
                  onClick={() => handleSendOtp(activeIdentifier, activeChannel)}
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

      {/* ========================================================================= */}
      {/* GOOGLE ACCOUNT SELECTOR MODAL (Official Google Dialog Experience) */}
      {/* ========================================================================= */}
      {googleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-[#1E293B] border border-slate-700 rounded-3xl p-6 shadow-2xl relative text-white animate-scaleUp">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setGoogleModalOpen(false);
                setShowCustomGoogleInput(false);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Google Header */}
            <div className="flex items-center gap-2.5 mb-4">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
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
              <div>
                <h3 className="text-sm font-bold">Sign in with Google</h3>
                <p className="text-[11px] text-slate-400">Choose an account to continue to RestaurantFlow</p>
              </div>
            </div>

            {/* List of Detected Google Accounts */}
            <div className="space-y-2 mb-4">
              {googleAccounts.map((acc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectGoogleAccount(acc.email)}
                  className="w-full p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-brand-500/50 flex items-center gap-3 transition group text-left"
                >
                  <img src={acc.avatar} alt={acc.name} className="w-9 h-9 rounded-full bg-slate-700 object-cover" />
                  <div className="overflow-hidden">
                    <div className="text-xs font-semibold text-white group-hover:text-brand-400 transition">{acc.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{acc.email}</div>
                  </div>
                </button>
              ))}

              {/* Use Another Account Button */}
              {!showCustomGoogleInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomGoogleInput(true)}
                  className="w-full p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800 border border-dashed border-slate-700 flex items-center gap-3 transition text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-300">Use another Google account</div>
                    <div className="text-[10px] text-slate-500">Sign in with any Gmail / Workspace account</div>
                  </div>
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (customGoogleEmail.trim()) {
                      handleSelectGoogleAccount(customGoogleEmail.trim());
                    }
                  }}
                  className="p-3 rounded-2xl bg-slate-900 border border-slate-700 space-y-2.5"
                >
                  <label className="block text-[11px] font-semibold text-slate-300">Enter Google Email Address</label>
                  <input
                    type="email"
                    required
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-brand-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-400 transition flex items-center justify-center gap-1.5"
                  >
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>

            <p className="text-[10px] text-slate-400 text-center">
              Selecting your Google account will automatically dispatch a secure 6-digit verification code to that email address.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
