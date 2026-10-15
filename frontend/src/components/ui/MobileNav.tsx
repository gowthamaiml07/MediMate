"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Pill, Calendar, Sparkles } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Medications", href: "/medications/schedule", icon: Pill },
    { name: "Appointments", href: "/appointments", icon: Calendar },
    { name: "Assistant", href: "/assistant", icon: Sparkles },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 z-40 flex items-center justify-around shadow-lg">
      {navItems.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
              active
                ? "text-blue-600 font-semibold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon
              className={`w-5 h-5 transition-transform ${
                active ? "scale-110 text-blue-600 stroke-[2.4]" : "text-slate-400"
              }`}
            />
            <span className="text-[11px]">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
