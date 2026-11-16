"use client";

import { useState, useEffect, useCallback } from "react";
import { Warehouse, Search, Plus, RefreshCw, ArrowUp, ArrowDown, SlidersHorizontal, Loader2, X, Boxes, ShoppingBag } from "lucide-react";
import { useLanguageStore } from "@/store/languageStore";

interface InventoryLog {
  id: number;
  type: string;
  quantity: number | string;
  beforeQty: number | string | null;
  afterQty: number | string | null;
  note: string | null;
  createdAt: string;
  product?: { name: string; code: string; stock: number } | null;
  ingredient?: { name: string; code: string; stock: number; unit: string } | null;
  user: { name: string } | null;
}

interface Product { id: number; name: string; code: string; stock: number; minStock: number; }
interface Ingredient { id: number; name: string; code: string; unit: string; stock: number; minStock: number; }

const typeBadge: Record<string, string> = {
  IN: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  PURCHASE_IN: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  OUT: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
  ORDER_OUT: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
  ADJUST: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  ADJUSTMENT: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
};

export default function InventoryPage() {
  const { t } = useLanguageStore();
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [targetCategory, setTargetCategory] = useState<"INGREDIENT" | "PRODUCT">("INGREDIENT");
  const [form, setForm] = useState({ productId: "", ingredientId: "", type: "IN", quantity: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory");
      if (res.ok) setLogs(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMasters = async () => {
    try {
      const [prodRes, ingRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/ingredients")
      ]);
      if (prodRes.ok) setProducts(await prodRes.json());
      if (ingRes.ok) setIngredients(await ingRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchLogs(); fetchMasters(); }, [fetchLogs]);

  const filtered = logs.filter(l => {
    const itemName = l.ingredient?.name || l.product?.name || "";
    const itemCode = l.ingredient?.code || l.product?.code || "";
    return itemName.toLowerCase().includes(search.toLowerCase()) || itemCode.toLowerCase().includes(search.toLowerCase());
  });

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    const payload = targetCategory === "INGREDIENT" 
      ? { ingredientId: form.ingredientId, type: form.type, quantity: parseFloat(form.quantity), note: form.note }
      : { productId: form.productId, type: form.type, quantity: parseFloat(form.quantity), note: form.note };

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); setSaving(false); return; }
      setShowModal(false);
      setForm({ productId: "", ingredientId: "", type: "IN", quantity: "", note: "" });
      fetchLogs(); fetchMasters();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Warehouse size={24} className="text-indigo-600 dark:text-indigo-400" />
            {t("inventory.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{logs.length} {t("inventory.auditCount")}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLogs} className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => { setError(""); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer">
            <Plus size={16} /> {t("inventory.adjustStock")}
          </button>
        </div>
      </div>

      {/* Stock Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t("inventory.rawIngredients"), value: ingredients.length, icon: Boxes, color: "indigo" },
          { label: t("inventory.lowStockIngredients"), value: ingredients.filter(i => Number(i.stock) <= Number(i.minStock)).length, icon: ArrowDown, color: "rose" },
          { label: t("inventory.stockInToday"), value: logs.filter(l => (l.type === "IN" || l.type === "PURCHASE_IN") && new Date(l.createdAt).toDateString() === new Date().toDateString()).length, icon: ArrowUp, color: "emerald" },
          { label: t("inventory.stockOutToday"), value: logs.filter(l => (l.type === "OUT" || l.type === "ORDER_OUT") && new Date(l.createdAt).toDateString() === new Date().toDateString()).length, icon: ArrowDown, color: "amber" },
        ].map(s => {
          const Icon = s.icon;
          const colors: Record<string, string> = { indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400", rose: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400", emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400", amber: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400" };
          return (
            <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3 shadow-sm">
              <div className={`p-2.5 rounded-xl ${colors[s.color]}`}><Icon size={18} /></div>
              <div><p className="text-xs text-slate-500">{s.label}</p><p className="text-xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p></div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder={t("inventory.filterPlaceholder")} value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-indigo-500" size={28} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  {[t("inventory.colTargetItem"), t("inventory.colCode"), t("inventory.colType"), t("inventory.colQty"), t("inventory.colBefore"), t("inventory.colAfter"), t("inventory.colNote"), t("inventory.colBy"), t("inventory.colDate")].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(log => {
                  const isIngredient = Boolean(log.ingredient);
                  const itemName = log.ingredient?.name || log.product?.name || "Unknown";
                  const itemCode = log.ingredient?.code || log.product?.code || "-";
                  const unit = log.ingredient?.unit || "";

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          {isIngredient ? (
                            <span className="p-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400" title="Raw Ingredient">
                              <Boxes size={14} />
                            </span>
                          ) : (
                            <span className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500" title="Finished Product">
                              <ShoppingBag size={14} />
                            </span>
                          )}
                          <span>{itemName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400 text-xs">{itemCode}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${typeBadge[log.type] || "bg-slate-100 text-slate-700"}`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                        {Number(log.quantity)} <span className="text-xs text-slate-400 font-normal">{unit}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{log.beforeQty !== null ? `${Number(log.beforeQty)} ${unit}` : "-"}</td>
                      <td className="px-4 py-3 text-slate-500">{log.afterQty !== null ? `${Number(log.afterQty)} ${unit}` : "-"}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{log.note || "-"}</td>
                      <td className="px-4 py-3 text-slate-500">{log.user?.name || "System"}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2">
                <Warehouse size={28} className="opacity-40" /><p className="text-sm">No inventory logs</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Adjust Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-bold text-slate-900 dark:text-slate-100">{t("inventory.adjustStock")}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdjust} className="p-6 space-y-4">
              {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-xl text-sm">{error}</div>}
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t("inventory.targetCategory")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetCategory("INGREDIENT")}
                    className={`py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                      targetCategory === "INGREDIENT"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <Boxes size={14} /> {t("inventory.ingredient")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetCategory("PRODUCT")}
                    className={`py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                      targetCategory === "PRODUCT"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <ShoppingBag size={14} /> {t("inventory.product")}
                  </button>
                </div>
              </div>

              {targetCategory === "INGREDIENT" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t("inventory.ingredient")}</label>
                  <select value={form.ingredientId} onChange={e => setForm(p => ({ ...p, ingredientId: e.target.value }))} required className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none">
                    <option value="">{t("common.search")}</option>
                    {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} (Stock: {ing.stock} {ing.unit})</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t("inventory.product")}</label>
                  <select value={form.productId} onChange={e => setForm(p => ({ ...p, productId: e.target.value }))} required className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none">
                    <option value="">{t("common.search")}</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t("ingredients.adjustType")}</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none">
                  <option value="IN">{t("ingredients.stockIn")}</option>
                  <option value="OUT">{t("ingredients.stockOut")}</option>
                  <option value="ADJUSTMENT">{t("ingredients.stockSet")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t("inventory.colQty")}</label>
                <input type="number" step="0.01" min="0.01" required value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} placeholder="0.00"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t("inventory.colNote")}</label>
                <input type="text" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder={t("inventory.colNote")}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">{t("common.cancel")}</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer transition-colors">
                  {saving && <Loader2 size={14} className="animate-spin" />} {t("common.confirm")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
