"use client";

import React, { useEffect } from "react";
import { useLanguageStore } from "@/store/languageStore";
import { useSettingsStore } from "@/store/settingsStore";
import { X, Printer, Calendar, Truck, FileText, CheckCircle2, Clock, Ban, ReceiptText } from "lucide-react";

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

  const totalQty = (purchase.items || []).reduce(
    (sum, item) => sum + (parseFloat(String(item.quantity)) || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      {/* Global Print Style for foolproof printing */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #print-purchase-invoice,
          #print-purchase-invoice * {
            visibility: visible !important;
          }
          #print-purchase-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px 24px !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Screen Controls Header (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <ReceiptText size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-tight">
                {t("purchases.invoiceTitle") || "Purchase Order Invoice"}
              </h2>
              <span className="font-mono text-xs text-slate-500 font-semibold">
                #{purchase.reference}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Printer size={15} />
              <span>{t("purchases.printInvoice") || "Print Invoice"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Document Area */}
        <div className="overflow-y-auto p-4 sm:p-6 md:p-8 flex-1 bg-slate-100 dark:bg-slate-950 flex justify-center">
          {/* Printable Invoice Sheet */}
          <div
            id="print-purchase-invoice"
            className="w-full max-w-3xl bg-white text-slate-900 p-8 sm:p-10 rounded-2xl shadow border border-slate-200 text-sm font-sans flex flex-col"
          >
            {/* Top Company & Invoice Header */}
            <div className="flex justify-between items-start pb-6 border-b-2 border-slate-200 gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    ☕
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                      {settings?.storeName || "Coffee System"}
                    </h1>
                    <p className="text-xs text-indigo-600 font-semibold tracking-wide">
                      POS & INVENTORY MANAGEMENT SYSTEM
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
                  📍 {settings?.storeAddress || "Phnom Penh, Cambodia"}
                </p>
                <p className="text-xs text-slate-500">
                  📞 Tel: {settings?.storePhone || "+855 12 345 678"}
                </p>
              </div>

              <div className="text-right">
                <div className="inline-block px-3.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-mono font-bold tracking-wider uppercase">
                  {t("purchases.invoiceSubtitle") || "PURCHASE ORDER INVOICE"}
                </div>
                <p className="text-base font-mono font-black text-slate-900 mt-2">
                  #{purchase.reference}
                </p>
                <div className="mt-1.5">
                  {isPending ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <Clock size={12} /> {t("purchases.statusPending") || "Pending"}
                    </span>
                  ) : isCancelled ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                      <Ban size={12} /> {t("purchases.statusCancelled") || "Cancelled"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 size={12} /> {t("purchases.statusReceived") || "Received"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Vendor & Order Details 2-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-slate-200 text-xs">
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5 flex items-center gap-1">
                  <Truck size={13} className="text-indigo-600" />
                  {t("purchases.colSupplier") || "Supplier"} / VENDOR
                </p>
                <p className="text-base font-bold text-slate-900">
                  {purchase.supplier?.name || "N/A"}
                </p>
                <p className="text-slate-500 mt-1">
                  Supplier ID: #{purchase.supplier?.id || "-"}
                </p>
                {purchase.note && (
                  <p className="text-slate-600 italic mt-2 text-[11px] bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold">{t("purchases.note") || "Note"}:</span> {purchase.note}
                  </p>
                )}
              </div>

              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-2">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar size={13} className="text-indigo-600" />
                  ORDER INFORMATION
                </p>
                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="text-slate-500">{t("purchases.colDate") || "Date"}:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {new Date(purchase.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="text-slate-500">{t("purchases.colCreatedBy") || "Created By"}:</span>
                  <span className="font-semibold text-slate-800">
                    {purchase.user?.name || "Admin"}
                  </span>
                </div>
                {purchase.receivedAt && (
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">{t("receiveStock.receivedAt") || "Received At"}:</span>
                    <span className="font-semibold text-emerald-700 font-mono">
                      {new Date(purchase.receivedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {purchase.receivedBy && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("receiveStock.receivedBy") || "Received By"}:</span>
                    <span className="font-semibold text-emerald-700">
                      {purchase.receivedBy.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="py-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-700 font-semibold">
                    <th className="py-2.5 px-3 text-left w-8">#</th>
                    <th className="py-2.5 px-3 text-left">{t("purchases.colItems") || "Items"}</th>
                    <th className="py-2.5 px-3 text-left w-24">{t("purchases.itemType") || "Type"}</th>
                    <th className="py-2.5 px-3 text-left w-28">{t("purchases.expiryDate") || "Expiry Date"}</th>
                    <th className="py-2.5 px-3 text-center w-20">{t("products.quantity") || "Qty"}</th>
                    <th className="py-2.5 px-3 text-right w-24">{t("ingredients.colUnitCost") || "Unit Cost"}</th>
                    <th className="py-2.5 px-3 text-right w-24">{t("pos.subtotal") || "Subtotal"}</th>
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
                        <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {name}
                          {code && <span className="ml-1 text-[10px] text-slate-400 font-mono">[{code}]</span>}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isProduct
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-indigo-100 text-indigo-800 border border-indigo-200"
                            }`}
                          >
                            {isProduct ? "Product" : "Ingredient"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {item.expiryDate ? (
                            <span className="font-mono text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                              📅 {item.expiryDate}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800 font-mono">
                          {Number(item.quantity)} <span className="text-[10px] text-slate-500 font-normal">{unit}</span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700 font-mono">
                          ${Number(item.cost).toFixed(4)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
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
                    <span className="font-semibold text-slate-700">Total Line Items:</span> {purchase.items.length}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Total Quantity:</span> {totalQty.toFixed(2)}
                  </p>
                </div>

                <div className="w-64 space-y-2 text-right">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{t("pos.subtotal") || "Subtotal"}:</span>
                    <span className="font-mono font-semibold">${Number(purchase.totalAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-slate-900 border-t-2 border-slate-900 pt-2">
                    <span className="uppercase tracking-wider">{t("purchases.colTotal") || "Total Amount"}:</span>
                    <span className="text-xl font-black text-indigo-700 font-mono">
                      ${Number(purchase.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Signatures Section */}
            <div className="grid grid-cols-3 gap-6 pt-10 mt-2 border-t border-dashed border-slate-300 text-center text-xs text-slate-600">
              <div className="space-y-12">
                <p className="font-bold uppercase tracking-wider text-slate-700">
                  {t("purchases.preparedBy") || "PREPARED BY"}
                </p>
                <div className="border-t border-slate-400 mx-2 pt-1.5">
                  <p className="font-semibold text-slate-900">{purchase.user?.name || "Admin User"}</p>
                  <p className="text-[10px] text-slate-400">{t("purchases.signature") || "Signature / Stamp"}</p>
                </div>
              </div>

              <div className="space-y-12">
                <p className="font-bold uppercase tracking-wider text-slate-700">
                  {t("purchases.deliveredBy") || "DELIVERED BY / VENDOR"}
                </p>
                <div className="border-t border-slate-400 mx-2 pt-1.5">
                  <p className="font-semibold text-slate-900">{purchase.supplier?.name || "Supplier"}</p>
                  <p className="text-[10px] text-slate-400">{t("purchases.signature") || "Signature / Stamp"}</p>
                </div>
              </div>

              <div className="space-y-12">
                <p className="font-bold uppercase tracking-wider text-slate-700">
                  {t("purchases.receivedAndCheckedBy") || "RECEIVED & INSPECTED BY"}
                </p>
                <div className="border-t border-slate-400 mx-2 pt-1.5">
                  <p className="font-semibold text-slate-900">
                    {purchase.receivedBy?.name || (purchase.status === "RECEIVED" ? "Warehouse Manager" : "Pending Intake")}
                  </p>
                  <p className="text-[10px] text-slate-400">{t("purchases.signature") || "Signature / Stamp"}</p>
                </div>
              </div>
            </div>

            {/* Footer note */}
            <div className="mt-8 pt-4 border-t border-slate-100 text-[11px] text-slate-400 text-center">
              វិក្កយបត្រនេះត្រូវបានបង្កើតដោយប្រព័ន្ធ POS System សម្រាប់ជាឯកសារយោង និងផ្ទៀងផ្ទាត់ស្តុកជាក់ស្តែង។
            </div>
          </div>
        </div>

        {/* Modal Footer (Screen View) */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0 bg-white dark:bg-slate-900 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            {t("common.close") || "Close"}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
          >
            <Printer size={15} />
            <span>{t("purchases.printInvoice") || "Print Invoice"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
