"use client"

import { useState, useEffect } from 'react'
import { Bot, X } from 'lucide-react'

// A simple component that just toggles visibility of the quick commands panel
export function QuickCommandsToggle() {
  const toggleQuickCommands = () => {
    // Get the quick commands panel element
    const panel = document.querySelector('[data-quick-commands-panel]')
    
    // If we found it, toggle its visibility
    if (panel) {
      console.log("Toggling panel visibility")
      if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden')
      } else {
        panel.classList.add('hidden')
      }
    } else {
      console.error("Could not find quick commands panel")
    }
  }
  
  // Actual close handler just adds the hidden class
  const closePanel = () => {
    console.log("Closing panel")
    const panel = document.querySelector('[data-quick-commands-panel]')
    if (panel) {
      panel.classList.add('hidden')
    }
  }
  
  return (
    <button
      onClick={closePanel}
      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors z-10"
      aria-label="Close quick commands"
      style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <X size={14} />
    </button>
  )
}
