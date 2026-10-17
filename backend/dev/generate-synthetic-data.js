const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const DEFAULT_API_BASE = 'http://localhost:8080/api/v1';
const DEFAULT_DB_CONTAINER = 'align_postgres';
const DEFAULT_DB_USER = 'align_user';
const DEFAULT_DB_NAME = 'align_qms';

function resolveConfig(options = {}) {
    const rawApiBase = options.apiBase || process.env.API_BASE_URL || process.env.API_URL || DEFAULT_API_BASE;
    let apiBase = rawApiBase.replace(/\/+$/, '');
    if (!apiBase.endsWith('/api/v1') && !apiBase.includes('/api/')) {
        apiBase += '/api/v1';
    }
    const dbContainer = options.dbContainer || process.env.DB_CONTAINER || DEFAULT_DB_CONTAINER;
    const dbName = options.dbName || process.env.DB_NAME || DEFAULT_DB_NAME;
    const dbUser = options.dbUser || process.env.DB_USER || DEFAULT_DB_USER;
    return { apiBase, dbContainer, dbName, dbUser };
}

function validateTargetSafety(config, isDryRun) {
    if (isDryRun) {
        return; // Dry-run simulation has zero external side effects
    }
    const apiBase = config.apiBase || '';
    const dbContainer = config.dbContainer || '';
    const dbName = config.dbName || '';

    if (!apiBase) {
        throw new Error('Target validation failed: API_BASE_URL is required for live execution.');
    }
    let parsedUrl;
    try {
        parsedUrl = new URL(apiBase.startsWith('http') ? apiBase : `http://${apiBase}`);
    } catch {
        throw new Error(`Target validation failed: Invalid API_BASE_URL '${apiBase}'.`);
    }

    if (parsedUrl.port === '8080' || parsedUrl.hostname === 'align_backend') {
        throw new Error(
            `Safety violation: Target API URL '${apiBase}' points to default development backend (port 8080 / align_backend). ` +
            `Live execution is prohibited against the shared development environment. Explicit isolated API required.`
        );
    }

    if (!dbContainer) {
        throw new Error('Target validation failed: DB_CONTAINER is required for live execution.');
    }
    if (dbContainer === 'align_postgres') {
        throw new Error(
            `Safety violation: Target DB container '${dbContainer}' is the shared development container 'align_postgres'. ` +
            `Live execution is prohibited against shared development database infrastructure. Explicit isolated DB_CONTAINER required.`
        );
    }

    if (!dbName) {
        throw new Error('Target validation failed: DB_NAME is required for live execution.');
    }
    if (dbName === 'align_qms') {
        throw new Error(
            `Safety violation: Target database '${dbName}' is the shared development database 'align_qms'. ` +
            `Live execution is prohibited against shared development database. Explicit isolated DB_NAME required.`
        );
    }
}

// 1. Credentials from Environment
const PLATFORM_ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const PLATFORM_ADMIN_PASS = process.env.ADMIN_PASSWORD;

if (require.main === module && (!PLATFORM_ADMIN_EMAIL || !PLATFORM_ADMIN_PASS)) {
    console.error("FATAL: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.");
    process.exit(1);
}

const ARGS = process.argv.slice(2);
const CLI_RUN_ID = ARGS.find(a => a.startsWith('--run-id=') || a.startsWith('--runId='))?.split('=')[1];
const RUN_PREFIX = CLI_RUN_ID ? `[SYNC-${CLI_RUN_ID.replace(/^SYNC-/, '')}]` : `[SYNC-${Math.random().toString(36).substr(2, 4).toUpperCase()}]`;
const RUN_ID = CLI_RUN_ID || RUN_PREFIX.replace(/[\[\]]/g, '');
const IS_DRY_RUN = ARGS.includes('--dry-run');
const IS_PILOT = ARGS.includes('--pilot');
const IS_SAMPLE = ARGS.includes('--sample');
const ENABLE_BACKDATE = ARGS.includes('--backdate');
const CLEAN_MANIFEST = ARGS.find(a => a.startsWith('--clean='))?.split('=')[1];

let manifest = {
    runId: RUN_ID,
    timestamp: new Date().toISOString(),
    status: 'IN_PROGRESS',
    config: { pilot: IS_PILOT, sample: IS_SAMPLE, backdate: ENABLE_BACKDATE, dryRun: IS_DRY_RUN },
    generated: {
        organizations: [],
        locations: [],
        services: [],
        queues: [],
        counters: [],
        users: [],
        tokens: []
    },
    validation: {
        status: 'PENDING',
        mode: IS_PILOT ? 'PILOT' : (IS_SAMPLE ? 'SAMPLE' : 'FULL'),
        backdated: ENABLE_BACKDATE,
        checks: []
    }
};

function parseRetryAfter(headerValue) {
    if (!headerValue) return null;
    const trimmed = String(headerValue).trim();
    if (/^\d+$/.test(trimmed)) {
        const seconds = parseInt(trimmed, 10);
        return seconds >= 0 ? seconds * 1000 : null;
    }
    const parsedDate = Date.parse(trimmed);
    if (!Number.isNaN(parsedDate)) {
        const diff = parsedDate - Date.now();
        return diff > 0 ? diff : 0;
    }
    return null;
}

class RequestPacer {
    constructor(options = {}) {
        this.sleepFn = options.sleepFn || ((ms) => new Promise(resolve => setTimeout(resolve, ms)));
        this.loginMinIntervalMs = options.loginMinIntervalMs ?? 6100;
        this.tokenMinIntervalMs = options.tokenMinIntervalMs ?? 2050;
        this.lastLoginTime = 0;
        this.lastTokenCreateTime = 0;
        this.enabled = options.enabled !== undefined ? options.enabled : true;
    }

    async pace(method, endpoint, isDryRun = false) {
        if (!this.enabled || isDryRun) return 0;
        const now = Date.now();
        let waitMs = 0;

        if (endpoint === '/auth/login' && method === 'POST') {
            const elapsed = now - this.lastLoginTime;
            if (this.lastLoginTime > 0 && elapsed < this.loginMinIntervalMs) {
                waitMs = this.loginMinIntervalMs - elapsed;
            }
            if (waitMs > 0) {
                log(`Pacing ${method} ${endpoint}: waiting ${waitMs}ms to respect rate limit...`);
                await this.sleepFn(waitMs);
            }
            this.lastLoginTime = Date.now();
            return waitMs;
        }

        if (endpoint === '/tokens' && method === 'POST') {
            const elapsed = now - this.lastTokenCreateTime;
            if (this.lastTokenCreateTime > 0 && elapsed < this.tokenMinIntervalMs) {
                waitMs = this.tokenMinIntervalMs - elapsed;
            }
            if (waitMs > 0) {
                log(`Pacing ${method} ${endpoint}: waiting ${waitMs}ms to respect rate limit...`);
                await this.sleepFn(waitMs);
            }
            this.lastTokenCreateTime = Date.now();
            return waitMs;
        }

        return 0;
    }
}

const NON_IDEMPOTENT_CREATION_ENDPOINTS = [
    '/tenants',
    '/users',
    '/locations',
    '/services',
    '/queues',
    '/counters',
    '/tokens'
];

function isNonIdempotentCreation(method, endpoint) {
    if (method !== 'POST') return false;
    return NON_IDEMPOTENT_CREATION_ENDPOINTS.includes(endpoint) ||
        Boolean(endpoint.match(/^\/counters\/[^\/]+\/services\/[^\/]+$/));
}

