import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Utensils, AlertCircle, X, Sparkles } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Food } from '../../types';
import { FoodCard } from '../../components/FoodCard';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { EmptyState } from '../../components/EmptyState';

export type MealPeriod = 'ALL' | 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER' | 'BEVERAGES';

export const MEAL_PERIODS: {
  id: MealPeriod;
  label: string;
  sublabel: string;
  time: string;
}[] = [
  { id: 'ALL', label: 'All Items', sublabel: 'Full Menu', time: 'All Day' },
  { id: 'BREAKFAST', label: 'Breakfast', sublabel: 'Tiffin & Dosa', time: '7:00 AM – 11:30 AM' },
  { id: 'LUNCH', label: 'Lunch', sublabel: 'Meals & Biriyani', time: '12:00 PM – 3:30 PM' },
  { id: 'SNACKS', label: 'Evening Snacks', sublabel: 'Chaat & Baji', time: '4:00 PM – 6:30 PM' },
  { id: 'DINNER', label: 'Dinner', sublabel: 'Parotta & Tiffin', time: '7:00 PM – 11:00 PM' },
  { id: 'BEVERAGES', label: 'Beverages', sublabel: 'Juice & Hot Drinks', time: 'All Day' },
];

export function matchesMealPeriod(food: Food, period: MealPeriod): boolean {
  if (period === 'ALL') return true;

  const category = (food.categoryName || '').toLowerCase();
  const name = food.name.toLowerCase();

  switch (period) {
    case 'BREAKFAST':
      return (
        category.includes('tiffin') ||
        category.includes('breakfast') ||
        category.includes('dosa') ||
        name.includes('idli') ||
        name.includes('pongal') ||
        name.includes('vada') ||
        name.includes('poori') ||
        name.includes('dosa') ||
        name.includes('curd') ||
        name.includes('sambar')
      );

    case 'LUNCH':
      return (
        category.includes('meals') ||
        category.includes('rice') ||
        category.includes('starters') ||
        category.includes('non-veg') ||
        name.includes('meals') ||
        name.includes('rice') ||
        name.includes('biriyani') ||
        name.includes('chicken') ||
        name.includes('noodles') ||
        name.includes('gobi') ||
        name.includes('curd') ||
        name.includes('sambar') ||
        name.includes('parotta')
      );

    case 'SNACKS':
      return (
        category.includes('snacks') ||
        category.includes('chaat') ||
        name.includes('baji') ||
        name.includes('bonda') ||
        name.includes('puri') ||
        name.includes('cutlet') ||
        name.includes('vada')
      );

    case 'DINNER':
      return (
        category.includes('parotta') ||
        category.includes('dosa') ||
        category.includes('rice') ||
        category.includes('starters') ||
        name.includes('parotta') ||
        name.includes('dosa') ||
        name.includes('noodles') ||
        name.includes('rice') ||
        name.includes('chicken') ||
        name.includes('kothu') ||
        name.includes('biriyani') ||
        name.includes('idli')
      );

    case 'BEVERAGES':
      return (
        category.includes('beverage') ||
        category.includes('juice') ||
        category.includes('drink') ||
        category.includes('hot') ||
        category.includes('tea') ||
        category.includes('coffee') ||
        name.includes('coffee') ||
        name.includes('tea') ||
        name.includes('juice') ||
        name.includes('lemon') ||
        name.includes('watermelon') ||
        name.includes('pomegranate') ||
        name.includes('orange') ||
        name.includes('pineapple') ||
        name.includes('sathukudi') ||
        name.includes('apple') ||
        name.includes('shake') ||
        name.includes('soda') ||
        name.includes('drink') ||
        name.includes('water')
      );

    default:
      return true;
  }
}

