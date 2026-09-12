# ALIGN BACKEND — TESTING STRATEGY

**Version:** 1.2
**Last Updated:** 2026-09-07
**Status:** APPROVED — Phase 1 validated

---

## Testing Philosophy

**Test PostgreSQL-specific behavior against real PostgreSQL, not H2.**

### Testing Pyramid

```
           ┌────────────┐
           │    E2E     │  ← 5% (Manual + Automated)
           └────────────┘
         ┌──────────────────┐
         │   Integration    │  ← 25% (Testcontainers)
         └──────────────────┘
      ┌────────────────────────┐
      │       Unit Tests       │  ← 70% (Fast, Isolated)
      └────────────────────────┘
```

---

## Test Infrastructure

### Testcontainers Configuration

**Purpose:** Run integration tests against real PostgreSQL.

**Dependencies (pom.xml):**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <version>1.21.4</version>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>1.21.4</version>
    <scope>test</scope>
</dependency>
<!-- Apache HttpClient 5: required by TestRestTemplate to correctly handle
     401 responses on POST requests (JDK HttpURLConnection fails in streaming mode) -->
<dependency>
    <groupId>org.apache.httpcomponents.client5</groupId>
    <artifactId>httpclient5</artifactId>
    <scope>test</scope>
</dependency>
```

**Base Integration Test Class (actual implementation):**
```java
// IMPORTANT: Do NOT use @Testcontainers + @Container on a base class
// shared across multiple test classes. The @Testcontainers extension stops
// the container after each class finishes, killing it for subsequent classes.
// Use a static initializer to start the container once for the entire JVM run.

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public abstract class PostgresIntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES;

    static {
        POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("align_test")
            .withUsername("align_test")
            .withPassword("align_test");
        POSTGRES.start(); // Started once; Testcontainers shutdown hook stops it at JVM exit
    }

    @DynamicPropertySource
    static void configureDataSourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",      POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
```

**Why Testcontainers:**
- ✅ Real PostgreSQL behavior
- ✅ `FOR UPDATE SKIP LOCKED` works correctly
- ✅ Accurate transaction isolation
- ✅ Unique constraint behavior
- ✅ CI/CD compatible (Docker required)

**DO NOT use H2 for:**
- Concurrent token issuance tests
- Concurrent CALL NEXT tests
- `SELECT FOR UPDATE SKIP LOCKED` behavior
- Idempotency key conflict handling
- Transaction isolation tests
- Unique constraint violation tests

---

## Unit Tests (70%)

### Service Layer Tests

**TokenServiceTest.java**
```java
@ExtendWith(MockitoExtension.class)
class TokenServiceTest {
    
    @Mock
    private TokenRepository tokenRepository;
    
    @Mock
    private QueueRepository queueRepository;
    
    @Mock
    private TokenEventService tokenEventService;
    
    @Mock
    private JdbcTemplate jdbcTemplate;
    
    @InjectMocks
    private TokenService tokenService;
    
