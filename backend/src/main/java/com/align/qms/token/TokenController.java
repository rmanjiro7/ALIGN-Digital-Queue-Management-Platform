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

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tokens")
public class TokenController {

    private final TokenService tokenService;
    private final StaffOperationsService staffOperationsService;

    public TokenController(TokenService tokenService, StaffOperationsService staffOperationsService) {
        this.tokenService = tokenService;
        this.staffOperationsService = staffOperationsService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TokenResponse joinQueue(@Valid @RequestBody TokenJoinRequest request) {
        return tokenService.joinQueue(request);
    }

    @GetMapping("/{id}")
    public TokenResponse getToken(@PathVariable("id") UUID id) {
        return tokenService.getToken(id);
    }

    @GetMapping("/{id}/position")
    public TokenPositionResponse getTokenPosition(@PathVariable("id") UUID id) {
        return tokenService.getTokenPosition(id);
    }

    @PostMapping("/{id}/cancel")
    public TokenResponse cancelToken(@PathVariable("id") UUID id) {
        return tokenService.cancelToken(id);
    }

    @PostMapping("/{id}/step-away")
    public TokenResponse stepAway(@PathVariable("id") UUID id) {
        return tokenService.stepAway(id);
    }

    @PostMapping("/{id}/return")
    public TokenResponse returnFromStepAway(@PathVariable("id") UUID id) {
        return tokenService.returnFromStepAway(id);
    }

    @PostMapping("/{id}/transfer")
    public TokenResponse transferToken(@PathVariable("id") UUID id, @Valid @RequestBody com.align.qms.token.dto.TokenTransferRequest request) {
        return staffOperationsService.transferToken(id, request);
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasRole('CUSTOMER_TOKEN') and principal.tokenId == #id")
    @GetMapping("/{id}/transfer-recovery")
    public TokenResponse getTransferRecovery(@PathVariable("id") UUID id) {
        return tokenService.transferRecovery(id);
    }
}
