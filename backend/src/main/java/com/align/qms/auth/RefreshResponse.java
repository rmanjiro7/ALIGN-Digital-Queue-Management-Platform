package com.align.qms.auth;

/**
 * Response body for POST /api/v1/auth/refresh (frontend contract from API_CONTRACT.md).
 *
 * <pre>
 * { "accessToken": "eyJ...", "expiresIn": 900 }
 * </pre>
 */
public class RefreshResponse {

    private final String accessToken;
    private final long   expiresIn;    // seconds

    public RefreshResponse(String accessToken, long expiresIn) {
        this.accessToken = accessToken;
        this.expiresIn   = expiresIn;
    }

    /** No-arg constructor required by Jackson for deserialization in tests. */
    protected RefreshResponse() {
        this.accessToken = null; this.expiresIn = 0;
    }

    public String getAccessToken() { return accessToken; }
    public long   getExpiresIn()   { return expiresIn; }
}
