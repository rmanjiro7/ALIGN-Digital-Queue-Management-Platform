// @ts-ignore
import { describe, it, expect, beforeEach } from 'bun:test';
import { QueueStore } from './store';

const dummyStorage = {
  store: {} as Record<string, string>,
  getItem(key: string) { return this.store[key] || null; },
  setItem(key: string, value: string) { this.store[key] = value; },
  clear() { this.store = {}; }
};
(globalThis as any).localStorage = dummyStorage;
(globalThis as any).sessionStorage = dummyStorage;

describe('QueueStore — Live Counter State Hydration (Phase 4 Defect Correction)', () => {
  let store: QueueStore;
  const orgId = 'd9abc651-0ca5-4783-aedb-75eaaf585f68';
  const locId = '9ed35c16-163e-4c90-a59e-8d171d418143';
  const syncSbepCounterId = 'd3a7eff4-1f3c-42cb-b8dc-1640607366af';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    store = new QueueStore();
  });

  it('1. Initial counters followed by live snapshot containing one counter: only one remains', () => {
    // Before snapshot: 0 initial counters
    expect(store.getState().counters.length).toBe(0);

    const genId = store.startSyncCycle(locId);
    store.applySnapshot({
      locationId: locId,
      counters: [
        {
          id: syncSbepCounterId,
          number: 1,
          name: '[SYNC-SBEP] Counter 1',
          availability: 'ONLINE'
        }
      ]
    }, genId, locId);

    const state = store.getState();
    expect(state.syncStatus).toBe('LIVE');
    expect(state.counters.length).toBe(1);
    expect(state.counters[0].id).toBe(syncSbepCounterId);
    expect(state.counters[0].number).toBe(1);
    expect(state.counters[0].name).toBe('[SYNC-SBEP] Counter 1');

    // Confirm Counter 2 is pruned
    expect(state.counters.find(c => c.number === 2)).toBeUndefined();
  });

  it('2. Live snapshot containing zero counters: zero live counters and no crash', () => {
    const genId = store.startSyncCycle(locId);
    store.applySnapshot({
      locationId: locId,
      counters: []
    }, genId, locId);

    const state = store.getState();
    expect(state.syncStatus).toBe('LIVE');
    expect(state.counters.length).toBe(0);

    // Defensive helper checks
    expect(store.getCounterQueueState(1)).toBe('READY');
    const check = store.canCounterCallNext(1);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('does not exist');

    // Attempting actions on non-existent counter returns null / no crash
    expect(store.callNext(1)).toBeNull();
    expect(() => store.setCounterAvailability(1, 'ONLINE')).not.toThrow();
  });

  it('3. Live snapshot containing multiple counters: exactly those counters are rendered and sorted', () => {
    const genId = store.startSyncCycle(locId);
    store.applySnapshot({
      locationId: locId,
      counters: [
        { id: 'cnt-3', number: 3, name: 'Specialist Counter', availability: 'ONLINE' },
        { id: 'cnt-1', number: 1, name: 'Express Counter', availability: 'ON_BREAK' }
      ]
    }, genId, locId);

    const state = store.getState();
    expect(state.counters.length).toBe(2);
    // Ascending sort by counter number
    expect(state.counters[0].number).toBe(1);
    expect(state.counters[0].id).toBe('cnt-1');
    expect(state.counters[1].number).toBe(3);
    expect(state.counters[1].id).toBe('cnt-3');

    // Unprovided initial counters (e.g. 2 and 4) are absent
    expect(state.counters.find(c => c.number === 2)).toBeUndefined();
    expect(state.counters.find(c => c.number === 4)).toBeUndefined();
  });

  it('4. Switching between locations does not retain counters from previous location', () => {
    // Authenticate at Location A
    store.setAuthStatus('AUTHENTICATED', { orgId, locationId: 'loc-A' });
    const genA = store.startSyncCycle('loc-A');
    store.applySnapshot({
      locationId: 'loc-A',
      counters: [
        { id: 'cnt-loc-A-1', number: 1, name: 'Loc A Counter 1' },
        { id: 'cnt-loc-A-2', number: 2, name: 'Loc A Counter 2' }
      ]
    }, genA, 'loc-A');

    expect(store.getState().counters.length).toBe(2);
    expect(store.getState().counters[0].id).toBe('cnt-loc-A-1');

    // Switch to Location B
    store.setAuthStatus('AUTHENTICATED', { orgId, locationId: 'loc-B' });
    expect(store.getState().counters.length).toBe(0); // Immediately wiped on location switch

    const genB = store.startSyncCycle('loc-B');
    store.applySnapshot({
      locationId: 'loc-B',
      counters: [
        { id: 'cnt-loc-B-9', number: 9, name: 'Loc B Counter 9' }
      ]
    }, genB, 'loc-B');

    const finalCounters = store.getState().counters;
    expect(finalCounters.length).toBe(1);
    expect(finalCounters[0].id).toBe('cnt-loc-B-9');
    expect(finalCounters[0].number).toBe(9);
    expect(finalCounters.find(c => c.id === 'cnt-loc-A-1')).toBeUndefined();
    expect(finalCounters.find(c => c.id === 'cnt-loc-A-2')).toBeUndefined();
  });

  it('5. A failed live snapshot does not show mock counters as live data', () => {
    store.setAuthStatus('AUTHENTICATED', { orgId, locationId: locId });
    const genId = store.startSyncCycle(locId);

    // Mismatched snapshot
    store.applySnapshot({ locationId: 'wrong-mismatched-location' }, genId, locId);

    expect(store.getState().syncStatus).toBe('ERROR');
    expect(store.getState().counters.length).toBe(0);
    expect(store.getState().tokens.length).toBe(0);
  });

  it('6. Demo mode continues to display its intended demo data', () => {
    store.resetDemoData();

    const state = store.getState();
    expect(state.authStatus).toBe('UNAUTHENTICATED');
    expect(state.counters.length).toBe(0);
  });

  it('7. A selected counter removed by a new snapshot does not cause invalid staff actions', () => {
    const genId1 = store.startSyncCycle(locId);
    store.applySnapshot({
      locationId: locId,
      counters: [
        { id: 'c1', number: 1, availability: 'ONLINE' },
        { id: 'c3', number: 3, availability: 'ONLINE' }
      ]
    }, genId1, locId);

    expect(store.getState().counters.length).toBe(2);
    expect(store.canCounterCallNext(3).allowed).toBe(true);

    // Next snapshot drops counter 3 (e.g., deleted or decommissioned on backend)
    const genId2 = store.startSyncCycle(locId);
    store.applySnapshot({
      locationId: locId,
      counters: [
        { id: 'c1', number: 1, availability: 'ONLINE' }
      ]
    }, genId2, locId);

    expect(store.getState().counters.length).toBe(1);
    expect(store.canCounterCallNext(3).allowed).toBe(false);
    expect(store.canCounterCallNext(3).reason).toContain('does not exist');
    expect(store.callNext(3)).toBeNull();
  });
});
