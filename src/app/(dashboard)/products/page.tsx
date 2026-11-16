"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingBag, Search, Plus, Pencil, Trash2, X,
  ChevronDown, Package, Loader2, Boxes, UtensilsCrossed,
  ToggleLeft, ToggleRight, Layers
} from "lucide-react";
import { useLanguageStore } from "@/store/languageStore";

interface Category { id: number; name: string; icon?: string; }
interface Ingredient { id: number; name: string; code: string; unit: string; cost: number | string; stock: number | string; minStock: number | string; }

interface ProductIngredient {
  id?: number;
  ingredientId: number;
  ingredient?: Ingredient;
  quantity: number | string;
}

interface Product {
  id: number; name: string; code: string;
  price: number; cost: number; stock: number; minStock: number;
  hasRecipe?: boolean;
  image?: string; categoryId: number;
  category: Category;
  ingredients?: ProductIngredient[];
}

const emptyForm = { name: "", code: "", price: "", cost: "", stock: "0", minStock: "5", image: "", categoryId: "" };

export default function ProductsPage() {
  const { t } = useLanguageStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Product Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [hasRecipe, setHasRecipe] = useState(true);
  const [recipeItems, setRecipeItems] = useState<{ ingredientId: number; quantity: string }[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
    try {
      const res = await fetch(`/api/products?${params}`);
      if (res.ok) setProducts(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [query, categoryFilter]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) setCategories(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchIngredients = async () => {
    try {
      const res = await fetch("/api/ingredients");
      if (res.ok) setAvailableIngredients(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchCategories(); fetchIngredients(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setHasRecipe(true);
    setRecipeItems(
      availableIngredients.length > 0
        ? [{ ingredientId: availableIngredients[0].id, quantity: "1.00" }]
        : []
    );
    setImageFile(null);
    setImagePreview("");
    setError("");
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setImageFile(null);
    setImagePreview(p.image || "");
    const productHasRecipe = p.hasRecipe !== false;
    setHasRecipe(productHasRecipe);
    setForm({
      name: p.name,
      code: p.code,
      price: String(p.price),
      cost: String(p.cost),
      stock: String(p.stock || 0),
      minStock: String(p.minStock || 5),
      image: p.image || "",
      categoryId: String(p.categoryId),
    });

    if (p.ingredients && p.ingredients.length > 0) {
      setRecipeItems(
        p.ingredients.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: String(item.quantity),
        }))
      );
    } else {
      setRecipeItems([]);
    }

    setError("");
    setShowModal(true);
  };

  const addRecipeRow = () => {
    const unselected = availableIngredients.find(ing => !recipeItems.some(item => item.ingredientId === ing.id));
    if (unselected) {
      setRecipeItems([...recipeItems, { ingredientId: unselected.id, quantity: "1.00" }]);
    } else {
      setError("All available raw ingredients have already been added to this recipe line.");
    }
  };

  const removeRecipeRow = (index: number) => {
    setRecipeItems(recipeItems.filter((_, idx) => idx !== index));
  };

  const updateRecipeRow = (index: number, field: "ingredientId" | "quantity", value: any) => {
    const updated = [...recipeItems];
    updated[index] = { ...updated[index], [field]: value };
    setRecipeItems(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.categoryId) {
      setError("Product Name and Category are required");
      return;
    }

    if (hasRecipe && (recipeItems.length === 0 || recipeItems.some(i => !i.ingredientId || parseFloat(i.quantity) <= 0))) {
      setError("Please add at least 1 valid ingredient with quantity for this recipe product");
      return;
    }

    // Automatically merge duplicate ingredients if any
    const mergedRecipeMap = new Map<number, number>();
    if (hasRecipe) {
      for (const item of recipeItems) {
        const ingId = Number(item.ingredientId);
        const qty = parseFloat(item.quantity);
        if (ingId && !isNaN(qty) && qty > 0) {
          mergedRecipeMap.set(ingId, (mergedRecipeMap.get(ingId) || 0) + qty);
        }
      }
    }

    const cleanIngredientsPayload = Array.from(mergedRecipeMap.entries()).map(([ingredientId, quantity]) => ({
      ingredientId,
      quantity,
    }));

    setSaving(true);
    setError("");
    
    try {
      let imageUrl = form.image;
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) { setError(uploadData.error || "Failed to upload image"); setSaving(false); return; }
        imageUrl = uploadData.url;
      }

      const url = editing ? `/api/products/${editing.id}` : "/api/products";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          image: imageUrl,
          price: parseFloat(form.price) || 0,
          cost: parseFloat(form.cost) || 0,
          stock: !hasRecipe ? (parseInt(form.stock) || 0) : 0,
          minStock: !hasRecipe ? (parseInt(form.minStock) || 0) : 0,
          hasRecipe: hasRecipe,
          categoryId: parseInt(form.categoryId),
          ingredients: hasRecipe ? cleanIngredientsPayload : [],
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save product"); setSaving(false); return; }
      setShowModal(false);
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to delete product");
      return;
    }
    fetchProducts();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShoppingBag size={24} className="text-indigo-600 dark:text-indigo-400" />
            {t("products.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{products.length} {t("products.configuredCount")}</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer">
          <Plus size={16} /> {t("products.addProduct")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder={t("products.searchPlaceholder")} value={query} onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
        </div>
        <div className="relative">
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer">
            <option value="all">{t("products.allCategories")}</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-indigo-500" size={28} /></div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <Package size={36} className="opacity-40" /><p>{t("products.noProducts")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  {[t("products.colProduct"), t("products.colCode"), t("products.colCategory"), t("products.colPrice"), t("products.colCost"), t("products.colStockTracking"), t("products.colActions")].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.map(p => {
                  const recipeIngredients = p.ingredients || [];
                  const usesRecipe = p.hasRecipe !== false && recipeIngredients.length > 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs">{p.code}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium">{p.category?.name}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">${Number(p.price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-500">${Number(p.cost).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {p.hasRecipe !== false ? (
                          recipeIngredients.length === 0 ? (
                            <span className="text-xs text-amber-500 font-medium">{t("products.recipeModeNoIng")}</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {recipeIngredients.map((item, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-[11px] text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                                  <Boxes size={10} className="text-indigo-500" />
                                  <strong>{item.ingredient?.name || `ID #${item.ingredientId}`}</strong>: {Number(item.quantity)} {item.ingredient?.unit}
                                </span>
                              ))}
                            </div>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-900">
                            {t("products.directStockBadge")}: {p.stock} {t("products.units")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(p)} title="Edit Product & Recipe" className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50 cursor-pointer"><Pencil size={15} /></button>
                          <button onClick={() => handleDelete(p.id)} title="Delete Product" className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"><Trash2 size={15} /></button>
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

      {/* Modal: Add/Edit Product WITH Toggle for Recipe / Direct Stock */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShoppingBag size={18} className="text-indigo-600" />
                {editing ? t("products.editTitle") : t("products.addTitle")}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-xl text-sm font-medium">{error}</div>}
              
              {/* Product Basic Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{t("products.basicDetails")}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t("products.name")} <span className="text-rose-500">*</span></label>
                    <input type="text" required placeholder="e.g. Iced Latte, Coca Cola" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t("products.codeBarcode")}</label>
                    <input type="text" placeholder={t("products.autoCode")} maxLength={14} value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t("products.category")} <span className="text-rose-500">*</span></label>
                    <select value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))} required
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                      <option value="">{t("products.selectCategory")}</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t("products.sellingPrice")} <span className="text-rose-500">*</span></label>
                    <input type="number" step="0.01" min="0" required placeholder="3.50" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                  
                  {/* Cost Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                      <span>{t("products.productCost")}</span>
                      {hasRecipe && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">{t("products.autoRecipeCost")}</span>}
                    </label>
                    {hasRecipe ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        readOnly
                        value={
                          recipeItems.length > 0
                            ? recipeItems
                                .reduce((sum, item) => {
                                  const ing = availableIngredients.find((i) => i.id === item.ingredientId);
                                  const qty = parseFloat(item.quantity) || 0;
                                  const ingCost = parseFloat(String(ing?.cost || 0));
                                  return sum + qty * ingCost;
                                }, 0)
                                .toFixed(2)
                            : (form.cost || "0.00")
                        }
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold font-mono focus:outline-none cursor-not-allowed"
                      />
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="1.20"
                        value={form.cost}
                        onChange={e => setForm(p => ({ ...p, cost: e.target.value }))}
                        className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      />
                    )}
                  </div>

                  {/* Direct Stock Fields (Visible when hasRecipe === false) */}
                  {!hasRecipe && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{t("products.directStockQty")} <span className="text-rose-500">*</span></label>
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="100"
                          value={form.stock}
                          onChange={e => setForm(p => ({ ...p, stock: e.target.value }))}
                          className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{t("products.minStockAlert")}</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="5"
                          value={form.minStock}
                          onChange={e => setForm(p => ({ ...p, minStock: e.target.value }))}
                          className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                        />
                      </div>
                    </>
                  )}

                  {/* Compact Recipe Switch Button underneath */}
                  <div className="col-span-2 py-2.5 px-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed size={15} className="text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                          {hasRecipe ? t("products.useRecipe") : t("products.directStockBadge")}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {hasRecipe ? t("products.useRecipeDesc") : t("products.directStockDesc")}
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hasRecipe}
                        onChange={e => setHasRecipe(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Product Image Upload Field */}
                  <div className="col-span-2 pt-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t("products.productImage")}</label>
                    <div className="flex items-center gap-4">
                      {imagePreview ? (
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 group">
                          <img src={imagePreview} alt="Product Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(null);
                              setImagePreview("");
                              setForm(p => ({ ...p, image: "" }));
                            }}
                            className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md transition-colors cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400 shrink-0">
                          <ShoppingBag size={20} className="opacity-40 mb-1" />
                          <span className="text-[10px] font-medium">{t("products.noImage")}</span>
                        </div>
                      )}

                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setImageFile(file);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setImagePreview(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 dark:file:bg-indigo-950 dark:file:text-indigo-400 hover:file:bg-indigo-100 cursor-pointer"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">{t("products.imageTip")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Ingredients Section (Visible when hasRecipe === true) */}
              {hasRecipe && (
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <UtensilsCrossed size={14} className="text-amber-500" />
                      {t("products.recipeRequired")} <span className="text-rose-500">*</span>
                    </h3>
                    <button
                      type="button"
                      onClick={addRecipeRow}
                      disabled={availableIngredients.length === 0}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={12} /> {t("products.addIngredientLine")}
                    </button>
                  </div>

                  {availableIngredients.length === 0 ? (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-xl text-xs">
                      {t("products.noIngredientsStock")}
                    </div>
                  ) : recipeItems.length === 0 ? (
                    <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400">
                      {t("products.noIngredientsAdded")}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recipeItems.map((item, idx) => {
                        const matchedIng = availableIngredients.find(i => i.id === item.ingredientId);
                        return (
                          <div key={idx} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                            <div className="flex-1">
                              <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">{t("products.ingredient")}</label>
                              <select
                                value={item.ingredientId}
                                onChange={e => updateRecipeRow(idx, "ingredientId", parseInt(e.target.value))}
                                required
                                className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none"
                              >
                                {availableIngredients.map(ing => (
                                  <option key={ing.id} value={ing.id}>
                                    {ing.name} ({ing.code}) - Unit: {ing.unit}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="w-36">
                              <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                                {t("products.quantity")} ({matchedIng?.unit || "unit"})
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                required
                                placeholder="1.00"
                                value={item.quantity}
                                onChange={e => updateRecipeRow(idx, "quantity", e.target.value)}
                                className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-mono text-right focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeRecipeRow(idx)}
                              disabled={recipeItems.length === 1}
                              className="mt-4 p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg disabled:opacity-30 cursor-pointer"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">{t("common.cancel")}</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer transition-colors">
                  {saving && <Loader2 size={14} className="animate-spin" />} {editing ? t("products.saveChanges") : t("products.createBtn")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
