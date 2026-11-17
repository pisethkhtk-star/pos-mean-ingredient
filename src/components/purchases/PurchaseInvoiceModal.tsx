"use client";

import React, { useEffect } from "react";
import { useLanguageStore } from "@/store/languageStore";
import { useSettingsStore } from "@/store/settingsStore";
import { Calendar, Truck, CheckCircle2, Clock, Ban } from "lucide-react";

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

  // Automatically trigger print dialog directly, skipping intermediate manual click
  useEffect(() => {
    if (!purchase) return;

    const timer = setTimeout(() => {
      window.print();
    }, 120);

    const handleAfterPrint = () => {
      onClose();
    };

    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [purchase, onClose]);

  if (!purchase) return null;

  const status = purchase.status || "RECEIVED";
  const isPending = status === "PENDING";
  const isCancelled = status === "CANCELLED";

  const totalQty = (purchase.items || []).reduce(
    (sum, item) => sum + (parseFloat(String(item.quantity)) || 0),
    0
  );

  return (
    <div
      id="purchase-invoice-modal-root"
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none opacity-0 overflow-hidden print:opacity-100 print:pointer-events-auto print:static print:overflow-visible print:w-full print:h-auto print:p-0 print:m-0"
    >
      {/* Global Print Style for foolproof direct printing & free size responsiveness */}
      <style jsx global>{`
        @media print {
          @page {
            size: auto;
            margin: 8mm 10mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          #purchase-invoice-modal-root,
          #purchase-invoice-modal-root *,
          #print-purchase-invoice,
          #print-purchase-invoice * {
            visibility: visible !important;
            opacity: 1 !important;
          }
          #purchase-invoice-modal-root {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            pointer-events: auto !important;
          }
          #purchase-invoice-modal-wrapper {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #print-purchase-invoice {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
          }
          #print-purchase-invoice table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
          }
          #print-purchase-invoice table,
          #print-purchase-invoice tr {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div
        id="purchase-invoice-modal-wrapper"
        className="w-full max-w-4xl flex flex-col justify-center items-center print:w-full print:max-w-none print:m-0 print:p-0"
      >
        {/* Printable Invoice Sheet */}
        <div
          id="print-purchase-invoice"
          className="w-full max-w-3xl bg-white text-slate-900 p-8 sm:p-10 rounded-2xl shadow border border-slate-200 text-sm font-sans flex flex-col mx-auto print:w-full print:max-w-none print:p-0 print:shadow-none print:border-none print:rounded-none"
        >
          {/* Top Company & Invoice Header */}
          <div className="flex justify-between items-start pb-5 border-b-2 border-slate-200 gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                {settings?.storeName || "Coffee System"}
              </h1>
              <p className="text-xs text-indigo-600 font-semibold tracking-wide">
                POS & INVENTORY MANAGEMENT SYSTEM
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
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
          <div className="grid grid-cols-2 gap-3 py-4 border-b border-slate-200 text-xs">
            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 flex items-center gap-1">
                <Truck size={13} className="text-indigo-600" />
                {t("purchases.colSupplier") || "Supplier"} / VENDOR
              </p>
              <p className="text-sm sm:text-base font-bold text-slate-900">
                {purchase.supplier?.name || "N/A"}
              </p>
              <p className="text-slate-500 mt-0.5 text-[11px]">
                Supplier ID: #{purchase.supplier?.id || "-"}
              </p>
              {purchase.note && (
                <p className="text-slate-600 italic mt-2 text-[11px] bg-white p-2 rounded border border-slate-200">
                  <span className="font-semibold">{t("purchases.note") || "Note"}:</span> {purchase.note}
                </p>
              )}
            </div>

            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5 text-[11px]">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 flex items-center gap-1">
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

          {/* Items Table - Fluid Free Size with Proportional Columns */}
          <div className="py-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-700 font-semibold">
                  <th className="py-2 px-2 text-center w-[5%] whitespace-nowrap">#</th>
                  <th className="py-2 px-2 text-left w-[35%]">{t("purchases.colItems") || "Items"}</th>
                  <th className="py-2 px-2 text-left w-[13%] whitespace-nowrap">{t("purchases.itemType") || "Type"}</th>
                  <th className="py-2 px-2 text-left w-[17%] whitespace-nowrap">{t("purchases.expiryDate") || "Expiry Date"}</th>
                  <th className="py-2 px-2 text-center w-[10%] whitespace-nowrap">{t("products.quantity") || "Qty"}</th>
                  <th className="py-2 px-2 text-right w-[10%] whitespace-nowrap">{t("ingredients.colUnitCost") || "Unit Cost ($)"}</th>
                  <th className="py-2 px-2 text-right w-[10%] whitespace-nowrap">{t("pos.subtotal") || "Subtotal"}</th>
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
                      <td className="py-2.5 px-2 text-center text-slate-400 font-mono whitespace-nowrap text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-2 font-semibold text-slate-900 text-[11px] sm:text-xs">
                        <div>{name}</div>
                        {code && <span className="text-[10px] text-slate-400 font-mono">[{code}]</span>}
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
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
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        {item.expiryDate ? (
                          <span className="inline-flex items-center gap-1 font-mono text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-[10px] sm:text-[11px] whitespace-nowrap">
                            📅 {item.expiryDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-800 font-mono whitespace-nowrap text-[11px]">
                        {Number(item.quantity)} <span className="text-[10px] text-slate-500 font-normal">{unit}</span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-700 font-mono whitespace-nowrap text-[11px]">
                        ${Number(item.cost).toFixed(4)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-900 font-mono whitespace-nowrap text-[11px]">
                        ${Number(item.subtotal).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Total Summary */}
          <div className="border-t-2 border-slate-300 pt-3 pb-5">
            <div className="flex justify-between items-start gap-4">
              <div className="text-xs text-slate-500 space-y-1">
                <p>
                  <span className="font-semibold text-slate-700">Total Line Items:</span> {purchase.items.length}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Total Quantity:</span> {totalQty.toFixed(2)}
                </p>
              </div>

              <div className="w-64 space-y-1.5 text-right">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>{t("pos.subtotal") || "Subtotal"}:</span>
                  <span className="font-mono font-semibold">${Number(purchase.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-slate-900 border-t-2 border-slate-900 pt-1.5">
                  <span className="uppercase tracking-wider">{t("purchases.colTotal") || "Total Amount"}:</span>
                  <span className="text-lg sm:text-xl font-black text-indigo-700 font-mono">
                    ${Number(purchase.totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Official Signatures Section */}
          <div className="grid grid-cols-3 gap-4 pt-8 mt-2 border-t border-dashed border-slate-300 text-center text-xs text-slate-600">
            <div className="space-y-8">
              <p className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                {t("purchases.preparedBy") || "PREPARED BY"}
              </p>
              <div className="border-t border-slate-400 mx-2 pt-1.5">
                <p className="font-semibold text-slate-900 text-[11px]">{purchase.user?.name || "Admin User"}</p>
                <p className="text-[10px] text-slate-400">{t("purchases.signature") || "Signature / Stamp"}</p>
              </div>
            </div>

            <div className="space-y-8">
              <p className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                {t("purchases.deliveredBy") || "DELIVERED BY / VENDOR"}
              </p>
              <div className="border-t border-slate-400 mx-2 pt-1.5">
                <p className="font-semibold text-slate-900 text-[11px]">{purchase.supplier?.name || "Supplier"}</p>
                <p className="text-[10px] text-slate-400">{t("purchases.signature") || "Signature / Stamp"}</p>
              </div>
            </div>

            <div className="space-y-8">
              <p className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                {t("purchases.receivedAndCheckedBy") || "RECEIVED & INSPECTED BY"}
              </p>
              <div className="border-t border-slate-400 mx-2 pt-1.5">
                <p className="font-semibold text-slate-900 text-[11px]">
                  {purchase.receivedBy?.name || (purchase.status === "RECEIVED" ? "Warehouse Manager" : "Pending Intake")}
                </p>
                <p className="text-[10px] text-slate-400">{t("purchases.signature") || "Signature / Stamp"}</p>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-6 pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-center">
            វិក្កយបត្រនេះត្រូវបានបង្កើតដោយប្រព័ន្ធ POS System សម្រាប់ជាឯកសារយោង និងផ្ទៀងផ្ទាត់ស្តុកជាក់ស្តែង។
          </div>
        </div>
      </div>
    </div>
  );
}
