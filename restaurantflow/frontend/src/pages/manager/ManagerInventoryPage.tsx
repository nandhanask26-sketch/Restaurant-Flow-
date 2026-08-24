import React, { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Boxes,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  Check,
  Edit2,
  Edit3,
  Search,
  IndianRupee,
  TrendingUp,
  Package,
  Sparkles,
  SlidersHorizontal,
  Flame,
  Save,
  CheckCheck,
  Ban
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { InventoryItem } from '../../types';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { EmptyState } from '../../components/EmptyState';

export const ManagerInventoryPage: React.FC = () => {
  const { restaurantId } = useOutletContext<{ restaurantId: string }>();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'SOLD_OUT'>('ALL');

  // Modal Editing State
  const [modalItem, setModalItem] = useState<InventoryItem | null>(null);
  const [modalPrice, setModalPrice] = useState<number>(0);
  const [modalQuantity, setModalQuantity] = useState<number>(0);
  const [modalThreshold, setModalThreshold] = useState<number>(5);
  const [modalReason, setModalReason] = useState<'RESTOCK' | 'MANUAL_ADJUSTMENT' | 'SPOILAGE'>('RESTOCK');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Inline Editing State: Track foodId -> active field ('PRICE' | 'STOCK' | null) and temp values
  const [inlineEditing, setInlineEditing] = useState<{
    foodId: string;
    field: 'PRICE' | 'STOCK';
  } | null>(null);
  const [inlineValue, setInlineValue] = useState<string>('');
  const [inlineSubmitting, setInlineSubmitting] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const loadInventory = async (isManualRefresh = false) => {
    if (!restaurantId) return;
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data } = await apiClient.get(`/inventory?restaurantId=${restaurantId}`);
      setInventory(data.data || []);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [restaurantId]);

  // Categories extracted from inventory items
  const categories = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach((item) => {
      if (item.categoryName) set.add(item.categoryName);
    });
    return Array.from(set);
  }, [inventory]);

  // Summary Metrics (Numbers: total recipes, available stock, low stock, completely sold out)
  const metrics = useMemo(() => {
    const totalRecipes = inventory.length;
    const totalUnits = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const lowStockCount = inventory.filter(
      (item) => item.quantity > 0 && item.quantity <= item.lowStockThreshold
    ).length;
    const soldOutCount = inventory.filter((item) => item.quantity === 0).length;
    const totalValuation = inventory.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.price || 0),
      0
    );
    return { totalRecipes, totalUnits, lowStockCount, soldOutCount, totalValuation };
  }, [inventory]);

  // Filtered Items
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        item.foodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.categoryName && item.categoryName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'ALL' || item.categoryName === selectedCategory;

      const isSoldOut = item.quantity === 0;
      const isLow = item.quantity > 0 && item.quantity <= item.lowStockThreshold;
      const isInStock = item.quantity > item.lowStockThreshold;

      let matchesStatus = true;
      if (statusFilter === 'SOLD_OUT') matchesStatus = isSoldOut;
      else if (statusFilter === 'LOW_STOCK') matchesStatus = isLow;
      else if (statusFilter === 'IN_STOCK') matchesStatus = isInStock;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [inventory, searchTerm, selectedCategory, statusFilter]);

  // Open Full Edit Modal
  const handleOpenEditModal = (item: InventoryItem) => {
    setModalItem(item);
    setModalPrice(item.price);
    setModalQuantity(item.quantity);
    setModalThreshold(item.lowStockThreshold || 5);
    setModalReason('RESTOCK');
  };

  // Submit Full Edit Modal
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalItem) return;
    setModalSubmitting(true);

    try {
      await apiClient.patch(`/inventory/${modalItem.foodId}`, {
        restaurantId,
        quantity: modalQuantity,
        price: modalPrice,
        lowStockThreshold: modalThreshold,
        reason: modalReason,
      });

      // Update local state optimistically
      setInventory((prev) =>
        prev.map((item) =>
          item.foodId === modalItem.foodId
            ? {
                ...item,
                price: modalPrice,
                quantity: modalQuantity,
                lowStockThreshold: modalThreshold,
              }
            : item
        )
      );

      showToast(`Updated "${modalItem.foodName}" — Price: ₹${modalPrice}, Stock: ${modalQuantity} units`);
      setModalItem(null);
      loadInventory(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update recipe amount and stock');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Start Inline Edit
  const startInlineEdit = (item: InventoryItem, field: 'PRICE' | 'STOCK') => {
    setInlineEditing({ foodId: item.foodId, field });
    setInlineValue(field === 'PRICE' ? String(item.price) : String(item.quantity));
  };

  // Save Inline Edit
  const saveInlineEdit = async (item: InventoryItem) => {
    if (!inlineEditing) return;
    const numVal = parseFloat(inlineValue);

    if (isNaN(numVal) || numVal < 0) {
      setInlineEditing(null);
      return;
    }

    setInlineSubmitting(true);
    try {
      if (inlineEditing.field === 'PRICE') {
        if (numVal <= 0) {
          alert('Price must be greater than 0');
          setInlineSubmitting(false);
          return;
        }
        await apiClient.patch(`/inventory/${item.foodId}`, {
          restaurantId,
          price: numVal,
        });
        setInventory((prev) =>
          prev.map((i) => (i.foodId === item.foodId ? { ...i, price: numVal } : i))
        );
        showToast(`Updated "${item.foodName}" price to ₹${numVal}`);
      } else {
        await apiClient.patch(`/inventory/${item.foodId}`, {
          restaurantId,
          quantity: Math.floor(numVal),
          reason: 'MANUAL_ADJUSTMENT',
        });
        setInventory((prev) =>
          prev.map((i) => (i.foodId === item.foodId ? { ...i, quantity: Math.floor(numVal) } : i))
        );
        showToast(`Updated "${item.foodName}" stock to ${Math.floor(numVal)} units`);
      }
      setInlineEditing(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update item');
    } finally {
      setInlineSubmitting(false);
    }
  };

  // Quick Stock Step Adjustment (+5, +10, -1)
  const handleQuickAdd = async (item: InventoryItem, delta: number) => {
    const updatedQty = Math.max(0, item.quantity + delta);

    // Optimistic UI update
    setInventory((prev) =>
      prev.map((i) => (i.foodId === item.foodId ? { ...i, quantity: updatedQty } : i))
    );

    try {
      await apiClient.patch(`/inventory/${item.foodId}`, {
        restaurantId,
        quantity: updatedQty,
        reason: delta > 0 ? 'RESTOCK' : 'MANUAL_ADJUSTMENT',
      });
      showToast(`${delta > 0 ? `+${delta}` : delta} units adjusted for "${item.foodName}"`);
    } catch (err) {
      console.error('Failed quick stock update:', err);
      loadInventory();
    }
  };

  const lowStockItems = inventory.filter((item) => item.quantity <= item.lowStockThreshold);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-950 border border-emerald-500/50 text-emerald-200 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-bounce-short">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-brand-400" />
            Live Food Inventory & Recipe Control
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time stock management, low-stock threshold triggers, and recipe amount controls.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start">
          <button
            onClick={() => loadInventory(true)}
            disabled={refreshing}
            className="btn-secondary text-xs py-2.5 px-4 flex items-center gap-2"
            title="Reload latest stock and pricing data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-400' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Total Recipes */}
        <div className="glass-card bg-slate-900/90 border-slate-800/80 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Recipes</div>
            <div className="text-2xl font-black text-slate-100 font-mono">{metrics.totalRecipes}</div>
            <div className="text-[10px] text-slate-500">Configured dishes</div>
          </div>
        </div>

        {/* 2. Available Stocks */}
        <div className="glass-card bg-slate-900/90 border-slate-800/80 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Available Stocks</div>
            <div className="text-2xl font-black text-emerald-400 font-mono">{metrics.totalUnits.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-slate-500">Total units count</div>
          </div>
        </div>

        {/* 3. Low Stock */}
        <div className="glass-card bg-slate-900/90 border-slate-800/80 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Low Stock</div>
            <div className="text-2xl font-black text-amber-400 font-mono">{metrics.lowStockCount}</div>
            <div className="text-[10px] text-slate-500">Below threshold</div>
          </div>
        </div>

        {/* 4. Completely Sold Out */}
        <div className="glass-card bg-slate-900/90 border-slate-800/80 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Completely Sold Out</div>
            <div className="text-2xl font-black text-rose-400 font-mono">{metrics.soldOutCount}</div>
            <div className="text-[10px] text-slate-500">0 units available</div>
          </div>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
            <span>
              <strong>{lowStockItems.length} recipe(s)</strong> are low on stock or sold out (
              {lowStockItems.slice(0, 4).map((i) => i.foodName).join(', ')}
              {lowStockItems.length > 4 ? ` +${lowStockItems.length - 4} more` : ''}).
            </span>
          </div>
          <button
            onClick={() => setStatusFilter('LOW_STOCK')}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg font-bold transition flex-shrink-0"
          >
            Filter Low Stock
          </button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="glass-card bg-slate-900/90 border-slate-800/80 p-3.5 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search recipes, dishes or categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category & Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 rounded-xl text-xs py-2 px-3 text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Categories ({inventory.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status Buttons */}
          <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-1 text-xs">
            {(['ALL', 'IN_STOCK', 'LOW_STOCK', 'SOLD_OUT'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  statusFilter === st
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'ALL'
                  ? 'All'
                  : st === 'IN_STOCK'
                  ? 'In Stock'
                  : st === 'LOW_STOCK'
                  ? 'Low Stock'
                  : 'Sold Out'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <LoadingSkeleton count={4} />
      ) : filteredInventory.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No Matching Food Items Found"
          description={
            searchTerm || selectedCategory !== 'ALL' || statusFilter !== 'ALL'
              ? 'Try adjusting your search or filters to see more dishes.'
              : 'No inventory records found for this restaurant.'
          }
        />
      ) : (
        <div className="glass-card bg-slate-900/90 border-slate-800 overflow-hidden rounded-2xl shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800/80">
                <tr>
                  <th className="py-4 px-4">Food Item</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Recipe Amount</th>
                  <th className="py-4 px-4">Available Stock</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4 text-center">Quick Adjust</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredInventory.map((item) => {
                  const isSoldOut = item.quantity === 0;
                  const isLow = item.quantity > 0 && item.quantity <= item.lowStockThreshold;
                  const isEditingPrice =
                    inlineEditing?.foodId === item.foodId && inlineEditing?.field === 'PRICE';
                  const isEditingStock =
                    inlineEditing?.foodId === item.foodId && inlineEditing?.field === 'STOCK';

                  return (
                    <tr
                      key={item.id || item.foodId}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      {/* Food Item Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                          <div>
                            <span className="font-bold text-slate-100 text-sm">{item.foodName}</span>
                            <div className="text-[10px] text-slate-500 font-mono">ID: {item.foodId.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-slate-400 font-medium">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                          {item.categoryName || 'General'}
                        </span>
                      </td>

                      {/* Recipe Amount / Price (Inline Editable) */}
                      <td className="py-3.5 px-4">
                        {isEditingPrice ? (
                          <div className="flex items-center gap-1.5">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                              <input
                                type="number"
                                min={1}
                                autoFocus
                                value={inlineValue}
                                onChange={(e) => setInlineValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveInlineEdit(item);
                                  if (e.key === 'Escape') setInlineEditing(null);
                                }}
                                className="w-24 pl-6 pr-2 py-1 bg-slate-950 border border-brand-500 rounded-lg text-sm font-bold text-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-glow"
                              />
                            </div>
                            <button
                              onClick={() => saveInlineEdit(item)}
                              disabled={inlineSubmitting}
                              className="p-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition"
                              title="Save Price (Enter)"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setInlineEditing(null)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
                              title="Cancel (Esc)"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => startInlineEdit(item, 'PRICE')}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 hover:border-brand-500/50 cursor-pointer transition group/price"
                            title="Click to quickly edit price"
                          >
                            <span className="font-extrabold text-sm text-brand-400 font-mono">
                              ₹{item.price.toFixed(0)}
                            </span>
                            <Edit2 className="w-3 h-3 text-slate-500 group-hover/price:text-brand-400 transition" />
                          </div>
                        )}
                      </td>

                      {/* Available Stock (Inline Editable) */}
                      <td className="py-3.5 px-4">
                        {isEditingStock ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              autoFocus
                              value={inlineValue}
                              onChange={(e) => setInlineValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEdit(item);
                                if (e.key === 'Escape') setInlineEditing(null);
                              }}
                              className="w-20 px-2.5 py-1 bg-slate-950 border border-emerald-500 rounded-lg text-sm font-bold text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-glow"
                            />
                            <button
                              onClick={() => saveInlineEdit(item)}
                              disabled={inlineSubmitting}
                              className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition"
                              title="Save Stock (Enter)"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setInlineEditing(null)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
                              title="Cancel (Esc)"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => startInlineEdit(item, 'STOCK')}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 hover:border-emerald-500/50 cursor-pointer transition group/stock"
                            title="Click to quickly edit available stock"
                          >
                            <span
                              className={`text-sm font-mono font-black ${
                                isSoldOut
                                  ? 'text-rose-400'
                                  : isLow
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {item.quantity} units
                            </span>
                            <Edit2 className="w-3 h-3 text-slate-500 group-hover/stock:text-emerald-400 transition" />
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {isSoldOut ? (
                          <span className="badge-red text-[11px] font-bold">SOLD OUT</span>
                        ) : isLow ? (
                          <span className="badge-orange text-[11px] font-bold">LOW STOCK</span>
                        ) : (
                          <span className="badge-green text-[11px] font-bold">IN STOCK</span>
                        )}
                      </td>

                      {/* Quick Adjust Buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                          <button
                            onClick={() => handleQuickAdd(item, -1)}
                            disabled={item.quantity <= 0}
                            className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 hover:text-rose-400 transition"
                            title="Deduct 1 unit"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleQuickAdd(item, 5)}
                            className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-brand-500/20 text-brand-400 hover:text-brand-300 font-extrabold text-[11px] transition"
                            title="Add 5 units batch"
                          >
                            +5
                          </button>
                          <button
                            onClick={() => handleQuickAdd(item, 10)}
                            className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-brand-500/20 text-brand-400 hover:text-brand-300 font-extrabold text-[11px] transition"
                            title="Add 10 units batch"
                          >
                            +10
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-brand-500 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 hover:border-brand-500 transition shadow-sm flex items-center gap-1.5 ml-auto"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Recipe / Stock</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full Recipe & Stock Edit Modal */}
      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="glass-card w-full max-w-lg bg-slate-900 border-slate-700 p-6 rounded-3xl space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-brand-400 uppercase tracking-wider">
                    Edit Recipe & Inventory Control
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-100">{modalItem.foodName}</h3>
                </div>
              </div>
              <button
                onClick={() => setModalItem(null)}
                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* Recipe Price & Stock Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Recipe Amount (Price) */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Recipe Amount / Price (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min={1}
                      required
                      value={modalPrice}
                      onChange={(e) => setModalPrice(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-extrabold text-base focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Customer checkout price per serving</p>
                </div>

                {/* Stock Quantity */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Available Stock (Units)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={modalQuantity}
                    onChange={(e) => setModalQuantity(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-extrabold text-base focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  {/* Stepper shortcuts */}
                  <div className="flex items-center gap-1 pt-1">
                    {[-5, -1, 1, 5, 10].map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setModalQuantity((prev) => Math.max(0, prev + step))}
                        className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300"
                      >
                        {step > 0 ? `+${step}` : step}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Real-time Total Valuation Callout */}
              <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  <span className="text-slate-300 font-medium">Batch Valuation:</span>
                </div>
                <div className="font-extrabold text-brand-300 text-sm font-mono">
                  {modalQuantity} units × ₹{modalPrice} = ₹{(modalQuantity * modalPrice).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Stock Reason & Low Stock Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Reason for Adjustment
                  </label>
                  <select
                    value={modalReason}
                    onChange={(e) => setModalReason(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="RESTOCK">Restock (Fresh Kitchen Batch)</option>
                    <option value="MANUAL_ADJUSTMENT">Manual Stock Correction</option>
                    <option value="SPOILAGE">Spoilage / Wastage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Low Stock Alert Trigger
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={modalThreshold}
                    onChange={(e) => setModalThreshold(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalItem(null)}
                  className="btn-secondary text-xs py-2.5 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="btn-primary text-xs py-2.5 px-6 font-bold shadow-glow flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{modalSubmitting ? 'Saving Changes...' : 'Save Recipe & Stock'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
