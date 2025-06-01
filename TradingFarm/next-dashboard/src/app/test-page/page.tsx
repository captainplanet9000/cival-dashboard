"use client";

import React from 'react';
import { Button } from "@/components/ui/button";

export default function TestPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <h1 className="text-3xl font-bold mb-4">Test Page</h1>
      <p className="mb-4">If you can see this, basic rendering is working!</p>
      <Button>Test Button</Button>
      <p className="mt-4">
        <a href="/dashboard" className="text-primary hover:underline">
          Try going to Dashboard
        </a>
      </p>
    </div>
  );
}
