"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserCog,
  Plus,
  Trash2,
  X,
  Loader2,
  Pencil,
  Shield,
  ShieldCheck,
  Check,
  Sliders,
  CheckSquare,
  Square,
  LayoutDashboard,
  Calculator,
  ShoppingBag,
  Boxes,
  Tags,
  Ticket,
  Warehouse,
  PackageCheck,
  Truck,
  Users as UsersIcon,
  ClipboardList,
  BarChart3,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  createdAt: string;
}

const AVAILABLE_PAGES = [
  { name: "Dashboard", translationKey: "nav.dashboard", href: "/", icon: LayoutDashboard },
  { name: "POS Terminal", translationKey: "nav.pos", href: "/pos", icon: Calculator },
  { name: "Products", translationKey: "nav.products", href: "/products", icon: ShoppingBag },
  { name: "Ingredients", translationKey: "nav.ingredients", href: "/ingredients", icon: Boxes },
  { name: "Categories", translationKey: "nav.categories", href: "/categories", icon: Tags },
  { name: "Discounts", translationKey: "nav.discounts", href: "/discounts", icon: Ticket },
  { name: "Inventory", translationKey: "nav.inventory", href: "/inventory", icon: Warehouse },
  { name: "Purchases", translationKey: "nav.purchases", href: "/purchases", icon: PackageCheck },
  { name: "Suppliers", translationKey: "nav.suppliers", href: "/suppliers", icon: Truck },
  { name: "Customers", translationKey: "nav.customers", href: "/customers", icon: UsersIcon },
  { name: "Orders", translationKey: "nav.orders", href: "/orders", icon: ClipboardList },
  { name: "Reports", translationKey: "nav.reports", href: "/reports", icon: BarChart3 },
  { name: "Users", translationKey: "nav.users", href: "/users", icon: UserCog },
  { name: "Role Permissions", translationKey: "nav.roles", href: "/roles", icon: Shield },
  { name: "Settings", translationKey: "nav.settings", href: "/settings", icon: SettingsIcon },
];

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "CASHIER",
  useCustomPermissions: false,
  permissions: [] as string[],
};

export default function UsersPage() {
  const { user, checkSession } = useAuthStore();
  const { t } = useLanguageStore();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    else if (res.status === 403) router.replace("/");
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (user && user.role === "ADMIN") {
      fetchUsers();
    } else if (user && user.role !== "ADMIN") {
      router.replace("/");
    }
  }, [fetchUsers, user, router]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    const hasCustom = Boolean(u.permissions && u.permissions.length > 0);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      useCustomPermissions: hasCustom,
      permissions: u.permissions || [],
    });
    setError("");
    setShowModal(true);
  };

  const togglePagePermission = (href: string) => {
    setForm((prev) => {
      const exists = prev.permissions.includes(href);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== href)
          : [...prev.permissions, href],
      };
    });
  };

  const selectAllPages = () => {
    setForm((prev) => ({
      ...prev,
      permissions: AVAILABLE_PAGES.map((p) => p.href),
    }));
  };

  const clearAllPages = () => {
    setForm((prev) => ({ ...prev, permissions: [] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      name: form.name,
      email: form.email,
      password: form.password || undefined,
      role: form.role,
      permissions: form.useCustomPermissions ? form.permissions : [],
    };

    const url = editing ? `/api/users/${editing.id}` : "/api/users";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save user");
      setSaving(false);
      return;
    }

    setShowModal(false);
    fetchUsers();
    setSaving(false);

    // If editing the logged-in user, refresh permissions
    if (editing && editing.id === user?.id) {
      checkSession();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) alert(data.error || "Failed to delete user");
    fetchUsers();
  };

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserCog size={26} className="text-indigo-600 dark:text-indigo-400" />
            {t("users.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {t("users.subtitle")}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} /> {t("users.addUser")}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin text-indigo-500" size={28} />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <UserCog size={36} className="opacity-40" />
            <p>{t("common.noData")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("users.name")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("users.email")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("users.role")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("users.permissionsMode")}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("common.date")}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => {
                  const hasCustom = Boolean(u.permissions && u.permissions.length > 0);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs">
                          {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                          <div>{u.name}</div>
                          {u.id === user.id && (
                            <span className="text-[10px] text-indigo-500 font-medium">(You)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            u.role === "ADMIN"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                              : u.role === "MANAGER"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {hasCustom ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                            <Sliders size={12} />
                            Individual ({u.permissions?.length} pages)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            <ShieldCheck size={12} />
                            Role Default
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            title="Edit User & Permissions"
                          >
                            <Pencil size={15} />
                          </button>
                          {u.id !== user?.id && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition-colors"
                              title="Delete User"
                            >
                              <Trash2 size={15} />
                            </button>
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
      </div>

      {/* Add / Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <UserCog size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100">
                    {editing ? t("users.editUser") : t("users.addUser")}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {editing ? `${t("users.editUser")}: ${editing.name}` : t("users.subtitle")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1">
              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* User Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("users.name")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="e.g. Chan Sokha"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("users.email")} *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="user@pos.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("users.password")} {editing ? `(${t("users.leaveBlankPassword")})` : "*"}
                  </label>
                  <input
                    type="password"
                    required={!editing}
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder={editing ? "••••••••" : "Minimum 6 characters"}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("users.role")} *
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                  >
                    <option value="CASHIER">Cashier</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              {/* Permissions Setting Section */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Shield size={16} className="text-indigo-600 dark:text-indigo-400" />
                      Page Access Strategy
                    </h3>
                    <p className="text-xs text-slate-500">
                      Choose whether this user follows the Role default or has individual custom permissions.
                    </p>
                  </div>
                </div>

                {/* Strategy Radio Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => setForm((p) => ({ ...p, useCustomPermissions: false }))}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      !form.useCustomPermissions
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-500"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="pt-0.5">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          !form.useCustomPermissions
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-400"
                        }`}
                      >
                        {!form.useCustomPermissions && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {t("users.roleDefault")}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Inherit standard pages configured for the {form.role} role.
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        useCustomPermissions: true,
                        // If empty, prefill with default pages for easy customization
                        permissions: p.permissions.length > 0 ? p.permissions : ["/pos"],
                      }))
                    }
                    className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      form.useCustomPermissions
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-500"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="pt-0.5">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          form.useCustomPermissions
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-400"
                        }`}
                      >
                        {form.useCustomPermissions && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {t("users.individual")}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Tick specific pages for this user independently of their role.
                      </div>
                    </div>
                  </label>
                </div>

                {/* Individual Permissions Checkbox Grid */}
                {form.useCustomPermissions && (
                  <div className="mt-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {t("users.allowedPages")} ({form.permissions.length}):
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selectAllPages}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                        >
                          {t("users.selectAll")}
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          type="button"
                          onClick={clearAllPages}
                          className="text-xs text-slate-500 hover:underline cursor-pointer"
                        >
                          {t("users.clearAll")}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {AVAILABLE_PAGES.map((page) => {
                        const Icon = page.icon;
                        const isChecked = form.permissions.includes(page.href);
                        return (
                          <button
                            key={page.href}
                            type="button"
                            onClick={() => togglePagePermission(page.href)}
                            className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                              isChecked
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            <Icon size={14} className={isChecked ? "text-white" : "text-slate-400"} />
                            <span className="text-xs font-medium truncate">{t(page.translationKey)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer transition-colors shadow-sm"
                >
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {editing ? t("common.save") : t("users.addUser")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
