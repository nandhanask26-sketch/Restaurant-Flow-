import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Scan, CheckCircle2, AlertCircle, ShoppingBag, ShieldCheck, Search } from 'lucide-react';
import { apiClient } from '../api/client';
import { Order } from '../types';
import { StatusBadge } from './StatusBadge';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderDelivered?: (order: Order) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onOrderDelivered }) => {
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedOrder, setScannedOrder] = useState<Order | null>(null);
  const [deliverySuccess, setDeliverySuccess] = useState(false);

  useEffect(() => {
    if (!isOpen || scannedOrder) return;

    let scanner: Html5QrcodeScanner | null = null;
    const timer = setTimeout(() => {
      try {
        scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          false
        );

        scanner.render(
          (decodedText) => {
            handleVerifyCode(decodedText);
            if (scanner) scanner.clear();
          },
          () => {
            // Ignore frame parse errors
          }
        );
      } catch (err) {
        console.warn('QR Scanner init skipped (camera permissions or element unavailable):', err);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [isOpen, scannedOrder]);

  const handleVerifyCode = async (codeToVerify: string) => {
    if (!codeToVerify.trim()) return;
    setLoading(true);
    setError(null);
    setScannedOrder(null);

    try {
      const { data } = await apiClient.post('/qr/verify', {
        verificationCode: codeToVerify.trim(),
      });

      setScannedOrder(data.data.order);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify QR code. Please check code.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliver = async () => {
    if (!scannedOrder) return;
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post(`/orders/${scannedOrder.id}/deliver`);
      setDeliverySuccess(true);
      if (onOrderDelivered) {
        onOrderDelivered(data.data);
      }
      setTimeout(() => {
        handleReset();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deliver order.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setScannedOrder(null);
    setDeliverySuccess(false);
    setError(null);
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg glass-card bg-slate-900 border-slate-700 p-6 rounded-3xl shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400">
            <Scan className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">Scan & Verify Order QR</h3>
            <p className="text-xs text-slate-400">
              Verify customer QR code and confirm order delivery
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {deliverySuccess && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Order delivered and recorded successfully!</span>
          </div>
        )}

        {!scannedOrder ? (
          <div>
            {/* HTML5 Camera Reader */}
            <div
              id="qr-reader"
              className="w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 mb-4"
            />

            {/* Manual Code Fallback Input */}
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Or enter Verification Code manually:
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerifyCode(manualCode);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="e.g. VERIFY-12345678-ABCDEF"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="glass-input text-xs py-2 font-mono"
                />
                <button
                  type="submit"
                  disabled={loading || !manualCode.trim()}
                  className="btn-primary px-4 text-xs flex items-center gap-1.5 flex-shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  Verify
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Scanned Order Details Card */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-400">Order Token</span>
                <span className="text-lg font-mono font-extrabold text-brand-400">
                  {scannedOrder.orderToken}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <span className="text-xs text-slate-400">Customer</span>
                <span className="text-sm font-semibold text-slate-200">
                  {scannedOrder.customerName || 'Customer'} ({scannedOrder.customerPhone})
                </span>
              </div>

              {/* Items list */}
              <div className="space-y-1.5 mb-3">
                <span className="text-xs font-semibold text-slate-400">Items Ordered:</span>
                {scannedOrder.items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs text-slate-300">
                    <span>
                      {item.foodName} <strong className="text-brand-400">× {item.quantity}</strong>
                    </span>
                    <span>₹{item.totalPrice.toFixed(0)}</span>
                  </div>
                ))}
              </div>

              {/* Status & Payment Badges */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <StatusBadge status={scannedOrder.status} size="sm" />
                  <StatusBadge status={scannedOrder.payment?.status || 'PAID'} size="sm" />
                </div>
                <span className="text-sm font-extrabold text-slate-100">
                  Total: ₹{scannedOrder.totalAmount.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="btn-secondary flex-1 text-xs py-3"
              >
                Scan Another
              </button>
              <button
                onClick={handleDeliver}
                disabled={loading || deliverySuccess}
                className="btn-primary flex-1 text-xs py-3 font-bold flex items-center justify-center gap-2 shadow-glow"
              >
                <ShoppingBag className="w-4 h-4" />
                MARK AS DELIVERED
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
