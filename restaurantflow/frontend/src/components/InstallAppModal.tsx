import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  Download, 
  Copy, 
  Check, 
  Share2, 
  Sparkles, 
  RefreshCw, 
  Wifi, 
  Globe 
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName?: string;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  restaurantName = 'RestaurantFlow',
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'ANDROID' | 'IPHONE'>('ANDROID');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Network IP / URL determination
  const currentOrigin = window.location.origin;
  // If running on localhost, prefer local network IP for mobile phones on same Wi-Fi
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const networkIp = '192.168.43.206';
  const defaultShareUrl = isLocalhost ? `http://${networkIp}:5173` : currentOrigin;
  const [shareUrl, setShareUrl] = useState(defaultShareUrl);

  useEffect(() => {
    // Check if already in standalone PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-100">
                Install Mobile App
              </h3>
              <p className="text-xs text-slate-400">
                {restaurantName} — Smart Mobile App for Any Phone
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Automatic Updates Guarantee Alert */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-500/15 via-emerald-500/10 to-transparent border border-brand-500/30 space-y-1.5">
            <div className="flex items-center gap-2 text-brand-400 font-extrabold text-xs">
              <RefreshCw className="w-4 h-4 animate-spin-slow" />
              <span>100% AUTOMATIC REAL-TIME UPDATES</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              When anyone installs this app on their mobile phone, <strong>any changes you make</strong> (food items, prices, restaurant name, payment QR, stock availability) will <strong>automatically reflect on their phone in real-time</strong>. Customers never have to re-download or manually update!
            </p>
          </div>

          {/* QR Code Section */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-950/90 border border-slate-800">
            <div className="p-3 bg-white rounded-2xl shadow-xl flex-shrink-0">
              <QRCodeSVG
                value={shareUrl}
                size={140}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="space-y-3 text-center sm:text-left flex-1 min-w-0">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-brand-400 block">
                  Scan to Open & Install
                </span>
                <h4 className="text-sm font-extrabold text-white">
                  Open Camera & Scan QR Code
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Point any smartphone camera at this QR code to launch the web app instantly.
                </p>
              </div>

              {/* URL with Copy Button */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1.5">
                <span className="text-[11px] font-mono text-slate-300 truncate px-2 flex-1 text-left">
                  {shareUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 rounded-lg bg-brand-500 text-slate-950 font-bold text-xs flex items-center gap-1 hover:bg-brand-400 transition flex-shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Native Install Button (if browser supports it) */}
          {deferredPrompt && (
            <button
              type="button"
              onClick={handleNativeInstall}
              className="btn-primary w-full py-3.5 text-xs font-extrabold flex items-center justify-center gap-2 shadow-glow"
            >
              <Download className="w-4 h-4" />
              <span>Install App Directly on This Device</span>
            </button>
          )}

          {/* Installation Steps Tabs (Android / iPhone) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Installation Instructions:
              </span>
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('ANDROID')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    activeTab === 'ANDROID'
                      ? 'bg-brand-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Android
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('IPHONE')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    activeTab === 'IPHONE'
                      ? 'bg-brand-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  iPhone (iOS)
                </button>
              </div>
            </div>

            {activeTab === 'ANDROID' ? (
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    1
                  </span>
                  <span>Scan the QR code above or open <strong>{shareUrl}</strong> in <strong>Chrome</strong> on Android.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    2
                  </span>
                  <span>Tap the <strong>"Install App"</strong> banner or tap Chrome menu (<strong>⋮</strong> three dots).</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    3
                  </span>
                  <span>Select <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    4
                  </span>
                  <span>The app icon will appear on your phone screen and launch full-screen like any Play Store app!</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    1
                  </span>
                  <span>Scan the QR code above or open <strong>{shareUrl}</strong> in <strong>Safari</strong> on iPhone.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    2
                  </span>
                  <span>Tap the <strong>Share</strong> icon (the square with an upward pointing arrow at bottom).</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    3
                  </span>
                  <span>Scroll down and tap <strong>"Add to Home Screen"</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    4
                  </span>
                  <span>Tap <strong>Add</strong> in the top right corner. The app will install with its icon on your iOS home screen!</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Progressive Web App (PWA) Enabled</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
