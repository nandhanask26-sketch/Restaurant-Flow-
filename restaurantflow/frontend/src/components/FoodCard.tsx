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

  return (
    <div className={`glass-card overflow-hidden flex flex-col justify-between group ${!canOrder ? 'opacity-70' : ''}`}>
      <div>
        {/* Food Image Banner */}
        <div className="relative h-44 w-full bg-slate-800 overflow-hidden">
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
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

          {/* Sold Out Overlay if Stock = 0 */}
          {isSoldOut && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center">
              <div className="px-3.5 py-1.5 rounded-full bg-rose-600/90 text-white font-bold text-xs tracking-wider uppercase border border-rose-400 shadow-xl flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                SOLD OUT
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              {/* Veg / Non-Veg Indicator */}
              <div
                className={`w-4 h-4 rounded-[4px] flex items-center justify-center border-2 bg-slate-900 flex-shrink-0 ${
                  (isParotta ? gravyOption === 'VEG' : food.isVegetarian) ? 'border-emerald-500' : 'border-rose-500'
                }`}
                title={(isParotta ? gravyOption === 'VEG' : food.isVegetarian) ? 'Vegetarian' : 'Non-Vegetarian'}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    (isParotta ? gravyOption === 'VEG' : food.isVegetarian) ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
              </div>

              <h3 className="text-base font-bold text-slate-100 group-hover:text-brand-400 transition-colors">
                {food.name}
              </h3>
            </div>

            <span className="text-lg font-extrabold text-brand-400 flex-shrink-0">
              ₹{food.price.toFixed(0)}
            </span>
          </div>

          <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
            {food.description || 'Delicious freshly prepared authentic dish with fresh herbs and spices.'}
          </p>

          {/* Parotta Custom Gravy Selector */}
          {isParotta && (
            <div className="mb-3 p-2 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Choose Gravy:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setGravyOption('VEG')}
                  className={`text-[11px] py-1 px-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition ${
                    gravyOption === 'VEG'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'text-slate-400 bg-slate-950/60 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Veg Gravy
                </button>
                <button
                  type="button"
                  onClick={() => setGravyOption('NON_VEG')}
                  className={`text-[11px] py-1 px-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition ${
                    gravyOption === 'NON_VEG'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'text-slate-400 bg-slate-950/60 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  Non-Veg Gravy
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 pt-0">
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
          {/* Quantity Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={!canOrder || quantity <= 1}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-xs font-bold text-slate-200">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              disabled={!canOrder}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={!canOrder}
            className={`flex-1 py-2 px-3 rounded-xl font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 ${
              justAdded
                ? 'bg-emerald-500 text-white'
                : canOrder
                ? 'btn-primary'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5" /> Added!
              </>
            ) : !isRestaurantOpen ? (
              'Closed'
            ) : isSoldOut ? (
              'Sold Out'
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" /> Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