function checkRunCollision(options = {}) {
    const runId = options.runId || RUN_ID;
    const manifestDir = options.manifestDir || path.join(__dirname, 'synthetic-runs');
    const isDryRun = options.isDryRun !== undefined ? options.isDryRun : isDryRun();
    const sqlExecutor = options.sqlExecutor;

    const successManifestFile = path.join(manifestDir, `run-${runId}.json`);
    if (fs.existsSync(successManifestFile)) {
        throw new Error(
            `Run collision detected: Successful manifest already exists for "${runId}" at ${successManifestFile}. ` +
            `Refusing to overwrite existing run.`
        );
    }

    const failedManifestFile = path.join(manifestDir, `run-${runId}-failed.json`);
    if (fs.existsSync(failedManifestFile)) {
        throw new Error(
            `Partial run collision detected: Previous failed manifest exists for "${runId}" at ${failedManifestFile}. ` +
            `Partially created resources may exist in target. Refusing to rerun with same RUN_ID to avoid conflicts.`
        );
    }

    if (!isDryRun && sqlExecutor) {
        try {
            const countStr = sqlExecutor(`SELECT count(*) FROM organizations WHERE code LIKE '${runId}-%';`);
            const count = parseInt(countStr, 10);
            if (Number.isFinite(count) && count > 0) {
                throw new Error(
                    `Partial run collision detected: ${count} organization(s) already exist with runId "${runId}". ` +
                    `Refusing to run to prevent colliding with existing resources.`
                );
            }
        } catch (dbErr) {
            if (dbErr.message.includes('Partial run collision detected')) {
                throw dbErr;
            }
        }
    }
}

const initialResolved = resolveConfig();
const activeConfig = {
    isDryRun: IS_DRY_RUN,
    isPilot: IS_PILOT,
    isSample: IS_SAMPLE,
    enableBackdate: ENABLE_BACKDATE,
    apiBase: initialResolved.apiBase,
    dbContainer: initialResolved.dbContainer,
    dbName: initialResolved.dbName,
    dbUser: initialResolved.dbUser,
    pacer: new RequestPacer(),
    sleepFn: null,
    fetchFn: null,
    max429Retries: 3,
    default429DelayMs: 1000
};

function isDryRun() {
    return activeConfig.isDryRun;
}

const DRY_RUN_PLATFORM_ADMIN_TOKEN = 'mock-platform-admin-token';
const DRY_RUN_ORG_ADMIN_TOKEN_PREFIX = 'mock-org-admin-token-';
const DRY_RUN_STAFF_TOKEN_PREFIX = 'mock-staff-token-';

const mockState = {
    counterAssignments: new Set(),
    counterOnline: new Set(),
    tokensProcessingStarted: false,
    queue: [],
    calledTokens: {},
    backdated: false
};

function requireDryRunToken(token, expectedToken, method, endpoint) {
    if (token !== expectedToken) {
        throw new Error(`Dry-run authorization mismatch for ${method} ${endpoint}.`);
    }
}

function requireDryRunTenantToken(token, method, endpoint) {
    if (!token || (!token.startsWith(DRY_RUN_ORG_ADMIN_TOKEN_PREFIX) && !token.startsWith(DRY_RUN_STAFF_TOKEN_PREFIX))) {
        throw new Error(`Dry-run tenant authorization mismatch for ${method} ${endpoint}.`);
    }
}

function log(msg) {
    const prefix = isDryRun() ? '[DRY-RUN]' : '[EXEC]';
    console.log(`${new Date().toISOString()} ${prefix} ${msg}`);
}

