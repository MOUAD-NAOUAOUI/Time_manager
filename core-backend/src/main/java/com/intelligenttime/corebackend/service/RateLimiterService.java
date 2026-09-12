package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.exception.TooManyRequestsException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.concurrent.TimeUnit;

/**
 * Redis-backed rate limiter for brute-force protection.
 *
 * Fail-secure design: if Redis is unavailable, all operations throw
 * ServiceUnavailableException rather than silently bypassing limits.
 * This prevents attackers from triggering Redis failures to circumvent
 * rate limiting.
 */
@Service
public class RateLimiterService {

    private static final Logger LOGGER = LoggerFactory.getLogger(RateLimiterService.class);
    private static final String DEFAULT_CLIENT_IP = "localhost";

    private final StringRedisTemplate redisTemplate;
    private final int maxAttempts;
    private final long windowSeconds;
    private final long lockoutSeconds;

    public RateLimiterService(
            @org.springframework.beans.factory.annotation.Autowired(required = false) StringRedisTemplate redisTemplate,
            @Value("${rate.limit.max-attempts:5}") int maxAttempts,
            @Value("${rate.limit.window-seconds:60}") long windowSeconds,
            @Value("${rate.limit.lockout-seconds:900}") long lockoutSeconds) {
        this.redisTemplate = Objects.requireNonNull(redisTemplate,
                "Redis is required for rate limiting. Ensure Redis is configured and reachable.");
        this.maxAttempts = maxAttempts;
        this.windowSeconds = windowSeconds;
        this.lockoutSeconds = lockoutSeconds;
        LOGGER.info("RateLimiterService initialized: maxAttempts={}, window={}s, lockout={}s",
                maxAttempts, windowSeconds, lockoutSeconds);
    }

    /**
     * Throws {@link TooManyRequestsException} if the key is currently locked out.
     * Throws {@link IllegalStateException} if Redis is unreachable (fail-secure).
     */
    public void checkLimit(String key) {
        long remainingLockout = getRemainingLockout(key);
        if (remainingLockout > 0) {
            throw new TooManyRequestsException(
                    "Too many failed attempts. Please try again in " + remainingLockout + " seconds.",
                    remainingLockout);
        }
    }

    /**
     * Records a failed attempt for the given key.
     * Throws {@link IllegalStateException} if Redis is unreachable (fail-secure).
     */
    public void recordFailure(String key) {
        String safeKey = Objects.requireNonNull(key, "key");
        try {
            Long attempts = redisTemplate.opsForValue().increment(safeKey);
            if (attempts != null && attempts == 1) {
                redisTemplate.expire(safeKey, windowSeconds, TimeUnit.SECONDS);
            } else if (attempts != null && attempts >= maxAttempts) {
                redisTemplate.expire(safeKey, lockoutSeconds, TimeUnit.SECONDS);
            }
        } catch (Exception e) {
            LOGGER.error("Redis unavailable during recordFailure for key prefix '{}': {}",
                    sanitizeKeyForLog(safeKey), e.getMessage());
            throw new IllegalStateException(
                    "Rate limiting service unavailable. Request denied to preserve security.", e);
        }
    }

    /**
     * Clears the failure count for the given key on successful authentication.
     * Throws {@link IllegalStateException} if Redis is unreachable (fail-secure).
     */
    public void resetLimit(String key) {
        String safeKey = Objects.requireNonNull(key, "key");
        try {
            redisTemplate.delete(safeKey);
        } catch (Exception e) {
            LOGGER.error("Redis unavailable during resetLimit for key prefix '{}': {}",
                    sanitizeKeyForLog(safeKey), e.getMessage());
            throw new IllegalStateException(
                    "Rate limiting service unavailable. Request denied to preserve security.", e);
        }
    }

    /**
     * Returns the number of seconds remaining in the lockout period, or 0 if
     * the key is not locked out.
     * Throws {@link IllegalStateException} if Redis is unreachable (fail-secure).
     */
    public long getRemainingLockout(String key) {
        String safeKey = Objects.requireNonNull(key, "key");
        try {
            String val = redisTemplate.opsForValue().get(safeKey);
            if (val != null) {
                int count = Integer.parseInt(val);
                if (count >= maxAttempts) {
                    Long expire = redisTemplate.getExpire(safeKey, TimeUnit.SECONDS);
                    return (expire != null && expire > 0) ? expire : 0;
                }
            }
            return 0;
        } catch (Exception e) {
            LOGGER.error("Redis unavailable during getRemainingLockout for key prefix '{}': {}",
                    sanitizeKeyForLog(safeKey), e.getMessage());
            throw new IllegalStateException(
                    "Rate limiting service unavailable. Request denied to preserve security.", e);
        }
    }

    public String extractClientIp(HttpServletRequest request) {
        if (request == null) {
            return DEFAULT_CLIENT_IP;
        }
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp.trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : DEFAULT_CLIENT_IP;
    }

    /**
     * Strips the actual IP/email from the key before logging to avoid PII in logs.
     */
    private static String sanitizeKeyForLog(String key) {
        // Keys are in the form "login:attempt:{ip}:{email}" — log only the prefix
        int idx = key.indexOf(':');
        return idx > 0 ? key.substring(0, idx) + ":..." : "...";
    }
}
