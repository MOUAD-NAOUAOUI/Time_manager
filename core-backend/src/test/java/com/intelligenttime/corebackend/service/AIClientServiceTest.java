package com.intelligenttime.corebackend.service;

import com.intelligenttime.corebackend.dto.DecomposeGoalResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class AIClientServiceTest {

    private AIClientService aiClientService;

    @BeforeEach
    void setUp() {
        aiClientService = new AIClientService("http://127.0.0.1:8000", null);
    }

    @Test
    void decomposeGoal_FallbackWhenOffline() {
        DecomposeGoalResponse response = aiClientService.decomposeGoal("test@example.com", "Build SaaS MVP", 4);

        assertNotNull(response);
        assertEquals("test@example.com", response.getUserEmail());
        assertEquals("Build SaaS MVP", response.getOriginalGoal());
        assertFalse(response.getTasks().isEmpty());
        assertTrue(response.getTotalEstimatedMinutes() > 0);
    }
}