async function apiCall(method, endpoint, body = null, token = null, callOptions = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    if (isDryRun() && endpoint === '/auth/login') {
        const adminEmail = process.env.ADMIN_EMAIL || PLATFORM_ADMIN_EMAIL;
        if (body.email === adminEmail) {
            log(`Simulated PLATFORM_ADMIN login for ${body.email}`);
            return { accessToken: DRY_RUN_PLATFORM_ADMIN_TOKEN };
        }
        if (body.email.startsWith('org-admin@') || body.email.startsWith('org-admin-') || body.email.includes('org-admin')) {
            log(`Simulated ORG_ADMIN login for ${body.email}`);
            return { accessToken: `${DRY_RUN_ORG_ADMIN_TOKEN_PREFIX}${body.email}` };
        }
        if (body.email.startsWith('staff@') || body.email.startsWith('staff-') || body.email.includes('staff')) {
            log(`Simulated STAFF login for ${body.email}`);
            return { accessToken: `${DRY_RUN_STAFF_TOKEN_PREFIX}${body.email}` };
        }
        throw new Error(`Dry-run login has no configured role for ${body.email}.`);
    }

    if (isDryRun() && method !== 'GET') {
        const availabilityMatch = endpoint.match(/^\/counters\/([^\/]+)\/availability$/);
        const assignmentMatch = endpoint.match(/^\/counters\/([^\/]+)\/services\/([^\/]+)$/);
        const callNextMatch = endpoint.match(/^\/staff\/counters\/([^\/]+)\/call-next$/);

        if (method === 'PUT' && availabilityMatch) {
            requireDryRunTenantToken(token, method, endpoint);
            if (!body || body.availability !== 'ONLINE') {
                throw new Error(`Dry-run counter availability must be ONLINE.`);
            }
            log(`Simulated ${method} ${endpoint}`);
            const counterId = availabilityMatch[1];
            mockState.counterOnline.add(counterId);
            return { id: counterId, availability: 'ONLINE' };
        } else if (method === 'POST' && assignmentMatch) {
            requireDryRunTenantToken(token, method, endpoint);
            if (mockState.tokensProcessingStarted) {
                throw new Error('Dry-run assertion failed: Assignment happens after token processing begins.');
            }
            log(`Simulated ${method} ${endpoint}`);
            mockState.counterAssignments.add(assignmentMatch[1] + '_' + assignmentMatch[2]);
            return {};
        } else if (method === 'POST' && endpoint === '/tokens') {
            mockState.tokensProcessingStarted = true;
            const id = crypto.randomUUID();
            mockState.queue.push(id);
            log(`Simulated ${method} ${endpoint}`);
            return { id };
        } else if (method === 'POST' && endpoint.match(/^\/tokens\/([^\/]+)\/cancel$/)) {
            const tokenId = endpoint.match(/^\/tokens\/([^\/]+)\/cancel$/)[1];
            mockState.queue = mockState.queue.filter(id => id !== tokenId);
            log(`Simulated ${method} ${endpoint}`);
            return {};
        } else if (method === 'POST' && callNextMatch) {
            if (!token || !token.startsWith(DRY_RUN_STAFF_TOKEN_PREFIX)) {
                throw new Error(`Dry-run staff authorization mismatch for ${method} ${endpoint}.`);
            }
            const counterId = callNextMatch[1];
            if (!mockState.counterOnline.has(counterId)) {
                throw new Error('Dry-run assertion failed: call-next happens before the counter is ONLINE.');
            }
            let hasAssignment = false;
            for (const key of mockState.counterAssignments) {
                if (key.startsWith(counterId + '_')) {
                    hasAssignment = true;
                    break;
                }
            }
            if (!hasAssignment) {
                throw new Error('Dry-run assertion failed: Counter-service assignment is missing.');
            }
            if (mockState.queue.length === 0) {
                throw new Error('Dry-run assertion failed: call-next but queue is empty.');
            }
            const pulledId = mockState.queue.shift();
            mockState.calledTokens[pulledId] = counterId;
            log(`Simulated ${method} ${endpoint}`);
            return { id: pulledId };
        }

        const staffActionMatch = endpoint.match(/^\/staff\/tokens\/([^\/]+)\/(start-service|complete|no-show)/);
        if (method === 'POST' && staffActionMatch) {
            const tokenId = staffActionMatch[1];
            if (!mockState.calledTokens[tokenId]) {
                throw new Error(`Dry-run assertion failed: Token ${tokenId} was not selected by call-next.`);
            }
        }

        if (endpoint === '/tenants' || (endpoint === '/users' && body && body.role === 'ORG_ADMIN')) {
            requireDryRunToken(token, DRY_RUN_PLATFORM_ADMIN_TOKEN, method, endpoint);
        } else if (['/locations', '/services', '/queues', '/counters', '/users', '/tokens'].includes(endpoint) || endpoint.startsWith('/counters/')) {
            if (endpoint !== '/tokens' && !endpoint.startsWith('/counters/')) {
                requireDryRunTenantToken(token, method, endpoint);
            }
        } else if (endpoint.startsWith('/staff/')) {
            if (!token || !token.startsWith(DRY_RUN_STAFF_TOKEN_PREFIX)) {
                throw new Error(`Dry-run staff authorization mismatch for ${method} ${endpoint}.`);
            }
        }
        log(`Simulated ${method} ${endpoint}`);
        return { id: crypto.randomUUID() };
    }
    
    if (isDryRun() && method === 'GET') {
        if (endpoint.startsWith('/analytics/')) {
            requireDryRunTenantToken(token, method, endpoint);
        }
        log(`Simulated GET ${endpoint}`);
        if (endpoint.startsWith('/analytics/summary')) {
            const url = new URL('http://localhost' + endpoint);
            const startStr = url.searchParams.get('start');
            const endStr = url.searchParams.get('end');
            const orgId = url.searchParams.get('orgId');
            const now = Date.now();
            const startTime = startStr ? new Date(startStr).getTime() : now;
            const endTime = endStr ? new Date(endStr).getTime() : now;
            const tokenTime = mockState.backdated ? (now - 5 * 24 * 60 * 60 * 1000) : now;
            const includesTokens = (startTime <= tokenTime && endTime >= tokenTime);
            const isPilot = manifest?.config?.pilot ?? activeConfig.isPilot;
            const isSample = manifest?.config?.sample ?? activeConfig.isSample;

            const orgIdx = manifest?.generated?.organizations ? manifest.generated.organizations.indexOf(orgId) : -1;
            const isOrg1 = orgIdx === 1 || (orgIdx === -1 && Boolean(
                (token && token.includes('-O1')) ||
                (orgId && (orgId.includes('O1') || orgId.includes('org-2') || orgId.includes('test-org-2')))
            ));

            if (includesTokens) {
                if (isPilot) {
                    return {
                        operationalTokenVolume: 5,
                        queueVolume: 5,
                        completedTokens: 2,
                        noShows: 1,
                        cancellations: 1,
                        transfers: 0,
                        currentQueueLoad: 1,
                        completionRate: 0.4,
                        noShowRate: 0.2,
                        cancellationRate: 0.2
                    };
                } else if (isSample) {
                    const completed = 35;
                    const noShows = isOrg1 ? 7 : 8;
                    const cancellations = isOrg1 ? 2 : 3;
                    const queueLoad = isOrg1 ? 6 : 4;
                    return {
                        operationalTokenVolume: 50,
                        queueVolume: 50,
                        completedTokens: completed,
                        noShows: noShows,
                        cancellations: cancellations,
                        transfers: 0,
                        currentQueueLoad: queueLoad,
                        completionRate: 0.7,
                        noShowRate: isOrg1 ? 0.14 : 0.16,
                        cancellationRate: isOrg1 ? 0.04 : 0.06
                    };
                } else {
                    return {
                        operationalTokenVolume: 100,
                        queueVolume: 100,
                        completedTokens: 70,
                        noShows: 15,
                        cancellations: 5,
                        transfers: 0,
                        currentQueueLoad: 10,
                        completionRate: 0.7,
                        noShowRate: 0.15,
                        cancellationRate: 0.05
                    };
                }
            } else {
                return {
                    operationalTokenVolume: 0,
                    queueVolume: 0,
                    completedTokens: 0,
                    noShows: 0,
                    cancellations: 0,
                    transfers: 0,
                    currentQueueLoad: isPilot ? 1 : (isSample ? (isOrg1 ? 6 : 4) : 10),
                    completionRate: 0.0,
                    noShowRate: 0.0,
                    cancellationRate: 0.0
                };
            }
        }
        return { operationalTokenVolume: -1, completed: 2, noShow: 1, cancelled: 1, waiting: 1 };
    }

    const pacer = callOptions.pacer || activeConfig.pacer;
    const sleepFn = callOptions.sleepFn || activeConfig.sleepFn || ((ms) => new Promise(r => setTimeout(r, ms)));
    const maxRetries = callOptions.maxRetries ?? activeConfig.max429Retries ?? 3;
    const default429DelayMs = callOptions.default429DelayMs ?? activeConfig.default429DelayMs ?? 1000;
    const fetchFn = callOptions.fetchFn || activeConfig.fetchFn || fetch;

    if (pacer) {
        await pacer.pace(method, endpoint, isDryRun());
    }

    let attempt = 0;
    while (true) {
        let res;
        try {
            res = await fetchFn(`${activeConfig.apiBase}${endpoint}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : null
            });
        } catch (networkErr) {
            if (isNonIdempotentCreation(method, endpoint)) {
                throw new Error(
                    `Ambiguous network failure on non-idempotent ${method} ${endpoint}: ${networkErr.message}. ` +
                    `Server commit status is unconfirmed; refusing to retry to prevent duplicate resource creation.`
                );
            }
            log(`FAILED API Call (network error): ${networkErr.message}`);
            throw networkErr;
        }

        if (res.status === 429) {
            const errText = await res.text();
            if (attempt >= maxRetries) {
                const errMsg = `Rate limit 429 exceeded after ${maxRetries} retries on ${method} ${endpoint}: ${errText}`;
                log(`FAILED API Call: ${errMsg}`);
                throw new Error(errMsg);
            }

            const retryAfterHeader = res.headers?.get ? (res.headers.get('Retry-After') || res.headers.get('retry-after')) : null;
            const parsedWaitMs = parseRetryAfter(retryAfterHeader);
            const waitMs = parsedWaitMs !== null ? parsedWaitMs : (default429DelayMs * Math.pow(2, attempt));

            log(`Received 429 RATE_LIMIT_EXCEEDED on ${method} ${endpoint}. Retrying after ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
            await sleepFn(waitMs);
            attempt++;
            continue;
        }

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`API Error ${res.status} on ${method} ${endpoint}: ${err}`);
        }
        
        if (res.status === 204) {
            return null;
        }

        const text = await res.text();

        if (!text.trim()) {
            return null;
        }

        return JSON.parse(text);
    }
}

