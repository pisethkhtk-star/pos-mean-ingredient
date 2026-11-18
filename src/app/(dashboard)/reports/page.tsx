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
  Award, Calendar, Loader2, FileSpreadsheet,
  AlertTriangle, Clock, ShieldAlert, CheckCircle2, Package, Search
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

interface ExpiryItem {
  id: string;
  itemId: number;
  name: string;
  code: string;
  type: "PRODUCT" | "INGREDIENT";
  unit: string;
  stock: number;
  totalStock: number;
  cost: number;
  expiryDate: string | null;
  daysRemaining: number | null;
  status: "EXPIRED" | "EXPIRING_SOON" | "VALID";
  batchRef: string;
  purchaseId?: number;
}

interface ExpiryReportData {
  summary: {
    totalMonitored: number;
    expiredCount: number;
    expiringSoonCount: number;
    validCount: number;
    expiredValue: number;
    expiringSoonValue: number;
  };
  items: ExpiryItem[];
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6", "#ec4899", "#3b82f6"];

const formatLocalDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getInitialMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${day}`
  };
};

export default function ReportsPage() {
  const { t } = useLanguageStore();
  const { user } = useAuthStore();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "PRODUCTS" | "PAYMENTS" | "CASHIERS" | "EXPIRY">("OVERVIEW");
  const [quickFilter, setQuickFilter] = useState<"today" | "week" | "month" | "all" | "custom">("month");
  const [dateRange, setDateRange] = useState(getInitialMonthRange);

  // Expiry Report States
  const [expiryData, setExpiryData] = useState<ExpiryReportData | null>(null);
  const [expiryLoading, setExpiryLoading] = useState(false);
  const [expirySearch, setExpirySearch] = useState("");
  const [expiryTypeFilter, setExpiryTypeFilter] = useState<"ALL" | "PRODUCT" | "INGREDIENT">("ALL");
  const [expiryStatusFilter, setExpiryStatusFilter] = useState<"ALL" | "EXPIRED" | "EXPIRING_SOON" | "VALID">("ALL");

  const fetchExpiryData = useCallback(async () => {
    try {
      setExpiryLoading(true);
      const params = new URLSearchParams();
      if (expirySearch) params.set("search", expirySearch);
      if (expiryTypeFilter !== "ALL") params.set("type", expiryTypeFilter);
      if (expiryStatusFilter !== "ALL") params.set("status", expiryStatusFilter);

      const res = await fetch(`/api/reports/expiry?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setExpiryData(json);
      }
    } catch (e) {
      console.error("Failed to load expiry report:", e);
    } finally {
      setExpiryLoading(false);
    }
  }, [expirySearch, expiryTypeFilter, expiryStatusFilter]);

  useEffect(() => {
    if (activeTab === "EXPIRY") {
      fetchExpiryData();
    }
  }, [activeTab, fetchExpiryData]);

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
            const rawOrders = await ordersRes.json();
            const orders = Array.isArray(rawOrders) ? rawOrders : (rawOrders.content || []);
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
    const todayStr = formatLocalDate(today);
    if (type === "today") {
      setDateRange({ start: todayStr, end: todayStr });
    } else if (type === "week") {
      const prev = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
      setDateRange({ start: formatLocalDate(prev), end: todayStr });
    } else if (type === "month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateRange({ start: formatLocalDate(firstDay), end: todayStr });
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

  // Professional Native .XLSX Exporter using ExcelJS
  const exportExcel = async () => {
    if (!data) return;
    try {
      setExporting(true);
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Coffee POS System";
      workbook.lastModifiedBy = "Admin";
      workbook.created = new Date();
      workbook.modified = new Date();

      const ws = workbook.addWorksheet("Sales_Report", {
        views: [{ showGridLines: true }],
        pageSetup: { orientation: "portrait", paperSize: 9 }
      });

      // Style Helpers
      const thinBorder: any = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };

      const headerFill: any = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" } // Slate-800
      };

      const primaryFill: any = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4F46E5" } // Indigo-600
      };

      // 1. Top Title Banner (Rows 1-2)
      ws.mergeCells("A1:G2");
      const titleCell = ws.getCell("A1");
      titleCell.value = "POS SALES & FINANCIAL REPORT (របាយការណ៍លក់ & ហិរញ្ញវត្ថុ)";
      titleCell.font = { name: "Arial", size: 15, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.fill = primaryFill;
      titleCell.alignment = { horizontal: "center", vertical: "middle" };

      // Subtitle (Row 3)
      ws.mergeCells("A3:G3");
      const subCell = ws.getCell("A3");
      const dateText = `កាលបរិច្ឆេទ: ${dateRange.start || "All"} ដល់ ${dateRange.end || "All"}  |  កាលបរិច្ឆេទបង្កើត: ${new Date().toLocaleString()}  |  ប្រព័ន្ធ: Coffee POS System`;
      subCell.value = dateText;
      subCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF3730A3" } };
      subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
      subCell.alignment = { horizontal: "center", vertical: "middle" };

      let curRow = 5;

      // 2. Section 1: Financial Summary
      ws.mergeCells(`A${curRow}:G${curRow}`);
      const sec1Cell = ws.getCell(`A${curRow}`);
      sec1Cell.value = "១. ទិដ្ឋភាពសង្ខេបហិរញ្ញវត្ថុ (EXECUTIVE FINANCIAL SUMMARY)";
      sec1Cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF1E293B" } };
      curRow++;

      // Summary Table Header
      const sumHeaderRow = ws.getRow(curRow);
      sumHeaderRow.values = ["សូចនាករ (Metric)", "តម្លៃ (USD)", "តម្លៃ (KHR)", "សម្គាល់ (Notes)"];
      sumHeaderRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      sumHeaderRow.eachCell((cell, colNum) => {
        if (colNum <= 4) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
          cell.alignment = { vertical: "middle", horizontal: colNum === 1 ? "left" : "right" };
          cell.border = thinBorder;
        }
      });
      sumHeaderRow.height = 24;
      curRow++;

      const exRate = data.summary.exchangeRate || 4100;
      const summaryItems = [
        { label: "ចំណូលសរុប (Total Revenue)", usd: data.summary.totalRevenue, khr: data.summary.totalRevenueKhr || data.summary.totalRevenue * exRate, note: `${data.summary.orderCount} វិក្កយបត្រ COMPLETED` },
        { label: "ថ្លៃដើមទំនិញ (Cost of Goods / COGS)", usd: data.summary.totalCostOfGoods, khr: data.summary.totalCostOfGoodsKhr || data.summary.totalCostOfGoods * exRate, note: "ថ្លៃដើមគ្រឿងផ្សំ & រូបមន្ត" },
        { label: "ប្រាក់ចំណេញសុទ្ធ (Net Profit)", usd: data.summary.netProfit, khr: data.summary.netProfitKhr || data.summary.netProfit * exRate, note: `អត្រាចំណេញ ${data.summary.profitMarginPct || 0}%`, isProfit: true },
        { label: "តម្លៃលក់ជាមធ្យម (Average Order Value)", usd: data.summary.avgOrderValue, khr: data.summary.avgOrderValue * exRate, note: "Average Ticket Size" },
      ];

      for (const item of summaryItems) {
        const r = ws.getRow(curRow);
        r.values = [item.label, item.usd, item.khr, item.note];
        r.height = 20;

        const cellA = r.getCell(1);
        cellA.font = { name: "Arial", size: 10, bold: item.isProfit };
        cellA.border = thinBorder;
        cellA.alignment = { vertical: "middle" };

        const cellB = r.getCell(2);
        cellB.numFmt = '"$"#,##0.00';
        cellB.font = { name: "Arial", size: 10, bold: true, color: item.isProfit ? { argb: "FF047857" } : undefined };
        cellB.border = thinBorder;
        cellB.alignment = { vertical: "middle", horizontal: "right" };

        const cellC = r.getCell(3);
        cellC.numFmt = '#,##0" ៛"';
        cellC.font = { name: "Arial", size: 10, color: { argb: "FF4338CA" } };
        cellC.border = thinBorder;
        cellC.alignment = { vertical: "middle", horizontal: "right" };

        const cellD = r.getCell(4);
        cellD.font = { name: "Arial", size: 9, color: { argb: "FF64748B" } };
        cellD.border = thinBorder;
        cellD.alignment = { vertical: "middle" };

        if (item.isProfit) {
          r.eachCell((cell, colNum) => {
            if (colNum <= 4) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
          });
        }

        curRow++;
      }

      curRow += 2;

      // 3. Section 2: Top Products Sorted by QTY
      ws.mergeCells(`A${curRow}:G${curRow}`);
      const sec2Cell = ws.getCell(`A${curRow}`);
      sec2Cell.value = "២. មុខទំនិញលក់ដាច់បំផុត (TOP SELLING PRODUCTS - SORTED BY QTY SOLD)";
      sec2Cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF1E293B" } };
      curRow++;

      // Top Products Table Header
      const prodHeaderRow = ws.getRow(curRow);
      prodHeaderRow.values = [
        "ល.រ (#)",
        "មុខទំនិញ (Product Name)",
        "ចំនួនលក់ (QTY Sold)",
        "ចំណូលសរុប (Revenue)",
        "ថ្លៃដើម (COGS)",
        "ប្រាក់ចំណេញ (Profit)",
        "អត្រាចំណេញ (%)"
      ];
      prodHeaderRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      prodHeaderRow.height = 26;
      prodHeaderRow.eachCell((cell, colNum) => {
        if (colNum <= 7) {
          cell.fill = colNum === 3
            ? { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } } // Highlight QTY column
            : headerFill;
          cell.alignment = { vertical: "middle", horizontal: colNum === 2 ? "left" : (colNum === 1 || colNum === 3 ? "center" : "right") };
          cell.border = thinBorder;
        }
      });
      curRow++;

      let totalQty = 0;
      let totalProdRev = 0;
      let totalProdCost = 0;
      let totalProdProfit = 0;

      const topList = [...(data.topProducts || [])].sort((a, b) => b.quantity - a.quantity);

      if (topList.length > 0) {
        topList.forEach((p, idx) => {
          totalQty += p.quantity;
          totalProdRev += p.revenue;
          totalProdCost += p.cost;
          totalProdProfit += p.profit;

          const r = ws.getRow(curRow);
          r.values = [
            idx === 0 ? "🥇 1" : idx === 1 ? "🥈 2" : idx === 2 ? "🥉 3" : idx + 1,
            p.productName,
            p.quantity,
            p.revenue,
            p.cost,
            p.profit,
            p.marginPct / 100
          ];
          r.height = 20;

          const zebraBg: any = idx % 2 === 0
            ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } }
            : { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

          r.eachCell((cell, colNum) => {
            if (colNum <= 7) {
              cell.fill = zebraBg;
              cell.border = thinBorder;
              cell.font = { name: "Arial", size: 10 };
            }
          });

          // Cell formatting
          r.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
          r.getCell(2).alignment = { vertical: "middle", horizontal: "left" };
          r.getCell(2).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0F172A" } };

          // QTY Highlight
          const qtyCell = r.getCell(3);
          qtyCell.numFmt = '#,##0';
          qtyCell.alignment = { vertical: "middle", horizontal: "center" };
          qtyCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF4338CA" } };
          qtyCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };

          r.getCell(4).numFmt = '"$"#,##0.00';
          r.getCell(4).alignment = { vertical: "middle", horizontal: "right" };
          r.getCell(4).font = { name: "Arial", size: 10, bold: true };

          r.getCell(5).numFmt = '"$"#,##0.00';
          r.getCell(5).alignment = { vertical: "middle", horizontal: "right" };
          r.getCell(5).font = { name: "Arial", size: 10, color: { argb: "FF64748B" } };

          r.getCell(6).numFmt = '"$"#,##0.00';
          r.getCell(6).alignment = { vertical: "middle", horizontal: "right" };
          r.getCell(6).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF059669" } };

          r.getCell(7).numFmt = '0.0%';
          r.getCell(7).alignment = { vertical: "middle", horizontal: "right" };
          r.getCell(7).font = { name: "Arial", size: 9, bold: true, color: { argb: "FF047857" } };

          curRow++;
        });

        // Total Row
        const totRow = ws.getRow(curRow);
        const overallMargin = totalProdRev > 0 ? (totalProdProfit / totalProdRev) : 0;
        totRow.values = ["", "សរុប (TOTAL)", totalQty, totalProdRev, totalProdCost, totalProdProfit, overallMargin];
        totRow.height = 24;
        totRow.eachCell((cell, colNum) => {
          if (colNum <= 7) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
            cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0F172A" } };
            cell.border = {
              top: { style: "thin", color: { argb: "FF94A3B8" } },
              bottom: { style: "double", color: { argb: "FF475569" } },
              left: { style: "thin", color: { argb: "FFCBD5E1" } },
              right: { style: "thin", color: { argb: "FFCBD5E1" } }
            };
          }
        });
        totRow.getCell(2).alignment = { vertical: "middle", horizontal: "left" };
        totRow.getCell(3).numFmt = '#,##0';
        totRow.getCell(3).alignment = { vertical: "middle", horizontal: "center" };
        totRow.getCell(4).numFmt = '"$"#,##0.00';
        totRow.getCell(4).alignment = { vertical: "middle", horizontal: "right" };
        totRow.getCell(5).numFmt = '"$"#,##0.00';
        totRow.getCell(5).alignment = { vertical: "middle", horizontal: "right" };
        totRow.getCell(6).numFmt = '"$"#,##0.00';
        totRow.getCell(6).alignment = { vertical: "middle", horizontal: "right" };
        totRow.getCell(7).numFmt = '0.0%';
        totRow.getCell(7).alignment = { vertical: "middle", horizontal: "right" };

        curRow++;
      } else {
        const emptyRow = ws.getRow(curRow);
        emptyRow.values = ["", "មិនមានទិន្នន័យ (No Data)", "", "", "", "", ""];
        curRow++;
      }

      curRow += 2;

      // 4. Section 3: Payment Methods Breakdown
      ws.mergeCells(`A${curRow}:E${curRow}`);
      const sec3Cell = ws.getCell(`A${curRow}`);
      sec3Cell.value = "៣. វិធីសាស្ត្រទូទាត់ (PAYMENT METHODS BREAKDOWN)";
      sec3Cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF1E293B" } };
      curRow++;

      const payHeaderRow = ws.getRow(curRow);
      payHeaderRow.values = ["វិធីទូទាត់ (Method)", "ទឹកប្រាក់ (USD)", "ទឹកប្រាក់ (KHR)", "ចំនួនវិក្កយបត្រ (Invoices)", "ចំណែកភាគរយ (%)"];
      payHeaderRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      payHeaderRow.height = 24;
      payHeaderRow.eachCell((cell, colNum) => {
        if (colNum <= 5) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } }; // Teal
          cell.alignment = { vertical: "middle", horizontal: colNum === 1 ? "left" : "right" };
          cell.border = thinBorder;
        }
      });
      curRow++;

      if (data.paymentMethods && data.paymentMethods.length > 0) {
        for (const pm of data.paymentMethods) {
          const r = ws.getRow(curRow);
          r.values = [
            pm.method.replace("_", " "),
            pm.amount,
            pm.amount * exRate,
            pm.count,
            pm.sharePct / 100
          ];
          r.height = 20;
          r.eachCell((cell, colNum) => {
            if (colNum <= 5) {
              cell.border = thinBorder;
              cell.font = { name: "Arial", size: 10 };
            }
          });
          r.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
          r.getCell(1).font = { name: "Arial", size: 10, bold: true };
          r.getCell(2).numFmt = '"$"#,##0.00';
          r.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
          r.getCell(3).numFmt = '#,##0" ៛"';
          r.getCell(3).alignment = { vertical: "middle", horizontal: "right" };
          r.getCell(4).numFmt = '#,##0';
          r.getCell(4).alignment = { vertical: "middle", horizontal: "center" };
          r.getCell(5).numFmt = '0.0%';
          r.getCell(5).alignment = { vertical: "middle", horizontal: "right" };
          curRow++;
        }
      }

      curRow += 2;

      // 5. Section 4: Daily Sales Breakdown
      if (data.salesByDate && data.salesByDate.length > 0) {
        ws.mergeCells(`A${curRow}:E${curRow}`);
        const sec4Cell = ws.getCell(`A${curRow}`);
        sec4Cell.value = "៤. និន្នាការលក់តាមកាលបរិច្ឆេទ (DAILY SALES BREAKDOWN)";
        sec4Cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF1E293B" } };
        curRow++;

        const dateHeaderRow = ws.getRow(curRow);
        dateHeaderRow.values = ["កាលបរិច្ឆេទ (Date)", "ចំណូល (Revenue)", "ថ្លៃដើម (Cost)", "ប្រាក់ចំណេញ (Profit)", "ចំនួនវិក្កយបត្រ (Orders)"];
        dateHeaderRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        dateHeaderRow.height = 24;
        dateHeaderRow.eachCell((cell, colNum) => {
          if (colNum <= 5) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
            cell.alignment = { vertical: "middle", horizontal: colNum === 1 ? "center" : "right" };
            cell.border = thinBorder;
          }
        });
        curRow++;

        for (const d of data.salesByDate) {
          const r = ws.getRow(curRow);
          r.values = [d.date, d.revenue, d.cost, d.profit, d.orders];
          r.height = 20;
          r.eachCell((cell, colNum) => {
            if (colNum <= 5) {
              cell.border = thinBorder;
              cell.font = { name: "Arial", size: 10 };
            }
          });
          r.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
          r.getCell(2).numFmt = '"$"#,##0.00';
          r.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
          r.getCell(3).numFmt = '"$"#,##0.00';
          r.getCell(3).alignment = { vertical: "middle", horizontal: "right" };
          r.getCell(4).numFmt = '"$"#,##0.00';
          r.getCell(4).alignment = { vertical: "middle", horizontal: "right" };
          r.getCell(4).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF059669" } };
          r.getCell(5).numFmt = '#,##0';
          r.getCell(5).alignment = { vertical: "middle", horizontal: "center" };
          curRow++;
        }
      }

      // 6. Set Proportional Column Widths so NOTHING is truncated or shows ###!
      ws.columns = [
        { width: 14 }, // Col A: # / Rank / Method
        { width: 34 }, // Col B: Product Name / Metric
        { width: 24 }, // Col C: QTY / USD
        { width: 24 }, // Col D: Revenue / KHR
        { width: 20 }, // Col E: Cost / Share %
        { width: 20 }, // Col F: Profit
        { width: 18 }, // Col G: Margin %
      ];

      // Generate Native XLSX Buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const fileName = `pos_sales_report_${dateRange.start || "all"}_${dateRange.end || "all"}_${new Date().toISOString().split("T")[0]}.xlsx`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Failed to generate Excel report:", err);
      alert("មានបញ្ហាក្នុងការទាញយក Excel សូមព្យាយាមម្តងទៀត");
    } finally {
      setExporting(false);
    }
  };

  const exportExpiryExcel = async () => {
    if (!expiryData || !expiryData.items) return;
    try {
      setExporting(true);
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Coffee POS System";
      workbook.created = new Date();

      const ws = workbook.addWorksheet("Expiry_Report", {
        views: [{ showGridLines: true }],
        pageSetup: { orientation: "landscape", paperSize: 9 },
      });

      // Top Banner
      ws.mergeCells("A1:L2");
      const titleCell = ws.getCell("A1");
      titleCell.value = "COFFEE POS - INVENTORY EXPIRY TRACKING REPORT (របាយការណ៍កាលបរិច្ឆេទផុតកំណត់)";
      titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF991B1B" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };

      // Subtitle
      ws.mergeCells("A3:L3");
      const subCell = ws.getCell("A3");
      subCell.value = `កាលបរិច្ឆេទបង្កើត: ${new Date().toLocaleString()}  |  ទំនិញតាមដានសរុប: ${expiryData.summary.totalMonitored}  |  ផុតកំណត់: ${expiryData.summary.expiredCount} ($${expiryData.summary.expiredValue.toFixed(2)})  |  ជិតផុតកំណត់: ${expiryData.summary.expiringSoonCount} ($${expiryData.summary.expiringSoonValue.toFixed(2)})`;
      subCell.font = { name: "Arial", size: 9.5, italic: true, color: { argb: "FF334155" } };
      subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
      subCell.alignment = { horizontal: "center", vertical: "middle" };

      ws.getRow(4).height = 8;

      const rowsData = expiryData.items.map((item, idx) => [
        idx + 1,
        item.name,
        item.code,
        item.type,
        item.batchRef,
        Number(item.stock),
        item.unit,
        Number(item.cost),
        Math.round(Number(item.stock) * Number(item.cost) * 100) / 100,
        item.expiryDate || "N/A",
        item.daysRemaining != null ? item.daysRemaining : "N/A",
        item.status === "EXPIRED" ? "EXPIRED (ផុតកំណត់)" : (item.status === "EXPIRING_SOON" ? "EXPIRING SOON (ជិតផុត)" : "VALID (សុវត្ថិភាព)")
      ]);

      ws.addTable({
        name: "ExpiryReportTable",
        ref: "A5",
        headerRow: true,
        totalsRow: true,
        style: {
          theme: "TableStyleMedium3",
          showRowStripes: true,
        },
        columns: [
          { name: "#", totalsRowLabel: "សរុប (TOTAL):", filterButton: true },
          { name: "Item Name", filterButton: true },
          { name: "Code", filterButton: true },
          { name: "Type", filterButton: true },
          { name: "Batch / Ref", filterButton: true },
          { name: "Available Stock", totalsRowFunction: "sum", filterButton: true },
          { name: "Unit", filterButton: true },
          { name: "Cost ($)", filterButton: true },
          { name: "Total Value ($)", totalsRowFunction: "sum", filterButton: true },
          { name: "Expiry Date", filterButton: true },
          { name: "Days Left", filterButton: true },
          { name: "Status", filterButton: true },
        ],
        rows: rowsData,
      });

      ws.columns = [
        { width: 8 },  // #
        { width: 26 }, // Item Name
        { width: 18 }, // Code
        { width: 14 }, // Type
        { width: 22 }, // Batch / Ref
        { width: 16 }, // Stock
        { width: 10 }, // Unit
        { width: 14 }, // Cost ($)
        { width: 16 }, // Total Value ($)
        { width: 16 }, // Expiry Date
        { width: 14 }, // Days Left
        { width: 22 }, // Status
      ];

      rowsData.forEach((_, i) => {
        const r = ws.getRow(6 + i);
        r.height = 22;
        r.font = { name: "Arial", size: 9.5 };

        r.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
        r.getCell(2).alignment = { vertical: "middle", horizontal: "left" };
        r.getCell(3).alignment = { vertical: "middle", horizontal: "center" };
        r.getCell(4).alignment = { vertical: "middle", horizontal: "center" };
        r.getCell(5).alignment = { vertical: "middle", horizontal: "center" };

        r.getCell(6).alignment = { vertical: "middle", horizontal: "right" };
        r.getCell(6).numFmt = "#,##0.00";
        r.getCell(7).alignment = { vertical: "middle", horizontal: "center" };

        r.getCell(8).alignment = { vertical: "middle", horizontal: "right" };
        r.getCell(8).numFmt = '"$"#,##0.00';

        r.getCell(9).alignment = { vertical: "middle", horizontal: "right" };
        r.getCell(9).numFmt = '"$"#,##0.00';

        r.getCell(10).alignment = { vertical: "middle", horizontal: "center" };
        r.getCell(11).alignment = { vertical: "middle", horizontal: "center" };

        const stCell = r.getCell(12);
        stCell.alignment = { vertical: "middle", horizontal: "center" };
        const statusVal = String(stCell.value);
        if (statusVal.includes("EXPIRED")) {
          stCell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FFE11D48" } };
        } else if (statusVal.includes("EXPIRING SOON")) {
          stCell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FFD97706" } };
        } else {
          stCell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FF059669" } };
        }
      });

      const totRowIndex = 5 + rowsData.length + 1;
      const totRow = ws.getRow(totRowIndex);
      totRow.height = 26;
      totRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0F172A" } };
      totRow.getCell(6).numFmt = "#,##0.00";
      totRow.getCell(9).numFmt = '"$"#,##0.00';

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `expiry_report_${formatLocalDate(new Date())}_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export expiry excel failed:", e);
    } finally {
      setExporting(false);
    }
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
          {/* <p className="text-sm text-slate-500 mt-1.5">
            {t("reports.subtitle")}
          </p> */}
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={activeTab === "EXPIRY" ? exportExpiryExcel : exportExcel}
            disabled={(activeTab === "EXPIRY" ? (!expiryData || expiryLoading) : (!data || loading)) || exporting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <FileSpreadsheet size={16} />
            )}
            {exporting ? "កំពុងទាញយក..." : t("reports.exportExcel")}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer"
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
            { id: "EXPIRY", label: t("reports.tabExpiry"), icon: AlertTriangle },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${isActive
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

        {/* Date Filter Inputs (Only for Sales Analytics Tabs) */}
        {activeTab !== "EXPIRY" && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Filter Pill Buttons */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
              <button
                onClick={() => setQuickDate("today")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${quickFilter === "today"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
              >
                {t("reports.today")}
              </button>
              <button
                onClick={() => setQuickDate("week")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${quickFilter === "week"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
              >
                {t("reports.sevenDays")}
              </button>
              <button
                onClick={() => setQuickDate("month")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${quickFilter === "month"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
              >
                {t("reports.thisMonth")}
              </button>
              <button
                onClick={() => setQuickDate("all")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${quickFilter === "all"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
              >
                {t("reports.allTime")}
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
              <span className="text-slate-400 text-xs">{t("reports.to")}</span>
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
        )}
      </div>

      {activeTab === "EXPIRY" ? (
        /* TAB 5: EXPIRY & FEFO TRACKING */
        <div className="space-y-6">
          {/* 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Monitored */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("reports.totalMonitored")}</span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Package size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{expiryData?.summary.totalMonitored || 0}</p>
              <p className="text-xs text-slate-400 mt-1">{t("report.expire")}</p>
            </div>

            {/* 2. Expired */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("reports.expiredItems")}</span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <ShieldAlert size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{expiryData?.summary.expiredCount || 0}</p>
              <p className="text-xs text-slate-400 mt-1">
                {t("report.loseprice")}: ${Number(expiryData?.summary.expiredValue || 0).toFixed(2)}
              </p>
            </div>

            {/* 3. Expiring Soon */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("reports.expiringSoon")}</span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Clock size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{expiryData?.summary.expiringSoonCount || 0}</p>
              <p className="text-xs text-slate-400 mt-1">
                {t("reports.atRiskValue")}: ${Number(expiryData?.summary.expiringSoonValue || 0).toFixed(2)}
              </p>
            </div>

            {/* 4. Valid */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("reports.validItems")}</span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{expiryData?.summary.validCount || 0}</p>
              <p className="text-xs text-slate-400 mt-1">{t("reports.validCondition")}</p>
            </div>
          </div>

          {/* Expiry Filters & Search */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search Input */}
              <div className="relative flex-1 min-w-64">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ស្វែងរកតាមឈ្មោះទំនិញ, កូដ, ឬលេខ PO..."
                  value={expirySearch}
                  onChange={(e) => setExpirySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {[
                  { id: "ALL", label: "ទាំងអស់" },
                  { id: "PRODUCT", label: "ទំនិញ (Product)" },
                  { id: "INGREDIENT", label: "គ្រឿងផ្សំ (Ingredient)" },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setExpiryTypeFilter(t.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${expiryTypeFilter === t.id
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {[
                  { id: "ALL", label: "គ្រប់ស្ថានភាព" },
                  { id: "EXPIRED", label: "🔴 ផុតកំណត់" },
                  { id: "EXPIRING_SOON", label: "🟡 ជិតផុត" },
                  { id: "VALID", label: "🟢 សុវត្ថិភាព" },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setExpiryStatusFilter(s.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${expiryStatusFilter === s.id
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  តារាងទំនិញ និងគ្រឿងផ្សំ (តម្រៀបតាមថ្ងៃផុតកំណត់មុនគេ - FEFO)
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {expiryData?.items.length || 0} មុខទំនិញ
              </span>
            </div>

            {expiryLoading ? (
              <div className="flex items-center justify-center h-52">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : !expiryData || expiryData.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 text-slate-400 gap-2">
                <Package size={36} className="opacity-40" />
                <p className="text-sm">មិនមានទិន្នន័យទំនិញផុតកំណត់ឡើយ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3 text-center w-12">#</th>
                      <th className="px-4 py-3 text-left">ឈ្មោះមុខទំនិញ / គ្រឿងផ្សំ</th>
                      <th className="px-4 py-3 text-center">ប្រភេទ</th>
                      <th className="px-4 py-3 text-center">កូដបាច់ / PO</th>
                      <th className="px-4 py-3 text-right">ស្តុកនៅសល់</th>
                      <th className="px-4 py-3 text-right">តម្លៃដើម</th>
                      <th className="px-4 py-3 text-right">តម្លៃសរុប</th>
                      <th className="px-4 py-3 text-center">ថ្ងៃផុតកំណត់</th>
                      <th className="px-4 py-3 text-center">រយៈពេលនៅសល់</th>
                      <th className="px-4 py-3 text-center">ស្ថានភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {expiryData.items.map((item, idx) => {
                      const isExpired = item.status === "EXPIRED";
                      const isExpiringSoon = item.status === "EXPIRING_SOON";

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${isExpired
                            ? "bg-rose-50/40 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/30"
                            : isExpiringSoon
                              ? "bg-amber-50/40 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            }`}
                        >
                          <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</p>
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{item.code}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.type === "PRODUCT"
                              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                              }`}>
                              {item.type === "PRODUCT" ? "Product" : "Ingredient"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-slate-600 dark:text-slate-300">
                            {item.batchRef}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                            {Number(item.stock).toFixed(item.unit === "pcs" ? 0 : 2)} <span className="text-xs text-slate-400 font-normal">{item.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 font-mono">
                            ${Number(item.cost).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100 font-mono">
                            ${(Number(item.stock) * Number(item.cost)).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                            {item.expiryDate || "—"}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">
                            {item.daysRemaining != null ? (
                              isExpired ? (
                                <span className="text-rose-600 dark:text-rose-400">
                                  ហួស {Math.abs(item.daysRemaining)} ថ្ងៃ
                                </span>
                              ) : isExpiringSoon ? (
                                <span className="text-amber-600 dark:text-amber-400">
                                  សល់ {item.daysRemaining} ថ្ងៃ
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  សល់ {item.daysRemaining} ថ្ងៃ
                                </span>
                              )
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${isExpired
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-300 dark:border-rose-800"
                              : isExpiringSoon
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? "bg-rose-500 animate-pulse" : isExpiringSoon ? "bg-amber-500" : "bg-emerald-500"
                                }`} />
                              {isExpired ? "ផុតកំណត់" : isExpiringSoon ? "ជិតផុតកំណត់" : "សុវត្ថិភាព"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : loading ? (
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
                  {t("reports.costprice")}
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
                  {t("reports.average_invoice")}
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
