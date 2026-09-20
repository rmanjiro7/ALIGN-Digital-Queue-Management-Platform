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
  UserRole
} from '../types';

const STORAGE_KEY = 'align_qms_state_v1';

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

  // Authentication State
  authStatus: 'UNAUTHENTICATED' | 'AUTHENTICATING' | 'AUTH_RESTORING' | 'AUTH_READY' | 'AUTHENTICATED' | 'ERROR';
  currentUser: any | null;

  // Realtime Sync Status
  syncStatus: 'DISCONNECTED' | 'CONNECTING' | 'SUBSCRIBING' | 'SNAPSHOT_SYNC' | 'LIVE' | 'RECONNECTING' | 'ERROR';
}

const INITIAL_TENANTS: Tenant[] = [
  {
    id: 'e2e00000-0000-0000-0000-000000000001',
    code: 'T-8492',
    name: 'ABC Services',
    sector: 'Enterprise Retail',
    status: 'ACTIVE',
    locationCount: 24,
    activeQueueCount: 156,
    contactEmail: 'ops@abcservices.com',
    joinedDate: '2023-01-15',
  },
  {
    id: 'org-hospital',
    code: 'T-9931',
    name: 'City Hospital',
    sector: 'Healthcare',
    status: 'ACTIVE',
    locationCount: 8,
    activeQueueCount: 42,
    contactEmail: 'admin@cityhospital.org',
    joinedDate: '2023-03-20',
  },
  {
    id: 'org-rmv',
    code: 'T-1024',
    name: 'Metro RMV',
    sector: 'Government',
    status: 'ACTIVE',
    locationCount: 45,
    activeQueueCount: 312,
    contactEmail: 'support@metrormv.gov',
    joinedDate: '2023-05-10',
  },
  {
    id: 'org-tech',
    code: 'T-4451',
    name: 'Global Tech Campus',
    sector: 'Corporate',
    status: 'SUSPENDED',
    locationCount: 3,
    activeQueueCount: 12,
    contactEmail: 'facilities@globaltech.io',
    joinedDate: '2023-08-01',
  },
  {
    id: 'org-univ',
    code: 'T-2289',
    name: 'State University',
    sector: 'Education',
    status: 'ACTIVE',
    locationCount: 12,
    activeQueueCount: 88,
    contactEmail: 'services@stateuniv.edu',
    joinedDate: '2023-09-12',
  },
];

const INITIAL_LOCATIONS: LocationBranch[] = [
  {
    id: 'e2e00000-0000-0000-0000-000000000002',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    name: 'Main Branch',
    subtitle: 'Downtown HQ',
    address: '123 Business Parkway, Suite 100',
    city: 'Metro City',
    status: 'Active',
    activeServicesCount: 4,
    staffAssignedCount: 12,
    operatingHours: '08:00 AM - 06:00 PM',
    isHQ: true,
  },
  {
    id: 'loc-north',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    name: 'North Branch',
    subtitle: 'Commerce Hub',
    address: '8850 North Commerce Dr',
    city: 'Suburbia',
    status: 'Inactive',
    activeServicesCount: 0,
    staffAssignedCount: 0,
    operatingHours: '09:00 AM - 05:00 PM',
  },
  {
    id: 'loc-hospital-main',
    orgId: 'org-hospital',
    name: 'City General Central',
    subtitle: 'Emergency & Outpatient',
    address: '456 Health Way',
    city: 'Metro City',
    status: 'Active',
    activeServicesCount: 6,
    staffAssignedCount: 28,
    operatingHours: '24/7 Service',
    isHQ: true,
  },
  {
    id: 'loc-rmv-central',
    orgId: 'org-rmv',
    name: 'Metro Civic Center',
    subtitle: 'Licensing & Registration',
    address: '789 Civic Center Blvd',
    city: 'Metro City',
    status: 'Active',
    activeServicesCount: 5,
    staffAssignedCount: 18,
    operatingHours: '08:30 AM - 04:30 PM',
    isHQ: true,
  }
];

