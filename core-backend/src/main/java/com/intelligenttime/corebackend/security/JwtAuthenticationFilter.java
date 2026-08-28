package com.intelligenttime.corebackend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.Collections;

import org.springframework.stereotype.Component;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    // Injected JWT utility service for token parsing and validation
    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    // Called automatically by Spring for every incoming HTTP request
    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        // Read the Authorization header from the incoming request
        final String authHeader = request.getHeader("Authorization");
        // If no Authorization header or it doesn't start with "Bearer ", skip this
        // filter
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Extract the raw JWT token by removing the "Bearer " prefix (7 characters)
        final String token = authHeader.substring(7);
        final String email = jwtService.extractEmail(token);
        // Only set authentication if email is valid and not already authenticated
        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            if (jwtService.validateToken(token, email)) {
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(email, null,
                        Collections.emptyList());
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
        // Pass the request to the next filter in the chain
        filterChain.doFilter(request, response);
    }
}