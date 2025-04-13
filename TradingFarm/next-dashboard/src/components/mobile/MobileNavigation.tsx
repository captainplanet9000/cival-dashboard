"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Home,
  BarChart2,
  Briefcase,
  Users,
  Settings,
  Bell,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Smartphone,
  Zap,
  Globe,
  Clock,
  Database,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      current: pathname === "/dashboard",
    },
    {
      name: "Analytics",
      href: "/dashboard/analytics",
      icon: BarChart2,
      current: pathname === "/dashboard/analytics",
    },
    {
      name: "Trading",
      href: "/dashboard/trading",
      icon: Briefcase,
      current: pathname === "/dashboard/trading",
      badge: "Live",
    },
    {
      name: "Collaboration",
      href: "/dashboard/collaboration",
      icon: Users,
      current: pathname === "/dashboard/collaboration",
      badge: "New",
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      current: pathname === "/dashboard/settings",
    },
  ];

  const secondaryNavigation = [
    {
      name: "Notifications",
      icon: Bell,
      href: "/dashboard/notifications",
      current: pathname === "/dashboard/notifications",
      count: 5,
    },
    {
      name: "Sync Status",
      icon: Database,
      href: "/dashboard/sync",
      current: pathname === "/dashboard/sync",
    },
    {
      name: "Offline Mode",
      icon: Clock,
      href: "/dashboard/offline",
      current: pathname === "/dashboard/offline",
    },
  ];

  const handleClose = () => setOpen(false);

  return (
    <>
      <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t md:hidden">
        <div className="grid h-full grid-cols-5">
          {navigation.map((item, index) => (
            <Link 
              key={item.name} 
              href={item.href}
              className={`inline-flex flex-col items-center justify-center px-1 ${
                item.current ? "text-primary" : "text-muted-foreground"
              }`}
              onClick={handleClose}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs mt-1 truncate">{item.name}</span>
              {item.badge && (
                <Badge className="absolute top-2 right-6 h-5 w-auto px-1 text-[10px]">
                  {item.badge}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-50 md:hidden"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 max-w-[280px]">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center">
              <Zap className="mr-2 h-5 w-5 text-primary" />
              Trading Farm
              <Badge variant="outline" className="ml-2">Mobile</Badge>
            </SheetTitle>
          </SheetHeader>

          <div className="p-4 border-b">
            <div className="flex items-center">
              <Avatar className="h-10 w-10">
                <AvatarImage src="/avatars/user.jpg" alt="Profile" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium">John Doe</p>
                <p className="text-xs text-muted-foreground">Pro Trader</p>
              </div>
            </div>
          </div>

          <div className="py-2">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
              Navigation
            </div>
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm ${
                  item.current
                    ? "bg-muted/50 text-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
                onClick={handleClose}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
                {item.badge && (
                  <Badge className="ml-auto" variant="outline">
                    {item.badge}
                  </Badge>
                )}
                <ChevronRight className="ml-auto h-4 w-4" />
              </Link>
            ))}

            <div className="px-3 py-2 mt-2 text-xs font-semibold text-muted-foreground">
              Mobile Features
            </div>
            {secondaryNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm ${
                  item.current
                    ? "bg-muted/50 text-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
                onClick={handleClose}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
                {item.count && (
                  <Badge className="ml-auto">{item.count}</Badge>
                )}
              </Link>
            ))}
            
            <div className="px-3 py-2 mt-2 text-xs font-semibold text-muted-foreground">
              Cross-Platform
            </div>
            <Link
              href="/dashboard/device-sync"
              className="flex items-center px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50"
              onClick={handleClose}
            >
              <Smartphone className="mr-3 h-5 w-5" />
              Device Management
              <ChevronRight className="ml-auto h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/pwa-install"
              className="flex items-center px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50"
              onClick={handleClose}
            >
              <Globe className="mr-3 h-5 w-5" />
              Install App
              <Badge className="ml-auto" variant="outline">
                PWA
              </Badge>
            </Link>
            
            <div className="mt-6 px-3">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
