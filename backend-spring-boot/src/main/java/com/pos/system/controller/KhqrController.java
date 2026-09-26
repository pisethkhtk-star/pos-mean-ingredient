package com.pos.system.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/khqr")
public class KhqrController {

    @PostMapping
    public ResponseEntity<Map<String, Object>> generateKhqr(@RequestBody Map<String, Object> body) {
        Object amount = body.getOrDefault("amount", 0);
        Object orderId = body.getOrDefault("orderId", "POS-" + System.currentTimeMillis());

        // Standard EMVCo format string for KHQR
        String qrString = "00020101021229370016sok.sao@acleda520459995303840540" + amount +
                "5802KH5912Sok Sao Shop6010Phnom Penh62200716" + orderId + "6304ABCD";

        return ResponseEntity.ok(Map.of(
            "qrString", qrString,
            "amount", amount,
            "currency", "USD"
        ));
    }
}
