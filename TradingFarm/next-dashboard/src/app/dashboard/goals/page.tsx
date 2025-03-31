"use client";

import React from "react";
import { goalService, Goal } from "@/services/goal-service";
import Link from "next/link";
import { Target, Check, AlertCircle, Clock, ChevronRight, Plus } from "lucide-react";

export default function GoalsPage() {
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchGoals() {
      setLoading(true);
      const response = await goalService.getGoals();
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setGoals(response.data);
      }
      
      setLoading(false);
    }

    fetchGoals();
  }, []);

  // Helper functions for UI display
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    }).format(date);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 0.75) return 'bg-green-500';
    if (progress >= 0.5) return 'bg-blue-500';
    if (progress >= 0.25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading goals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-red-800">Error Loading Goals</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trading Goals</h1>
          <p className="text-gray-500">Manage and track your farm performance goals</p>
        </div>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" /> Create Goal
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">Status</label>
            <select
              id="status-filter"
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="not_started">Not Started</option>
            </select>
          </div>
          <div>
            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700">Goal Type</label>
            <select
              id="type-filter"
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Types</option>
              <option value="profit">Profit</option>
              <option value="risk">Risk</option>
              <option value="diversification">Diversification</option>
              <option value="automation">Automation</option>
            </select>
          </div>
          <div>
            <label htmlFor="priority-filter" className="block text-sm font-medium text-gray-700">Priority</label>
            <select
              id="priority-filter"
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="ml-auto flex items-end">
            <button className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Goals List */}
      {goals.length > 0 ? (
        <div className="space-y-4">
          {goals.map((goal: Goal) => (
            <div key={goal.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="mr-4">
                      <Target className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{goal.name}</h3>
                      <p className="text-sm text-gray-500">{goal.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPriorityClass(goal.priority)}`}>
                      {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                    </span>
                    <div className="flex items-center">
                      {getStatusIcon(goal.status)}
                      <span className="ml-1 text-sm">
                        {goal.status === 'in_progress' ? 'In Progress' : 
                         goal.status === 'completed' ? 'Completed' : 
                         goal.status === 'not_started' ? 'Not Started' : 'Cancelled'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Progress</div>
                    <div className="mt-1 flex items-center">
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div 
                          className={`h-2 rounded-full ${getProgressColor(goal.progress)}`} 
                          style={{ width: `${Math.min(goal.progress * 100, 100)}%` }} 
                        />
                      </div>
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        {Math.round(goal.progress * 100)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Type</div>
                    <div className="mt-1 text-sm font-medium text-gray-900">
                      {goal.type.charAt(0).toUpperCase() + goal.type.slice(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Deadline</div>
                    <div className="mt-1 text-sm font-medium text-gray-900">
                      {formatDate(goal.deadline)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-2">
                <Link 
                  href={`/dashboard/goals/${goal.id}`} 
                  className="flex items-center justify-end text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View Details
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Target className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="mb-1 text-lg font-medium text-gray-900">No Goals Found</h3>
          <p className="mb-4 text-sm text-gray-500">Get started by creating your first trading goal</p>
          <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 inline-flex items-center">
            <Plus className="w-4 h-4 mr-2" /> Create Goal
          </button>
        </div>
      )}
    </div>
  );
}
