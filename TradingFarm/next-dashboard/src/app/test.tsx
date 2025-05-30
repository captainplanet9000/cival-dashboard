"use client";

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      <p className="mb-4">If you can see this, basic page rendering is working.</p>
      <div className="p-4 bg-gray-100 rounded-md">
        <p>This page doesn't use any Web3 providers or complex dependencies.</p>
      </div>
    </div>
  );
}
