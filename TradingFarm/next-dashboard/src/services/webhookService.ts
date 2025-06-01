import axios from 'axios';

type WebhookEvent = {
  type: 'trade' | 'order' | 'error';
  data: Record<string, any>;
  timestamp: string;
};

export class WebhookService {
  private webhookUrls: string[] = [];

  constructor() {
    const urls = process.env.WEBHOOK_URLS?.split(',') || [];
    this.webhookUrls = urls.filter(url => url.startsWith('http'));
  }

  async sendNotification(event: WebhookEvent): Promise<void> {
    const promises = this.webhookUrls.map(url => 
      axios.post(url, event).catch(err => {
        console.error(`Failed to send webhook to ${url}:`, err.message);
      })
    );
    
    await Promise.all(promises);
  }

  // Specific event types
  async notifyTradeExecuted(params: {
    exchange: string;
    symbol: string;
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    orderId: string;
  }) {
    await this.sendNotification({
      type: 'trade',
      timestamp: new Date().toISOString(),
      data: params
    });
  }

  async notifyError(error: Error, context: Record<string, any> = {}) {
    await this.sendNotification({
      type: 'error',
      timestamp: new Date().toISOString(),
      data: {
        message: error.message,
        stack: error.stack,
        ...context
      }
    });
  }
}