const INITIAL_SERVICES: ServiceItem[] = [
  {
    id: 'e2e00000-0000-0000-0000-000000000003',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    name: 'General Inquiry',
    description: 'Default service for walk-ins requiring basic information or directional assistance.',
    icon: 'forum',
    enabled: true,
    isFastTrack: false,
    isHighVolume: false,
    waitingCount: 5,
    estWaitMins: 18,
    estWaitRange: '15-20 min',
    confidence: 'High',
    associatedQueues: ['e2e00000-0000-0000-0000-000000000004', 'q-info'],
    preparationGuidance: 'Please have your photo ID ready for verification.',
  },
  {
    id: 'srv-account',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    name: 'Account Services',
    description: 'Open new accounts, update information, and manage existing profiles.',
    icon: 'account_balance',
    enabled: true,
    isFastTrack: false,
    isHighVolume: false,
    waitingCount: 14,
    estWaitMins: 25,
    estWaitRange: '20-30 min',
    confidence: 'High',
    associatedQueues: ['e2e00000-0000-0000-0000-000000000004'],
    preparationGuidance: 'Bring government ID, proof of address, and initial deposit if applicable.',
  },
  {
    id: 'srv-loan',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    name: 'Loan Applications',
    description: 'Speak with a specialist about personal, auto, or home loans. Comprehensive consultation included.',
    icon: 'description',
    enabled: true,
    isFastTrack: false,
    isHighVolume: false,
    waitingCount: 3,
    estWaitMins: 12,
    estWaitRange: '10-15 min',
    confidence: 'High',
    associatedQueues: ['q-specialist'],
    preparationGuidance: 'Have income documentation and recent tax returns ready.',
  },
  {
    id: 'srv-cashier',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    name: 'Cashier',
    description: 'Deposits, withdrawals, money orders, and general teller transactions.',
    icon: 'payments',
    enabled: true,
    isFastTrack: false,
    isHighVolume: true,
    waitingCount: 28,
    estWaitMins: 45,
    estWaitRange: '40-50 min',
    confidence: 'Medium',
    associatedQueues: ['e2e00000-0000-0000-0000-000000000004'],
    preparationGuidance: 'Endorse all checks prior to approaching the teller window.',
  },
  {
    id: 'srv-express',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    name: 'Express Drop-off',
    description: 'Quick document drop-off or simple pickups taking less than 2 minutes.',
    icon: 'bolt',
    enabled: true,
    isFastTrack: true,
    isHighVolume: false,
    waitingCount: 1,
    estWaitMins: 4,
    estWaitRange: '< 5 min',
    confidence: 'High',
    associatedQueues: ['q-info'],
    preparationGuidance: 'Ensure all package labels are clearly marked with your customer ID.',
  },
  {
    id: 'srv-specialist',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    name: 'Specialist Consult',
    description: 'Requires pre-booking or referral. Higher duration expected per token.',
    icon: 'assignment_ind',
    enabled: true,
    isFastTrack: false,
    isHighVolume: false,
    waitingCount: 0,
    estWaitMins: 0,
    estWaitRange: 'No wait',
    confidence: 'High',
    associatedQueues: [],
    preparationGuidance: 'Please bring your specialist referral code.',
  },
];

const INITIAL_QUEUES: QueueItem[] = [
  {
    id: 'e2e00000-0000-0000-0000-000000000004',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    serviceId: 'e2e00000-0000-0000-0000-000000000003',
    name: 'Walk-In Triage',
    tokenPrefix: 'A',
    startRange: 1,
    endRange: 999,
    status: 'Active',
    currentCount: 45,
    maxCapacity: 50,
    avgWaitMins: 12,
    autoPauseAtCapacity: true,
  },
  {
    id: 'q-info',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    serviceId: 'e2e00000-0000-0000-0000-000000000003',
    name: 'Information Desk',
    tokenPrefix: 'I',
    startRange: 1,
    endRange: 999,
    status: 'Paused',
    currentCount: 0,
    maxCapacity: 30,
    avgWaitMins: 0,
    autoPauseAtCapacity: false,
  },
  {
    id: 'q-specialist',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    serviceId: 'srv-loan',
    name: 'Consultation Desk',
    tokenPrefix: 'C',
    startRange: 1,
    endRange: 999,
    status: 'Active',
    currentCount: 8,
    maxCapacity: 25,
    avgWaitMins: 15,
    autoPauseAtCapacity: true,
  },
];

