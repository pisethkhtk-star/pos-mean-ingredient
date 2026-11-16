"use client";

import React from "react";
import { useLanguageStore } from "@/store/languageStore";

interface LanguageSwitcherProps {
  collapsed?: boolean;
  className?: string;
}

export default function LanguageSwitcher({ collapsed = false, className = "" }: LanguageSwitcherProps) {
  const { language, setLanguage, toggleLanguage } = useLanguageStore();

  if (collapsed) {
    return (
      <button
        onClick={toggleLanguage}
        title={language === "km" ? "Switch to English" : "ប្តូរទៅ ភាសាខ្មែរ"}
        className={`w-full flex items-center justify-center p-2 rounded-lg text-xs font-bold transition-all border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${
          language === "km"
            ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
            : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
        } ${className}`}
      >
        <span className="font-bold text-xs select-none">{language === "km" ? "KH" : "EN"}</span>
      </button>
    );
  }

  return (
    <div className={`flex items-center justify-between p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-800 ${className}`}>
      <button
        type="button"
        onClick={() => setLanguage("km")}
        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          language === "km"
            ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
      >
        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
          KH
        </span>
        <span>ខ្មែរ</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          language === "en"
            ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
      >
        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
          EN
        </span>
        <span>English</span>
      </button>
    </div>
  );
}
