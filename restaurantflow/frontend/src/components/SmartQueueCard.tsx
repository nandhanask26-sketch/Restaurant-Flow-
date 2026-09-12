import React from 'react';
import { Clock, CheckCircle2, ChevronRight, User, ShoppingBag, Flame, AlertCircle, Trash2 } from 'lucide-react';
import { Order } from '../types';
import { StatusBadge } from './StatusBadge';

interface SmartQueueCardProps {
  order: Order;
  onAdvanceStatus: (orderId: string, nextStatus: any) => void;
  onOpenQrScanner?: () => void;
  onDeleteOrder?: (order: Order) => void;
}

export const SmartQueueCard: React.FC<SmartQueueCardProps> = ({
  order,
  onAdvanceStatus,
  onOpenQrScanner,
  onDeleteOrder,
}) => {
  const getNextAction = () => {
    if (order.status === 'CONFIRMED') {
      return {
        nextStatus: 'DELIVERED',
        label: 'Deliver Order',
        icon: ShoppingBag,
        colorClass: 'btn-primary bg-brand-600 hover:bg-brand-500 shadow-glow',
      };
    }
    return null;
  };

  const nextAction = getNextAction();

  return (
    <div className="glass-card-hover p-4 sm:p-5 flex flex-col justify-between border-slate-800 bg-[#0F172A] rounded-2xl">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-mono font-extrabold text-brand-400">
              {order.orderToken}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onDeleteOrder && (
              <button
                onClick={() => onDeleteOrder(order)}
                className="p-1 rounded-lg bg-slate-900/80 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 border border-slate-800 transition"
                title="Delete this order"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Customer & Timing */}
        <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-slate-800/80 mb-3">
          <div className="flex items-center gap-1.5 text-slate-200 font-medium">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>{order.customerName || 'Customer'}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-brand-400" />
            <span>Target: {new Date(order.requestedFoodAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Items Summary */}
        <div className="space-y-1.5 mb-4">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">
                {item.foodName}
              </span>
              <span className="font-mono font-bold text-brand-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                × {item.quantity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer & Transition Action */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusBadge status={order.payment?.status || 'PAID'} size="sm" />
          <span className="text-xs font-bold text-slate-200">
            ₹{order.totalAmount.toFixed(0)}
          </span>
        </div>

        {nextAction && (
          <button
            onClick={() => {
              if (nextAction.nextStatus === 'DELIVERED' && onOpenQrScanner) {
                onOpenQrScanner();
              } else {
                onAdvanceStatus(order.id, nextAction.nextStatus);
              }
            }}
            className={`text-xs py-1.5 px-3 rounded-xl font-semibold flex items-center gap-1.5 transition ${nextAction.colorClass}`}
          >
            <nextAction.icon className="w-3.5 h-3.5" />
            <span>{nextAction.label}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
