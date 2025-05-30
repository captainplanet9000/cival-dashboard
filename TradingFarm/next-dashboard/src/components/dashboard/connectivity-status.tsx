"use client";

import { useState, useEffect } from 'react';
import { testConnectivity, ConnectivityReport, ServiceStatus } from '../../lib/api-utils';

/**
 * Component that displays connection status to all backend services
 * and allows testing connections
 */
export default function ConnectivityStatus() {
  const [report, setReport] = useState<ConnectivityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to run the connectivity test
  const runConnectivityTest = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await testConnectivity();
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run connectivity test');
    } finally {
      setLoading(false);
    }
  };

  // Run test on first load
  useEffect(() => {
    runConnectivityTest();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Service Connectivity</h2>
        <button
          onClick={runConnectivityTest}
          disabled={loading}
          className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Connections'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {report ? (
          Object.entries(report.services).map(([key, service]) => (
            <ServiceStatusItem key={key} service={service} />
          ))
        ) : loading ? (
          <div className="text-center py-4">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Testing connections...</p>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No connectivity data available
          </div>
        )}
      </div>

      {report && (
        <div className="mt-4 pt-3 border-t text-xs text-gray-500">
          Last checked: {new Date(report.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
}

/**
 * Individual service status display component
 */
function ServiceStatusItem({ service }: { service: ServiceStatus }) {
  return (
    <div className="flex items-center justify-between p-2 border rounded">
      <div className="flex items-center">
        <StatusIndicator status={service.status} />
        <div className="ml-3">
          <div className="font-medium">{service.name}</div>
          <div className="text-xs text-gray-500 truncate max-w-[200px]">{service.endpoint}</div>
        </div>
      </div>
      <div className="text-xs">
        {service.status === 'connected' ? (
          <span className="text-green-600">Connected</span>
        ) : (
          <span className="text-red-600" title={service.message}>
            {service.statusCode > 0 ? `Error ${service.statusCode}` : 'Connection Failed'}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Status indicator dot component
 */
function StatusIndicator({ status }: { status: 'connected' | 'error' | 'pending' }) {
  const colorClass = {
    connected: 'bg-green-500',
    error: 'bg-red-500',
    pending: 'bg-yellow-500',
  }[status];

  return (
    <div className={`h-3 w-3 rounded-full ${colorClass}`} title={status}></div>
  );
} 