const INITIAL_COUNTERS: CounterItem[] = [
  {
    id: 'e2e00000-0000-0000-0000-000000000011',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    number: 1,
    name: 'Counter 1',
    status: 'Active',
    availability: 'ONLINE',
    assignedStaffName: 'Sarah Jenkins',
    supportedServiceNames: ['General Inquiry', 'Account Services'],
  },
  {
    id: 'e2e00000-0000-0000-0000-000000000012',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    number: 2,
    name: 'Counter 2',
    status: 'Active',
    availability: 'ONLINE',
    assignedStaffName: 'Marcus Vance',
    supportedServiceNames: ['Account Services', 'Loan Applications'],
  },
  {
    id: 'e2e00000-0000-0000-0000-000000000013',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    number: 3,
    name: 'Counter 3',
    status: 'Active',
    availability: 'ON_BREAK',
    assignedStaffId: 'staff-admin',
    assignedStaffName: 'Alex Mercer (You)',
    supportedServiceNames: ['General Inquiry', 'Fast-Track Triage'],
  },
  {
    id: 'e2e00000-0000-0000-0000-000000000014',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    number: 4,
    name: 'Counter 4',
    status: 'Active',
    availability: 'AWAY',
    assignedStaffName: 'Elena Rostova',
    supportedServiceNames: ['Specialist Advisory', 'General Inquiry'],
  },
];

const INITIAL_STAFF: StaffUser[] = [
  {
    id: 'staff-admin',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    name: 'Alex Mercer',
    email: 'admin@organization.com',
    role: 'STAFF',
    assignedCounterNumber: 3,
  },
  {
    id: 'staff-org-lead',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    name: 'Rachel Zane',
    email: 'rachel@abcservices.com',
    role: 'ORG_ADMIN',
    assignedCounterNumber: 1,
  },
  {
    id: 'staff-super',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    name: 'System Platform Admin',
    email: 'super@alignplatform.io',
    role: 'PLATFORM_ADMIN',
    assignedCounterNumber: 0,
  }
];

const INITIAL_TOKENS: QueueToken[] = [
  {
    id: 'tok-042',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    serviceId: 'e2e00000-0000-0000-0000-000000000003',
    queueId: 'e2e00000-0000-0000-0000-000000000004',
    tokenNumber: 'A-042',
    state: 'WAITING',
    customerName: 'Current Customer',
    customerPhone: '+1 (555) 019-2834',
    joinedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    peopleAhead: 0,
    estWaitMins: 5,
    estRange: '4-7 min',
    confidence: 'High',
  },
  {
    id: 'tok-105',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    serviceId: 'srv-account',
    queueId: 'e2e00000-0000-0000-0000-000000000004',
    tokenNumber: 'B-105',
    state: 'WAITING',
    joinedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    peopleAhead: 1,
    estWaitMins: 8,
    estRange: '7-10 min',
    confidence: 'High',
  },
  {
    id: 'tok-043',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    serviceId: 'e2e00000-0000-0000-0000-000000000003',
    queueId: 'e2e00000-0000-0000-0000-000000000004',
    tokenNumber: 'A-043',
    state: 'WAITING',
    joinedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    peopleAhead: 2,
    estWaitMins: 12,
    estRange: '10-15 min',
    confidence: 'Medium',
  },
  {
    id: 'tok-012',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    serviceId: 'srv-loan',
    queueId: 'q-specialist',
    tokenNumber: 'C-012',
    state: 'WAITING',
    joinedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    peopleAhead: 3,
    estWaitMins: 16,
    estRange: '14-18 min',
    confidence: 'Medium',
  },
  {
    id: 'tok-044',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    serviceId: 'e2e00000-0000-0000-0000-000000000003',
    queueId: 'e2e00000-0000-0000-0000-000000000004',
    tokenNumber: 'A-044',
    state: 'WAITING',
    joinedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    peopleAhead: 4,
    estWaitMins: 20,
    estRange: '18-24 min',
    confidence: 'Medium',
  },
  {
    id: 'tok-045',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    serviceId: 'e2e00000-0000-0000-0000-000000000003',
    queueId: 'e2e00000-0000-0000-0000-000000000004',
    tokenNumber: 'A-045',
    state: 'WAITING',
    joinedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    peopleAhead: 5,
    estWaitMins: 24,
    estRange: '22-28 min',
    confidence: 'Low',
  }
];

const INITIAL_HISTORY: QueueToken[] = [
  {
    id: 'hist-1',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    serviceId: 'srv-account',
    queueId: 'e2e00000-0000-0000-0000-000000000004',
    tokenNumber: 'A-042',
    state: 'COMPLETED',
    counterNumber: 3,
    joinedAt: '2023-10-24T10:15:00.000Z',
    completedAt: '2023-10-24T10:32:00.000Z',
    peopleAhead: 0,
    estWaitMins: 0,
    estRange: 'Completed',
    confidence: 'High',
  },
  {
    id: 'hist-2',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'loc-north',
    serviceId: 'e2e00000-0000-0000-0000-000000000003',
    queueId: 'q-info',
    tokenNumber: 'B-105',
    state: 'CANCELLED',
    joinedAt: '2023-10-20T14:30:00.000Z',
    completedAt: '2023-10-20T14:45:00.000Z',
    peopleAhead: 0,
    estWaitMins: 0,
    estRange: 'Cancelled',
    confidence: 'High',
  },
  {
    id: 'hist-3',
    orgId: 'org-tech',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    serviceId: 'e2e00000-0000-0000-0000-000000000003',
    queueId: 'e2e00000-0000-0000-0000-000000000004',
    tokenNumber: 'C-098',
    state: 'NO_SHOW',
    joinedAt: '2023-10-15T09:45:00.000Z',
    completedAt: '2023-10-15T10:05:00.000Z',
    peopleAhead: 0,
    estWaitMins: 0,
    estRange: 'Skipped',
    confidence: 'High',
  }
];

