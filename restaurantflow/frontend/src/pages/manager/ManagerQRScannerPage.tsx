import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  ScanLine, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ShoppingBag, 
  ShieldCheck, 
  Clock, 
  User,
  Sparkles
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Order } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';

export const ManagerQRScannerPage: React.FC = () => {
  const { restaurantId } = useOutletContext<{ restaurantId: string }>();

  const [verificationCode, setVerificationCode] = useState('');
  const [tokenSearch, setTokenSearch] = useState('');
  const [scannedOrder, setScannedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize camera scanner on page
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    const timer = setTimeout(() => {
      try {
        scanner = new Html5QrcodeScanner(
          'page-qr-reader',
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          false
        );
        scanner.render(
          (text) => {
            handleVerifyCode(text);
          },
          () => {}
        );
      } catch (err) {
        console.warn('Scanner camera init error:', err);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, []);

  const handleVerifyCode = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data } = await apiClient.post('/qr/verify', {
        verificationCode: code.trim(),
      });
      setScannedOrder(data.data.order);
      setSuccessMessage(data.message || 'QR Verified Successfully!');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Invalid QR Code or order already verified/delivered.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLookupToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenSearch.trim()) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data } = await apiClient.get(`/orders/token/${tokenSearch.trim()}`);
      setScannedOrder(data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Order with this token not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliverOrder = async () => {
    if (!scannedOrder) return;
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post(`/orders/${scannedOrder.id}/deliver`);
      setScannedOrder(data.data);
      setSuccessMessage(`Order ${data.data.orderToken} marked as DELIVERED!`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark order as delivered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <ScanLine className="w-6 h-6 text-brand-400" />
          QR Verification & Order Pickup Dispatch
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Scan customer's pickup QR code with device camera or enter verification code / daily token
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid md:grid-cols-12 gap-6">
        {/* Left Column: Camera Scanner & Inputs */}
        <div className="md:col-span-6 space-y-4">
          <div className="glass-card p-5 bg-slate-900 border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Camera QR Reader
            </h3>
            <div
              id="page-qr-reader"
              className="w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800"
            />
          </div>

          {/* Manual Verification Code Input */}
          <div className="glass-card p-5 bg-slate-900 border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Enter Verification Code:
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyCode(verificationCode);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="e.g. VERIFY-12345678-ABCDEF"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="glass-input text-xs py-2 font-mono"
              />
              <button
                type="submit"
                disabled={loading || !verificationCode.trim()}
                className="btn-primary text-xs px-4 flex-shrink-0"
              >
                Verify QR
              </button>
            </form>
          </div>

          {/* Token Lookup */}
          <div className="glass-card p-5 bg-slate-900 border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Or Lookup by Daily Order Token:
            </h3>
            <form onSubmit={handleLookupToken} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. RF-20260821-001"
                value={tokenSearch}
                onChange={(e) => setTokenSearch(e.target.value)}
                className="glass-input text-xs py-2 font-mono"
              />
              <button
                type="submit"
                disabled={loading || !tokenSearch.trim()}
                className="btn-secondary text-xs px-4 flex-shrink-0"
              >
                Lookup
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Verified Order Details & Action */}
        <div className="md:col-span-6">
          {scannedOrder ? (
            <div className="glass-card p-6 bg-slate-900 border-slate-700 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs text-slate-400">Verified Order Token</span>
                  <h2 className="text-2xl font-mono font-extrabold text-brand-400">
                    {scannedOrder.orderToken}
                  </h2>
                </div>
                <StatusBadge status={scannedOrder.status} size="md" />
              </div>

              {/* Customer and Prep info */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Customer:</span>
                  <strong className="text-slate-200">
                    {scannedOrder.customerName} ({scannedOrder.customerPhone})
                  </strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Target Time:</span>
                  <strong className="text-amber-300">
                    {new Date(scannedOrder.requestedFoodAt).toLocaleTimeString()}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Payment:</span>
                  <span className="font-bold text-emerald-400">
                    {scannedOrder.payment?.status || 'PAID'} (
                    {scannedOrder.payment?.paymentMethod || 'UPI'})
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-300">Items to Deliver:</span>
                {scannedOrder.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800"
                  >
                    <span className="text-slate-200 font-semibold">{item.foodName}</span>
                    <span className="font-bold text-brand-400">× {item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-sm font-extrabold">
                <span className="text-slate-300">Total Order Amount</span>
                <span className="text-brand-400">₹{scannedOrder.totalAmount.toFixed(0)}</span>
              </div>

              {/* Deliver Action */}
              {scannedOrder.status !== 'DELIVERED' ? (
                <button
                  onClick={handleDeliverOrder}
                  disabled={loading}
                  className="btn-primary w-full py-3.5 text-xs font-extrabold tracking-wider uppercase flex items-center justify-center gap-2 shadow-glow"
                >
                  <ShoppingBag className="w-4 h-4" />
                  MARK AS DELIVERED
                </button>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  This order is completed and DELIVERED
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-12 text-center text-slate-400 flex flex-col items-center justify-center bg-slate-900/60">
              <ScanLine className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-sm font-bold text-slate-300 mb-1">
                Awaiting QR Code Scan
              </h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Scan or enter an order verification code on the left to verify customer authenticity and fulfill delivery.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
