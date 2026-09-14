package com.align.qms.user;

import com.align.qms.audit.AdminAuditService;
import com.align.qms.exception.ResourceNotFoundException;
import com.align.qms.security.TenantContext;
import com.align.qms.user.dto.CreateUserRequest;
import com.align.qms.user.dto.UpdateUserRequest;
import com.align.qms.user.dto.UpdateUserStatusRequest;
import com.align.qms.user.dto.UserResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminAuditService adminAuditService;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, AdminAuditService adminAuditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminAuditService = adminAuditService;
    }

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        UUID orgId;
        if (TenantContext.isPlatformAdmin()) {
            orgId = request.getOrgId(); // PLATFORM_ADMIN can specify target org
        } else {
            orgId = TenantContext.getCurrentOrgId();
            // ORG_ADMIN cannot create another ORG_ADMIN or PLATFORM_ADMIN
            if (request.getRole() == UserRole.ORG_ADMIN || request.getRole() == UserRole.PLATFORM_ADMIN) {
                throw new AccessDeniedException("Insufficient privileges to create role: " + request.getRole());
            }
        }

        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = new User(
            orgId,
            request.getEmail(),
            passwordEncoder.encode(request.getPassword()),
            request.getName(),
            request.getRole(),
            request.getLocationId()
        );

        User saved = userRepository.save(user);

        UserResponse response = UserResponse.from(saved);
        adminAuditService.logEvent(saved.getId(), "USER", "CREATE", null, response);
        return response;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> listUsers(UserRole role, UserStatus status, UUID locationId) {
        if (TenantContext.isPlatformAdmin()) {
            return userRepository.findAll().stream()
                .filter(u -> role == null || u.getRole() == role)
                .filter(u -> status == null || u.getStatus() == status)
                .filter(u -> locationId == null || locationId.equals(u.getLocationId()))
                .map(UserResponse::from)
                .collect(Collectors.toList());
        }

        UUID orgId = TenantContext.getCurrentOrgId();
        return userRepository.findByOrgId(orgId).stream()
            .filter(u -> role == null || u.getRole() == role)
            .filter(u -> status == null || u.getStatus() == status)
            .filter(u -> locationId == null || locationId.equals(u.getLocationId()))
            .map(UserResponse::from)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserResponse getUser(UUID id) {
        User user = getUserEntity(id);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateUser(UUID id, UpdateUserRequest request) {
        User user = getUserEntity(id);
        UserResponse beforeState = UserResponse.from(user);

        user.setName(request.getName());
        user.setLocationId(request.getLocationId());

        User saved = userRepository.save(user);
        UserResponse afterState = UserResponse.from(saved);

        adminAuditService.logEvent(saved.getId(), "USER", "UPDATE", beforeState, afterState);
        return afterState;
    }

    @Transactional
    public UserResponse updateStatus(UUID id, UpdateUserStatusRequest request) {
        User user = getUserEntity(id);
        UserResponse beforeState = UserResponse.from(user);

        user.setStatus(request.getStatus());

        User saved = userRepository.save(user);
        UserResponse afterState = UserResponse.from(saved);

        adminAuditService.logEvent(saved.getId(), "USER", "UPDATE_STATUS", beforeState, afterState);
        return afterState;
    }

    private User getUserEntity(UUID id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        TenantContext.requireSameTenant(user.getOrgId());
        return user;
    }
}
