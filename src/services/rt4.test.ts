// @ts-ignore
import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { wsClient } from './websocketClient';
import { QueueStore } from './store';
import { apiClient } from './apiClient';

describe('RT4 Staff and Public Realtime Integration', () => {
  let store: QueueStore;

  beforeEach(() => {
    // Mock sessionStorage
    globalThis.sessionStorage = {
      getItem: mock(() => null),
      setItem: mock(() => {}),
      removeItem: mock(() => {}),
      clear: mock(() => {}),
      length: 0,
      key: mock(() => null),
    } as any;

    store = new QueueStore();
    wsClient.disconnect();
    
    mock.restore();
  });

  afterEach(() => {
    wsClient.disconnect();
    mock.restore();
  });

  it('1. should subscribe to the correct staff destination', () => {
    const consoleSpy = mock(() => {});
    const originalLog = console.log;
    console.log = consoleSpy;

    const orgId = 'org-123';
    const locId = 'loc-456';
    
    const subscribeSpy = mock(() => ({ id: 'sub-staff' }));
    (wsClient as any).client = { 
      connected: true, 
      subscribe: subscribeSpy, 
      unsubscribe: mock(),
      deactivate: mock()
    };
    
    wsClient.subscribeToStaffLocation(orgId, locId, () => {});

    expect(consoleSpy).toHaveBeenCalledWith(`[STOMP] Subscribing to /topic/tenant/${orgId}/location/${locId}/staff`);
    
    console.log = originalLog;
  });

  it('2. should subscribe to the correct public destination', () => {
    const consoleSpy = mock(() => {});
    const originalLog = console.log;
    console.log = consoleSpy;

    const orgId = 'org-abc';
    const locId = 'loc-main';
    
    const subscribeSpy = mock(() => ({ id: 'sub-public' }));
    (wsClient as any).client = { 
      connected: true, 
      subscribe: subscribeSpy, 
      unsubscribe: mock(),
      deactivate: mock()
    };
    
    wsClient.subscribeToPublicLocation(orgId, locId, () => {});

    expect(consoleSpy).toHaveBeenCalledWith(`[STOMP] Subscribing to /topic/tenant/${orgId}/location/${locId}/public`);
    
    console.log = originalLog;
  });

  it('3. should use authenticated credential selection (apiClient.getAccessToken)', async () => {
    const getTokenSpy = mock(() => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.staff_token_mock');
    apiClient.getAccessToken = getTokenSpy;

    wsClient.connect(
      () => {},
      () => {},
      () => {}
    );

    const internalClient = (wsClient as any).client;
    expect(internalClient).toBeDefined();
    
    await internalClient.beforeConnect();

    expect(internalClient.connectHeaders.Authorization).toBe(`Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.staff_token_mock`);
    expect(getTokenSpy).toHaveBeenCalled();
  });

  it('4. staff subscription lifecycle and duplicate prevention', () => {
    const subscribeSpy = mock(() => ({ id: 'sub-1' }));
    const unsubscribeSpy = mock();
    (wsClient as any).client = { 
      connected: true, 
      subscribe: subscribeSpy, 
      unsubscribe: unsubscribeSpy,
      deactivate: mock()
    };

    // First subscription
    wsClient.subscribeToStaffLocation('org-1', 'loc-1', () => {});
    expect((wsClient as any).currentSubscriptionId).toBe('sub-1');

    // Duplicate subscription should trigger unsubscribe first
    wsClient.subscribeToStaffLocation('org-1', 'loc-2', () => {});
    expect(unsubscribeSpy).toHaveBeenCalledWith('sub-1');
  });

  it('7. cleanup/disconnect should clear client and subscription', () => {
    const unsubscribeSpy = mock();
    const deactivateSpy = mock();
    (wsClient as any).client = { 
      connected: true,
      unsubscribe: unsubscribeSpy,
      deactivate: deactivateSpy
    };
    (wsClient as any).currentSubscriptionId = 'sub-test';

    wsClient.disconnect();

    expect(unsubscribeSpy).toHaveBeenCalledWith('sub-test');
    expect(deactivateSpy).toHaveBeenCalled();
    expect((wsClient as any).client).toBeNull();
  });

  it('13. regression of customer custom-token behavior', async () => {
    const customToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.customer_token_mock';
    const getTokenSpy = mock(() => null);
    apiClient.getAccessToken = getTokenSpy;
    
    wsClient.connect(
      () => {},
      () => {},
      () => {},
      customToken
    );

    const internalClient = (wsClient as any).client;
    await internalClient.beforeConnect();

    expect(internalClient.connectHeaders.Authorization).toBe(`Bearer ${customToken}`);
    expect(getTokenSpy).not.toHaveBeenCalled(); 
  });
  
  it('14. regression of legacy subscription method', () => {
    const consoleSpy = mock(() => {});
    const originalLog = console.log;
    console.log = consoleSpy;

    const locId = 'loc-old';
    
    const subscribeSpy = mock(() => ({ id: 'sub-legacy' }));
    (wsClient as any).client = { 
      connected: true, 
      subscribe: subscribeSpy, 
      unsubscribe: mock(),
      deactivate: mock()
    };
    
    wsClient.subscribeToLocation(locId, () => {});

    expect(consoleSpy).toHaveBeenCalledWith(`[STOMP] Subscribing to /topic/location.${locId}`);
    
    console.log = originalLog;
  });
});
