import React, { useState, useRef } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Camera, 
  CheckCircle2, 
  LogOut, 
  Save, 
  ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
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
          Manage your personal details, profile picture, and registered account information
        </p>
      </div>

      {profileSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      {/* Profile Card with Custom User Upload */}
      <div className="glass-card p-6 bg-slate-900 border-slate-800 space-y-6 rounded-3xl shadow-xl">
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
              <span className="badge-green text-[11px] self-center sm:self-auto flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Customer
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">{user?.email}</p>
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
                className="glass-input pl-9 text-xs py-2.5 opacity-60 cursor-not-allowed bg-slate-950/60 font-mono"
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

      {/* Logout Action */}
      <div className="glass-card p-5 bg-slate-900 border-slate-800 flex items-center justify-between rounded-3xl shadow-xl">
        <div>
          <h4 className="text-xs font-bold text-slate-200">Sign Out of Session</h4>
          <p className="text-[11px] text-slate-400">Securely disconnect your customer account from this device</p>
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
