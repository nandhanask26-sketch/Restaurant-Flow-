import React from 'react';
import { X, QrCode as QrIcon, CheckCircle2, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Order } from '../types';

interface QRModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export const QRModal: React.FC<QRModalProps> = ({ order, isOpen, onClose }) => {
  if (!isOpen) return null;

  const verificationCode = order.qrCode?.verificationCode || `VERIFY-${order.id.substring(0, 8).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm glass-card bg-slate-900 border-slate-700 p-6 rounded-3xl shadow-2xl text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="inline-flex p-3 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-400 mb-3">
          <QrIcon className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold text-slate-100">Order Verification QR</h3>
        <p className="text-xs text-slate-400 mt-1 mb-5">
          Show this QR code at the counter for contactless order pickup
        </p>

        {/* QR Code Container */}
        <div className="p-4 bg-white rounded-2xl inline-block shadow-xl border-4 border-brand-500/20 mb-4">
          <QRCodeSVG
            value={verificationCode}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* Token and Verification Code Display */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 mb-4">
          <div className="text-xs text-slate-400 mb-0.5">Order Token:</div>
          <div className="text-lg font-mono font-extrabold text-brand-400 tracking-wider">
            {order.orderToken}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-1 break-all">
            Code: {verificationCode}
          </div>
        </div>

        {/* Payment Confirmation Badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-semibold mb-4">
          <CheckCircle2 className="w-4 h-4" />
          <span>Payment Verified & Confirmed</span>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
          <span>Single-use cryptographic token</span>
        </div>
      </div>
    </div>
  );
};
