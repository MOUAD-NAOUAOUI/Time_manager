package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.exception.TooManyRequestsException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
public class RateLimiterService {

    private static final Logger LOGGER = LoggerFactory.getLogger(RateLimiterService.class);
    private static final String DEFAULT_CLIENT_IP = "localhost";

    private final StringRedisTemplate redisTemplate;
    private final int maxAttempts;
    private final long windowSeconds;
    private final long lockoutSeconds;

    // In-memory fallback if Redis is unavailable or during tests
    private final ConcurrentHashMap<String, AttemptRecord> fallbackCache = new ConcurrentHashMap<>();

    public RateLimiterService(
            @Autowired(required = false) StringRedisTemplate redisTemplate,
            @Value("${rate.limit.max-attempts:5}") int maxAttempts,
            @Value("${rate.limit.window-seconds:60}") long windowSeconds,
            @Value("${rate.limit.lockout-seconds:900}") long lockoutSeconds) {
        this.redisTemplate = redisTemplate;
        this.maxAttempts = maxAttempts;
        this.windowSeconds = windowSeconds;
        this.lockoutSeconds = lockoutSeconds;
    }

    public void checkLimit(String key) {
        long remainingLockout = getRemainingLockout(key);
        if (remainingLockout > 0) {
            throw new TooManyRequestsException(
                    "Too many failed attempts. Account temporarily locked. Please try again in " + remainingLockout + " seconds.",
                    remainingLockout
            );
        }
    }

    public void recordFailure(String key) {
        try {
            if (redisTemplate != null) {
                Long attempts = redisTemplate.opsForValue().increment(key);
                if (attempts != null && attempts == 1) {
                    redisTemplate.expire(key, windowSeconds, TimeUnit.SECONDS);
                } else if (attempts != null && attempts >= maxAttempts) {
                    redisTemplate.expire(key, lockoutSeconds, TimeUnit.SECONDS);
                }
                return;
            }
        } catch (Exception e) {
            if (LOGGER.isDebugEnabled()) {
                LOGGER.debug("Redis operation failed for recordFailure, falling back to in-memory: {}", e.getMessage());
            }
        }

        // In-memory fallback
        long now = System.currentTimeMillis();
        fallbackCache.compute(key, (k, record) -> {
            if (record == null || now > record.expiryTime) {
                return new AttemptRecord(1, now + (windowSeconds * 1000));
            }
            record.count++;
            if (record.count >= maxAttempts) {
                record.expiryTime = now + (lockoutSeconds * 1000);
            }
            return record;
        });
    }

    public void resetLimit(String key) {
        try {
            if (redisTemplate != null) {
                redisTemplate.delete(key);
            }
        } catch (Exception e) {
            if (LOGGER.isDebugEnabled()) {
                LOGGER.debug("Redis operation failed for resetLimit: {}", e.getMessage());
            }
        }
        fallbackCache.remove(key);
    }

    public long getRemainingLockout(String key) {
        try {
            if (redisTemplate != null) {
                String val = redisTemplate.opsForValue().get(key);
                if (val != null) {
                    int count = Integer.parseInt(val);
                    if (count >= maxAttempts) {
                        Long expire = redisTemplate.getExpire(key, TimeUnit.SECONDS);
                        return (expire != null && expire > 0) ? expire : 0;
                    }
                }
                return 0;
            }
        } catch (Exception e) {
            if (LOGGER.isDebugEnabled()) {
                LOGGER.debug("Redis operation failed for getRemainingLockout, falling back to in-memory: {}", e.getMessage());
            }
        }

        AttemptRecord record = fallbackCache.get(key);
        if (record != null) {
            long now = System.currentTimeMillis();
            if (now < record.expiryTime && record.count >= maxAttempts) {
                return (record.expiryTime - now) / 1000;
            }
        }
        return 0;
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

    private static class AttemptRecord {
        int count;
        long expiryTime;

        AttemptRecord(int count, long expiryTime) {
            this.count = count;
            this.expiryTime = expiryTime;
        }
    }
}
