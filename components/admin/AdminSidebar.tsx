"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
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
          "h-screen px-4 py-6 hidden md:flex md:flex-col bg-neutral-950 border-r border-neutral-800 w-[240px] flex-shrink-0"
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#000CF5] to-[#000A52] flex items-center justify-center text-white font-bold text-sm">
              B
            </div>
            <motion.span
              animate={{
                opacity: open ? 1 : 0,
                display: open ? "inline-block" : "none",
              }}
              className="text-white font-bold text-lg whitespace-nowrap"
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
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg text-neutral-400 hover:text-white hover:bg-[#000CF5]/10 hover:border-l-2 hover:border-[#000CF5] transition-all duration-200"
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
            "flex items-center gap-3 px-3 py-3 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800/50 transition-all duration-200 mt-auto"
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
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-neutral-950 border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#000CF5] to-[#000A52] flex items-center justify-center text-white font-bold text-sm">
            B
          </div>
          <span className="text-white font-bold text-lg">BLTZ Admin</span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-white">
          {open ? <IconX className="h-6 w-6" /> : <IconMenu2 className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          className="md:hidden fixed inset-0 z-40 bg-neutral-950 pt-16"
        >
          <nav className="flex flex-col p-4 space-y-1">
            {links.map((link, idx) => (
              <Link
                key={idx}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition-all"
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

