"use client";

import Sidebar from "@/components/shared/Sidebar";
import { useAuthStore } from "@/store/authStore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    } else if (!loading && user && user.permissions && user.permissions.length > 0) {
      // Check if user has permission to visit current route
      if (pathname && !user.permissions.includes(pathname)) {
        const fallback = user.permissions.includes("/pos")
          ? "/pos"
          : user.permissions[0] || "/login";
        router.replace(fallback);
      }
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-indigo-600 mx-auto" size={48} />
          <p className="text-sm font-medium text-slate-500">Loading your POS workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Panel */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