const INITIAL_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'ann-1',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    tokenNumber: 'A-041',
    counterNumber: 3,
    text: 'Token A-041, please proceed to Counter 3.',
    status: 'Sent',
    timestamp: '10:42 AM',
    timeLabel: '10:42 AM',
    serviceName: 'General Inquiry',
  },
  {
    id: 'ann-2',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    tokenNumber: 'B-012',
    counterNumber: 1,
    text: 'Token B-012, please proceed to Counter 1.',
    status: 'Sent',
    timestamp: '10:35 AM',
    timeLabel: '10:35 AM',
    serviceName: 'Account Services',
  },
  {
    id: 'ann-3',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    tokenNumber: 'INFO',
    counterNumber: 2,
    text: 'Attention all waiting customers, Counter 2 is temporarily closed.',
    status: 'Failed',
    timestamp: '10:28 AM',
    timeLabel: '10:28 AM',
    serviceName: 'Operations',
    errorMessage: 'Error: PA System connection timeout.',
  },
  {
    id: 'ann-4',
    orgId: 'e2e00000-0000-0000-0000-000000000001',
    locationId: 'e2e00000-0000-0000-0000-000000000002',
    tokenNumber: 'A-040',
    counterNumber: 3,
    text: 'Token A-040, please proceed to Counter 3.',
    status: 'Sent',
    timestamp: '09:15 AM',
    timeLabel: '09:15 AM',
    serviceName: 'General Inquiry',
  },
];

const INITIAL_ALERTS: SystemAlert[] = [
  {
    id: 'alert-1',
    title: 'High Latency - US East',
    description: 'API response times exceeding 500ms threshold for 3 organizations.',
    severity: 'critical',
    timestamp: '10 mins ago',
  },
  {
    id: 'alert-2',
    title: 'DB Connection Pool',
    description: "Cluster 'Alpha' reaching 85% capacity limits.",
    severity: 'warning',
    timestamp: '45 mins ago',
  },
  {
    id: 'alert-3',
    title: 'Scheduled Maintenance',
    description: 'Routine update planned for upcoming Sunday at 02:00 UTC.',
    severity: 'info',
    timestamp: 'Yesterday',
  }
];

