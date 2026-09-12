package com.align.qms.auth;

/**
 * Response body for POST /api/v1/auth/login (frontend contract from API_CONTRACT.md).
 *
 * <pre>
 * {
 *   "accessToken":  "eyJ...",
 *   "refreshToken": "abc...",
 *   "expiresIn":    900,
 *   "user": { "id": "...", "name": "...", "email": "...", "role": "STAFF",
 *             "orgId": "...", "locationId": "..." }
 * }
 * </pre>
 */
public class LoginResponse {

    private final String       accessToken;
    private final String       refreshToken;
    private final long         expiresIn;    // seconds
    private final UserResponse user;

    public LoginResponse(String accessToken, String refreshToken,
                         long expiresIn, UserResponse user) {
        this.accessToken  = accessToken;
        this.refreshToken = refreshToken;
        this.expiresIn    = expiresIn;
        this.user         = user;
    }

    /** No-arg constructor required by Jackson for deserialization in tests. */
    protected LoginResponse() {
        this.accessToken = null; this.refreshToken = null;
        this.expiresIn = 0; this.user = null;
    }

    public String       getAccessToken()  { return accessToken; }
    public String       getRefreshToken() { return refreshToken; }
    public long         getExpiresIn()    { return expiresIn; }
    public UserResponse getUser()         { return user; }
}
