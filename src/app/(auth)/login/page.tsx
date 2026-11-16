"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { useThemeStore } from "@/store/themeStore";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound, Mail, ShieldAlert, Sun, Moon, Coffee } from "lucide-react";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, user, loading, error } = useAuthStore();
  const { t } = useLanguageStore();
  const { theme, toggleTheme } = useThemeStore();
  const router = useRouter();

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      if (user.role === "CASHIER") {
        router.replace("/pos");
      } else {
        router.replace("/");
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    const success = await login(email, password);
    if (success) {
      // Re-trigger auth store redirect logic
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.role === "CASHIER") {
        router.replace("/pos");
      } else {
        router.replace("/");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100/80 dark:bg-slate-950 px-4 py-12 relative overflow-hidden transition-colors">
      {/* Background ambient gradient blurs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 sm:p-10 rounded-2xl shadow-xl shadow-slate-200/60 dark:shadow-2xl dark:shadow-black/60 relative z-10 transition-all">
        {/* Top Controls: Branding / Theme toggle + Language switcher */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Coffee size={18} />
            </div>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">coffee system</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <LanguageSwitcher className="w-32" />
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="text-center pt-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t("login.title")}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {t("login.subtitle")}
          </p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-sm">
              <ShieldAlert className="shrink-0 text-rose-500 dark:text-rose-400" size={18} />
              <span>{t("login.failed")}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {t("login.email")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/80 text-slate-900 dark:text-white rounded-xl placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm"
                  placeholder="admin@pos.com"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {t("login.password")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <KeyRound size={18} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/80 text-slate-900 dark:text-white rounded-xl placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  <span>{t("login.loggingIn")}</span>
                </div>
              ) : (
                t("login.submit")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
