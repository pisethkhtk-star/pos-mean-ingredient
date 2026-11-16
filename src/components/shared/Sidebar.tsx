"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useLanguageStore } from "@/store/languageStore";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";
import {
  LayoutDashboard,
  Calculator,
  ShoppingBag,
  Warehouse,
  PackageCheck,
  ClipboardList,
  Users,
  Truck,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Tags,
  UserCog,
  Ticket,
  Shield,
  Boxes,
  PackagePlus,
} from "lucide-react";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { settings, fetchSettings } = useSettingsStore();
  const { t } = useLanguageStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (!user) return null;

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const menuItems = [
    {
      name: "Dashboard",
      translationKey: "nav.dashboard",
      href: "/",
      icon: LayoutDashboard,
      roles: ["ADMIN", "MANAGER"],
    },
    {
      name: "POS Terminal",
      translationKey: "nav.pos",
      href: "/pos",
      icon: Calculator,
      roles: ["ADMIN", "MANAGER", "CASHIER"],
    },
    {
      name: "Products",
      translationKey: "nav.products",
      href: "/products",
      icon: ShoppingBag,
      roles: ["ADMIN", "MANAGER"],
    },
    {
      name: "Ingredients",
      translationKey: "nav.ingredients",
      href: "/ingredients",
      icon: Boxes,
      roles: ["ADMIN", "MANAGER"],
    },
    {
      name: "Categories",
      translationKey: "nav.categories",
      href: "/categories",
      icon: Tags,
      roles: ["ADMIN", "MANAGER"],
    },
    {
      name: "Discounts",
      translationKey: "nav.discounts",
      href: "/discounts",
      icon: Ticket,
      roles: ["ADMIN", "MANAGER"],
    },
    {
      name: "Inventory",
      translationKey: "nav.inventory",
      href: "/inventory",
      icon: Warehouse,
      roles: ["ADMIN", "MANAGER"],
    },
    {
      name: "Purchases",
      translationKey: "nav.purchases",
      href: "/purchases",
      icon: PackageCheck,
      roles: ["ADMIN", "MANAGER"],
    },
    {
      name: "Receive Stock",
      translationKey: "nav.receiveStock",
      href: "/receive-stock",
      icon: PackagePlus,
      roles: ["ADMIN", "MANAGER"],
    },
    {
      name: "Suppliers",
      translationKey: "nav.suppliers",
      href: "/suppliers",
      icon: Truck,
      roles: ["ADMIN", "MANAGER"],
    },
    {
      name: "Customers",
      translationKey: "nav.customers",
      href: "/customers",
      icon: Users,
      roles: ["ADMIN", "MANAGER"],
    },
    {
      name: "Orders",
      translationKey: "nav.orders",
      href: "/orders",
      icon: ClipboardList,
      roles: ["ADMIN", "MANAGER"],
    },
    {
      name: "Reports",
      translationKey: "nav.reports",
      href: "/reports",
      icon: BarChart3,
      roles: ["ADMIN"],
    },
    {
      name: "Users",
      translationKey: "nav.users",
      href: "/users",
      icon: UserCog,
      roles: ["ADMIN"],
    },
    {
      name: "Role Permissions",
      translationKey: "nav.roles",
      href: "/roles",
      icon: Shield,
      roles: ["ADMIN"],
    },
    {
      name: "Settings",
      translationKey: "nav.settings",
      href: "/settings",
      icon: SettingsIcon,
      roles: ["ADMIN"],
    },
  ];

  const allowedMenuItems = menuItems.filter((item) =>
    user.permissions
      ? (user.permissions.includes(item.href) || (item.href === "/receive-stock" && user.permissions.includes("/purchases")))
      : item.roles.includes(user.role)
  );

  return (
    <aside
      className={`flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 relative ${isCollapsed ? "w-16" : "w-64"
        }`}
    >
      {/* Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
        {!isCollapsed && (
          <span className="text-lg font-bold bg-indigo-600 bg-clip-text text-transparent select-none">
            {settings?.storeName || process.env.NEXT_PUBLIC_APP_NAME || "POS System"}
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 absolute -right-3 top-5 border border-slate-200 dark:border-slate-700 z-50 cursor-pointer"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
        {allowedMenuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const label = t(item.translationKey);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${isActive
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-850 dark:hover:text-slate-200"
                }`}
              title={isCollapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!isCollapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
        {/* Language Switcher */}
        <LanguageSwitcher collapsed={isCollapsed} />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-850 cursor-pointer"
        >
          {theme === "light" ? (
            <>
              <Moon size={18} />
              {!isCollapsed && <span className="w-full text-left">{t("nav.darkMode")}</span>}
            </>
          ) : (
            <>
              <Sun size={18} />
              {!isCollapsed && <span className="w-full text-left">{t("nav.lightMode")}</span>}
            </>
          )}
        </button>

        {/* User Info */}
        {!isCollapsed && (
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 rounded-lg">
            <p className="text-xs font-semibold truncate">{user.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{user.role}</p>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 cursor-pointer"
          title={isCollapsed ? t("nav.logout") : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {!isCollapsed && <span>{t("nav.logout")}</span>}
        </button>
      </div>
    </aside>
  );
}
