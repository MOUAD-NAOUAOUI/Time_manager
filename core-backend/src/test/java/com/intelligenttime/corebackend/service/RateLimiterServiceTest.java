package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.exception.TooManyRequestsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class RateLimiterServiceTest {

    private RateLimiterService rateLimiterService;

    @BeforeEach
    void setUp() {
        // max 3 attempts, 10s window, 60s lockout, null Redis (tests in-memory fallback)
        rateLimiterService = new RateLimiterService(null, 3, 10, 60);
    }

    @Test
    void checkLimit_InitialState_DoesNotThrow() {
        assertDoesNotThrow(() -> rateLimiterService.checkLimit("test:key:1"));
    }

    @Test
    void recordFailure_ExceedsMaxAttempts_ThrowsTooManyRequestsException() {
        String key = "test:key:lockout";

        rateLimiterService.recordFailure(key);
        assertDoesNotThrow(() -> rateLimiterService.checkLimit(key));

        rateLimiterService.recordFailure(key);
        assertDoesNotThrow(() -> rateLimiterService.checkLimit(key));

        rateLimiterService.recordFailure(key); // 3rd failure reaches max

        TooManyRequestsException ex = assertThrows(
                TooManyRequestsException.class,
                () -> rateLimiterService.checkLimit(key)
        );

        assertTrue(ex.getRetryAfterSeconds() > 0);
        assertTrue(ex.getMessage().contains("Too many failed attempts"));
    }

    @Test
    void resetLimit_ClearsFailures_AllowsRequestsAgain() {
        String key = "test:key:reset";

        rateLimiterService.recordFailure(key);
        rateLimiterService.recordFailure(key);
        rateLimiterService.recordFailure(key);

        assertThrows(TooManyRequestsException.class, () -> rateLimiterService.checkLimit(key));

        rateLimiterService.resetLimit(key);

        assertDoesNotThrow(() -> rateLimiterService.checkLimit(key));
    }
}
