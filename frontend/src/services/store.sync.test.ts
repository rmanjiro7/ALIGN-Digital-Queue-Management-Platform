// @ts-ignore
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { QueueStore } from './store';

const dummyLocalStorage = {
  store: {} as Record<string, string>,
  getItem(key: string) { return this.store[key] || null; },
  setItem(key: string, value: string) { this.store[key] = value; },
  clear() { this.store = {}; }
};
(globalThis as any).localStorage = dummyLocalStorage;

describe('QueueStore - Realtime State Synchronization (Gate 2D)', () => {
  let store: QueueStore;
  const locId = 'loc-main';

  beforeEach(() => {
    // Clear localStorage for a clean slate
    localStorage.clear();
    store = new QueueStore();
  });

  it('1 & 2 & 3. startSyncCycle enters SNAPSHOT_SYNC and applies snapshot correctly', () => {
    const genId = store.startSyncCycle(locId);
    expect(store.getState().syncStatus).toBe('SNAPSHOT_SYNC');

    const fakeSnapshot = {
      locationId: locId,
      activeTokens: [{ id: 'tok-123', tokenNumber: 'A-123', state: 'WAITING', orgId: 'org-abc', locationId: locId }],
      waitingTokens: [],
      counters: []
    };

    store.applySnapshot(fakeSnapshot, genId, locId);
    expect(store.getState().syncStatus).toBe('LIVE');
    expect(store.getState().tokens.length).toBe(1);
    expect(store.getState().tokens[0].id).toBe('tok-123');
  });

  it('4 & 5 & 6. Buffers events during SNAPSHOT_SYNC and replays them in order', () => {
    const genId = store.startSyncCycle(locId);
    
    // Simulate events arriving before snapshot returns
    store.handleRealtimeEvent({ eventId: 'ev-1', eventType: 'TOKEN_CALLED', tokenId: 'tok-1', locationId: locId, tokenNumber: 'A-001' }, locId);
    store.handleRealtimeEvent({ eventId: 'ev-2', eventType: 'TOKEN_SERVING_STARTED', tokenId: 'tok-1', locationId: locId }, locId);
    
    // Internal buffer should have them, but state should not be mutated yet
    expect(store.getState().tokens.find(t => t.id === 'tok-1')).toBeUndefined();

    const fakeSnapshot = {
      locationId: locId,
      activeTokens: [{ id: 'tok-1', tokenNumber: 'A-001', state: 'WAITING', orgId: 'org-abc', locationId: locId }],
      waitingTokens: [],
      counters: []
    };

    // Applying snapshot should apply the buffer
    store.applySnapshot(fakeSnapshot, genId, locId);
    
    const token = store.getState().tokens.find(t => t.id === 'tok-1');
    expect(token).toBeDefined();
    // It should be IN_SERVICE because EV-1 made it CALLED and EV-2 made it SERVING_STARTED
    expect(token?.state).toBe('IN_SERVICE');
  });

  it('7. Duplicate event ID is ignored', () => {
    store.startSyncCycle(locId);
    store.applySnapshot({ locationId: locId }, 1, locId);
    expect(store.getState().syncStatus).toBe('LIVE');

    store.handleRealtimeEvent({ eventId: 'ev-dup', eventType: 'TOKEN_CALLED', tokenId: 'tok-dup', locationId: locId, tokenNumber: 'D-001' }, locId);
    expect(store.getState().tokens.find(t => t.id === 'tok-dup')).toBeDefined();

    const currentLen = store.getState().tokens.length;
    // Sending it again should have no effect (no crash, no duplicate creation if it was missing, etc.)
    store.handleRealtimeEvent({ eventId: 'ev-dup', eventType: 'TOKEN_COMPLETED', tokenId: 'tok-dup', locationId: locId }, locId);
    
    // Token should still be CALLED, not COMPLETED
    expect(store.getState().tokens.find(t => t.id === 'tok-dup')?.state).toBe('CALLED');
  });

  it('8. Wrong-location event is ignored', () => {
    store.startSyncCycle(locId);
    store.applySnapshot({ locationId: locId }, 1, locId);

    // Give it a different expected location vs event location
    store.handleRealtimeEvent({ eventId: 'ev-wrong', eventType: 'TOKEN_CALLED', tokenId: 'tok-wrong', locationId: 'loc-other', tokenNumber: 'W-001' }, locId);
    
    expect(store.getState().tokens.find(t => t.id === 'tok-wrong')).toBeUndefined();
  });

  it('9. Malformed event is safely ignored', () => {
    store.startSyncCycle(locId);
    store.applySnapshot({ locationId: locId }, 1, locId);

    // Missing eventType, tokenId, etc.
    expect(() => {
      store.handleRealtimeEvent({ eventId: 'ev-bad', locationId: locId }, locId);
      store.handleRealtimeEvent(null, locId);
      store.handleRealtimeEvent(undefined, locId);
    }).not.toThrow();
  });

  it('10. Snapshot location mismatch is rejected', () => {
    const genId = store.startSyncCycle(locId);
    store.applySnapshot({ locationId: 'wrong-loc' }, genId, locId);
    
    expect(store.getState().syncStatus).toBe('ERROR');
  });

  it('11. Disconnect enters RECONNECTING', () => {
    store.setSyncStatus('RECONNECTING');
    expect(store.getState().syncStatus).toBe('RECONNECTING');
  });

  it('13 & 14 & 15. Reconnect creates new generation, old snapshot cannot overwrite', () => {
    const gen1 = store.startSyncCycle(locId);
    
    // Reconnect happens, creates new generation
    const gen2 = store.startSyncCycle(locId);
    expect(gen2).toBeGreaterThan(gen1);

    // Old async snapshot arrives for gen1
    store.applySnapshot({ locationId: locId, activeTokens: [{ id: 'tok-old', tokenNumber: 'OLD-1' }] }, gen1, locId);
    
    // Should be ignored
    expect(store.getState().syncStatus).toBe('SNAPSHOT_SYNC'); // Still waiting for gen2 snapshot
    expect(store.getState().tokens.find(t => t.id === 'tok-old')).toBeUndefined();

    // New snapshot arrives
    store.applySnapshot({ locationId: locId, activeTokens: [{ id: 'tok-new', tokenNumber: 'NEW-1' }] }, gen2, locId);
    expect(store.getState().syncStatus).toBe('LIVE');
    expect(store.getState().tokens.find(t => t.id === 'tok-new')).toBeDefined();
  });

  it('16. Websocket event after LIVE updates state directly', () => {
    store.startSyncCycle(locId);
    store.applySnapshot({ locationId: locId }, 1, locId);

    store.handleRealtimeEvent({ eventId: 'ev-live', eventType: 'TOKEN_CALLED', tokenId: 'tok-live', tokenNumber: 'L-001', locationId: locId }, locId);
    expect(store.getState().tokens.find(t => t.id === 'tok-live')?.state).toBe('CALLED');
  });

  it('17 & 18 & 19 & 20 & 21. All Event Type Mappings', () => {
    store.startSyncCycle(locId);
    store.applySnapshot({ 
      locationId: locId,
      counters: [{ number: 1, name: 'Counter 1' }]
    }, 1, locId);

    // Setup token
    store.handleRealtimeEvent({ eventId: 'e1', eventType: 'TOKEN_CALLED', tokenId: 't1', tokenNumber: 'T-1', locationId: locId, counterNumber: 1 }, locId);
    let t = store.getState().tokens.find(x => x.id === 't1');
    expect(t?.state).toBe('CALLED');
    expect(t?.counterNumber).toBe(1);
    expect(store.getState().counters.find(c => c.number === 1)?.currentServingTokenId).toBe('t1');
    expect(store.getState().counters.find(c => c.number === 1)?.serviceStartTime).toBeUndefined(); // Semantic rule

    store.handleRealtimeEvent({ eventId: 'e2', eventType: 'TOKEN_RECALLED', tokenId: 't1', locationId: locId }, locId);
    t = store.getState().tokens.find(x => x.id === 't1');
    expect(t?.state).toBe('CALLED'); // Remains called
    expect(store.getState().counters.find(c => c.number === 1)?.serviceStartTime).toBeUndefined(); // Still undefined

    store.handleRealtimeEvent({ eventId: 'e3', eventType: 'TOKEN_SERVING_STARTED', tokenId: 't1', locationId: locId }, locId);
    t = store.getState().tokens.find(x => x.id === 't1');
    expect(t?.state).toBe('IN_SERVICE');
    expect(store.getState().counters.find(c => c.number === 1)?.serviceStartTime).toBeDefined(); // Now defined

    store.handleRealtimeEvent({ eventId: 'e4', eventType: 'TOKEN_COMPLETED', tokenId: 't1', locationId: locId }, locId);
    // Should be moved to history
    expect(store.getState().tokens.find(x => x.id === 't1')).toBeUndefined();
    expect(store.getState().historyTokens.find(x => x.id === 't1')?.state).toBe('COMPLETED');
    expect(store.getState().counters.find(c => c.number === 1)?.currentServingTokenId).toBeUndefined();
    expect(store.getState().counters.find(c => c.number === 1)?.serviceStartTime).toBeUndefined(); // Cleared
    
    // Setup another token for NO_SHOW
    store.handleRealtimeEvent({ eventId: 'e5', eventType: 'TOKEN_CALLED', tokenId: 't2', tokenNumber: 'T-2', locationId: locId, counterNumber: 1 }, locId);
    store.handleRealtimeEvent({ eventId: 'e6', eventType: 'TOKEN_NO_SHOW', tokenId: 't2', locationId: locId }, locId);
    expect(store.getState().tokens.find(x => x.id === 't2')).toBeUndefined();
    expect(store.getState().historyTokens.find(x => x.id === 't2')?.state).toBe('NO_SHOW');
  });

  it('24. Processed-event memory remains bounded', () => {
    store.startSyncCycle(locId);
    store.applySnapshot({ locationId: locId }, 1, locId);

    // Send 505 unique events
    for (let i = 0; i < 505; i++) {
      store.handleRealtimeEvent({
        eventId: `ev-bound-${i}`,
        eventType: 'TOKEN_CALLED',
        tokenId: `t-${i}`,
        tokenNumber: `T-${i}`,
        locationId: locId
      }, locId);
    }
    
    // Verify first event is forgotten
    // We can't access private processedEvents, but we can verify it processes ev-bound-0 again
    // However, if we process it again, we'll see a state change or an error.
    // If it was still in the cache, it would be ignored.
    const beforeCount = store.getState().tokens.length;
    // Sending it again
    store.handleRealtimeEvent({
        eventId: `ev-bound-0`,
        eventType: 'TOKEN_COMPLETED',
        tokenId: `t-0`,
        locationId: locId
    }, locId);
    
    // Because it fell out of the LRU buffer (size 500), it should be processed and the token removed.
    expect(store.getState().tokens.length).toBeLessThan(beforeCount);
  });

  it('25. Realtime internals are not persisted to localStorage', () => {
    store.startSyncCycle(locId);
    store.handleRealtimeEvent({ eventId: 'ev-test', eventType: 'TOKEN_CALLED', tokenId: 't1', tokenNumber: 'T-1', locationId: locId }, locId);
    
    const savedJson = localStorage.getItem('align_qms_state_v1');
    expect(savedJson).toBeDefined();
    if (savedJson) {
      const parsed = JSON.parse(savedJson);
      expect(parsed.eventBuffer).toBeUndefined();
      expect(parsed.processedEvents).toBeUndefined();
      expect(parsed.syncGenerationId).toBeUndefined();
      expect(parsed.syncStatus).toBe('SNAPSHOT_SYNC');
    }
  });

});
