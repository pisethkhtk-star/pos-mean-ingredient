package com.pos.system.controller;

import com.pos.system.dto.SettingsDTO;
import com.pos.system.service.SettingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
public class SettingController {

    private final SettingService settingService;

    public SettingController(SettingService settingService) {
        this.settingService = settingService;
    }

    @GetMapping
    public ResponseEntity<SettingsDTO> getSettings() {
        return ResponseEntity.ok(settingService.getSettings());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SettingsDTO> updateSettings(@RequestBody SettingsDTO request) {
        return ResponseEntity.ok(settingService.updateSettings(request));
    }
}
