package com.align.qms.counter;

import com.align.qms.counter.dto.CounterAssignmentRequest;
import com.align.qms.counter.dto.CreateCounterRequest;
import com.align.qms.location.LocationService;
import com.align.qms.location.dto.CreateLocationRequest;
import com.align.qms.user.UserRole;
import com.align.qms.user.UserService;
import com.align.qms.user.dto.CreateUserRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import com.align.qms.PostgresIntegrationTest;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

public class StaffAssignmentConcurrencyTest extends PostgresIntegrationTest {

    @Autowired
    private CounterService counterService;

    @Autowired
    private CounterRepository counterRepository;

    @Autowired
    private com.align.qms.user.UserRepository userRepository;

    @Autowired
    private LocationService locationService;

    @Autowired
    private UserService userService;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private UUID orgId = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private UUID locationId;
    private UUID counterId1;
    private UUID counterId2;
    private UUID staffId1;
    private UUID staffId2;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("INSERT INTO organizations (id, code, name, status) VALUES (?, ?, ?, 'ACTIVE') ON CONFLICT DO NOTHING", orgId, "CONCUR-ORG", "Concur Org");
        
        com.align.qms.user.User adminUser = new com.align.qms.user.User(orgId, "admin@concur.test", "hash", "Admin", UserRole.ORG_ADMIN, null);
        org.springframework.test.util.ReflectionTestUtils.setField(adminUser, "id", UUID.randomUUID());
        com.align.qms.security.UserPrincipal principal = new com.align.qms.security.UserPrincipal(adminUser);

        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );

        CreateLocationRequest locReq = new CreateLocationRequest();
        locReq.setOrgId(orgId);
        locReq.setName("Test Location");
        locReq.setAddress("Address");
        locationId = locationService.create(locReq).getId();

        CreateCounterRequest c1 = new CreateCounterRequest();
        c1.setLocationId(locationId);
        c1.setNumber(1);
        c1.setName("C1");
        counterId1 = counterService.create(c1).getId();
        
        CreateCounterRequest c2 = new CreateCounterRequest();
        c2.setLocationId(locationId);
        c2.setNumber(2);
        c2.setName("C2");
        counterId2 = counterService.create(c2).getId();

        CreateUserRequest u1 = new CreateUserRequest();
        u1.setEmail(UUID.randomUUID() + "@t.c");
        u1.setName("Staff 1");
        u1.setRole(UserRole.STAFF);
        u1.setPassword("password123");
        u1.setLocationId(locationId);
        staffId1 = userService.createUser(u1).getId();
        
        CreateUserRequest u2 = new CreateUserRequest();
        u2.setEmail(UUID.randomUUID() + "@t.c");
        u2.setName("Staff 2");
        u2.setRole(UserRole.STAFF);
        u2.setPassword("password123");
        u2.setLocationId(locationId);
        staffId2 = userService.createUser(u2).getId();
    }

    @Test
    void testSameCounterDifferentStaffConcurrently() throws InterruptedException {
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);

        AtomicInteger successCount = new AtomicInteger(0);

        Runnable assignStaff1 = () -> {
            try {
                latch.await();
                com.align.qms.user.User adminUser = new com.align.qms.user.User(orgId, "admin@concur.test", "hash", "Admin", UserRole.ORG_ADMIN, null);
                org.springframework.test.util.ReflectionTestUtils.setField(adminUser, "id", UUID.randomUUID());
                com.align.qms.security.UserPrincipal principal = new com.align.qms.security.UserPrincipal(adminUser);
                SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
                );
                CounterAssignmentRequest r = new CounterAssignmentRequest();
                r.setStaffUserId(staffId1);
                counterService.assignStaff(counterId1, r);
                successCount.incrementAndGet();
            } catch (Exception e) {
                // Ignore failure
            } finally {
                done.countDown();
            }
        };

        Runnable assignStaff2 = () -> {
            try {
                latch.await();
                com.align.qms.user.User adminUser = new com.align.qms.user.User(orgId, "admin@concur.test", "hash", "Admin", UserRole.ORG_ADMIN, null);
                org.springframework.test.util.ReflectionTestUtils.setField(adminUser, "id", UUID.randomUUID());
                com.align.qms.security.UserPrincipal principal = new com.align.qms.security.UserPrincipal(adminUser);
                SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
                );
                CounterAssignmentRequest r = new CounterAssignmentRequest();
                r.setStaffUserId(staffId2);
                counterService.assignStaff(counterId1, r);
                successCount.incrementAndGet();
            } catch (Exception e) {
                // Ignore failure
            } finally {
                done.countDown();
            }
        };

        executor.submit(assignStaff1);
        executor.submit(assignStaff2);

        latch.countDown(); // start both at the same time
        done.await(5, TimeUnit.SECONDS);

        assertThat(successCount.get()).isEqualTo(2);

        // Verify the counter only has one staff member assigned
        Counter counter = counterRepository.findById(counterId1).get();
        assertThat(counter.getAssignedStaffId()).isNotNull();

        // Verify the other staff member is not assigned to the counter
        com.align.qms.user.User staff1 = userRepository.findById(staffId1).get();
        com.align.qms.user.User staff2 = userRepository.findById(staffId2).get();

        if (counter.getAssignedStaffId().equals(staffId1)) {
            assertThat(staff1.getAssignedCounterNumber()).isEqualTo(counter.getNumber());
            assertThat(staff2.getAssignedCounterNumber()).isNull();
        } else {
            assertThat(staff2.getAssignedCounterNumber()).isEqualTo(counter.getNumber());
            assertThat(staff1.getAssignedCounterNumber()).isNull();
        }
    }

    @Test
    void testSameStaffDifferentCountersConcurrently() throws InterruptedException {
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        Runnable assignCounter1 = () -> {
            try {
                latch.await();
                com.align.qms.user.User adminUser = new com.align.qms.user.User(orgId, "admin@concur.test", "hash", "Admin", UserRole.ORG_ADMIN, null);
                org.springframework.test.util.ReflectionTestUtils.setField(adminUser, "id", UUID.randomUUID());
                com.align.qms.security.UserPrincipal principal = new com.align.qms.security.UserPrincipal(adminUser);
                SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
                );
                CounterAssignmentRequest r = new CounterAssignmentRequest();
                r.setStaffUserId(staffId1);
                counterService.assignStaff(counterId1, r);
                successCount.incrementAndGet();
            } catch (Exception e) {
                failCount.incrementAndGet();
            } finally {
                done.countDown();
            }
        };

        Runnable assignCounter2 = () -> {
            try {
                latch.await();
                com.align.qms.user.User adminUser = new com.align.qms.user.User(orgId, "admin@concur.test", "hash", "Admin", UserRole.ORG_ADMIN, null);
                org.springframework.test.util.ReflectionTestUtils.setField(adminUser, "id", UUID.randomUUID());
                com.align.qms.security.UserPrincipal principal = new com.align.qms.security.UserPrincipal(adminUser);
                SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
                );
                CounterAssignmentRequest r = new CounterAssignmentRequest();
                r.setStaffUserId(staffId1);
                counterService.assignStaff(counterId2, r);
                successCount.incrementAndGet();
            } catch (Exception e) {
                failCount.incrementAndGet();
            } finally {
                done.countDown();
            }
        };

        executor.submit(assignCounter1);
        executor.submit(assignCounter2);

        latch.countDown(); // start both at the same time
        done.await(5, TimeUnit.SECONDS);

        assertThat(successCount.get()).isEqualTo(1);
        assertThat(failCount.get()).isEqualTo(1);

        com.align.qms.user.User staff = userRepository.findById(staffId1).get();
        Counter c1 = counterRepository.findById(counterId1).get();
        Counter c2 = counterRepository.findById(counterId2).get();

        assertThat(staff.getAssignedCounterNumber()).isNotNull();

        if (c1.getAssignedStaffId() != null) {
            assertThat(c1.getAssignedStaffId()).isEqualTo(staffId1);
            assertThat(c2.getAssignedStaffId()).isNull();
            assertThat(staff.getAssignedCounterNumber()).isEqualTo(c1.getNumber());
        } else {
            assertThat(c2.getAssignedStaffId()).isEqualTo(staffId1);
            assertThat(c1.getAssignedStaffId()).isNull();
            assertThat(staff.getAssignedCounterNumber()).isEqualTo(c2.getNumber());
        }
    }
}
