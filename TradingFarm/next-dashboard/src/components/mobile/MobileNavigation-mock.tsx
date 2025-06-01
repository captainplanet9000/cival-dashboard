"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

/**
 * Mock MobileNavigation component for build purposes
 * This is a simplified version to fix build errors
 */
export const MobileNavigation = ({ userRole = 'user' }: { userRole?: string }) => {
  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t md:hidden">
      <div className="flex items-center justify-between h-full px-4">
        <Button variant="ghost" size="icon" aria-label="Open Navigation Menu">
          <Menu className="h-6 w-6" />
        </Button>
        <span className="text-sm font-medium">Mobile Navigation (Mock)</span>
      </div>
    </div>
  );
};

// Add default export to fix import errors
export default MobileNavigation;
