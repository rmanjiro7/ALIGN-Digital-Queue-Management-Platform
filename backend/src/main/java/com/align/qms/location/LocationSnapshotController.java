package com.align.qms.location;

import com.align.qms.location.dto.LocationSnapshotResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/locations")
public class LocationSnapshotController {

    private final LocationSnapshotService snapshotService;

    public LocationSnapshotController(LocationSnapshotService snapshotService) {
        this.snapshotService = snapshotService;
    }

    @GetMapping("/{locationId}/queue-snapshot")
    @PreAuthorize("hasAnyRole('DISPLAY', 'STAFF', 'ORG_ADMIN', 'PLATFORM_ADMIN')")
    public ResponseEntity<LocationSnapshotResponse> getSnapshot(@PathVariable UUID locationId) {
        return ResponseEntity.ok(snapshotService.getSnapshot(locationId));
    }
}
