"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
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
  IconAddressBook,
} from "@tabler/icons-react";

interface SidebarLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function isAdminSidebarLinkActive(pathname: string, href: string) {
  return pathname === href || (href === "/admin/gtm" && pathname.startsWith(`${href}/`));
}

export function AdminSidebar() {
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!mobileOpen) return;

    const menu = mobileMenuRef.current;
    const getFocusableElements = () => Array.from(
      menu?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [],
    );

    getFocusableElements()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        mobileToggleRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

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
      label: "GTM",
      href: "/admin/gtm",
      icon: <IconAddressBook className="h-5 w-5 flex-shrink-0" />,
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
          width: desktopOpen ? "240px" : "80px",
        }}
        onMouseEnter={() => setDesktopOpen(true)}
        onMouseLeave={() => setDesktopOpen(false)}
      >
        {/* Logo */}
        <div className="mb-8 px-2">
          <motion.div
            className="flex items-center gap-2"
            animate={{
              justifyContent: desktopOpen ? "flex-start" : "center",
            }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffbb00] text-sm font-bold text-black shadow-[0_8px_24px_rgba(255,187,0,0.2)]">
              B
            </div>
            <motion.span
              animate={{
                opacity: desktopOpen ? 1 : 0,
                display: desktopOpen ? "inline-block" : "none",
              }}
              className="whitespace-nowrap text-lg font-bold text-neutral-950 dark:text-white"
            >
              BLTZ Admin
            </motion.span>
          </motion.div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1">
          {links.map((link) => {
            const isActive = isAdminSidebarLinkActive(pathname, link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={link.label}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-neutral-500 transition-all duration-200 hover:translate-x-0.5 hover:bg-neutral-200/70 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white",
                  isActive && "bg-neutral-950 text-white shadow-sm hover:bg-neutral-950 hover:text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-white dark:hover:text-neutral-950",
                )}
              >
                {link.icon}
                <motion.span
                  animate={{
                    opacity: desktopOpen ? 1 : 0,
                    display: desktopOpen ? "inline-block" : "none",
                  }}
                  className="text-sm font-medium whitespace-nowrap"
                >
                  {link.label}
                </motion.span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <form action="/api/admin/logout" method="post" className="mt-auto">
          <button
            type="submit"
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-neutral-500 transition-all duration-200 hover:bg-red-50 hover:text-red-700 dark:text-neutral-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
            )}
          >
            <IconLogout className="h-5 w-5 flex-shrink-0" />
            <motion.span
              animate={{
                opacity: desktopOpen ? 1 : 0,
                display: desktopOpen ? "inline-block" : "none",
              }}
              className="text-sm font-medium whitespace-nowrap"
            >
              Logout
            </motion.span>
          </button>
        </form>
      </motion.div>

      {/* Mobile Sidebar */}
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-neutral-200 bg-[#f7f6f3]/95 px-4 py-3 backdrop-blur-xl md:hidden dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffbb00] text-sm font-bold text-black">
            B
          </div>
          <span className="text-lg font-bold text-neutral-950 dark:text-white">BLTZ Admin</span>
        </div>
        <button
          ref={mobileToggleRef}
          type="button"
          onClick={() => setMobileOpen((isOpen) => !isOpen)}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
          aria-controls="admin-mobile-navigation"
          aria-haspopup="dialog"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00] dark:text-white"
        >
          {mobileOpen ? <IconX className="h-6 w-6" /> : <IconMenu2 className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div
          ref={mobileMenuRef}
          id="admin-mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation"
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          className="fixed inset-0 z-40 bg-[#f7f6f3] pt-16 md:hidden dark:bg-neutral-950"
        >
          <nav aria-label="Admin navigation links" className="flex flex-col p-4 space-y-1">
            {links.map((link) => {
              const isActive = isAdminSidebarLinkActive(pathname, link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-neutral-600 transition-all hover:bg-neutral-200 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white",
                    isActive && "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950",
                  )}
                >
                  {link.icon}
                  <span className="text-sm font-medium">{link.label}</span>
                </Link>
              );
            })}
            <form action="/api/admin/logout" method="post" className="mt-8">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-neutral-400 transition-all hover:bg-neutral-800/50 hover:text-red-400"
              >
                <IconLogout className="h-5 w-5" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </form>
          </nav>
        </motion.div>
      )}
    </>
  );
}