export const CustomerMenuPage: React.FC = () => {
  const { restaurantStatus, restaurantId } = useOutletContext<{
    restaurantStatus?: boolean;
    restaurantId?: string;
  }>();

  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedMealPeriod, setSelectedMealPeriod] = useState<MealPeriod>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      try {
        let restId = restaurantId;
        if (!restId) {
          const restRes = await apiClient.get('/restaurants');
          if (restRes.data.data && restRes.data.data.length > 0) {
            restId = restRes.data.data[0].id;
          }
        }

        if (restId) {
          const foodsRes = await apiClient.get(`/foods?restaurantId=${restId}`);
          setFoods(foodsRes.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load menu:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, [restaurantId]);

  // Filter foods by Meal Period (Breakfast, Lunch, Evening Snacks, Dinner, Beverages), Search and Vegetarian
  const filteredFoods = foods.filter((food) => {
    const matchMeal = matchesMealPeriod(food, selectedMealPeriod);
    const matchSearch =
      searchTerm.trim() === '' ||
      food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (food.description && food.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchVeg = !vegOnly || food.isVegetarian;

    return matchMeal && matchSearch && matchVeg;
  });

  const getCountForPeriod = (period: MealPeriod) => {
    return foods.filter((f) => matchesMealPeriod(f, period)).length;
  };

  const currentPeriod = MEAL_PERIODS.find((p) => p.id === selectedMealPeriod);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Restaurant status banner if closed */}
      {restaurantStatus === false && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>
            The restaurant is currently <strong>CLOSED</strong>. You can view menu items and prices, but cart checkout will open when the kitchen resumes.
          </span>
        </div>
      )}

      {/* Header & Controls Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-slate-800/80 w-full">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-100 flex items-center gap-2 tracking-tight">
            <Utensils className="w-5 h-5 sm:w-6 sm:h-6 text-brand-400" />
            Today's Fresh Menu
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Authentic South Indian specialties prepared fresh to order
          </p>
        </div>

        {/* Search & Veg toggle */}
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-60 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input pl-9 pr-7 text-xs py-2 w-full rounded-xl"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setVegOnly((v) => !v)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition duration-150 flex-shrink-0 ${
              vegOnly
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full transition-all ${
                vegOnly ? 'bg-emerald-400 shadow-sm animate-pulse' : 'bg-slate-600'
              }`}
            />
            <span>Veg Only</span>
          </button>
        </div>
      </div>

      {/* Professional Category Bar: All Items, Breakfast, Lunch, Evening Snacks, Dinner, Beverages */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {MEAL_PERIODS.map((period) => {
          const isSelected = selectedMealPeriod === period.id;
          const count = getCountForPeriod(period.id);

          return (
            <button
              key={period.id}
              onClick={() => setSelectedMealPeriod(period.id)}
              className={`relative flex flex-col justify-between p-2.5 sm:p-3.5 rounded-2xl border text-left transition-all duration-200 group overflow-hidden ${
                isSelected
                  ? 'bg-gradient-to-b from-brand-500/15 via-slate-900/95 to-slate-900 border-brand-500/70 shadow-lg shadow-brand-500/10 ring-1 ring-brand-500/30'
                  : 'bg-slate-900/75 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700 text-slate-300'
              }`}
            >
              {/* Active top accent indicator bar */}
              {isSelected && (
                <span className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-400 via-emerald-400 to-brand-500 shadow-sm" />
              )}

              {/* Title & Count Badge */}
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span
                  className={`text-xs sm:text-sm font-bold tracking-tight truncate ${
                    isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
                  }`}
                >
                  {period.label}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 transition ${
                    isSelected
                      ? 'bg-brand-500 text-slate-950 font-black shadow-sm'
                      : 'bg-slate-800/90 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                  }`}
                >
                  {count}
                </span>
              </div>

              {/* Timing / Subtitle */}
              <div className="space-y-0.5">
                <span
                  className={`text-[11px] font-medium block truncate ${
                    isSelected ? 'text-brand-300' : 'text-slate-400 group-hover:text-slate-300'
                  }`}
                >
                  {period.sublabel}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  {period.time}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Category Results Summary Filter Status */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>
            Showing <strong className="text-slate-200 font-semibold">{filteredFoods.length}</strong> {filteredFoods.length === 1 ? 'dish' : 'dishes'} in <span className="text-brand-400 font-bold">{currentPeriod?.label}</span>
          </span>
          {vegOnly && <span className="text-emerald-400 font-medium">(Vegetarian only)</span>}
          {searchTerm && <span className="text-slate-300">matching "{searchTerm}"</span>}
        </div>

        {(searchTerm || vegOnly || selectedMealPeriod !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setVegOnly(false);
              setSelectedMealPeriod('ALL');
            }}
            className="text-[11px] text-brand-400 hover:text-brand-300 hover:underline"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Food Items Grid */}
      {loading ? (
        <LoadingSkeleton count={4} />
      ) : filteredFoods.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No food items found"
          description="Try selecting another category, changing your search keywords, or turning off the vegetarian filter."
          actionText="Clear Filters"
          onAction={() => {
            setSearchTerm('');
            setSelectedMealPeriod('ALL');
            setVegOnly(false);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredFoods.map((food) => (
            <FoodCard
              key={food.id}
              food={food}
              isRestaurantOpen={restaurantStatus !== false}
            />
          ))}
        </div>
      )}
    </div>
  );
};
