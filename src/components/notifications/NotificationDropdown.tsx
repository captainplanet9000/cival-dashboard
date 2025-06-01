import React, { useState, useEffect, useRef } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import NotificationService, { Notification } from '../../services/notification-service';

interface NotificationDropdownProps {
  className?: string;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationService = NotificationService.getInstance();
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  useEffect(() => {
    // Subscribe to notifications
    const unsubscribe = notificationService.addNotificationListener((newNotifications) => {
      setNotifications(newNotifications);
      setUnreadCount(notificationService.getUnreadCount());
    });
    
    return () => unsubscribe();
  }, []);
  
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      // Mark all as read when opening
      setTimeout(() => {
        notificationService.markAllAsRead();
      }, 1000);
    }
  };
  
  const handleMarkAsRead = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    notificationService.markAsRead(id);
  };
  
  const handleDelete = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    notificationService.deleteNotification(id);
  };
  
  const handleClearAll = () => {
    notifications.forEach(n => notificationService.deleteNotification(n.id));
  };
  
  // Function to simulate a new notification for testing
  const simulateNotification = () => {
    const types: Notification['type'][] = ['profit', 'loss', 'drawdown', 'winRate', 'tradeCount', 'system'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    notificationService.simulateNewNotification(randomType);
  };
  
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (timestamp > new Date(now.setHours(0, 0, 0, 0))) {
      return `Today at ${format(timestamp, 'h:mm a')}`;
    } else if (timestamp > new Date(yesterday.setHours(0, 0, 0, 0))) {
      return `Yesterday at ${format(timestamp, 'h:mm a')}`;
    } else {
      return format(timestamp, 'MMM d, yyyy');
    }
  };
  
  // Function to get an icon based on notification type
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'profit':
        return '📈';
      case 'loss':
        return '📉';
      case 'drawdown':
        return '🔻';
      case 'winRate':
        return '🎯';
      case 'tradeCount':
        return '🔄';
      case 'system':
        return '⚙️';
      default:
        return '🔔';
    }
  };
  
  // Function to get background color based on notification type
  const getNotificationBgColor = (type: Notification['type'], read: boolean) => {
    if (read) return 'bg-gray-50';
    
    switch (type) {
      case 'profit':
        return 'bg-green-50';
      case 'loss':
        return 'bg-red-50';
      case 'drawdown':
        return 'bg-orange-50';
      case 'winRate':
        return 'bg-yellow-50';
      case 'tradeCount':
        return 'bg-blue-50';
      case 'system':
        return 'bg-purple-50';
      default:
        return 'bg-blue-50';
    }
  };
  
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
        onClick={toggleDropdown}
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-[80vh] overflow-y-auto">
          <div className="p-2 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Notifications</h3>
            <div className="flex space-x-2">
              <button
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={handleClearAll}
              >
                Clear All
              </button>
              <button
                className="text-sm text-green-600 hover:text-green-800"
                onClick={simulateNotification}
              >
                Test Alert
              </button>
            </div>
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications to display
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`${getNotificationBgColor(notification.type, notification.read)} p-3 border-b border-gray-100 last:border-b-0 relative hover:bg-gray-100 transition-colors`}
                >
                  <div className="flex">
                    <div className="mr-3 text-xl">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-semibold">
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
                      <div className="text-xs text-gray-400 mt-1">
                        {formatTimestamp(notification.timestamp)}
                      </div>
                      
                      <div className="flex justify-end mt-1">
                        {!notification.read && (
                          <button
                            className="text-xs text-blue-600 hover:text-blue-800 mr-3"
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                          >
                            Mark as read
                          </button>
                        )}
                        <button
                          className="text-xs text-red-600 hover:text-red-800"
                          onClick={(e) => handleDelete(notification.id, e)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-2 border-t border-gray-200 text-center">
            <button
              className="w-full py-2 px-4 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
              onClick={() => window.alert('Viewing all notifications is not implemented yet!')}
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 