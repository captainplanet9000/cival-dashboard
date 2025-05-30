"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MoreVertical, CheckCircle, PauseCircle } from "lucide-react";

interface FarmDropdownProps {
  isActive: boolean;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
}

// Simple type for event handlers
type EventWithStopPropagation = {
  stopPropagation: () => void;
};

export function FarmDropdown({ isActive, onPause, onResume, onDelete }: FarmDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Use useEffect to close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return; // Only add listener when dropdown is open
    
    const handleClickOutside = (event: MouseEvent) => {
      // Close dropdown if clicked outside
      const element = event.target as Element;
      const dropdownElements = document.querySelectorAll('[data-dropdown-menu]');
      let clickedInsideDropdown = false;
      
      dropdownElements.forEach(dropdown => {
        if (dropdown.contains(element)) {
          clickedInsideDropdown = true;
        }
      });
      
      if (!clickedInsideDropdown) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handler function to prevent event propagation
  const handleClick = (callback?: () => void) => (event: EventWithStopPropagation) => {
    event.stopPropagation();
    if (callback) callback();
    setIsOpen(false);
  };

  return (
    <div className="relative" data-dropdown-menu>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={(e: EventWithStopPropagation) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        data-dropdown-menu
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
      
      {isOpen && (
        <div 
          className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700"
          data-dropdown-menu
        >
          <div className="py-1">
            {isActive ? (
              <button
                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                onClick={handleClick(onPause)}
              >
                <PauseCircle className="h-4 w-4 mr-2" />
                Pause Farm
              </button>
            ) : (
              <button
                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                onClick={handleClick(onResume)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Resume Farm
              </button>
            )}
            <button
              className="flex w-full items-center px-4 py-2 text-sm text-red-700 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
              onClick={handleClick(onDelete)}
            >
              Delete Farm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