async function executeSql(sql, execSyncFn = execSync) {
    if (isDryRun()) {
        log(`Simulated SQL: ${sql}`);
        if (sql.includes("UPDATE tokens SET joined_at = joined_at - INTERVAL '5 days'")) {
            mockState.backdated = true;
            log(`[SIMULATED BACKDATE] Shifted synthetic token and event timestamps by 5 days.`);
        }
        return "0";
    }
    log(`Executing SQL: ${sql}`);
    try {
        return execSyncFn(`docker exec -i ${activeConfig.dbContainer} psql -U ${activeConfig.dbUser} -d ${activeConfig.dbName} -v ON_ERROR_STOP=1 -t -c "${sql}"`).toString().trim();
    } catch (e) {
        log(`Failed executing SQL: ${e.message}`);
        throw e;
    }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildBackdateSql(orgIds) {
    if (orgIds === null || orgIds === undefined) return null;
    if (Array.isArray(orgIds) && orgIds.length === 0) return null;

    let orgIdArray;
    if (Array.isArray(orgIds)) {
        orgIdArray = orgIds;
    } else if (typeof orgIds === 'string') {
        orgIdArray = [orgIds];
    } else {
        throw new Error(`Invalid organization ID input: expected UUID string or array of UUID strings, received ${typeof orgIds}.`);
    }

    if (orgIdArray.length === 0) return null;

    for (const id of orgIdArray) {
        if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
            throw new Error(`Invalid organization UUID: ${JSON.stringify(id)}. Expected valid 36-character hexadecimal UUID format.`);
        }
    }

    const idList = orgIdArray.map(id => `'${id}'`).join(',');
    const shiftInterval = "INTERVAL '5 days'";
    const updateTokensSql = `UPDATE tokens SET joined_at = joined_at - ${shiftInterval}, called_at = called_at - ${shiftInterval}, served_at = served_at - ${shiftInterval}, completed_at = completed_at - ${shiftInterval}, step_away_expires_at = step_away_expires_at - ${shiftInterval}, sms_consent_timestamp = sms_consent_timestamp - ${shiftInterval}, created_at = created_at - ${shiftInterval}, updated_at = updated_at - ${shiftInterval}, priority_timestamp = priority_timestamp - ${shiftInterval} WHERE org_id IN (${idList});`;
    const updateEventsSql = `UPDATE token_events SET created_at = created_at - ${shiftInterval} WHERE org_id IN (${idList});`;
    return `BEGIN; ${updateTokensSql} ${updateEventsSql} COMMIT;`;
}

async function cleanup(manifestPath) {
    validateTargetSafety(activeConfig, activeConfig.isDryRun);
    if (!fs.existsSync(manifestPath)) {
        log(`Manifest not found: ${manifestPath}`);
        return;
    }
    const cleanManifest = JSON.parse(fs.readFileSync(manifestPath));
    log(`Cleaning up dataset ${cleanManifest.runId}...`);
    
    // 2. Cleanup Validation
    if (cleanManifest.generated.organizations.length > 0) {
        const orgIds = cleanManifest.generated.organizations.map(o => `'${o}'`).join(',');
        const checkSql = `SELECT count(*) FROM organizations WHERE id IN (${orgIds}) AND left(name, 6) <> '[SYNC-';`;
        const countSql = `SELECT count(*) FROM organizations WHERE id IN (${orgIds});`;
        
        const invalidOutput = await executeSql(checkSql);
        const totalOutput = await executeSql(countSql);
        
        if (parseInt(invalidOutput) > 0 || parseInt(totalOutput) !== cleanManifest.generated.organizations.length) {
            log("FATAL: Cannot cleanup. Found organizations in manifest that are missing or do NOT have the [SYNC-] prefix. Aborting to protect E2E data.");
            process.exit(1);
        }
        
        const deleteSql = `DELETE FROM organizations WHERE id IN (${orgIds}) AND left(name, 6) = '[SYNC-';`;
        await executeSql(deleteSql);
    }
    log(`Cleanup completed for ${cleanManifest.runId}.`);
}

async function validateOperationalAnalytics(orgCtx, options = {}) {
    const { isPilot = IS_PILOT, isSample = false, manifestRef = manifest, apiCaller = apiCall } = options;
    const { orgId, orgCode, orgAdminToken, expectedTokens } = orgCtx;

    log(`[OPERATIONAL VALIDATION] Validating generated data via Analytics API for Org ${orgCode} (${orgId})...`);
    const now = Date.now();
    const start = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = new Date(now + 24 * 60 * 60 * 1000).toISOString();

    const summary = await apiCaller('GET', `/analytics/summary?orgId=${orgId}&start=${start}&end=${end}`, null, orgAdminToken);
    if (!summary) {
        throw new Error(`Operational validation failed: Analytics API returned empty response for Org ${orgCode} (${orgId}).`);
    }

    const reportedVolume = Number(summary.operationalTokenVolume ?? 0);
    if (reportedVolume !== expectedTokens) {
        throw new Error(`Operational validation failed! Org ${orgCode}: reported operationalTokenVolume ${reportedVolume}, expected ${expectedTokens}.`);
    }

    let checkRecord = {
        orgId,
        phase: 'OPERATIONAL_WINDOW',
        window: { start, end },
        expected: { operationalTokenVolume: expectedTokens },
        reported: { operationalTokenVolume: reportedVolume },
        passed: true
    };

    if (isPilot || isSample) {
        let expected;
        if (isPilot) {
            expected = {
                operationalTokenVolume: 5,
                completedTokens: 2,
                noShows: 1,
                cancellations: 1,
                currentQueueLoad: 1
            };
        } else {
            if (orgCtx.expectedBreakdown) {
                expected = {
                    operationalTokenVolume: expectedTokens,
                    completedTokens: orgCtx.expectedBreakdown.completedTokens,
                    noShows: orgCtx.expectedBreakdown.noShows,
                    cancellations: orgCtx.expectedBreakdown.cancellations,
                    currentQueueLoad: orgCtx.expectedBreakdown.currentQueueLoad
                };
            } else {
                const isOrg1 = orgCtx.orgIndex === 1 || (orgCtx.orgCode && (orgCtx.orgCode.endsWith('O1') || orgCtx.orgCode.includes('-O1') || orgCtx.orgCode.includes('org-2') || orgCtx.orgCode.includes('test-org-2')));
                expected = {
                    operationalTokenVolume: 50,
                    completedTokens: 35,
                    noShows: isOrg1 ? 7 : 8,
                    cancellations: isOrg1 ? 2 : 3,
                    currentQueueLoad: isOrg1 ? 6 : 4
                };
            }
        }

        const reported = {
            operationalTokenVolume: reportedVolume,
            completedTokens: Number(summary.completedTokens ?? 0),
            noShows: Number(summary.noShows ?? 0),
            cancellations: Number(summary.cancellations ?? 0),
            currentQueueLoad: Number(summary.currentQueueLoad ?? 0)
        };

        if (reported.completedTokens !== expected.completedTokens) {
            throw new Error(`Operational validation failed! Org ${orgCode}: reported completedTokens ${reported.completedTokens}, expected ${expected.completedTokens}.`);
        }
        if (reported.noShows !== expected.noShows) {
            throw new Error(`Operational validation failed! Org ${orgCode}: reported noShows ${reported.noShows}, expected ${expected.noShows}.`);
        }
        if (reported.cancellations !== expected.cancellations) {
            throw new Error(`Operational validation failed! Org ${orgCode}: reported cancellations ${reported.cancellations}, expected ${expected.cancellations}.`);
        }
        if (reported.currentQueueLoad !== expected.currentQueueLoad) {
            throw new Error(`Operational validation failed! Org ${orgCode}: reported currentQueueLoad ${reported.currentQueueLoad}, expected ${expected.currentQueueLoad}.`);
        }

        checkRecord.expected = expected;
        checkRecord.reported = reported;
        log(`Operational validation SUCCESS for Org ${orgCode}: ${expected.operationalTokenVolume} tokens (${expected.completedTokens} completed, ${expected.noShows} no-show, ${expected.cancellations} cancelled, ${expected.currentQueueLoad} waiting).`);
    } else {
        log(`Operational validation SUCCESS for Org ${orgCode}: volume matches expected ${expectedTokens}.`);
    }

    if (manifestRef && manifestRef.validation && Array.isArray(manifestRef.validation.checks)) {
        manifestRef.validation.checks.push(checkRecord);
    }
    return checkRecord;
}

