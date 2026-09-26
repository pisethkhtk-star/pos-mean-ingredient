package com.pos.system.service;

import com.pos.system.config.JwtUtil;
import com.pos.system.config.UserPrincipal;
import com.pos.system.dto.LoginRequest;
import com.pos.system.dto.UserResponseDTO;
import com.pos.system.entity.Role;
import com.pos.system.entity.RolePermission;
import com.pos.system.entity.User;
import com.pos.system.repository.RolePermissionRepository;
import com.pos.system.repository.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(
        UserRepository userRepository,
        RolePermissionRepository rolePermissionRepository,
        PasswordEncoder passwordEncoder,
        JwtUtil jwtUtil
    ) {
        this.userRepository = userRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public List<String> getDefaultPermissions(Role role) {
        return rolePermissionRepository.findByRole(role)
                .map(RolePermission::getPages)
                .orElseGet(() -> {
                    if (role == Role.ADMIN) {
                        return List.of("/", "/pos", "/products", "/categories", "/ingredients", "/discounts",
                                "/inventory", "/purchases", "/suppliers", "/customers", "/orders",
                                "/reports", "/users", "/settings", "/roles");
                    } else if (role == Role.MANAGER) {
                        return List.of("/", "/pos", "/products", "/categories", "/ingredients", "/discounts",
                                "/inventory", "/purchases", "/suppliers", "/customers", "/orders");
                    } else {
                        return List.of("/pos");
                    }
                });
    }

    public Map<String, Object> login(LoginRequest request, HttpServletResponse response) {
        if (request.getEmail() == null || request.getPassword() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email and password are required");
        }

        User user = userRepository.findByEmail(request.getEmail().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        List<String> permissions = getDefaultPermissions(user.getRole());
        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getName(), user.getRole(), permissions);

        ResponseCookie cookie = ResponseCookie.from("token", token)
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(86400)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        UserResponseDTO userDTO = new UserResponseDTO(user.getId(), user.getEmail(), user.getName(), user.getRole(), permissions);
        return Map.of("user", userDTO);
    }

    public Map<String, Object> getCurrentUser(UserPrincipal principal, HttpServletResponse response) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }

        List<String> permissions = getDefaultPermissions(principal.getRole());
        String token = jwtUtil.generateToken(principal.getId(), principal.getEmail(), principal.getName(), principal.getRole(), permissions);

        ResponseCookie cookie = ResponseCookie.from("token", token)
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(86400)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        UserResponseDTO userDTO = new UserResponseDTO(principal.getId(), principal.getEmail(), principal.getName(), principal.getRole(), permissions);
        return Map.of("user", userDTO);
    }

    public Map<String, Boolean> logout(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("token", "")
                .httpOnly(true)
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return Map.of("success", true);
    }
}
