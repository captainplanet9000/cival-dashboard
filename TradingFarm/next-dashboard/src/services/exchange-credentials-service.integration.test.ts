import { ExchangeCredentialsService } from './exchange-credentials-service';

describe('ExchangeCredentialsService Integration', () => {
  let service: ExchangeCredentialsService;

  beforeEach(() => {
    service = new ExchangeCredentialsService();
  });

  it('should encrypt and store credentials', async () => {
    const creds = { api_key: 'test', api_secret: 'secret', exchange: 'mock' };
    await service.storeCredentials(creds);
    const fetched = await service.getCredentials('mock');
    expect(fetched.api_key).toBe('test');
    expect(fetched.api_secret).not.toBe('secret'); // Should be decrypted, not plain
  });
});
