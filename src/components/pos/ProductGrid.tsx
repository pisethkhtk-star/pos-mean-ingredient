"use client";

import React, { useState, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import { useLanguageStore } from "@/store/languageStore";
import { Search, Loader2, RefreshCw, Layers, Image as ImageIcon } from "lucide-react";

export default function ProductGrid() {
  const addItem = useCartStore((state) => state.addItem);
  const { t } = useLanguageStore();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string>("all");

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const url = `/api/products?query=${encodeURIComponent(search)}&categoryId=${selectedCatId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Re-fetch products when search or category selection changes
  useEffect(() => {
    fetchProducts();
  }, [search, selectedCatId]);

  // Initial fetch for categories
  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSearchEnter = async () => {
    const currentSearch = search.trim();
    if (!currentSearch) return;

    if (!loadingProducts && products.length > 0) {
      const productToAdd = products.find((p) =>
        p.code?.toLowerCase() === currentSearch.toLowerCase() ||
        p.name?.toLowerCase().includes(currentSearch.toLowerCase())
      );
      if (productToAdd) {
        addItem(productToAdd);
        setSearch("");
        return;
      }
    }

    try {
      const url = `/api/products?query=${encodeURIComponent(currentSearch)}&categoryId=${selectedCatId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          addItem(data[0]);
          setSearch("");
        }
      }
    } catch (err) {
      console.error("Error adding product on Enter key:", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 p-4 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder={t("pos.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearchEnter();
            }
          }}
          className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-slate-200 shadow-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ×
          </button>
        )}
      </div>

      {/* Categories Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCatId("all")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${selectedCatId === "all"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
        >
          <Layers size={14} /> {t("pos.allCategories")}
        </button>

        {loadingCategories ? (
          <div className="flex items-center gap-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(String(cat.id))}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${selectedCatId === String(cat.id)
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
            >
              {cat.name}
            </button>
          ))
        )}
      </div>

      {/* Product Card grid */}
      <div className="flex-1 overflow-y-auto">
        {loadingProducts ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-2xl h-44 animate-pulse space-y-3"
              >
                <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <RefreshCw size={36} className="animate-spin-slow" />
            <p className="text-sm font-medium">{t("pos.noProducts")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => {
              const usesRecipe = product.hasRecipe !== false && product.ingredients && product.ingredients.length > 0;
              let stockCount = 0;
              let isOutOfStock = false;

              if (usesRecipe) {
                const portionsList = product.ingredients.map((pi: any) => {
                  const stock = pi.ingredient ? Number(pi.ingredient.stock) : 0;
                  const reqQty = Number(pi.quantity) || 1;
                  return Math.floor(stock / reqQty);
                });
                stockCount = portionsList.length > 0 ? Math.min(...portionsList) : 0;
                isOutOfStock = stockCount <= 0;
              } else {
                stockCount = Number(product.stock) || 0;
                isOutOfStock = stockCount <= 0;
              }

              const isLowStock = stockCount > 0 && stockCount <= 5;

              return (
                <button
                  key={product.id}
                  disabled={isOutOfStock}
                  onClick={() => addItem(product)}
                  className={`flex flex-col text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl overflow-hidden hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all group select-none min-h-[160px] cursor-pointer relative ${isOutOfStock ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                >
                  {/* Stock / Ingredient tag */}
                  <span
                    className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-extrabold text-white z-10 ${isOutOfStock
                        ? "bg-rose-500"
                        : isLowStock
                          ? "bg-amber-500"
                          : "bg-emerald-600"
                      }`}
                  >
                    {isOutOfStock
                      ? t("pos.outOfStock")
                      : `${stockCount} ${t("pos.inStock")}`}
                  </span>

                  {/* Product Image */}
                  <div className="h-32 w-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden flex-shrink-0">
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                        <ImageIcon size={32} className="opacity-40" />
                      </div>
                    )}
                  </div>

                  {/* Product body */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      {/* <p className="text-xs font-semibold text-slate-400 tracking-wider mb-0.5 truncate uppercase">
                        {product.code || product.sku}
                      </p> */}
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 leading-tight">
                        {product.name}
                      </h4>
                    </div>

                    <div className="mt-4 flex items-end justify-between">
                      <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                        ${Number(product.price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
