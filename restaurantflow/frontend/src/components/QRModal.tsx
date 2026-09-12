import React from 'react';
import { X, QrCode as QrIcon, CheckCircle2, ShieldCheck, AlertCircle, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Order } from '../types';

interface QRModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export const QRModal: React.FC<QRModalProps> = ({ order, isOpen, onClose }) => {
  if (!isOpen) return null;

  const isCod = order.paymentMethod === 'CASH_ON_DELIVERY' || order.payment?.paymentMethod === 'CASH_ON_DELIVERY';
  const isPaid = order.payment?.status === 'PAID' && !isCod;
  const isUpiRejected = (order.paymentMethod === 'UPI' || order.payment?.paymentMethod === 'UPI') && !isPaid;
  const isRedeemed = order.status === 'DELIVERED' || order.qrCode?.isScanned;
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

        {isUpiRejected ? (
          <div className="py-4 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                Payment Incomplete
              </span>
              <h3 className="text-xl font-bold text-slate-100 mt-2">No QR Pass Generated</h3>
              <p className="text-xs text-slate-400 mt-1">
                UPI payment was rejected or not completed. No pickup QR code has been generated.
              </p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-rose-300">
              Only customers who complete payment receive a pickup QR code.
            </div>
            <button
              onClick={onClose}
              className="btn-primary w-full py-2.5 text-xs font-bold"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="inline-flex p-3 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-400 mb-3">
              <QrIcon className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-slate-100">Cafeteria Pickup Pass</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Show this QR code or token at the counter to collect your food
            </p>

            {/* Token Number Highlight */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 mb-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Pickup Token Number
              </span>
              <div className="text-2xl font-mono font-black text-brand-400 tracking-wide my-0.5">
                {order.orderToken}
              </div>
              <div className="text-[10px] font-mono text-slate-500 break-all">
                Code: {verificationCode}
              </div>
            </div>

            {/* QR Code Container */}
            <div className="relative p-3.5 bg-white rounded-2xl inline-block shadow-xl border-4 border-brand-500/20 mb-4">
              <QRCodeSVG
                value={verificationCode}
                size={180}
                level="H"
                includeMargin={true}
                className={isRedeemed ? 'opacity-20 grayscale' : ''}
              />

              {/* Used & Redeemed Overlay */}
              {isRedeemed && (
                <div className="absolute inset-0 m-1.5 rounded-xl bg-slate-950/92 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center border border-emerald-500/50 shadow-inner">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-1 animate-pulse">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black text-emerald-300 uppercase tracking-widest">
                    USED & REDEEMED
                  </span>
                  <span className="text-[11px] text-slate-300 font-semibold mt-0.5">
                    Food Supplied
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Single-use expired
                  </span>
                </div>
              )}
            </div>

            {/* Status Confirmation Badge */}
            {isRedeemed ? (
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Food Delivered • Token Expired</span>
              </div>
            ) : isPaid ? (
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-semibold mb-3">
                <CheckCircle2 className="w-4 h-4" />
                <span>Payment Verified & Ready for Pickup</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-300 font-semibold mb-3">
                <span>Cash on Delivery — Pay at Counter</span>
              </div>
            )}

            {/* Security / Single-use Badge */}
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
              <span>Single-use pass • Scanned only once</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
