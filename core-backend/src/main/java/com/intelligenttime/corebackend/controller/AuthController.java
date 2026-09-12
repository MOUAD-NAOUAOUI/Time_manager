package com.intelligenttime.corebackend.controller;

import com.intelligenttime.corebackend.dto.AuthResponse;
import com.intelligenttime.corebackend.dto.LoginRequest;
import com.intelligenttime.corebackend.dto.RegisterRequest;
import com.intelligenttime.corebackend.security.JwtService;
import com.intelligenttime.corebackend.service.RateLimiterService;
import com.intelligenttime.corebackend.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UserService userService;
    private final RateLimiterService rateLimiterService;
    private final JwtService jwtService;
    private final long jwtExpirationSeconds;
    private final boolean secureCookie;

    // Matches jwt.expiration (milliseconds) — convert to seconds for Max-Age
    public AuthController(UserService userService,
            RateLimiterService rateLimiterService,
            JwtService jwtService,
            @Value("${jwt.expiration:86400000}") long jwtExpirationMs,
            @Value("${app.cookie.secure:false}") boolean secureCookie) {
        this.userService = userService;
        this.rateLimiterService = rateLimiterService;
        this.jwtService = jwtService;
        this.jwtExpirationSeconds = jwtExpirationMs / 1000;
        this.secureCookie = secureCookie;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request,
            HttpServletResponse response) {
        AuthResponse auth = userService.registerUser(request);
        setAuthCookie(response, auth.getToken());
        // Strip token from JSON body — it is now delivered only via httpOnly cookie
        auth.setToken(null);
        return ResponseEntity.ok(auth);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse response) {
        String clientIp = rateLimiterService.extractClientIp(servletRequest);
        AuthResponse auth = userService.loginUser(request, clientIp);
        setAuthCookie(response, auth.getToken());
        // Strip token from JSON body — it is now delivered only via httpOnly cookie
        auth.setToken(null);
        return ResponseEntity.ok(auth);
    }

    /**
     * Invalidates the caller's JWT: adds it to the Redis blacklist and clears
     * the httpOnly auth cookie. Returns 200 even if no token is present
     * (idempotent logout).
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request,
            HttpServletResponse response) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwtService.revokeToken(authHeader.substring(7));
        }
        clearAuthCookie(response);
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    /**
     * Sets an httpOnly, Secure, SameSite=Strict cookie carrying the JWT.
     * httpOnly prevents JavaScript from reading the token, eliminating XSS
     * token theft. Secure ensures it is only sent over HTTPS.
     */
    private void setAuthCookie(HttpServletResponse response, String token) {
        String secureAttribute = secureCookie ? "; Secure" : "";
        String cookie = String.format(
                "auth_token=%s; Path=/; Max-Age=%d; HttpOnly%s; SameSite=Lax",
                token, jwtExpirationSeconds, secureAttribute);
        response.addHeader("Set-Cookie", cookie);
    }

    /** Expires the auth cookie by setting Max-Age=0. */
    private void clearAuthCookie(HttpServletResponse response) {
        response.addHeader("Set-Cookie",
                "auth_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict");
    }
}
