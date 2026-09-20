package com.align.qms.location;

import com.align.qms.counter.Counter;
import com.align.qms.counter.CounterRepository;
import com.align.qms.exception.LocationNotFoundException;
import com.align.qms.location.dto.CounterSnapshotDto;
import com.align.qms.location.dto.LocationSnapshotResponse;
import com.align.qms.location.dto.ServiceSnapshotDto;
import com.align.qms.location.dto.TokenSnapshotDto;
import com.align.qms.queue.Queue;
import com.align.qms.queue.QueueRepository;
import com.align.qms.security.TenantContext;
import com.align.qms.security.UserPrincipal;
import com.align.qms.service.ServiceEntity;
import com.align.qms.service.ServiceRepository;
import com.align.qms.token.Token;
import com.align.qms.token.TokenRepository;
import com.align.qms.token.TokenState;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class LocationSnapshotService {

    private final LocationRepository locationRepository;
    private final CounterRepository counterRepository;
    private final QueueRepository queueRepository;
    private final ServiceRepository serviceRepository;
    private final TokenRepository tokenRepository;

    public LocationSnapshotService(LocationRepository locationRepository,
                                   CounterRepository counterRepository,
                                   QueueRepository queueRepository,
                                   ServiceRepository serviceRepository,
                                   TokenRepository tokenRepository) {
        this.locationRepository = locationRepository;
        this.counterRepository = counterRepository;
        this.queueRepository = queueRepository;
        this.serviceRepository = serviceRepository;
        this.tokenRepository = tokenRepository;
    }

    @Transactional(readOnly = true)
    public LocationSnapshotResponse getSnapshot(UUID locationId) {
        Location location = locationRepository.findById(locationId)
                .orElseThrow(() -> new LocationNotFoundException(locationId));

        // Basic tenant isolation checks via TenantContext
        TenantContext.requireSameTenant(location.getOrgId());

        // Extra resource-level check for DISPLAY and STAFF
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            boolean isDisplay = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_DISPLAY"));
            boolean isStaff = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_STAFF"));
            
            if ((isDisplay || isStaff) && !locationId.equals(principal.getLocationId())) {
                throw new AccessDeniedException("Access denied: You can only access your assigned location.");
            }
        }

        // 1. Fetch counters
        List<Counter> counters = counterRepository.findByLocationId(locationId);
        List<CounterSnapshotDto> counterDtos = counters.stream().map(this::mapCounter).toList();

        // 2. Fetch queues and services
        List<Queue> queues = queueRepository.findByLocationIdOrderByNameAsc(locationId);
        Set<UUID> serviceIds = queues.stream().map(Queue::getServiceId).collect(Collectors.toSet());
        List<ServiceEntity> services = serviceRepository.findAllById(serviceIds);
        List<ServiceSnapshotDto> serviceDtos = services.stream().map(this::mapService).toList();

        // 3. Fetch active and waiting tokens
        List<Token> tokens = tokenRepository.findByLocationIdAndStateIn(locationId, 
                Arrays.asList(TokenState.WAITING, TokenState.CALLED, TokenState.IN_SERVICE));

        List<TokenSnapshotDto> activeTokens = tokens.stream()
                .filter(t -> t.getState() == TokenState.CALLED || t.getState() == TokenState.IN_SERVICE)
                .map(this::mapToken)
                .toList();

        List<TokenSnapshotDto> waitingTokens = tokens.stream()
                .filter(t -> t.getState() == TokenState.WAITING)
                .map(this::mapToken)
                .toList();

        // 4. Assemble response
        LocationSnapshotResponse response = new LocationSnapshotResponse();
        response.setLocationId(location.getId());
        response.setLocationName(location.getName());
        response.setCounters(counterDtos);
        response.setActiveTokens(activeTokens);
        response.setWaitingTokens(waitingTokens);
        response.setServices(serviceDtos);

        return response;
    }

    private CounterSnapshotDto mapCounter(Counter counter) {
        CounterSnapshotDto dto = new CounterSnapshotDto();
        dto.setId(counter.getId());
        dto.setNumber(counter.getNumber());
        dto.setAvailability(counter.getAvailability());
        dto.setCurrentServingTokenId(counter.getCurrentServingTokenId());
        dto.setServiceStartTime(counter.getServiceStartTime());
        return dto;
    }

    private TokenSnapshotDto mapToken(Token token) {
        TokenSnapshotDto dto = new TokenSnapshotDto();
        dto.setId(token.getId());
        dto.setTokenNumber(token.getTokenNumber());
        dto.setState(token.getState());
        dto.setServiceId(token.getServiceId());
        dto.setCounterId(token.getCounterId());
        dto.setCalledAt(token.getCalledAt());
        return dto;
    }

    private ServiceSnapshotDto mapService(ServiceEntity service) {
        ServiceSnapshotDto dto = new ServiceSnapshotDto();
        dto.setId(service.getId());
        dto.setName(service.getName());
        return dto;
    }
}
