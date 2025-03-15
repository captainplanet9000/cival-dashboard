"use client"

import React from "react"
import { Search, Activity, Settings, Terminal, BarChart3 } from "lucide-react"

export function DashboardHeader() {
  return (
    <header className="bg-slate-900 border-b border-slate-800 shadow-sm">
      <div className="container py-3 px-6 flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-2">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="font-bold text-slate-100 text-xl">Trading Farm</div>
            <div className="ml-3 text-xs px-2 py-1 rounded-full bg-blue-900 text-blue-300">
              ElizaOS Integrated
            </div>
          </div>
          
          <nav className="hidden md:flex items-center space-x-1">
            <a href="#" className="px-3 py-2 text-sm font-medium rounded-md text-blue-300 bg-slate-800">Dashboard</a>
            <a href="#" className="px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-slate-100">Strategies</a>
            <a href="#" className="px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-slate-100">Trades</a>
            <a href="#" className="px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-slate-100">Analytics</a>
            <a href="#" className="px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-slate-100">History</a>
          </nav>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative hidden md:block">
            <input 
              type="text" 
              placeholder="Search commands or strategies..." 
              className="py-1.5 pl-3 pr-10 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm w-64 placeholder:text-slate-500"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
          
          <div className="flex items-center px-3 py-1 rounded-full bg-green-900 text-green-300 text-sm font-medium">
            <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
            System Active
          </div>
          
          <div className="text-sm">
            <span className="text-slate-400">Balance:</span>
            <span className="ml-2 text-slate-100 font-medium">$250,042.38</span>
          </div>
          
          <div className="flex space-x-2">
            <button className="p-2 rounded-full hover:bg-slate-800" title="Activity">
              <Activity className="w-5 h-5 text-slate-300" />
            </button>
            
            <button className="p-2 rounded-full hover:bg-slate-800" title="Command Terminal">
              <Terminal className="w-5 h-5 text-slate-300" />
            </button>
            
            <button className="p-2 rounded-full hover:bg-slate-800" title="Settings">
              <Settings className="w-5 h-5 text-slate-300" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
