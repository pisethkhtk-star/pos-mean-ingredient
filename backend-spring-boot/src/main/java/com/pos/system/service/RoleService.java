package com.pos.system.service;

import com.pos.system.config.JwtUtil;
import com.pos.system.config.UserPrincipal;
import com.pos.system.dto.RoleUpdateRequest;
import com.pos.system.entity.RolePermission;
import com.pos.system.repository.RolePermissionRepository;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
public class RoleService {

    private final RolePermissionRepository rolePermissionRepository;
    private final JwtUtil jwtUtil;

    public RoleService(RolePermissionRepository rolePermissionRepository, JwtUtil jwtUtil) {
        this.rolePermissionRepository = rolePermissionRepository;
        this.jwtUtil = jwtUtil;
    }

    public List<RolePermission> getAllRolePermissions() {
        return rolePermissionRepository.findAllByOrderByRoleAsc();
    }

    @Transactional
    public Map<String, Object> updateRolePermissions(RoleUpdateRequest request, UserPrincipal currentUser, HttpServletResponse response) {
        if (request.getRole() == null || request.getPages() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid request payload");
        }

        RolePermission rolePermission = rolePermissionRepository.findByRole(request.getRole())
                .orElse(new RolePermission(request.getRole(), request.getPages()));

        rolePermission.setPages(request.getPages());
        RolePermission saved = rolePermissionRepository.save(rolePermission);

        if (currentUser != null && currentUser.getRole() == request.getRole()) {
            String token = jwtUtil.generateToken(
                    currentUser.getId(),
                    currentUser.getEmail(),
                    currentUser.getName(),
                    currentUser.getRole(),
                    request.getPages()
            );

            ResponseCookie cookie = ResponseCookie.from("token", token)
                    .httpOnly(true)
                    .secure(false)
                    .path("/")
                    .maxAge(86400)
                    .sameSite("Lax")
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        }

        return Map.of("success", true, "updatedPermission", saved);
    }
}
