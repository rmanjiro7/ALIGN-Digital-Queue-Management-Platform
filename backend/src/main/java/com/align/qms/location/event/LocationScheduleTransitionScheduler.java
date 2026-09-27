package com.align.qms.location.event;

import com.align.qms.location.Location;
import com.align.qms.location.LocationRepository;
import com.align.qms.location.LocationScheduleService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LocationScheduleTransitionScheduler {

    private final LocationRepository locationRepository;
    private final LocationScheduleService locationScheduleService;
    private final SimpMessagingTemplate messagingTemplate;

    private final Map<UUID, Boolean> previousStates = new ConcurrentHashMap<>();

    public LocationScheduleTransitionScheduler(LocationRepository locationRepository,
                                               LocationScheduleService locationScheduleService,
                                               SimpMessagingTemplate messagingTemplate) {
        this.locationRepository = locationRepository;
        this.locationScheduleService = locationScheduleService;
        this.messagingTemplate = messagingTemplate;
    }

    @Scheduled(fixedRate = 60000)
    public void evaluateAndBroadcast() {
        List<Location> locations = locationRepository.findAll();
        Instant now = Instant.now();

        for (Location loc : locations) {
            boolean isOpen = locationScheduleService.isLocationOpen(loc.getId(), now);
            Boolean previous = previousStates.put(loc.getId(), isOpen);

            if (previous != null && previous != isOpen) {
                messagingTemplate.convertAndSend(
                        "/topic/location/" + loc.getId() + ".status",
                        Map.of(
                                "locationId", loc.getId().toString(),
                                "isOpen", isOpen,
                                "timestamp", now.toString()
                        )
                );
            }
        }
    }
}
