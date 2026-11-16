"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PackageCheck, Search, Plus, X, Loader2, Warehouse, Truck, Boxes
} from "lucide-react";
import { useLanguageStore } from "@/store/languageStore";

interface Supplier { id: number; name: string; }
interface Ingredient { id: number; name: string; code: string; unit: string; cost: number | string; stock: number | string; }
interface Product {
  id: number;
  name: string;
  code: string;
  cost: number | string;
  stock: number | string;
  hasRecipe?: boolean;
}
interface PurchaseItem {
  id: number;
  ingredientId?: number;
  ingredient?: Ingredient;
  productId?: number;
  product?: Product;
  quantity: number | string;
  cost: number | string;
  subtotal: number | string;
}
interface Purchase {
  id: number; reference: string; totalAmount: number | string; note: string;
  createdAt: string; supplier: Supplier; user: { name: string };
  items: PurchaseItem[];
}

interface NewPurchaseItem {
  itemType: "INGREDIENT" | "PRODUCT";
  ingredientId: string;
  productId: string;
  quantity: string;
  cost: string;
  ingredient?: Ingredient;
  product?: Product;
}

export default function PurchasesPage() {
  const { t } = useLanguageStore();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [supplierId, setSupplierId] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<NewPurchaseItem[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [purchasesRes, suppliersRes, ingredientsRes, productsRes] = await Promise.all([
        fetch("/api/purchases"),
        fetch("/api/suppliers"),
        fetch("/api/ingredients"),
        fetch("/api/products")
      ]);
      if (purchasesRes.ok) setPurchases(await purchasesRes.json());
      if (suppliersRes.ok) setSuppliers(await suppliersRes.json());
      if (ingredientsRes.ok) setIngredients(await ingredientsRes.json());
      if (productsRes.ok) {
        const prodData = await productsRes.json();
        setProducts(prodData);
      }
    } catch (err) {
      console.error("Error fetching purchase data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Products without recipe (ready-made/retail products)
  const nonRecipeProducts = products.filter(p => !p.hasRecipe);
  // Fallback if none flagged: all products
  const purchasableProducts = nonRecipeProducts.length > 0 ? nonRecipeProducts : products;

  const filteredPurchases = purchases.filter(p => 
    p.reference.toLowerCase().includes(query.toLowerCase()) || 
    p.supplier?.name.toLowerCase().includes(query.toLowerCase())
  );

  const openAdd = () => {
    setSupplierId("");
    setNote("");
    setItems([{ itemType: "INGREDIENT", ingredientId: "", productId: "", quantity: "1.00", cost: "0.00" }]);
    setError("");
    setShowModal(true);
  };

  const handleTypeChange = (index: number, newType: "INGREDIENT" | "PRODUCT") => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      itemType: newType,
      ingredientId: "",
      productId: "",
      cost: "0.00",
      ingredient: undefined,
      product: undefined
    };
    setItems(newItems);
  };

  const handleItemSelect = (index: number, type: "INGREDIENT" | "PRODUCT", selectedId: string) => {
    const newItems = [...items];
    if (type === "INGREDIENT") {
      const ing = ingredients.find(i => i.id.toString() === selectedId);
      newItems[index] = {
        ...newItems[index],
        itemType: "INGREDIENT",
        ingredientId: selectedId,
        productId: "",
        cost: ing ? String(ing.cost || "0.00") : "0.00",
        ingredient: ing,
        product: undefined
      };
    } else {
      const prod = products.find(p => p.id.toString() === selectedId);
      newItems[index] = {
        ...newItems[index],
        itemType: "PRODUCT",
        ingredientId: "",
        productId: selectedId,
        cost: prod ? String(prod.cost || "0.00") : "0.00",
        ingredient: undefined,
        product: prod
      };
    }
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof NewPurchaseItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItemRow = () => setItems([...items, { itemType: "INGREDIENT", ingredientId: "", productId: "", quantity: "1.00", cost: "0.00" }]);
  const removeItemRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const totalCost = items.reduce((sum, item) => sum + (parseFloat(item.cost) || 0) * (parseFloat(item.quantity) || 0), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validate
    if (!supplierId) return setError(t("purchases.selectSupplier"));
    const hasInvalidItem = items.some(i => {
      const hasTarget = i.itemType === "INGREDIENT" ? !!i.ingredientId : !!i.productId;
      const qty = parseFloat(i.quantity);
      const c = parseFloat(i.cost);
      return !hasTarget || isNaN(qty) || qty <= 0 || isNaN(c) || c < 0;
    });

    if (hasInvalidItem) {
      return setError("Please fill all item fields correctly with valid quantities and costs");
    }

    const payloadItems = items.map(i => ({
      ingredientId: i.itemType === "INGREDIENT" ? parseInt(i.ingredientId) : null,
      productId: i.itemType === "PRODUCT" ? parseInt(i.productId) : null,
      quantity: parseFloat(i.quantity) || 0,
      cost: parseFloat(i.cost) || 0,
    }));

    setSaving(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId: parseInt(supplierId), note, items: payloadItems }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || "Failed to save purchase");
        setSaving(false);
        return;
      }
      
      setShowModal(false);
      fetchData();
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
            <PackageCheck size={24} className="text-indigo-600 dark:text-indigo-400" />
            {t("purchases.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">{purchases.length} {t("purchases.orderCount")}</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer">
          <Plus size={16} /> {t("purchases.newPurchase")}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder={t("purchases.searchPlaceholder")} value={query} onChange={e => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-indigo-500" size={28} /></div>
        ) : purchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <Warehouse size={36} className="opacity-40" /><p>{t("common.noData")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  {[t("purchases.colRef"), t("purchases.colSupplier"), t("purchases.colItems"), t("purchases.colTotal"), t("purchases.note"), t("purchases.colCreatedBy"), t("purchases.colDate")].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPurchases.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">{p.reference}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2"><Truck size={14} className="text-slate-400"/> {p.supplier?.name}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      <div className="space-y-1">
                        {p.items.map((item, idx) => {
                          const isProduct = !!item.product || !!item.productId;
                          const name = isProduct ? (item.product?.name || `Product #${item.productId}`) : (item.ingredient?.name || `Ingredient #${item.ingredientId}`);
                          const unit = isProduct ? "pcs" : (item.ingredient?.unit || "unit");
                          return (
                            <div key={idx} className="text-xs flex items-center gap-1.5 flex-wrap">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isProduct 
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800" 
                                  : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                              }`}>
                                {isProduct ? "Product" : "Ingredient"}
                              </span>
                              <strong className="text-slate-800 dark:text-slate-200">{name}</strong>: {Number(item.quantity)} {unit} @ ${Number(item.cost).toFixed(4)}/{unit}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">${Number(p.totalAmount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{p.note || "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{p.user?.name}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Boxes size={18} className="text-indigo-500" /> {t("purchases.createPurchaseOrder")}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X size={18} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="purchaseForm" onSubmit={handleSave} className="space-y-6">
                {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-xl text-sm">{error}</div>}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t("purchases.colSupplier")} <span className="text-rose-500">*</span></label>
                    <select value={supplierId} onChange={e => setSupplierId(e.target.value)} required className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                      <option value="">{t("purchases.selectSupplier")}</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t("purchases.note")}</label>
                    <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="PO-12345 or invoice details" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">{t("purchases.colItems")}</label>
                    <button type="button" onClick={addItemRow} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"><Plus size={12}/> {t("purchases.addItemRow")}</button>
                  </div>
                  
                  <div className="space-y-2">
                    {items.map((item, index) => {
                      const matchedIng = ingredients.find(i => i.id.toString() === item.ingredientId);
                      const matchedProd = purchasableProducts.find(p => p.id.toString() === item.productId);
                      const unitLabel = item.itemType === "INGREDIENT" ? (matchedIng?.unit || "unit") : "pcs";

                      return (
                        <div key={index} className="flex gap-2 items-start bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                          {/* Item Type Switcher */}
                          <div className="w-36 shrink-0">
                            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">{t("purchases.itemType")}</label>
                            <select
                              value={item.itemType}
                              onChange={e => handleTypeChange(index, e.target.value as "INGREDIENT" | "PRODUCT")}
                              className="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                            >
                              <option value="INGREDIENT">{t("purchases.typeIngredient")}</option>
                              <option value="PRODUCT">{t("purchases.typeProduct")}</option>
                            </select>
                          </div>

                          {/* Specific Item Dropdown */}
                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                              {item.itemType === "INGREDIENT" ? t("products.ingredient") : t("products.title")}
                            </label>
                            {item.itemType === "INGREDIENT" ? (
                              <select
                                value={item.ingredientId}
                                onChange={e => handleItemSelect(index, "INGREDIENT", e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                              >
                                <option value="">{t("purchases.selectIngredient")}</option>
                                {ingredients.map(ing => (
                                  <option key={ing.id} value={ing.id}>
                                    {ing.name} ({ing.code}) - {ing.unit} (Stock: {ing.stock})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <select
                                value={item.productId}
                                onChange={e => handleItemSelect(index, "PRODUCT", e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                              >
                                <option value="">{t("purchases.selectProduct")}</option>
                                {purchasableProducts.map(prod => (
                                  <option key={prod.id} value={prod.id}>
                                    {prod.name} ({prod.code}) - Stock: {prod.stock}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Quantity */}
                          <div className="w-28">
                            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                              {t("products.quantity")} ({unitLabel})
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              required
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={e => updateItem(index, "quantity", e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            />
                          </div>

                          {/* Unit Cost */}
                          <div className="w-32">
                            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                              {t("ingredients.colUnitCost")}
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.0001"
                                required
                                placeholder="Cost"
                                value={item.cost}
                                onChange={e => updateItem(index, "cost", e.target.value)}
                                className="w-full pl-7 pr-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                              />
                            </div>
                          </div>

                          {/* Subtotal */}
                          <div className="w-28 pt-6 text-right font-semibold text-slate-700 dark:text-slate-300 text-sm shrink-0">
                            ${((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)).toFixed(2)}
                          </div>

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            disabled={items.length === 1}
                            className="mt-5 p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg disabled:opacity-30 cursor-pointer"
                          >
                            <X size={16}/>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <div className="text-right">
                      <p className="text-sm text-slate-500">{t("purchases.colTotal")}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">${totalCost.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0 bg-slate-50 dark:bg-slate-900 rounded-b-2xl">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors">{t("common.cancel")}</button>
              <button type="submit" form="purchaseForm" disabled={saving || !supplierId || items.some(i => (i.itemType === "INGREDIENT" ? !i.ingredientId : !i.productId))} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer transition-colors">
                {saving && <Loader2 size={14} className="animate-spin" />} {t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
