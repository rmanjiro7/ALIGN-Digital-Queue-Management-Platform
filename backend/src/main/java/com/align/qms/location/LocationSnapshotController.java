package com.align.qms.location;

import com.align.qms.location.dto.LocationSnapshotResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.UUID;

@Tag(name = "Location Snapshots", description = "Real-time location queue snapshots")
@RestController
@RequestMapping("/api/v1/locations")
public class LocationSnapshotController {

    private final LocationSnapshotService snapshotService;

    public LocationSnapshotController(LocationSnapshotService snapshotService) {
        this.snapshotService = snapshotService;
    }

    @Operation(summary = "Get location queue snapshot")
    @SecurityRequirement(name = "Bearer Authentication")
    @GetMapping("/{locationId}/queue-snapshot")
    @PreAuthorize("hasAnyRole('DISPLAY', 'STAFF', 'ORG_ADMIN', 'PLATFORM_ADMIN')")
    public ResponseEntity<LocationSnapshotResponse> getSnapshot(@PathVariable UUID locationId) {
        return ResponseEntity.ok(snapshotService.getSnapshot(locationId));
    }
}
