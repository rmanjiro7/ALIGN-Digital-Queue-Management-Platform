package com.align.qms.token;

import com.align.qms.token.dto.TokenResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Tag(name = "Staff Operations", description = "Operations for queue staff")
@RestController
@RequestMapping("/api/v1/staff")
@PreAuthorize("hasRole('STAFF') or hasRole('ORG_ADMIN')")
public class StaffOperationsController {

    private final StaffOperationsService staffOperationsService;

    public StaffOperationsController(StaffOperationsService staffOperationsService) {
        this.staffOperationsService = staffOperationsService;
    }

    @Operation(summary = "Call next token in queue")
    @SecurityRequirement(name = "Bearer Authentication")
    @PostMapping("/counters/{counterId}/call-next")
    public ResponseEntity<TokenResponse> callNext(@PathVariable UUID counterId) {
        Token token = staffOperationsService.callNext(counterId);
        return ResponseEntity.ok(TokenResponse.from(token));
    }

    @Operation(summary = "Recall a specific token")
    @SecurityRequirement(name = "Bearer Authentication")
    @PostMapping("/tokens/{tokenId}/recall")
    public ResponseEntity<TokenResponse> recall(@PathVariable UUID tokenId, @org.springframework.web.bind.annotation.RequestParam("counterId") UUID counterId) {
        return ResponseEntity.ok(TokenResponse.from(staffOperationsService.recall(tokenId, counterId)));
    }

    @Operation(summary = "Start service for a token")
    @SecurityRequirement(name = "Bearer Authentication")
    @PostMapping("/tokens/{tokenId}/start-service")
    public ResponseEntity<TokenResponse> startService(@PathVariable UUID tokenId, @org.springframework.web.bind.annotation.RequestParam("counterId") UUID counterId) {
        return ResponseEntity.ok(TokenResponse.from(staffOperationsService.startService(tokenId, counterId)));
    }

    @Operation(summary = "Complete service for a token")
    @SecurityRequirement(name = "Bearer Authentication")
    @PostMapping("/tokens/{tokenId}/complete")
    public ResponseEntity<TokenResponse> complete(@PathVariable UUID tokenId, @org.springframework.web.bind.annotation.RequestParam("counterId") UUID counterId) {
        return ResponseEntity.ok(TokenResponse.from(staffOperationsService.completeService(tokenId, counterId)));
    }

    @Operation(summary = "Mark a token as no-show")
    @SecurityRequirement(name = "Bearer Authentication")
    @PostMapping("/tokens/{tokenId}/no-show")
    public ResponseEntity<TokenResponse> noShow(@PathVariable UUID tokenId, @org.springframework.web.bind.annotation.RequestParam("counterId") UUID counterId) {
        return ResponseEntity.ok(TokenResponse.from(staffOperationsService.noShow(tokenId, counterId)));
    }

    @Operation(summary = "Get waiting tokens in a queue")
    @SecurityRequirement(name = "Bearer Authentication")
    @GetMapping("/queues/{queueId}/waiting")
    public ResponseEntity<List<TokenResponse>> getWaitingTokens(@PathVariable UUID queueId) {
        List<Token> tokens = staffOperationsService.getWaitingTokens(queueId);
        List<TokenResponse> response = tokens.stream()
                .map(TokenResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }
}
