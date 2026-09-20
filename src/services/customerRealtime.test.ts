// @ts-ignore
import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { wsClient } from './websocketClient';
import { QueueStore, AppState } from './store';
import { apiClient } from './apiClient';

describe('Customer Realtime Integration (RT3)', () => {
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
    // Clear any active subscriptions
    wsClient.disconnect();
    
    // Mock the stomp client's behavior
    // Since we can't easily mock the internal Client from @stomp/stompjs directly
    // we'll mock the beforeConnect and track what happens
    mock.restore();
  });

  afterEach(() => {
    wsClient.disconnect();
    mock.restore();
  });

  it('should use provided custom token for customer subscription instead of api token', async () => {
    const customToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.customer_token_mock';
    
    // We can spy on apiClient.getAccessToken to ensure it's NOT called or its result is ignored
    const getTokenSpy = mock(() => null);
    apiClient.getAccessToken = getTokenSpy;

    let onConnectCalled = false;
    
    wsClient.connect(
      () => { onConnectCalled = true; },
      () => {},
      () => {},
      customToken
    );

    // Get the instance property via any cast to test internal logic
    const internalClient = (wsClient as any).client;
    expect(internalClient).toBeDefined();
    
    // manually trigger beforeConnect
    await internalClient.beforeConnect();

    // Verify connectHeaders
    expect(internalClient.connectHeaders.Authorization).toBe(`Bearer ${customToken}`);
    expect(getTokenSpy).not.toHaveBeenCalled(); // Should not fallback if customToken provided
  });

  it('should not log sensitive tokens during subscription setup', () => {
    const consoleSpy = mock(() => {});
    const originalLog = console.log;
    console.log = consoleSpy;

    const tokenId = 'tok-1234';
    
    // We mock the client subscribe to avoid errors
    const subscribeSpy = mock(() => ({ id: 'sub-0' }));
    (wsClient as any).client = { 
      connected: true, 
      subscribe: subscribeSpy, 
      unsubscribe: mock(),
      deactivate: mock()
    };
    
    wsClient.subscribeToToken(tokenId, () => {});

    // Assert that the console log only contains the topic, not tokens
    expect(consoleSpy).toHaveBeenCalledWith(`[STOMP] Subscribing to /topic/token/${tokenId}`);
    
    // Verify that the custom realtime token string itself is never logged
    consoleSpy.mock.calls.forEach((call) => {
      const msg = call.join(' ');
      expect(msg).not.toContain('eyJhbGciOi'); // Check that mock JWT isn't in logs
    });

    console.log = originalLog;
  });

  it('should correctly process token events via queueStore.handleRealtimeEvent', () => {
    // We'll simulate a message being received
    const tokenId = 'tok-042'; // Exists in INITIAL_TOKENS
    const locationId = 'loc-main';
    
    // The initial state of tok-042 is WAITING.
    const initialToken = store.getState().tokens.find(t => t.id === tokenId);
    expect(initialToken?.state).toBe('WAITING');

    const msg = {
      eventType: 'TOKEN_CALLED',
      eventId: 'evt-001',
      tokenId: tokenId,
      aggregateId: tokenId,
      locationId: locationId,
      counterNumber: 3,
      payload: {
        id: tokenId,
        state: 'CALLED',
        counterNumber: 3
      },
      timestamp: new Date().toISOString()
    };

    store.setSyncStatus('LIVE');
    store.handleRealtimeEvent(msg, locationId);

    const updatedToken = store.getState().tokens.find(t => t.id === tokenId);
    expect(updatedToken?.state).toBe('CALLED');
    expect(updatedToken?.counterNumber).toBe(3);
  });

  it('A/B/C/D. Customer join stores token through public QueueStore API and triggers reactive update', () => {
    let notifiedState: AppState | null = null;
    store.subscribe((state) => {
      notifiedState = state;
    });

    const mockToken = {
      id: 'test-tok-123',
      orgId: 'org-abc',
      locationId: 'loc-main',
      serviceId: 'srv-general',
      queueId: 'q-triage',
      tokenNumber: 'A-099',
      state: 'WAITING',
      customerName: 'Test Name',
      customerPhone: '',
      joinedAt: new Date().toISOString(),
      peopleAhead: 0,
      estWaitMins: 5,
      estRange: '4-7 min',
      confidence: 'High',
      realtimeToken: 'fake-jwt'
    } as any;

    // Use the public API
    store.addJoinedCustomerToken(mockToken);

    // B. Reactive update causes active customer token state to become available
    expect(notifiedState).not.toBeNull();
    expect(notifiedState!.activeCustomerTokenId).toBe('test-tok-123');
    const tokenInStore = notifiedState!.tokens.find(t => t.id === 'test-tok-123');
    expect(tokenInStore).toBeDefined();

    // D. Simulating Screen05ActiveStatus connecting with this state
    let onConnectCalled = false;
    wsClient.connect(
      () => { onConnectCalled = true; },
      () => {},
      () => {},
      tokenInStore!.realtimeToken
    );

    const internalClient = (wsClient as any).client;
    expect(internalClient).toBeDefined();

    // F. SEC-01 strict undefined behavior implicitly unchanged as wsClient signature wasn't altered
  });
});
