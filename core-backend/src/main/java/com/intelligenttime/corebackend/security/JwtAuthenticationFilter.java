package com.intelligenttime.corebackend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * Authenticates requests by reading the JWT from the httpOnly {@code auth_token}
 * cookie. Falls back to the {@code Authorization: Bearer} header so that
 * machine-to-machine clients (e.g. the AI microservice) continue to work.
 *
 * Cookie-based delivery is preferred for browser clients because it prevents
 * JavaScript from ever reading the token (httpOnly), eliminating XSS theft.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String token = extractTokenFromCookie(request);
        if (token == null) {
            token = extractTokenFromHeader(request);
        }

        if (token != null) {
            try {
                String email = jwtService.extractEmail(token);
                if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    if (jwtService.validateToken(token, email)) {
                        UsernamePasswordAuthenticationToken authToken =
                                new UsernamePasswordAuthenticationToken(email, null, Collections.emptyList());
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    }
                }
            } catch (Exception ignored) {
                // Invalid token — continue unauthenticated; Spring Security will reject
                // the request at the authorization step if the route requires auth.
            }
        }

        filterChain.doFilter(request, response);
    }

    /** Reads the JWT from the httpOnly {@code auth_token} cookie. */
    private String extractTokenFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if ("auth_token".equals(cookie.getName())) {
                String value = cookie.getValue();
                return (value != null && !value.isBlank()) ? value : null;
            }
        }
        return null;
    }

    /** Reads the JWT from the {@code Authorization: Bearer <token>} header. */
    private String extractTokenFromHeader(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String value = header.substring(7);
            return !value.isBlank() ? value : null;
        }
        return null;
    }
}