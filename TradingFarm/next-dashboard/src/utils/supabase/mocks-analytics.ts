/**
 * Mock Analytics and User Engagement Data
 * Provides simulated data for user activity, feature usage, and system metrics
 */

// Mock user activity tracking
export const mockUserActivity = [
  // Generate 60 days of user activity data
  ...Array.from({ length: 60 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (59 - i));
    
    // Simulate gradually increasing user engagement
    const dayFactor = 1 + (i / 60); // Factor increases from 1 to 2 over the period
    const weekendFactor = [0, 6].includes(date.getDay()) ? 0.7 : 1; // Less activity on weekends
    
    // Base metrics with some randomness
    const baseLogins = Math.floor(Math.random() * 3 + 2) * dayFactor * weekendFactor;
    const baseSessionDuration = Math.floor(Math.random() * 15 + 20) * dayFactor;
    const baseDashboardViews = Math.floor(Math.random() * 5 + 5) * dayFactor * weekendFactor;
    
    return {
      user_id: 'mock-user-1',
      date: date.toISOString().split('T')[0],
      logins: Math.floor(baseLogins),
      session_duration_minutes: Math.floor(baseSessionDuration),
      pages_visited: Math.floor(baseDashboardViews + Math.random() * 8),
      dashboard_views: Math.floor(baseDashboardViews),
      farms_managed: i < 15 ? 1 : 2, // Added second farm after 15 days
      agents_created: i < 10 ? 1 : (i < 30 ? 3 : 5), // Growing agent creation over time
      trades_executed: Math.floor(Math.random() * 20 + 5) * dayFactor * weekendFactor,
      features_used: [
        'dashboard',
        'agents',
        'farms',
        'orders',
        ...(i >= 5 ? ['goals'] : []),
        ...(i >= 12 ? ['eliza_agents'] : []),
        ...(i >= 20 ? ['vault'] : []),
        ...(i >= 35 ? ['analytics'] : []),
        ...(i >= 45 ? ['risk_management'] : [])
      ]
    };
  })
];

// Mock feature usage data
export const mockFeatureUsage = [
  {
    feature_id: 'dashboard',
    name: 'Main Dashboard',
    total_views: 1240,
    unique_users: 15,
    avg_time_spent_minutes: 12.5,
    conversion_rate: 95, // % of users who engage with the feature after viewing
    rating: 4.8
  },
  {
    feature_id: 'farms',
    name: 'Farm Management',
    total_views: 820,
    unique_users: 15,
    avg_time_spent_minutes: 8.3,
    conversion_rate: 92,
    rating: 4.7
  },
  {
    feature_id: 'agents',
    name: 'Standard Agents',
    total_views: 960,
    unique_users: 15,
    avg_time_spent_minutes: 10.8,
    conversion_rate: 88,
    rating: 4.5
  },
  {
    feature_id: 'eliza_agents',
    name: 'ElizaOS Agents',
    total_views: 750,
    unique_users: 12,
    avg_time_spent_minutes: 15.2,
    conversion_rate: 75,
    rating: 4.9
  },
  {
    feature_id: 'goals',
    name: 'Goal Tracking',
    total_views: 480,
    unique_users: 10,
    avg_time_spent_minutes: 7.5,
    conversion_rate: 65,
    rating: 4.3
  },
  {
    feature_id: 'vault',
    name: 'Vault Banking',
    total_views: 350,
    unique_users: 8,
    avg_time_spent_minutes: 9.2,
    conversion_rate: 60,
    rating: 4.6
  },
  {
    feature_id: 'orders',
    name: 'Order Management',
    total_views: 890,
    unique_users: 15,
    avg_time_spent_minutes: 11.0,
    conversion_rate: 90,
    rating: 4.7
  },
  {
    feature_id: 'markets',
    name: 'Market Data',
    total_views: 720,
    unique_users: 14,
    avg_time_spent_minutes: 6.5,
    conversion_rate: 85,
    rating: 4.4
  },
  {
    feature_id: 'analytics',
    name: 'Performance Analytics',
    total_views: 580,
    unique_users: 12,
    avg_time_spent_minutes: 13.5,
    conversion_rate: 80,
    rating: 4.8
  },
  {
    feature_id: 'risk_management',
    name: 'Risk Management',
    total_views: 380,
    unique_users: 9,
    avg_time_spent_minutes: 10.2,
    conversion_rate: 70,
    rating: 4.5
  }
];