    @Test
    void joinQueue_Success() {
        // Given
        UUID serviceId = UUID.randomUUID();
        TokenJoinRequest request = TokenJoinRequest.builder()
            .serviceId(serviceId)
            .customerName("John Doe")
            .idempotencyKey("idem-123")
            .build();
        
        Queue queue = Queue.builder()
            .id(UUID.randomUUID())
            .tokenPrefix("A")
            .maxCapacity(50)
            .status(QueueStatus.ACTIVE)
            .build();
        
        when(queueRepository.findByIdForUpdate(serviceId))
            .thenReturn(Optional.of(queue));
        
        when(tokenRepository.countActiveTokens(queue.getId()))
            .thenReturn(10L);
        
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class), any()))
            .thenReturn(43L);
        
        // When
        Token token = tokenService.joinQueue(request);
        
        // Then
        assertThat(token.getTokenNumber()).isEqualTo("A-043");
        assertThat(token.getState()).isEqualTo(TokenState.WAITING);
        verify(tokenRepository).save(any(Token.class));
        verify(tokenEventService).recordEvent(any(), eq(TokenEventType.TOKEN_CREATED));
    }
    
    @Test
    void joinQueue_QueueFull_ThrowsException() {
        // Given
        UUID serviceId = UUID.randomUUID();
        Queue queue = Queue.builder()
            .id(UUID.randomUUID())
            .maxCapacity(50)
            .status(QueueStatus.ACTIVE)
            .build();
        
        when(queueRepository.findByIdForUpdate(serviceId))
            .thenReturn(Optional.of(queue));
        
        when(tokenRepository.countActiveTokens(queue.getId()))
            .thenReturn(50L);
        
        // When & Then
        assertThatThrownBy(() -> tokenService.joinQueue(request))
            .isInstanceOf(QueueFullException.class)
            .hasMessageContaining("maximum capacity");
    }
    
    @Test
    void joinQueue_QueuePaused_ThrowsException() {
        // Given
        Queue queue = Queue.builder()
            .status(QueueStatus.PAUSED)
            .build();
        
        when(queueRepository.findByIdForUpdate(any()))
            .thenReturn(Optional.of(queue));
        
        // When & Then
        assertThatThrownBy(() -> tokenService.joinQueue(request))
            .isInstanceOf(QueuePausedException.class);
    }
}
```

### Entity Tests

**TokenTest.java**
```java
class TokenTest {
    
    @Test
    void transitionTo_ValidTransition_Success() {
        // Given
        Token token = Token.builder()
            .state(TokenState.WAITING)
            .build();
        
        // When
        token.transitionTo(TokenState.CALLED);
        
        // Then
        assertThat(token.getState()).isEqualTo(TokenState.CALLED);
    }
    
    @Test
    void transitionTo_InvalidTransition_ThrowsException() {
        // Given
        Token token = Token.builder()
            .state(TokenState.COMPLETED)
            .build();
        
        // When & Then
        assertThatThrownBy(() -> token.transitionTo(TokenState.WAITING))
            .isInstanceOf(InvalidTokenStateException.class)
            .hasMessageContaining("Cannot transition from COMPLETED to WAITING");
    }
    
    @Test
    void isActive_WaitingState_ReturnsTrue() {
        Token token = Token.builder().state(TokenState.WAITING).build();
        assertThat(token.isActive()).isTrue();
    }
    
    @Test
    void isActive_CompletedState_ReturnsFalse() {
        Token token = Token.builder().state(TokenState.COMPLETED).build();
        assertThat(token.isActive()).isFalse();
    }
}
```

### Repository Tests (Unit with H2 - Optional)

```java
@DataJpaTest
class TokenRepositoryTest {
    
    @Autowired
    private TokenRepository tokenRepository;
    
    @Test
    void findByIdempotencyKey_ExistingKey_ReturnsToken() {
        // Given
        Token token = Token.builder()
            .idempotencyKey("idem-123")
            .tokenNumber("A-042")
            .state(TokenState.WAITING)
            .build();
        tokenRepository.save(token);
        
        // When
        Optional<Token> result = tokenRepository.findByIdempotencyKey("idem-123");
        
        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getTokenNumber()).isEqualTo("A-042");
    }
}
```

---

## Integration Tests (25%)

**CRITICAL:** These MUST run against real PostgreSQL via Testcontainers.

### 1. Concurrent Token Issuance Test ⚠️ MANDATORY

**TokenConcurrencyTest.java**
```java
@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
class TokenConcurrencyTest extends PostgresIntegrationTest {
    
    @Autowired
    private TokenService tokenService;
    
    @Autowired
    private TokenRepository tokenRepository;
    
    @Autowired
    private QueueRepository queueRepository;
    
