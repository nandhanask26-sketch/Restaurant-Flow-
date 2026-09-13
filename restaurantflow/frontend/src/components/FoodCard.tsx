import React, { useState } from 'react';
import { Plus, Minus, Check, AlertCircle } from 'lucide-react';
import { Food } from '../types';
import { useCartStore } from '../store/cartStore';

interface FoodCardProps {
  food: Food;
  isRestaurantOpen?: boolean;
}

export const FoodCard: React.FC<FoodCardProps> = ({ food, isRestaurantOpen = true }) => {
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const isParotta = food.name.toLowerCase().includes('parotta');
  const [gravyOption, setGravyOption] = useState<'VEG' | 'NON_VEG'>('VEG');
  const { addItem } = useCartStore();

  const isSoldOut = !food.isAvailable;
  const canOrder = isRestaurantOpen && !isSoldOut;

  const handleAddToCart = () => {
    if (!canOrder) return;
    
    if (isParotta) {
      const customizedFood: Food = {
        ...food,
        name: `Parotta (2 pcs) - ${gravyOption === 'VEG' ? 'Veg Gravy' : 'Non-Veg Gravy'}`,
        isVegetarian: gravyOption === 'VEG',
      };
      addItem(customizedFood, quantity);
    } else {
      addItem(food, quantity);
    }

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const isVegetarianDish = isParotta ? gravyOption === 'VEG' : food.isVegetarian;

  return (
    <div className={`bg-white dark:bg-[#151C28] border border-[#EADBCC] dark:border-slate-800 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group ${!canOrder ? 'opacity-70' : ''}`}>
      <div>
        {/* Food Image Banner with Aspect Ratio and Corner Veg/Non-Veg Badge */}
        <div className="relative h-44 w-full bg-stone-100 dark:bg-slate-800 overflow-hidden">
          <img
            src={
              food.imageUrl ||
              'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'
            }
            alt={food.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

          {/* Top-Left Indian Standard Veg / Non-Veg Indicator Badge matching screenshot */}
          <div
            className="absolute top-2.5 left-2.5 w-4 h-4 rounded-[4px] bg-white/95 dark:bg-slate-900/95 border-2 flex items-center justify-center shadow-xs pointer-events-none"
            style={{
              borderColor: isVegetarianDish ? '#16A34A' : '#DC2626',
            }}
            title={isVegetarianDish ? 'Vegetarian Dish' : 'Non-Vegetarian Dish'}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: isVegetarianDish ? '#16A34A' : '#DC2626',
              }}
            />
          </div>

          {/* Sold Out Overlay if Stock = 0 */}
          {isSoldOut && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center">
              <div className="px-3.5 py-1.5 rounded-full bg-rose-600/95 text-white font-bold text-xs tracking-wider uppercase border border-rose-400 shadow-xl flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-white" />
                SOLD OUT
              </div>
            </div>
          )}
        </div>

        {/* Content: Title, Price, Description */}
        <div className="p-3.5 sm:p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm sm:text-base font-bold text-[#1C1917] dark:text-slate-100 tracking-tight truncate leading-snug">
              {food.name}
            </h3>

            <span className="text-sm sm:text-base font-extrabold text-[#1C1917] dark:text-emerald-400 flex-shrink-0 tracking-tight">
              ₹{food.price.toFixed(0)}
            </span>
          </div>

          <p className="text-[11px] sm:text-xs text-[#78716C] dark:text-slate-400 line-clamp-1 mb-2">
            {food.description || 'Authentic South Indian preparation made fresh with rich spices.'}
          </p>

          {/* Parotta Custom Gravy Selector */}
          {isParotta && (
            <div className="mb-2 p-2 rounded-xl bg-[#FAF7F0] dark:bg-slate-900/90 border border-[#EADBCC] dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-[#78716C] dark:text-slate-400 block">
                Choose Gravy:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setGravyOption('VEG')}
                  className={`text-[11px] py-1 px-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition ${
                    gravyOption === 'VEG'
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/50'
                      : 'text-stone-600 dark:text-slate-400 bg-white dark:bg-slate-950/60 border border-[#EADBCC] dark:border-slate-800 hover:text-stone-900'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Veg Gravy
                </button>
                <button
                  type="button"
                  onClick={() => setGravyOption('NON_VEG')}
                  className={`text-[11px] py-1 px-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition ${
                    gravyOption === 'NON_VEG'
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/50'
                      : 'text-stone-600 dark:text-slate-400 bg-white dark:bg-slate-950/60 border border-[#EADBCC] dark:border-slate-800 hover:text-stone-900'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  Non-Veg Gravy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer: Quantity Selector on Left, Forest Green "Add to Cart" on Right */}
      <div className="p-3.5 sm:p-4 pt-0">
        <div className="flex items-center justify-between gap-2.5 pt-2.5 border-t border-[#EADBCC] dark:border-slate-800">
          {/* Quantity Selector Pill: [- 1 +] */}
          <div className="flex items-center bg-[#FAF7F0] dark:bg-slate-900 border border-[#E5DEC9] dark:border-slate-700 rounded-xl px-1 py-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={!canOrder || quantity <= 1}
              className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-30 transition"
              title="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-7 text-center text-xs font-bold text-[#1C1917] dark:text-slate-100">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              disabled={!canOrder}
              className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-30 transition"
              title="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!canOrder}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-150 flex items-center justify-center gap-1.5 select-none shadow-xs active:scale-[0.98] ${
              justAdded
                ? 'bg-emerald-600 text-white'
                : canOrder
                ? 'bg-[#0D5C3A] hover:bg-[#09452b] text-white shadow-[#0D5C3A]/20'
                : 'bg-stone-200 dark:bg-slate-800 text-stone-400 dark:text-slate-500 cursor-not-allowed border border-stone-300 dark:border-slate-700'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Added!</span>
              </>
            ) : !isRestaurantOpen ? (
              <span>Kitchen Closed</span>
            ) : isSoldOut ? (
              <span>Sold Out</span>
            ) : (
              <span className="text-white font-bold">Add to Cart</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

