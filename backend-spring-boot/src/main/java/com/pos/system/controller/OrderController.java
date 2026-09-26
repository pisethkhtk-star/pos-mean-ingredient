package com.pos.system.controller;

import com.pos.system.config.UserPrincipal;
import com.pos.system.dto.OrderCreateRequest;
import com.pos.system.entity.Order;
import com.pos.system.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public ResponseEntity<List<Order>> search(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String startDate,
        @RequestParam(required = false) String endDate
    ) {
        return ResponseEntity.ok(orderService.searchOrders(search, status, startDate, endDate));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @PostMapping
    public ResponseEntity<Order> create(
        @RequestBody OrderCreateRequest request,
        @AuthenticationPrincipal UserPrincipal user
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.createOrder(request, user));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Order> updateStatus(
        @PathVariable Integer id,
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal UserPrincipal user
    ) {
        String status = body.get("status");
        return ResponseEntity.ok(orderService.updateOrderStatus(id, status, user));
    }
}
