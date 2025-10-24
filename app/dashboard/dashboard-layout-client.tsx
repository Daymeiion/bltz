"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/aceternity-sidebar";
import {
  IconBrandTabler,
  IconSettings,
  IconUserBolt,
  IconHome,
  IconVideo,
} from "@tabler/icons-react";
import Link from "next/link";
import { motion } from "motion/react";
import Image from "next/image";
import { UserProfile } from "@/lib/rbac";

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  profile: UserProfile;
  playerId: string | null;
  playerSlug: string | null;
}

export default function DashboardLayoutClient({ 
  children, 
  profile,
  playerId,
  playerSlug 
}: DashboardLayoutClientProps) {
  const [open, setOpen] = useState(false);

  const links = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: (
        <IconBrandTabler className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    ...(profile.role === 'admin' ? [{
      label: "Admin Panel",
      href: "/admin",
      icon: (
        <IconSettings className="text-bltz-gold h-5 w-5 flex-shrink-0" />
      ),
    }] : []),
    {
      label: "My Locker",
      href: playerSlug ? `/player/${playerSlug}` : `/player/${playerId || 'setup'}`,
      icon: (
        <IconUserBolt className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "My Videos",
      href: "/dashboard/videos",
      icon: (
        <IconVideo className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Settings",
      href: "/dashboard/settings",
      icon: (
        <IconSettings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Back to Home",
      href: "/",
      icon: (
        <IconHome className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
  ];

  return (
    <div
      className={cn(
        "rounded-md flex flex-col md:flex-row bg-gradient-to-br from-[hsl(var(--bltz-navy))] via-[#000000] to-[#000000] w-full flex-1 mx-auto border border-white/10 overflow-hidden",
        "h-screen"
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-0">
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex flex-col gap-1">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="mt-0">
            <SidebarLink
              link={{
                label: profile.full_name || profile.email || "User",
                href: "/dashboard",
                icon: (
                  <Image
                    src={profile.avatar_url || "/images/Headshot.png"}
                    className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
                    width={50}
                    height={50}
                    alt="Avatar"
                  />
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

export const Logo = () => {
  return (
    <Link
      href="/dashboard"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-black dark:text-white whitespace-pre"
      >
        Player Dashboard
      </motion.span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      href="/dashboard"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </Link>
  );
};

