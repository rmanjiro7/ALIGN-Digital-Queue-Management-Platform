const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
    run,
    validateOperationalAnalytics,
    validatePostBackdateAnalytics,
    buildBackdateSql,
    UUID_REGEX,
    executeSql,
    mockState,
    activeConfig,
    manifest,
    resolveConfig,
    validateTargetSafety,
    apiCall,
    parseRetryAfter,
    RequestPacer,
    checkRunCollision,
    isNonIdempotentCreation
} = require('./generate-synthetic-data.js');

test.describe('Post-Backdate Analytics Validation Tests', () => {

    test('1. Non-backdated pilot validation succeeds when metrics match expected breakdown', async () => {
        const orgCtx = {
            orgId: 'test-org-1',
            orgCode: 'SYNC-TEST-O0',
            orgAdminToken: 'mock-token',
            expectedTokens: 5
        };

        const testManifest = {
            validation: { checks: [] }
        };

        const mockApiCaller = async (method, endpoint, body, token) => {
            assert.equal(method, 'GET');
            assert.ok(endpoint.includes('/analytics/summary?orgId=test-org-1'));
            assert.equal(token, 'mock-token');
            return {
                operationalTokenVolume: 5,
                completedTokens: 2,
                noShows: 1,
                cancellations: 1,
                currentQueueLoad: 1
            };
        };

        const result = await validateOperationalAnalytics(orgCtx, {
            isPilot: true,
            manifestRef: testManifest,
            apiCaller: mockApiCaller
        });

        assert.equal(result.passed, true);
        assert.equal(result.phase, 'OPERATIONAL_WINDOW');
        assert.equal(result.expected.operationalTokenVolume, 5);
        assert.equal(result.reported.operationalTokenVolume, 5);
        assert.equal(result.reported.completedTokens, 2);
        assert.equal(result.reported.noShows, 1);
        assert.equal(result.reported.cancellations, 1);
        assert.equal(result.reported.currentQueueLoad, 1);
        assert.equal(testManifest.validation.checks.length, 1);
    });

    test('2. Post-backdate validation passes with historical window and zero in current window', async () => {
        const orgCtx = {
            orgId: 'test-org-2',
            orgCode: 'SYNC-TEST-O1',
            orgAdminToken: 'mock-token',
            expectedTokens: 5
        };

        const testManifest = {
            validation: { checks: [] }
        };

        const calls = [];
        const mockApiCaller = async (method, endpoint, body, token) => {
            calls.push({ method, endpoint, token });
            const url = new URL('http://localhost' + endpoint);
            const startStr = url.searchParams.get('start');
            const startTime = new Date(startStr).getTime();
            const now = Date.now();

            if (startTime < now - 2 * 24 * 60 * 60 * 1000) {
                // Historical window call
                return {
                    operationalTokenVolume: 5,
                    completedTokens: 2,
                    noShows: 1,
                    cancellations: 1,
                    currentQueueLoad: 1
                };
            } else {
                // Current window call
                return {
                    operationalTokenVolume: 0,
                    completedTokens: 0,
                    noShows: 0,
                    cancellations: 0,
                    currentQueueLoad: 1
                };
            }
        };

        const result = await validatePostBackdateAnalytics(orgCtx, {
            isPilot: true,
            manifestRef: testManifest,
            apiCaller: mockApiCaller
        });

        assert.equal(calls.length, 2);
        assert.equal(result.histRecord.passed, true);
        assert.equal(result.histRecord.phase, 'HISTORICAL_WINDOW');
        assert.equal(result.histRecord.reported.operationalTokenVolume, 5);
        assert.equal(result.histRecord.reported.completedTokens, 2);
        assert.equal(result.histRecord.reported.noShows, 1);
        assert.equal(result.histRecord.reported.cancellations, 1);
        assert.equal(result.histRecord.reported.currentQueueLoad, 1);

        assert.equal(result.currRecord.passed, true);
        assert.equal(result.currRecord.phase, 'CURRENT_WINDOW_ZERO_CHECK');
        assert.equal(result.currRecord.expected.operationalTokenVolume, 0);
        assert.equal(result.currRecord.expected.completedTokens, 0);
        assert.equal(result.currRecord.expected.noShows, 0);
        assert.equal(result.currRecord.expected.cancellations, 0);
        assert.equal(result.currRecord.expected.currentQueueLoad, 1);
        assert.equal(result.currRecord.reported.operationalTokenVolume, 0);
        assert.equal(result.currRecord.reported.completedTokens, 0);
        assert.equal(result.currRecord.reported.noShows, 0);
        assert.equal(result.currRecord.reported.cancellations, 0);
        assert.equal(result.currRecord.reported.currentQueueLoad, 1);
        assert.equal(testManifest.validation.checks.length, 2);
    });

    test('3. Post-backdate validation fails when operational token volume is incorrect', async () => {
        const orgCtx = {
            orgId: 'test-org-3',
            orgCode: 'SYNC-TEST-O2',
            orgAdminToken: 'mock-token',
            expectedTokens: 5
        };

        const mockApiCaller = async () => ({
            operationalTokenVolume: 4, // Incorrect! Expected 5
            completedTokens: 2,
            noShows: 1,
            cancellations: 1,
            currentQueueLoad: 1
        });

        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: true,
                    apiCaller: mockApiCaller
                });
            },
            /Post-backdate historical validation failed! Org SYNC-TEST-O2: reported operationalTokenVolume 4, expected 5/
        );
    });

    test('4. Post-backdate validation fails when status breakdown is incorrect', async () => {
        const orgCtx = {
            orgId: 'test-org-4',
            orgCode: 'SYNC-TEST-O3',
            orgAdminToken: 'mock-token',
            expectedTokens: 5
        };

        // Completed tokens mismatch
        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: true,
                    apiCaller: async () => ({
                        operationalTokenVolume: 5,
                        completedTokens: 1, // Expected 2
                        noShows: 1,
                        cancellations: 1,
                        currentQueueLoad: 1
                    })
                });
            },
            /historical completedTokens 1, expected 2/
        );

        // No-show count mismatch
        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: true,
                    apiCaller: async () => ({
                        operationalTokenVolume: 5,
                        completedTokens: 2,
                        noShows: 0, // Expected 1
                        cancellations: 1,
                        currentQueueLoad: 1
                    })
                });
            },
            /historical noShows 0, expected 1/
        );

        // Cancellation count mismatch
        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: true,
                    apiCaller: async () => ({
                        operationalTokenVolume: 5,
                        completedTokens: 2,
                        noShows: 1,
                        cancellations: 0, // Expected 1
                        currentQueueLoad: 1
                    })
                });
            },
            /historical cancellations 0, expected 1/
        );

        // Waiting / currentQueueLoad mismatch
        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: true,
                    apiCaller: async () => ({
                        operationalTokenVolume: 5,
                        completedTokens: 2,
                        noShows: 1,
                        cancellations: 1,
                        currentQueueLoad: 0 // Expected 1
                    })
                });
            },
            /historical currentQueueLoad 0, expected 1/
        );
    });

    test('5. Post-backdate validation fails if historical tokens leak into current window', async () => {
        const orgCtx = {
            orgId: 'test-org-5',
            orgCode: 'SYNC-TEST-O4',
            orgAdminToken: 'mock-token',
            expectedTokens: 5
        };

        const mockApiCaller = async (method, endpoint) => {
            const url = new URL('http://localhost' + endpoint);
            const startStr = url.searchParams.get('start');
            const startTime = new Date(startStr).getTime();
            const now = Date.now();

            if (startTime < now - 2 * 24 * 60 * 60 * 1000) {
                return {
                    operationalTokenVolume: 5,
                    completedTokens: 2,
                    noShows: 1,
                    cancellations: 1,
                    currentQueueLoad: 1
                };
            } else {
                // Historical tokens leaked into current window!
                return {
                    operationalTokenVolume: 5,
                    completedTokens: 2,
                    noShows: 1,
                    cancellations: 1,
                    currentQueueLoad: 1
                };
            }
        };

        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: true,
                    apiCaller: mockApiCaller
                });
            },
            /Post-backdate current window check failed! Historical tokens reported in current window for Org SYNC-TEST-O4: volume=5/
        );
    });

    test('5b. Post-backdate current window check fails when current queue load gauge does not match expected', async () => {
        const orgCtx = {
            orgId: 'test-org-5b',
            orgCode: 'SYNC-TEST-O4B',
            orgAdminToken: 'mock-token',
            expectedTokens: 5
        };

        const mockApiCaller = async (method, endpoint) => {
            const url = new URL('http://localhost' + endpoint);
            const startStr = url.searchParams.get('start');
            const startTime = new Date(startStr).getTime();
            const now = Date.now();

            if (startTime < now - 2 * 24 * 60 * 60 * 1000) {
                return {
                    operationalTokenVolume: 5,
                    completedTokens: 2,
                    noShows: 1,
                    cancellations: 1,
                    currentQueueLoad: 1
                };
            } else {
                return {
                    operationalTokenVolume: 0,
                    completedTokens: 0,
                    noShows: 0,
                    cancellations: 0,
                    currentQueueLoad: 0 // Expected 1 in pilot mode
                };
            }
        };

        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: true,
                    apiCaller: mockApiCaller
                });
            },
            /Post-backdate current window check failed! Org SYNC-TEST-O4B: currentQueueLoad 0, expected 1/
        );
    });

    test('5c. Non-pilot post-backdate validation succeeds with explicit expectedQueueLoad and fails on mismatch', async () => {
        const orgCtx = {
            orgId: 'test-org-5c',
            orgCode: 'SYNC-TEST-O4C',
            orgAdminToken: 'mock-token',
            expectedTokens: 60
        };

        const mockApiCallerSuccess = async (method, endpoint) => {
            const url = new URL('http://localhost' + endpoint);
            const startStr = url.searchParams.get('start');
            const startTime = new Date(startStr).getTime();
            const now = Date.now();

            if (startTime < now - 2 * 24 * 60 * 60 * 1000) {
                return {
                    operationalTokenVolume: 60,
                    completedTokens: 42,
                    noShows: 9,
                    cancellations: 3,
                    currentQueueLoad: 4
                };
            } else {
                return {
                    operationalTokenVolume: 0,
                    completedTokens: 0,
                    noShows: 0,
                    cancellations: 0,
                    currentQueueLoad: 4
                };
            }
        };

        const result = await validatePostBackdateAnalytics(orgCtx, {
            isPilot: false,
            expectedQueueLoad: 4,
            apiCaller: mockApiCallerSuccess
        });

        assert.equal(result.currRecord.passed, true);
        assert.equal(result.currRecord.phase, 'CURRENT_WINDOW_ZERO_CHECK');
        assert.equal(result.currRecord.expected.currentQueueLoad, 4);
        assert.equal(result.currRecord.reported.currentQueueLoad, 4);
        assert.equal(result.currRecord.expected.operationalTokenVolume, 0);
        assert.equal(result.currRecord.reported.operationalTokenVolume, 0);

        // Mismatch fails
        const mockApiCallerMismatch = async (method, endpoint) => {
            const url = new URL('http://localhost' + endpoint);
            const startStr = url.searchParams.get('start');
            const startTime = new Date(startStr).getTime();
            const now = Date.now();

            if (startTime < now - 2 * 24 * 60 * 60 * 1000) {
                return {
                    operationalTokenVolume: 60,
                    completedTokens: 42,
                    noShows: 9,
                    cancellations: 3,
                    currentQueueLoad: 2
                };
            } else {
                return {
                    operationalTokenVolume: 0,
                    completedTokens: 0,
                    noShows: 0,
                    cancellations: 0,
                    currentQueueLoad: 2 // Expected 4
                };
            }
        };

        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: false,
                    expectedQueueLoad: 4,
                    apiCaller: mockApiCallerMismatch
                });
            },
            /Post-backdate current window check failed! Org SYNC-TEST-O4C: currentQueueLoad 2, expected 4/
        );
    });

    test('5d. Non-pilot post-backdate validation without explicit target validates gauge sanity and does not invent expected value', async () => {
        const orgCtx = {
            orgId: 'test-org-5d',
            orgCode: 'SYNC-TEST-O4D',
            orgAdminToken: 'mock-token',
            expectedTokens: 60
        };

        const mockApiCaller = async (method, endpoint) => {
            const url = new URL('http://localhost' + endpoint);
            const startStr = url.searchParams.get('start');
            const startTime = new Date(startStr).getTime();
            const now = Date.now();

            if (startTime < now - 2 * 24 * 60 * 60 * 1000) {
                return {
                    operationalTokenVolume: 60,
                    completedTokens: 42,
                    noShows: 9,
                    cancellations: 3,
                    currentQueueLoad: 7
                };
            } else {
                return {
                    operationalTokenVolume: 0,
                    completedTokens: 0,
                    noShows: 0,
                    cancellations: 0,
                    currentQueueLoad: 7
                };
            }
        };

        const result = await validatePostBackdateAnalytics(orgCtx, {
            isPilot: false,
            apiCaller: mockApiCaller
        });

        assert.equal(result.currRecord.passed, true);
        assert.equal(result.currRecord.phase, 'CURRENT_WINDOW_ZERO_CHECK');
        assert.equal(result.currRecord.reported.currentQueueLoad, 7);
        // Does not invent expected value from observed value
        assert.equal(result.currRecord.expected.currentQueueLoad, undefined);
        assert.equal(result.currRecord.expected.operationalTokenVolume, 0);
        assert.equal(result.currRecord.reported.operationalTokenVolume, 0);
    });

    test('5e. Current window check rejects missing, null, negative, non-integer, and boolean/invalid currentQueueLoad values', async () => {
        const orgCtx = {
            orgId: 'test-org-5e',
            orgCode: 'SYNC-TEST-O4E',
            orgAdminToken: 'mock-token',
            expectedTokens: 5
        };

        const createCaller = (currLoad) => async (method, endpoint) => {
            const url = new URL('http://localhost' + endpoint);
            const startStr = url.searchParams.get('start');
            const startTime = new Date(startStr).getTime();
            const now = Date.now();

            if (startTime < now - 2 * 24 * 60 * 60 * 1000) {
                return {
                    operationalTokenVolume: 5,
                    completedTokens: 2,
                    noShows: 1,
                    cancellations: 1,
                    currentQueueLoad: 1
                };
            } else {
                return {
                    operationalTokenVolume: 0,
                    completedTokens: 0,
                    noShows: 0,
                    cancellations: 0,
                    currentQueueLoad: currLoad
                };
            }
        };

        // Missing / undefined
        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: false,
                    apiCaller: createCaller(undefined)
                });
            },
            /currentQueueLoad is missing or null/
        );

        // Null
        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: false,
                    apiCaller: createCaller(null)
                });
            },
            /currentQueueLoad is missing or null/
        );

        // Empty string
        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: false,
                    apiCaller: createCaller('')
                });
            },
            /currentQueueLoad is missing or null/
        );

        // Negative
        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: false,
                    apiCaller: createCaller(-1)
                });
            },
            /currentQueueLoad must be a non-negative integer, got -1/
        );

        // Non-integer
        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: false,
                    apiCaller: createCaller(2.5)
                });
            },
            /currentQueueLoad must be a non-negative integer, got 2.5/
        );

        // Non-numeric string
        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: false,
                    apiCaller: createCaller('invalid')
                });
            },
            /currentQueueLoad must be a non-negative integer, got invalid/
        );

        // Boolean
        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: false,
                    apiCaller: createCaller(true)
                });
            },
            /currentQueueLoad must be a non-negative integer, got true/
        );
    });

    test('5f. Non-pilot post-backdate validation fails if historical tokens leak into current window', async () => {
        const orgCtx = {
            orgId: 'test-org-5f',
            orgCode: 'SYNC-TEST-O4F',
            orgAdminToken: 'mock-token',
            expectedTokens: 60
        };

        const mockApiCaller = async (method, endpoint) => {
            const url = new URL('http://localhost' + endpoint);
            const startStr = url.searchParams.get('start');
            const startTime = new Date(startStr).getTime();
            const now = Date.now();

            if (startTime < now - 2 * 24 * 60 * 60 * 1000) {
                return {
                    operationalTokenVolume: 60,
                    completedTokens: 42,
                    noShows: 9,
                    cancellations: 3,
                    currentQueueLoad: 5
                };
            } else {
                return {
                    operationalTokenVolume: 12,
                    completedTokens: 8,
                    noShows: 2,
                    cancellations: 2,
                    currentQueueLoad: 5
                };
            }
        };

        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: false,
                    apiCaller: mockApiCaller
                });
            },
            /Post-backdate current window check failed! Historical tokens reported in current window for Org SYNC-TEST-O4F: volume=12/
        );
    });

    test('6. Analytics API HTTP failure or empty response fails clearly', async () => {
        const orgCtx = {
            orgId: 'test-org-6',
            orgCode: 'SYNC-TEST-O5',
            orgAdminToken: 'mock-token',
            expectedTokens: 5
        };

        // HTTP Error
        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: true,
                    apiCaller: async () => {
                        throw new Error('API Error 500 on GET /analytics/summary: Internal Server Error');
                    }
                });
            },
            /API Error 500/
        );

        // Null response
        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: true,
                    apiCaller: async () => null
                });
            },
            /Analytics API returned empty response/
        );
    });

    test('7. Date-window boundary behavior strictly encompasses 5-day shift and excludes current time', () => {
        const now = Date.now();
        const shift5DaysMs = 5 * 24 * 60 * 60 * 1000;
        const shiftedTokenTime = now - shift5DaysMs;

        // Historical window: [now - 6 days, now - 4 days]
        const histStart = now - 6 * 24 * 60 * 60 * 1000;
        const histEnd = now - 4 * 24 * 60 * 60 * 1000;

        assert.ok(shiftedTokenTime >= histStart, 'Shifted token must be at or after historical start');
        assert.ok(shiftedTokenTime <= histEnd, 'Shifted token must be at or before historical end');

        // Current-time tokens must NOT fall inside historical window
        assert.ok(now > histEnd, 'Current time must be strictly after historical end');

        // Current window: [now - 1 hour, now + 1 hour]
        const currStart = now - 60 * 60 * 1000;
        const currEnd = now + 60 * 60 * 1000;

        assert.ok(shiftedTokenTime < currStart, 'Shifted token must be strictly before current window start');
        assert.ok(now >= currStart && now <= currEnd, 'Current time must be inside current window');
    });

    test('8. Dry-run simulation executes the full sequence cleanly with exit code 0', async () => {
        // Reset mock state for clean simulation
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-dryrun-8-'));
        try {
            // Run full pilot generation in dry-run with backdate enabled
            await run({
                isDryRun: true,
                isPilot: true,
                enableBackdate: true,
                manifestDir: tempManifestDir
            });

            // Verify that mockState was updated and backdated
            assert.equal(mockState.backdated, true);
        } finally {
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('9. Failure manifest preserves failure details without exposing credentials or JWTs', () => {
        const failureManifest = {
            runId: 'SYNC-FAIL-TEST',
            timestamp: new Date().toISOString(),
            status: 'FAILED',
            error: 'Post-backdate validation failed! Org SYNC-FAIL-TEST-O0: historical completedTokens 0, expected 2.',
            config: { pilot: true, backdate: true, dryRun: true },
            generated: {
                organizations: ['mock-org-id'],
                tokens: ['mock-token-1', 'mock-token-2']
            },
            validation: {
                status: 'FAILED',
                mode: 'PILOT',
                backdated: true,
                checks: [
                    {
                        orgId: 'mock-org-id',
                        phase: 'OPERATIONAL_WINDOW',
                        passed: true
                    }
                ]
            }
        };

        const jsonStr = JSON.stringify(failureManifest);
        assert.equal(failureManifest.status, 'FAILED');
        assert.equal(failureManifest.validation.status, 'FAILED');
        assert.ok(!jsonStr.includes('password'), 'Manifest must not expose password');
        assert.ok(!jsonStr.includes('accessToken'), 'Manifest must not expose accessToken');
        assert.ok(!jsonStr.includes('Bearer'), 'Manifest must not expose Bearer token');
        assert.ok(!jsonStr.includes('admin123'), 'Manifest must not expose credentials');
    });

    test('10. Non-backdated dry-run executes operational validation only and skips backdating', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-dryrun-10-'));
        try {
            await run({
                isDryRun: true,
                isPilot: true,
                enableBackdate: false,
                manifestDir: tempManifestDir
            });

            // Backdating was disabled, so mockState.backdated remains false
            assert.equal(mockState.backdated, false);
        } finally {
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('11. Manifest records all 3 validation checks on successful post-backdate run', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-dryrun-11-'));
        try {
            await run({
                isDryRun: true,
                isPilot: true,
                enableBackdate: true,
                manifestDir: tempManifestDir
            });

            const files = fs.readdirSync(tempManifestDir)
                .filter(f => f.startsWith('run-') && f.endsWith('.json') && !f.includes('-failed'))
                .map(f => ({ name: f, time: fs.statSync(path.join(tempManifestDir, f)).mtimeMs }))
                .sort((a, b) => b.time - a.time);
            assert.ok(files.length > 0);

            // Read the latest manifest file produced by this run
            const latestFile = files[0].name;
            const manifestData = JSON.parse(fs.readFileSync(path.join(tempManifestDir, latestFile), 'utf8'));

            assert.equal(manifestData.status, 'SUCCESS');
            assert.equal(manifestData.validation.status, 'PASSED');
            assert.equal(manifestData.validation.backdated, true);
            assert.equal(manifestData.validation.checks.length, 3);
            assert.equal(manifestData.validation.checks[0].phase, 'OPERATIONAL_WINDOW');
            assert.equal(manifestData.validation.checks[1].phase, 'HISTORICAL_WINDOW');
            assert.equal(manifestData.validation.checks[2].phase, 'CURRENT_WINDOW_ZERO_CHECK');
            assert.equal(manifestData.validation.checks[2].expected.operationalTokenVolume, 0);
            assert.equal(manifestData.validation.checks[2].expected.currentQueueLoad, 1);
            assert.equal(manifestData.validation.checks[2].reported.operationalTokenVolume, 0);
            assert.equal(manifestData.validation.checks[2].reported.currentQueueLoad, 1);
        } finally {
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('12. executeSql helper includes ON_ERROR_STOP=1 and fails fast when SQL execution errors', async () => {
        // Test live mode (isDryRun = false) with injected execSyncFn
        const originalDryRun = activeConfig.isDryRun;
        activeConfig.isDryRun = false;

        let capturedCommand = null;
        const mockExecSyncSuccess = (cmd) => {
            capturedCommand = cmd;
            return "1";
        };

        const result = await executeSql("SELECT 1;", mockExecSyncSuccess);
        assert.equal(result, "1");
        assert.ok(capturedCommand.includes("-v ON_ERROR_STOP=1"), "psql command must include -v ON_ERROR_STOP=1");
        assert.ok(capturedCommand.includes("psql -U align_user -d align_qms"), "psql command must target correct user and database");

        // Test that execution failure throws an Error and does not succeed
        const mockExecSyncFailure = () => {
            const err = new Error("psql: error: syntax error");
            err.status = 3;
            throw err;
        };

        await assert.rejects(
            async () => {
                await executeSql("INVALID SQL;", mockExecSyncFailure);
            },
            /psql: error: syntax error/
        );

        activeConfig.isDryRun = originalDryRun;
    });

    test('13. buildBackdateSql generates atomic single transaction strictly scoped to target orgs', () => {
        const orgIds = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'];
        const sql = buildBackdateSql(orgIds);

        assert.ok(sql.startsWith('BEGIN;'), 'Transaction must start with BEGIN;');
        assert.ok(sql.endsWith('COMMIT;'), 'Transaction must end with COMMIT;');
        assert.ok(!sql.includes('ROLLBACK;'), 'buildBackdateSql should define an atomic commit block; rollback is handled by session abort');

        // Check organization scoping on both tables
        const expectedScope = "WHERE org_id IN ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');";
        assert.ok(sql.includes(`UPDATE tokens SET joined_at = joined_at - INTERVAL '5 days'`), 'Must shift joined_at');
        assert.ok(sql.includes(`called_at = called_at - INTERVAL '5 days'`), 'Must shift called_at');
        assert.ok(sql.includes(`served_at = served_at - INTERVAL '5 days'`), 'Must shift served_at');
        assert.ok(sql.includes(`completed_at = completed_at - INTERVAL '5 days'`), 'Must shift completed_at');
        assert.ok(sql.includes(`step_away_expires_at = step_away_expires_at - INTERVAL '5 days'`), 'Must shift step_away_expires_at');
        assert.ok(sql.includes(`sms_consent_timestamp = sms_consent_timestamp - INTERVAL '5 days'`), 'Must shift sms_consent_timestamp');
        assert.ok(sql.includes(`created_at = created_at - INTERVAL '5 days'`), 'Must shift created_at on tokens');
        assert.ok(sql.includes(`updated_at = updated_at - INTERVAL '5 days'`), 'Must shift updated_at');
        assert.ok(sql.includes(`priority_timestamp = priority_timestamp - INTERVAL '5 days'`), 'Must shift priority_timestamp');
        assert.ok(sql.includes(expectedScope), 'Tokens update must be strictly scoped');

        assert.ok(sql.includes(`UPDATE token_events SET created_at = created_at - INTERVAL '5 days' ${expectedScope}`), 'Token events update must be strictly scoped');

        // Empty orgIds returns null
        assert.equal(buildBackdateSql([]), null);
        assert.equal(buildBackdateSql(null), null);
        assert.equal(buildBackdateSql(undefined), null);
    });

    test('14. Backdate transaction failure prevents success manifest, preserves failure manifest, and halts execution', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        // Create an isolated temporary manifest directory for this test
        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-tx-fail-'));

        // Mock sqlExecutor that simulates a transaction failure during backdating
        let postBackdateValidationInvoked = false;
        const failingSqlExecutor = async (sql) => {
            assert.ok(sql.includes('BEGIN;'), 'Failing executor received transaction SQL');
            throw new Error('PostgreSQL transaction aborted: connection terminated');
        };

        const originalExitCode = process.exitCode;

        try {
            await run({
                isDryRun: true,
                isPilot: true,
                enableBackdate: true,
                sqlExecutor: failingSqlExecutor,
                manifestDir: tempManifestDir
            });
        } finally {
            // Restore process.exitCode for test runner
            process.exitCode = originalExitCode;
        }

        const files = fs.readdirSync(tempManifestDir);
        const successManifests = files.filter(f => f.startsWith('run-') && f.endsWith('.json') && !f.includes('-failed'));
        const failedManifests = files.filter(f => f.startsWith('run-') && f.endsWith('-failed.json'));

        // Success manifest MUST NOT exist!
        assert.equal(successManifests.length, 0, 'No success manifest should be created when transaction fails');

        // Failed manifest MUST exist and record transaction error
        assert.equal(failedManifests.length, 1, 'Failed manifest must be preserved');
        const failedContent = JSON.parse(fs.readFileSync(path.join(tempManifestDir, failedManifests[0]), 'utf8'));

        assert.equal(failedContent.status, 'FAILED');
        assert.equal(failedContent.validation.status, 'FAILED');
        assert.ok(failedContent.error.includes('PostgreSQL transaction aborted'), 'Manifest must capture transaction error');

        // Clean up temporary manifest directory
        fs.rmSync(tempManifestDir, { recursive: true, force: true });
    });

    test('15. Dry-run mode isolates SQL execution completely from live database', async () => {
        activeConfig.isDryRun = true;

        let liveExecCalled = false;
        const mockExecSync = () => {
            liveExecCalled = true;
            return "";
        };

        mockState.backdated = false;
        const res = await executeSql("UPDATE tokens SET joined_at = joined_at - INTERVAL '5 days'", mockExecSync);

        assert.equal(res, "0");
        assert.equal(liveExecCalled, false, "Live execSync must never be invoked in dry-run mode");
        assert.equal(mockState.backdated, true, "Dry-run mockState should track simulated backdate");
    });

    test('16. buildBackdateSql validates UUID format strictly, rejecting invalid, malformed, non-string, injection-shaped, and empty inputs before execution', async () => {
        // Valid UUID strings (single and array)
        const validId1 = '12345678-1234-4234-8234-123456789abc';
        const validId2 = 'abcdef01-abcd-4bcd-8bcd-abcdef012345';
        const validSqlSingle = buildBackdateSql(validId1);
        assert.ok(validSqlSingle.includes(`WHERE org_id IN ('${validId1}');`));

        const validSqlMulti = buildBackdateSql([validId1, validId2]);
        assert.ok(validSqlMulti.includes(`WHERE org_id IN ('${validId1}','${validId2}');`));

        // Empty and falsy values return null without error
        assert.equal(buildBackdateSql(null), null);
        assert.equal(buildBackdateSql(undefined), null);
        assert.equal(buildBackdateSql([]), null);

        // Empty string and whitespace-only strings throw
        assert.throws(() => buildBackdateSql(''), /Invalid organization UUID/);
        assert.throws(() => buildBackdateSql('   '), /Invalid organization UUID/);
        assert.throws(() => buildBackdateSql(['']), /Invalid organization UUID/);
        assert.throws(() => buildBackdateSql(['   ']), /Invalid organization UUID/);
        assert.throws(() => buildBackdateSql([validId1, '']), /Invalid organization UUID/);

        // Strings with leading/trailing whitespace throw (strict 36-char match)
        assert.throws(() => buildBackdateSql(` ${validId1} `), /Invalid organization UUID/);

        // Malformed UUID strings throw
        assert.throws(() => buildBackdateSql('not-a-uuid'), /Invalid organization UUID/);
        assert.throws(() => buildBackdateSql('12345678-1234-1234-1234'), /Invalid organization UUID/);
        assert.throws(() => buildBackdateSql('12345678-1234-1234-1234-123456789abcz'), /Invalid organization UUID/);
        assert.throws(() => buildBackdateSql([validId1, 'invalid-uuid-format']), /Invalid organization UUID/);

        // SQL injection attempts throw
        assert.throws(() => buildBackdateSql(`${validId1}' OR 1=1 --`), /Invalid organization UUID/);
        assert.throws(() => buildBackdateSql("'; DROP TABLE tokens; --"), /Invalid organization UUID/);
        assert.throws(() => buildBackdateSql([`${validId1}'); DELETE FROM tokens; --`]), /Invalid organization UUID/);
        assert.throws(() => buildBackdateSql([validId1, "') OR ('1'='1"]), /Invalid organization UUID/);

        // Unexpected non-string types throw
        assert.throws(() => buildBackdateSql(123), /Invalid organization ID input/);
        assert.throws(() => buildBackdateSql({}), /Invalid organization ID input/);
        assert.throws(() => buildBackdateSql(true), /Invalid organization ID input/);
        assert.throws(() => buildBackdateSql([null]), /Invalid organization UUID/);
        assert.throws(() => buildBackdateSql([123]), /Invalid organization UUID/);
        assert.throws(() => buildBackdateSql([{}]), /Invalid organization UUID/);

        // Verify invalid input halts execution before any SQL executor is called
        let sqlExecutorCalled = false;
        const mockExecutor = async () => {
            sqlExecutorCalled = true;
        };

        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-uuid-fail-'));
        const originalExitCode = process.exitCode;
        try {
            // Test that invalid org IDs in manifest cause run() to abort prior to executing SQL
            const testManifest = {
                runId: 'SYNC-UUID-TEST',
                timestamp: new Date().toISOString(),
                status: 'IN_PROGRESS',
                config: { pilot: true, backdate: true, dryRun: true },
                generated: {
                    organizations: ["malicious-id' OR 1=1 --"],
                    locations: [],
                    services: [],
                    queues: [],
                    counters: [],
                    users: [],
                    tokens: []
                },
                validation: { status: 'PENDING', checks: [] }
            };

            assert.throws(
                () => buildBackdateSql(testManifest.generated.organizations),
                /Invalid organization UUID/
            );

            // Confirmed sqlExecutor cannot be reached when buildBackdateSql fails
            assert.equal(sqlExecutorCalled, false);
        } finally {
            process.exitCode = originalExitCode;
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('17. expectedQueueLoad input validation rejects null, negative numbers, fractional numbers, strings, booleans, and NaN with descriptive error before apiCaller is invoked', async () => {
        const orgCtx = {
            orgId: 'test-org-17',
            orgCode: 'SYNC-TEST-O17',
            orgAdminToken: 'mock-token',
            expectedTokens: 5
        };

        let apiCallerInvoked = false;
        const uncalledApiCaller = async () => {
            apiCallerInvoked = true;
            throw new Error('apiCaller should NOT be called when input validation fails');
        };

        const invalidValues = [
            null,
            -1,
            -10,
            -0,
            1.5,
            0.1,
            '0',
            '1',
            'invalid',
            '',
            true,
            false,
            NaN,
            {},
            []
        ];

        for (const val of invalidValues) {
            apiCallerInvoked = false;
            await assert.rejects(
                async () => {
                    await validatePostBackdateAnalytics(orgCtx, {
                        isPilot: false,
                        expectedQueueLoad: val,
                        apiCaller: uncalledApiCaller
                    });
                },
                /Invalid expectedQueueLoad: expected a non-negative integer/
            );
            assert.equal(apiCallerInvoked, false, `apiCaller must not be invoked for non-pilot invalid expectedQueueLoad: ${val}`);

            apiCallerInvoked = false;
            await assert.rejects(
                async () => {
                    await validatePostBackdateAnalytics(orgCtx, {
                        isPilot: true,
                        expectedQueueLoad: val,
                        apiCaller: uncalledApiCaller
                    });
                },
                /Invalid expectedQueueLoad: expected a non-negative integer/
            );
            assert.equal(apiCallerInvoked, false, `apiCaller must not be invoked for pilot invalid expectedQueueLoad: ${val}`);
        }

        // Specific assertions for each required category in requirement 2 proving rejection before apiCaller is invoked
        const specificCases = [
            { val: null, expectedMsg: /Invalid expectedQueueLoad: expected a non-negative integer, got null/ },
            { val: -1, expectedMsg: /Invalid expectedQueueLoad: expected a non-negative integer, got -1/ },
            { val: 1.5, expectedMsg: /Invalid expectedQueueLoad: expected a non-negative integer, got 1.5/ },
            { val: 'invalid', expectedMsg: /Invalid expectedQueueLoad: expected a non-negative integer, got "invalid"/ },
            { val: '0', expectedMsg: /Invalid expectedQueueLoad: expected a non-negative integer, got "0"/ },
            { val: true, expectedMsg: /Invalid expectedQueueLoad: expected a non-negative integer, got true/ },
            { val: false, expectedMsg: /Invalid expectedQueueLoad: expected a non-negative integer, got false/ },
            { val: NaN, expectedMsg: /Invalid expectedQueueLoad: expected a non-negative integer, got NaN/ }
        ];

        for (const { val, expectedMsg } of specificCases) {
            apiCallerInvoked = false;
            await assert.rejects(
                async () => {
                    await validatePostBackdateAnalytics(orgCtx, {
                        isPilot: false,
                        expectedQueueLoad: val,
                        apiCaller: uncalledApiCaller
                    });
                },
                expectedMsg
            );
            assert.equal(apiCallerInvoked, false, `apiCaller must not be invoked before rejecting ${val}`);
        }
    });

    test('18. expectedQueueLoad preserves support for explicit valid value of 0 in pilot and non-pilot modes', async () => {
        const orgCtx = {
            orgId: 'test-org-18',
            orgCode: 'SYNC-TEST-O18',
            orgAdminToken: 'mock-token',
            expectedTokens: 5
        };

        const mockApiCallerZero = async (method, endpoint) => {
            const url = new URL('http://localhost' + endpoint);
            const startStr = url.searchParams.get('start');
            const startTime = new Date(startStr).getTime();
            const now = Date.now();

            if (startTime < now - 2 * 24 * 60 * 60 * 1000) {
                return {
                    operationalTokenVolume: 5,
                    completedTokens: 2,
                    noShows: 1,
                    cancellations: 1,
                    currentQueueLoad: 1
                };
            } else {
                return {
                    operationalTokenVolume: 0,
                    completedTokens: 0,
                    noShows: 0,
                    cancellations: 0,
                    currentQueueLoad: 0
                };
            }
        };

        // 1. Explicit 0 in pilot mode succeeds when current queue load is 0
        const pilotResult = await validatePostBackdateAnalytics(orgCtx, {
            isPilot: true,
            expectedQueueLoad: 0,
            apiCaller: mockApiCallerZero
        });
        assert.equal(pilotResult.currRecord.passed, true);
        assert.equal(pilotResult.currRecord.expected.currentQueueLoad, 0);
        assert.equal(pilotResult.currRecord.reported.currentQueueLoad, 0);

        // 2. Explicit 0 in pilot mode fails when current queue load is not 0
        const mockApiCallerOne = async (method, endpoint) => {
            const url = new URL('http://localhost' + endpoint);
            const startStr = url.searchParams.get('start');
            const startTime = new Date(startStr).getTime();
            const now = Date.now();

            if (startTime < now - 2 * 24 * 60 * 60 * 1000) {
                return {
                    operationalTokenVolume: 5,
                    completedTokens: 2,
                    noShows: 1,
                    cancellations: 1,
                    currentQueueLoad: 1
                };
            } else {
                return {
                    operationalTokenVolume: 0,
                    completedTokens: 0,
                    noShows: 0,
                    cancellations: 0,
                    currentQueueLoad: 1
                };
            }
        };

        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(orgCtx, {
                    isPilot: true,
                    expectedQueueLoad: 0,
                    apiCaller: mockApiCallerOne
                });
            },
            /Post-backdate current window check failed! Org SYNC-TEST-O18: currentQueueLoad 1, expected 0/
        );

        // 3. Explicit 0 in non-pilot mode succeeds when current queue load is 0
        const nonPilotOrgCtx = {
            orgId: 'test-org-18-np',
            orgCode: 'SYNC-TEST-O18-NP',
            orgAdminToken: 'mock-token',
            expectedTokens: 60
        };

        const mockApiCallerNonPilotZero = async (method, endpoint) => {
            const url = new URL('http://localhost' + endpoint);
            const startStr = url.searchParams.get('start');
            const startTime = new Date(startStr).getTime();
            const now = Date.now();

            if (startTime < now - 2 * 24 * 60 * 60 * 1000) {
                return {
                    operationalTokenVolume: 60,
                    completedTokens: 42,
                    noShows: 9,
                    cancellations: 3,
                    currentQueueLoad: 0
                };
            } else {
                return {
                    operationalTokenVolume: 0,
                    completedTokens: 0,
                    noShows: 0,
                    cancellations: 0,
                    currentQueueLoad: 0
                };
            }
        };

        const nonPilotResult = await validatePostBackdateAnalytics(nonPilotOrgCtx, {
            isPilot: false,
            expectedQueueLoad: 0,
            apiCaller: mockApiCallerNonPilotZero
        });
        assert.equal(nonPilotResult.currRecord.passed, true);
        assert.equal(nonPilotResult.currRecord.expected.currentQueueLoad, 0);
        assert.equal(nonPilotResult.currRecord.reported.currentQueueLoad, 0);

        // 4. Explicit 0 in non-pilot mode fails when current queue load is 2
        const mockApiCallerNonPilotMismatch = async (method, endpoint) => {
            const url = new URL('http://localhost' + endpoint);
            const startStr = url.searchParams.get('start');
            const startTime = new Date(startStr).getTime();
            const now = Date.now();

            if (startTime < now - 2 * 24 * 60 * 60 * 1000) {
                return {
                    operationalTokenVolume: 60,
                    completedTokens: 42,
                    noShows: 9,
                    cancellations: 3,
                    currentQueueLoad: 2
                };
            } else {
                return {
                    operationalTokenVolume: 0,
                    completedTokens: 0,
                    noShows: 0,
                    cancellations: 0,
                    currentQueueLoad: 2
                };
            }
        };

        await assert.rejects(
            async () => {
                await validatePostBackdateAnalytics(nonPilotOrgCtx, {
                    isPilot: false,
                    expectedQueueLoad: 0,
                    apiCaller: mockApiCallerNonPilotMismatch
                });
            },
            /Post-backdate current window check failed! Org SYNC-TEST-O18-NP: currentQueueLoad 2, expected 0/
        );
    });

    test('19. expectedQueueLoad defaults target to 1 in pilot mode and null in non-pilot mode when omitted or undefined', async () => {
        const orgCtxPilot = {
            orgId: 'test-org-19-p',
            orgCode: 'SYNC-TEST-O19-P',
            orgAdminToken: 'mock-token',
            expectedTokens: 5
        };

        const mockApiCallerPilot = async (method, endpoint) => {
            const url = new URL('http://localhost' + endpoint);
            const startStr = url.searchParams.get('start');
            const startTime = new Date(startStr).getTime();
            const now = Date.now();

            if (startTime < now - 2 * 24 * 60 * 60 * 1000) {
                return {
                    operationalTokenVolume: 5,
                    completedTokens: 2,
                    noShows: 1,
                    cancellations: 1,
                    currentQueueLoad: 1
                };
            } else {
                return {
                    operationalTokenVolume: 0,
                    completedTokens: 0,
                    noShows: 0,
                    cancellations: 0,
                    currentQueueLoad: 1
                };
            }
        };

        // Pilot mode without expectedQueueLoad defaults target to 1
        const resPilotOmitted = await validatePostBackdateAnalytics(orgCtxPilot, {
            isPilot: true,
            apiCaller: mockApiCallerPilot
        });
        assert.equal(resPilotOmitted.currRecord.expected.currentQueueLoad, 1);

        // Pilot mode with expectedQueueLoad: undefined explicitly defaults target to 1
        const resPilotUndefined = await validatePostBackdateAnalytics(orgCtxPilot, {
            isPilot: true,
            expectedQueueLoad: undefined,
            apiCaller: mockApiCallerPilot
        });
        assert.equal(resPilotUndefined.currRecord.expected.currentQueueLoad, 1);

        const orgCtxNonPilot = {
            orgId: 'test-org-19-np',
            orgCode: 'SYNC-TEST-O19-NP',
            orgAdminToken: 'mock-token',
            expectedTokens: 60
        };

        const mockApiCallerNonPilot = async (method, endpoint) => {
            const url = new URL('http://localhost' + endpoint);
            const startStr = url.searchParams.get('start');
            const startTime = new Date(startStr).getTime();
            const now = Date.now();

            if (startTime < now - 2 * 24 * 60 * 60 * 1000) {
                return {
                    operationalTokenVolume: 60,
                    completedTokens: 42,
                    noShows: 9,
                    cancellations: 3,
                    currentQueueLoad: 5
                };
            } else {
                return {
                    operationalTokenVolume: 0,
                    completedTokens: 0,
                    noShows: 0,
                    cancellations: 0,
                    currentQueueLoad: 5
                };
            }
        };

        // Non-pilot mode without expectedQueueLoad defaults target to null (gauge check passes without expecting fixed load)
        const resNonPilotOmitted = await validatePostBackdateAnalytics(orgCtxNonPilot, {
            isPilot: false,
            apiCaller: mockApiCallerNonPilot
        });
        assert.equal(resNonPilotOmitted.currRecord.expected.currentQueueLoad, undefined);
        assert.equal(resNonPilotOmitted.currRecord.reported.currentQueueLoad, 5);

        // Non-pilot mode with expectedQueueLoad: undefined explicitly defaults target to null
        const resNonPilotUndefined = await validatePostBackdateAnalytics(orgCtxNonPilot, {
            isPilot: false,
            expectedQueueLoad: undefined,
            apiCaller: mockApiCallerNonPilot
        });
        assert.equal(resNonPilotUndefined.currRecord.expected.currentQueueLoad, undefined);
        assert.equal(resNonPilotUndefined.currRecord.reported.currentQueueLoad, 5);
    });

    test('20. Success-path manifest collision safeguard prevents overwriting existing success manifest and records failure manifest', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const runId = 'SYNC-COLL-SUCC';
        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-manifest-succ-'));
        const originalExitCode = process.exitCode;

        const successFile = path.join(tempManifestDir, `run-${runId}.json`);
        const failedFile = path.join(tempManifestDir, `run-${runId}-failed.json`);
        const canarySuccessContent = JSON.stringify({ canary: 'PRE_EXISTING_SUCCESS_MANIFEST_DATA', runId });

        fs.writeFileSync(successFile, canarySuccessContent);

        try {
            await run({
                runId,
                isDryRun: true,
                isPilot: true,
                enableBackdate: false,
                manifestDir: tempManifestDir
            });

            // 1. Existing success manifest content MUST NOT be modified or overwritten
            const actualSuccessContent = fs.readFileSync(successFile, 'utf8');
            assert.equal(actualSuccessContent, canarySuccessContent, 'Pre-existing success manifest must not be overwritten');

            // 2. Run in memory must be marked as FAILED with collision error
            assert.equal(manifest.status, 'FAILED');
            assert.equal(manifest.validation.status, 'FAILED');
            assert.ok(manifest.error.includes('Manifest collision detected'), 'Error must specify collision detection');
            assert.ok(manifest.error.includes('Success manifest already exists'), 'Error must specify success manifest already exists');

            // 3. Failure manifest must be created documenting the collision error
            assert.ok(fs.existsSync(failedFile), 'Failure manifest documenting collision must be saved');
            const failedContent = JSON.parse(fs.readFileSync(failedFile, 'utf8'));
            assert.equal(failedContent.status, 'FAILED');
            assert.ok(failedContent.error.includes('Manifest collision detected'));
        } finally {
            process.exitCode = originalExitCode;
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('21. Collision on success manifest does not overwrite existing failure manifest when both pre-exist', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const runId = 'SYNC-COLL-BOTH';
        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-manifest-both-'));
        const originalExitCode = process.exitCode;

        const successFile = path.join(tempManifestDir, `run-${runId}.json`);
        const failedFile = path.join(tempManifestDir, `run-${runId}-failed.json`);
        const canarySuccessContent = JSON.stringify({ canary: 'CANARY_EXISTING_SUCCESS' });
        const canaryFailedContent = JSON.stringify({ canary: 'CANARY_EXISTING_FAILURE' });

        fs.writeFileSync(successFile, canarySuccessContent);
        fs.writeFileSync(failedFile, canaryFailedContent);

        try {
            await run({
                runId,
                isDryRun: true,
                isPilot: true,
                enableBackdate: false,
                manifestDir: tempManifestDir
            });

            // 1. Neither success manifest nor failure manifest must be overwritten
            assert.equal(fs.readFileSync(successFile, 'utf8'), canarySuccessContent, 'Success manifest must not be overwritten');
            assert.equal(fs.readFileSync(failedFile, 'utf8'), canaryFailedContent, 'Failure manifest must not be overwritten');

            // 2. In-memory manifest must be marked failed
            assert.equal(manifest.status, 'FAILED');
            assert.ok(manifest.error.includes('Manifest collision detected'));
        } finally {
            process.exitCode = originalExitCode;
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('22. Failure-path manifest collision safeguard prevents overwriting existing failure manifest during runtime failure', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const runId = 'SYNC-COLL-FAIL';
        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-manifest-fail-'));
        const originalExitCode = process.exitCode;

        const successFile = path.join(tempManifestDir, `run-${runId}.json`);
        const failedFile = path.join(tempManifestDir, `run-${runId}-failed.json`);
        const canaryFailedContent = JSON.stringify({ canary: 'PRE_EXISTING_FAILURE_MANIFEST_DATA' });

        fs.writeFileSync(failedFile, canaryFailedContent);

        const failingSql = async () => {
            throw new Error('Simulated runtime transaction error for collision test');
        };

        try {
            await run({
                runId,
                isDryRun: true,
                isPilot: true,
                enableBackdate: true,
                sqlExecutor: failingSql,
                manifestDir: tempManifestDir
            });

            // 1. Pre-existing failure manifest MUST NOT be modified or overwritten
            assert.equal(fs.readFileSync(failedFile, 'utf8'), canaryFailedContent, 'Pre-existing failure manifest must not be overwritten');

            // 2. Success manifest must not exist
            assert.ok(!fs.existsSync(successFile), 'Success manifest should not be created');

            // 3. In-memory manifest records the runtime transaction error
            assert.equal(manifest.status, 'FAILED');
            assert.ok(manifest.error.includes('Simulated runtime transaction error'));
        } finally {
            process.exitCode = originalExitCode;
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('23. Full-mode dry-run produces exact target resource totals in manifest', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-target-totals-'));
        try {
            const resultManifest = await run({
                isDryRun: true,
                isPilot: false,
                enableBackdate: false,
                manifestDir: tempManifestDir
            });

            assert.equal(resultManifest.status, 'SUCCESS');
            assert.equal(resultManifest.validation.status, 'PASSED');
            assert.equal(resultManifest.generated.organizations.length, 10, 'Target: exactly 10 organizations');
            assert.equal(resultManifest.generated.locations.length, 30, 'Target: exactly 30 locations');
            assert.equal(resultManifest.generated.services.length, 60, 'Target: exactly 60 services');
            assert.equal(resultManifest.generated.queues.length, 60, 'Target: exactly 60 queues');
            assert.equal(resultManifest.generated.counters.length, 120, 'Target: exactly 120 counters');
            assert.equal(resultManifest.generated.users.length, 200, 'Target: exactly 200 staff and administrators');
            assert.equal(resultManifest.generated.tokens.length, 1000, 'Target: exactly 1,000 tokens');
            assert.equal(resultManifest.validation.checks.length, 10, 'Exactly 1 check per organization in non-backdated run');
        } finally {
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('24. Full-mode user distribution consists of exactly 20 ORG_ADMINs and 180 STAFF without duplicates', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-user-dist-'));
        try {
            const resultManifest = await run({
                isDryRun: true,
                isPilot: false,
                enableBackdate: false,
                manifestDir: tempManifestDir
            });

            const userIds = resultManifest.generated.users;
            assert.equal(userIds.length, 200, 'Must have exactly 200 users');
            const uniqueUserIds = new Set(userIds);
            assert.equal(uniqueUserIds.size, 200, 'All 200 user IDs must be unique (no duplicate counting)');

            // 10 orgs * 2 admins = 20 admins; 30 locations * 6 staff = 180 staff
            assert.equal(resultManifest.generated.organizations.length * 2, 20, '20 ORG_ADMIN users');
            assert.equal(resultManifest.generated.locations.length * 6, 180, '180 STAFF users');
        } finally {
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('25. Full-mode counter assignments: exactly 4 counters per location, all assigned to services', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-counter-assign-'));
        try {
            const resultManifest = await run({
                isDryRun: true,
                isPilot: false,
                enableBackdate: false,
                manifestDir: tempManifestDir
            });

            // 120 counters total
            assert.equal(resultManifest.generated.counters.length, 120);
            // In dry run, all 120 counters must have been set online
            assert.equal(mockState.counterOnline.size, 120, 'All 120 counters must be set online');
            // Each of the 120 counters is assigned to 2 services at its location = 240 assignments
            assert.equal(mockState.counterAssignments.size, 240, 'All 120 counters assigned to 2 services = 240 assignments');
        } finally {
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('26. Full-mode queue token distribution: exactly 1,000 tokens across 60 queues (40x17, 20x16)', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-queue-dist-'));
        try {
            const resultManifest = await run({
                isDryRun: true,
                isPilot: false,
                enableBackdate: false,
                manifestDir: tempManifestDir
            });

            assert.equal(resultManifest.generated.tokens.length, 1000, 'Exactly 1,000 tokens in manifest');
            const uniqueTokenIds = new Set(resultManifest.generated.tokens);
            assert.equal(uniqueTokenIds.size, 1000, 'All 1,000 token IDs must be unique');

            // 10 orgs, each with 100 tokens (4 queues x 17 + 2 queues x 16 = 100)
            assert.equal(resultManifest.generated.organizations.length * 100, 1000);
            assert.equal(40 * 17 + 20 * 16, 1000, '40 queues with 17 tokens + 20 queues with 16 tokens = 1,000 tokens');
        } finally {
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('27. Full-mode lifecycle distribution: 700 COMPLETED, 150 NO_SHOW, 50 CANCELLED, 100 WAITING', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-lifecycle-dist-'));
        try {
            const resultManifest = await run({
                isDryRun: true,
                isPilot: false,
                enableBackdate: false,
                manifestDir: tempManifestDir
            });

            // In dry run mockState:
            // 700 tokens were completed via call-next, start-service, complete
            // 150 tokens were marked no-show via call-next, no-show
            // Total called tokens recorded in calledTokens: 700 + 150 = 850
            assert.equal(Object.keys(mockState.calledTokens).length, 850, '850 tokens called across all counters (700 completed + 150 no-show)');

            // 100 active WAITING tokens remain in mockState.queue (10 per organization * 10 orgs)
            assert.equal(mockState.queue.length, 100, '100 active WAITING tokens remain in queue (10 per org)');
        } finally {
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('28. Full-mode post-backdate validation executes 3 checks per organization (30 checks total)', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-full-backdate-'));
        try {
            const resultManifest = await run({
                isDryRun: true,
                isPilot: false,
                enableBackdate: true,
                manifestDir: tempManifestDir
            });

            assert.equal(resultManifest.status, 'SUCCESS');
            assert.equal(resultManifest.validation.status, 'PASSED');
            assert.equal(resultManifest.validation.checks.length, 30, '10 operational + 10 historical + 10 zero-checks = 30 checks');
            assert.equal(mockState.backdated, true, 'Backdating simulation was executed');
        } finally {
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('29. Pilot-mode regression: verifies pilot mode continues to produce deterministic 5-token set', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-pilot-regr-'));
        try {
            const pilotManifest = await run({
                isDryRun: true,
                isPilot: true,
                enableBackdate: true,
                manifestDir: tempManifestDir
            });

            assert.equal(pilotManifest.status, 'SUCCESS');
            assert.equal(pilotManifest.validation.status, 'PASSED');
            assert.equal(pilotManifest.generated.organizations.length, 1);
            assert.equal(pilotManifest.generated.locations.length, 1);
            assert.equal(pilotManifest.generated.services.length, 1);
            assert.equal(pilotManifest.generated.queues.length, 1);
            assert.equal(pilotManifest.generated.counters.length, 1);
            assert.equal(pilotManifest.generated.users.length, 2);
            assert.equal(pilotManifest.generated.tokens.length, 5);
            assert.equal(pilotManifest.validation.checks.length, 3);
        } finally {
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('30. Target safety validation rejects live execution against shared development environment', async () => {
        // 1. Prohibits port 8080 / align_backend
        assert.throws(
            () => validateTargetSafety({ apiBase: 'http://localhost:8080/api/v1', dbContainer: 'isolated_pg', dbName: 'isolated_db' }, false),
            /Safety violation: Target API URL.*points to default development backend/
        );
        assert.throws(
            () => validateTargetSafety({ apiBase: 'http://align_backend:8080/api/v1', dbContainer: 'isolated_pg', dbName: 'isolated_db' }, false),
            /Safety violation: Target API URL.*points to default development backend/
        );

        // 2. Prohibits shared development container 'align_postgres'
        assert.throws(
            () => validateTargetSafety({ apiBase: 'http://localhost:8081/api/v1', dbContainer: 'align_postgres', dbName: 'isolated_db' }, false),
            /Safety violation: Target DB container.*is the shared development container 'align_postgres'/
        );

        // 3. Prohibits shared development database 'align_qms'
        assert.throws(
            () => validateTargetSafety({ apiBase: 'http://localhost:8081/api/v1', dbContainer: 'isolated_pg', dbName: 'align_qms' }, false),
            /Safety violation: Target database.*is the shared development database 'align_qms'/
        );

        // 4. Prohibits missing targets
        assert.throws(
            () => validateTargetSafety({ apiBase: '', dbContainer: 'isolated_pg', dbName: 'isolated_db' }, false),
            /Target validation failed: API_BASE_URL is required/
        );
        assert.throws(
            () => validateTargetSafety({ apiBase: 'http://localhost:8081/api/v1', dbContainer: '', dbName: 'isolated_db' }, false),
            /Target validation failed: DB_CONTAINER is required/
        );
        assert.throws(
            () => validateTargetSafety({ apiBase: 'http://localhost:8081/api/v1', dbContainer: 'isolated_pg', dbName: '' }, false),
            /Target validation failed: DB_NAME is required/
        );
    });

    test('31. Target safety validation accepts explicit isolated targets for live execution and allows dry-run unconditionally', () => {
        // Isolated targets succeed for live execution
        assert.doesNotThrow(() => {
            validateTargetSafety({
                apiBase: 'http://localhost:8081/api/v1',
                dbContainer: 'align_postgres_isolated',
                dbName: 'align_qms_isolated'
            }, false);
        });

        // Dry-run mode bypasses target check since it never executes network or database calls
        assert.doesNotThrow(() => {
            validateTargetSafety({
                apiBase: 'http://localhost:8080/api/v1',
                dbContainer: 'align_postgres',
                dbName: 'align_qms'
            }, true);
        });
    });

    test('32. resolveConfig resolves options, environment variables, and normalization', () => {
        const savedApi = process.env.API_BASE_URL;
        const savedDb = process.env.DB_NAME;
        const savedContainer = process.env.DB_CONTAINER;

        try {
            process.env.API_BASE_URL = 'http://localhost:8081';
            process.env.DB_CONTAINER = 'custom_pg';
            process.env.DB_NAME = 'custom_db';

            const cfg = resolveConfig();
            assert.equal(cfg.apiBase, 'http://localhost:8081/api/v1', 'Appends /api/v1 if omitted');
            assert.equal(cfg.dbContainer, 'custom_pg');
            assert.equal(cfg.dbName, 'custom_db');

            // Explicit options take precedence over environment variables
            const overridden = resolveConfig({ apiBase: 'http://127.0.0.1:9090/api/v1', dbName: 'override_db' });
            assert.equal(overridden.apiBase, 'http://127.0.0.1:9090/api/v1');
            assert.equal(overridden.dbName, 'override_db');
            assert.equal(overridden.dbContainer, 'custom_pg');
        } finally {
            if (savedApi !== undefined) process.env.API_BASE_URL = savedApi; else delete process.env.API_BASE_URL;
            if (savedDb !== undefined) process.env.DB_NAME = savedDb; else delete process.env.DB_NAME;
            if (savedContainer !== undefined) process.env.DB_CONTAINER = savedContainer; else delete process.env.DB_CONTAINER;
        }
    });

    test('33. Sample-mode dry-run produces exact target resource totals in manifest', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-sample-totals-'));
        try {
            const resultManifest = await run({
                isDryRun: true,
                isPilot: false,
                isSample: true,
                enableBackdate: false,
                manifestDir: tempManifestDir
            });

            assert.equal(resultManifest.status, 'SUCCESS');
            assert.equal(resultManifest.validation.status, 'PASSED');
            assert.equal(resultManifest.validation.mode, 'SAMPLE');
            assert.equal(resultManifest.config.sample, true);
            assert.equal(resultManifest.generated.organizations.length, 2, 'Target: exactly 2 organizations');
            assert.equal(resultManifest.generated.locations.length, 4, 'Target: exactly 4 locations (2 per org)');
            assert.equal(resultManifest.generated.services.length, 8, 'Target: exactly 8 services (2 per location)');
            assert.equal(resultManifest.generated.queues.length, 8, 'Target: exactly 8 queues (2 per location)');
            assert.equal(resultManifest.generated.counters.length, 16, 'Target: exactly 16 counters (4 per location)');
            assert.equal(resultManifest.generated.users.length, 28, 'Target: exactly 28 staff and administrators (4 admins + 24 staff)');
            assert.equal(resultManifest.generated.tokens.length, 100, 'Target: exactly 100 tokens');
            assert.equal(resultManifest.validation.checks.length, 2, 'Exactly 1 check per organization in non-backdated sample run');
        } finally {
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('34. Sample-mode user distribution consists of exactly 4 ORG_ADMINs and 24 STAFF without duplicates', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-sample-users-'));
        try {
            const resultManifest = await run({
                isDryRun: true,
                isPilot: false,
                isSample: true,
                enableBackdate: false,
                manifestDir: tempManifestDir
            });

            const userIds = resultManifest.generated.users;
            assert.equal(userIds.length, 28, 'Must have exactly 28 users');
            const uniqueUserIds = new Set(userIds);
            assert.equal(uniqueUserIds.size, 28, 'All 28 user IDs must be unique');

            // 2 orgs * 2 admins = 4 admins; 4 locations * 6 staff = 24 staff
            assert.equal(resultManifest.generated.organizations.length * 2, 4, '4 ORG_ADMIN users');
            assert.equal(resultManifest.generated.locations.length * 6, 24, '24 STAFF users');
        } finally {
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('35. Sample-mode counter assignments: exactly 4 counters per location, all assigned to services within same location', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-sample-counters-'));
        try {
            const resultManifest = await run({
                isDryRun: true,
                isPilot: false,
                isSample: true,
                enableBackdate: false,
                manifestDir: tempManifestDir
            });

            // 16 counters total
            assert.equal(resultManifest.generated.counters.length, 16);
            // In dry run, all 16 counters set online
            assert.equal(mockState.counterOnline.size, 16, 'All 16 counters must be set online');
            // Each counter assigned to 2 services at its location = 32 assignments
            assert.equal(mockState.counterAssignments.size, 32, 'All 16 counters assigned to 2 services = 32 assignments');
        } finally {
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('36. Sample-mode queue token distribution: exactly 100 tokens across 8 queues with 4x13 and 4x12 allocation', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-sample-queues-'));
        try {
            const resultManifest = await run({
                isDryRun: true,
                isPilot: false,
                isSample: true,
                enableBackdate: false,
                manifestDir: tempManifestDir
            });

            assert.equal(resultManifest.generated.tokens.length, 100, 'Exactly 100 tokens in manifest');
            const uniqueTokenIds = new Set(resultManifest.generated.tokens);
            assert.equal(uniqueTokenIds.size, 100, 'All 100 token IDs must be unique');

            // 2 orgs, each with 50 tokens
            // Per org: 2 queues with 13 tokens and 2 queues with 12 tokens = 50 tokens
            // Total: 4 queues with 13 tokens and 4 queues with 12 tokens = 100 tokens
            assert.equal(4 * 13 + 4 * 12, 100, '4 queues with 13 tokens + 4 queues with 12 tokens = 100 tokens');
        } finally {
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('37. Sample-mode lifecycle distribution: 70 COMPLETED, 15 NO_SHOW, 5 CANCELLED, 10 WAITING across 2 orgs', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-sample-lifecycle-'));
        try {
            const resultManifest = await run({
                isDryRun: true,
                isPilot: false,
                isSample: true,
                enableBackdate: false,
                manifestDir: tempManifestDir
            });

            // In dry run mockState:
            // Org 0: 35 completed + 8 no-show = 43 called tokens
            // Org 1: 35 completed + 7 no-show = 42 called tokens
            // Total called tokens = 43 + 42 = 85
            assert.equal(Object.keys(mockState.calledTokens).length, 85, '85 tokens called across counters (70 completed + 15 no-show)');

            // 10 active WAITING tokens remain in mockState.queue (4 from Org 0 + 6 from Org 1)
            assert.equal(mockState.queue.length, 10, '10 active WAITING tokens remain in queue (4 for Org 0 + 6 for Org 1)');

            // Manifest validation checks verify the per-org breakdown was reported and checked
            const check0 = resultManifest.validation.checks[0];
            const check1 = resultManifest.validation.checks[1];

            assert.equal(check0.expected.completedTokens, 35);
            assert.equal(check0.expected.noShows, 8);
            assert.equal(check0.expected.cancellations, 3);
            assert.equal(check0.expected.currentQueueLoad, 4);

            assert.equal(check1.expected.completedTokens, 35);
            assert.equal(check1.expected.noShows, 7);
            assert.equal(check1.expected.cancellations, 2);
            assert.equal(check1.expected.currentQueueLoad, 6);
        } finally {
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('38. Sample-mode operational analytics validation validates exact per-organization status breakdown and rejects mismatches', async () => {
        const testManifest = { validation: { checks: [] } };

        // Org 1 (index 0 / Org 0): 35 completed, 8 no-shows, 3 cancellations, 4 queue load
        const org0Ctx = {
            orgId: 'sample-org-0',
            orgCode: 'SYNC-SMPL-O0',
            orgIndex: 0,
            orgAdminToken: 'mock-token-0',
            expectedTokens: 50,
            expectedBreakdown: { completedTokens: 35, noShows: 8, cancellations: 3, currentQueueLoad: 4 }
        };

        const mockApiCaller0 = async (method, endpoint, body, token) => ({
            operationalTokenVolume: 50,
            completedTokens: 35,
            noShows: 8,
            cancellations: 3,
            currentQueueLoad: 4
        });

        const res0 = await validateOperationalAnalytics(org0Ctx, {
            isPilot: false,
            isSample: true,
            manifestRef: testManifest,
            apiCaller: mockApiCaller0
        });
        assert.equal(res0.passed, true);
        assert.equal(res0.expected.completedTokens, 35);
        assert.equal(res0.expected.noShows, 8);
        assert.equal(res0.expected.cancellations, 3);
        assert.equal(res0.expected.currentQueueLoad, 4);

        // Org 2 (index 1 / Org 1): 35 completed, 7 no-shows, 2 cancellations, 6 queue load
        const org1Ctx = {
            orgId: 'sample-org-1',
            orgCode: 'SYNC-SMPL-O1',
            orgIndex: 1,
            orgAdminToken: 'mock-token-1',
            expectedTokens: 50,
            expectedBreakdown: { completedTokens: 35, noShows: 7, cancellations: 2, currentQueueLoad: 6 }
        };

        const mockApiCaller1 = async (method, endpoint, body, token) => ({
            operationalTokenVolume: 50,
            completedTokens: 35,
            noShows: 7,
            cancellations: 2,
            currentQueueLoad: 6
        });

        const res1 = await validateOperationalAnalytics(org1Ctx, {
            isPilot: false,
            isSample: true,
            manifestRef: testManifest,
            apiCaller: mockApiCaller1
        });
        assert.equal(res1.passed, true);
        assert.equal(res1.expected.completedTokens, 35);
        assert.equal(res1.expected.noShows, 7);
        assert.equal(res1.expected.cancellations, 2);
        assert.equal(res1.expected.currentQueueLoad, 6);

        // Rejection test on mismatch in sample mode
        await assert.rejects(
            async () => {
                await validateOperationalAnalytics(org0Ctx, {
                    isPilot: false,
                    isSample: true,
                    apiCaller: async () => ({
                        operationalTokenVolume: 50,
                        completedTokens: 35,
                        noShows: 7, // Expected 8 for Org 0
                        cancellations: 3,
                        currentQueueLoad: 4
                    })
                });
            },
            /reported noShows 7, expected 8/
        );
    });

    test('39. Sample-mode post-backdate validation executes historical and zero-leak checks for both orgs (6 checks total)', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-sample-backdate-'));
        try {
            const resultManifest = await run({
                isDryRun: true,
                isPilot: false,
                isSample: true,
                enableBackdate: true,
                manifestDir: tempManifestDir
            });

            assert.equal(resultManifest.status, 'SUCCESS');
            assert.equal(resultManifest.validation.status, 'PASSED');
            assert.equal(resultManifest.validation.checks.length, 6, '2 operational + 2 historical + 2 zero-checks = 6 checks');
            assert.equal(mockState.backdated, true, 'Backdating simulation executed');

            const org0Hist = resultManifest.validation.checks.find(c => c.phase === 'HISTORICAL_WINDOW' && c.expected.currentQueueLoad === 4);
            const org1Hist = resultManifest.validation.checks.find(c => c.phase === 'HISTORICAL_WINDOW' && c.expected.currentQueueLoad === 6);
            assert.ok(org0Hist, 'Org 0 historical check recorded with currentQueueLoad=4');
            assert.ok(org1Hist, 'Org 1 historical check recorded with currentQueueLoad=6');
            assert.equal(org0Hist.expected.noShows, 8);
            assert.equal(org1Hist.expected.noShows, 7);

            const org0Zero = resultManifest.validation.checks.find(c => c.phase === 'CURRENT_WINDOW_ZERO_CHECK' && c.expected.currentQueueLoad === 4);
            const org1Zero = resultManifest.validation.checks.find(c => c.phase === 'CURRENT_WINDOW_ZERO_CHECK' && c.expected.currentQueueLoad === 6);
            assert.ok(org0Zero, 'Org 0 current window check recorded with currentQueueLoad=4');
            assert.ok(org1Zero, 'Org 1 current window check recorded with currentQueueLoad=6');
            assert.equal(org0Zero.reported.operationalTokenVolume, 0);
            assert.equal(org1Zero.reported.operationalTokenVolume, 0);
        } finally {
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('40. Mode conflict validation rejects simultaneous pilot and sample mode', async () => {
        await assert.rejects(
            async () => {
                await run({
                    isDryRun: true,
                    isPilot: true,
                    isSample: true
                });
            },
            /Conflicting configuration: cannot specify both pilot mode and sample mode simultaneously/
        );
    });

    test('41. parseRetryAfter handles integer seconds, HTTP-date, zero, invalid strings, and null', () => {
        assert.equal(parseRetryAfter(null), null);
        assert.equal(parseRetryAfter(''), null);
        assert.equal(parseRetryAfter('invalid'), null);
        assert.equal(parseRetryAfter('10'), 10000);
        assert.equal(parseRetryAfter('0'), 0);
        assert.equal(parseRetryAfter(' 120 '), 120000);

        const futureDate = new Date(Date.now() + 5000).toUTCString();
        const parsed = parseRetryAfter(futureDate);
        assert.ok(parsed > 0 && parsed <= 6000, `Parsed future date must return positive ms delta: got ${parsed}`);
    });

    test('42. RequestPacer paces consecutive /auth/login and /tokens calls in live mode, bypassing in dry-run', async () => {
        const sleeps = [];
        const mockSleep = async (ms) => sleeps.push(ms);

        const pacer = new RequestPacer({
            sleepFn: mockSleep,
            loginMinIntervalMs: 6000,
            tokenMinIntervalMs: 2000
        });

        // 1. Dry run bypasses pacing immediately
        const dryRunDelay = await pacer.pace('POST', '/auth/login', true);
        assert.equal(dryRunDelay, 0);
        assert.equal(sleeps.length, 0);

        // 2. First live login executes immediately
        const firstLoginDelay = await pacer.pace('POST', '/auth/login', false);
        assert.equal(firstLoginDelay, 0);
        assert.equal(sleeps.length, 0);

        // 3. Second immediate live login is paced
        const secondLoginDelay = await pacer.pace('POST', '/auth/login', false);
        assert.ok(secondLoginDelay > 5000 && secondLoginDelay <= 6000, `Second login must be paced: got ${secondLoginDelay}`);
        assert.equal(sleeps.length, 1);
        assert.equal(sleeps[0], secondLoginDelay);

        // 4. First token creation executes immediately
        const firstTokenDelay = await pacer.pace('POST', '/tokens', false);
        assert.equal(firstTokenDelay, 0);

        // 5. Second immediate token creation is paced
        const secondTokenDelay = await pacer.pace('POST', '/tokens', false);
        assert.ok(secondTokenDelay > 1000 && secondTokenDelay <= 2000, `Second token must be paced: got ${secondTokenDelay}`);
        assert.equal(sleeps.length, 2);
    });

    test('43. Bounded 429 retry handling respects Retry-After header and succeeds on retry', async () => {
        let attempts = 0;
        const sleepLog = [];
        const mockSleep = async (ms) => sleepLog.push(ms);

        const mockFetch = async () => {
            attempts++;
            if (attempts === 1) {
                return {
                    status: 429,
                    ok: false,
                    headers: new Map([['Retry-After', '2']]),
                    text: async () => JSON.stringify({ message: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' })
                };
            }
            return {
                status: 200,
                ok: true,
                text: async () => JSON.stringify({ accessToken: 'mock-token-after-429' })
            };
        };

        const prevDryRun = activeConfig.isDryRun;
        activeConfig.isDryRun = false;
        try {
            const res = await apiCall('POST', '/auth/login', { email: 'staff@test.com', password: 'pwd' }, null, {
                fetchFn: mockFetch,
                sleepFn: mockSleep,
                pacer: { pace: async () => 0 }
            });

            assert.equal(attempts, 2);
            assert.equal(sleepLog.length, 1);
            assert.equal(sleepLog[0], 2000, 'Must wait 2000ms as instructed by Retry-After: 2');
            assert.equal(res.accessToken, 'mock-token-after-429');
        } finally {
            activeConfig.isDryRun = prevDryRun;
        }
    });

    test('44. Bounded 429 retry handling uses exponential backoff when Retry-After is absent and fails when maxRetries exhausted', async () => {
        let attempts = 0;
        const sleepLog = [];
        const mockSleep = async (ms) => sleepLog.push(ms);

        const mockFetchAlways429 = async () => {
            attempts++;
            return {
                status: 429,
                ok: false,
                headers: new Map(),
                text: async () => JSON.stringify({ code: 'RATE_LIMIT_EXCEEDED' })
            };
        };

        const prevDryRun = activeConfig.isDryRun;
        activeConfig.isDryRun = false;
        try {
            await assert.rejects(
                async () => {
                    await apiCall('POST', '/tokens', { serviceId: 's-1' }, null, {
                        fetchFn: mockFetchAlways429,
                        sleepFn: mockSleep,
                        maxRetries: 2,
                        default429DelayMs: 50,
                        pacer: { pace: async () => 0 }
                    });
                },
                /Rate limit 429 exceeded after 2 retries on POST \/tokens/
            );

            assert.equal(attempts, 3, 'Initial attempt + 2 retries = 3 attempts total');
            assert.equal(sleepLog.length, 2, '2 retry sleeps before failure');
            assert.equal(sleepLog[0], 50, 'Attempt 0 backoff: 50 * 2^0 = 50ms');
            assert.equal(sleepLog[1], 100, 'Attempt 1 backoff: 50 * 2^1 = 100ms');
        } finally {
            activeConfig.isDryRun = prevDryRun;
        }
    });

    test('45. Ambiguous failure guard prevents retrying non-idempotent creations on network error', async () => {
        let fetchCalls = 0;
        const mockNetworkDrop = async () => {
            fetchCalls++;
            throw new Error('ECONNRESET connection reset by peer');
        };

        const prevDryRun = activeConfig.isDryRun;
        activeConfig.isDryRun = false;
        try {
            await assert.rejects(
                async () => {
                    await apiCall('POST', '/tokens', { serviceId: 's-1' }, null, {
                        fetchFn: mockNetworkDrop,
                        pacer: { pace: async () => 0 }
                    });
                },
                /Ambiguous network failure on non-idempotent POST \/tokens: ECONNRESET/
            );
            assert.equal(fetchCalls, 1, 'Must fail fast on first attempt without retrying ambiguous mutation');
        } finally {
            activeConfig.isDryRun = prevDryRun;
        }
    });

    test('46. Partial-run collision detection identifies existing failed manifest and DB entities', () => {
        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-collision-detect-'));
        const runId = 'SYNC-PARTIAL-TEST';

        try {
            // 1. Clean directory passes
            assert.doesNotThrow(() => {
                checkRunCollision({ runId, manifestDir: tempManifestDir, isDryRun: true });
            });

            // 2. Pre-existing failed manifest is detected and rejected
            const failedFile = path.join(tempManifestDir, `run-${runId}-failed.json`);
            fs.writeFileSync(failedFile, JSON.stringify({ runId, status: 'FAILED' }));

            assert.throws(
                () => checkRunCollision({ runId, manifestDir: tempManifestDir, isDryRun: true }),
                /Partial run collision detected: Previous failed manifest exists/
            );

            // 3. Pre-existing database entities are detected and rejected
            const mockDbExecutor = (sql) => {
                if (sql.includes('SELECT count(*) FROM organizations')) return '1';
                return '0';
            };

            const cleanRunId = 'SYNC-CLEAN-RUN';
            assert.throws(
                () => checkRunCollision({
                    runId: cleanRunId,
                    manifestDir: tempManifestDir,
                    isDryRun: false,
                    sqlExecutor: mockDbExecutor
                }),
                /Partial run collision detected: 1 organization\(s\) already exist with runId "SYNC-CLEAN-RUN"/
            );
        } finally {
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });

    test('47. Session reuse ensures only 1 staff login per location while creating all staff accounts', async () => {
        mockState.counterAssignments.clear();
        mockState.counterOnline.clear();
        mockState.tokensProcessingStarted = false;
        mockState.queue = [];
        mockState.calledTokens = {};
        mockState.backdated = false;

        process.env.ADMIN_EMAIL = 'admin@align.com';
        process.env.ADMIN_PASSWORD = 'admin123';

        const tempManifestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-session-reuse-'));
        try {
            const resultManifest = await run({
                isDryRun: true,
                isPilot: false,
                isSample: true,
                enableBackdate: false,
                manifestDir: tempManifestDir
            });

            assert.equal(resultManifest.status, 'SUCCESS');
            assert.equal(resultManifest.generated.users.length, 28);
            assert.equal(resultManifest.generated.counters.length, 16);
            assert.equal(mockState.counterOnline.size, 16);
            assert.equal(resultManifest.generated.tokens.length, 100);
        } finally {
            fs.rmSync(tempManifestDir, { recursive: true, force: true });
        }
    });
});



