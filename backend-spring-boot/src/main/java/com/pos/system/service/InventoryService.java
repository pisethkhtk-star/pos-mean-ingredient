package com.pos.system.service;

import com.pos.system.config.UserPrincipal;
import com.pos.system.dto.InventoryAdjustRequest;
import com.pos.system.entity.Ingredient;
import com.pos.system.entity.InventoryLog;
import com.pos.system.entity.Product;
import com.pos.system.repository.IngredientRepository;
import com.pos.system.repository.InventoryLogRepository;
import com.pos.system.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class InventoryService {

    private final InventoryLogRepository inventoryLogRepository;
    private final ProductRepository productRepository;
    private final IngredientRepository ingredientRepository;

    public InventoryService(
        InventoryLogRepository inventoryLogRepository,
        ProductRepository productRepository,
        IngredientRepository ingredientRepository
    ) {
        this.inventoryLogRepository = inventoryLogRepository;
        this.productRepository = productRepository;
        this.ingredientRepository = ingredientRepository;
    }

    public List<InventoryLog> getAllLogs() {
        return inventoryLogRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public Object adjustStock(InventoryAdjustRequest request, UserPrincipal currentUser) {
        if ((request.getProductId() == null && request.getIngredientId() == null) ||
            request.getType() == null || request.getQuantity() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required fields: productId or ingredientId, type, and quantity are required");
        }

        String type = request.getType().toUpperCase();
        if (!List.of("IN", "OUT", "ADJUST", "ADJUSTMENT", "PURCHASE_IN", "ORDER_OUT").contains(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid adjustment type");
        }

        BigDecimal qty = request.getQuantity();
        if (qty.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be a positive number greater than 0");
        }

        Integer userId = currentUser != null ? currentUser.getId() : null;

        // Ingredient Adjustment
        if (request.getIngredientId() != null) {
            Ingredient ingredient = ingredientRepository.findById(request.getIngredientId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ingredient not found"));

            BigDecimal oldStock = ingredient.getStock();
            BigDecimal newStock = oldStock;

            if ("IN".equals(type) || "PURCHASE_IN".equals(type)) {
                newStock = oldStock.add(qty);
            } else {
                newStock = oldStock.subtract(qty);
            }

            if (newStock.compareTo(BigDecimal.ZERO) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Insufficient ingredient stock. Current stock is " + oldStock + " " + ingredient.getUnit() + ", cannot deduct " + qty);
            }

            newStock = newStock.setScale(2, RoundingMode.HALF_UP);
            ingredient.setStock(newStock);
            Ingredient updated = ingredientRepository.save(ingredient);

            InventoryLog log = new InventoryLog();
            log.setIngredientId(ingredient.getId());
            log.setType("ADJUST".equals(type) ? "ADJUSTMENT" : type);
            log.setQuantity(qty);
            log.setBeforeQty(oldStock);
            log.setAfterQty(newStock);
            log.setNote(request.getNote() != null ? request.getNote() : "Manual ingredient stock adjustment (" + type + ")");
            log.setUserId(userId);
            inventoryLogRepository.save(log);

            return updated;
        }

        // Product Adjustment
        if (request.getProductId() != null) {
            Product product = productRepository.findById(request.getProductId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

            int oldStock = product.getStock();
            int intQty = qty.intValue();
            int newStock = oldStock;

            if ("IN".equals(type) || "PURCHASE_IN".equals(type)) {
                newStock = oldStock + intQty;
            } else {
                newStock = oldStock - intQty;
            }

            if (newStock < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Insufficient stock. Current stock is " + oldStock + ", cannot deduct " + qty);
            }

            product.setStock(newStock);
            Product updated = productRepository.save(product);

            InventoryLog log = new InventoryLog();
            log.setProductId(product.getId());
            log.setType(type);
            log.setQuantity(qty);
            log.setBeforeQty(new BigDecimal(oldStock));
            log.setAfterQty(new BigDecimal(newStock));
            log.setNote(request.getNote() != null ? request.getNote() : "Manual stock adjustment (" + type + ")");
            log.setUserId(userId);
            inventoryLogRepository.save(log);

            return updated;
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Neither productId nor ingredientId provided");
    }
}
