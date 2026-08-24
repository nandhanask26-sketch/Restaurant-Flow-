import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { 
  Utensils, 
  Clock, 
  ShoppingBag, 
  QrCode, 
  ArrowRight, 
  AlertCircle, 
  Sparkles,
  ChevronRight,
  Flame
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Food, Order } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { FoodCard } from '../../components/FoodCard';
import { QRModal } from '../../components/QRModal';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';

export const CustomerDashboard: React.FC = () => {
  const { restaurantStatus, restaurantId } = useOutletContext<{
    restaurantStatus?: boolean;
    restaurantId?: string;
  }>();

  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [featuredFoods, setFeaturedFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQrOrder, setSelectedQrOrder] = useState<Order | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        // 1. Fetch active orders safely (swallow 401s if unauthenticated/expired)
        try {
          const token = localStorage.getItem('rf_access_token');
          if (token) {
            const ordersRes = await apiClient.get('/orders?limit=3');
            const active = (ordersRes.data?.data || []).filter(
              (o: Order) => !['DELIVERED', 'CANCELLED', 'PAYMENT_FAILED'].includes(o.status)
            );
            if (isMounted) setActiveOrders(active);
          }
        } catch (orderErr) {
          console.warn('Orders fetch skipped/failed:', orderErr);
          if (isMounted) setActiveOrders([]);
        }

        // 2. Fetch popular foods reliably
        let targetRestId = restaurantId;
        if (!targetRestId) {
          const restRes = await apiClient.get('/restaurants');
          if (restRes.data?.data?.length > 0) {
            targetRestId = restRes.data.data[0].id;
          }
        }

        if (targetRestId && isMounted) {
          const foodsRes = await apiClient.get(`/foods?restaurantId=${targetRestId}`);
          const allFoods: Food[] = foodsRes.data?.data || [];
          // Pick top 8 popular dishes
          setFeaturedFoods(allFoods.slice(0, 8));
        }
      } catch (err) {
        console.error('Failed to load customer dashboard data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [restaurantId]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Restaurant Open / Closed Status Alert Banner */}
      {restaurantStatus === false ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3.5 shadow-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-200">
              🔴 Restaurant is Currently Closed
            </h4>
            <p className="text-xs text-rose-300 leading-relaxed">
              The kitchen is not accepting new orders right now. You can browse the menu and schedule orders for when the restaurant opens!
            </p>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-950 via-slate-900 to-slate-900 border border-brand-500/30 p-6 sm:p-8 shadow-2xl">
          <div className="absolute right-0 top-0 -mt-8 -mr-8 w-60 h-60 bg-brand-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Kitchen is Live & Accepting Orders</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Craving authentic, hot flavors?
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Order your favorite South Indian tiffins, Biriyani specials and snacks. Pick up directly using contactless QR verification.
            </p>
            <div className="pt-2">
              <Link to="/customer/menu" className="btn-primary text-xs sm:text-sm py-2.5 px-5 flex items-center gap-2 inline-flex">
                <Utensils className="w-4 h-4" />
                Browse Today's Menu
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Active Orders Tracker (if any) */}
      {activeOrders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
              Active Orders in Progress ({activeOrders.length})
            </h2>
            <Link to="/customer/orders" className="text-xs text-brand-400 hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeOrders.map((order) => (
              <div
                key={order.id}
                className="glass-card-hover p-4 bg-slate-900 border-slate-700/80 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-base font-mono font-extrabold text-brand-400">
                      {order.orderToken}
                    </span>
                    <StatusBadge status={order.status} size="sm" />
                  </div>

                  <p className="text-xs text-slate-300 font-medium">
                    {order.items?.map((it) => `${it.foodName} (${it.quantity})`).join(', ')}
                  </p>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2">
                    <Clock className="w-3.5 h-3.5 text-brand-400" />
                    <span>Target: {new Date(order.requestedFoodAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold text-slate-200">
                    ₹{order.totalAmount.toFixed(0)}
                  </span>
                  <button
                    onClick={() => setSelectedQrOrder(order)}
                    className="px-3 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Show QR
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured Menu Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Chef's Specials & Popular Dishes
            </h2>
            <p className="text-xs text-slate-400">Top-rated freshly cooked delicacies ready to order</p>
          </div>
          <Link to="/customer/menu" className="btn-secondary text-xs py-2 px-3 flex items-center gap-1">
            Full Menu <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <LoadingSkeleton count={3} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredFoods.map((food) => (
              <FoodCard
                key={food.id}
                food={food}
                isRestaurantOpen={restaurantStatus !== false}
              />
            ))}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {selectedQrOrder && (
        <QRModal
          order={selectedQrOrder}
          isOpen={true}
          onClose={() => setSelectedQrOrder(null)}
        />
      )}
    </div>
  );
};
