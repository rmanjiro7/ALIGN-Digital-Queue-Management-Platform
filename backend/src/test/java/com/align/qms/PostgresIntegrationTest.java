package com.align.qms;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base class for all ALIGN integration tests that require a real PostgreSQL
 * database (ADR-006).
 *
 * <p>A single PostgreSQL container is started once for the entire Maven test
 * run via a static initializer block and shared across all extending test
 * classes. The Testcontainers JVM shutdown hook stops and removes the
 * container when the JVM exits.
 *
 * <p>Design rationale — why NOT @Testcontainers + @Container:
 * The JUnit 5 @Testcontainers extension manages containers per test class:
 * it starts the container before the class and stops it after. When the
 * same static container field is inherited by multiple test classes, the
 * extension stops the container after the first class finishes. The second
 * class then finds the container dead and fails with "Connection refused".
 * withReuse(true) only prevents this if testcontainers.reuse.enable=true is
 * set in ~/.testcontainers.properties — an external configuration dependency
 * that is fragile in CI and developer environments.
 *
 * <p>The static initializer pattern used here is deterministic and
 * self-contained: the container starts exactly once when this class is loaded,
 * lives for the entire JVM process, and is cleaned up by the Testcontainers
 * shutdown hook. No external configuration file is required.
 *
 * <p>DO NOT substitute H2 for tests that exercise PostgreSQL-specific behavior:
 * <ul>
 *   <li>SELECT FOR UPDATE SKIP LOCKED (CALL NEXT concurrency — Phase 4)</li>
 *   <li>UNIQUE constraint violations (idempotency — Phase 3)</li>
 *   <li>Atomic counter increment (token issuance — Phase 3)</li>
 *   <li>Transaction isolation behavior</li>
 * </ul>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public abstract class PostgresIntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES;

    static {
        POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("align_test")
            .withUsername("align_test")
            .withPassword("align_test");
        // Start once for the entire JVM test run.
        // Testcontainers registers a JVM shutdown hook to stop the container.
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void configureDataSourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",      POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
