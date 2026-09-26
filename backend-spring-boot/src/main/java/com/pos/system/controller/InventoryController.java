package com.pos.system.controller;

import com.pos.system.config.UserPrincipal;
import com.pos.system.dto.InventoryAdjustRequest;
import com.pos.system.entity.InventoryLog;
import com.pos.system.service.InventoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public ResponseEntity<List<InventoryLog>> getAll() {
        return ResponseEntity.ok(inventoryService.getAllLogs());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Object> adjust(
        @RequestBody InventoryAdjustRequest request,
        @AuthenticationPrincipal UserPrincipal user
    ) {
        return ResponseEntity.ok(inventoryService.adjustStock(request, user));
    }
}
