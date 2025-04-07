import React from 'react';
import { AppProps } from 'next/app';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import '@/styles/globals.css';
import { Farm, LayoutDashboard, GanttChart, BookOpen, Settings, LogOut } from 'lucide-react';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // Determine if we're on a dashboard page
  const isDashboardPage = 
    router.pathname === '/dashboard' || 
    router.pathname.startsWith('/farms') ||
    router.pathname.startsWith('/settings');
  
  // Only show sidebar on dashboard pages
  if (isDashboardPage) {
    return (
      <>
        <Head>
          <title>Trading Farm Platform</title>
          <meta name="description" content="Manage your trading farms, agents, and vaults" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <Farm className="h-6 w-6" />
                <span className="text-xl font-bold">Trading Farm</span>
              </Link>
            </div>
            
            <nav className="flex-1 p-4 space-y-1">
              <NavItem 
                href="/dashboard" 
                icon={<LayoutDashboard className="h-5 w-5" />} 
                text="Dashboard" 
                active={router.pathname === '/dashboard'} 
              />
              <NavItem 
                href="/farms" 
                icon={<Farm className="h-5 w-5" />} 
                text="Farms" 
                active={router.pathname.startsWith('/farms')} 
              />
              <NavItem 
                href="/goals" 
                icon={<GanttChart className="h-5 w-5" />} 
                text="Goals" 
                active={router.pathname.startsWith('/goals')} 
              />
              <NavItem 
                href="/knowledge" 
                icon={<BookOpen className="h-5 w-5" />} 
                text="Knowledge" 
                active={router.pathname.startsWith('/knowledge')} 
              />
              <NavItem 
                href="/settings" 
                icon={<Settings className="h-5 w-5" />} 
                text="Settings" 
                active={router.pathname.startsWith('/settings')} 
              />
            </nav>
            
            <div className="p-4 border-t mt-auto">
              <button 
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                onClick={() => router.push('/logout')}
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
          
          {/* Main content */}
          <div className="flex-1 bg-gray-50">
            <Component {...pageProps} />
          </div>
        </div>
      </>
    );
  }
  
  // For non-dashboard pages, just render the component
  return (
    <>
      <Head>
        <title>Trading Farm Platform</title>
        <meta name="description" content="Manage your trading farms, agents, and vaults" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  text: string;
  active: boolean;
}

function NavItem({ href, icon, text, active }: NavItemProps) {
  return (
    <Link 
      href={href} 
      className={`flex items-center space-x-2 px-3 py-2 rounded-md ${
        active 
          ? 'bg-blue-50 text-blue-700' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {icon}
      <span>{text}</span>
    </Link>
  );
} 