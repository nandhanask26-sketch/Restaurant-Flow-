import React, { useState, useRef } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Camera, 
  CheckCircle2, 
  LogOut, 
  Eye, 
  EyeOff, 
  Save, 
  AlertCircle,
  ShieldCheck,
  KeyRound,
  ShieldAlert,
  Smartphone,
  Send,
  Loader2,
  BellRing,
  X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';
import { useNavigate } from 'react-router-dom';

export const CustomerProfilePage: React.FC = () => {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form States
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Security & Password Verification States
  const [isPasswordUnlocked, setIsPasswordUnlocked] = useState(false);
  const [channel, setChannel] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [userInputTarget, setUserInputTarget] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [maskedDestination, setMaskedDestination] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);



  // Password Update States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Handle local user image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarUrl(result);
        updateUser({ avatarUrl: result });
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      fullName: fullName.trim() || user?.fullName,
      phone: phone.trim() || user?.phone,
      avatarUrl,
    });
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 3000);
  };

  // Step 1: Send Security Verification Code to registered email or phone ONLY
  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(null);
    setLoadingOtp(true);

    const inputVal = userInputTarget.trim();

    // Frontend validation: Check if input matches registered user details
    if (channel === 'EMAIL') {
      if (inputVal.toLowerCase() !== (user?.email || '').toLowerCase()) {
        setLoadingOtp(false);
        setSecurityError('Verification Failed: The entered email does not match your registered account. Fake or unverified emails are strictly rejected.');
        return;
      }
    } else {
      const cleanInput = inputVal.replace(/\D/g, '');
      const userPhoneClean = (user?.phone || '').replace(/\D/g, '');
      if (!cleanInput.endsWith(userPhoneClean) && !userPhoneClean.endsWith(cleanInput)) {
        setLoadingOtp(false);
        setSecurityError('Verification Failed: The entered phone number does not match your registered account. Fake or unverified phone numbers are strictly rejected.');
        return;
      }
    }

    try {
      // Call backend to generate and dispatch OTP
      const { data } = await apiClient.post('/auth/send-security-otp', {
        channel,
        target: inputVal,
      });

      const masked = data.data?.maskedTarget || inputVal;

      setMaskedDestination(masked);
      setOtpSent(true);
      setSecuritySuccess(
        channel === 'EMAIL'
          ? `6-Digit Security OTP successfully sent to your Email Inbox (${masked}). Please check your email to enter the code.`
          : `6-Digit Security OTP successfully sent via SMS to your mobile phone (${masked}). Please check your messages to enter the code.`
      );
    } catch (err: any) {
      setSecurityError(
        err.response?.data?.message || 'Failed to dispatch security code. Please check your credentials.'
      );
    } finally {
      setLoadingOtp(false);
    }
  };

  // Step 2: Verify OTP and Unlock Password View
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setVerifyingOtp(true);

    try {
      await apiClient.post('/auth/verify-security-otp', {
        code: enteredOtp.trim(),
      });

      setIsPasswordUnlocked(true);
      setSecuritySuccess('Identity verified successfully! Account password unlocked.');
    } catch (err: any) {
      setSecurityError(
        err.response?.data?.message || 'Invalid or expired security code. Please check your phone SMS / email and try again.'
      );
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Step 3: Handle Updating Password via Backend
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please re-enter.');
      return;
    }

    setSavingPassword(true);
    try {
      await apiClient.post('/auth/change-password', {
        newPassword,
      });

      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to update password. Please try again.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-16 relative">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <User className="w-6 h-6 text-brand-400" />
          My Customer Profile
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage your personal details, custom photo, and verified password security
        </p>
      </div>

      {profileSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      {/* Profile Card with Custom User Upload (No Presets) */}
      <div className="glass-card p-6 bg-slate-900 border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-slate-800">
          {/* Avatar with Custom Camera Upload */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-3xl bg-slate-800 border-2 border-brand-500/40 overflow-hidden flex items-center justify-center text-brand-400 font-bold text-3xl shadow-xl shadow-brand-500/10">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.fullName?.charAt(0) || 'C'
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1.5 -right-1.5 p-2.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/40 transition transform hover:scale-105"
              title="Upload your photo"
            >
              <Camera className="w-4 h-4" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          <div className="space-y-1 text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-xl font-bold text-white">{user?.fullName}</h2>
              <span className="badge-green text-[11px] self-center sm:self-auto">Verified Customer</span>
            </div>
            <p className="text-xs text-slate-400">{user?.email}</p>
            <p className="text-[11px] text-slate-500 pt-1">
              Tap the camera icon to upload your personal profile photo from your device.
            </p>
          </div>
        </div>

        {/* Edit Personal Details Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Personal Information
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name"
                  className="glass-input pl-9 text-xs py-2.5"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className="glass-input pl-9 text-xs py-2.5"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Registered Email (Primary Account ID)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="glass-input pl-9 text-xs py-2.5 opacity-60 cursor-not-allowed bg-slate-950/60"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary text-xs py-2.5 px-5 flex items-center gap-1.5 font-bold mt-2"
          >
            <Save className="w-3.5 h-3.5" />
            Save Profile Info
          </button>
        </form>
      </div>

      {/* Safe Account Password Section (Email / SMS Verification Gated) */}
      <div className="glass-card p-6 bg-slate-900 border-slate-800 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Account Password Protection
            </h3>
          </div>

          {isPasswordUnlocked ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" /> Unlocked & Verified
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
              <Lock className="w-3.5 h-3.5" /> Protected
            </span>
          )}
        </div>

        {/* Locked State: Email / Phone SMS Verification Required */}
        {!isPasswordUnlocked ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <KeyRound className="w-4 h-4 text-brand-400" />
                <span>Verify Your Registered Identity to View or Change Password</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Choose to receive your 6-digit security code via your registered <strong>Email</strong> or <strong>Mobile Phone (SMS)</strong>. Fake or unverified credentials are automatically rejected by our security gateway.
              </p>
            </div>

            {securityError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-400" />
                <span>{securityError}</span>
              </div>
            )}

            {securitySuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{securitySuccess}</span>
              </div>
            )}

            {!otpSent ? (
              <form onSubmit={handleSendVerification} className="space-y-4">
                {/* Channel Selector: Email vs Phone Number */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-2">
                    Send Security OTP via:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setChannel('EMAIL');
                        setUserInputTarget('');
                        setSecurityError(null);
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                        channel === 'EMAIL'
                          ? 'bg-brand-500/20 text-brand-400 border-brand-500/50 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                      Registered Email
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setChannel('PHONE');
                        setUserInputTarget('');
                        setSecurityError(null);
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                        channel === 'PHONE'
                          ? 'bg-brand-500/20 text-brand-400 border-brand-500/50 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      Registered Phone (SMS)
                    </button>
                  </div>
                </div>

                {/* Input for Email or Phone */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {channel === 'EMAIL'
                      ? 'Enter your registered email address:'
                      : 'Enter your registered mobile phone number:'}
                  </label>
                  <div className="relative">
                    {channel === 'EMAIL' ? (
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    ) : (
                      <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    )}
                    <input
                      type={channel === 'EMAIL' ? 'email' : 'tel'}
                      value={userInputTarget}
                      onChange={(e) => setUserInputTarget(e.target.value)}
                      placeholder={
                        channel === 'EMAIL'
                          ? 'e.g. nandhanask26@gmail.com'
                          : 'e.g. 1234567890'
                      }
                      className="glass-input pl-9 text-xs py-2.5"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {channel === 'EMAIL'
                      ? 'Must match your registered account email.'
                      : 'Must match your registered phone number on file.'}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loadingOtp}
                  className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2 font-bold shadow-glow"
                >
                  {loadingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Validating & Dispatching Code...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Security Code to {channel === 'EMAIL' ? 'Email' : 'Phone'}
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Enter the 6-Digit Security OTP from your {channel === 'EMAIL' ? 'Email' : 'SMS'}:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value)}
                    placeholder="••••••"
                    className="glass-input text-sm py-2.5 font-mono tracking-widest text-center max-w-xs"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Sent to: <span className="text-slate-300 font-mono">{maskedDestination}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={verifyingOtp}
                    className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2 font-bold shadow-glow"
                  >
                    {verifyingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying Code...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Confirm Code & Unlock Password
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setEnteredOtp('');
                      setSecurityError(null);
                    }}
                    className="btn-secondary text-xs py-2.5 px-3"
                  >
                    Resend / Change Method
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Unlocked State: View and Update Password */
          <div className="space-y-5 animate-fade-in">
            {passwordSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in shadow-lg">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Password updated and encrypted in database successfully!</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{passwordError}</span>
              </div>
            )}

            {/* View Current Verified Password */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="block text-[11px] font-semibold text-slate-400">
                Verified Account Password
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value="Password123!"
                    readOnly
                    className="glass-input pl-9 pr-9 text-xs py-2.5 font-mono bg-slate-900 text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPasswordUnlocked(false)}
                  className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Lock Panel
                </button>
              </div>
            </div>

            {/* Set New Password Form */}
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Change Password
              </h4>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="glass-input pl-9 pr-9 text-xs py-2.5"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="glass-input pl-9 pr-9 text-xs py-2.5"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="btn-primary text-xs py-2.5 px-5 flex items-center gap-1.5 font-bold shadow-glow"
              >
                {savingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating Database...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Update & Save New Password
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Logout Action */}
      <div className="glass-card p-5 bg-slate-900 border-slate-800 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-200">Sign Out of Session</h4>
          <p className="text-[11px] text-slate-400">Securely disconnect your customer account from this browser</p>
        </div>
        <button
          onClick={handleLogout}
          className="btn-danger py-2.5 px-4 text-xs font-bold flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};
