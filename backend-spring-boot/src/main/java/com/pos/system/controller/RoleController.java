package com.pos.system.controller;

import com.pos.system.config.UserPrincipal;
import com.pos.system.dto.RoleUpdateRequest;
import com.pos.system.entity.RolePermission;
import com.pos.system.service.RoleService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RolePermission>> getAll() {
        return ResponseEntity.ok(roleService.getAllRolePermissions());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> updatePermissions(
        @RequestBody RoleUpdateRequest request,
        @AuthenticationPrincipal UserPrincipal user,
        HttpServletResponse response
    ) {
        return ResponseEntity.ok(roleService.updateRolePermissions(request, user, response));
    }
}
