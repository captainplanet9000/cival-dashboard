"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFarm } from '@/hooks/useFarm';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type Farm = Database['public']['Tables']['farms']['Row'];

export default function DashboardPage() {
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_KEY!
  );

  const { farm } = useFarm({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_KEY!,
    farmId: selectedFarmId,
  });

  useEffect(() => {
    const fetchFarms = async () => {
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching farms:', error);
        return;
      }

      setFarms(data);
      if (data.length > 0 && !selectedFarmId) {
        setSelectedFarmId(data[0].id);
      }
      setIsLoading(false);
    };

    fetchFarms();
  }, [supabase, selectedFarmId]);

  // Sample performance data (replace with real data)
  const performanceData = [
    { date: '2024-01', value: 1000 },
    { date: '2024-02', value: 1200 },
    { date: '2024-03', value: 1100 },
    { date: '2024-04', value: 1400 },
  ];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Select value={selectedFarmId} onValueChange={setSelectedFarmId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select a farm" />
          </SelectTrigger>
          <SelectContent>
            {farms.map((farm) => (
              <SelectItem key={farm.id} value={farm.id}>
                {farm.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {farm && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Value
              </h3>
              <p className="text-2xl font-semibold">$10,234.50</p>
              <p className="text-sm text-green-600">+2.5%</p>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Active Agents
              </h3>
              <p className="text-2xl font-semibold">
                {farm.farm_agents?.filter((agent) => agent.status === 'active')
                  .length || 0}
              </p>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Active Orders
              </h3>
              <p className="text-2xl font-semibold">12</p>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                24h Volume
              </h3>
              <p className="text-2xl font-semibold">$45,678.90</p>
              <p className="text-sm text-red-600">-1.2%</p>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Performance</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#8884d8"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {/* Add recent activity items here */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Trade Executed</p>
                    <p className="text-sm text-gray-500">BTC/USDT @ $45,000</p>
                  </div>
                  <p className="text-sm text-gray-500">5m ago</p>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">New Order</p>
                    <p className="text-sm text-gray-500">Limit Buy ETH/USDT</p>
                  </div>
                  <p className="text-sm text-gray-500">15m ago</p>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Agent Status</p>
                    <p className="text-sm text-gray-500">
                      Risk Manager updated parameters
                    </p>
                  </div>
                  <p className="text-sm text-gray-500">1h ago</p>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
} 