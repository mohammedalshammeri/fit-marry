"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { LayoutDashboard, Users, Image as ImageIcon, AlertTriangle, FileClock, Settings, LogOut, Shield, CreditCard, Bell, CheckCircle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { href: "/", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/users", label: "المستخدمين", icon: Users },
  { href: "/packages", label: "الباقات والأسعار", icon: CreditCard },
  { href: "/notifications", label: "الإشعارات والعروض", icon: Bell },
  { href: "/verification", label: "توثيق الحسابات", icon: CheckCircle },
  { href: "/success-stories", label: "قصص النجاح", icon: Heart },
  { href: "/banners", label: "الإعلانات", icon: ImageIcon },
  { href: "/complaints", label: "الشكاوى والبلاغات", icon: AlertTriangle },
  { href: "/audit-logs", label: "سجلات النظام", icon: FileClock },
  { href: "/admins", label: "فريق العمل", icon: Shield },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = Cookies.get("admin_token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  if (!mounted) return null;

  const handleLogout = () => {
    Cookies.remove("admin_token");
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white hidden md:block shrink-0 relative">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Fit Marry</h1>
          <p className="text-sm text-slate-400">لوحة التحكم</p>
        </div>
        <nav className="space-y-1 px-3">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive ? "bg-primary text-white" : "hover:bg-slate-800 text-slate-300"
                )}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 absolute bottom-0 w-full">
           <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-slate-800" onClick={handleLogout}>
             <LogOut className="ml-2 h-4 w-4" />
             تسجيل خروج
           </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-white flex items-center px-6 justify-between md:justify-end">
              <span className="font-semibold text-sm">مرحباً، المشرف</span>
          </header>
          <main className="p-6 flex-1 bg-gray-50/50 overflow-auto">
              {children}
          </main>
      </div>
    </div>
  );
}
