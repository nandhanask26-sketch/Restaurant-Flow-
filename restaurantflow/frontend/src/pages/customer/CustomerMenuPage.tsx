import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Search, 
  Utensils, 
  AlertCircle, 
  X, 
  Sparkles,
  LayoutGrid,
  Coffee,
  Flame,
  Moon,
  CupSoda,
  Leaf
} from 'lucide-react';
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
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'ALL', label: 'All Items', sublabel: 'Full Menu', icon: LayoutGrid },
  { id: 'BREAKFAST', label: 'Breakfast', sublabel: 'Tiffin & Dosa', icon: Coffee },
  { id: 'LUNCH', label: 'Lunch', sublabel: 'Meals & Biriyani', icon: Utensils },
  { id: 'SNACKS', label: 'Evening Snacks', sublabel: 'Chaat & Baji', icon: Flame },
  { id: 'DINNER', label: 'Dinner', sublabel: 'Parotta & Tiffin', icon: Moon },
  { id: 'BEVERAGES', label: 'Beverages', sublabel: 'Juice & Drinks', icon: CupSoda },
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

  // Filter foods by Meal Period, Search and Vegetarian
  const filteredFoods = foods.filter((food) => {
    const matchMeal = matchesMealPeriod(food, selectedMealPeriod);
    const matchSearch =
      searchTerm.trim() === '' ||
      food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (food.description && food.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchVeg = !vegOnly || food.isVegetarian;

    return matchMeal && matchSearch && matchVeg;
  });

  const currentPeriod = MEAL_PERIODS.find((p) => p.id === selectedMealPeriod);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Restaurant status banner if closed */}
      {restaurantStatus === false && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
          <span>
            The restaurant is currently <strong>CLOSED</strong>. You can browse menu items and prices, but ordering will resume when the kitchen opens.
          </span>
        </div>
      )}

      {/* Artisanal South Indian Hero Banner matching reference image */}
      <div className="relative rounded-3xl overflow-hidden border border-[#EADBCC] dark:border-slate-800 bg-gradient-to-r from-[#F7F2E8] via-[#FAF6EE] to-[#F1E8DC] dark:from-[#18202A] dark:via-[#141A22] dark:to-[#18202A] p-5 sm:p-7 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          {/* Left Side: Cursive quote, Bold Headline, Subtitle */}
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-script text-xl sm:text-2xl text-[#6B655F] dark:text-stone-300 italic">
                Authentic Taste for a Better Tomorrow
              </span>
              <span className="text-emerald-700 dark:text-emerald-400 text-base">🍃</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black tracking-tight text-[#1C1917] dark:text-slate-100 my-1">
              Today's <span className="text-[#0D5C3A] dark:text-emerald-400">Fresh</span> Menu
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-[#57534E] dark:text-stone-300 font-medium flex items-center gap-1.5 mt-2">
              Authentic South Indian specialities prepared fresh to order <span className="text-[#0D5C3A] dark:text-emerald-400">✔</span>
            </p>
          </div>

          {/* Right Side: Banana Leaf Feast Platter Image matching reference image */}
          <div className="flex-shrink-0 flex justify-center md:justify-end">
            <div className="relative w-full max-w-[320px] sm:max-w-[380px] lg:max-w-[420px] rounded-2xl overflow-hidden shadow-sm border border-[#E8DFD1]/60 dark:border-slate-800">
              <img
                src="/images/south_indian_dosa_feast.jpg"
                alt="South Indian Traditional Dosa & Idli Feast"
                className="w-full h-auto object-cover rounded-2xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills Bar and Search / Veg Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {MEAL_PERIODS.map((period) => {
            const isSelected = selectedMealPeriod === period.id;
            const Icon = period.icon;

            return (
              <button
                key={period.id}
                type="button"
                onClick={() => setSelectedMealPeriod(period.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-150 flex-shrink-0 select-none ${
                  isSelected
                    ? 'bg-[#0D5C3A] text-white shadow-xs border border-[#0D5C3A]'
                    : 'bg-white dark:bg-[#151C28] border border-[#EADBCC] dark:border-slate-800 text-[#1C1917] dark:text-slate-200 hover:bg-[#F5EFE6] dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-stone-600 dark:text-slate-400'}`} />
                <span className={isSelected ? 'text-white' : ''}>{period.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Veg Only Toolbar */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="relative flex-1 sm:w-56 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white dark:bg-[#151C28] border border-[#EADBCC] dark:border-slate-800 text-[#1C1917] dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 rounded-xl pl-9 pr-7 py-2 text-xs w-full focus:outline-none focus:ring-2 focus:ring-[#0D5C3A] transition shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-white p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setVegOnly((v) => !v)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition duration-150 flex-shrink-0 ${
              vegOnly
                ? 'bg-emerald-50 text-emerald-800 border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-600 shadow-2xs'
                : 'bg-white dark:bg-[#151C28] text-stone-700 dark:text-slate-300 border-[#EADBCC] dark:border-slate-800 hover:border-emerald-500 hover:text-emerald-700'
            }`}
          >
            <Leaf className={`w-3.5 h-3.5 ${vegOnly ? 'text-emerald-600 fill-emerald-600' : 'text-stone-400'}`} />
            <span>Veg Only</span>
          </button>
        </div>
      </div>

      {/* Category Results Summary Filter Status */}
      <div className="flex items-center justify-between text-xs text-[#78716C] dark:text-slate-400 px-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#0D5C3A] dark:text-emerald-400" />
          <span>
            Showing <strong className="text-[#1C1917] dark:text-slate-200 font-bold">{filteredFoods.length}</strong> {filteredFoods.length === 1 ? 'dish' : 'dishes'} in <span className="text-[#0D5C3A] dark:text-emerald-400 font-extrabold">{currentPeriod?.label}</span>
          </span>
          {vegOnly && <span className="text-emerald-700 dark:text-emerald-400 font-semibold">(Vegetarian only)</span>}
          {searchTerm && <span className="text-stone-800 dark:text-slate-300">matching "{searchTerm}"</span>}
        </div>

        {(searchTerm || vegOnly || selectedMealPeriod !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setVegOnly(false);
              setSelectedMealPeriod('ALL');
            }}
            className="text-[11px] font-bold text-[#0D5C3A] dark:text-emerald-400 hover:underline"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Food Items Grid: 4 cards in a row matching reference screenshot */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
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

