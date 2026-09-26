export type UserRole = 
  | 'CUSTOMER' 
  | 'STAFF' 
  | 'ORG_ADMIN' 
  | 'PLATFORM_ADMIN' 
  | 'PUBLIC_DISPLAY';

export type TokenState = 
  | 'WAITING' 
  | 'AWAY' 
  | 'CALLED' 
  | 'IN_SERVICE' 
  | 'COMPLETED' 
  | 'NO_SHOW'
  | 'SKIPPED' 
  | 'CANCELLED' 
  | 'EXPIRED'
  | 'TRANSFERRED';

export type ScreenId = 
  | 'SCREEN_01_SPLASH'
  | 'SCREEN_02_DISCOVERY'
  | 'SCREEN_03_SERVICES'
  | 'SCREEN_04_JOIN_CONFIRM'
  | 'SCREEN_05_ACTIVE_STATUS'
  | 'SCREEN_07_HISTORY'
  | 'SCREEN_08_STAFF_LOGIN'
  | 'SCREEN_09_STAFF_OPERATIONS'
  | 'SCREEN_11_ANNOUNCEMENT_CONTROL'
  | 'SCREEN_12_ORG_DASHBOARD'
  | 'SCREEN_13_LOCATION_MANAGEMENT'
  | 'SCREEN_14_SERVICE_QUEUE_CONFIG'
  | 'SCREEN_15_PLATFORM_DASHBOARD'
  | 'SCREEN_16_TENANT_MANAGEMENT'
  | 'SCREEN_17_ANALYTICS'
  | 'SCREEN_22_PUBLIC_DISPLAY';

export interface Tenant {
  id: string;
  code: string;
  name: string;
  sector: string;
  status: 'ACTIVE' | 'SUSPENDED';
  locationCount: number;
  activeQueueCount: number;
  contactEmail: string;
  joinedDate: string;
  capacityThresholdPercent?: number;
  maxWaitThresholdMins?: number;
}

export interface LocationBranch {
  id: string;
  orgId: string;
  name: string;
  subtitle: string;
  address: string;
  city: string;
  status: 'Active' | 'Inactive';
  activeServicesCount: number;
  staffAssignedCount: number;
  operatingHours: string;
  isHQ?: boolean;
}

export interface ServiceItem {
  id: string;
  orgId: string;
  locationId: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  isFastTrack?: boolean;
  isHighVolume?: boolean;
  waitingCount: number;
  estWaitMins: number;
  estWaitRange: string;
  confidence: 'High' | 'Medium' | 'Low';
  associatedQueues: string[];
  preparationGuidance?: string;
}

export interface QueueItem {
  id: string;
  orgId: string;
  locationId: string;
  serviceId: string;
  name: string;
  tokenPrefix: string;
  startRange: number;
  endRange: number;
  status: 'Active' | 'Paused' | 'Closed';
  currentCount: number;
  maxCapacity: number;
  avgWaitMins: number;
  autoPauseAtCapacity?: boolean;
}

export interface QueueWarningState {
  queueId: string;
  serviceId: string;
  capacityWarningActive: boolean;
  waitWarningActive: boolean;
}

export interface QueueToken {
  id: string;
  orgId: string;
  locationId: string;
  serviceId: string;
  queueId: string;
  tokenNumber: string; // e.g. A-042
  state: TokenState;
  counterId?: string;
  counterNumber?: number;
  calledByStaffId?: string;
  customerName?: string;
  customerPhone?: string;
  joinedAt: string;
  calledAt?: string;
  servedAt?: string;
  completedAt?: string;
  peopleAhead: number;
  estWaitMins: number;
  estRange: string;
  confidence: 'High' | 'Medium' | 'Low';
  leaveGraceExpiresAt?: string;
  delayExplanation?: string;
  isPriority?: boolean;
  idempotencyKey?: string;
  realtimeToken?: string;
  transferredToTokenId?: string;
  priorityTimestamp?: string;
}

export type CounterAvailability = 'ONLINE' | 'ON_BREAK' | 'AWAY' | 'OFFLINE';
export type CounterQueueState = 'READY' | 'SERVING';

export interface CounterItem {
  id: string;
  orgId: string;
  locationId: string;
  number: number;
  name: string;
  status: 'Active' | 'Paused' | 'Closed';
  availability: CounterAvailability;
  currentServingTokenId?: string;
  currentServingTokenNumber?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  serviceStartTime?: string;
  supportedServiceNames?: string[];
}

export interface StaffUser {
  id: string;
  orgId: string;
  locationId: string;
  name: string;
  email: string;
  role: 'STAFF' | 'ORG_ADMIN' | 'PLATFORM_ADMIN';
  assignedCounterNumber: number;
}

export interface AnnouncementItem {
  id: string;
  orgId: string;
  locationId: string;
  tokenNumber: string;
  counterNumber: number;
  text: string;
  status: 'Sent' | 'Failed' | 'Speaking';
  timestamp: string;
  timeLabel: string;
  serviceName: string;
  errorMessage?: string;
}

export interface GlobalOrgRules {
  autoPauseAtCapacity: boolean;
  capacityThresholdPercent: number;
  maxWaitThresholdMins: number;
}

export interface SystemAlert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  orgId: string;
  actor: string;
  action: string;
  aggregateId: string;
  beforeState?: string;
  afterState?: string;
  timestamp: string;
  details?: string;
}

export interface HourlyBucket {
  hour: number;
  tokensJoined: number;
  tokensCompleted: number;
}

export interface DailyBucket {
  date: string;
  tokensJoined: number;
  tokensCompleted: number;
}

export interface AnalyticsTrafficResponse {
  hourlyBuckets: HourlyBucket[];
  dailyBuckets: DailyBucket[];
}

export interface ServiceAnalyticsResponse {
  serviceId: string;
  serviceName: string;
  operationalTokenVolume: number;
  completedTokens: number;
  noShows: number;
  cancellations: number;
  transfers: number;
  completionRate: number;
  noShowRate: number;
  cancellationRate: number;
  averageServiceDurationSeconds: number | null;
}

export interface CounterAnalyticsResponse {
  counterId: string;
  counterName: string;
  operationalTokenVolume: number;
  completedTokens: number;
  noShows: number;
  cancellations: number;
  transfers: number;
  averageServiceDurationSeconds: number | null;
}
