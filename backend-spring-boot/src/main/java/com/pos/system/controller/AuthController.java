package com.pos.system.controller;

import com.pos.system.config.UserPrincipal;
import com.pos.system.dto.LoginRequest;
import com.pos.system.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
        @RequestBody LoginRequest request,
        HttpServletResponse response
    ) {
        return ResponseEntity.ok(authService.login(request, response));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(
        @AuthenticationPrincipal UserPrincipal principal,
        HttpServletResponse response
    ) {
        return ResponseEntity.ok(authService.getCurrentUser(principal, response));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Boolean>> logout(HttpServletResponse response) {
        return ResponseEntity.ok(authService.logout(response));
    }
}
