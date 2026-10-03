package com.align.qms.token;

import com.align.qms.token.dto.TokenJoinRequest;
import com.align.qms.token.dto.TokenPositionResponse;
import com.align.qms.token.dto.TokenResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.UUID;

@Tag(name = "Queue Tokens", description = "Customer queue interactions and token state management")
@RestController
@RequestMapping("/api/v1/tokens")
public class TokenController {

    private final TokenService tokenService;
    private final StaffOperationsService staffOperationsService;

    public TokenController(TokenService tokenService, StaffOperationsService staffOperationsService) {
        this.tokenService = tokenService;
        this.staffOperationsService = staffOperationsService;
    }

    @Operation(summary = "Join a queue", description = "Create a new token in a specified queue")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TokenResponse joinQueue(@Valid @RequestBody TokenJoinRequest request) {
        return tokenService.joinQueue(request);
    }

    @Operation(summary = "Get token details")
    @GetMapping("/{id}")
    public TokenResponse getToken(@PathVariable("id") UUID id) {
        return tokenService.getToken(id);
    }

    @Operation(summary = "Get token position and ETA")
    @GetMapping("/{id}/position")
    public TokenPositionResponse getTokenPosition(@PathVariable("id") UUID id) {
        return tokenService.getTokenPosition(id);
    }

    @Operation(summary = "Cancel token", description = "Customer abandons their token")
    @PostMapping("/{id}/cancel")
    public TokenResponse cancelToken(@PathVariable("id") UUID id) {
        return tokenService.cancelToken(id);
    }

    @Operation(summary = "Step away", description = "Customer steps away, pausing their token progression")
    @PostMapping("/{id}/step-away")
    public TokenResponse stepAway(@PathVariable("id") UUID id) {
        return tokenService.stepAway(id);
    }

    @Operation(summary = "Return to queue", description = "Customer returns from step away, resuming token progression")
    @PostMapping("/{id}/return")
    public TokenResponse returnFromStepAway(@PathVariable("id") UUID id) {
        return tokenService.returnFromStepAway(id);
    }

    @Operation(summary = "Transfer token", description = "Staff or admin transfers token to another queue")
    @SecurityRequirement(name = "Bearer Authentication")
    @PostMapping("/{id}/transfer")
    public TokenResponse transferToken(@PathVariable("id") UUID id, @Valid @RequestBody com.align.qms.token.dto.TokenTransferRequest request) {
        return staffOperationsService.transferToken(id, request);
    }

    @Operation(summary = "Get transfer recovery state")
    @SecurityRequirement(name = "Bearer Authentication")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('CUSTOMER_TOKEN') and principal.tokenId == #id")
    @GetMapping("/{id}/transfer-recovery")
    public TokenResponse getTransferRecovery(@PathVariable("id") UUID id) {
        return tokenService.transferRecovery(id);
    }
}
