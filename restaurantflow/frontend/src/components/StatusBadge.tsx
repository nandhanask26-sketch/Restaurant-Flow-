import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Info, 
  CheckCircle,
  Flame,
  ShoppingBag
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', size = 'md' }) => {
  const norm = status?.toUpperCase() || 'UNKNOWN';

  let badgeClass = 'badge-gray';
  let Icon = Info;
  let label = status;

  switch (norm) {
    // Green (Success / Available / Ready / Paid / Open)
    case 'OPEN':
      badgeClass = 'badge-green';
      Icon = CheckCircle2;
      label = '🟢 OPEN';
      break;
    case 'PAID':
      badgeClass = 'badge-green';
      Icon = CheckCircle;
      label = 'PAID';
      break;
    case 'DELIVERED':
      badgeClass = 'badge-green';
      Icon = ShoppingBag;
      label = 'DELIVERED';
      break;
    case 'AVAILABLE':
      badgeClass = 'badge-green';
      Icon = CheckCircle2;
      label = 'AVAILABLE';
      break;

    // Orange (In-Progress / Waiting)
    case 'CONFIRMED':
    case 'WAITING':
      badgeClass = 'badge-orange';
      Icon = Clock;
      label = 'CONFIRMED';
      break;
    case 'PAYMENT_PENDING':
    case 'PENDING':
      badgeClass = 'badge-orange';
      Icon = Clock;
      label = 'PAYMENT PENDING';
      break;

    // Red (Closed / Cancelled / Failed / Unpaid / Sold Out)
    case 'CLOSED':
      badgeClass = 'badge-red';
      Icon = XCircle;
      label = '🔴 CLOSED';
      break;
    case 'CANCELLED':
      badgeClass = 'badge-red';
      Icon = XCircle;
      label = 'CANCELLED';
      break;
    case 'FAILED':
    case 'PAYMENT_FAILED':
      badgeClass = 'badge-red';
      Icon = AlertCircle;
      label = 'PAYMENT FAILED';
      break;
    case 'UNPAID':
      badgeClass = 'badge-red';
      Icon = AlertCircle;
      label = 'UNPAID (COD)';
      break;
    case 'SOLD OUT':
    case 'SOLD_OUT':
      badgeClass = 'badge-red';
      Icon = AlertCircle;
      label = 'SOLD OUT';
      break;

    // Blue (Information / Scheduled)
    case 'SCHEDULED':
      badgeClass = 'badge-blue';
      Icon = Clock;
      label = 'SCHEDULED';
      break;
    case 'ASAP':
      badgeClass = 'badge-blue';
      Icon = Clock;
      label = 'ASAP';
      break;

    default:
      badgeClass = 'badge-gray';
      Icon = Info;
      label = status;
  }

  const sizeClass =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px]'
      : size === 'lg'
      ? 'px-4 py-1.5 text-sm font-semibold'
      : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${sizeClass} ${badgeClass} ${className}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{label}</span>
    </span>
  );
};
