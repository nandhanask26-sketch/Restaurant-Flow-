import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Filter, Utensils, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Food, Category } from '../../types';
import { FoodCard } from '../../components/FoodCard';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { EmptyState } from '../../components/EmptyState';

export const CustomerMenuPage: React.FC = () => {
  const { restaurantStatus, restaurantId } = useOutletContext<{
    restaurantStatus?: boolean;
    restaurantId?: string;
  }>();

  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
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
          const [foodsRes, catRes] = await Promise.all([
            apiClient.get(`/foods?restaurantId=${restId}`),
            apiClient.get(`/foods/categories?restaurantId=${restId}`),
          ]);
          setFoods(foodsRes.data.data || []);
          setCategories(catRes.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load menu:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, [restaurantId]);

  // Filter foods by Category, Search and Vegetarian
  const filteredFoods = foods.filter((food) => {
    const matchCategory =
      selectedCategory === 'ALL' || food.categoryId === selectedCategory;
    const matchSearch =
      searchTerm.trim() === '' ||
      food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (food.description && food.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchVeg = !vegOnly || food.isVegetarian;

    return matchCategory && matchSearch && matchVeg;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Restaurant status banner if closed */}
      {restaurantStatus === false && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>
            The restaurant is currently <strong>CLOSED</strong>. You can view menu items and prices, but cart checkout will open when the kitchen resumes.
          </span>
        </div>
      )}

      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Utensils className="w-6 h-6 text-brand-400" />
            Today's Fresh Menu
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Prepared to order with traditional culinary craftsmanship
          </p>
        </div>

        {/* Search & Veg toggle */}
        <div className="flex items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search biriyani, idli, meals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input pl-9 text-xs py-2"
            />
          </div>

          <button
            onClick={() => setVegOnly((v) => !v)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
              vegOnly
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                vegOnly ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            Veg Only
          </button>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition ${
            selectedCategory === 'ALL'
              ? 'btn-primary'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          All Items ({foods.length})
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition ${
              selectedCategory === cat.id
                ? 'btn-primary'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Food Items Grid */}
      {loading ? (
        <LoadingSkeleton count={4} />
      ) : filteredFoods.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No food items found"
          description="Try changing your search terms or clearing the vegetarian filter."
          actionText="Clear Filters"
          onAction={() => {
            setSearchTerm('');
            setSelectedCategory('ALL');
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
