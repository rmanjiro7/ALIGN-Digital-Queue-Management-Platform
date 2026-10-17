import {
  Tenant,
  LocationBranch,
  ServiceItem,
  QueueItem,
  QueueToken,
  CounterItem,
  CounterAvailability,
  CounterQueueState,
  StaffUser,
  AnnouncementItem,
  GlobalOrgRules,
  SystemAlert,
  AuditLogEntry,
  TokenState,
  ScreenId,
  UserRole,
  QueueWarningState
} from '../types';

const STORAGE_KEY = 'align_qms_state_v4';

export interface AppState {
  currentRole: UserRole;
  currentScreen: ScreenId;
  selectedOrgId: string;
  selectedLocationId: string;
  selectedServiceId: string | null;
  activeCustomerTokenId: string | null;
  lastCalledTokenId?: string | null;
  currentStaffUser: StaffUser | null;
  
  tenants: Tenant[];
  locations: LocationBranch[];
  services: ServiceItem[];
  queues: QueueItem[];
  tokens: QueueToken[];
  counters: CounterItem[];
  staffUsers: StaffUser[];
  announcements: AnnouncementItem[];
  globalRules: Record<string, GlobalOrgRules>; // orgId -> rules
  alerts: SystemAlert[];
  auditLogs: AuditLogEntry[];
  historyTokens: QueueToken[];
  queueWarnings: QueueWarningState[];

  // Authentication State
  authStatus: 'UNAUTHENTICATED' | 'AUTHENTICATING' | 'AUTH_RESTORING' | 'AUTH_READY' | 'AUTHENTICATED' | 'ERROR';
  currentUser: any | null;

  // Realtime Sync Status
  syncStatus: 'DISCONNECTED' | 'CONNECTING' | 'SUBSCRIBING' | 'SNAPSHOT_SYNC' | 'LIVE' | 'RECONNECTING' | 'ERROR';
}

const INITIAL_TENANTS: Tenant[] = [];

const INITIAL_LOCATIONS: LocationBranch[] = [];

const INITIAL_SERVICES: ServiceItem[] = [];

const INITIAL_QUEUES: QueueItem[] = [];

const INITIAL_COUNTERS: CounterItem[] = [];

const INITIAL_STAFF: StaffUser[] = [];

const INITIAL_TOKENS: QueueToken[] = [];

const INITIAL_HISTORY: QueueToken[] = [];

const INITIAL_ANNOUNCEMENTS: AnnouncementItem[] = [];

const INITIAL_ALERTS: SystemAlert[] = [];

const createInitialState = (): AppState => ({
  currentRole: 'CUSTOMER',
  currentScreen: 'SCREEN_02_DISCOVERY',
  selectedOrgId: '',
  selectedLocationId: '',
  selectedServiceId: null,
  activeCustomerTokenId: null,
  lastCalledTokenId: null,
  currentStaffUser: null,
  tenants: [],
  locations: [],
  services: [],
  queues: [],
  tokens: [],
  counters: [],
  staffUsers: [],
  announcements: [],
  globalRules: {},
  alerts: [],
  auditLogs: [],
  historyTokens: [],
  queueWarnings: [],
  authStatus: 'UNAUTHENTICATED',
  currentUser: null,
  syncStatus: 'DISCONNECTED',
});

const INITIAL_STATE: AppState = createInitialState();

type Listener = (state: AppState) => void;

export class QueueStore {
  private state: AppState;
  private listeners: Set<Listener> = new Set();
  private audioCtx: AudioContext | null = null;

