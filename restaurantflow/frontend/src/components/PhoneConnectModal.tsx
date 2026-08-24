import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Smartphone, 
  X, 
  Copy, 
  Check, 
  Wifi, 
  Share2, 
  Download, 
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface PhoneConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhoneConnectModal: React.FC<PhoneConnectModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Determine current network URL
  const port = window.location.port || '5173';
  // Use current hostname or default local wifi IP
  const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? '10.10.240.17' 
    : window.location.hostname;
  const phoneAppUrl = `http://${host}:${port}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(phoneAppUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card max-w-lg w-full bg-slate-900 border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                Open App on Your Phone
                <span className="badge-emerald text-[10px]">PWA Ready</span>
              </h2>
              <p className="text-xs text-slate-400">
                Scalable mobile app format for iPhone & Android
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

        {/* QR Code and Direct URL Section */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-slate-950/80 border border-slate-800 rounded-2xl">
          {/* QR Code */}
          <div className="p-3 bg-white rounded-2xl shadow-glow flex-shrink-0">
            <QRCodeSVG
              value={phoneAppUrl}
              size={140}
              level="M"
              includeMargin={false}
            />
          </div>

          {/* Quick Steps */}
          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                1
              </span>
              <span>Connect phone to the <strong>same Wi-Fi</strong> network.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                2
              </span>
              <span>Open your phone's <strong>Camera</strong> & scan this QR code.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                3
              </span>
              <span>Tap <strong>"Add to Home Screen"</strong> to install as a native phone app!</span>
            </div>
          </div>
        </div>

        {/* URL Copy Bar */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Direct Phone Browser Link
          </label>
          <div className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
            <input
              type="text"
              readOnly
              value={phoneAppUrl}
              className="bg-transparent text-xs text-brand-300 font-mono flex-1 outline-none px-2"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Installation Tips */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <span>🍏 iPhone / iPad (Safari)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Tap the <strong>Share</strong> button ( <Share2 className="w-3 h-3 inline text-slate-300" /> ) then select <strong>"Add to Home Screen"</strong>.
            </p>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <span>🤖 Android (Chrome)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Tap the <strong>Menu</strong> (⋮) and select <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="btn-primary w-full py-2.5 text-xs font-extrabold flex items-center justify-center gap-2"
          >
            <span>Done</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