    @Test
    @Timeout(30)
    void testConcurrentTokenIssuance_NoDuplicates() throws Exception {
        // Setup: Create queue
        Queue queue = createQueue("A", 200);
        UUID serviceId = queue.getServiceId();
        
        // Execute: 100 concurrent token join requests
        int threadCount = 100;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);
        List<Future<Token>> futures = new ArrayList<>();
        
        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            futures.add(executor.submit(() -> {
                try {
                    latch.countDown();
                    latch.await(); // All threads start together
                    
                    TokenJoinRequest request = TokenJoinRequest.builder()
                        .serviceId(serviceId)
                        .customerName("Customer " + index)
                        .idempotencyKey("idem-" + index)
                        .build();
                    
                    return tokenService.joinQueue(request);
                    
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }));
        }
        
        // Collect results
        Set<String> tokenNumbers = new HashSet<>();
        for (Future<Token> future : futures) {
            Token token = future.get();
            tokenNumbers.add(token.getTokenNumber());
        }
        
        executor.shutdown();
        
        // Assert: All token numbers are unique
        assertThat(tokenNumbers).hasSize(threadCount);
        
        // Assert: Token numbers are sequential (A-001 through A-100)
        List<String> sortedNumbers = new ArrayList<>(tokenNumbers);
        Collections.sort(sortedNumbers);
        
        for (int i = 0; i < threadCount; i++) {
            String expected = String.format("A-%03d", i + 1);
            assertThat(sortedNumbers.get(i)).isEqualTo(expected);
        }
        
        // Assert: Database has exactly 100 tokens
        long count = tokenRepository.count();
        assertThat(count).isEqualTo(threadCount);
    }
}
```

**Success Criteria:** ✅ Zero duplicate token numbers across 100 concurrent requests.

---

### 2. Concurrent CALL NEXT Test ⚠️ MANDATORY

**CallNextConcurrencyTest.java**
```java
@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
class CallNextConcurrencyTest extends PostgresIntegrationTest {
    
    @Autowired
    private StaffOperationsService staffService;
    
    @Autowired
    private TokenRepository tokenRepository;
    
    @Autowired
    private CounterRepository counterRepository;
    
    @Test
    @Timeout(30)
    void testConcurrentCallNext_NoDuplicateAssignments() throws Exception {
        // Setup: Create 20 waiting tokens
        Queue queue = setupQueueWithWaitingTokens(20);
        
        // Setup: Create 10 counters
        List<Counter> counters = createCounters(10, queue.getLocationId());
        
        // Execute: 10 staff operators call next simultaneously
        int staffCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(staffCount);
        CountDownLatch latch = new CountDownLatch(staffCount);
        List<Future<Token>> futures = new ArrayList<>();
        
        for (int i = 0; i < staffCount; i++) {
            final Counter counter = counters.get(i);
            futures.add(executor.submit(() -> {
                try {
                    latch.countDown();
                    latch.await(); // All threads start together
                    
                    return staffService.callNext(counter.getId());
                    
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }));
        }
        
        // Collect results
        Set<UUID> calledTokenIds = new HashSet<>();
        for (Future<Token> future : futures) {
            Token token = future.get();
            calledTokenIds.add(token.getId());
        }
        
        executor.shutdown();
        
        // Assert: Exactly 10 unique tokens called
        assertThat(calledTokenIds).hasSize(staffCount);
        
        // Assert: Each counter has exactly one token
        for (Counter counter : counters) {
            Counter refreshed = counterRepository.findById(counter.getId()).get();
            assertThat(refreshed.getCurrentServingTokenId()).isNotNull();
        }
        
        // Assert: All called tokens are in CALLED state
        List<Token> calledTokens = tokenRepository.findAllById(calledTokenIds);
        assertThat(calledTokens)
            .extracting(Token::getState)
            .containsOnly(TokenState.CALLED);
        
        // Assert: No duplicate assignments
        Set<UUID> assignedTokenIds = calledTokens.stream()
            .map(Token::getId)
            .collect(Collectors.toSet());
        assertThat(assignedTokenIds).hasSize(staffCount);
    }
}
```

**Success Criteria:** ✅ Zero duplicate token assignments across 10 concurrent CALL NEXT operations.

---

### 3. Idempotency Test

**IdempotencyTest.java**
```java
@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
class IdempotencyTest extends PostgresIntegrationTest {
    
