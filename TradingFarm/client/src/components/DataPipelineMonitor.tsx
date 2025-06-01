/**
 * DataPipelineMonitor Component
 * 
 * This component provides a real-time monitoring dashboard for the Trading Farm data pipeline.
 * It displays status information for Kafka, TimescaleDB, and data ingestion rates.
 * 
 * Features:
 * - Real-time status indicators for all pipeline components
 * - Data ingestion metrics by exchange and data type
 * - Storage statistics and compression ratios
 * - Manual refresh and auto-refresh capabilities
 */

import React, { useEffect, useState } from 'react';
import { Card, Alert, Badge, Progress, Table, Button, Space, Spin, Tabs, Statistic } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ExclamationCircleOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  ApiOutlined,
  SettingOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined
} from '@ant-design/icons';
import type { TabsProps } from 'antd';
import axios from 'axios';

// Constants
const AUTO_REFRESH_RATE = 30000; // Auto refresh every 30 seconds

// Type definitions
interface DataPipelineStatus {
  status: string;
  kafka_connected: boolean;
  timescale_connected: boolean;
  active_topics: string[];
  uptime: number;
  metrics: Record<string, any>;
  errors: string[];
}

interface DataStorageStats {
  total_tickers: number;
  total_trades: number;
  total_order_books: number;
  storage_size_mb: number;
  compression_ratio: number;
  oldest_record: string;
  newest_record: string;
}

interface TopicIngestionRate {
  topic: string;
  records_per_minute: number;
  bytes_per_minute: number;
  lag: number;
}