// Mock system performance metrics
export const mockSystemMetrics = [
  // Generate 30 days of system performance data
  ...Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    
    // Random fluctuations in system performance
    const baseResponseTime = 120 + (Math.random() * 60 - 30); // 90-150ms
    const baseUptime = 99.9 + (Math.random() * 0.09); // 99.9-99.99%
    const baseErrorRate = 0.05 + (Math.random() * 0.1 - 0.05); // 0-0.1%
    const baseApiCalls = 5000 + (Math.random() * 1000 - 500) + (i * 100); // Growing trend
    
    return {
      date: date.toISOString().split('T')[0],
      avg_response_time_ms: parseFloat(baseResponseTime.toFixed(2)),
      uptime_percentage: parseFloat(baseUptime.toFixed(3)),
      error_rate_percentage: parseFloat(baseErrorRate.toFixed(3)),
      total_api_calls: Math.floor(baseApiCalls),
      peak_concurrent_users: Math.floor(10 + (Math.random() * 5) + (i / 5)),
      memory_usage_mb: Math.floor(350 + (Math.random() * 100) + (i * 2)),
      cpu_usage_percentage: parseFloat((15 + (Math.random() * 10) + (i / 10)).toFixed(1))
    };
  })
];

// Mock feature adoption funnel
export const mockAdoptionFunnel = {
  registered_users: 25,
  steps: [
    {
      name: 'Created Farm',
      users: 22,
      conversion_rate: 88
    },
    {
      name: 'Connected Exchange',
      users: 18,
      conversion_rate: 82
    },
    {
      name: 'Created Standard Agent',
      users: 15,
      conversion_rate: 83
    },
    {
      name: 'Executed First Trade',
      users: 14,
      conversion_rate: 93
    },
    {
      name: 'Created Goal',
      users: 10,
      conversion_rate: 71
    },
    {
      name: 'Created ElizaOS Agent',
      users: 7,
      conversion_rate: 70
    },
    {
      name: 'Used Vault Banking',
      users: 5,
      conversion_rate: 71
    }
  ]
};

// Mock user feedback data
export const mockUserFeedback = [
  {
    id: 'feedback-1',
    user_id: 'mock-user-1',
    feature: 'dashboard',
    rating: 5,
    comment: 'The dashboard is intuitive and provides exactly the information I need.',
    created_at: '2025-03-15T09:23:15Z'
  },
  {
    id: 'feedback-2',
    user_id: 'mock-user-1',
    feature: 'agents',
    rating: 4,
    comment: 'The agent creation process is straightforward, but I would like more strategy templates.',
    created_at: '2025-03-16T14:05:32Z'
  },
  {
    id: 'feedback-3',
    user_id: 'mock-user-1',
    feature: 'eliza_agents',
    rating: 5,
    comment: 'ElizaOS agents are revolutionary. The AI capabilities are far beyond what I expected.',
    created_at: '2025-03-20T11:37:44Z'
  },
  {
    id: 'feedback-4',
    user_id: 'mock-user-1',
    feature: 'vault',
    rating: 4,
    comment: 'Vault system works well, but could use more detailed transaction history.',
    created_at: '2025-03-25T16:42:10Z'
  },
  {
    id: 'feedback-5',
    user_id: 'mock-user-1',
    feature: 'goals',
    rating: 4,
    comment: 'Goal tracking helps keep my trading focused. Would like to see integration with external calendars.',
    created_at: '2025-03-28T10:18:27Z'
  }
];

// Helper functions
export function getUserActivityByDateRange(userId: string, startDate: string, endDate: string) {
  return mockUserActivity.filter(activity => 
    activity.user_id === userId && 
    activity.date >= startDate && 
    activity.date <= endDate
  );
}

export function getFeatureUsageById(featureId: string) {
  return mockFeatureUsage.find(feature => feature.feature_id === featureId) || null;
}

export function getFeatureUsageRanking() {
  return [...mockFeatureUsage].sort((a, b) => b.total_views - a.total_views);
}

export function getSystemMetricsByDateRange(startDate: string, endDate: string) {
  return mockSystemMetrics.filter(metrics => 
    metrics.date >= startDate && 
    metrics.date <= endDate
  );
}

export function getAdoptionFunnelData() {
  return mockAdoptionFunnel;
}

export function getUserFeedbackByFeature(featureId: string) {
  return mockUserFeedback.filter(feedback => feedback.feature === featureId);
}

export function getAggregateFeedbackRatings() {
  const featuresMap = new Map();
  
  mockUserFeedback.forEach(feedback => {
    if (!featuresMap.has(feedback.feature)) {
      featuresMap.set(feedback.feature, {
        feature: feedback.feature,
        total_ratings: 0,
        sum_ratings: 0,
        count: 0
      });
    }
    
    const featureData = featuresMap.get(feedback.feature);
    featureData.count += 1;
    featureData.sum_ratings += feedback.rating;
    featureData.total_ratings = featureData.sum_ratings / featureData.count;
  });
  
  return Array.from(featuresMap.values()).map(item => ({
    feature: item.feature,
    average_rating: parseFloat(item.total_ratings.toFixed(1)),
    count: item.count
  }));
}
