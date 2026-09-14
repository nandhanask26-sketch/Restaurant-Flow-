import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  RefreshCw, 
  ShieldCheck,
  PackageCheck,
  Globe,
  ExternalLink
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
  const [activeTab, setActiveTab] = useState<'APK' | 'IPHONE'>('APK');
  const [downloadSource, setDownloadSource] = useState<'GLOBAL' | 'LOCAL'>('GLOBAL');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Direct APK download URLs
  const globalApkUrl = 'https://files.catbox.moe/qyjwyt.apk';
  const wifiApkUrl = 'http://10.18.101.206:5000/RestaurantFlow.apk';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const localApkUrl = `${currentOrigin}/RestaurantFlow.apk`;
  const primaryApkUrl = downloadSource === 'GLOBAL' ? globalApkUrl : wifiApkUrl;

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!isOpen) return null;

  const handleCopyApkLink = async () => {
    try {
      await navigator.clipboard.writeText(primaryApkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-100 flex items-center gap-2">
                Download RestaurantFlow App
                <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  APK
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {restaurantName} — Install on Android without browser frame
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

        {/* Tab Selection */}
        <div className="px-5 pt-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Choose Platform:
          </span>
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 mb-2">
            <button
              type="button"
              onClick={() => setActiveTab('APK')}
              className={`px-3.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'APK'
                  ? 'bg-brand-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              Android APK
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('IPHONE')}
              className={`px-3.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'IPHONE'
                  ? 'bg-brand-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              iPhone (iOS)
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Automatic Updates Guarantee Alert */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-brand-500/15 via-emerald-500/10 to-transparent border border-brand-500/30 space-y-1">
            <div className="flex items-center gap-2 text-brand-400 font-extrabold text-xs">
              <RefreshCw className="w-4 h-4" />
              <span>100% REAL-TIME LIVE UPDATES</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              When installed on your phone, food menu changes, price updates, kitchen status, and payments reflect in real-time without needing to re-install.
            </p>
          </div>

          {activeTab === 'APK' ? (
            <>
              {/* Network Source Selector */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 pl-1">
                  Network:
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setDownloadSource('GLOBAL')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition flex items-center gap-1.5 ${
                      downloadSource === 'GLOBAL'
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>Anywhere (4G/5G/Any Wi-Fi)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDownloadSource('LOCAL')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition flex items-center gap-1.5 ${
                      downloadSource === 'LOCAL'
                        ? 'bg-brand-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Local Wi-Fi</span>
                  </button>
                </div>
              </div>

              {/* PRIMARY ACTION: Download APK Button */}
              <div className="space-y-2">
                <a
                  href={primaryApkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download="RestaurantFlow.apk"
                  className="btn-primary w-full py-4 text-sm font-black flex items-center justify-center gap-2.5 shadow-md"
                >
                  <Download className="w-5 h-5" />
                  <span>Download RestaurantFlow.apk ({downloadSource === 'GLOBAL' ? 'Worldwide Cloud' : 'Local Wi-Fi'})</span>
                </a>
                <p className="text-[11px] text-center text-stone-500 dark:text-stone-400">
                  {downloadSource === 'GLOBAL' 
                    ? 'Global high-speed CDN • Works on any phone, anywhere in the world'
                    : 'Fast local network transfer • Requires connection to restaurant Wi-Fi'}
                </p>
              </div>

              {/* QR Code Section: Pointing directly to APK download */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-[#FAF7F0] dark:bg-[#151921] border border-[#EADBCC] dark:border-stone-800">
                <div className="p-2.5 bg-white rounded-2xl shadow-md flex-shrink-0">
                  <QRCodeSVG
                    value={primaryApkUrl}
                    size={135}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#0D5C3A] dark:text-emerald-400 block">
                      Direct Phone Camera Scan
                    </span>
                    <h4 className="text-sm font-extrabold text-[#1C1917] dark:text-stone-100">
                      Scan to Download APK on Phone
                    </h4>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                      Point your phone camera at this QR code to download <strong className="text-[#0D5C3A] dark:text-emerald-400">RestaurantFlow.apk</strong> immediately.
                    </p>
                  </div>

                  {/* Clean Download URL */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-stone-900 border border-[#EADBCC] dark:border-stone-800 rounded-xl p-1">
                    <span className="text-[11px] font-mono text-[#0D5C3A] dark:text-emerald-400 truncate px-2 flex-1 text-left">
                      {primaryApkUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyApkLink}
                      className="px-2.5 py-1 rounded-lg bg-[#0D5C3A] text-white font-bold text-xs flex items-center gap-1 hover:bg-[#166534] transition flex-shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Android Installation Guide */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs text-slate-300">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-400" />
                  <span>Simple 3-Step Installation:</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    1
                  </span>
                  <span>Tap <strong>"Download RestaurantFlow.apk"</strong> or scan the QR code with your camera.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    2
                  </span>
                  <span>Tap <strong>"Download anyway"</strong> (standard Android notice when downloading an APK directly outside Play Store).</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    3
                  </span>
                  <span>Tap <strong>Open</strong> ➔ <strong>Install</strong>. The RestaurantFlow icon will appear on your phone's home screen!</span>
                </div>
              </div>
            </>
          ) : (
            /* iPhone (iOS) Safari PWA Guide */
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-950/90 border border-slate-800">
                <div className="p-2.5 bg-white rounded-2xl shadow-xl flex-shrink-0">
                  <QRCodeSVG
                    value={currentOrigin}
                    size={135}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-brand-400 block">
                    Apple iPhone Users
                  </span>
                  <h4 className="text-sm font-extrabold text-white">
                    Open in Safari & Add to Home Screen
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    iOS does not use APK files. Instead, install the native fullscreen PWA app via Safari.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    1
                  </span>
                  <span>Scan QR code above with iPhone camera to open in <strong>Safari</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    2
                  </span>
                  <span>Tap the <strong>Share</strong> button (the box with an upward arrow at the bottom).</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    3
                  </span>
                  <span>Scroll down and tap <strong>"Add to Home Screen"</strong>, then tap <strong>Add</strong>.</span>
                </div>
              </div>
            </div>
          )}

          {/* Browser PWA Native prompt if supported */}
          {deferredPrompt && (
            <button
              type="button"
              onClick={handleNativeInstall}
              className="btn-secondary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 border-brand-500/30 text-brand-400"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Add to Home Screen on This Browser</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-bold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>RestaurantFlow Native Android App</span>
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