const DataPipelineMonitor: React.FC = () => {
  // State
  const [pipelineStatus, setPipelineStatus] = useState<DataPipelineStatus | null>(null);
  const [storageStats, setStorageStats] = useState<DataStorageStats | null>(null);
  const [ingestionRates, setIngestionRates] = useState<TopicIngestionRate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  // Fetch data
  const fetchPipelineStatus = async () => {
    try {
      const response = await axios.get('/api/admin/data-pipeline/status');
      setPipelineStatus(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching pipeline status:', err);
      setError('Failed to fetch pipeline status');
      return null;
    }
  };

  const fetchStorageStats = async () => {
    try {
      const response = await axios.get('/api/admin/data-pipeline/storage-stats');
      setStorageStats(response.data);
    } catch (err) {
      console.error('Error fetching storage stats:', err);
      setError('Failed to fetch storage statistics');
    }
  };

  const fetchIngestionRates = async () => {
    try {
      const response = await axios.get('/api/admin/data-pipeline/ingestion-rates');
      setIngestionRates(response.data);
    } catch (err) {
      console.error('Error fetching ingestion rates:', err);
      setError('Failed to fetch ingestion rates');
    }
  };

  // Refresh all data
  const refreshData = async () => {
    setLoading(true);
    setError(null);
    
    const statusData = await fetchPipelineStatus();
    if (statusData && statusData.status !== 'offline') {
      await Promise.all([
        fetchStorageStats(),
        fetchIngestionRates()
      ]);
    }
    
    setLoading(false);
  };

  // Initialize auto-refresh
  useEffect(() => {
    refreshData();
    
    // Set up auto-refresh interval (30 seconds)
    const interval = window.setInterval(() => {
      refreshData();
    }, AUTO_REFRESH_RATE);
    
    setRefreshInterval(interval);
    
    // Clean up on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  // Admin actions
  const restartPipeline = async () => {
    setActionLoading(true);
    
    try {
      await axios.post('/api/admin/data-pipeline/restart-pipeline');
      setActionLoading(false);
      
      // Wait 5 seconds and refresh data
      setTimeout(() => {
        refreshData();
      }, 5000);
      
    } catch (err) {
      console.error('Error restarting pipeline:', err);
      setError('Failed to restart data pipeline');
      setActionLoading(false);
    }
  };

  const flushCache = async () => {
    setActionLoading(true);
    
    try {
      await axios.post('/api/admin/data-pipeline/flush-cache');
      setActionLoading(false);
      refreshData();
    } catch (err) {
      console.error('Error flushing cache:', err);
      setError('Failed to flush cache');
      setActionLoading(false);
    }
  };

  const vacuumDatabase = async () => {
    setActionLoading(true);
    
    try {
      await axios.post('/api/admin/data-pipeline/vacuum-analyze');
      setActionLoading(false);
      refreshData();
    } catch (err) {
      console.error('Error running vacuum analyze:', err);
      setError('Failed to run VACUUM ANALYZE');
      setActionLoading(false);
    }
  };

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'offline':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'degraded':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'offline':
        return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
      default:
        return null;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes.toFixed(2)} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  };

  // Tab items
  const tabItems: TabsProps['items'] = [
    {
      key: 'status',
      label: (
        <span>
          <ApiOutlined />
          Pipeline Status
        </span>
      ),
      children: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Connection Status" className="mb-4">
            {pipelineStatus ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <span>Overall Status:</span>
                  <Badge 
                    status={getStatusColor(pipelineStatus.status) as any} 
                    text={pipelineStatus.status.toUpperCase()} 
                  />
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <span>Kafka Connection:</span>
                  <Badge 
                    status={pipelineStatus.kafka_connected ? 'success' : 'error'} 
                    text={pipelineStatus.kafka_connected ? 'Connected' : 'Disconnected'} 
                  />
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <span>TimescaleDB Connection:</span>
                  <Badge 
                    status={pipelineStatus.timescale_connected ? 'success' : 'error'} 
                    text={pipelineStatus.timescale_connected ? 'Connected' : 'Disconnected'} 
                  />
                </div>
                
                {pipelineStatus.uptime > 0 && (
                  <div className="flex justify-between items-center mb-4">
                    <span>Uptime:</span>
                    <span>{formatUptime(pipelineStatus.uptime)}</span>
                  </div>
                )}
                
                {pipelineStatus.errors && pipelineStatus.errors.length > 0 && (
                  <Alert
                    message="Pipeline Errors"
                    description={
                      <ul className="list-disc pl-4">
                        {pipelineStatus.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    }
                    type="error"
                    showIcon
                  />
                )}
              </>
            ) : (
              <div className="flex justify-center items-center h-24">
                <Spin tip="Loading status..." />
              </div>
            )}
          </Card>
          
          <Card title="Active Topics" className="mb-4">
            {pipelineStatus ? (
              pipelineStatus.active_topics && pipelineStatus.active_topics.length > 0 ? (
                <Table
                  dataSource={pipelineStatus.active_topics.map(topic => ({ topic }))}
                  rowKey="topic"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: 'Topic Name',
                      dataIndex: 'topic',
                      key: 'topic',
                    }
                  ]}
                />
              ) : (
                <Alert
                  message="No Active Topics"
                  description="There are no active Kafka topics."
                  type="warning"
                  showIcon
                />
              )
            ) : (
              <div className="flex justify-center items-center h-24">
                <Spin tip="Loading topics..." />
              </div>
            )}
          </Card>
        </div>
      ),
    },
    {
      key: 'storage',
      label: (
        <span>
          <DatabaseOutlined />
          Storage Statistics
        </span>
      ),
      children: (
        <>
          {storageStats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <Statistic
                  title="Total Ticker Records"
                  value={storageStats.total_tickers}
                  valueStyle={{ color: '#3f8600' }}
                  suffix="records"
                />
              </Card>
              
              <Card>
                <Statistic
                  title="Total Trade Records"
                  value={storageStats.total_trades}
                  valueStyle={{ color: '#3f8600' }}
                  suffix="records"
                />
              </Card>
              
              <Card>
                <Statistic
                  title="Total Order Book Records"
                  value={storageStats.total_order_books}
                  valueStyle={{ color: '#3f8600' }}
                  suffix="records"
                />
              </Card>
              
              <Card>
                <Statistic
                  title="Storage Size"
                  value={storageStats.storage_size_mb}
                  precision={2}
                  valueStyle={{ color: '#1890ff' }}
                  suffix="MB"
                />
              </Card>
              
              <Card>
                <Statistic
                  title="Compression Ratio"
                  value={storageStats.compression_ratio}
                  precision={2}
                  valueStyle={{ color: '#1890ff' }}
                  suffix="x"
                />
              </Card>
              
              <Card>
                <Statistic
                  title="Time Range"
                  value={(new Date(storageStats.newest_record).getTime() - new Date(storageStats.oldest_record).getTime()) / (24 * 60 * 60 * 1000)}
                  precision={1}
                  valueStyle={{ color: '#1890ff' }}
                  suffix="days"
                />
              </Card>
            </div>
          ) : (
            <div className="flex justify-center items-center h-24">
              <Spin tip="Loading storage statistics..." />
            </div>
          )}
        </>
      ),
    },
    {
      key: 'ingestion',
      label: (
        <span>
          <ArrowDownOutlined />
          Ingestion Rates
        </span>
      ),
      children: (
        <>
          {ingestionRates && ingestionRates.length > 0 ? (
            <Table
              dataSource={ingestionRates}
              rowKey="topic"
              columns={[
                {
                  title: 'Topic',
                  dataIndex: 'topic',
                  key: 'topic',
                },
                {
                  title: 'Records/Minute',
                  dataIndex: 'records_per_minute',
                  key: 'records_per_minute',
                  render: value => value.toFixed(2),
                },
                {
                  title: 'Bytes/Minute',
                  dataIndex: 'bytes_per_minute',
                  key: 'bytes_per_minute',
                  render: value => formatBytes(value),
                },
                {
                  title: 'Lag',
                  dataIndex: 'lag',
                  key: 'lag',
                  render: value => (
                    <Badge
                      count={value}
                      style={{ 
                        backgroundColor: value > 100 ? '#f5222d' : 
                                        value > 10 ? '#faad14' : '#52c41a' 
                      }}
                    />
                  ),
                },
              ]}
            />
          ) : (
            <Alert
              message="No Ingestion Data"
              description="No data ingestion statistics are available."
              type="info"
              showIcon
            />
          )}
        </>
      ),
    },
    {
      key: 'admin',
      label: (
        <span>
          <SettingOutlined />
          Administration
        </span>
      ),
      children: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Pipeline Actions" className="mb-4">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                icon={<ReloadOutlined />} 
                onClick={restartPipeline}
                loading={actionLoading}
                block
              >
                Restart Pipeline
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                Stops and restarts the Kafka-TimescaleDB data pipeline.
              </p>
            </Space>
          </Card>
          
          <Card title="Database Actions" className="mb-4">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                icon={<DatabaseOutlined />}
                onClick={flushCache}
                loading={actionLoading}
                block
              >
                Flush Cache & Refresh Views
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                Flushes TimescaleDB cache and refreshes materialized views.
              </p>
              
              <Button
                icon={<DatabaseOutlined />}
                onClick={vacuumDatabase}
                loading={actionLoading}
                block
              >
                Run VACUUM ANALYZE
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                Optimizes database tables and updates statistics.
              </p>
            </Space>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="data-pipeline-monitor">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-semibold flex items-center">
          Data Pipeline Monitor
          {pipelineStatus && (
            <Badge
              status={getStatusColor(pipelineStatus.status) as any}
              style={{ marginLeft: 8 }}
            />
          )}
        </h2>
        
        <Button
          icon={<ReloadOutlined />}
          onClick={refreshData}
          loading={loading}
        >
          Refresh
        </Button>
      </div>
      
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          className="mb-4"
          closable
          onClose={() => setError(null)}
        />
      )}
      
      <div className="relative">
        <Spin spinning={loading} tip="Loading data...">
          <Tabs defaultActiveKey="status" items={tabItems} />
        </Spin>
      </div>
    </div>
  );
};

export default DataPipelineMonitor;
