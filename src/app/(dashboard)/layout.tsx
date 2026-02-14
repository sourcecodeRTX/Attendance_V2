"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav, MobileBottomNav } from "@/components/layout/mobile-nav";
import { useUIStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils/cn";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - hidden on mobile */}
      <Sidebar />
      
      {/* Mobile navigation drawer */}
      <MobileNav />

      {/* Main content area */}
      <div
        className={cn(
          "transition-all duration-200",
          "md:pl-[260px]",
          sidebarCollapsed && "md:pl-[72px]"
        )}
      >
        {/* Header */}
        <Header />

        {/* Main content */}
        <main className="min-h-[calc(100vh-64px)] pb-16 md:pb-0">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  );
}
