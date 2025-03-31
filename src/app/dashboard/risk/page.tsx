'use client';

import React from 'react';
import Link from 'next/link';

export default function RiskManagementPage() {
  const riskTools = [
    {
      title: 'Position Sizing Calculator',
      description: 'Calculate optimal position sizes using fixed percentage or volatility-based methods.',
      icon: '📏',
      link: '/dashboard/risk/position-sizing',
      tags: ['Volatility-Based', 'Risk Management']
    },
    {
      title: 'Risk-to-Reward Calculator',
      description: 'Evaluate trades based on risk-to-reward ratio and probability of success.',
      icon: '⚖️',
      link: '/dashboard/risk/risk-reward',
      tags: ['Profitability', 'Entry/Exit'],
      comingSoon: true
    },
    {
      title: 'Drawdown Analyzer',
      description: 'Analyze and visualize drawdowns to improve strategy robustness.',
      icon: '📉',
      link: '/dashboard/risk/drawdown',
      tags: ['Recovery', 'Performance Analysis'],
      comingSoon: true
    },
    {
      title: 'Correlation Matrix',
      description: 'Visualize correlations between assets to improve portfolio diversification.',
      icon: '🔄',
      link: '/dashboard/risk/correlation',
      tags: ['Diversification', 'Portfolio'],
      comingSoon: true
    },
    {
      title: 'VaR Calculator',
      description: 'Calculate Value at Risk (VaR) for your portfolio or individual positions.',
      icon: '📊',
      link: '/dashboard/risk/var',
      tags: ['Probabilistic Risk', 'Tail Risk'],
      comingSoon: true
    },
    {
      title: 'Risk Limits Manager',
      description: 'Set and monitor risk limits for your trading operations.',
      icon: '🛑',
      link: '/dashboard/risk/limits',
      tags: ['Controls', 'Compliance'],
      comingSoon: true
    }
  ];
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Risk Management</h1>
        <p className="text-gray-600">
          Tools and analytics to help you manage and control trading risk effectively
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {riskTools.map((tool, i) => (
          <div 
            key={i} 
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200"
          >
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div className="text-3xl mb-4">{tool.icon}</div>
                {tool.comingSoon ? (
                  <span className="text-xs font-medium bg-blue-100 text-blue-800 rounded-full px-2 py-1">
                    Coming Soon
                  </span>
                ) : null}
              </div>
              <h2 className="text-xl font-semibold mb-2">{tool.title}</h2>
              <p className="text-gray-600 text-sm mb-4">{tool.description}</p>
              <div className="flex space-x-2 mb-4">
                {tool.tags.map((tag, index) => (
                  <span 
                    key={index} 
                    className="text-xs bg-gray-100 text-gray-800 rounded-full px-2 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {tool.comingSoon ? (
                <button 
                  disabled
                  className="w-full py-2 px-4 bg-gray-200 text-gray-500 rounded-md cursor-not-allowed"
                >
                  Coming Soon
                </button>
              ) : (
                <Link 
                  href={tool.link}
                  className="block w-full text-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Open Tool
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Risk Management Principles</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">Capital Preservation</h3>
            <p className="text-sm text-gray-600">
              The primary goal of risk management is to protect your capital. Even the best trading strategy will fail without proper risk controls.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 mt-2">
              <li>Never risk more than you can afford to lose</li>
              <li>Use stop losses on every trade</li>
              <li>Control position sizes based on account risk</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-2">Consistent Risk Exposure</h3>
            <p className="text-sm text-gray-600">
              Maintain consistent risk across all trades to avoid outsized impacts from individual positions. Volatility-based position sizing helps achieve this goal.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 mt-2">
              <li>Adjust position sizes based on volatility</li>
              <li>Set maximum position limits</li>
              <li>Account for correlations between positions</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-2">Drawdown Management</h3>
            <p className="text-sm text-gray-600">
              Plan for and manage drawdowns before they occur. Set clear rules for reducing risk during losing periods.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 mt-2">
              <li>Set maximum drawdown thresholds</li>
              <li>Reduce position sizes after consecutive losses</li>
              <li>Have recovery plans for different drawdown scenarios</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-2">Diversification</h3>
            <p className="text-sm text-gray-600">
              Spread risk across uncorrelated or negatively correlated assets and strategies to reduce overall portfolio volatility.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 mt-2">
              <li>Trade multiple asset classes</li>
              <li>Use different strategy types</li>
              <li>Monitor and manage correlations</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">Volatility-Based Position Sizing</h2>
        <p className="text-blue-800 mb-6">
          Our platform now includes advanced volatility-based position sizing to help you maintain consistent risk across different market conditions:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded p-4 shadow-sm">
            <h3 className="font-semibold text-lg mb-2">Adaptive Position Sizing</h3>
            <p className="text-sm text-gray-600">
              Automatically adjusts position sizes based on current market volatility, taking larger positions in calm markets and smaller positions in volatile ones.
            </p>
          </div>
          
          <div className="bg-white rounded p-4 shadow-sm">
            <h3 className="font-semibold text-lg mb-2">ATR-Based Stop Losses</h3>
            <p className="text-sm text-gray-600">
              Calculates stop loss distances based on Average True Range (ATR), placing stops at more appropriate levels for current market conditions.
            </p>
          </div>
          
          <div className="bg-white rounded p-4 shadow-sm">
            <h3 className="font-semibold text-lg mb-2">Cross-Market Consistency</h3>
            <p className="text-sm text-gray-600">
              Apply the same risk parameters across different markets while automatically adjusting for each market's unique volatility characteristics.
            </p>
          </div>
        </div>
        
        <div className="mt-6">
          <Link 
            href="/dashboard/risk/position-sizing"
            className="inline-block py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Try Volatility-Based Position Sizing →
          </Link>
        </div>
      </div>
    </div>
  );
} 