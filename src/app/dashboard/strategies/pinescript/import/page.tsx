'use client';

import React, { useState } from 'react';
import { CodeEditor } from '../../../../../components/CodeEditor';
import { useFarms } from '../../../../../hooks/useFarms';
import { Metadata } from 'next';

// Sample PineScript template
const TEMPLATE_PINESCRIPT = `//@version=5
strategy("My Simple Strategy", overlay=true)

// Input parameters
fastLength = input(9, "Fast Length")
slowLength = input(21, "Slow Length")
rsiLength = input(14, "RSI Length")
rsiOversold = input(30, "RSI Oversold")
rsiOverbought = input(70, "RSI Overbought")

// Calculate indicators
fastMA = ta.sma(close, fastLength)
slowMA = ta.sma(close, slowLength)
rsi = ta.rsi(close, rsiLength)

// Define entry conditions
longCondition = ta.crossover(fastMA, slowMA) and rsi < rsiOversold
shortCondition = ta.crossunder(fastMA, slowMA) and rsi > rsiOverbought

// Execute strategy
if (longCondition)
    strategy.entry("Long", strategy.long)

if (shortCondition)
    strategy.entry("Short", strategy.short)
`;

export default function PineScriptImportPage() {
  const [script, setScript] = useState<string>(TEMPLATE_PINESCRIPT);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { farms, loading: farmsLoading } = useFarms();
  
  const handleImport = async () => {
    // Reset status
    setError(null);
    setSuccess(null);
    
    // Validate inputs
    if (!name.trim()) {
      setError('Strategy name is required');
      return;
    }
    
    if (!script.trim()) {
      setError('PineScript code is required');
      return;
    }
    
    // Start import
    setLoading(true);
    
    try {
      const response = await fetch('/api/strategies/pinescript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: script, 
          name, 
          description,
          farmId: selectedFarmId || undefined 
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to import strategy');
      }
      
      // Success
      setSuccess(`Strategy imported successfully! ID: ${data.strategyId}`);
      
      // Reset form if successful
      setName('');
      setDescription('');
      
      // Don't reset the script to keep the current code
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Import PineScript Strategy</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Strategy Name *
          </label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter strategy name"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Description
          </label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter strategy description"
            rows={3}
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Associate with Farm (Optional)
          </label>
          <select
            value={selectedFarmId}
            onChange={(e) => setSelectedFarmId(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="">-- Select a Farm --</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
          {farmsLoading && <p className="text-sm text-gray-500 mt-1">Loading farms...</p>}
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            PineScript Code *
          </label>
          <div className="border rounded">
            <CodeEditor
              value={script}
              onChange={setScript}
              language="pine"
              height="500px"
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Enter your TradingView PineScript code (version 4 or 5)
          </p>
        </div>
        
        <div className="flex items-center justify-end">
          <button
            onClick={handleImport}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {loading ? 'Importing...' : 'Import Strategy'}
          </button>
        </div>
      </div>
    </div>
  );
} 