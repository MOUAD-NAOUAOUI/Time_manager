package com.intelligenttime.corebackend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Redis configuration with graceful degradation.
 * If Redis is unavailable, the application will still start but rate limiting
 * will fail securely (all operations will throw an exception).
 */
@Configuration
public class RedisConfig {

    private static final Logger LOGGER = LoggerFactory.getLogger(RedisConfig.class);

    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory connectionFactory) {
        StringRedisTemplate template = new StringRedisTemplate();
        template.setConnectionFactory(connectionFactory);
        LOGGER.info("StringRedisTemplate bean created successfully");
        return template;
    }

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        try {
            LettuceConnectionFactory factory = new LettuceConnectionFactory();
            factory.afterPropertiesSet();
            LOGGER.info("Redis connection factory initialized: host={}, port={}",
                    factory.getHostName(), factory.getPort());
            return factory;
        } catch (Exception e) {
            LOGGER.error("Failed to initialize Redis connection factory: {}", e.getMessage());
            throw new IllegalStateException(
                    "Redis connection failed. Ensure Redis is running on localhost:6379. " +
                    "Start Redis with: redis-server or docker run -d -p 6379:6379 redis", e);
        }
    }
}
