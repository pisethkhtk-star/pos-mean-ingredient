package com.pos.system.controller;

import com.pos.system.config.UserPrincipal;
import com.pos.system.dto.IngredientRequest;
import com.pos.system.entity.Ingredient;
import com.pos.system.service.IngredientService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ingredients")
public class IngredientController {

    private final IngredientService ingredientService;

    public IngredientController(IngredientService ingredientService) {
        this.ingredientService = ingredientService;
    }

    @GetMapping
    public ResponseEntity<List<Ingredient>> search(
        @RequestParam(required = false) String query,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) Boolean lowStock
    ) {
        String activeQuery = query != null ? query : search;
        return ResponseEntity.ok(ingredientService.searchIngredients(activeQuery, lowStock));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Ingredient> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(ingredientService.getIngredientById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Ingredient> create(
        @RequestBody IngredientRequest request,
        @AuthenticationPrincipal UserPrincipal user
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ingredientService.createIngredient(request, user));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Ingredient> update(
        @PathVariable Integer id,
        @RequestBody IngredientRequest request,
        @AuthenticationPrincipal UserPrincipal user
    ) {
        return ResponseEntity.ok(ingredientService.updateIngredient(id, request, user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Boolean>> delete(@PathVariable Integer id) {
        ingredientService.deleteIngredient(id);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