    @Autowired
    private TokenService tokenService;
    
    @Test
    void joinQueue_DuplicateIdempotencyKey_ReturnsSameToken() {
        // Setup
        Queue queue = createQueue("A", 50);
        TokenJoinRequest request = TokenJoinRequest.builder()
            .serviceId(queue.getServiceId())
            .customerName("John Doe")
            .idempotencyKey("idem-unique-123")
            .build();
        
        // First request
        Token token1 = tokenService.joinQueue(request);
        
        // Second request (same idempotency key)
        Token token2 = tokenService.joinQueue(request);
        
        // Assert: Same token returned
        assertThat(token1.getId()).isEqualTo(token2.getId());
        assertThat(token1.getTokenNumber()).isEqualTo(token2.getTokenNumber());
        
        // Assert: Only one token in database
        long count = tokenRepository.countByIdempotencyKey("idem-unique-123");
        assertThat(count).isEqualTo(1);
    }
    
    @Test
    void joinQueue_ConcurrentDuplicateIdempotencyKey_OnlyOneTokenCreated() throws Exception {
        // Setup
        Queue queue = createQueue("A", 50);
        String sharedKey = "idem-concurrent-123";
        
        // Execute: 5 concurrent requests with same idempotency key
        ExecutorService executor = Executors.newFixedThreadPool(5);
        CountDownLatch latch = new CountDownLatch(5);
        List<Future<Token>> futures = new ArrayList<>();
        
        for (int i = 0; i < 5; i++) {
            futures.add(executor.submit(() -> {
                latch.countDown();
                latch.await();
                
                TokenJoinRequest request = TokenJoinRequest.builder()
                    .serviceId(queue.getServiceId())
                    .customerName("Customer")
                    .idempotencyKey(sharedKey)
                    .build();
                
                return tokenService.joinQueue(request);
            }));
        }
        
        // Collect results
        Set<UUID> tokenIds = futures.stream()
            .map(this::getFutureResult)
            .map(Token::getId)
            .collect(Collectors.toSet());
        
        executor.shutdown();
        
        // Assert: All requests returned same token ID
        assertThat(tokenIds).hasSize(1);
        
        // Assert: Only one token in database
        long count = tokenRepository.countByIdempotencyKey(sharedKey);
        assertThat(count).isEqualTo(1);
    }
}
```

---

### 4. Tenant Isolation Test

**TenantIsolationTest.java**
```java
@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
class TenantIsolationTest extends PostgresIntegrationTest {
    
    @Autowired
    private LocationService locationService;
    
    @Test
    void getLocation_DifferentOrganization_ThrowsUnauthorizedException() {
        // Setup: Create two organizations
        Organization orgA = createOrganization("Org A");
        Organization orgB = createOrganization("Org B");
        
        Location locationB = createLocation(orgB.getId(), "Location B");
        
        // Authenticate as Org A user
        authenticateAs(createUser(orgA.getId(), UserRole.ORG_ADMIN));
        
        // Attempt to access Org B location
        assertThatThrownBy(() -> locationService.getLocation(locationB.getId()))
            .isInstanceOf(UnauthorizedTenantAccessException.class)
            .hasMessageContaining("cannot access");
    }
    
    @Test
    void listLocations_OnlyReturnsOwnOrganizationLocations() {
        // Setup
        Organization orgA = createOrganization("Org A");
        Organization orgB = createOrganization("Org B");
        
        createLocation(orgA.getId(), "A-Location-1");
        createLocation(orgA.getId(), "A-Location-2");
        createLocation(orgB.getId(), "B-Location-1");
        
        // Authenticate as Org A user
        authenticateAs(createUser(orgA.getId(), UserRole.ORG_ADMIN));
        
        // Query locations
        List<LocationResponse> locations = locationService.listLocations(orgA.getId());
        
        // Assert: Only Org A locations returned
        assertThat(locations).hasSize(2);
        assertThat(locations)
            .extracting(LocationResponse::getName)
            .containsExactlyInAnyOrder("A-Location-1", "A-Location-2");
    }
}
```

---

### 5. Step Away Expiration Test

**StepAwayExpirationTest.java**
```java
@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
class StepAwayExpirationTest extends PostgresIntegrationTest {
    