async function validatePostBackdateAnalytics(orgCtx, options = {}) {
    const { isPilot = IS_PILOT, isSample = false, expectedQueueLoad, manifestRef = manifest, apiCaller = apiCall } = options;
    const { orgId, orgCode, orgAdminToken, expectedTokens } = orgCtx;

    let targetQueueLoad;
    if (expectedQueueLoad !== undefined) {
        if (
            typeof expectedQueueLoad !== 'number' ||
            Number.isNaN(expectedQueueLoad) ||
            !Number.isInteger(expectedQueueLoad) ||
            expectedQueueLoad < 0 ||
            Object.is(expectedQueueLoad, -0)
        ) {
            throw new Error(`Invalid expectedQueueLoad: expected a non-negative integer, got ${typeof expectedQueueLoad === 'string' ? `"${expectedQueueLoad}"` : expectedQueueLoad}.`);
        }
        targetQueueLoad = expectedQueueLoad;
    } else if (orgCtx.expectedQueueLoad !== undefined) {
        targetQueueLoad = orgCtx.expectedQueueLoad;
    } else if (isPilot) {
        targetQueueLoad = 1;
    } else if (isSample) {
        const isOrg1 = orgCtx.orgIndex === 1 || (orgCtx.orgCode && (orgCtx.orgCode.endsWith('O1') || orgCtx.orgCode.includes('-O1') || orgCtx.orgCode.includes('org-2') || orgCtx.orgCode.includes('test-org-2')));
        targetQueueLoad = isOrg1 ? 6 : 4;
    } else {
        targetQueueLoad = null;
    }

    log(`[POST-BACKDATE VALIDATION] Validating historical date window for Org ${orgCode} (${orgId})...`);
    const now = Date.now();
    // 5-day shift: center explicit historical window around 5 days ago [6 days ago, 4 days ago]
    const histStart = new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString();
    const histEnd = new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString();

    const histSummary = await apiCaller('GET', `/analytics/summary?orgId=${orgId}&start=${histStart}&end=${histEnd}`, null, orgAdminToken);
    if (!histSummary) {
        throw new Error(`Post-backdate historical validation failed: Analytics API returned empty response for Org ${orgCode} (${orgId}).`);
    }

    const reportedHistVolume = Number(histSummary.operationalTokenVolume ?? 0);
    if (reportedHistVolume !== expectedTokens) {
        throw new Error(`Post-backdate historical validation failed! Org ${orgCode}: reported operationalTokenVolume ${reportedHistVolume}, expected ${expectedTokens}.`);
    }

    let histRecord = {
        orgId,
        phase: 'HISTORICAL_WINDOW',
        window: { start: histStart, end: histEnd },
        expected: { operationalTokenVolume: expectedTokens },
        reported: { operationalTokenVolume: reportedHistVolume },
        passed: true
    };

    if (isPilot || isSample) {
        let expected;
        if (isPilot) {
            expected = {
                operationalTokenVolume: 5,
                completedTokens: 2,
                noShows: 1,
                cancellations: 1,
                currentQueueLoad: 1
            };
        } else {
            if (orgCtx.expectedBreakdown) {
                expected = {
                    operationalTokenVolume: expectedTokens,
                    completedTokens: orgCtx.expectedBreakdown.completedTokens,
                    noShows: orgCtx.expectedBreakdown.noShows,
                    cancellations: orgCtx.expectedBreakdown.cancellations,
                    currentQueueLoad: orgCtx.expectedBreakdown.currentQueueLoad
                };
            } else {
                const isOrg1 = orgCtx.orgIndex === 1 || (orgCtx.orgCode && (orgCtx.orgCode.endsWith('O1') || orgCtx.orgCode.includes('-O1') || orgCtx.orgCode.includes('org-2') || orgCtx.orgCode.includes('test-org-2')));
                expected = {
                    operationalTokenVolume: 50,
                    completedTokens: 35,
                    noShows: isOrg1 ? 7 : 8,
                    cancellations: isOrg1 ? 2 : 3,
                    currentQueueLoad: isOrg1 ? 6 : 4
                };
            }
        }

        const reported = {
            operationalTokenVolume: reportedHistVolume,
            completedTokens: Number(histSummary.completedTokens ?? 0),
            noShows: Number(histSummary.noShows ?? 0),
            cancellations: Number(histSummary.cancellations ?? 0),
            currentQueueLoad: Number(histSummary.currentQueueLoad ?? 0)
        };

        if (reported.completedTokens !== expected.completedTokens) {
            throw new Error(`Post-backdate validation failed! Org ${orgCode}: historical completedTokens ${reported.completedTokens}, expected ${expected.completedTokens}.`);
        }
        if (reported.noShows !== expected.noShows) {
            throw new Error(`Post-backdate validation failed! Org ${orgCode}: historical noShows ${reported.noShows}, expected ${expected.noShows}.`);
        }
        if (reported.cancellations !== expected.cancellations) {
            throw new Error(`Post-backdate validation failed! Org ${orgCode}: historical cancellations ${reported.cancellations}, expected ${expected.cancellations}.`);
        }
        if (reported.currentQueueLoad !== expected.currentQueueLoad) {
            throw new Error(`Post-backdate validation failed! Org ${orgCode}: historical currentQueueLoad ${reported.currentQueueLoad}, expected ${expected.currentQueueLoad}.`);
        }

        histRecord.expected = expected;
        histRecord.reported = reported;
        log(`Post-backdate historical validation SUCCESS for Org ${orgCode}: ${expected.operationalTokenVolume} tokens (${expected.completedTokens} completed, ${expected.noShows} no-show, ${expected.cancellations} cancelled, ${expected.currentQueueLoad} waiting).`);
    } else {
        log(`Post-backdate historical validation SUCCESS for Org ${orgCode}: volume matches expected ${expectedTokens}.`);
    }

    if (manifestRef && manifestRef.validation && Array.isArray(manifestRef.validation.checks)) {
        manifestRef.validation.checks.push(histRecord);
    }

    // Current window zero-leak check: verify that shifted tokens do NOT leak into current-time window
    log(`[POST-BACKDATE CURRENT WINDOW CHECK] Confirming historical tokens do not report in current window for Org ${orgCode}...`);
    const currStart = new Date(now - 60 * 60 * 1000).toISOString(); // 1 hour ago
    const currEnd = new Date(now + 60 * 60 * 1000).toISOString(); // 1 hour ahead

    const currSummary = await apiCaller('GET', `/analytics/summary?orgId=${orgId}&start=${currStart}&end=${currEnd}`, null, orgAdminToken);
    if (!currSummary) {
        throw new Error(`Post-backdate current window check failed: Analytics API returned empty response for Org ${orgCode} (${orgId}).`);
    }

    const currVolume = Number(currSummary.operationalTokenVolume ?? 0);
    const currCompleted = Number(currSummary.completedTokens ?? 0);
    const currNoShows = Number(currSummary.noShows ?? 0);
    const currCancellations = Number(currSummary.cancellations ?? 0);

    const rawQueueLoad = currSummary.currentQueueLoad;
    if (rawQueueLoad === undefined || rawQueueLoad === null || rawQueueLoad === '') {
        throw new Error(`Post-backdate current window check failed! Org ${orgCode}: currentQueueLoad is missing or null.`);
    }

    const currQueueLoad = Number(rawQueueLoad);
    if (typeof rawQueueLoad === 'boolean' || !Number.isFinite(currQueueLoad) || !Number.isInteger(currQueueLoad) || currQueueLoad < 0) {
        throw new Error(`Post-backdate current window check failed! Org ${orgCode}: currentQueueLoad must be a non-negative integer, got ${rawQueueLoad}.`);
    }

    let currRecord = {
        orgId,
        phase: 'CURRENT_WINDOW_ZERO_CHECK',
        window: { start: currStart, end: currEnd },
        expected: {
            operationalTokenVolume: 0,
            completedTokens: 0,
            noShows: 0,
            cancellations: 0,
            ...(targetQueueLoad !== null ? { currentQueueLoad: targetQueueLoad } : {})
        },
        reported: {
            operationalTokenVolume: currVolume,
            completedTokens: currCompleted,
            noShows: currNoShows,
            cancellations: currCancellations,
            currentQueueLoad: currQueueLoad
        },
        passed: true
    };

    // 1. Time-windowed zero-token assertion: historical shifted tokens must not appear in current window
    if (currVolume !== 0 || currCompleted !== 0 || currNoShows !== 0 || currCancellations !== 0) {
        throw new Error(`Post-backdate current window check failed! Historical tokens reported in current window for Org ${orgCode}: volume=${currVolume}, completed=${currCompleted}, noShows=${currNoShows}, cancellations=${currCancellations}. Expected all 0.`);
    }

    // 2. Point-in-time gauge assertion: unserved active tokens must match expected current queue load when specified
    if (targetQueueLoad !== null) {
        if (currQueueLoad !== targetQueueLoad) {
            throw new Error(`Post-backdate current window check failed! Org ${orgCode}: currentQueueLoad ${currQueueLoad}, expected ${targetQueueLoad}.`);
        }
    }

    log(`Post-backdate current window check SUCCESS for Org ${orgCode}: 0 tokens in current window, currentQueueLoad=${currQueueLoad}.`);
    if (manifestRef && manifestRef.validation && Array.isArray(manifestRef.validation.checks)) {
        manifestRef.validation.checks.push(currRecord);
    }

    return { histRecord, currRecord };
}

