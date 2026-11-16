"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Boxes,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  FileText,
  Sliders,
} from "lucide-react";
import { useLanguageStore } from "@/store/languageStore";
import { useAuthStore } from "@/store/authStore";

interface Ingredient {
  id: number;
  name: string;
  code: string;
  unit: string;
  stock: number | string;
  minStock: number | string;
  cost: number | string;
  _count?: {
    productItems: number;
    purchaseItems: number;
  };
  productItems?: Array<{
    product: {
      id: number;
      name: string;
      code: string;
      price: number | string;
    };
    quantity: number | string;
  }>;
  createdAt: string;
}

const emptyForm = {
  name: "",
  code: "",
  unit: "g",
  cost: "0.00",
  minStock: "5.00",
  stock: "0.00",
};

export default function IngredientsPage() {
  const { t } = useLanguageStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Stock Adjust Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<Ingredient | null>(null);
  const [adjustType, setAdjustType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // Detail Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailItem, setDetailItem] = useState<Ingredient | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchIngredients = useCallback(async () => {
    setLoading(true);
    let url = `/api/ingredients?search=${encodeURIComponent(search)}`;
    if (lowStockOnly) url += `&lowStock=true`;

    try {
      const res = await fetch(url);
      if (res.ok) setIngredients(await res.json());
    } catch (err) {
      console.error("Error fetching ingredients:", err);
    } finally {
      setLoading(false);
    }
  }, [search, lowStockOnly]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (ing: Ingredient) => {
    setEditing(ing);
    setForm({
      name: ing.name,
      code: ing.code,
      unit: ing.unit,
      cost: String(ing.cost),
      minStock: String(ing.minStock),
      stock: String(ing.stock),
    });
    setError("");
    setShowModal(true);
  };

  const openAdjust = (ing: Ingredient) => {
    setAdjustTarget(ing);
    setAdjustType("IN");
    setAdjustQty("");
    setAdjustNote("");
    setError("");
    setShowAdjustModal(true);
  };

  const openDetail = async (ing: Ingredient) => {
    setDetailItem(ing);
    setShowDetailModal(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/ingredients/${ing.id}`);
      if (res.ok) setDetailItem(await res.json());
    } catch (err) {
      console.error("Error fetching ingredient details:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.unit.trim()) {
      setError("Name and Unit are required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = editing ? `/api/ingredients/${editing.id}` : `/api/ingredients`;
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save ingredient");
      }

      setShowModal(false);
      fetchIngredients();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget || !adjustQty || parseFloat(adjustQty) <= 0) {
      setError("Please enter a valid quantity greater than 0");
      return;
    }

    setAdjusting(true);
    setError("");

    try {
      const res = await fetch(`/api/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientId: adjustTarget.id,
          type: adjustType,
          quantity: parseFloat(adjustQty),
          note: adjustNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to adjust stock");
      }

      setShowAdjustModal(false);
      fetchIngredients();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdjusting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      alert(t("ingredients.deleteAdminOnly"));
      return;
    }
    try {
      const res = await fetch(`/api/ingredients/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || data.error || "Failed to delete ingredient");
        return;
      }
      setDeleteConfirm(null);
      fetchIngredients();
    } catch (err) {
      console.error("Delete error:", err);
      alert("មានបញ្ហាក្នុងការលុបគ្រឿងផ្សំ សូមព្យាយាមម្តងទៀត");
    }
  };

  const units = ["g", "ml", "kg", "l", "pcs", "pack", "bag", "oz", "tbsp", "tsp"];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="text-indigo-600 dark:text-indigo-400" /> {t("ingredients.title")}
          </h1>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          <Plus size={18} /> {t("ingredients.addIngredient")}
        </button>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={t("ingredients.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${lowStockOnly
                ? "bg-amber-500 text-white border-amber-500 dark:bg-amber-600"
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750"
              }`}
          >
            <AlertTriangle size={14} /> {t("ingredients.lowStockOnly")}
          </button>
        </div>
      </div>

      {/* Ingredients Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <Loader2 className="animate-spin mr-2" size={24} /> {t("ingredients.loading")}
          </div>
        ) : ingredients.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <Boxes className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-base font-semibold">{t("ingredients.noIngredients")}</p>
            <p className="text-xs text-slate-400 mt-1">
              {search || lowStockOnly ? "Try clearing search or filters." : t("ingredients.noIngredientsSub")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">{t("ingredients.colCode")}</th>
                  <th className="px-4 py-3">{t("ingredients.colName")}</th>
                  <th className="px-4 py-3">{t("ingredients.colUnit")}</th>
                  <th className="px-4 py-3 text-right">{t("ingredients.colUnitCost")}</th>
                  <th className="px-4 py-3 text-right">{t("ingredients.colCurrentStock")}</th>
                  <th className="px-4 py-3 text-right">{t("ingredients.colMinStock")}</th>
                  <th className="px-4 py-3 text-center">{t("ingredients.colStatus")}</th>
                  <th className="px-4 py-3 text-center">{t("ingredients.colRecipes")}</th>
                  <th className="px-4 py-3 text-right">{t("ingredients.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ingredients.map((ing) => {
                  const stockNum = Number(ing.stock);
                  const minStockNum = Number(ing.minStock);
                  const isOutOfStock = stockNum <= 0;
                  const isLowStock = stockNum > 0 && stockNum <= minStockNum;

                  return (
                    <tr key={ing.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900 dark:text-white">
                        {ing.code}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {ing.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300">
                          {ing.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Number(ing.cost).toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                        {stockNum.toLocaleString()} <span className="text-xs font-normal text-slate-500">{ing.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                        {minStockNum.toLocaleString()} <span className="text-xs text-slate-400">{ing.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            <XCircle size={12} /> {t("ingredients.outOfStock")}
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <AlertTriangle size={12} /> {t("ingredients.lowStock")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 size={12} /> {t("ingredients.inStock")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openDetail(ing)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          <FileText size={12} />
                          {ing._count?.productItems || 0} {t("ingredients.productsCount")}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openAdjust(ing)}
                            title="Adjust Stock"
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                          >
                            <ArrowUpDown size={16} />
                          </button>
                          <button
                            onClick={() => openEdit(ing)}
                            title="Edit Ingredient"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Pencil size={16} />
                          </button>

                          {isAdmin && (
                            deleteConfirm === ing.id ? (
                              <div className="flex items-center gap-1 ml-1">
                                <button
                                  onClick={() => handleDelete(ing.id)}
                                  className="px-2 py-0.5 bg-rose-600 text-white text-xs font-medium rounded hover:bg-rose-700 cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(ing.id)}
                                title="Delete Ingredient"
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                <Trash2 size={16} />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add / Edit Ingredient */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="text-indigo-600 dark:text-indigo-400" size={20} />
                {editing ? t("ingredients.editIngredient") : t("ingredients.addIngredient")}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("ingredients.nameLabel")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Espresso Beans, Whole Milk"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("ingredients.colCode")}
                  </label>
                  <input
                    type="text"
                    placeholder="ING-001 (Auto if empty)"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("ingredients.unitLabel")} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("ingredients.costLabel")}
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="0.00"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("ingredients.minStockAlert")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="5.00"
                    value={form.minStock}
                    onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                </div>
              </div>

              {!editing && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("ingredients.initialStock")} ({form.unit})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editing ? t("common.save") : t("ingredients.addIngredient")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Adjust Stock */}
      {showAdjustModal && adjustTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowUpDown className="text-indigo-600" size={18} /> {t("ingredients.adjustStock")}: {adjustTarget.name}
              </h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between text-xs">
              <span className="text-slate-500">{t("ingredients.colCurrentStock")}:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {Number(adjustTarget.stock).toLocaleString()} {adjustTarget.unit}
              </span>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-medium">{error}</div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("ingredients.adjustType")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("IN")}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${adjustType === "IN"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                  >
                    {t("ingredients.stockIn")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("OUT")}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${adjustType === "OUT"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                  >
                    {t("ingredients.stockOut")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("ADJUST")}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${adjustType === "ADJUST"
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                  >
                    {t("ingredients.stockSet")}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("ingredients.quantity")} ({adjustTarget.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("ingredients.note")}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Spoilage, Manual count adjustment"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {adjusting && <Loader2 className="animate-spin" size={14} />} Confirm Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ingredient Details & Linked Recipes */}
      {showDetailModal && detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Boxes className="text-indigo-600" size={20} /> {detailItem.name}
                </h3>
                <p className="text-xs font-mono text-slate-400">{detailItem.code}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-8 text-center text-slate-400">
                <Loader2 className="animate-spin mx-auto mb-2" size={24} /> Loading details...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center">
                  <div>
                    <span className="block text-[11px] text-slate-400">Stock</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {Number(detailItem.stock).toLocaleString()} {detailItem.unit}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">Min Stock</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {Number(detailItem.minStock).toLocaleString()} {detailItem.unit}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">Unit Cost</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      ${Number(detailItem.cost).toFixed(4)}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Used In Product Recipes ({detailItem.productItems?.length || 0})
                  </h4>
                  {!detailItem.productItems || detailItem.productItems.length === 0 ? (
                    <p className="text-xs text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      This ingredient is not yet attached to any product recipe.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {detailItem.productItems.map((pi, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {pi.product.name}
                            </span>
                            <span className="ml-2 font-mono text-[10px] text-slate-400">
                              ({pi.product.code})
                            </span>
                          </div>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                            {Number(pi.quantity)} {detailItem.unit} / unit
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
