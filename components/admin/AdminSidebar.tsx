"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  IconLayoutDashboard,
  IconUsers,
  IconChartBar,
  IconSettings,
  IconLogout,
  IconMenu2,
  IconX,
  IconShield,
  IconMessageCircle,
  IconFlask,
} from "@tabler/icons-react";

interface SidebarLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links: SidebarLink[] = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: <IconLayoutDashboard className="h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Users",
      href: "/admin/users",
      icon: <IconUsers className="h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Messages",
      href: "/admin/messages",
      icon: <IconMessageCircle className="h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Moderation",
      href: "/admin/moderation",
      icon: <IconShield className="h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Analytics",
      href: "/admin/analytics",
      icon: <IconChartBar className="h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Beta Intelligence",
      href: "/admin/beta",
      icon: <IconFlask className="h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Settings",
      href: "/admin/settings",
      icon: <IconSettings className="h-5 w-5 flex-shrink-0" />,
    },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.div
        className={cn(
          "sticky top-0 hidden h-screen w-[240px] flex-shrink-0 flex-col border-r border-neutral-200 bg-[#f7f6f3] px-4 py-6 text-neutral-950 transition-colors duration-300 md:flex dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
        )}
        animate={{
          width: open ? "240px" : "80px",
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {/* Logo */}
        <div className="mb-8 px-2">
          <motion.div
            className="flex items-center gap-2"
            animate={{
              justifyContent: open ? "flex-start" : "center",
            }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffbb00] text-sm font-bold text-black shadow-[0_8px_24px_rgba(255,187,0,0.2)]">
              B
            </div>
            <motion.span
              animate={{
                opacity: open ? 1 : 0,
                display: open ? "inline-block" : "none",
              }}
              className="whitespace-nowrap text-lg font-bold text-neutral-950 dark:text-white"
            >
              BLTZ Admin
            </motion.span>
          </motion.div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1">
          {links.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-neutral-500 transition-all duration-200 hover:translate-x-0.5 hover:bg-neutral-200/70 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white",
                pathname === link.href && "bg-neutral-950 text-white shadow-sm hover:bg-neutral-950 hover:text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-white dark:hover:text-neutral-950",
              )}
            >
              {link.icon}
              <motion.span
                animate={{
                  opacity: open ? 1 : 0,
                  display: open ? "inline-block" : "none",
                }}
                className="text-sm font-medium whitespace-nowrap"
              >
                {link.label}
              </motion.span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <button
          className={cn(
            "mt-auto flex items-center gap-3 rounded-xl px-3 py-3 text-neutral-500 transition-all duration-200 hover:bg-red-50 hover:text-red-700 dark:text-neutral-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
          )}
        >
          <IconLogout className="h-5 w-5 flex-shrink-0" />
          <motion.span
            animate={{
              opacity: open ? 1 : 0,
              display: open ? "inline-block" : "none",
            }}
            className="text-sm font-medium whitespace-nowrap"
          >
            Logout
          </motion.span>
        </button>
      </motion.div>

      {/* Mobile Sidebar */}
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-neutral-200 bg-[#f7f6f3]/95 px-4 py-3 backdrop-blur-xl md:hidden dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffbb00] text-sm font-bold text-black">
            B
          </div>
          <span className="text-lg font-bold text-neutral-950 dark:text-white">BLTZ Admin</span>
        </div>
        <button onClick={() => setOpen(!open)} className="rounded-lg p-1 text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:text-white">
          {open ? <IconX className="h-6 w-6" /> : <IconMenu2 className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          className="fixed inset-0 z-40 bg-[#f7f6f3] pt-16 md:hidden dark:bg-neutral-950"
        >
          <nav className="flex flex-col p-4 space-y-1">
            {links.map((link, idx) => (
              <Link
                key={idx}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={pathname === link.href ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-neutral-600 transition-all hover:bg-neutral-200 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white",
                  pathname === link.href && "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950",
                )}
              >
                {link.icon}
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            ))}
            <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800/50 transition-all mt-8">
              <IconLogout className="h-5 w-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </nav>
        </motion.div>
      )}
    </>
  );
}