async function run(options = {}) {
    activeConfig.isDryRun = options.isDryRun !== undefined ? options.isDryRun : IS_DRY_RUN;
    activeConfig.isPilot = options.isPilot !== undefined ? options.isPilot : IS_PILOT;
    activeConfig.isSample = options.isSample !== undefined ? options.isSample : IS_SAMPLE;
    activeConfig.enableBackdate = options.enableBackdate !== undefined ? options.enableBackdate : ENABLE_BACKDATE;

    if (activeConfig.isPilot && activeConfig.isSample) {
        throw new Error('Conflicting configuration: cannot specify both pilot mode and sample mode simultaneously.');
    }

    const resolved = resolveConfig(options);
    activeConfig.apiBase = resolved.apiBase;
    activeConfig.dbContainer = resolved.dbContainer;
    activeConfig.dbName = resolved.dbName;
    activeConfig.dbUser = resolved.dbUser;
    activeConfig.max429Retries = options.max429Retries !== undefined ? options.max429Retries : 3;
    activeConfig.default429DelayMs = options.default429DelayMs !== undefined ? options.default429DelayMs : 1000;
    activeConfig.sleepFn = options.sleepFn || null;
    activeConfig.fetchFn = options.fetchFn || null;
    if (options.pacer) {
        activeConfig.pacer = options.pacer;
    } else if (options.sleepFn) {
        activeConfig.pacer = new RequestPacer({ sleepFn: options.sleepFn });
    } else {
        activeConfig.pacer = new RequestPacer();
    }

    validateTargetSafety(resolved, activeConfig.isDryRun);

    const isDryRun = activeConfig.isDryRun;
    const isPilot = activeConfig.isPilot;
    const isSample = activeConfig.isSample;
    const enableBackdate = activeConfig.enableBackdate;
    const cleanManifest = options.cleanManifest !== undefined ? options.cleanManifest : CLEAN_MANIFEST;
    const sqlExecutor = options.sqlExecutor || executeSql;
    const manifestDir = options.manifestDir || path.join(__dirname, 'synthetic-runs');
    const expectedQueueLoad = options.expectedQueueLoad;
    const runId = options.runId || RUN_ID;
    const runPrefix = options.runId ? `[SYNC-${options.runId.replace(/^SYNC-/, '')}]` : RUN_PREFIX;

    if (cleanManifest) {
        await cleanup(cleanManifest);
        return;
    }

    if (options.checkCollision !== false) {
        if (!activeConfig.isDryRun || options.checkRunCollision) {
            checkRunCollision({
                runId,
                manifestDir,
                isDryRun: activeConfig.isDryRun,
                sqlExecutor
            });
        }
    }

    log(`Starting Synthetic Data Generation. RUN_ID: ${runId}`);
    const targetOrgs = isPilot ? 1 : (isSample ? 2 : 10);
    const locsPerOrg = isPilot ? 1 : (isSample ? 2 : 3);
    const servicesPerLoc = isPilot ? 1 : 2;
    const queuesPerLoc = isPilot ? 1 : 2;
    const countersPerLoc = isPilot ? 1 : 4;
    const orgAdminsPerOrg = isPilot ? 1 : 2;
    const staffPerLoc = isPilot ? 1 : 6;
    const expectedTokensPerOrg = isPilot ? 5 : (isSample ? 50 : 100);

    const totalUsers = isPilot ? 2 : (targetOrgs * orgAdminsPerOrg + targetOrgs * locsPerOrg * staffPerLoc);
    const totalServices = targetOrgs * locsPerOrg * servicesPerLoc;
    const totalQueues = targetOrgs * locsPerOrg * queuesPerLoc;
    const totalCounters = targetOrgs * locsPerOrg * countersPerLoc;
    const totalTokens = targetOrgs * expectedTokensPerOrg;

    for (const key of Object.keys(manifest)) {
        delete manifest[key];
    }
    Object.assign(manifest, {
        runId: runId,
        timestamp: new Date().toISOString(),
        status: 'IN_PROGRESS',
        config: { pilot: isPilot, sample: isSample, backdate: enableBackdate, dryRun: isDryRun },
        generated: {
            organizations: [],
            locations: [],
            services: [],
            queues: [],
            counters: [],
            users: [],
            tokens: []
        },
        validation: {
            status: 'PENDING',
            mode: isPilot ? 'PILOT' : (isSample ? 'SAMPLE' : 'FULL'),
            backdated: enableBackdate,
            checks: []
        }
    });

    log(`--- GENERATION PLAN ---`);
    log(`Organizations: ${targetOrgs}`);
    log(`Locations per Org: ${locsPerOrg} (Total Locations: ${targetOrgs * locsPerOrg})`);
    log(`Services per Location: ${servicesPerLoc} (Total Services: ${totalServices})`);
    log(`Queues per Location: ${queuesPerLoc} (Total Queues: ${totalQueues})`);
    log(`Counters per Location: ${countersPerLoc} (Total Counters: ${totalCounters})`);
    log(`Org Admins per Org: ${orgAdminsPerOrg} (Total Org Admins: ${targetOrgs * orgAdminsPerOrg})`);
    log(`Staff per Location: ${staffPerLoc} (Total Staff: ${targetOrgs * locsPerOrg * staffPerLoc})`);
    log(`Total Staff and Administrators: ${totalUsers}`);
    log(`Expected Tokens per Org: ${expectedTokensPerOrg}`);
    log(`Total Tokens: ${totalTokens}`);
    log(`-----------------------`);

    if (isDryRun) log(`--- DRY RUN MODE ACTIVE - No changes will be made ---`);
    if (isPilot) log(`--- PILOT MODE ACTIVE - Generating deterministic 5-token set ---`);
    if (isSample) log(`--- SAMPLE MODE ACTIVE - Generating deterministic 100-token sample set ---`);

    try {
        let adminToken = null;
        log(`Authenticating as PLATFORM_ADMIN...`);
        const adminEmail = process.env.ADMIN_EMAIL || PLATFORM_ADMIN_EMAIL;
        const adminPass = process.env.ADMIN_PASSWORD || PLATFORM_ADMIN_PASS;
        const loginRes = await apiCall('POST', '/auth/login', { email: adminEmail, password: adminPass });
        adminToken = loginRes.accessToken;
        if (!adminToken) {
            throw new Error('Login succeeded but accessToken was missing from the response.');
        }

        const orgContexts = [];

        // --- PHASE 1: STRUCTURAL PROVISIONING ---
        // Provision organizations, locations, services, queues, counters, assignments, and staff
        for (let o = 0; o < targetOrgs; o++) {
            const orgCode = `${runId}-O${o}`;
            const org = await apiCall('POST', '/tenants', {
                name: `${runPrefix} Org ${o}`,
                code: orgCode,
                sector: 'Healthcare',
                contactEmail: `contact@${orgCode}.com`,
                address: '123 Fake St'
            }, adminToken);
            manifest.generated.organizations.push(org.id);

            let primaryOrgAdminToken = null;
            for (let a = 0; a < orgAdminsPerOrg; a++) {
                const orgAdminEmail = (a === 0 && isPilot)
                    ? `org-admin@${orgCode}.com`.toLowerCase()
                    : (a === 0 ? `org-admin@${orgCode}.com`.toLowerCase() : `org-admin-${a}@${orgCode}.com`.toLowerCase());
                const orgAdminPass = 'orgadmin123';
                const orgAdmin = await apiCall('POST', '/users', {
                    email: orgAdminEmail,
                    name: `${runPrefix} Organization Admin ${a + 1}`,
                    role: 'ORG_ADMIN',
                    password: orgAdminPass,
                    orgId: org.id
                }, adminToken);
                manifest.generated.users.push(orgAdmin.id);

                if (a === 0) {
                    log(`Authenticating as primary ORG_ADMIN for ${orgCode}...`);
                    const orgAdminLogin = await apiCall('POST', '/auth/login', { email: orgAdminEmail, password: orgAdminPass });
                    primaryOrgAdminToken = orgAdminLogin.accessToken;
                    if (!primaryOrgAdminToken) {
                        throw new Error('Organization admin login succeeded but accessToken was missing from the response.');
                    }
                }
            }

            const orgLocations = [];
            const orgQueues = [];

            for (let l = 0; l < locsPerOrg; l++) {
                const locCode = `${orgCode}-L${l}`;
                const loc = await apiCall('POST', '/locations', {
                    orgId: org.id,
                    name: `${runPrefix} Location ${l}`,
                    code: locCode,
                    address: '123 Location St',
                    isHq: l === 1
                }, primaryOrgAdminToken);
                manifest.generated.locations.push(loc.id);

                const locationServices = [];
                for (let s = 0; s < servicesPerLoc; s++) {
                    const svcName = isPilot ? `${runPrefix} General Service` : `${runPrefix} Service ${s + 1}`;
                    const svcCode = isPilot ? `${locCode}-SVC` : `${locCode}-SVC${s + 1}`;
                    const svc = await apiCall('POST', '/services', {
                        locationId: loc.id,
                        name: svcName,
                        code: svcCode,
                        description: 'Synthetic service',
                        estimatedDurationMinutes: 10,
                        isFastTrack: s === 1
                    }, primaryOrgAdminToken);
                    manifest.generated.services.push(svc.id);
                    locationServices.push(svc);

                    const queueName = isPilot ? `${runPrefix} Main Queue` : `${runPrefix} Queue ${s + 1}`;
                    const queueCode = isPilot ? `${locCode}-Q` : `${locCode}-Q${s + 1}`;
                    const queue = await apiCall('POST', '/queues', {
                        serviceId: svc.id,
                        name: queueName,
                        code: queueCode
                    }, primaryOrgAdminToken);
                    manifest.generated.queues.push(queue.id);
                    orgQueues.push({ queue, service: svc, locationId: loc.id });
                }

                const locationCounters = [];
                for (let c = 0; c < countersPerLoc; c++) {
                    const counterNumber = c + 1;
                    const counter = await apiCall('POST', '/counters', {
                        locationId: loc.id,
                        number: counterNumber,
                        name: `${runPrefix} Counter ${counterNumber}`
                    }, primaryOrgAdminToken);
                    manifest.generated.counters.push(counter.id);
                    locationCounters.push(counter);

                    for (const svc of locationServices) {
                        await apiCall('POST', `/counters/${counter.id}/services/${svc.id}`, null, primaryOrgAdminToken);
                    }
                }

                const locationStaffTokens = [];
                for (let st = 0; st < staffPerLoc; st++) {
                    const staffEmail = isPilot
                        ? `staff@${locCode}.com`.toLowerCase()
                        : (st === 0 ? `staff@${locCode}.com`.toLowerCase() : `staff-${st}@${locCode}.com`.toLowerCase());
                    const staffPass = 'staff123';
                    const staff = await apiCall('POST', '/users', {
                        email: staffEmail,
                        name: `${runPrefix} Staff ${st + 1}`,
                        role: 'STAFF',
                        password: staffPass,
                        orgId: org.id,
                        locationId: loc.id
                    }, primaryOrgAdminToken);
                    manifest.generated.users.push(staff.id);

                    // Session reuse: Only authenticate the primary staff member (st === 0) for each location.
                    // Reuse this valid session for operating counters at this location, avoiding rate limits.
                    if (st === 0) {
                        const staffLogin = await apiCall('POST', '/auth/login', { email: staffEmail, password: staffPass });
                        const staffToken = staffLogin.accessToken;
                        if (!staffToken) {
                            throw new Error('Staff login succeeded but accessToken was missing from the response.');
                        }
                        locationStaffTokens.push(staffToken);
                    }
                }

                for (let c = 0; c < locationCounters.length; c++) {
                    const staffToken = locationStaffTokens[c % locationStaffTokens.length];
                    await apiCall('PUT', `/counters/${locationCounters[c].id}/availability`, { availability: 'ONLINE' }, staffToken);
                }

                orgLocations.push({
                    location: loc,
                    counters: locationCounters,
                    staffTokens: locationStaffTokens
                });
            }

            let expectedBreakdown = null;
            let expectedOrgQueueLoad = null;

            if (isPilot) {
                expectedBreakdown = {
                    completedTokens: 2,
                    noShows: 1,
                    cancellations: 1,
                    currentQueueLoad: 1
                };
                expectedOrgQueueLoad = 1;
            } else if (isSample) {
                if (o === 0) {
                    expectedBreakdown = {
                        completedTokens: 35,
                        noShows: 8,
                        cancellations: 3,
                        currentQueueLoad: 4
                    };
                    expectedOrgQueueLoad = 4;
                } else {
                    expectedBreakdown = {
                        completedTokens: 35,
                        noShows: 7,
                        cancellations: 2,
                        currentQueueLoad: 6
                    };
                    expectedOrgQueueLoad = 6;
                }
            } else {
                expectedBreakdown = {
                    completedTokens: 70,
                    noShows: 15,
                    cancellations: 5,
                    currentQueueLoad: 10
                };
                expectedOrgQueueLoad = 10;
            }

            orgContexts.push({
                orgId: org.id,
                orgCode: orgCode,
                orgIndex: o,
                orgAdminToken: primaryOrgAdminToken,
                expectedTokens: expectedTokensPerOrg,
                expectedBreakdown,
                expectedQueueLoad: expectedOrgQueueLoad,
                orgLocations,
                orgQueues
            });
        }

        // --- PHASE 2: TOKEN GENERATION & WORKFLOW PROCESSING ---
        // Generate tokens and process valid lifecycles across queues
        const pilotFlows = ['COMPLETED', 'NO_SHOW', 'CANCELLED', 'WAITING', 'COMPLETED'];

        for (let oIndex = 0; oIndex < orgContexts.length; oIndex++) {
            const orgCtx = orgContexts[oIndex];
            const { orgQueues, orgLocations } = orgCtx;
            const locMap = new Map();
            for (const lInfo of orgLocations) {
                locMap.set(lInfo.location.id, lInfo);
            }

            // Distribute exactly 100 tokens (or 50 for sample, 5 for pilot) across the org's queues
            for (let t = 0; t < expectedTokensPerOrg; t++) {
                // Queue selection:
                // In pilot: only 1 queue exists (index 0)
                // In sample mode: 4 queues per org. First 26 tokens (t < 26) cycle among queues 0..1 (13 each).
                // Remaining 24 tokens (t >= 26) cycle among queues 2..3 (12 each).
                // 2 * 13 + 2 * 12 = 26 + 24 = 50 tokens. Across 2 orgs = 4 queues with 13 + 4 queues with 12 = 100 tokens.
                // In full mode: 6 queues per org. First 68 tokens (t < 68) cycle among queues 0..3 (17 each).
                // Remaining 32 tokens (t >= 68) cycle among queues 4..5 (16 each).
                // 4 * 17 + 2 * 16 = 68 + 32 = 100 tokens. Across 10 orgs = 40 queues with 17 + 20 queues with 16 = 1,000 tokens.
                const queueTarget = isPilot
                    ? orgQueues[0]
                    : (isSample
                        ? orgQueues[t < 26 ? (t % 2) : (2 + ((t - 26) % 2))]
                        : orgQueues[t < 68 ? (t % 4) : (4 + ((t - 68) % 2))]);

                const locInfo = locMap.get(queueTarget.locationId);
                const counter = locInfo.counters[t % locInfo.counters.length];
                const staffToken = locInfo.staffTokens[t % locInfo.staffTokens.length];

                const token = await apiCall('POST', '/tokens', {
                    serviceId: queueTarget.service.id,
                    customerName: `Customer ${t}`,
                    customerPhone: `555000${t}`
                }, null);
                manifest.generated.tokens.push(token.id);

                let flow;
                if (isPilot) {
                    flow = pilotFlows[t];
                } else if (isSample) {
                    if (oIndex === 0) {
                        if (t < 35) flow = 'COMPLETED';
                        else if (t < 43) flow = 'NO_SHOW';
                        else if (t < 46) flow = 'CANCELLED';
                        else flow = 'WAITING';
                    } else {
                        if (t < 35) flow = 'COMPLETED';
                        else if (t < 42) flow = 'NO_SHOW';
                        else if (t < 44) flow = 'CANCELLED';
                        else flow = 'WAITING';
                    }
                } else {
                    if (t < 70) flow = 'COMPLETED';
                    else if (t < 85) flow = 'NO_SHOW';
                    else if (t < 90) flow = 'CANCELLED';
                    else flow = 'WAITING';
                }

                if (flow === 'COMPLETED') {
                    const calledToken = await apiCall('POST', `/staff/counters/${counter.id}/call-next`, null, staffToken);
                    if (!calledToken || !calledToken.id) {
                        throw new Error(`call-next returned an invalid or missing token: ${JSON.stringify(calledToken)}`);
                    }
                    await apiCall('POST', `/staff/tokens/${calledToken.id}/start-service?counterId=${counter.id}`, null, staffToken);
                    await apiCall('POST', `/staff/tokens/${calledToken.id}/complete?counterId=${counter.id}`, null, staffToken);
                } else if (flow === 'NO_SHOW') {
                    const calledToken = await apiCall('POST', `/staff/counters/${counter.id}/call-next`, null, staffToken);
                    if (!calledToken || !calledToken.id) {
                        throw new Error(`call-next returned an invalid or missing token: ${JSON.stringify(calledToken)}`);
                    }
                    await apiCall('POST', `/staff/tokens/${calledToken.id}/no-show?counterId=${counter.id}`, null, staffToken);
                } else if (flow === 'CANCELLED') {
                    await apiCall('POST', `/tokens/${token.id}/cancel`, null, null);
                }
                // flow === 'WAITING' remains in queue
            }
        }

        // Execution Order Step 2: Normal operational validation
        log(`Executing normal operational validation for ${orgContexts.length} organization(s)...`);
        for (const orgCtx of orgContexts) {
            await validateOperationalAnalytics(orgCtx, {
                isPilot,
                isSample,
                manifestRef: manifest,
                apiCaller: apiCall
            });
        }

        // Execution Order Step 3: Apply backdating when requested
        if (enableBackdate) {
            log(`Backdating timestamps by 5 days for historical analytics...`);
            const orgIds = manifest.generated.organizations;
            
            if (orgIds && orgIds.length > 0) {
                const transactionSql = buildBackdateSql(orgIds);
                if (transactionSql) {
                    try {
                        await sqlExecutor(transactionSql);
                    } catch (sqlErr) {
                        log(`FATAL: Backdate transaction failed. Transaction automatically aborted in session. Error: ${sqlErr.message}`);
                        throw sqlErr;
                    }
                }
            }

            // Execution Order Step 4: Validating analytics against the historical date window after backdating
            log(`Executing post-backdate validation for ${orgContexts.length} organization(s)...`);
            for (const orgCtx of orgContexts) {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot,
                    isSample,
                    expectedQueueLoad,
                    manifestRef: manifest,
                    apiCaller: apiCall
                });
            }
        } else {
            log(`Historical backdating is DISABLED. Tokens retain current timestamps.`);
        }

        // Execution Order Step 5: Writing final success manifest only when all required validations pass
        manifest.status = 'SUCCESS';
        manifest.validation.status = 'PASSED';

        if (!fs.existsSync(manifestDir)) fs.mkdirSync(manifestDir, { recursive: true });
        const manifestFile = path.join(manifestDir, `run-${runId}.json`);
        try {
            fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), { flag: 'wx' });
            log(`Dataset Manifest written to ${manifestFile}`);
        } catch (writeErr) {
            if (writeErr.code === 'EEXIST') {
                throw new Error(`Manifest collision detected: Success manifest already exists at ${manifestFile}. Refusing to overwrite.`);
            }
            throw writeErr;
        }
        
        if (isDryRun) {
            log(`DRY-RUN COMPLETED. No actual dataset was generated.`);
        } else {
            log(`DONE. ${isPilot ? 'Pilot' : (isSample ? 'Sample' : 'Full')} dataset successfully generated.`);
        }
        return manifest;

    } catch (e) {
        log(`FATAL ERROR: ${e.message}`);
        // Preserve failed-run manifests
        manifest.status = 'FAILED';
        manifest.error = e.message;
        if (manifest.validation) {
            manifest.validation.status = 'FAILED';
        }
        const failedManifestFile = path.join(manifestDir, `run-${runId}-failed.json`);
        try {
            if (!fs.existsSync(manifestDir)) fs.mkdirSync(manifestDir, { recursive: true });
            fs.writeFileSync(failedManifestFile, JSON.stringify(manifest, null, 2), { flag: 'wx' });
            log(`Partial manifest saved for manual cleanup: ${failedManifestFile}`);
        } catch (failedWriteErr) {
            manifest.manifestSaveError = failedWriteErr.message;
            if (failedWriteErr.code === 'EEXIST') {
                log(`FATAL: Manifest collision detected: Failure manifest already exists at ${failedManifestFile}. Refusing to overwrite.`);
            } else {
                log(`FATAL: Failed to save failure manifest: ${failedWriteErr.message}`);
            }
        }
        process.exitCode = 1;
        return manifest;
    }
}

if (require.main === module) {
    run();
}

module.exports = {
    run,
    validateOperationalAnalytics,
    validatePostBackdateAnalytics,
    buildBackdateSql,
    UUID_REGEX,
    apiCall,
    executeSql,
    cleanup,
    mockState,
    manifest,
    activeConfig,
    RUN_ID,
    resolveConfig,
    validateTargetSafety,
    parseRetryAfter,
    RequestPacer,
    checkRunCollision,
    isNonIdempotentCreation
};