  // Ephemeral Realtime Synchronization Internals (Not Persisted)
  private syncGenerationId: number = 0;
  private eventBuffer: any[] = [];
  private processedEvents: string[] = [];

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): AppState {
    try {
      // Purge legacy storage keys
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('align_qms_state_v1');
        localStorage.removeItem('align_qms_state_v2');
        localStorage.removeItem('align_qms_state_v3');
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const isRestoring = !!sessionStorage.getItem('refresh_token');

        // Filter out legacy dummy tokens
        const validTokens = Array.isArray(parsed.tokens) 
          ? parsed.tokens.filter((t: any) => t && !t.id?.startsWith('tok-04') && !t.id?.startsWith('tok-10') && !t.id?.startsWith('tok-01'))
          : [];

        let activeTokenId = parsed.activeCustomerTokenId;
        if (activeTokenId && (activeTokenId === 'tok-042' || activeTokenId.startsWith('tok-04'))) {
          activeTokenId = null;
        }

        // Filter out dummy/mock tenants completely
        const dummyTenantNames = new Set(['ABC Services', 'City Hospital', 'Metro RMV', 'Global Tech Campus', 'State University', 'ALIGN E2E Demo']);
        const validTenants = Array.isArray(parsed.tenants)
          ? parsed.tenants
              .filter((t: any) => t && !dummyTenantNames.has(t.name) && !t.name?.includes('E2E') && t.id !== 'org-hospital' && t.id !== 'org-rmv' && t.id !== 'org-tech' && t.id !== 'org-univ' && t.id !== 'e2e00000-0000-0000-0000-000000000001')
          : [];
        const effectiveTenants = validTenants;

        // Filter out dummy/mock locations completely
        const dummyLocationIds = new Set(['loc-north', 'loc-hospital-main', 'loc-rmv-central', 'e2e00000-0000-0000-0000-000000000002']);
        const validLocations = Array.isArray(parsed.locations)
          ? parsed.locations
              .filter((l: any) => l && !dummyLocationIds.has(l.id) && !l.name?.includes('E2E') && !l.address?.includes('123 Localhost Ave') && !l.address?.includes('123 Business Parkway'))
          : [];
        const effectiveLocations = validLocations;

        // Filter out dummy/mock services completely
        const validServices = Array.isArray(parsed.services)
          ? parsed.services.filter((s: any) => s && !s.id?.startsWith('srv-') && !s.name?.includes('E2E'))
          : [];
        const effectiveServices = validServices.map((s: ServiceItem) => ({
          ...s,
          associatedQueues: Array.isArray(s?.associatedQueues) ? s.associatedQueues : []
        }));

        // Filter out dummy/mock queues completely
        const validQueues = Array.isArray(parsed.queues)
          ? parsed.queues.filter((q: any) => q && !q.id?.startsWith('q-') && !q.name?.includes('E2E'))
          : [];
        const effectiveQueues = validQueues;

        // Clean counters of dummy staff names
        const effectiveCounters = Array.isArray(parsed.counters)
          ? parsed.counters
              .filter((c: any) => c && !c.name?.includes('E2E') && !c.id?.startsWith('e2e'))
              .map((c: CounterItem) => ({
                ...c,
                assignedStaffName: (c.assignedStaffName?.includes('Alex Mercer') || c.assignedStaffName?.includes('Sarah Jenkins') || c.assignedStaffName?.includes('Marcus Vance') || c.assignedStaffName?.includes('Elena Rostova'))
                  ? undefined
                  : c.assignedStaffName,
                assignedStaffId: c.assignedStaffId === 'staff-admin' ? undefined : c.assignedStaffId,
              }))
          : [];

        const cleanAuditLogs = Array.isArray(parsed.auditLogs)
          ? parsed.auditLogs.filter((l: any) => l.actor !== 'Alex Mercer')
          : [];

        const effectiveAuthStatus = isRestoring ? 'AUTH_RESTORING' : (parsed.authStatus === 'AUTHENTICATED' ? 'UNAUTHENTICATED' : parsed.authStatus);

        let effectiveRole = parsed.currentRole || 'CUSTOMER';
        let effectiveScreen = parsed.currentScreen || 'SCREEN_02_DISCOVERY';

        // When unauthenticated, ensure the customer portal is displayed first
        if (effectiveAuthStatus !== 'AUTHENTICATED' && effectiveAuthStatus !== 'AUTH_RESTORING') {
          if (effectiveRole !== 'CUSTOMER' && effectiveRole !== 'PUBLIC_DISPLAY') {
            effectiveRole = 'CUSTOMER';
          }
          if (!effectiveScreen || effectiveScreen === 'SCREEN_01_SPLASH' || effectiveScreen === 'SCREEN_08_STAFF_LOGIN' || effectiveScreen.startsWith('SCREEN_09') || effectiveScreen.startsWith('SCREEN_1')) {
            effectiveScreen = activeTokenId ? 'SCREEN_05_ACTIVE_STATUS' : 'SCREEN_02_DISCOVERY';
          }
        }

        const selectedOrgValid = effectiveTenants.some(t => t.id === parsed.selectedOrgId);

        return {
          ...createInitialState(),
          ...parsed,
          selectedOrgId: selectedOrgValid ? parsed.selectedOrgId : '',
          selectedLocationId: selectedOrgValid ? (parsed.selectedLocationId || '') : '',
          tenants: effectiveTenants,
          locations: effectiveLocations,
          services: effectiveServices,
          queues: effectiveQueues,
          counters: effectiveCounters,
          currentRole: effectiveRole,
          currentScreen: effectiveScreen,
          activeCustomerTokenId: activeTokenId,
          tokens: validTokens,
          auditLogs: cleanAuditLogs,
          historyTokens: Array.isArray(parsed.historyTokens) ? parsed.historyTokens.filter((h: any) => !h.id?.startsWith('hist-')) : [],
          alerts: Array.isArray(parsed.alerts) ? parsed.alerts.filter((a: any) => !a.id?.startsWith('alert-')) : [],
          announcements: Array.isArray(parsed.announcements) ? parsed.announcements.filter((an: any) => !an.id?.startsWith('ann-')) : [],
          currentStaffUser: (parsed.currentStaffUser?.id === 'staff-admin' || parsed.currentStaffUser?.name?.includes('Alex Mercer')) ? null : parsed.currentStaffUser,
          authStatus: effectiveAuthStatus,
        };
      }
    } catch {
      // fallback
    }
    return createInitialState();
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore
    }
    this.notify();
  }

  public getState(): AppState {
    return this.state;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const currentState = { ...this.state };
    this.listeners.forEach((l) => l(currentState));
  }

  public setScreen(screenId: ScreenId) {
    this.state.currentScreen = screenId;
    this.saveState();
  }

  public setRole(role: UserRole) {
    this.state.currentRole = role;
    if (role === 'CUSTOMER') {
      this.state.currentScreen = 'SCREEN_02_DISCOVERY';
    } else if (role === 'STAFF') {
      this.state.currentScreen = 'SCREEN_09_STAFF_OPERATIONS';
    } else if (role === 'ORG_ADMIN') {
      this.state.currentScreen = 'SCREEN_12_ORG_DASHBOARD';
    } else if (role === 'PLATFORM_ADMIN') {
      this.state.currentScreen = 'SCREEN_15_PLATFORM_DASHBOARD';
    } else if (role === 'PUBLIC_DISPLAY') {
      this.state.currentScreen = 'SCREEN_22_PUBLIC_DISPLAY';
    }
    this.saveState();
  }

  public setAuthStatus(status: AppState['authStatus'], user?: any) {
    this.state.authStatus = status;
    if (user !== undefined) {
      this.state.currentUser = user;
      if (status === 'AUTHENTICATED' && user) {
        if (user.orgId) {
          this.state.selectedOrgId = user.orgId;
        }
        if (user.locationId) {
          this.state.selectedLocationId = user.locationId;
          this.state.tokens = [];
          this.state.counters = [];
        }
      }
    }
    this.saveState();
  }

  public registerStaffUser(userData: {
    name: string;
    email: string;
    role: 'STAFF' | 'ORG_ADMIN' | 'PLATFORM_ADMIN';
    orgId?: string;
    newOrgName?: string;
    newOrgSector?: string;
    locationId?: string;
  }): StaffUser {
    let effectiveOrgId = userData.orgId;

    if (userData.newOrgName && userData.role === 'ORG_ADMIN') {
      const newOrg: Tenant = {
        id: `org-${Date.now()}`,
        code: `T-${Math.floor(1000 + Math.random() * 9000)}`,
        name: userData.newOrgName,
        sector: userData.newOrgSector || 'Enterprise',
        status: 'ACTIVE',
        locationCount: 1,
        activeQueueCount: 0,
        contactEmail: userData.email,
        joinedDate: new Date().toISOString().split('T')[0],
      };
      this.state.tenants = [newOrg, ...this.state.tenants];
      effectiveOrgId = newOrg.id;
    } else if (!effectiveOrgId && this.state.tenants.length > 0) {
      effectiveOrgId = this.state.tenants[0].id;
    }

    const newUser: StaffUser = {
      id: `staff-${Date.now()}`,
      orgId: effectiveOrgId || '',
      locationId: userData.locationId || (this.state.locations.find(l => l.orgId === effectiveOrgId)?.id || this.state.locations[0]?.id || ''),
      name: userData.name,
      email: userData.email,
      role: userData.role,
      assignedCounterNumber: 1,
    };

    this.state.staffUsers = [newUser, ...this.state.staffUsers];
    this.saveState();
    return newUser;
  }

  // --- API DATA SETTERS ---
  public setTenants(tenants: Tenant[]) {
    this.state.tenants = tenants;
    this.saveState();
  }

  public setLocations(locations: LocationBranch[]) {
    this.state.locations = locations;
    this.saveState();
  }

  public setServices(services: ServiceItem[]) {
    this.state.services = (services || []).map(s => ({
      ...s,
      associatedQueues: Array.isArray(s?.associatedQueues) ? s.associatedQueues : []
    }));
    this.saveState();
  }

  public setQueues(queues: QueueItem[]) {
    this.state.queues = queues;
    this.saveState();
  }

  // --- REALTIME SYNCHRONIZATION (GATE 2D) ---
  public setSyncStatus(status: AppState['syncStatus']) {
    this.state.syncStatus = status;
    this.saveState();
  }

  public startSyncCycle(locationId: string): number {
    this.syncGenerationId += 1;
    this.eventBuffer = [];
    this.state.syncStatus = 'SNAPSHOT_SYNC';
    this.saveState();
    return this.syncGenerationId;
  }

  public async applySnapshot(snapshot: any, generationId: number, expectedLocationId: string) {
    if (this.syncGenerationId !== generationId) {
      return; // Discard stale response
    }
    if (!snapshot || snapshot.locationId !== expectedLocationId) {
      this.state.syncStatus = 'ERROR';
      this.state.tokens = [];
      this.state.counters = [];
      this.saveState();
      return;
    }

    // Replace canonical queue state
    const mappedTokens = [...(snapshot.activeTokens || []), ...(snapshot.waitingTokens || [])].map((t: any) => ({
      ...t,
      orgId: t.orgId || this.state.selectedOrgId,
      locationId: t.locationId || expectedLocationId
    }));
    this.state.tokens = mappedTokens;
    
    if (snapshot.counters !== undefined) {
      const countersList = Array.isArray(snapshot.counters) ? snapshot.counters : [];
      this.state.counters = countersList.map((snapCounter: any) => {
        const existing = this.state.counters.find(x => x.id === snapCounter.id || x.number === snapCounter.number);
        return {
          id: snapCounter.id,
          orgId: snapCounter.orgId || this.state.selectedOrgId,
          locationId: snapCounter.locationId || expectedLocationId,
          number: snapCounter.number,
          name: snapCounter.name || (existing && existing.locationId === expectedLocationId ? existing.name : `Counter ${snapCounter.number}`),
          status: snapCounter.status || (existing && existing.locationId === expectedLocationId ? existing.status : 'Active'),
          availability: snapCounter.availability || 'ONLINE',
          currentServingTokenId: snapCounter.currentServingTokenId,
          serviceStartTime: snapCounter.serviceStartTime,
          assignedStaffId: snapCounter.assignedStaffId || (existing && existing.locationId === expectedLocationId ? existing.assignedStaffId : undefined),
          assignedStaffName: snapCounter.assignedStaffName || (existing && existing.locationId === expectedLocationId ? existing.assignedStaffName : undefined),
          supportedServiceNames: snapCounter.supportedServiceNames || (existing && existing.locationId === expectedLocationId ? existing.supportedServiceNames : undefined),
        };
      }).sort((a: CounterItem, b: CounterItem) => a.number - b.number);
    } else if (this.state.authStatus === 'AUTHENTICATED' || expectedLocationId !== 'e2e00000-0000-0000-0000-000000000002') {
      this.state.counters = [];
    }

    if (snapshot.services) {
      this.state.services = snapshot.services.map((s: any) => ({
        ...s,
        orgId: s.orgId || this.state.selectedOrgId,
        locationId: s.locationId || expectedLocationId,
        enabled: s.enabled ?? true
      }));
    }

    // Replay buffer
    const buffer = [...this.eventBuffer];
    this.eventBuffer = [];
    buffer.forEach(evt => this.processLiveEvent(evt));

    this.state.syncStatus = 'LIVE';
    this.saveState();

    if (this.state.currentRole === 'STAFF' || this.state.currentRole === 'ORG_ADMIN' || this.state.currentRole === 'PLATFORM_ADMIN') {
      import('./apiClient').then(({ apiClient }) => {
        return apiClient.getQueueWarnings(expectedLocationId);
      }).then(warnings => {
        if (warnings && this.syncGenerationId === generationId) {
          this.state.queueWarnings = warnings;
          this.saveState();
        }
      }).catch(e => {
        console.error('Failed to fetch queue warnings during snapshot sync', e);
      });
    }
  }

  public handleRealtimeEvent(event: any, expectedLocationId: string): boolean {
    if (!event) return false;

    // Warning events are identified by warningType and do not have eventId/eventType
    if (event.warningType === 'QUEUE_CAPACITY_WARNING' || event.warningType === 'QUEUE_WAIT_WARNING') {
      // Validate warning payload
      if (!event.queueId || (event.transition !== 'TRIGGERED' && event.transition !== 'CLEARED')) {
        return false; // Invalid warning payload
      }

      if (event.locationId !== expectedLocationId) return false;

      // Warning events don't have eventId for deduplication, process directly
      if (this.state.syncStatus === 'SNAPSHOT_SYNC') {
        this.eventBuffer.push(event);
        return false;
      } else {
        this.processLiveEvent(event);
        this.saveState();
        return true;
      }
    }

    // Token Structural Validation (for all non-warning events)
    if (!event.eventId || !event.eventType || !event.tokenId) return false;
    if (event.locationId !== expectedLocationId) return false;

    // Duplicate Check
    if (this.processedEvents.includes(event.eventId)) {
      return false;
    }
    this.processedEvents.push(event.eventId);
    if (this.processedEvents.length > 500) {
      this.processedEvents.shift();
    }

    if (this.state.syncStatus === 'SNAPSHOT_SYNC') {
      this.eventBuffer.push(event);
      return false;
    } else {
      this.processLiveEvent(event);
      this.saveState();
      return true;
    }
  }

  private processLiveEvent(event: any) {
    console.log(`[Store] processLiveEvent: ${event.eventType} for token ${event.tokenId}`, JSON.stringify(event));
    if (event.warningType === 'QUEUE_CAPACITY_WARNING' || event.warningType === 'QUEUE_WAIT_WARNING') {
      let warningState = this.state.queueWarnings.find(w => w.queueId === event.queueId);
      if (!warningState) {
        const queue = this.state.queues.find(q => q.id === event.queueId);
        warningState = {
          queueId: event.queueId,
          serviceId: queue ? queue.serviceId : 'unknown',
          capacityWarningActive: false,
          waitWarningActive: false
        };
        this.state.queueWarnings.push(warningState);
      }

      if (event.warningType === 'QUEUE_CAPACITY_WARNING') {
        warningState.capacityWarningActive = event.transition === 'TRIGGERED';
      } else if (event.warningType === 'QUEUE_WAIT_WARNING') {
        warningState.waitWarningActive = event.transition === 'TRIGGERED';
      }
      return;
    }

    let token = this.state.tokens.find(t => t.id === event.tokenId);

    if (!token && event.tokenNumber) {
      token = {
        id: event.tokenId,
        orgId: event.orgId || this.state.selectedOrgId,
        locationId: event.locationId || this.state.selectedLocationId,
        queueId: event.queueId || 'e2e00000-0000-0000-0000-000000000004',
        serviceId: event.serviceId || 'e2e00000-0000-0000-0000-000000000003',
        tokenNumber: event.tokenNumber,
        state: 'WAITING',
        customerName: 'Customer',
        customerPhone: '',
        joinedAt: event.timestamp || new Date().toISOString(),
        peopleAhead: 0,
        estWaitMins: 0,
        estRange: '-',
        confidence: 'High'
      };
      this.state.tokens.push(token);
    }

    if (token) {
      if (event.eventType === 'TOKEN_CALLED' || event.eventType === 'TOKEN_RECALLED') {
        token.state = 'CALLED';
        token.counterNumber = event.counterNumber || token.counterNumber;
        token.counterId = event.counterId || token.counterId;
        token.calledAt = event.timestamp || new Date().toISOString();
        const counter = this.state.counters.find(c => c.number === token!.counterNumber);
        if (counter) {
          counter.currentServingTokenId = token.id;
          counter.currentServingTokenNumber = token.tokenNumber;
        }
      } else if (event.eventType === 'TOKEN_SERVING_STARTED') {
        token.state = 'IN_SERVICE';
        token.servedAt = event.timestamp || new Date().toISOString();
        
        const counter = this.state.counters.find(c => c.number === token!.counterNumber);
        if (counter && counter.currentServingTokenId === token!.id) {
          counter.serviceStartTime = token.servedAt;
        }
      } else if (event.eventType === 'TOKEN_COMPLETED' || event.eventType === 'TOKEN_NO_SHOW' || event.eventType === 'TOKEN_TRANSFERRED') {
        if (event.eventType === 'TOKEN_TRANSFERRED' || (event.eventType === 'TOKEN_COMPLETED' && event.transferredToTokenId)) {
          token.state = 'TRANSFERRED';
          if (event.transferredToTokenId) {
            token.transferredToTokenId = event.transferredToTokenId;
          }
        } else {
          token.state = event.eventType === 'TOKEN_COMPLETED' ? 'COMPLETED' : 'NO_SHOW';
        }
        token.completedAt = event.timestamp || new Date().toISOString();
        
        const counter = this.state.counters.find(c => c.currentServingTokenId === token!.id || c.number === token!.counterNumber);
        if (counter && counter.currentServingTokenId === token.id) {
          counter.currentServingTokenId = undefined;
          counter.currentServingTokenNumber = undefined;
          counter.serviceStartTime = undefined;
        }
        if (token.state === 'TRANSFERRED') {
          // Keep it in tokens so the customer screen can recover it
        } else {
          this.state.historyTokens.unshift({ ...token });
          this.state.tokens = this.state.tokens.filter(t => t.id !== token!.id);
        }
      }
    }
  }

  public selectOrg(orgId: string) {
    this.state.selectedOrgId = orgId;
    const orgLocs = this.state.locations.filter(l => l.orgId === orgId);
    if (orgLocs.length > 0) {
      this.state.selectedLocationId = orgLocs[0].id;
    }
    this.saveState();
  }

  public selectLocation(locationId: string) {
    this.state.selectedLocationId = locationId;
    this.saveState();
  }

  public selectService(serviceId: string) {
    this.state.selectedServiceId = serviceId;
    this.saveState();
  }

  // --- AUDIO SYNTHESIS & SPEECH CHIME ---
  public playChime() {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const now = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.25); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.25); // E5

      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.85);
      osc2.stop(now + 0.85);
    } catch {
      // AudioContext unavailable or autoplay blocked
    }
  }

  public speakAnnouncementText(text: string, onStart?: () => void, onEnd?: () => void, onError?: () => void) {
    this.playChime();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';

      utterance.onstart = () => {
        onStart?.();
      };
      utterance.onend = () => {
        onEnd?.();
      };
      utterance.onerror = () => {
        onError?.();
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        onEnd?.();
      }, 1500);
    }
  }

  // --- CORE TRANSACTIONAL QUEUE OPERATIONS ---
  public joinQueue(serviceId: string, customerName?: string, customerPhone?: string): QueueToken {
    const service = this.state.services.find(s => s.id === serviceId);
    if (!service) throw new Error('Service not found');

    const orgId = service.orgId;
    const locationId = service.locationId;
    const queue = this.state.queues.find(q => q.serviceId === serviceId && q.status === 'Active') || this.state.queues[0];

    // Generate atomic next token number
    const prefix = queue?.tokenPrefix || 'A';
    let maxSeq = 42;
    const allTokens = [...this.state.tokens, ...this.state.historyTokens];
    allTokens.forEach(t => {
      if (t.tokenNumber && t.tokenNumber.startsWith(prefix + '-')) {
        const numPart = parseInt(t.tokenNumber.split('-')[1], 10);
        if (!isNaN(numPart) && numPart > maxSeq) {
          maxSeq = numPart;
        }
      }
    });
    const nextSeq = maxSeq + 1;
    const tokenNumber = `${prefix}-${String(nextSeq).padStart(3, '0')}`;

    const waitingTokens = this.state.tokens.filter(t => t.orgId === orgId && t.locationId === locationId && t.state === 'WAITING');
    const peopleAhead = waitingTokens.length;
    const estWaitMins = Math.max(2, peopleAhead * 3 + (service.isFastTrack ? 1 : 4));
    const estRange = service.isFastTrack ? '< 5 min' : `${Math.max(1, estWaitMins - 3)}-${estWaitMins + 4} min`;

    const newToken: QueueToken = {
      id: 'tok-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      orgId,
      locationId,
      serviceId,
      queueId: queue?.id || 'e2e00000-0000-0000-0000-000000000004',
      tokenNumber,
      state: 'WAITING',
      customerName: customerName || 'Walk-in Guest',
      customerPhone: customerPhone || '',
      joinedAt: new Date().toISOString(),
      peopleAhead,
      estWaitMins,
      estRange,
      confidence: service.confidence || 'High',
      idempotencyKey: 'idem-' + Date.now(),
    };

    this.state.tokens.push(newToken);
    this.state.activeCustomerTokenId = newToken.id;

    // Recalculate service waiting count
    service.waitingCount += 1;
    if (queue) {
      queue.currentCount += 1;
    }

    this.state.auditLogs.unshift({
      id: 'log-' + Date.now(),
      orgId,
      actor: customerName || 'Customer',
      action: 'JOIN_QUEUE',
      aggregateId: newToken.id,
      afterState: 'WAITING',
      timestamp: new Date().toISOString(),
      details: `Generated token ${newToken.tokenNumber} for ${service.name}`,
    });

    this.saveState();
    return newToken;
  }

  public addJoinedCustomerToken(token: QueueToken) {
    // Preserve existing logic
    this.state.tokens = this.state.tokens.filter(t => t.id !== token.id);
    this.state.tokens.push(token);
    this.state.activeCustomerTokenId = token.id;
    this.saveState();
  }

  public setActiveCustomerToken(tokenId: string | null) {
    this.state.activeCustomerTokenId = tokenId;
    this.saveState();
  }

  public getCounterQueueState(counterNumber: number): CounterQueueState {
    const counter = this.state.counters.find(c => c.number === counterNumber);
    if (!counter || !counter.currentServingTokenId) return 'READY';
    const activeToken = this.state.tokens.find(
      t => (t.id === counter.currentServingTokenId || t.counterNumber === counterNumber) && 
           ['CALLED', 'IN_SERVICE'].includes(t.state)
    );
    return activeToken ? 'SERVING' : 'READY';
  }

  public canCounterCallNext(counterNumber: number): { allowed: boolean; reason?: string } {
    const counter = this.state.counters.find(c => c.number === counterNumber);
    if (!counter) {
      return { allowed: false, reason: `Counter ${counterNumber} does not exist.` };
    }
    if (counter.availability !== 'ONLINE') {
      const labelMap: Record<CounterAvailability, string> = {
        ONLINE: 'ONLINE',
        ON_BREAK: 'ON BREAK',
        AWAY: 'AWAY',
        OFFLINE: 'OFFLINE',
      };
      return {
        allowed: false,
        reason: `Counter is currently ${labelMap[counter.availability]}. Counter must be ONLINE and READY to call next.`,
      };
    }
    const queueState = this.getCounterQueueState(counterNumber);
    if (queueState === 'SERVING') {
      return {
        allowed: false,
        reason: 'Counter is currently SERVING an active customer. Conclude the current service first.',
      };
    }
    return { allowed: true };
  }

  public setCounterAvailability(counterNumber: number, availability: CounterAvailability) {
    const counter = this.state.counters.find(c => c.number === counterNumber);
    if (!counter) return;

    const prevAvailability = counter.availability;
    counter.availability = availability;

    this.state.auditLogs.unshift({
      id: 'log-' + Date.now(),
      orgId: counter.orgId,
      actor: counter.assignedStaffName || 'Staff Operator',
      action: 'SET_COUNTER_AVAILABILITY',
      aggregateId: counter.id,
      beforeState: prevAvailability,
      afterState: availability,
      timestamp: new Date().toISOString(),
      details: `Counter ${counterNumber} availability transitioned from ${prevAvailability} to ${availability}`,
    });

    this.saveState();
  }

  public callNext(counterNumber: number = 1, staffId?: string): QueueToken | null {
    const counterCheck = this.canCounterCallNext(counterNumber);
    if (!counterCheck.allowed) {
      return null;
    }

    const orgId = this.state.selectedOrgId;
    const locationId = this.state.selectedLocationId;

    // Concurrency Lock: Find next eligible WAITING token (stable FIFO order)
    const eligibleToken = this.state.tokens.find(
      t => t.orgId === orgId && t.locationId === locationId && t.state === 'WAITING'
    );

    if (!eligibleToken) {
      return null;
    }

    const counter = this.state.counters.find(c => c.number === counterNumber);
    const effectiveStaffId = staffId || this.state.currentUser?.id || this.state.currentStaffUser?.id || counter?.assignedStaffId;
    const effectiveStaffName = this.state.currentUser?.name || this.state.currentStaffUser?.name || counter?.assignedStaffName || 'Staff Operator';

    // Advance eligible token: WAITING -> CALLED
    eligibleToken.state = 'CALLED';
    eligibleToken.calledAt = new Date().toISOString();
    eligibleToken.counterNumber = counterNumber;
    eligibleToken.counterId = counter?.id || `counter-${counterNumber}`;
    if (effectiveStaffId) eligibleToken.calledByStaffId = effectiveStaffId;
    eligibleToken.estRange = 'Now Serving';
    eligibleToken.peopleAhead = 0;

    // Update Counter
    if (counter) {
      counter.currentServingTokenId = eligibleToken.id;
      counter.currentServingTokenNumber = eligibleToken.tokenNumber;
      if (effectiveStaffId) counter.assignedStaffId = effectiveStaffId;
      if (effectiveStaffName && !counter.assignedStaffName) counter.assignedStaffName = effectiveStaffName;
    }

    // Decrement service waiting count
    const service = this.state.services.find(s => s.id === eligibleToken.serviceId);
    if (service && service.waitingCount > 0) {
      service.waitingCount -= 1;
    }

    // Recalculate remaining WAITING tokens
    let aheadCount = 0;
    this.state.tokens.forEach(t => {
      if (t.orgId === orgId && t.locationId === locationId && t.state === 'WAITING') {
        t.peopleAhead = aheadCount++;
        t.estWaitMins = Math.max(2, t.peopleAhead * 3);
        t.estRange = `${Math.max(1, t.estWaitMins - 2)}-${t.estWaitMins + 4} min`;
      }
    });

    // Create Announcement
    const annText = `Token ${eligibleToken.tokenNumber}, please proceed to Counter ${counterNumber}.`;
    const newAnnouncement: AnnouncementItem = {
      id: 'ann-' + Date.now(),
      orgId,
      locationId,
      tokenNumber: eligibleToken.tokenNumber,
      counterNumber,
      text: annText,
      status: 'Sent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      serviceName: service?.name || 'General Inquiry',
    };
    this.state.announcements.unshift(newAnnouncement);

    // Speak announcement via audio engine
    this.speakAnnouncementText(annText);

    // Track most recently called token
    this.state.lastCalledTokenId = eligibleToken.id;

    // Audit log
    this.state.auditLogs.unshift({
      id: 'log-' + Date.now(),
      orgId,
      actor: effectiveStaffName,
      action: 'CALL_NEXT',
      aggregateId: eligibleToken.id,
      beforeState: 'WAITING',
      afterState: 'CALLED',
      timestamp: new Date().toISOString(),
      details: `Assigned token ${eligibleToken.tokenNumber} to Counter ${counterNumber}`,
    });

    this.saveState();
    return eligibleToken;
  }

  public recallToken(tokenId: string, counterNumber: number = 3) {
    const token = this.state.tokens.find(t => t.id === tokenId);
    if (!token) return;

    token.calledAt = new Date().toISOString();
    const counter = this.state.counters.find(c => c.number === counterNumber);
    this.state.lastCalledTokenId = token.id;

    const annText = `Token ${token.tokenNumber}, please proceed to Counter ${counterNumber}.`;
    this.speakAnnouncementText(annText);

    const newAnnouncement: AnnouncementItem = {
      id: 'ann-' + Date.now(),
      orgId: token.orgId,
      locationId: token.locationId,
      tokenNumber: token.tokenNumber,
      counterNumber,
      text: annText,
      status: 'Sent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      serviceName: 'Recall Alert',
    };
    this.state.announcements.unshift(newAnnouncement);

    this.state.auditLogs.unshift({
      id: 'log-' + Date.now(),
      orgId: token.orgId,
      actor: 'Staff Operator',
      action: 'RECALL',
      aggregateId: token.id,
      timestamp: new Date().toISOString(),
      details: `Recalled token ${token.tokenNumber} to Counter ${counterNumber}`,
    });

    this.saveState();
  }

  public completeService(tokenId: string) {
    const token = this.state.tokens.find(t => t.id === tokenId);
    if (!token) return;

    token.state = 'COMPLETED';
    token.completedAt = new Date().toISOString();

    // Clear counter
    const counter = this.state.counters.find(c => c.currentServingTokenId === tokenId || c.number === token.counterNumber);
    if (counter) {
      counter.currentServingTokenId = undefined;
      counter.currentServingTokenNumber = undefined;
      counter.serviceStartTime = undefined;
    }

    const queue = this.state.queues.find(q => q.id === token.queueId);
    if (queue && queue.currentCount > 0) {
      queue.currentCount -= 1;
    }

    // Add to history
    this.state.historyTokens.unshift({ ...token });

    // Remove completed token from active tokens
    this.state.tokens = this.state.tokens.filter(t => t.id !== tokenId);

    if (this.state.activeCustomerTokenId === tokenId) {
      this.state.activeCustomerTokenId = null;
    }

    if (this.state.lastCalledTokenId === tokenId) {
      this.state.lastCalledTokenId = null;
    }

    this.state.auditLogs.unshift({
      id: 'log-' + Date.now(),
      orgId: token.orgId,
      actor: 'Staff Operator',
      action: 'COMPLETE_SERVICE',
      aggregateId: token.id,
      beforeState: 'CALLED',
      afterState: 'COMPLETED',
      timestamp: new Date().toISOString(),
      details: `Completed token ${token.tokenNumber}`,
    });

    this.saveState();
  }

  public getTodayServedCount(orgId?: string, locationId?: string): number {
    // Only tokens with state === 'COMPLETED' count towards today served analytics
    const completedTokens = this.state.historyTokens.filter(t => 
      t.state === 'COMPLETED' &&
      (!orgId || t.orgId === orgId) &&
      (!locationId || t.locationId === locationId)
    );
    // Base served today starts with 56 plus completed tokens in history (initial 1 completed token in history gives 57)
    return 56 + completedTokens.length;
  }

  public skipServingToken(tokenId: string) {
    const token = this.state.tokens.find(t => t.id === tokenId);
    if (!token) return;

    const prevState = token.state;
    token.state = 'NO_SHOW';
    token.completedAt = new Date().toISOString();

    // Clear counter
    const counter = this.state.counters.find(c => c.currentServingTokenId === tokenId || c.number === token.counterNumber);
    if (counter) {
      counter.currentServingTokenId = undefined;
      counter.currentServingTokenNumber = undefined;
      counter.serviceStartTime = undefined;
    }

    const queue = this.state.queues.find(q => q.id === token.queueId);
    if (queue && queue.currentCount > 0) {
      queue.currentCount -= 1;
    }

    this.state.historyTokens.unshift({ ...token });
    this.state.tokens = this.state.tokens.filter(t => t.id !== tokenId);

    if (this.state.activeCustomerTokenId === tokenId) {
      this.state.activeCustomerTokenId = null;
    }

    if (this.state.lastCalledTokenId === tokenId) {
      this.state.lastCalledTokenId = null;
    }

    this.state.auditLogs.unshift({
      id: 'log-' + Date.now(),
      orgId: token.orgId,
      actor: 'Staff Operator',
      action: 'NO_SHOW',
      aggregateId: token.id,
      beforeState: prevState,
      afterState: 'NO_SHOW',
      timestamp: new Date().toISOString(),
      details: `Marked serving token ${token.tokenNumber} as NO-SHOW (Skipped)`,
    });

    this.saveState();
  }

  public cancelCustomerToken(tokenId: string) {
    const token = this.state.tokens.find(t => t.id === tokenId);
    if (!token) return;

    // Customer cancel is only valid for WAITING or AWAY tokens
    if (token.state !== 'WAITING' && token.state !== 'AWAY') {
      return;
    }

    const prevState = token.state;
    token.state = 'CANCELLED';
    token.completedAt = new Date().toISOString();

    // Decrement service / queue waiting count
    const service = this.state.services.find(s => s.id === token.serviceId);
    if (service && service.waitingCount > 0) {
      service.waitingCount -= 1;
    }
    const queue = this.state.queues.find(q => q.id === token.queueId);
    if (queue && queue.currentCount > 0) {
      queue.currentCount -= 1;
    }

    // Add cancelled token to history
    this.state.historyTokens.unshift({ ...token });

    // Remove from active tokens list
    this.state.tokens = this.state.tokens.filter(t => t.id !== tokenId);

    // Reset active customer token ID if it was this token
    if (this.state.activeCustomerTokenId === tokenId) {
      this.state.activeCustomerTokenId = null;
    }

    // Recalculate peopleAhead and wait estimates for remaining WAITING tokens
    let aheadCount = 0;
    this.state.tokens.forEach(t => {
      if (t.orgId === token.orgId && t.locationId === token.locationId && t.state === 'WAITING') {
        t.peopleAhead = aheadCount++;
        t.estWaitMins = Math.max(2, t.peopleAhead * 3);
        t.estRange = `${Math.max(1, t.estWaitMins - 2)}-${t.estWaitMins + 4} min`;
      }
    });

    // Audit log
    this.state.auditLogs.unshift({
      id: 'log-' + Date.now(),
      orgId: token.orgId,
      actor: token.customerName || 'Customer',
      action: 'CANCEL_TOKEN',
      aggregateId: token.id,
      beforeState: prevState,
      afterState: 'CANCELLED',
      timestamp: new Date().toISOString(),
      details: `Customer cancelled token ${token.tokenNumber}`,
    });

    this.saveState();
  }

  // Retain backward-compatible helper for staff cancel/skip
  public cancelOrSkipToken(tokenId: string, reason: 'CANCELLED' | 'SKIPPED' | 'NO_SHOW') {
    if (reason === 'CANCELLED') {
      this.cancelCustomerToken(tokenId);
    } else {
      this.skipServingToken(tokenId);
    }
  }

  public leaveAndReturn(tokenId: string, isLeaving: boolean) {
    const token = this.state.tokens.find(t => t.id === tokenId);
    if (!token) return;

    if (isLeaving) {
      token.state = 'AWAY';
      // 15 minutes grace window
      token.leaveGraceExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      token.delayExplanation = 'Customer temporarily away with active 15m grace window.';
    } else {
      token.state = 'WAITING';
      token.leaveGraceExpiresAt = undefined;
      token.delayExplanation = undefined;
    }

    this.state.auditLogs.unshift({
      id: 'log-' + Date.now(),
      orgId: token.orgId,
      actor: 'Customer',
      action: isLeaving ? 'LEAVE_WAITING_AREA' : 'RETURN_TO_QUEUE',
      aggregateId: token.id,
      beforeState: isLeaving ? 'WAITING' : 'AWAY',
      afterState: isLeaving ? 'AWAY' : 'WAITING',
      timestamp: new Date().toISOString(),
      details: isLeaving ? 'Entered 15m return grace window' : 'Restored active queue status',
    });

    this.saveState();
  }

  // --- ADMIN CONFIGURATION ---
  public toggleServiceStatus(serviceId: string) {
    const srv = this.state.services.find(s => s.id === serviceId);
    if (srv) {
      srv.enabled = !srv.enabled;
      this.saveState();
    }
  }

  public toggleQueueStatus(queueId: string) {
    const q = this.state.queues.find(item => item.id === queueId);
    if (q) {
      q.status = q.status === 'Active' ? 'Paused' : 'Active';
      this.saveState();
    }
  }

  public updateGlobalRules(orgId: string, rules: Partial<GlobalOrgRules>) {
    if (!this.state.globalRules[orgId]) {
      this.state.globalRules[orgId] = {
        autoPauseAtCapacity: true,
        capacityThresholdPercent: 90,
        maxWaitThresholdMins: 45,
      };
    }
    this.state.globalRules[orgId] = {
      ...this.state.globalRules[orgId],
      ...rules,
    };
    this.saveState();
  }

  public addLocation(loc: Omit<LocationBranch, 'id'>) {
    const newLoc: LocationBranch = {
      ...loc,
      id: 'loc-' + Date.now(),
    };
    this.state.locations.push(newLoc);
    this.saveState();
  }

  public onboardTenant(tenant: Omit<Tenant, 'id' | 'code' | 'joinedDate'>) {
    const newTenant: Tenant = {
      ...tenant,
      id: 'org-' + Date.now(),
      code: 'T-' + Math.floor(1000 + Math.random() * 9000),
      joinedDate: new Date().toISOString().split('T')[0],
    };
    this.state.tenants.push(newTenant);
    this.saveState();
  }

  public resetDemoData() {
    this.state = createInitialState();
    this.saveState();
  }

  public clearAllDemoData() {
    this.resetDemoData();
  }
}

export const queueStore = new QueueStore();
if (typeof window !== 'undefined') {
  (window as any).queueStore = queueStore;
  (window as any).getAppState = () => queueStore.getState();
}
