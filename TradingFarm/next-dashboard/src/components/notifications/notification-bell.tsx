'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from './notification-provider';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();

  // Get the appropriate icon color based on the notification type
  const getIconColorForType = (type: Notification['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-amber-500';
      case 'success': 
        return 'text-green-500';
      default:
        return 'text-blue-500';
    }
  };

  // Get notification item styles based on read status
  const getItemStyles = (notification: Notification) => {
    return notification.read 
      ? 'opacity-70 bg-muted/40'
      : 'bg-muted/80';
  };

  // Handle clicking on a notification
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Handle navigation or other actions based on notification type
    if (notification.data) {
      // For example, navigate to the entity that triggered the notification
      console.log('Notification data:', notification.data);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={markAllAsRead}
              >
                Mark all read
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={clearNotifications}
              >
                Clear all
              </Button>
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <DropdownMenuGroup>
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex flex-col items-start px-4 py-3 ${getItemStyles(notification)} cursor-pointer`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className={`font-medium ${getIconColorForType(notification.type)}`}>
                      {notification.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                  <span className="mt-1 text-sm">{notification.message}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 