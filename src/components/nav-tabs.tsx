"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Live tracker" },
  { href: "/analytics", label: "Macro analytics" },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <div className="inline-flex rounded-2xl border border-zinc-300 bg-zinc-100 p-1.5 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-xl px-4 py-2 font-semibold transition ${
              isActive
                ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
