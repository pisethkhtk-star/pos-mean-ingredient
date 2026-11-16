"use client";

import React, { useEffect } from "react";
import { useLanguageStore } from "@/store/languageStore";
import { useSettingsStore } from "@/store/settingsStore";
import { X, Printer, Calendar, Truck, Building, FileText, CheckCircle2, Clock, Ban } from "lucide-react";

interface Supplier {
  id: number;
  name: string;
}

interface PurchaseItem {
  id: number;
  ingredientId?: number;
  ingredient?: { name: string; code: string; unit: string };
  productId?: number;
  product?: { name: string; code: string };
  quantity: number | string;
  cost: number | string;
  subtotal: number | string;
  expiryDate?: string;
}

interface Purchase {
  id: number;
  reference: string;
  totalAmount: number | string;
  note?: string;
  status?: string;
  receivedAt?: string;
  receivedBy?: { name: string };
  createdAt: string;
  supplier?: Supplier;
  user?: { name: string };
  items: PurchaseItem[];
}

interface PurchaseInvoiceModalProps {
  purchase: Purchase | null;
  onClose: () => void;
}

export default function PurchaseInvoiceModal({ purchase, onClose }: PurchaseInvoiceModalProps) {
  const { t } = useLanguageStore();
  const { settings, fetchSettings } = useSettingsStore();

  useEffect(() => {
    if (!settings) {
      fetchSettings();
    }
  }, [settings, fetchSettings]);

  if (!purchase) return null;

  const handlePrint = () => {
    window.print();
  };

  const status = purchase.status || "RECEIVED";
  const isPending = status === "PENDING";
  const isCancelled = status === "CANCELLED";

  const totalQty = purchase.items.reduce(
    (sum, item) => sum + (parseFloat(String(item.quantity)) || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Screen Controls Header (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              {t("purchases.invoiceTitle")}
            </h2>
            <span className="font-mono text-xs text-slate-500 font-semibold bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded">
              {purchase.reference}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Printer size={15} />
              <span>{t("purchases.printInvoice")}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Invoice Content */}
        <div className="overflow-y-auto p-6 md:p-8 flex-1 bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div
            id="print-purchase-invoice"
            className="w-full max-w-2xl bg-white text-slate-900 p-8 rounded-xl shadow-md border border-slate-200 text-sm font-sans"
          >
            {/* Top Company & Invoice Header */}
            <div className="flex justify-between items-start pb-6 border-b border-slate-200 gap-4">
              <div>
                <h1 className="text-xl font-black tracking-tight text-indigo-700 uppercase">
                  {settings?.storeName || "Coffee System"}
                </h1>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                  {settings?.storeAddress || "Phnom Penh, Cambodia"}
                </p>
                <p className="text-xs text-slate-500">
                  Tel: {settings?.storePhone || "+855 12 345 678"}
                </p>
              </div>

              <div className="text-right">
                <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono font-bold tracking-wider text-slate-800">
                  {t("purchases.invoiceSubtitle")}
                </div>
                <p className="text-sm font-mono font-bold text-slate-900 mt-2">
                  #{purchase.reference}
                </p>
                <div className="mt-1">
                  {isPending ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <Clock size={11} /> {t("purchases.statusPending")}
                    </span>
                  ) : isCancelled ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                      <Ban size={11} /> {t("purchases.statusCancelled")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 size={11} /> {t("purchases.statusReceived")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Vendor & Order Details 2-Column Grid */}
            <div className="grid grid-cols-2 gap-6 py-5 border-b border-slate-200 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  {t("purchases.colSupplier")} / VENDOR
                </p>
                <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Truck size={14} className="text-slate-400 shrink-0" />
                  {purchase.supplier?.name || "N/A"}
                </p>
                <p className="text-slate-500 mt-1">Supplier ID: #{purchase.supplier?.id || "-"}</p>
                {purchase.note && (
                  <p className="text-slate-600 italic mt-1 bg-slate-50 p-2 rounded border border-slate-200/60">
                    <span className="font-semibold">{t("purchases.note")}:</span> {purchase.note}
                  </p>
                )}
              </div>

              <div className="space-y-1.5 text-right sm:text-left sm:pl-8 sm:border-l border-slate-100">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  ORDER INFORMATION
                </p>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("purchases.colDate")}:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(purchase.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("purchases.colCreatedBy")}:</span>
                  <span className="font-semibold text-slate-800">
                    {purchase.user?.name || "Admin"}
                  </span>
                </div>
                {purchase.receivedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("receiveStock.receivedAt")}:</span>
                    <span className="font-semibold text-emerald-700">
                      {new Date(purchase.receivedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {purchase.receivedBy && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("receiveStock.receivedBy")}:</span>
                    <span className="font-semibold text-emerald-700">
                      {purchase.receivedBy.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="py-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-700">
                    <th className="py-2.5 px-3 text-left w-8">#</th>
                    <th className="py-2.5 px-3 text-left">{t("purchases.colItems")}</th>
                    <th className="py-2.5 px-3 text-left w-24">{t("purchases.itemType")}</th>
                    <th className="py-2.5 px-3 text-left w-28">{t("purchases.expiryDate")}</th>
                    <th className="py-2.5 px-3 text-center w-20">{t("products.quantity")}</th>
                    <th className="py-2.5 px-3 text-right w-24">{t("ingredients.colUnitCost")}</th>
                    <th className="py-2.5 px-3 text-right w-24">{t("pos.subtotal")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {purchase.items.map((item, idx) => {
                    const isProduct = !!item.product || !!item.productId;
                    const name = isProduct
                      ? item.product?.name || `Product #${item.productId}`
                      : item.ingredient?.name || `Ingredient #${item.ingredientId}`;
                    const code = isProduct ? item.product?.code : item.ingredient?.code;
                    const unit = isProduct ? "pcs" : item.ingredient?.unit || "unit";

                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {name}
                          {code && <span className="ml-1 text-[10px] text-slate-400 font-mono">[{code}]</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isProduct
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-indigo-100 text-indigo-800 border border-indigo-200"
                            }`}
                          >
                            {isProduct ? "Product" : "Ingredient"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {item.expiryDate ? (
                            <span className="font-mono text-rose-700 font-medium">
                              📅 {item.expiryDate}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                          {Number(item.quantity)} <span className="text-[10px] text-slate-500 font-normal">{unit}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700 font-mono">
                          ${Number(item.cost).toFixed(4)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                          ${Number(item.subtotal).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total Summary */}
            <div className="border-t-2 border-slate-300 pt-4 pb-6">
              <div className="flex justify-between items-start gap-4">
                <div className="text-xs text-slate-500 space-y-1">
                  <p>
                    <span className="font-semibold">Total Line Items:</span> {purchase.items.length}
                  </p>
                  <p>
                    <span className="font-semibold">Total Quantity:</span> {totalQty.toFixed(2)}
                  </p>
                </div>

                <div className="w-56 space-y-2 text-right">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{t("pos.subtotal")}:</span>
                    <span className="font-mono">${Number(purchase.totalAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                    <span className="uppercase">{t("purchases.colTotal")}:</span>
                    <span className="text-lg font-black text-indigo-700 font-mono">
                      ${Number(purchase.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Signatures Section */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-dashed border-slate-300 text-center text-xs text-slate-600">
              <div className="space-y-12">
                <p className="font-bold uppercase text-slate-700">{t("purchases.preparedBy")}</p>
                <div className="border-t border-slate-400 mx-4 pt-1">
                  <p className="font-semibold text-slate-800">{purchase.user?.name || "Admin"}</p>
                  <p className="text-[10px] text-slate-400">{t("purchases.signature")}</p>
                </div>
              </div>

              <div className="space-y-12">
                <p className="font-bold uppercase text-slate-700">{t("purchases.deliveredBy")}</p>
                <div className="border-t border-slate-400 mx-4 pt-1">
                  <p className="font-semibold text-slate-800">{purchase.supplier?.name || "Supplier"}</p>
                  <p className="text-[10px] text-slate-400">{t("purchases.signature")}</p>
                </div>
              </div>

              <div className="space-y-12">
                <p className="font-bold uppercase text-slate-700">{t("purchases.receivedAndCheckedBy")}</p>
                <div className="border-t border-slate-400 mx-4 pt-1">
                  <p className="font-semibold text-slate-800">
                    {purchase.receivedBy?.name || "Warehouse Manager"}
                  </p>
                  <p className="text-[10px] text-slate-400">{t("purchases.signature")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Screen View) */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0 bg-white dark:bg-slate-900 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            {t("common.close") || "Close"}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
          >
            <Printer size={15} />
            <span>{t("purchases.printInvoice")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
