"use client";
import React from "react";
const { useState, useRef, useEffect, useCallback, memo, Suspense } = React;
import Link from "next/link";
import { useNavigation, UserRole } from '@/utils/useNavigation';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Menu, LogOut, Smartphone, Globe, ChevronRight } from 'lucide-react';


// Utility: Detect reduced motion preference
function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: any) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return prefersReducedMotion;
}

// Helpers for localStorage
function getLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const val = window.localStorage.getItem(key);
    if (val) return JSON.parse(val) as T;
  } catch {}
  return fallback;
}
function setLocal<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// --- Navigation Analytics Hook ---
/**
 * useNavigationAnalytics
 * Fires analytics events for navigation usage.
 * Replace window.dispatchEvent with your analytics integration (e.g. PostHog, Plausible, custom)
 */
function useNavigationAnalytics() {
  return useCallback((event: string, payload?: any) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tf-nav-analytics', { detail: { event, payload } }));
    }
  }, []);
}

const MobileNavigation = memo(function MobileNavigationComponent({ userRole = 'user' }: { userRole?: UserRole }) {
  const [open, setOpen] = useState(false);
  const { groups, secondary, isActive } = useNavigation(userRole);
  const logNavEvent = useNavigationAnalytics();
  const navListRef = useRef<HTMLDivElement>(null);
  const scrollPos = useRef<number>(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  // --- Phase 4: Favorites, Recents, Quick-Access ---
  const [favorites, setFavorites] = useState<string[]>(() => getLocal('tf_nav_favorites', []));
  const [recents, setRecents] = useState<string[]>(() => getLocal('tf_nav_recents', []));
  const [quickOpen, setQuickOpen] = useState(false);

  // Add to recents on navigation
  useEffect(() => {
    if (!open) return;
    const active = groups.flatMap((g: any) => g.items).find((item: any) => isActive(item.href));
    if (active && !recents.includes(active.href)) {
      const updated = [active.href, ...recents.filter((h: string) => h !== active.href)].slice(0, 5);
      setRecents(updated);
      setLocal('tf_nav_recents', updated);
    }
  }, [open]);

  // Star/unstar favorite
  const toggleFavorite = (href: string): void => {
    let updated;
    if (favorites.includes(href)) {
      updated = favorites.filter((f: string) => f !== href);
    } else {
      updated = [href, ...favorites];
    }
    setFavorites(updated);
    setLocal('tf_nav_favorites', updated);
  }

  // --- Deep link/query param support ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const navHref = url.searchParams.get('nav');
    if (navHref) {
      setOpen(true);
      url.searchParams.delete('nav');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // --- Back to where you were ---
  // Disabled to prevent infinite reload loop
  // useEffect(() => {
  //   if (!open && typeof window !== 'undefined') {
  //     const last = recents[0];
  //     if (last && window.location.pathname !== last) {
  //       window.location.href = last;
  //     }
  //   }
  //   // eslint-disable-next-line
  // }, [open]);

  // --- Pull-to-refresh logic ---
  useEffect(() => {
    const navList = navListRef.current;
    if (!navList) return;
    let startY = 0;
    let pulling = false;
    let triggered = false;
    const onTouchStart = (e: any) => {
      if (navList.scrollTop === 0) {
        pulling = true;
        startY = e.touches[0].clientY;
        triggered = false;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!pulling) return;
      const y = e.touches[0].clientY - startY;
      if (y > 60 && !triggered) {
        triggered = true;
        // Simulate refresh (could call a prop or reload data)
        navList.style.transition = 'transform 0.2s';
        navList.style.transform = 'translateY(40px)';
        setTimeout(() => {
          navList.style.transform = 'translateY(0)';
        }, 200);
      }
    };
    const onTouchEnd = () => {
      pulling = false;
      triggered = false;
      navList.style.transform = 'translateY(0)';
    };
    navList.addEventListener('touchstart', onTouchStart as EventListener);
    navList.addEventListener('touchmove', onTouchMove as EventListener);
    navList.addEventListener('touchend', onTouchEnd as EventListener);
    return () => {
      navList.removeEventListener('touchstart', onTouchStart as EventListener);
      navList.removeEventListener('touchmove', onTouchMove as EventListener);
      navList.removeEventListener('touchend', onTouchEnd as EventListener);
    };
  }, [open]);

  // --- Swipe gesture to close drawer ---
  useEffect(() => {
    if (!open) return;
    const sheet = document.querySelector('[data-mobile-nav-sheet]');
    if (!sheet) return;
    let startX = 0;
    let dragging = false;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      dragging = true;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging) return;
      const delta = e.touches[0].clientX - startX;
      if (delta < -70) {
        setOpen(false);
        dragging = false;
      }
    };
    const onTouchEnd = () => { dragging = false; };
    sheet.addEventListener('touchstart', onTouchStart as EventListener);
    sheet.addEventListener('touchmove', onTouchMove as EventListener);
    sheet.addEventListener('touchend', onTouchEnd as EventListener);
    return () => {
      sheet.removeEventListener('touchstart', onTouchStart as EventListener);
      sheet.removeEventListener('touchmove', onTouchMove as EventListener);
      sheet.removeEventListener('touchend', onTouchEnd as EventListener);
    };
  }, [open]);

  // --- Persist and restore scroll position ---
  useEffect(() => {
    if (open && navListRef.current) {
      navListRef.current.scrollTop = scrollPos.current;
    }
  }, [open]);
  useEffect(() => {
    const navList = navListRef.current;
    if (!navList) return;
    const onScroll = () => { scrollPos.current = navList.scrollTop; };
    navList.addEventListener('scroll', onScroll as EventListener);
    return () => navList.removeEventListener('scroll', onScroll as EventListener);
  }, []);

  // --- Keyboard shortcut: Alt+M to open/close ---
  useEffect(() => {
    const handler = (e: any) => {
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        setOpen((o: boolean) => !o);
      }
    };
    window.addEventListener('keydown', handler as EventListener);
    return () => window.removeEventListener('keydown', handler as EventListener);
  }, []);

  // --- ARIA live region for nav updates ---
  const [ariaMsg, setAriaMsg] = useState('');
  useEffect(() => {
    setAriaMsg(open ? 'Mobile navigation opened' : 'Mobile navigation closed');
  }, [open]);

  const handleClose = () => setOpen(false);

  return (
    <>
      <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t md:hidden" aria-live="polite" aria-atomic="true">
        <div className="grid h-full grid-cols-5">
          {groups.flatMap((g: typeof groups[number], i: number) => g.items.map((item: typeof g.items[number], index: number) => (
            <div className="relative flex flex-col items-center" key={item.name}>
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`inline-flex flex-col items-center justify-center px-1 transition-colors ${prefersReducedMotion ? '' : 'duration-100'} focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/70 ${
                  isActive(item.href) ? 'text-primary' : 'text-muted-foreground'
                }`}
                onClick={handleClose}
              >
                {/* Lazy-load Lucide icon for bundle size reduction */}
                <React.Suspense fallback={<span className="w-6 h-6 bg-muted animate-pulse rounded" />}> 
                  <item.icon className="w-6 h-6" aria-hidden="true" />
                </React.Suspense>
                <span className="text-xs mt-1 truncate">{item.name}</span>
                {item.badge && (
                  <Badge className="absolute top-2 right-6 h-5 w-auto px-1 text-[10px] animate-pulse">
                    {item.badge}
                  </Badge>
                )}
              </Link>
              <button
                className={`absolute top-0 right-0 p-1 text-xs ${favorites.includes(item.href) ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-500`}
                aria-label={favorites.includes(item.href) ? 'Unstar favorite' : 'Star as favorite'}
                onClick={() => { logNavEvent('nav:favorite', { href: item.href, name: item.name, favorite: !favorites.includes(item.href) }); toggleFavorite(item.href); } }
                tabIndex={0}
                style={{background:'none',border:'none'}}
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.564-.955L10 0l2.948 5.955 6.564.955-4.756 4.635 1.122 6.545z"/></svg>
              </button>
            </div>
          )))}
          {/* Quick-access panel trigger */}
          <button
            className="flex flex-col items-center justify-center px-1 text-primary focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/70"
            aria-label="Open quick access panel"
            onClick={() => { logNavEvent('nav:quickpanel:open'); setQuickOpen(true); }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span className="text-xs mt-1">Quick</span>
          </button>
        </div>
        <span className="sr-only" aria-live="polite">{ariaMsg}</span>
        {/* Quick-access panel */}
        {quickOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={() => { logNavEvent('nav:quickpanel:close'); setQuickOpen(false); }}>
            <div className="bg-background rounded-t-lg w-full max-w-sm mx-auto p-4" onClick={e => e.stopPropagation()}>
              <div className="font-bold mb-2">Quick Access</div>
              <div className="mb-4">
                <div className="text-xs uppercase text-muted-foreground mb-1">Favorites</div>
                {favorites.length === 0 && <div className="text-xs text-muted-foreground">No favorites yet.</div>}
                {favorites.map(href => {
                  const item = groups.flatMap((g: typeof groups[number]) => g.items).find((i: any) => i.href === href);
                  return item ? (
                    <Link key={href} href={href} className="block px-2 py-1 rounded hover:bg-muted/50" onClick={handleClose}>{item.name}</Link>
                  ) : null;
                })}
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">Recent</div>
                {recents.length === 0 && <div className="text-xs text-muted-foreground">No recent items.</div>}
                {recents.map(href => {
                  const item = groups.flatMap((g: typeof groups[number]) => g.items).find((i: any) => i.href === href);
                  return item ? (
                    <Link key={href} href={href} className="block px-2 py-1 rounded hover:bg-muted/50" onClick={handleClose}>{item.name}</Link>
                  ) : null;
                })}
              </div>
              <button className="mt-4 w-full py-2 rounded bg-primary text-primary-foreground font-semibold" onClick={() => { logNavEvent('nav:quickpanel:close'); setQuickOpen(false); }}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        {/* ARIA live region for screen readers */}
        <span className="sr-only" aria-live="polite">{ariaMsg}</span>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open Navigation Menu"
            className="fixed top-4 left-4 z-50 md:hidden"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 max-w-[280px]">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center">
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
          <div className="py-2" ref={navListRef} tabIndex={0} aria-label="Mobile Navigation List">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
              Navigation
            </div>
            {groups.map((group: typeof groups[number]) => (
              <div key={group.group}>
                {group.label && (
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                    {group.label}
                  </div>
                )}
                {group.items.map((item: typeof group.items[number]) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={`flex items-center px-3 py-2 text-sm transition-colors ${prefersReducedMotion ? '' : 'duration-100'} focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/70 ${
                      isActive(item.href)
                        ? 'bg-muted/50 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                    onClick={(e: React.MouseEvent) => { logNavEvent('nav:click', { href: item.href, name: item.name }); handleClose(); }}
                  >
                    <React.Suspense fallback={<span className="mr-3 h-5 w-5 bg-muted animate-pulse rounded" />}>
                      <item.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                    </React.Suspense>
                    {item.name}
                    {item.badge && (
                      <Badge className="ml-auto" variant="outline">
                        {item.badge}
                      </Badge>
                    )}
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Link>
                ))}
              </div>
            ))}
            <div className="px-3 py-2 mt-2 text-xs font-semibold text-muted-foreground">
              Mobile Features
            </div>
            {secondary.map((item: typeof secondary[number]) => (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`flex items-center px-3 py-2 text-sm focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/70 ${
                  isActive(item.href)
                    ? 'bg-muted/50 text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
                onClick={handleClose}
              >
                <item.icon className="mr-3 h-5 w-5" aria-hidden="true" />
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
              className="flex items-center px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/70"
              onClick={handleClose}
            >
              <Smartphone className="mr-3 h-5 w-5" />
              Device Management
              <ChevronRight className="ml-auto h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/pwa-install"
              className="flex items-center px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/70"
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

export { MobileNavigation }; // Export the memoized navigation component