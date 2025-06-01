import { AlertConfig } from '../components/performance/AlertConfiguration';

export interface Notification {
  id: string;
  type: 'profit' | 'loss' | 'drawdown' | 'winRate' | 'tradeCount' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  strategyId?: string;
  farmId?: string;
  data?: any;
}

export interface NotificationSubscription {
  id: string;
  userId: string;
  alertConfig: AlertConfig;
  createdAt: Date;
  updatedAt: Date;
}

class NotificationService {
  private static instance: NotificationService;
  private notifications: Notification[] = [];
  private subscriptions: NotificationSubscription[] = [];
  private notificationListeners: ((notifications: Notification[]) => void)[] = [];
  
  // Mock user ID for demo purposes
  private currentUserId = 'user-1';

  private constructor() {
    // Initialize with some mock notifications
    this.notifications = [
      {
        id: 'n1',
        type: 'profit',
        title: 'Profit Target Reached',
        message: 'Your BTC/USD strategy has reached the profit target of 5%',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        read: false,
        strategyId: 'strategy-1',
        data: {
          profit: 5.2,
          threshold: 5
        }
      },
      {
        id: 'n2',
        type: 'drawdown',
        title: 'Drawdown Alert',
        message: 'Your ETH/USD strategy has exceeded the max drawdown threshold of 10%',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        read: true,
        strategyId: 'strategy-2',
        data: {
          drawdown: 12.5,
          threshold: 10
        }
      },
      {
        id: 'n3',
        type: 'system',
        title: 'System Maintenance',
        message: 'The trading system will undergo maintenance in 2 hours',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        read: false
      }
    ];
    
    // Mock subscription
    this.subscriptions = [
      {
        id: 'sub-1',
        userId: this.currentUserId,
        alertConfig: {
          enabled: true,
          profitThreshold: 5,
          lossThreshold: 5,
          drawdownThreshold: 10,
          winRateThreshold: 40,
          notificationChannels: {
            email: true,
            browser: true,
            mobile: false
          },
          frequency: 'immediate',
          scope: 'all'
        },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    ];
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public getNotifications(): Notification[] {
    return [...this.notifications].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }
  
  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }
  
  public markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }
  
  public markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.notifyListeners();
  }
  
  public deleteNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }
  
  public createSubscription(alertConfig: AlertConfig): NotificationSubscription {
    const subscription: NotificationSubscription = {
      id: `sub-${Date.now()}`,
      userId: this.currentUserId,
      alertConfig,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.subscriptions.push(subscription);
    return subscription;
  }
  
  public updateSubscription(id: string, alertConfig: AlertConfig): NotificationSubscription | null {
    const subscription = this.subscriptions.find(s => s.id === id);
    if (subscription) {
      subscription.alertConfig = alertConfig;
      subscription.updatedAt = new Date();
      return subscription;
    }
    return null;
  }
  
  public getSubscriptions(): NotificationSubscription[] {
    return this.subscriptions.filter(s => s.userId === this.currentUserId);
  }
  
  public deleteSubscription(id: string): boolean {
    const initialLength = this.subscriptions.length;
    this.subscriptions = this.subscriptions.filter(s => s.id !== id);
    return initialLength !== this.subscriptions.length;
  }
  
  // Function to simulate a new notification being received
  public simulateNewNotification(type: Notification['type'], strategyId?: string, farmId?: string): void {
    let title = '';
    let message = '';
    let data: any = {};
    
    switch (type) {
      case 'profit':
        title = 'Profit Target Reached';
        message = 'Your strategy has reached the profit target';
        data = { profit: Math.round(Math.random() * 10 + 5), threshold: 5 };
        break;
      case 'loss':
        title = 'Loss Threshold Exceeded';
        message = 'Your strategy has exceeded the loss threshold';
        data = { loss: Math.round(Math.random() * 10 + 5), threshold: 5 };
        break;
      case 'drawdown':
        title = 'Maximum Drawdown Alert';
        message = 'Your strategy has exceeded the maximum drawdown threshold';
        data = { drawdown: Math.round(Math.random() * 10 + 10), threshold: 10 };
        break;
      case 'winRate':
        title = 'Win Rate Alert';
        message = 'Your strategy win rate has fallen below the threshold';
        data = { winRate: Math.round(Math.random() * 10 + 30), threshold: 40 };
        break;
      case 'tradeCount':
        title = 'High Trade Frequency';
        message = 'Your strategy has executed more trades than the threshold';
        data = { tradeCount: Math.round(Math.random() * 20 + 20), threshold: 10 };
        break;
      default:
        title = 'System Notification';
        message = 'A system event has occurred';
    }
    
    const notification: Notification = {
      id: `n-${Date.now()}`,
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
      strategyId,
      farmId,
      data
    };
    
    this.notifications.unshift(notification);
    this.notifyListeners();
    this.showBrowserNotification(notification);
  }
  
  // Browser notification
  private showBrowserNotification(notification: Notification): void {
    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notification");
      return;
    }
    
    if (Notification.permission === "granted") {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo.png'
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/logo.png'
          });
        }
      });
    }
  }
  
  // Add a listener for notifications
  public addNotificationListener(callback: (notifications: Notification[]) => void): () => void {
    this.notificationListeners.push(callback);
    callback(this.getNotifications());
    
    // Return a function to remove the listener
    return () => {
      this.notificationListeners = this.notificationListeners.filter(cb => cb !== callback);
    };
  }
  
  // Notify all listeners
  private notifyListeners(): void {
    const notifications = this.getNotifications();
    this.notificationListeners.forEach(callback => callback(notifications));
  }
}

export default NotificationService; 