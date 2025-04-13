'use client';

import React, { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  BellRing, 
  Check, 
  Filter, 
  X, 
  ChevronDown, 
  Info, 
  AlertCircle, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator, 
  DropdownMenuCheckboxItem 
} from '@/components/ui/dropdown-menu';
import { useNotifications, Notification } from './notification-provider';

interface NotificationCenterProps {
  maxPreviewItems?: number;
  className?: string;
}

export function NotificationCenter({ 
  maxPreviewItems = 5,
  className = ''
}: NotificationCenterProps) {
  const { 
    notifications, 
    addNotification, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications, 
    unreadCount 
  } = useNotifications();
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [filters, setFilters] = useState<{
    type: string[];
    timeframe: string | null;
  }>({
    type: [],
    timeframe: null
  });

  // Filter notifications based on active tab and filters
  const filteredNotifications = notifications.filter(notification => {
    // Tab filtering
    if (activeTab === 'unread' && notification.read) {
      return false;
    }

    // Type filtering
    if (filters.type.length > 0 && !filters.type.includes(notification.type)) {
      return false;
    }

    // Timeframe filtering
    if (filters.timeframe) {
      const now = new Date();
      const notificationTime = new Date(notification.timestamp);
      const hoursDiff = (now.getTime() - notificationTime.getTime()) / (1000 * 60 * 60);
      
      switch (filters.timeframe) {
        case 'today':
          return notificationTime.toDateString() === now.toDateString();
        case '24h':
          return hoursDiff <= 24;
        case '3days':
          return hoursDiff <= 72;
        case '7days':
          return hoursDiff <= 168;
      }
    }

    return true;
  });

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      type: [],
      timeframe: null
    });
  };

  // Handle marking a notification as read
  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Handle navigation or other actions if needed
    if (notification.data && notification.data.url) {
      // Navigate to URL or handle specific action
      console.log('Navigate to:', notification.data.url);
    }
  };

  // Get icon based on notification type
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  // Get background color based on notification type and read status
  const getNotificationBgColor = (type: Notification['type'], read: boolean) => {
    let baseClass = read ? 'opacity-70 ' : '';
    
    switch (type) {
      case 'info':
        return `${baseClass}bg-blue-50 dark:bg-blue-950/20`;
      case 'success':
        return `${baseClass}bg-green-50 dark:bg-green-950/20`;
      case 'warning':
        return `${baseClass}bg-amber-50 dark:bg-amber-950/20`;
      case 'error':
        return `${baseClass}bg-red-50 dark:bg-red-950/20`;
      default:
        return `${baseClass}bg-slate-50 dark:bg-slate-950/20`;
    }
  };

  // Format timestamp for display
  const formatTimestamp = (date: Date) => {
    return format(date, 'MMM d, yyyy h:mm a');
  };

  // Notification Popover/Preview
  const renderNotificationPopover = () => {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className="relative"
          >
            <BellRing className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <div className="flex items-center justify-between border-b p-3">
            <h4 className="font-medium">Notifications</h4>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2" 
                disabled={unreadCount === 0}
                onClick={markAllAsRead}
              >
                <Check className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2"
                  onClick={() => setIsSheetOpen(true)}
                >
                  View all
                </Button>
              </SheetTrigger>
            </div>
          </div>
          
          <ScrollArea className="h-80">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications to display
              </div>
            ) : (
              <div>
                {notifications.slice(0, maxPreviewItems).map((notification) => (
                  <div
                    key={notification.id}
                    className={`${getNotificationBgColor(notification.type, notification.read)} p-3 border-b border-gray-100 last:border-b-0 relative hover:bg-gray-100 transition-colors cursor-pointer`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex">
                      <div className="mr-3 text-xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-semibold flex items-center">
                            {notification.title}
                            {!notification.read && (
                              <span className="ml-2 inline-block w-2 h-2 rounded-full bg-blue-600"></span>
                            )}
                          </h4>
                          <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {notifications.length > maxPreviewItems && (
                  <div className="p-2 text-center">
                    <SheetTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-xs"
                        onClick={() => setIsSheetOpen(true)}
                      >
                        View all ({notifications.length})
                      </Button>
                    </SheetTrigger>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className={className}>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        {renderNotificationPopover()}
        
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Notification Center</SheetTitle>
          </SheetHeader>
          
          <div className="mt-4 flex justify-between items-center">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'unread')}>
              <TabsList>
                <TabsTrigger value="all">
                  All
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-1" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-full flex justify-between items-center px-2 py-1.5 text-sm">
                      Type
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuCheckboxItem
                        checked={filters.type.includes('info')}
                        onCheckedChange={(checked) => {
                          setFilters(prev => ({
                            ...prev,
                            type: checked 
                              ? [...prev.type, 'info'] 
                              : prev.type.filter(type => type !== 'info')
                          }));
                        }}
                      >
                        <Info className="h-4 w-4 text-blue-500 mr-2" />
                        Info
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={filters.type.includes('success')}
                        onCheckedChange={(checked) => {
                          setFilters(prev => ({
                            ...prev,
                            type: checked 
                              ? [...prev.type, 'success'] 
                              : prev.type.filter(type => type !== 'success')
                          }));
                        }}
                      >
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        Success
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={filters.type.includes('warning')}
                        onCheckedChange={(checked) => {
                          setFilters(prev => ({
                            ...prev,
                            type: checked 
                              ? [...prev.type, 'warning'] 
                              : prev.type.filter(type => type !== 'warning')
                          }));
                        }}
                      >
                        <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                        Warning
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={filters.type.includes('error')}
                        onCheckedChange={(checked) => {
                          setFilters(prev => ({
                            ...prev,
                            type: checked 
                              ? [...prev.type, 'error'] 
                              : prev.type.filter(type => type !== 'error')
                          }));
                        }}
                      >
                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                        Error
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-full flex justify-between items-center px-2 py-1.5 text-sm">
                      Time
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem 
                        onClick={() => setFilters(prev => ({ ...prev, timeframe: 'today' }))}
                        className={filters.timeframe === 'today' ? 'bg-accent' : ''}
                      >
                        Today
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setFilters(prev => ({ ...prev, timeframe: '24h' }))}
                        className={filters.timeframe === '24h' ? 'bg-accent' : ''}
                      >
                        Last 24 hours
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setFilters(prev => ({ ...prev, timeframe: '3days' }))}
                        className={filters.timeframe === '3days' ? 'bg-accent' : ''}
                      >
                        Last 3 days
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setFilters(prev => ({ ...prev, timeframe: '7days' }))}
                        className={filters.timeframe === '7days' ? 'bg-accent' : ''}
                      >
                        Last 7 days
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setFilters(prev => ({ ...prev, timeframe: null }))}
                        className={filters.timeframe === null ? 'bg-accent' : ''}
                      >
                        All time
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <DropdownMenuSeparator />
                  
                  <div className="px-2 py-1.5">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={clearNotifications}
                disabled={notifications.length === 0}
              >
                <X className="h-4 w-4 mr-1" />
                Clear all
              </Button>
            </div>
          </div>
          
          <ScrollArea className="h-[calc(100vh-180px)] mt-4">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-4">
                  <BellRing className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No notifications</h3>
                <p className="text-sm text-muted-foreground text-center mt-1 max-w-sm">
                  {activeTab === 'unread' 
                    ? "You don't have any unread notifications." 
                    : filters.type.length > 0 || filters.timeframe
                      ? "No notifications match your filters."
                      : "You don't have any notifications."}
                </p>
                
                {(filters.type.length > 0 || filters.timeframe) && (
                  <Button 
                    variant="outline" 
                    className="mt-4" 
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2 px-1">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`${getNotificationBgColor(notification.type, notification.read)} p-3 rounded-md border border-gray-100 relative hover:bg-gray-100 transition-colors cursor-pointer`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex">
                      <div className="mr-3 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-semibold flex items-center">
                            {notification.title}
                            {!notification.read && (
                              <span className="ml-2 inline-block w-2 h-2 rounded-full bg-blue-600"></span>
                            )}
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            <span className="sr-only">Mark as read</span>
                            {notification.read ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Check className="h-3 w-3 opacity-50" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <div className="flex justify-between items-center mt-2">
                          <Badge 
                            variant="outline" 
                            className={`
                              ${notification.type === 'error' && 'border-red-200 text-red-700 dark:text-red-300'}
                              ${notification.type === 'warning' && 'border-amber-200 text-amber-700 dark:text-amber-300'}
                              ${notification.type === 'success' && 'border-green-200 text-green-700 dark:text-green-300'}
                              ${notification.type === 'info' && 'border-blue-200 text-blue-700 dark:text-blue-300'}
                            `}
                          >
                            {notification.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default NotificationCenter; 