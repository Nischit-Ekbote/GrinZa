'use client'
import React from "react";
import { FloatingDock } from "./floating-dock";
import {
  IconHome,
} from "@tabler/icons-react";
import { Bitcoin, CirclePlus, LayoutDashboard, ListTodo } from "lucide-react";

export function FloatingDockBar() {
    const links = [
      {
        title: "Create NFT",
        icon: (
          <CirclePlus className="h-full w-full text-neutral-500 dark:text-neutral-300" />
        ),
        href: "/smile",
      },
    {
      title: "Home",
      icon: (
        <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/",
    },
    {
      title: "Polls",
      icon: (
        <Bitcoin className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/poll",
    },
  ];
  return (
    <div className="flex items-center justify-center w-full fixed bottom-5 left-0 z-50">
      <FloatingDock
        mobileClassName="translate-y-20" // only for demo, remove for production
        items={links}
      />
    </div>
  );
}
