import React, { useState } from 'react';
import { Clock, QrCode, ChevronLeft, ChevronRight, CheckCircle2, Flame } from 'lucide-react';
import { Order } from '../types';

interface LiveOrderTicketCardProps {
  restaurantName?: string;
  restaurantStatus?: boolean;
  onToggleStatus?: () => void;
  orders?: Order[];
  onAdvanceStatus?: (orderId: string, nextStatus: string) => void;
  onOpenQrScanner?: () => void;
  statusToggling?: boolean;
}

export const LiveOrderTicketCard: React.FC<LiveOrderTicketCardProps> = ({
  restaurantName = 'Spice Garden — Koramangala',
  restaurantStatus = true,
  onToggleStatus,
  orders = [],
  onAdvanceStatus,
  onOpenQrScanner,
  statusToggling = false,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Active order to display (either the selected or fallback)
  const activeOrder = orders.length > 0 ? orders[Math.min(selectedIndex, orders.length - 1)] : null;

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : orders.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < orders.length - 1 ? prev + 1 : 0));
  };

  // Format restaurant display title
  const formattedRestaurantTitle = restaurantName.includes('—')
    ? restaurantName
    : `${restaurantName} — Koramangala`;

  return (
    <div className="glass-card p-6 border-slate-700/80 bg-[#0B1320] shadow-2xl relative overflow-hidden rounded-3xl transition-all">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-brand-500/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Top Header: Status Indicator + Restaurant Name + Status Toggle */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/90 relative z-10">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-3 h-3 rounded-full ${
              restaurantStatus ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'
            }`}
          ></span>
          <span className="text-sm sm:text-base font-bold text-slate-200 tracking-tight">
            {formattedRestaurantTitle}
          </span>
        </div>

        {/* Live Toggle Pill */}
        {onToggleStatus ? (
          <button
            onClick={onToggleStatus}
            disabled={statusToggling}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
              restaurantStatus
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/60 shadow-emerald-500/10'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-400 hover:bg-rose-900/60 shadow-rose-500/10'
            }`}
            title="Click to toggle restaurant status"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                restaurantStatus ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            ></span>
            {restaurantStatus ? 'OPEN' : 'CLOSED'}
          </button>
        ) : (
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
              restaurantStatus
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                restaurantStatus ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            ></span>
            {restaurantStatus ? 'OPEN' : 'CLOSED'}
          </span>
        )}
      </div>

      {/* Main Order Ticket Body */}
      {activeOrder ? (
        <div className="space-y-4 pt-4 relative z-10">
          {/* Order Token and Status Box */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                ORDER TOKEN
              </span>
              <p className="text-lg sm:text-xl font-mono font-extrabold text-brand-400">
                {activeOrder.orderToken}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                STATUS
              </span>
              <p
                className={`text-xs sm:text-sm font-bold tracking-wider ${
                  activeOrder.status === 'PREPARING'
                    ? 'text-amber-400'
                    : activeOrder.status === 'READY'
                    ? 'text-emerald-400'
                    : activeOrder.status === 'DELIVERED'
                    ? 'text-sky-400'
                    : 'text-amber-300'
                }`}
              >
                {activeOrder.status}
              </p>
            </div>
          </div>

          {/* Food Items Preview */}
          <div className="space-y-2 text-xs sm:text-sm py-1">
            {activeOrder.items && activeOrder.items.length > 0 ? (
              activeOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center text-slate-300"
                >
                  <span className="font-medium text-slate-200">{item.foodName}</span>
                  <span className="font-bold text-slate-200 font-mono">
                    ₹{Number(item.unitPrice).toFixed(0)} × {item.quantity}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex justify-between items-center text-slate-300">
                <span className="font-medium text-slate-200">Chicken Biriyani Special</span>
                <span className="font-bold text-slate-200 font-mono">₹180 × 2</span>
              </div>
            )}
          </div>

          {/* Timeline Pill */}
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-400" />
              Requested Time:
            </span>
            <span className="font-bold text-amber-300">
              {new Date(activeOrder.requestedFoodAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              ({activeOrder.preferredTimeType || 'ASAP'})
            </span>
          </div>

          {/* Single-use Encrypted QR code Banner */}
          <div
            onClick={() => onOpenQrScanner && onOpenQrScanner()}
            className={`flex items-center gap-3 p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300 ${
              onOpenQrScanner ? 'cursor-pointer hover:bg-brand-500/20 transition group' : ''
            }`}
          >
            <QrCode className="w-5 h-5 flex-shrink-0 text-brand-400 group-hover:scale-110 transition-transform" />
            <span className="flex-1 leading-snug">
              Single-use encrypted QR code generated upon payment verification
            </span>
            {onOpenQrScanner && (
              <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-md border border-brand-500/30">
                Scan QR
              </span>
            )}
          </div>

          {/* Multi-Order Navigation & Quick Manager Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/60">
            {orders.length > 1 ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <button
                  onClick={handlePrev}
                  className="p-1 rounded-lg bg-slate-900 border border-slate-800 hover:text-white hover:border-slate-700 transition"
                  title="Previous Order"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span>
                  Order <strong className="text-white">{selectedIndex + 1}</strong> of{' '}
                  <strong className="text-white">{orders.length}</strong>
                </span>
                <button
                  onClick={handleNext}
                  className="p-1 rounded-lg bg-slate-900 border border-slate-800 hover:text-white hover:border-slate-700 transition"
                  title="Next Order"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">🔥 Live Kitchen Priority Order</span>
            )}

            {/* Quick Action Button for Manager */}
            {onAdvanceStatus && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {activeOrder.status === 'CONFIRMED' && (
                  <button
                    onClick={() => onAdvanceStatus(activeOrder.id, 'PREPARING')}
                    className="btn-primary w-full sm:w-auto text-xs py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold flex items-center justify-center gap-1"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    Start Preparing
                  </button>
                )}
                {activeOrder.status === 'PREPARING' && (
                  <button
                    onClick={() => onAdvanceStatus(activeOrder.id, 'READY')}
                    className="btn-primary w-full sm:w-auto text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark as Ready
                  </button>
                )}
                {activeOrder.status === 'READY' && onOpenQrScanner && (
                  <button
                    onClick={onOpenQrScanner}
                    className="btn-primary w-full sm:w-auto text-xs py-1.5 px-3 bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold flex items-center justify-center gap-1 shadow-glow"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Scan to Deliver
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Standby Ticket Layout when queue is empty */
        <div className="space-y-4 pt-4 relative z-10">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                ORDER TOKEN
              </span>
              <p className="text-lg font-mono font-extrabold text-slate-500">
                WAITING_FOR_ORDERS
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                STATUS
              </span>
              <p className="text-xs font-bold text-emerald-400">STANDBY</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center space-y-1">
            <p className="text-xs font-semibold text-slate-300">
              ✨ Kitchen order station is all caught up
            </p>
            <p className="text-[11px] text-slate-400">
              New customer orders and live scheduled slots will appear here instantly.
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300">
            <QrCode className="w-5 h-5 flex-shrink-0 text-brand-400" />
            <span>Single-use encrypted QR code generated upon payment verification</span>
          </div>
        </div>
      )}
    </div>
  );
};
