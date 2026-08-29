import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Utensils, 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar, 
  Clock, 
  Check, 
  X, 
  AlertCircle,
  Sparkles,
  Search,
  UploadCloud
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Food, Category, MealType, MenuSchedule } from '../../types';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';

export const ManagerMenuPage: React.FC = () => {
  const { restaurantId } = useOutletContext<{ restaurantId: string }>();

  const [activeTab, setActiveTab] = useState<'ITEMS' | 'SCHEDULE'>('ITEMS');
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit Food Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [foodFormData, setFoodFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    price: 150,
    preparationTimeMinutes: 15,
    isVegetarian: false,
    isAvailable: true,
    initialStock: 25,
    imageUrl: '',
  });

  // Daily Scheduler State
  const [scheduleDate, setScheduleDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedMealType, setSelectedMealType] = useState<MealType>('LUNCH');
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [selectedFoodIds, setSelectedFoodIds] = useState<string[]>([]);
  const [existingSchedules, setExistingSchedules] = useState<MenuSchedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const loadData = async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const [foodsRes, catRes] = await Promise.all([
        apiClient.get(`/foods?restaurantId=${restaurantId}`),
        apiClient.get(`/foods/categories?restaurantId=${restaurantId}`),
      ]);
      setFoods(foodsRes.data.data || []);
      setCategories(catRes.data.data || []);
    } catch (err) {
      console.error('Failed to load menu data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    if (!restaurantId) return;
    setScheduleLoading(true);
    try {
      const { data } = await apiClient.get(
        `/menu/daily?restaurantId=${restaurantId}&date=${scheduleDate}`
      );
      setExistingSchedules(data.data || []);

      const activeForMeal = (data.data || []).find(
        (s: MenuSchedule) => s.mealType === selectedMealType
      );
      if (activeForMeal && activeForMeal.items) {
        setSelectedFoodIds(activeForMeal.items.map((i: Food) => i.id));
        setScheduleTitle(activeForMeal.title || '');
      } else {
        setSelectedFoodIds([]);
        setScheduleTitle('');
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [restaurantId]);

  useEffect(() => {
    if (activeTab === 'SCHEDULE') {
      loadSchedules();
    }
  }, [activeTab, scheduleDate, selectedMealType, restaurantId]);

  const handleOpenAddModal = () => {
    setEditingFood(null);
    setFoodFormData({
      name: '',
      description: '',
      categoryId: categories[0]?.id || '',
      price: 150,
      preparationTimeMinutes: 15,
      isVegetarian: false,
      isAvailable: true,
      initialStock: 25,
      imageUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (food: Food) => {
    setEditingFood(food);
    setFoodFormData({
      name: food.name,
      description: food.description || '',
      categoryId: food.categoryId || '',
      price: food.price,
      preparationTimeMinutes: food.preparationTimeMinutes,
      isVegetarian: food.isVegetarian,
      isAvailable: food.isAvailable,
      initialStock: food.inventoryQuantity ?? 20,
      imageUrl: food.imageUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image document (PNG, JPG, JPEG, WEBP, etc.)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image document size should be less than 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFoodFormData((prev) => ({ ...prev, imageUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveFood = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFood) {
        await apiClient.patch(`/foods/${editingFood.id}`, foodFormData);
      } else {
        await apiClient.post('/foods', { ...foodFormData, restaurantId });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save food item');
    }
  };

  const handleDeleteFood = async (foodId: string) => {
    if (!confirm('Are you sure you want to delete this food item?')) return;
    try {
      await apiClient.delete(`/foods/${foodId}`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete food item');
    }
  };

  const handleToggleAvailability = async (food: Food) => {
    try {
      await apiClient.patch(`/foods/${food.id}`, { isAvailable: !food.isAvailable });
      loadData();
    } catch (err) {
      console.error('Failed to toggle availability:', err);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFoodIds.length === 0) {
      alert('Please select at least one food item for this meal schedule.');
      return;
    }

    try {
      await apiClient.post('/menu/schedule', {
        restaurantId,
        menuDate: scheduleDate,
        mealType: selectedMealType,
        title: scheduleTitle.trim() || undefined,
        foodIds: selectedFoodIds,
      });
      alert(`Menu schedule for ${selectedMealType} saved!`);
      loadSchedules();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save schedule');
    }
  };

  const toggleFoodSelection = (foodId: string) => {
    setSelectedFoodIds((prev) =>
      prev.includes(foodId) ? prev.filter((id) => id !== foodId) : [...prev, foodId]
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Utensils className="w-6 h-6 text-brand-400" />
            Menu Management & Daily Schedules
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure food items, manage prices, and schedule daily breakfast/lunch/dinner menus
          </p>
        </div>

        {/* Tab Switcher & Add Button */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex">
            <button
              onClick={() => setActiveTab('ITEMS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'ITEMS'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Food Items
            </button>
            <button
              onClick={() => setActiveTab('SCHEDULE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'SCHEDULE'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Daily Meal Scheduler
            </button>
          </div>

          {activeTab === 'ITEMS' && (
            <button
              onClick={handleOpenAddModal}
              className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Food
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Food Items List */}
      {activeTab === 'ITEMS' && (
        <div className="space-y-4">
          {loading ? (
            <LoadingSkeleton count={3} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {foods.map((food) => (
                <div
                  key={food.id}
                  className="glass-card overflow-hidden bg-slate-900 border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="h-36 relative bg-slate-800">
                      <img
                        src={
                          food.imageUrl ||
                          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80'
                        }
                        alt={food.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                              food.isVegetarian ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            title={food.isVegetarian ? 'Vegetarian' : 'Non-Vegetarian'}
                          />
                          <h3 className="text-sm font-bold text-slate-100">{food.name}</h3>
                        </div>
                        <span className="text-sm font-extrabold text-brand-400 flex-shrink-0">
                          ₹{food.price.toFixed(0)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                        {food.description || 'Authentic dish'}
                      </p>
                      <div className="flex items-center justify-end text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">
                          Stock: {food.inventoryQuantity ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0 flex items-center justify-between border-t border-slate-800/80 pt-3">
                    <button
                      onClick={() => handleToggleAvailability(food)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                        food.isAvailable
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {food.isAvailable ? 'Available' : 'Disabled'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(food)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                        title="Edit Food"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteFood(food.id)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete Food"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Daily Meal Scheduler */}
      {activeTab === 'SCHEDULE' && (
        <div className="glass-card p-6 bg-slate-900 border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-400" />
                Schedule Menu by Date & Meal Type
              </h2>
              <p className="text-xs text-slate-400">
                Select which food items are available during Breakfast, Lunch, or Dinner
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="glass-input text-xs py-2"
              />
            </div>
          </div>

          {/* Meal Type Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'] as MealType[]).map((meal) => (
              <button
                key={meal}
                type="button"
                onClick={() => setSelectedMealType(meal)}
                className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  selectedMealType === meal
                    ? 'bg-brand-500 text-white border-brand-500 shadow-glow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{meal}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSaveSchedule} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Schedule Title (Optional)
              </label>
              <input
                type="text"
                value={scheduleTitle}
                onChange={(e) => setScheduleTitle(e.target.value)}
                placeholder="e.g. Royal Afternoon Biriyani Feast"
                className="glass-input text-xs py-2"
              />
            </div>

            {/* Checklist of food items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-300">
                  Select Food Items to Include in {selectedMealType} ({selectedFoodIds.length} Selected):
                </label>
                <div className="space-x-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedFoodIds(foods.map((f) => f.id))}
                    className="text-brand-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFoodIds([])}
                    className="text-slate-400 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto p-1">
                {foods.map((food) => {
                  const isChecked = selectedFoodIds.includes(food.id);
                  return (
                    <div
                      key={food.id}
                      onClick={() => toggleFoodSelection(food.id)}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                        isChecked
                          ? 'bg-brand-500/15 border-brand-500/50 text-slate-100'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            food.isVegetarian ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        <span className="text-xs font-semibold truncate">{food.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-brand-400">₹{food.price}</span>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isChecked
                              ? 'bg-brand-500 border-brand-500 text-white'
                              : 'border-slate-700'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                className="btn-primary text-xs py-2.5 px-6 font-bold shadow-glow"
              >
                Save {selectedMealType} Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add / Edit Food Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-lg bg-slate-900 border-slate-700 p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100">
                {editingFood ? 'Edit Food Item' : 'Add New Food Item'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFood} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Food Name</label>
                <input
                  type="text"
                  required
                  value={foodFormData.name}
                  onChange={(e) => setFoodFormData({ ...foodFormData, name: e.target.value })}
                  placeholder="e.g. Chicken Biriyani"
                  className="glass-input text-xs py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={foodFormData.categoryId}
                    onChange={(e) =>
                      setFoodFormData({ ...foodFormData, categoryId: e.target.value })
                    }
                    className="glass-input text-xs py-2 bg-slate-900"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={foodFormData.price}
                    onChange={(e) =>
                      setFoodFormData({ ...foodFormData, price: parseFloat(e.target.value) })
                    }
                    className="glass-input text-xs py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Preparation Time (Minutes)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={foodFormData.preparationTimeMinutes}
                    onChange={(e) =>
                      setFoodFormData({
                        ...foodFormData,
                        preparationTimeMinutes: parseInt(e.target.value, 10),
                      })
                    }
                    className="glass-input text-xs py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Initial Stock Count
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={foodFormData.initialStock}
                    onChange={(e) =>
                      setFoodFormData({
                        ...foodFormData,
                        initialStock: parseInt(e.target.value, 10),
                      })
                    }
                    className="glass-input text-xs py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Food Item Image
                </label>

                {foodFormData.imageUrl ? (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <img
                      src={foodFormData.imageUrl}
                      alt="Food preview"
                      className="w-14 h-14 rounded-xl object-cover border border-slate-700/60 shadow-sm flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">
                        Selected Image Document
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Document attached for this menu dish
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 border border-slate-600/50 transition inline-flex items-center gap-1">
                          <UploadCloud className="w-3 h-3 text-brand-400" />
                          <span>Change File</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageFileChange}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setFoodFormData((prev) => ({ ...prev, imageUrl: '' }))}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-[11px] font-semibold text-rose-300 border border-rose-500/30 transition inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-brand-500/60 rounded-2xl bg-slate-950/50 hover:bg-slate-900/60 transition cursor-pointer group text-center">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 group-hover:bg-brand-500/20 flex items-center justify-center text-slate-400 group-hover:text-brand-400 mb-2 transition">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                      Choose Image Document
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Upload PNG, JPG, JPEG, WEBP from device (Max 10MB)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={foodFormData.description}
                  onChange={(e) =>
                    setFoodFormData({ ...foodFormData, description: e.target.value })
                  }
                  placeholder="Description of flavors and ingredients..."
                  className="glass-input text-xs py-2"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={foodFormData.isVegetarian}
                    onChange={(e) =>
                      setFoodFormData({ ...foodFormData, isVegetarian: e.target.checked })
                    }
                    className="accent-brand-500"
                  />
                  Vegetarian Dish
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={foodFormData.isAvailable}
                    onChange={(e) =>
                      setFoodFormData({ ...foodFormData, isAvailable: e.target.checked })
                    }
                    className="accent-brand-500"
                  />
                  Available to Order
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs py-2 px-5 shadow-glow">
                  {editingFood ? 'Update Food' : 'Create Food'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
