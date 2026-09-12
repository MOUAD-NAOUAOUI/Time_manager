package com.intelligenttime.corebackend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.Objects;
import java.util.concurrent.TimeUnit;

/**
 * JWT generation, validation, and revocation.
 *
 * Token revocation is implemented via a Redis blacklist. When a token is
 * revoked (e.g. on logout), its JTI (or token hash) is stored in Redis with a
 * TTL matching the token's remaining lifetime. {@link #validateToken} checks
 * the blacklist on every request, so revoked tokens are rejected immediately
 * rather than remaining valid until expiration.
 */
@Service
public class JwtService {

    private static final String BLACKLIST_PREFIX = "jwt:blacklist:";

    private final Key signingKey;
    private final long expirationTime;
    private final StringRedisTemplate redisTemplate;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration:86400000}") long expirationTime,
            @org.springframework.beans.factory.annotation.Autowired(required = false) StringRedisTemplate redisTemplate) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 characters");
        }
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationTime = expirationTime;
        this.redisTemplate = Objects.requireNonNull(redisTemplate,
                "Redis is required for JWT revocation support");
    }

    /** Generates a new signed JWT token containing the user's email as subject. */
    public String generateToken(String email) {
        return Jwts.builder()
                .setSubject(email)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expirationTime))
                .signWith(signingKey)
                .compact();
    }

    /** Extracts the user email (subject) from the JWT token. */
    public String extractEmail(String token) {
        return extractAllClaims(token).getSubject();
    }

    /**
     * Validates the token: checks signature, expiry, and that it has not been
     * revoked via the blacklist.
     */
    public boolean validateToken(String token, String email) {
        try {
            final String extractedEmail = extractEmail(token);
            return extractedEmail.equals(email)
                    && !isTokenExpired(token)
                    && !isTokenRevoked(token);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Adds the token to the Redis blacklist with a TTL equal to its remaining
     * valid lifetime. Subsequent calls to {@link #validateToken} will reject it.
     *
     * @param token the raw JWT string to revoke
     */
    public void revokeToken(String token) {
        try {
            Date expiration = extractAllClaims(token).getExpiration();
            long remainingMillis = expiration.getTime() - System.currentTimeMillis();
            if (remainingMillis > 0) {
                String key = BLACKLIST_PREFIX + token;
                redisTemplate.opsForValue().set(key, "revoked", remainingMillis, TimeUnit.MILLISECONDS);
            }
            // If token is already expired, no need to blacklist — it will be rejected by
            // the expiry check in validateToken anyway.
        } catch (Exception e) {
            // If we cannot parse the token, treat it as already invalid — nothing to
            // revoke.
        }
    }

    /** Returns true if the token is present in the Redis blacklist. */
    private boolean isTokenRevoked(String token) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + token));
    }

    /** Parses and validates the token signature, returning the claims body. */
    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    /** Checks if the token expiration date has passed. */
    private boolean isTokenExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new Date());
    }
}
