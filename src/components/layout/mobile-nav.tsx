"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X, LayoutDashboard, Users, BookOpen, CheckSquare, Download, RefreshCw, Settings, LogOut, Cloud } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useUIStore } from "@/lib/stores/ui-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { signOut } from "@/lib/firebase/auth";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Users, label: "Students", href: "/students" },
  { icon: BookOpen, label: "Subjects", href: "/subjects" },
  { icon: CheckSquare, label: "Attendance", href: "/attendance" },
  { icon: Download, label: "Export", href: "/export" },
  { icon: RefreshCw, label: "Sync & Data", href: "/sync" },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { mobileNavOpen, setMobileNavOpen } = useUIStore();
  const { reset } = useAuthStore();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut();
      reset();
      setMobileNavOpen(false);
      router.push("/login");
      toast({ title: "Signed out", description: "You have been signed out successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to sign out", variant: "destructive" });
    }
  };

  if (!mobileNavOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/80 md:hidden"
        onClick={() => setMobileNavOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-background border-r border-border md:hidden animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <Link
            href="/"
            className="flex items-center gap-2"
            onClick={() => setMobileNavOpen(false)}
          >
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">ATT Tracker</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileNavOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground-muted"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Bottom section */}
        <div className="border-t border-border p-3 space-y-1">
          <Link
            href="/settings"
            onClick={() => setMobileNavOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              pathname === "/settings"
                ? "bg-accent text-accent-foreground"
                : "text-foreground-muted"
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span>Settings</span>
          </Link>

          <Separator className="my-2" />

          <button
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors w-full hover:bg-destructive/10 hover:text-destructive text-foreground-muted"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}

// Bottom navigation for mobile
export function MobileBottomNav() {
  const pathname = usePathname();

  const bottomNavItems = [
    { icon: LayoutDashboard, label: "Home", href: "/" },
    { icon: Users, label: "Students", href: "/students" },
    { icon: CheckSquare, label: "Mark", href: "/attendance" },
    { icon: Download, label: "Export", href: "/export" },
    { icon: Cloud, label: "Sync", href: "/sync" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around">
        {bottomNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-3 min-w-0 flex-1",
                isActive ? "text-primary" : "text-foreground-muted"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
