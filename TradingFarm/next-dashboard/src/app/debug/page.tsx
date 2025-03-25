"use client";

import React from 'react';

export default function DebugPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
      <p className="mb-4">If you can see this page, the basic Next.js rendering is working.</p>
      
      <div className="grid gap-4">
        <section className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Basic Components</h2>
          <p>Testing if basic UI components render correctly.</p>
          <div className="mt-4">
            <button 
              className="px-4 py-2 bg-primary text-primary-foreground rounded"
              onClick={() => alert('Button works!')}
            >
              Test Button
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
