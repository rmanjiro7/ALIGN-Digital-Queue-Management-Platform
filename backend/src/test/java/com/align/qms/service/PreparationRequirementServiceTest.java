package com.align.qms.service;

import com.align.qms.location.Location;
import com.align.qms.location.LocationRepository;
import com.align.qms.organization.Organization;
import com.align.qms.organization.OrganizationRepository;
import com.align.qms.user.User;
import com.align.qms.user.UserRepository;
import com.align.qms.user.UserRole;
import com.align.qms.security.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
public class PreparationRequirementServiceTest extends com.align.qms.PostgresIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private PreparationRequirementService service;
    @Autowired private PreparationRequirementRepository repository;
    @Autowired private OrganizationRepository orgRepo;
    @Autowired private LocationRepository locRepo;
    @Autowired private ServiceRepository svcRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private JwtService jwtService;

    private UUID orgId1;
    private UUID orgId2;
    private UUID svcId1;
    private String adminToken1;
    private String adminToken2;
    private String staffToken;

    @BeforeEach
    void setUp() {
        Organization org1 = new Organization("O1", "O1", "O1", "o1@a.com");
        orgId1 = orgRepo.saveAndFlush(org1).getId();
        Organization org2 = new Organization("O2", "O2", "O2", "o2@a.com");
        orgId2 = orgRepo.saveAndFlush(org2).getId();

        Location loc1 = new Location(orgId1, "L1", null, null, null, null, true);
        locRepo.saveAndFlush(loc1);
        ServiceEntity svc1 = new ServiceEntity(orgId1, loc1.getId(), "S1", null, null, false, null);
        svcId1 = svcRepo.saveAndFlush(svc1).getId();

        User admin1 = new User(orgId1, "admin1@a.com", "h", "A1", UserRole.ORG_ADMIN, loc1.getId());
        adminToken1 = jwtService.generateAccessToken(userRepo.saveAndFlush(admin1));

        User admin2 = new User(orgId2, "admin2@a.com", "h", "A2", UserRole.ORG_ADMIN, null);
        adminToken2 = jwtService.generateAccessToken(userRepo.saveAndFlush(admin2));

        User staff1 = new User(orgId1, "staff1@a.com", "h", "S1", UserRole.STAFF, loc1.getId());
        staffToken = jwtService.generateAccessToken(userRepo.saveAndFlush(staff1));
    }

    @Test
    void testTenantIsolationCrud() throws Exception {
        PreparationRequirement req = new PreparationRequirement();
        req.setOrgId(orgId1);
        req.setTitle("Bring ID");
        req.setDescription("Please bring your ID.");
        req.setIsRequired(true);

        // Attempt to create as Admin 1 for Service 1
        mockMvc.perform(post("/api/v1/services/" + svcId1 + "/preparation-requirements")
                .header("Authorization", "Bearer " + adminToken1)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        // Attempt to create as Admin 2 for Service 1 (cross-tenant)
        mockMvc.perform(post("/api/v1/services/" + svcId1 + "/preparation-requirements")
                .header("Authorization", "Bearer " + adminToken2)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }
}
