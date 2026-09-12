package com.align.qms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * ALIGN Digital Queue Management Platform — Backend Entry Point.
 *
 * <p>Phase 0: Foundation — Spring Boot application startup, PostgreSQL
 * connection, Flyway migrations, health endpoint, structured logging,
 * and centralized exception handling.
 *
 * <p>@EnableScheduling is included here because Step Away expiration
 * (Phase 3) requires a background job. Enabling it at startup avoids
 * a structural change later; it has zero cost when no @Scheduled
 * methods exist.
 */
@SpringBootApplication
@EnableScheduling
public class AlignApplication {

    public static void main(String[] args) {
        SpringApplication.run(AlignApplication.class, args);
    }
}
