"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend 
} from "recharts";
import { 
  BarChart3, DollarSign, TrendingUp, ShoppingBag, 
  Activity, Download, Printer, 
  Layers, CreditCard, UserCheck, 
  Award, Calendar, Loader2, ArrowUpRight
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";

interface ReportData {
  summary: {
    totalRevenue: number;
    totalRevenueKhr?: number;
    totalCostOfGoods: number;
    totalCostOfGoodsKhr?: number;
    totalDiscount: number;
    totalTax: number;
    netProfit: number;
    netProfitKhr?: number;
    profitMarginPct?: number;
    orderCount: number;
    avgOrderValue: number;
    exchangeRate?: number;
  };
  salesByDate: {
    date: string;
    revenue: number;
    cost: number;
    profit: number;
    orders: number;
  }[];
  salesByCategory: {
    category: string;
    revenue: number;
    quantity: number;
  }[];
  salesByCashier: {
    cashier: string;
    revenue: number;
    orders: number;
  }[];
  topProducts?: {
    productName: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
    marginPct: number;
  }[];
  paymentMethods?: {
    method: string;
    amount: number;
    count: number;
    sharePct: number;
  }[];
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6", "#ec4899", "#3b82f6"];

export default function ReportsPage() {
  const { t } = useLanguageStore();
  const { user } = useAuthStore();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "PRODUCTS" | "PAYMENTS" | "CASHIERS">("OVERVIEW");
  const [quickFilter, setQuickFilter] = useState<"today" | "week" | "month" | "all" | "custom">("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let url = "/api/reports";
      const params = new URLSearchParams();
      if (dateRange.start) params.set("startDate", dateRange.start);
      if (dateRange.end) params.set("endDate", dateRange.end);
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to fetch reports");
      }
      
      const result: ReportData = await res.json();

      // Ensure topProducts is strictly populated from COMPLETED orders within the date range
      if (!result.topProducts || result.topProducts.length === 0) {
        try {
          const ordersParams = new URLSearchParams();
          ordersParams.set("status", "COMPLETED");
          if (dateRange.start) ordersParams.set("startDate", dateRange.start);
          if (dateRange.end) ordersParams.set("endDate", dateRange.end);

          const ordersRes = await fetch(`/api/orders?${ordersParams.toString()}`);
          if (ordersRes.ok) {
            const orders = await ordersRes.json();
            const prodMap: Record<string, { quantity: number; revenue: number; cost: number }> = {};
            const payMap: Record<string, { amount: number; count: number }> = {};
            let totalOrderRev = 0;

            for (const order of orders) {
              // Strictly only COMPLETED orders
              if (order.status !== "COMPLETED") continue;

              // Check date boundaries if set
              if (dateRange.start && order.createdAt) {
                const orderDate = new Date(order.createdAt).toISOString().split("T")[0];
                if (orderDate < dateRange.start) continue;
              }
              if (dateRange.end && order.createdAt) {
                const orderDate = new Date(order.createdAt).toISOString().split("T")[0];
                if (orderDate > dateRange.end) continue;
              }

              // Aggregate Payment Method breakdown
              const pMethod = order.paymentMethod || "CASH";
              const oTotal = Number(order.total) || 0;
              totalOrderRev += oTotal;
              if (!payMap[pMethod]) payMap[pMethod] = { amount: 0, count: 0 };
              payMap[pMethod].amount += oTotal;
              payMap[pMethod].count += 1;

              // Aggregate Products
              if (Array.isArray(order.items)) {
                for (const item of order.items) {
                  const pName = item.product?.name || `Product #${item.id || 'item'}`;
                  if (!prodMap[pName]) {
                    prodMap[pName] = { quantity: 0, revenue: 0, cost: 0 };
                  }
                  const itemQty = Number(item.quantity) || 1;
                  const itemSubtotal = (item.subtotal != null && !isNaN(Number(item.subtotal)))
                    ? Number(item.subtotal)
                    : (Number(item.price || 0) * itemQty);
                  const unitCost = Number(item.product?.cost) || (itemSubtotal * 0.35 / itemQty);

                  prodMap[pName].quantity += itemQty;
                  prodMap[pName].revenue += itemSubtotal;
                  prodMap[pName].cost += unitCost * itemQty;
                }
              }
            }

            result.topProducts = Object.entries(prodMap).map(([pName, pStats]) => {
              const pProfit = pStats.revenue - pStats.cost;
              const pMargin = pStats.revenue > 0 ? Math.round((pProfit / pStats.revenue) * 100) : 0;
              return {
                productName: pName,
                quantity: pStats.quantity,
                revenue: Math.round(pStats.revenue * 100) / 100,
                cost: Math.round(pStats.cost * 100) / 100,
                profit: Math.round(pProfit * 100) / 100,
                marginPct: pMargin
              };
            });

            if (!result.paymentMethods || result.paymentMethods.length === 0) {
              result.paymentMethods = Object.entries(payMap).map(([method, pStats]) => ({
                method,
                amount: Math.round(pStats.amount * 100) / 100,
                count: pStats.count,
                sharePct: totalOrderRev > 0 ? Math.round((pStats.amount / totalOrderRev) * 100) : 0
              }));
            }
          }
        } catch (fallbackErr) {
          console.warn("Fallback completed orders fetch:", fallbackErr);
        }
      }

      // Always sort topProducts strictly by QTY (quantity) descending
      if (result.topProducts && result.topProducts.length > 0) {
        result.topProducts.sort((a, b) => b.quantity - a.quantity);
      }

      setData(result);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading reports");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const setQuickDate = (type: "today" | "week" | "month" | "all") => {
    setQuickFilter(type);
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    if (type === "today") {
      setDateRange({ start: todayStr, end: todayStr });
    } else if (type === "week") {
      const prev = new Date();
      prev.setDate(today.getDate() - 7);
      setDateRange({ start: prev.toISOString().split("T")[0], end: todayStr });
    } else if (type === "month") {
      const prev = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateRange({ start: prev.toISOString().split("T")[0], end: todayStr });
    } else {
      setDateRange({ start: "", end: "" });
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
  };

  const formatKhr = (val: number) => {
    return new Intl.NumberFormat("en-US").format(Math.round(val)) + " ៛";
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ["Report Type", "POS Sales & Financial Report"],
      ["Date Range", `${dateRange.start || "All"} to ${dateRange.end || "All"}`],
      ["Generated At", new Date().toLocaleString()],
      [],
      ["Summary Metric", "Value (USD)", "Value (KHR)"],
      ["Total Revenue", data.summary.totalRevenue, data.summary.totalRevenueKhr || data.summary.totalRevenue * 4100],
      ["Cost of Goods Sold (COGS)", data.summary.totalCostOfGoods, data.summary.totalCostOfGoodsKhr || data.summary.totalCostOfGoods * 4100],
      ["Net Profit", data.summary.netProfit, data.summary.netProfitKhr || data.summary.netProfit * 4100],
      ["Total Orders", data.summary.orderCount, ""],
      ["Average Order Value", data.summary.avgOrderValue, ""],
      [],
      ["Date", "Revenue ($)", "Cost ($)", "Profit ($)", "Orders"],
      ...data.salesByDate.map(d => [d.date, d.revenue, d.cost, d.profit, d.orders]),
      [],
      ["Top Products (Sorted by QTY)", "Quantity (Sold)", "Revenue ($)", "Cost ($)", "Profit ($)", "Margin (%)"],
      ...(data.topProducts || []).map(p => [p.productName, p.quantity, p.revenue, p.cost, p.profit, `${p.marginPct}%`]),
      [],
      ["Payment Method", "Amount ($)", "Invoices Count", "Share (%)"],
      ...(data.paymentMethods || []).map(pm => [pm.method, pm.amount, pm.count, `${pm.sharePct}%`])
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pos_sales_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <Activity size={48} className="text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">{t("reports.accessDenied")}</h2>
        <p className="text-slate-500 mt-2">{t("reports.adminOnly")}</p>
      </div>
    );
  }

  const exchangeRate = data?.summary.exchangeRate || 4100;
  const totalRevKhr = data?.summary.totalRevenueKhr || (data ? data.summary.totalRevenue * exchangeRate : 0);
  const netProfitKhr = data?.summary.netProfitKhr || (data ? data.summary.netProfit * exchangeRate : 0);
  const totalCostKhr = data?.summary.totalCostOfGoodsKhr || (data ? data.summary.totalCostOfGoods * exchangeRate : 0);
  const avgOrderKhr = data ? data.summary.avgOrderValue * exchangeRate : 0;

  return (
    <div className="space-y-6">
      {/* 1. Header (System Standard) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 size={26} className="text-indigo-600 dark:text-indigo-400" />
            {t("reports.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            {t("reports.subtitle")}
          </p>
        </div>
        
        {/* Export Buttons */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={exportCSV}
            disabled={!data || loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Download size={16} /> 
            {t("reports.exportExcel")}
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Printer size={16} /> 
            {t("reports.exportPdf")}
          </button>
        </div>
      </div>

      {/* 2. Filters & Navigation Bar (Matches Orders/Users filter row) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Tabs Control */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
          {[
            { id: "OVERVIEW", label: t("reports.tabOverview"), icon: Layers },
            { id: "PRODUCTS", label: t("reports.tabProducts"), icon: Award },
            { id: "PAYMENTS", label: t("reports.tabPayment"), icon: CreditCard },
            { id: "CASHIERS", label: t("reports.tabCashier"), icon: UserCheck },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Date Filter Inputs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filter Pill Buttons */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
            <button
              onClick={() => setQuickDate("today")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                quickFilter === "today"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              ថ្ងៃនេះ
            </button>
            <button
              onClick={() => setQuickDate("week")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                quickFilter === "week"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              ៧ ថ្ងៃ
            </button>
            <button
              onClick={() => setQuickDate("month")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                quickFilter === "month"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              ខែនេះ
            </button>
            <button
              onClick={() => setQuickDate("all")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                quickFilter === "all"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              ទាំងអស់
            </button>
          </div>

          {/* Date Pickers */}
          <div className="flex items-center gap-1.5">
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => {
                setQuickFilter("custom");
                setDateRange({ ...dateRange, start: e.target.value });
              }}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <span className="text-slate-400 text-xs">ដល់</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => {
                setQuickFilter("custom");
                setDateRange({ ...dateRange, end: e.target.value });
              }}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="animate-spin text-indigo-500" size={28} />
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 p-6 rounded-2xl border border-rose-200 dark:border-rose-900">
          <p className="font-semibold text-base mb-1">{t("common.error")}</p>
          <p className="text-sm">{error}</p>
        </div>
      ) : data ? (
        <>
          {/* 3. Stat Cards (Matches DashboardPage style identically) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Stat 1: Revenue */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <DollarSign size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  {t("reports.totalRevenue")}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {formatCurrency(data.summary.totalRevenue)}
                </p>
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                  ≈ {formatKhr(totalRevKhr)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {data.summary.orderCount} {t("orders.orderCount")}
                </p>
              </div>
            </div>

            {/* Stat 2: Net Profit */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <TrendingUp size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  {t("reports.netProfit")}
                </p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(data.summary.netProfit)}
                </p>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  ≈ {formatKhr(netProfitKhr)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {data.summary.profitMarginPct || 0}% {t("reports.profitMargin")}
                </p>
              </div>
            </div>

            {/* Stat 3: Cost of Goods (COGS) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                <ShoppingBag size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  {t("reports.costOfGoods")}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {formatCurrency(data.summary.totalCostOfGoods)}
                </p>
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">
                  ≈ {formatKhr(totalCostKhr)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ថ្លៃដើមរូបមន្ត & ទំនិញ
                </p>
              </div>
            </div>

            {/* Stat 4: Average Order Value */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-2.5 rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
                <Activity size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  {t("reports.averageOrder")}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {formatCurrency(data.summary.avgOrderValue)}
                </p>
                <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mt-1">
                  ≈ {formatKhr(avgOrderKhr)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  មធ្យមភាគក្នុងមួយវិក្កយបត្រ
                </p>
              </div>
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "OVERVIEW" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sales & Profit Trend Line Chart */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                      {t("reports.salesTrend")}
                    </h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="h-80 w-full">
                    {data.salesByDate.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.salesByDate} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.4} />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                          <RechartsTooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: any) => formatCurrency(Number(value))}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line type="monotone" dataKey="revenue" name={t("reports.totalRevenue")} stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                          <Line type="monotone" dataKey="profit" name={t("reports.netProfit")} stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400">{t("common.noData")}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sales By Category Pie Chart */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Activity size={18} className="text-violet-600 dark:text-violet-400" />
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                      {t("reports.salesByCategory")}
                    </h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="h-80 w-full">
                    {data.salesByCategory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.salesByCategory}
                            cx="50%"
                            cy="45%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={4}
                            dataKey="revenue"
                            nameKey="category"
                          >
                            {data.salesByCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                          <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400">{t("common.noData")}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TOP PRODUCTS (Sorted Strictly by QTY SOLD) */}
          {activeTab === "PRODUCTS" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-amber-500" />
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                    {t("reports.tabProducts")}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800/50">
                    🏆 {t("reports.sortedByQty") || "រៀបតាមចំនួនលក់ច្រើនជាងគេ (QTY)"}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("reports.colProduct")}</th>
                      <th className="px-5 py-3 text-right text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50/60 dark:bg-indigo-950/40">
                        {t("reports.colQty")} (QTY)
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("reports.colRevenue")}</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("reports.colCost")}</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("reports.colProfit")}</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("reports.colMargin")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.topProducts && data.topProducts.length > 0 ? (
                      data.topProducts.map((p, idx) => (
                        <tr key={p.productName} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-400">
                            {idx === 0 ? "🥇 1" : idx === 1 ? "🥈 2" : idx === 2 ? "🥉 3" : idx + 1}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0">
                              {p.productName ? p.productName.charAt(0).toUpperCase() : "P"}
                            </div>
                            <span className="truncate">{p.productName}</span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-black text-indigo-600 dark:text-indigo-400 text-base bg-indigo-50/30 dark:bg-indigo-950/20">
                            {p.quantity}
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-slate-100">${p.revenue.toFixed(2)}</td>
                          <td className="px-5 py-3.5 text-right text-slate-500">${p.cost.toFixed(2)}</td>
                          <td className="px-5 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">${p.profit.toFixed(2)}</td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                              {p.marginPct}%
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400">{t("common.noData")}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENTS BREAKDOWN */}
          {activeTab === "PAYMENTS" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                      វិធីសាស្ត្រទូទាត់ (Payment Breakdown)
                    </h2>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {data.paymentMethods && data.paymentMethods.length > 0 ? (
                    data.paymentMethods.map((pm, idx) => (
                      <div key={pm.method} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                          <div>
                            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{pm.method.replace("_", " ")}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{pm.count} វិក្កយបត្រ (Invoices)</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold text-slate-900 dark:text-slate-100">${pm.amount.toFixed(2)}</p>
                          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">{pm.sharePct}% នៃចំណូលសរុប</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400">{t("common.noData")}</div>
                  )}
                </div>
              </div>

              {/* Payment Pie */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    សមាមាត្រទូទាត់ (% Share)
                  </h2>
                </div>
                <div className="p-6 flex-1 flex items-center justify-center">
                  <div className="h-64 w-full">
                    {data.paymentMethods && data.paymentMethods.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.paymentMethods}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="amount"
                            nameKey="method"
                          >
                            {data.paymentMethods.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                          <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400">{t("common.noData")}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CASHIERS PERFORMANCE */}
          {activeTab === "CASHIERS" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <UserCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                    {t("reports.salesByCashier")}
                  </h2>
                </div>
                <span className="text-xs text-slate-500">ការលក់តាមអ្នកគិតលុយម្នាក់ៗ</span>
              </div>
              <div className="p-6">
                <div className="h-72 w-full">
                  {data.salesByCashier.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.salesByCashier} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} opacity={0.4} />
                        <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                        <YAxis dataKey="cashier" type="category" width={120} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                        <Bar dataKey="revenue" name={t("reports.totalRevenue")} fill="#4f46e5" radius={[0, 6, 6, 0]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">{t("common.noData")}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
