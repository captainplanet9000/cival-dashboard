'use client';

import React from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function SimplifiedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-background font-sans antialiased`}>
      <div className="flex min-h-screen">
        {/* Simplified Sidebar */}
        <div className="w-64 bg-gray-900 text-white p-4 hidden md:block">
          <div className="text-xl font-bold mb-6">Trading Farm</div>
          <nav className="space-y-2">
            <div className="p-2 rounded hover:bg-gray-800 cursor-pointer">Dashboard</div>
            <div className="p-2 rounded hover:bg-gray-800 cursor-pointer">Strategies</div>
            <div className="p-2 rounded hover:bg-gray-800 cursor-pointer">Trades</div>
            <div className="p-2 rounded hover:bg-gray-800 cursor-pointer">Analytics</div>
            <div className="p-2 rounded hover:bg-gray-800 cursor-pointer">Banking</div>
          </nav>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {/* Top Navbar */}
          <div className="h-16 border-b flex items-center justify-between px-4">
            <div className="md:hidden">
              <button className="p-2">Menu</button>
            </div>
            <div className="flex-1 md:flex justify-center">
              <nav className="hidden md:flex space-x-4">
                <div className="p-2 cursor-pointer">Dashboard</div>
                <div className="p-2 cursor-pointer">Strategies</div>
                <div className="p-2 cursor-pointer">Trades</div>
                <div className="p-2 cursor-pointer">Analytics</div>
                <div className="p-2 cursor-pointer">Banking</div>
              </nav>
            </div>
            <div>
              <button className="p-2">Theme</button>
              <button className="p-2 ml-2">Profile</button>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