    @Autowired
    private TokenService tokenService;
    
    @Autowired
    private StepAwayExpirationJob expirationJob;
    
    @Autowired
    private TokenRepository tokenRepository;
    
    @Test
    void stepAwayExpirationJob_ExpiresTokensAfter15Minutes() {
        // Setup: Create token and activate step away
        Token token = createToken();
        tokenService.activateStepAway(token.getId());
        
        // Simulate 16 minutes passing
        Token updated = tokenRepository.findById(token.getId()).get();
        updated.setStepAwayExpiresAt(Instant.now().minus(Duration.ofMinutes(1)));
        tokenRepository.save(updated);
        
        // Execute expiration job
        expirationJob.expireStepAwayTokens();
        
        // Assert: Token state changed to EXPIRED
        Token expired = tokenRepository.findById(token.getId()).get();
        assertThat(expired.getState()).isEqualTo(TokenState.EXPIRED);
        assertThat(expired.getCompletedAt()).isNotNull();
    }
}
```

---

## Controller Tests (REST API)

**TokenControllerTest.java**
```java
@WebMvcTest(TokenController.class)
@Import(SecurityConfig.class)
class TokenControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private TokenService tokenService;
    
    @MockBean
    private JwtTokenProvider jwtTokenProvider;
    
    @Test
    void joinQueue_ValidRequest_Returns201() throws Exception {
        // Given
        TokenJoinRequest request = TokenJoinRequest.builder()
            .serviceId(UUID.randomUUID())
            .customerName("John Doe")
            .idempotencyKey("idem-123")
            .build();
        
        Token token = Token.builder()
            .id(UUID.randomUUID())
            .tokenNumber("A-042")
            .state(TokenState.WAITING)
            .build();
        
        when(tokenService.joinQueue(any())).thenReturn(token);
        
        // When & Then
        mockMvc.perform(post("/api/v1/tokens/join")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.tokenNumber").value("A-042"))
            .andExpect(jsonPath("$.state").value("WAITING"));
    }
    
    @Test
    void joinQueue_QueueFull_Returns409() throws Exception {
        // Given
        when(tokenService.joinQueue(any()))
            .thenThrow(new QueueFullException(UUID.randomUUID(), "Queue A", 50, 50));
        
        // When & Then
        mockMvc.perform(post("/api/v1/tokens/join")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("QUEUE_FULL"))
            .andExpect(jsonPath("$.message").containsString("maximum capacity"));
    }
}
```

---

## Test Coverage Goals

| Layer | Minimum Coverage |
|-------|-----------------|
| **Service Layer** | 90% |
| **Repository Layer** | 80% |
| **Controller Layer** | 85% |
| **Entity Logic** | 95% |
| **Overall** | 80% |

**Measurement:** JaCoCo Maven Plugin

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.11</version>
    <executions>
        <execution>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
        <execution>
            <id>check</id>
            <goals>
                <goal>check</goal>
            </goals>
            <configuration>
                <rules>
                    <rule>
                        <element>PACKAGE</element>
                        <limits>
                            <limit>
                                <counter>LINE</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.80</minimum>
                            </limit>
                        </limits>
                    </rule>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

---

## Test Execution

### Local Development

```bash
# Run all tests
./mvnw test

# Run integration tests only
./mvnw test -Dtest=*IntegrationTest

# Run specific test
./mvnw test -Dtest=TokenConcurrencyTest

# Run with coverage
./mvnw clean test jacoco:report
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: align_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Run tests with coverage
        run: ./mvnw clean verify jacoco:report
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

---

## Test Data Builders

**TestDataFactory.java**
```java
public class TestDataFactory {
    
    public static Queue createQueue(String prefix, int capacity) {
        return Queue.builder()
            .id(UUID.randomUUID())
            .orgId(UUID.randomUUID())
            .locationId(UUID.randomUUID())
            .serviceId(UUID.randomUUID())
            .name("Test Queue")
            .tokenPrefix(prefix)
            .status(QueueStatus.ACTIVE)
            .maxCapacity(capacity)
            .nextTokenNumber(1L)
            .build();
    }
    
    public static Token createToken(UUID queueId, String tokenNumber) {
        return Token.builder()
            .id(UUID.randomUUID())
            .queueId(queueId)
            .tokenNumber(tokenNumber)
            .state(TokenState.WAITING)
            .joinedAt(Instant.now())
            .build();
    }
    
    public static Counter createCounter(UUID locationId, int number) {
        return Counter.builder()
            .id(UUID.randomUUID())
            .locationId(locationId)
            .number(number)
            .name("Counter " + number)
            .availability(CounterAvailability.ONLINE)
            .status(CounterStatus.ACTIVE)
            .build();
    }
}
```

---

## MANDATORY Test Checklist

Before claiming Phase X complete:

### Phase 3 (Token Engine)
- [ ] Unit: Token state transitions
- [ ] Unit: Active token definition
- [ ] Unit: Idempotency key handling
- [ ] Integration: Concurrent token issuance (100 threads) ⚠️
- [ ] Integration: Idempotency conflict resolution
- [ ] Integration: Queue capacity enforcement
- [ ] Integration: Step away expiration

### Phase 4 (Staff Operations)
- [ ] Unit: Counter availability validation
- [ ] Unit: CALL NEXT prerequisites
- [ ] Integration: Concurrent CALL NEXT (10 threads) ⚠️
- [ ] Integration: Recall operation
- [ ] Integration: Complete service
- [ ] Integration: Skip/no-show

### Phase 5 (Realtime)
- [ ] Integration: WebSocket connection
- [ ] Integration: STOMP subscription
- [ ] Integration: Event published after commit
- [ ] Integration: Public topic (no PII leakage)

### Phase 1 (Security) ✅ COMPLETE
- [x] Integration: Login flow (valid credentials → 200 + tokens)
- [x] Integration: Login failure (invalid credentials → 401 INVALID_CREDENTIALS)
- [x] Integration: Non-existent email → same 401 (no account enumeration)
- [x] Integration: Password hashing (BCrypt hash stored, never plaintext)
- [x] Integration: JWT tampered/forged → 401
- [x] Integration: JWT expired → 401
- [x] Integration: JWT missing/malformed header → 401
- [x] Integration: Refresh token (valid → new access token, rotation)
- [x] Integration: Refresh token revocation (reuse → 401 TOKEN_INVALID)
- [x] Integration: Logout revokes all tokens (subsequent refresh → 401)
- [x] Integration: Role authorization (STAFF role correctly embedded in JWT)
- [x] Integration: Unauthenticated actuator → 401
- [x] Integration: Tenant isolation (orgId in JWT matches DB, cross-tenant blocked)
- [x] Integration: TenantContext.requireSameTenant blocks cross-tenant access
- [x] Integration: Client-supplied orgId/userId in query params ignored
- [x] Integration: JWT payload tampering → 401 (signature invalid)
- [x] Integration: INACTIVE account → 401 ACCOUNT_DISABLED
- [x] Integration: Token issued before deactivation → 401 after account disabled
- [x] Integration: Missing required login fields → 422 VALIDATION_ERROR
- [x] Integration: Invalid refresh token (garbage string) → 401 TOKEN_INVALID
- [x] Integration: PLATFORM_ADMIN has null orgId in JWT
- [x] Unit (via JwtService): Expired token rejected by isTokenValid()

**Phase 1 test result (2026-09-07): 26/26 PASS (SecurityIntegrationTest)**

---

**Document Status:** APPROVED  
**Last Updated:** 2026-09-01  
**Test Framework:** JUnit 5 + Mockito + Testcontainers  
**Next Review:** After Phase 3 (Token Engine) implementation
