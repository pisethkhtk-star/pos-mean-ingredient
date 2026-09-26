package com.pos.system.service;

import com.pos.system.config.UserPrincipal;
import com.pos.system.dto.IngredientRequest;
import com.pos.system.entity.Ingredient;
import com.pos.system.entity.InventoryLog;
import com.pos.system.repository.IngredientRepository;
import com.pos.system.repository.InventoryLogRepository;
import com.pos.system.repository.ProductIngredientRepository;
import com.pos.system.repository.PurchaseItemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class IngredientService {

    private final IngredientRepository ingredientRepository;
    private final ProductIngredientRepository productIngredientRepository;
    private final PurchaseItemRepository purchaseItemRepository;
    private final InventoryLogRepository inventoryLogRepository;

    public IngredientService(
        IngredientRepository ingredientRepository,
        ProductIngredientRepository productIngredientRepository,
        PurchaseItemRepository purchaseItemRepository,
        InventoryLogRepository inventoryLogRepository
    ) {
        this.ingredientRepository = ingredientRepository;
        this.productIngredientRepository = productIngredientRepository;
        this.purchaseItemRepository = purchaseItemRepository;
        this.inventoryLogRepository = inventoryLogRepository;
    }

    public List<Ingredient> searchIngredients(String query, Boolean lowStock) {
        List<Ingredient> list;
        if (query != null && !query.trim().isEmpty()) {
            list = ingredientRepository.searchIngredients(query.trim());
        } else {
            list = ingredientRepository.findAllByOrderByNameAsc();
        }

        if (Boolean.TRUE.equals(lowStock)) {
            list = list.stream()
                    .filter(i -> i.getStock().compareTo(i.getMinStock()) <= 0)
                    .collect(Collectors.toList());
        }

        for (Ingredient ing : list) {
            long pCount = productIngredientRepository.countByIngredientId(ing.getId());
            long puCount = purchaseItemRepository.countByIngredientId(ing.getId());
            ing.setCount(Map.of("productItems", pCount, "purchaseItems", puCount));
        }

        return list;
    }

    public Ingredient getIngredientById(Integer id) {
        Ingredient ing = ingredientRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ingredient not found"));
        long pCount = productIngredientRepository.countByIngredientId(ing.getId());
        long puCount = purchaseItemRepository.countByIngredientId(ing.getId());
        ing.setCount(Map.of("productItems", pCount, "purchaseItems", puCount));
        return ing;
    }

    private String generateNextIngredientCode() {
        long count = ingredientRepository.count();
        return String.format("ING-%03d", count + 1);
    }

    @Transactional
    public Ingredient createIngredient(IngredientRequest request, UserPrincipal currentUser) {
        if (request.getName() == null || request.getName().trim().isEmpty() ||
            request.getUnit() == null || request.getUnit().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required fields: name and unit are required");
        }

        String code = request.getCode() != null ? request.getCode().trim() : "";
        if (code.isEmpty()) {
            code = generateNextIngredientCode();
        }

        if (ingredientRepository.existsByCode(code)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ingredient code already exists");
        }

        Ingredient ingredient = new Ingredient();
        ingredient.setName(request.getName().trim());
        ingredient.setCode(code);
        ingredient.setUnit(request.getUnit().trim());
        ingredient.setStock(request.getStock() != null ? request.getStock() : BigDecimal.ZERO);
        ingredient.setMinStock(request.getMinStock() != null ? request.getMinStock() : new BigDecimal("5.00"));
        ingredient.setCost(request.getCost() != null ? request.getCost() : BigDecimal.ZERO);

        Ingredient saved = ingredientRepository.save(ingredient);

        if (saved.getStock().compareTo(BigDecimal.ZERO) > 0 && currentUser != null) {
            InventoryLog log = new InventoryLog();
            log.setIngredientId(saved.getId());
            log.setType("PURCHASE_IN");
            log.setQuantity(saved.getStock());
            log.setBeforeQty(BigDecimal.ZERO);
            log.setAfterQty(saved.getStock());
            log.setNote("Initial ingredient stock set by " + currentUser.getName());
            log.setUserId(currentUser.getId());
            inventoryLogRepository.save(log);
        }

        saved.setCount(Map.of("productItems", 0L, "purchaseItems", 0L));
        return saved;
    }

    @Transactional
    public Ingredient updateIngredient(Integer id, IngredientRequest request, UserPrincipal currentUser) {
        Ingredient ingredient = ingredientRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ingredient not found"));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            ingredient.setName(request.getName().trim());
        }
        if (request.getUnit() != null && !request.getUnit().trim().isEmpty()) {
            ingredient.setUnit(request.getUnit().trim());
        }
        if (request.getCode() != null && !request.getCode().trim().isEmpty() && !request.getCode().trim().equals(ingredient.getCode())) {
            String newCode = request.getCode().trim();
            if (ingredientRepository.existsByCode(newCode)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ingredient code already exists");
            }
            ingredient.setCode(newCode);
        }
        if (request.getStock() != null) {
            ingredient.setStock(request.getStock());
        }
        if (request.getMinStock() != null) {
            ingredient.setMinStock(request.getMinStock());
        }
        if (request.getCost() != null) {
            ingredient.setCost(request.getCost());
        }

        Ingredient saved = ingredientRepository.save(ingredient);
        long pCount = productIngredientRepository.countByIngredientId(saved.getId());
        long puCount = purchaseItemRepository.countByIngredientId(saved.getId());
        saved.setCount(Map.of("productItems", pCount, "purchaseItems", puCount));
        return saved;
    }

    @Transactional
    public void deleteIngredient(Integer id) {
        Ingredient ingredient = ingredientRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ingredient not found"));

        long pCount = productIngredientRepository.countByIngredientId(id);
        long puCount = purchaseItemRepository.countByIngredientId(id);

        if (pCount > 0 || puCount > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete ingredient that is linked to products or purchase items");
        }

        ingredientRepository.delete(ingredient);
    }
}
