package com.pos.system.controller;

import com.pos.system.config.UserPrincipal;
import com.pos.system.dto.ProductRequest;
import com.pos.system.entity.Product;
import com.pos.system.service.ProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<List<Product>> search(
        @RequestParam(required = false) String query,
        @RequestParam(required = false) String categoryId
    ) {
        return ResponseEntity.ok(productService.searchProducts(query, categoryId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Product> create(
        @RequestBody ProductRequest request,
        @AuthenticationPrincipal UserPrincipal user
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.createProduct(request, user));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Product> update(
        @PathVariable Integer id,
        @RequestBody ProductRequest request,
        @AuthenticationPrincipal UserPrincipal user
    ) {
        return ResponseEntity.ok(productService.updateProduct(id, request, user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Boolean>> delete(@PathVariable Integer id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/import")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> bulkImport(
        @RequestBody Map<String, List<Map<String, Object>>> body,
        @AuthenticationPrincipal UserPrincipal user
    ) {
        List<Map<String, Object>> products = body.get("products");
        return ResponseEntity.ok(productService.bulkImport(products, user));
    }
}