const INITIAL_STATE: AppState = {
  currentRole: 'CUSTOMER',
  currentScreen: 'SCREEN_01_SPLASH',
  selectedOrgId: 'e2e00000-0000-0000-0000-000000000001',
  selectedLocationId: 'e2e00000-0000-0000-0000-000000000002',
  selectedServiceId: 'e2e00000-0000-0000-0000-000000000003',
  activeCustomerTokenId: 'tok-042',
  lastCalledTokenId: null,
  currentStaffUser: INITIAL_STAFF[0],
  tenants: INITIAL_TENANTS,
  locations: INITIAL_LOCATIONS,
  services: INITIAL_SERVICES,
  queues: INITIAL_QUEUES,
  tokens: INITIAL_TOKENS,
  counters: INITIAL_COUNTERS,
  staffUsers: INITIAL_STAFF,
  announcements: INITIAL_ANNOUNCEMENTS,
  globalRules: {
    'e2e00000-0000-0000-0000-000000000001': {
      autoPauseAtCapacity: true,
      capacityThresholdPercent: 90,
      maxWaitThresholdMins: 45,
    }
  },
  alerts: INITIAL_ALERTS,
  auditLogs: [
    {
      id: 'log-1',
      orgId: 'e2e00000-0000-0000-0000-000000000001',
      actor: 'Alex Mercer',
      action: 'CALL_NEXT',
      aggregateId: 'tok-041',
      beforeState: 'WAITING',
      afterState: 'CALLED',
      timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      details: 'Assigned to Counter 3',
    }
  ],
  historyTokens: INITIAL_HISTORY,
  authStatus: 'UNAUTHENTICATED',
  currentUser: null,
  syncStatus: 'DISCONNECTED',
};

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
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const mergedCounters = INITIAL_COUNTERS.map(defaultCounter => {
          const savedCounter = parsed.counters?.find((c: CounterItem) => c.number === defaultCounter.number);
          if (!savedCounter) return defaultCounter;
          return {
            ...defaultCounter,
            ...savedCounter,
            availability: savedCounter.availability || defaultCounter.availability || 'ONLINE',
          };
        });

        return {
          ...INITIAL_STATE,
          ...parsed,
          counters: mergedCounters,
        };
      }
    } catch {
      // fallback
    }
    return INITIAL_STATE;
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
    }
    this.saveState();
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
    this.state.services = services;
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

  public applySnapshot(snapshot: any, generationId: number, expectedLocationId: string) {
    if (this.syncGenerationId !== generationId) {
      return; // Discard stale response
    }
    if (!snapshot || snapshot.locationId !== expectedLocationId) {
      this.state.syncStatus = 'ERROR';
      this.saveState();
      return;
    }

    // Replace canonical queue state
    this.state.tokens = [...(snapshot.activeTokens || []), ...(snapshot.waitingTokens || [])];
    if (snapshot.counters) {
      snapshot.counters.forEach((snapCounter: any) => {
        const c = this.state.counters.find(x => x.number === snapCounter.number);
        if (c) {
          Object.assign(c, snapCounter);
        }
      });
    }

    // Replay buffer
    const buffer = [...this.eventBuffer];
    this.eventBuffer = [];
    buffer.forEach(evt => this.processLiveEvent(evt));

    this.state.syncStatus = 'LIVE';
    this.saveState();
  }

  public handleRealtimeEvent(event: any, expectedLocationId: string) {
    // Structural Validation
    if (!event || !event.eventId || !event.eventType || !event.tokenId) return;
    if (event.locationId !== expectedLocationId) return;

    // Duplicate Check
    if (this.processedEvents.includes(event.eventId)) {
      return;
    }
    this.processedEvents.push(event.eventId);
    if (this.processedEvents.length > 500) {
      this.processedEvents.shift();
    }

    if (this.state.syncStatus === 'SNAPSHOT_SYNC') {
      this.eventBuffer.push(event);
    } else if (this.state.syncStatus === 'LIVE') {
      this.processLiveEvent(event);
      this.saveState();
    }
  }

  private processLiveEvent(event: any) {
    let token = this.state.tokens.find(t => t.id === event.tokenId);

    if (!token && event.tokenNumber) {
      token = {
        id: event.tokenId,
        orgId: event.orgId || this.state.selectedOrgId,
        locationId: event.locationId,
        queueId: event.queueId || 'e2e00000-0000-0000-0000-000000000004',
        serviceId: 'e2e00000-0000-0000-0000-000000000003',
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
      } else if (event.eventType === 'TOKEN_COMPLETED' || event.eventType === 'TOKEN_NO_SHOW') {
        token.state = event.eventType === 'TOKEN_COMPLETED' ? 'COMPLETED' : 'NO_SHOW';
        token.completedAt = event.timestamp || new Date().toISOString();
        
        const counter = this.state.counters.find(c => c.currentServingTokenId === token!.id || c.number === token!.counterNumber);
        if (counter && counter.currentServingTokenId === token.id) {
          counter.currentServingTokenId = undefined;
          counter.currentServingTokenNumber = undefined;
          counter.serviceStartTime = undefined;
        }
        this.state.historyTokens.unshift({ ...token });
        this.state.tokens = this.state.tokens.filter(t => t.id !== token!.id);
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

  public callNext(counterNumber: number = 3, staffId: string = 'staff-admin'): QueueToken | null {
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

    // Advance eligible token: WAITING -> CALLED
    eligibleToken.state = 'CALLED';
    eligibleToken.calledAt = new Date().toISOString();
    eligibleToken.counterNumber = counterNumber;
    eligibleToken.counterId = counter?.id || `counter-${counterNumber}`;
    eligibleToken.calledByStaffId = staffId;
    eligibleToken.estRange = 'Now Serving';
    eligibleToken.peopleAhead = 0;

    // Update Counter
    if (counter) {
      counter.currentServingTokenId = eligibleToken.id;
      counter.currentServingTokenNumber = eligibleToken.tokenNumber;
      counter.assignedStaffId = staffId;
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
      actor: 'Staff Operator',
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
    this.state = { ...INITIAL_STATE };
    this.saveState();
  }
}

export const queueStore = new QueueStore();
