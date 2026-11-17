"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  PackagePlus,
  Search,
  CheckCircle2,
  Clock,
  Warehouse,
  Truck,
  Boxes,
  Loader2,
  Calendar,
  AlertCircle,
  X,
  FileText,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Ban,
  Check,
  Printer
} from "lucide-react";
import { useLanguageStore } from "@/store/languageStore";
import PurchaseInvoiceModal from "@/components/purchases/PurchaseInvoiceModal";

interface Supplier {
  id: number;
  name: string;
}

interface Ingredient {
  id: number;
  name: string;
  code: string;
  unit: string;
  cost: number | string;
  stock: number | string;
}

interface Product {
  id: number;
  name: string;
  code: string;
  cost: number | string;
  stock: number | string;
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
  expiryDate?: string;
}

interface Purchase {
  id: number;
  reference: string;
  totalAmount: number | string;
  note: string;
  status: string; // PENDING | RECEIVED | CANCELLED
  receivedAt?: string;
  receivedBy?: { name: string };
  createdAt: string;
  supplier: Supplier;
  user: { name: string };
  items: PurchaseItem[];
}

function ReceiveStockContent() {
  const { t } = useLanguageStore();
  const searchParams = useSearchParams();
  const initialRef = searchParams.get("ref") || "";

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"TO_RECEIVE" | "RECEIVED">("TO_RECEIVE");
  const [searchQuery, setSearchQuery] = useState(initialRef);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Review & Receive Modal State
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [modalItemExpiries, setModalItemExpiries] = useState<Record<number, string>>({});
  const [receiveNote, setReceiveNote] = useState("");
  const [submittingReceive, setSubmittingReceive] = useState(false);
  const [modalError, setModalError] = useState("");

  // Cancel Confirmation Modal State
  const [cancellingPurchase, setCancellingPurchase] = useState<Purchase | null>(null);
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [printingPurchase, setPrintingPurchase] = useState<Purchase | null>(null);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/purchases");
      if (res.ok) {
        const data: Purchase[] = await res.json();
        setPurchases(data);
      }
    } catch (err) {
      console.error("Failed to fetch purchases:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Split purchases by status
  const pendingPurchases = useMemo(
    () => purchases.filter((p) => (p.status || "RECEIVED") === "PENDING"),
    [purchases]
  );
  const receivedPurchases = useMemo(
    () => purchases.filter((p) => (p.status || "RECEIVED") === "RECEIVED"),
    [purchases]
  );

  const totalPendingValue = useMemo(
    () => pendingPurchases.reduce((acc, p) => acc + (parseFloat(String(p.totalAmount)) || 0), 0),
    [pendingPurchases]
  );

  const displayedPurchases = useMemo(() => {
    const list = activeTab === "TO_RECEIVE" ? pendingPurchases : receivedPurchases;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (p) =>
        p.reference.toLowerCase().includes(q) ||
        p.supplier?.name.toLowerCase().includes(q) ||
        (p.note && p.note.toLowerCase().includes(q))
    );
  }, [activeTab, pendingPurchases, receivedPurchases, searchQuery]);

  // Open review modal
  const openReceiveModal = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    const expMap: Record<number, string> = {};
    purchase.items.forEach((item) => {
      expMap[item.id] = item.expiryDate || "";
    });
    setModalItemExpiries(expMap);
    setReceiveNote("");
    setModalError("");
  };

  // Submit Receive
  const handleConfirmReceive = async () => {
    if (!selectedPurchase) return;
    setSubmittingReceive(true);
    setModalError("");

    try {
      const itemsPayload = selectedPurchase.items.map((item) => ({
        itemId: item.id,
        expiryDate: modalItemExpiries[item.id] ? modalItemExpiries[item.id] : null,
      }));

      const res = await fetch(`/api/purchases/${selectedPurchase.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: receiveNote,
          items: itemsPayload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setModalError(errData.message || "Failed to receive order");
        setSubmittingReceive(false);
        return;
      }

      setSelectedPurchase(null);
      showToast(t("receiveStock.receiveSuccess"));
      fetchPurchases();
    } catch (err: any) {
      setModalError(err.message || "Unexpected network error");
    } finally {
      setSubmittingReceive(false);
    }
  };

  // Quick 1-click receive
  const handleQuickReceive = async (purchase: Purchase) => {
    if (!confirm(t("receiveStock.confirmReceiveDesc"))) return;
    try {
      const res = await fetch(`/api/purchases/${purchase.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        showToast(t("receiveStock.receiveSuccess"));
        fetchPurchases();
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to receive order");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    }
  };

  // Cancel order
  const handleCancelOrder = async () => {
    if (!cancellingPurchase) return;
    setSubmittingCancel(true);
    try {
      const res = await fetch(`/api/purchases/${cancellingPurchase.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setCancellingPurchase(null);
        showToast(t("receiveStock.cancelSuccess"));
        fetchPurchases();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to cancel order");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setSubmittingCancel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle2 size={18} />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <PackagePlus size={26} className="text-emerald-600 dark:text-emerald-400" />
            {t("receiveStock.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t("receiveStock.subtitle")}</p>
        </div>
        {/* <Link
          href="/purchases"
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <Boxes size={16} />
          <span>{t("nav.purchases")}</span>
          <ArrowRight size={14} className="text-slate-400" />
        </Link> */}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t("receiveStock.pendingCount")}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {pendingPurchases.length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t("receiveStock.receivedCount")}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {receivedPurchases.length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t("receiveStock.totalPendingValue")}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              ${totalPendingValue.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-sm font-semibold">
          <button
            onClick={() => setActiveTab("TO_RECEIVE")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${activeTab === "TO_RECEIVE"
              ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
          >
            <Clock size={16} />
            <span>{t("receiveStock.toReceiveTab")}</span>
            {pendingPurchases.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-xs font-bold">
                {pendingPurchases.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("RECEIVED")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${activeTab === "RECEIVED"
              ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
          >
            <CheckCircle2 size={16} />
            <span>{t("receiveStock.receivedTab")}</span>
            <span className="text-xs text-slate-400">({receivedPurchases.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("receiveStock.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex items-center justify-center h-56 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
        </div>
      ) : displayedPurchases.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-slate-400 gap-3">
          <Warehouse size={40} className="opacity-40" />
          <p className="text-sm font-medium">
            {activeTab === "TO_RECEIVE"
              ? t("receiveStock.noPendingOrders")
              : t("receiveStock.noReceivedOrders")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedPurchases.map((purchase) => {
            const isPending = (purchase.status || "RECEIVED") === "PENDING";
            return (
              <div
                key={purchase.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-5 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setPrintingPurchase(purchase)}
                      className="font-mono text-base font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer text-left"
                      title={t("purchases.printInvoice")}
                    >
                      {purchase.reference}
                    </button>
                    {isPending ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        <Clock size={12} /> {t("purchases.statusPending")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 size={12} /> {t("purchases.statusReceived")}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Truck size={14} className="text-slate-400" />
                      <strong className="text-slate-700 dark:text-slate-300">
                        {purchase.supplier?.name}
                      </strong>
                    </div>
                  </div>

                  {/* Actions for this PO */}
                  <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                    {/* Print / View Invoice Button */}
                    <button
                      type="button"
                      onClick={() => setPrintingPurchase(purchase)}
                      title={t("purchases.printInvoice")}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <Printer size={13} className="text-indigo-600 dark:text-indigo-400" />
                      <span>{t("purchases.viewInvoice")}</span>
                    </button>

                    {isPending ? (
                      <>
                        <button
                          onClick={() => setCancellingPurchase(purchase)}
                          className="px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Ban size={14} className="inline mr-1" />
                          {t("receiveStock.cancelOrder")}
                        </button>
                        <button
                          onClick={() => handleQuickReceive(purchase)}
                          className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {t("receiveStock.quickReceive")}
                        </button>
                        <button
                          onClick={() => openReceiveModal(purchase)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                        >
                          <PackagePlus size={14} />
                          {t("receiveStock.reviewAndReceive")}
                        </button>
                      </>
                    ) : (
                      <div className="text-right text-xs text-slate-500 pl-2">
                        <p>
                          <span className="font-semibold">{t("receiveStock.receivedAt")}:</span>{" "}
                          {purchase.receivedAt
                            ? new Date(purchase.receivedAt).toLocaleDateString()
                            : new Date(purchase.createdAt).toLocaleDateString()}
                        </p>
                        {purchase.receivedBy && (
                          <p>
                            <span className="font-semibold">{t("receiveStock.receivedBy")}:</span>{" "}
                            {purchase.receivedBy.name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Grid/List */}
                <div className="pt-4">
                  <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                    {t("receiveStock.itemDetails")} ({purchase.items.length})
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {purchase.items.map((item, idx) => {
                      const isProduct = !!item.product || !!item.productId;
                      const name = isProduct
                        ? item.product?.name || `Product #${item.productId}`
                        : item.ingredient?.name || `Ingredient #${item.ingredientId}`;
                      const code = isProduct ? item.product?.code : item.ingredient?.code;
                      const unit = isProduct ? "pcs" : item.ingredient?.unit || "unit";

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${isProduct
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                  : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                                  }`}
                              >
                                {isProduct ? "Product" : "Ingredient"}
                              </span>
                              <strong className="text-slate-800 dark:text-slate-200 text-sm">
                                {name}
                              </strong>
                            </div>
                            <p className="text-slate-500 font-mono">
                              {Number(item.quantity)} {unit}  $
                              {Number(item.cost).toFixed(4)}/{unit}
                            </p>
                            {item.expiryDate ? (
                              <div className="flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                                <Calendar size={11} />
                                <span>{t("purchases.expiryDate")}: <strong>{item.expiryDate}</strong></span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                {t("purchases.noExpiry")}
                              </span>
                            )}
                          </div>
                          <div className="text-right pl-3 shrink-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              ${Number(item.subtotal).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Order Info */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span>
                      <strong>{t("purchases.colDate")}:</strong>{" "}
                      {new Date(purchase.createdAt).toLocaleDateString()}
                    </span>
                    <span>
                      <strong>{t("purchases.colCreatedBy")}:</strong> {purchase.user?.name}
                    </span>
                    {purchase.note && (
                      <span className="italic">
                        <strong>{t("purchases.note")}:</strong> {purchase.note}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 uppercase font-semibold mr-1">
                      {t("purchases.colTotal")}:
                    </span>
                    <strong className="text-base text-slate-900 dark:text-slate-100">
                      ${Number(purchase.totalAmount).toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review & Receive Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={22} className="text-emerald-600" />
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    {t("receiveStock.confirmReceiveTitle")}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">{selectedPurchase.reference}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPurchase(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs leading-relaxed flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <p>{t("receiveStock.confirmReceiveDesc")}</p>
              </div>

              {modalError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-xl text-sm">
                  {modalError}
                </div>
              )}

              <div>
                <p className="text-xs font-bold uppercase text-slate-400 mb-2">
                  {t("receiveStock.verifyExpiry")}
                </p>
                <div className="space-y-3">
                  {selectedPurchase.items.map((item) => {
                    const isProduct = !!item.product || !!item.productId;
                    const name = isProduct
                      ? item.product?.name || `Product #${item.productId}`
                      : item.ingredient?.name || `Ingredient #${item.ingredientId}`;
                    const unit = isProduct ? "pcs" : item.ingredient?.unit || "unit";

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/60 dark:border-slate-800/60"
                      >
                        <div className="space-y-0.5">
                          <strong className="text-slate-800 dark:text-slate-200 text-sm">
                            {name}
                          </strong>
                          <p className="text-xs text-slate-500">
                            {Number(item.quantity)} {unit} @ ${Number(item.cost).toFixed(4)}/{unit} = $
                            {Number(item.subtotal).toFixed(2)}
                          </p>
                        </div>
                        <div className="w-full sm:w-44">
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1 flex items-center gap-1">
                            <Calendar size={11} className="text-rose-500" />
                            {t("purchases.expiryDate")}
                          </label>
                          <input
                            type="date"
                            value={modalItemExpiries[item.id] || ""}
                            onChange={(e) =>
                              setModalItemExpiries({
                                ...modalItemExpiries,
                                [item.id]: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {t("purchases.note")} (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shipment verified, good condition"
                  value={receiveNote}
                  onChange={(e) => setReceiveNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0 bg-slate-50 dark:bg-slate-900 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                disabled={submittingReceive}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer transition-colors shadow-sm"
              >
                {submittingReceive ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {t("receiveStock.confirmReceiveTitle")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancellingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  {t("receiveStock.cancelOrder")}?
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {cancellingPurchase.reference}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to cancel this purchase order? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setCancellingPurchase(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={submittingCancel}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {submittingCancel && <Loader2 size={14} className="animate-spin" />}
                {t("receiveStock.cancelOrder")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Purchase Invoice Modal */}
      {printingPurchase && (
        <PurchaseInvoiceModal
          purchase={printingPurchase}
          onClose={() => setPrintingPurchase(null)}
        />
      )}
    </div>
  );
}

export default function ReceiveStockPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
        </div>
      }
    >
      <ReceiveStockContent />
    </Suspense>
  );
}
