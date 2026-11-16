"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  ClipboardList, Search, ChevronDown, Eye, X, Loader2, Package, Download, 
  Trash2, AlertTriangle, ShieldAlert, RotateCcw, CheckCircle2, AlertCircle, ArrowRight,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { useLanguageStore } from "@/store/languageStore";

interface OrderItem { 
  id: number; 
  quantity: number; 
  price: number; 
  subtotal: number; 
  product: { name: string; code: string; hasRecipe?: boolean }; 
}

interface Order {
  id: number; 
  orderNumber: string; 
  status: string;
  subtotal: number; 
  discount: number; 
  tax: number; 
  total: number;
  paymentMethod: string; 
  amountPaid: number; 
  change: number;
  note?: string; 
  createdAt: string;
  customer: { name: string; phone?: string } | null;
  user: { name: string };
  items: OrderItem[];
}

const statusColors: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40",
  REFUNDED: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40",
  CANCELLED: "bg-slate-150 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
  DELETED: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 font-bold",
};

export default function OrdersPage() {
  const { t } = useLanguageStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);

  // Pagination states (20 records per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [overallRevenue, setOverallRevenue] = useState(0);

  // 2-Step Delete Modal States
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchOrders = useCallback(async (pageToFetch = currentPage) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", pageToFetch.toString());
    params.set("size", "20");
    if (search) params.set("search", search);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    try {
      const res = await fetch(`/api/orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object" && "content" in data) {
          setOrders(data.content || []);
          setCurrentPage(data.page || pageToFetch);
          setTotalPages(data.totalPages || 1);
          setTotalElements(data.totalElements || 0);
          setOverallRevenue(data.totalRevenue ?? 0);
        } else if (Array.isArray(data)) {
          setOrders(data.slice(0, 20));
          setCurrentPage(pageToFetch);
          setTotalPages(Math.max(1, Math.ceil(data.length / 20)));
          setTotalElements(data.length);
          const rev = data
            .filter((o: any) => o.status === "COMPLETED")
            .reduce((s: number, o: any) => s + Number(o.total || 0), 0);
          setOverallRevenue(rev);
        }
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, startDate, endDate]);

  // When search or filters change, reset to page 1
  useEffect(() => {
    setCurrentPage(1);
    fetchOrders(1);
  }, [search, statusFilter, startDate, endDate]);

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || p === currentPage) return;
    setCurrentPage(p);
    fetchOrders(p);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "COMPLETED": return t("orders.statusCompleted");
      case "PENDING": return t("orders.statusPending");
      case "REFUNDED": return t("orders.statusRefunded");
      case "CANCELLED": return t("orders.statusCancelled");
      case "DELETED": return t("orders.statusDeleted");
      default: return status;
    }
  };

  const openDeleteModal = (order: Order) => {
    if (order.status === "DELETED" || order.status === "CANCELLED" || order.status === "REFUNDED") {
      setToastMessage({ type: "error", text: t("orders.alreadyVoided") });
      return;
    }
    setDeleteTarget(order);
    setDeleteStep(1);
    setDeleteInput("");
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // 1. First attempt HTTP DELETE /api/orders/{id}
      let res = await fetch(`/api/orders/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      // 2. If DELETE isn't directly supported on proxy, fallback to PUT status DELETED
      if (!res.ok) {
        res = await fetch(`/api/orders/${deleteTarget.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "DELETED" }),
        });
      }

      if (res.ok) {
        setToastMessage({ type: "success", text: t("orders.deleteSuccess") });
        setDeleteTarget(null);
        setSelected(null);
        await fetchOrders();
      } else {
        const data = await res.json().catch(() => ({}));
        setToastMessage({ type: "error", text: data.message || "Failed to delete order" });
      }
    } catch (err) {
      console.error("Error executing order delete:", err);
      setToastMessage({ type: "error", text: "Network error occurred while deleting order." });
    } finally {
      setDeleting(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      // Fetch full set without page limit for complete export
      const res = await fetch(`/api/orders?${params}`);
      let exportData: Order[] = orders;
      if (res.ok) {
        const raw = await res.json();
        exportData = Array.isArray(raw) ? raw : (raw.content || orders);
      }

      const headers = ["Order #", "Customer", "Cashier", "Payment Method", "Items Count", "Subtotal", "Discount", "Tax", "Total", "Status", "Date", "Note"];
      const csvRows = [headers.join(",")];
      
      exportData.forEach(o => {
        const row = [
          o.orderNumber,
          `"${o.customer?.name || 'Walk-in'}"`,
          `"${o.user.name}"`,
          o.paymentMethod.replace("_", " "),
          o.items.length,
          o.subtotal,
          o.discount,
          o.tax,
          o.total,
          o.status,
          new Date(o.createdAt).toLocaleDateString(),
          `"${(o.note || "").replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(","));
      });
      
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `orders_export_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all text-sm ${
          toastMessage.type === "success"
            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
            : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
        }`}>
          <div className="flex items-center gap-2.5">
            {toastMessage.type === "success" ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span className="font-medium">{toastMessage.text}</span>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ClipboardList size={24} className="text-indigo-600 dark:text-indigo-400" />
            {t("orders.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">{totalElements} {t("orders.orderCount")} · {t("orders.revenue")}: ${overallRevenue.toFixed(2)}</p>
        </div>
        <button onClick={exportToCSV} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer">
          <Download size={16} />
          {t("orders.exportExcel")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder={t("orders.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer">
            <option value="ALL">{t("orders.allStatuses")}</option>
            <option value="COMPLETED">{t("orders.statusCompleted")}</option>
            <option value="DELETED">{t("orders.statusDeleted")}</option>
            <option value="PENDING">{t("orders.statusPending")}</option>
            <option value="REFUNDED">{t("orders.statusRefunded")}</option>
            <option value="CANCELLED">{t("orders.statusCancelled")}</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none" />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-indigo-500" size={28} /></div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <Package size={36} className="opacity-40" /><p>{t("common.noData")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  {[t("orders.colOrderNum"), t("orders.colCustomer"), t("orders.colCashier"), t("orders.colPayment"), t("orders.colItems"), t("orders.colTotal"), t("orders.colStatus"), t("orders.colDate"), t("common.actions")].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map(o => {
                  const isVoided = o.status === "DELETED" || o.status === "CANCELLED" || o.status === "REFUNDED";
                  return (
                    <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400 text-xs">{o.orderNumber}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{o.customer?.name || <span className="text-slate-400">{t("pos.walkInCustomer")}</span>}</td>
                      <td className="px-4 py-3 text-slate-500">{o.user.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-xs font-medium">{o.paymentMethod.replace("_", " ")}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{o.items.length}</td>
                      <td className={`px-4 py-3 font-bold ${isVoided ? "line-through text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
                        ${Number(o.total).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[o.status] || "bg-slate-100 text-slate-600"}`}>
                          {getStatusLabel(o.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => setSelected(o)} 
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            title={t("orders.orderDetails")}
                          >
                            <Eye size={15} />
                          </button>
                          
                          {/* Special Delete Action */}
                          {!isVoided ? (
                            <button
                              onClick={() => openDeleteModal(o)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 cursor-pointer transition-colors"
                              title={t("orders.deleteOrder")}
                            >
                              <Trash2 size={15} />
                            </button>
                          ) : (
                            <span className="p-1.5 text-slate-300 dark:text-slate-700 cursor-not-allowed" title={t("orders.alreadyVoided")}>
                              <Trash2 size={15} className="opacity-40" />
                            </span>
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

        {/* Pagination Controls */}
        {totalElements > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t("orders.showing")} <span className="font-semibold text-slate-700 dark:text-slate-200">{(currentPage - 1) * 20 + 1}</span> {t("orders.to")}{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(currentPage * 20, totalElements)}</span> {t("orders.of")}{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">{totalElements}</span> {t("orders.records")}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Previous Button */}
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>{t("orders.previous")}</span>
              </button>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => {
                    const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                    return (
                      <span key={p} className="flex items-center gap-1">
                        {showEllipsisBefore && (
                          <span className="px-1.5 text-xs text-slate-400">...</span>
                        )}
                        <button
                          type="button"
                          onClick={() => goToPage(p)}
                          disabled={loading}
                          className={`min-w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                            p === currentPage
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    );
                  })}
              </div>

              {/* Next Button */}
              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
              >
                <span>{t("orders.next")}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100 font-mono text-base">{selected.orderNumber}</h2>
                  <p className="text-xs text-slate-400">{new Date(selected.createdAt).toLocaleString()}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[selected.status] || ""}`}>
                  {getStatusLabel(selected.status)}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { l: t("orders.colCustomer"), v: selected.customer?.name || t("pos.walkInCustomer") },
                  { l: t("orders.colCashier"), v: selected.user.name },
                  { l: t("orders.colPayment"), v: selected.paymentMethod.replace("_", " ") },
                  { l: t("orders.colStatus"), v: getStatusLabel(selected.status) }
                ].map(row => (
                  <div key={row.l}><p className="text-xs text-slate-400">{row.l}</p><p className="font-semibold text-slate-800 dark:text-slate-200">{row.v}</p></div>
                ))}
              </div>
              {/* Items */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                      {[t("products.colProduct"), t("pos.itemsCount"), t("products.colPrice"), t("pos.subtotal")].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selected.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300 font-medium">{item.product.name}</td>
                        <td className="px-3 py-2 text-slate-500">{item.quantity}</td>
                        <td className="px-3 py-2 text-slate-500">${Number(item.price).toFixed(2)}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">${Number(item.subtotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Totals */}
              <div className="space-y-1 text-sm border-t border-slate-200 dark:border-slate-800 pt-3">
                {[
                  { l: t("pos.subtotal"), v: `$${Number(selected.subtotal).toFixed(2)}` },
                  { l: t("pos.discount"), v: `-$${Number(selected.discount).toFixed(2)}` },
                  { l: t("pos.tax"), v: `$${Number(selected.tax).toFixed(2)}` }
                ].map(r => (
                  <div key={r.l} className="flex justify-between text-slate-500"><span>{r.l}</span><span>{r.v}</span></div>
                ))}
                <div className="flex justify-between font-bold text-base text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span>{t("pos.total")}</span><span className="text-indigo-600 dark:text-indigo-400">${Number(selected.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500"><span>{t("payment.amountReceived")}</span><span>${Number(selected.amountPaid).toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-500"><span>{t("payment.change")}</span><span>${Number(selected.change).toFixed(2)}</span></div>
              </div>
              {selected.note && <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-500"><span className="font-semibold">{t("inventory.colNote")}: </span>{selected.note}</div>}

              {/* Delete / Void Button in Modal */}
              {selected.status !== "DELETED" && selected.status !== "CANCELLED" && selected.status !== "REFUNDED" && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => openDeleteModal(selected)}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                    {t("orders.deleteOrder")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2-Step Delete & Stock Return Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-rose-50/70 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl">
                  {deleteStep === 1 ? <AlertTriangle size={20} /> : <ShieldAlert size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {deleteStep === 1 ? t("orders.deleteStep1Title") : t("orders.deleteStep2Title")}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {deleteTarget.orderNumber} · ${Number(deleteTarget.total).toFixed(2)}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setDeleteTarget(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {deleteStep === 1 ? (
                /* STEP 1: Review & Stock Return Notification */
                <>
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span>{t("orders.deleteStep1Warning")}</span>
                  </div>

                  {/* Restock items preview */}
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <RotateCcw size={13} className="text-indigo-600 dark:text-indigo-400" />
                      {t("orders.deleteReturnItems")}
                    </p>
                    <div className="divide-y divide-slate-150 dark:divide-slate-850 max-h-36 overflow-y-auto pr-1">
                      {deleteTarget.items.map((item) => (
                        <div key={item.id} className="py-1.5 flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{item.product.name}</span>
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded-full font-bold text-[11px]">
                            +{item.quantity} units restocked
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 1 Actions */}
                  <div className="flex gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(null)}
                      className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteStep(2)}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {t("orders.continueStep2")}
                    </button>
                  </div>
                </>
              ) : (
                /* STEP 2: Final Confirmation with text typing verification */
                <>
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-3 text-xs text-rose-800 dark:text-rose-300">
                    <ShieldAlert size={16} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                    <span>{t("orders.deleteStep2Warning")}</span>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {t("orders.deleteTypeInstruction")}:
                    </label>
                    <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center font-mono text-sm font-bold text-rose-600">
                      DELETE
                    </div>
                    <input
                      type="text"
                      autoFocus
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder={t("orders.deletePlaceholder")}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/40 text-center uppercase tracking-widest"
                    />
                  </div>

                  {/* Step 2 Actions */}
                  <div className="flex gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setDeleteStep(1)}
                      disabled={deleting}
                      className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      {t("common.back")}
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      disabled={deleteInput.trim().toUpperCase() !== "DELETE" && deleteInput.trim() !== deleteTarget.orderNumber || deleting}
                      className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {deleting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          {t("orders.deleteProcessing")}
                        </>
                      ) : (
                        <>
                          <Trash2 size={14} />
                          {t("orders.deleteConfirmBtn")}
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}