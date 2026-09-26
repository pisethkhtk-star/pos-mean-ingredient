package com.pos.system.service;

import com.pos.system.config.UserPrincipal;
import com.pos.system.dto.ProductIngredientDTO;
import com.pos.system.dto.ProductRequest;
import com.pos.system.entity.*;
import com.pos.system.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final IngredientRepository ingredientRepository;
    private final ProductIngredientRepository productIngredientRepository;
    private final InventoryLogRepository inventoryLogRepository;

    public ProductService(
        ProductRepository productRepository,
        CategoryRepository categoryRepository,
        IngredientRepository ingredientRepository,
        ProductIngredientRepository productIngredientRepository,
        InventoryLogRepository inventoryLogRepository
    ) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.ingredientRepository = ingredientRepository;
        this.productIngredientRepository = productIngredientRepository;
        this.inventoryLogRepository = inventoryLogRepository;
    }

    public List<Product> searchProducts(String query, String categoryIdStr) {
        Integer categoryId = null;
        if (categoryIdStr != null && !categoryIdStr.trim().isEmpty() && !"all".equalsIgnoreCase(categoryIdStr.trim())) {
            try {
                categoryId = Integer.parseInt(categoryIdStr.trim());
            } catch (NumberFormatException ignored) {}
        }

        boolean hasQuery = query != null && !query.trim().isEmpty();
        String cleanQuery = hasQuery ? query.trim() : null;

        if (hasQuery && categoryId != null) {
            return productRepository.searchByNameOrCodeAndCategoryId(cleanQuery, categoryId);
        } else if (hasQuery) {
            return productRepository.searchByNameOrCode(cleanQuery);
        } else if (categoryId != null) {
            return productRepository.findByCategoryIdOrderByNameAsc(categoryId);
        } else {
            return productRepository.findAllByOrderByNameAsc();
        }
    }

    public Product getProductById(Integer id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    private String generateNext14DigitCode() {
        List<Product> products = productRepository.findAll();
        long maxCode = 0;
        for (Product p : products) {
            if (p.getCode() != null && p.getCode().matches("^\\d{14}$")) {
                try {
                    long val = Long.parseLong(p.getCode());
                    if (val > maxCode) maxCode = val;
                } catch (NumberFormatException ignored) {}
            }
        }
        return String.format("%014d", maxCode + 1);
    }

    @Transactional
    public Product createProduct(ProductRequest request, UserPrincipal currentUser) {
        if (request.getName() == null || request.getName().trim().isEmpty() ||
            request.getPrice() == null || request.getCategoryId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required fields");
        }

        categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category does not exist"));

        String code = request.getCode() != null ? request.getCode().trim() :
                (request.getSku() != null ? request.getSku().trim() : "");

        if (code.isEmpty()) {
            code = generateNext14DigitCode();
        }

        if (code.length() > 14) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product code cannot exceed 14 characters");
        }

        if (productRepository.existsByCode(code)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product code already exists");
        }

        boolean hasRecipe = request.getHasRecipe() != null ? request.getHasRecipe() :
                (request.getIngredients() != null && !request.getIngredients().isEmpty());

        Product product = new Product();
        product.setName(request.getName().trim());
        product.setCode(code);
        product.setPrice(request.getPrice());
        product.setImage(request.getImage());
        product.setCategoryId(request.getCategoryId());
        product.setHasRecipe(hasRecipe);

        BigDecimal initialCost = request.getCost() != null ? request.getCost() : BigDecimal.ZERO;

        if (hasRecipe) {
            product.setStock(0);
            product.setMinStock(0);
        } else {
            product.setStock(request.getStock() != null ? request.getStock() : 0);
            product.setMinStock(request.getMinStock() != null ? request.getMinStock() : 5);
        }

        product.setCost(initialCost);
        Product savedProduct = productRepository.save(product);

        BigDecimal totalCalculatedCost = BigDecimal.ZERO;
        if (hasRecipe && request.getIngredients() != null && !request.getIngredients().isEmpty()) {
            Map<Integer, BigDecimal> ingredientMap = new HashMap<>();
            for (ProductIngredientDTO dto : request.getIngredients()) {
                if (dto.getIngredientId() != null && dto.getQuantity() != null && dto.getQuantity().compareTo(BigDecimal.ZERO) > 0) {
                    ingredientMap.merge(dto.getIngredientId(), dto.getQuantity(), BigDecimal::add);
                }
            }

            for (Map.Entry<Integer, BigDecimal> entry : ingredientMap.entrySet()) {
                Ingredient ing = ingredientRepository.findById(entry.getKey()).orElse(null);
                if (ing != null) {
                    totalCalculatedCost = totalCalculatedCost.add(ing.getCost().multiply(entry.getValue()));
                    ProductIngredient pi = new ProductIngredient(savedProduct, ing, entry.getValue());
                    productIngredientRepository.save(pi);
                    savedProduct.getIngredients().add(pi);
                }
            }

            if (totalCalculatedCost.compareTo(BigDecimal.ZERO) > 0) {
                savedProduct.setCost(totalCalculatedCost.setScale(2, RoundingMode.HALF_UP));
                savedProduct = productRepository.save(savedProduct);
            }
        }

        return productRepository.findById(savedProduct.getId()).orElse(savedProduct);
    }

    @Transactional
    public Product updateProduct(Integer id, ProductRequest request, UserPrincipal currentUser) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        String code = request.getCode() != null ? request.getCode().trim() :
                (request.getSku() != null ? request.getSku().trim() : null);

        if (code != null && !code.equals(product.getCode())) {
            if (code.length() > 14) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product code cannot exceed 14 characters");
            }
            if (productRepository.existsByCode(code)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product code is already used by another product");
            }
            product.setCode(code);
        }

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            product.setName(request.getName().trim());
        }
        if (request.getPrice() != null) {
            product.setPrice(request.getPrice());
        }
        if (request.getImage() != null) {
            product.setImage(request.getImage());
        }
        if (request.getCategoryId() != null) {
            product.setCategoryId(request.getCategoryId());
        }

        boolean hasRecipe = request.getHasRecipe() != null ? request.getHasRecipe() : product.getHasRecipe();
        product.setHasRecipe(hasRecipe);

        BigDecimal calculatedCost = BigDecimal.ZERO;
        productIngredientRepository.deleteByProductId(product.getId());
        product.getIngredients().clear();

        if (hasRecipe && request.getIngredients() != null) {
            Map<Integer, BigDecimal> ingredientMap = new HashMap<>();
            for (ProductIngredientDTO dto : request.getIngredients()) {
                if (dto.getIngredientId() != null && dto.getQuantity() != null && dto.getQuantity().compareTo(BigDecimal.ZERO) > 0) {
                    ingredientMap.merge(dto.getIngredientId(), dto.getQuantity(), BigDecimal::add);
                }
            }

            for (Map.Entry<Integer, BigDecimal> entry : ingredientMap.entrySet()) {
                Ingredient ing = ingredientRepository.findById(entry.getKey()).orElse(null);
                if (ing != null) {
                    calculatedCost = calculatedCost.add(ing.getCost().multiply(entry.getValue()));
                    ProductIngredient pi = new ProductIngredient(product, ing, entry.getValue());
                    productIngredientRepository.save(pi);
                    product.getIngredients().add(pi);
                }
            }
        }

        if (hasRecipe) {
            product.setStock(0);
            product.setMinStock(0);
            if (calculatedCost.compareTo(BigDecimal.ZERO) > 0) {
                product.setCost(calculatedCost.setScale(2, RoundingMode.HALF_UP));
            } else if (request.getCost() != null) {
                product.setCost(request.getCost());
            }
        } else {
            if (request.getStock() != null) product.setStock(request.getStock());
            if (request.getMinStock() != null) product.setMinStock(request.getMinStock());
            if (request.getCost() != null) product.setCost(request.getCost());
        }

        return productRepository.save(product);
    }

    @Transactional
    public void deleteProduct(Integer id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        productRepository.delete(product);
    }

    @Transactional
    public Map<String, Object> bulkImport(List<Map<String, Object>> products, UserPrincipal currentUser) {
        if (products == null || products.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid payload: 'products' array is required");
        }

        int success = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        Map<String, Integer> categoryCache = new HashMap<>();
        categoryRepository.findAll().forEach(c -> categoryCache.put(c.getName().toLowerCase(), c.getId()));

        for (Map<String, Object> item : products) {
            String name = item.get("name") != null ? item.get("name").toString().trim() : "";
            String code = item.get("code") != null ? item.get("code").toString().trim() :
                    (item.get("sku") != null ? item.get("sku").toString().trim() : "");
            String categoryName = item.get("categoryName") != null ? item.get("categoryName").toString().trim() : "";
            Object priceObj = item.get("price");
            Object costObj = item.get("cost");

            if (name.isEmpty() || code.isEmpty() || priceObj == null || costObj == null || categoryName.isEmpty()) {
                errors.add("Row with Code " + (code.isEmpty() ? "unknown" : code) + ": Missing required columns.");
                skipped++;
                continue;
            }

            if (code.length() > 14) {
                errors.add("Code " + code + " exceeds the maximum limit of 14 characters, skipped.");
                skipped++;
                continue;
            }

            if (productRepository.existsByCode(code)) {
                errors.add("Code " + code + " already exists, skipped.");
                skipped++;
                continue;
            }

            Integer categoryId;
            String catKey = categoryName.toLowerCase();
            if (categoryCache.containsKey(catKey)) {
                categoryId = categoryCache.get(catKey);
            } else {
                Category newCat = new Category(categoryName, null);
                Category savedCat = categoryRepository.save(newCat);
                categoryId = savedCat.getId();
                categoryCache.put(catKey, categoryId);
            }

            BigDecimal price = new BigDecimal(priceObj.toString());
            BigDecimal cost = new BigDecimal(costObj.toString());
            int stock = item.get("stock") != null ? Integer.parseInt(item.get("stock").toString()) : 0;
            int minStock = item.get("minStock") != null ? Integer.parseInt(item.get("minStock").toString()) : 5;
            boolean hasRecipe = item.get("hasRecipe") != null && Boolean.parseBoolean(item.get("hasRecipe").toString());

            Product p = new Product();
            p.setName(name);
            p.setCode(code);
            p.setPrice(price);
            p.setCost(cost);
            p.setStock(stock);
            p.setMinStock(minStock);
            p.setHasRecipe(hasRecipe);
            p.setCategoryId(categoryId);

            Product saved = productRepository.save(p);

            if (stock > 0 && currentUser != null) {
                InventoryLog log = new InventoryLog();
                log.setProductId(saved.getId());
                log.setType("IN");
                log.setQuantity(new BigDecimal(stock));
                log.setBeforeQty(BigDecimal.ZERO);
                log.setAfterQty(new BigDecimal(stock));
                log.setNote("CSV Bulk Import Setup");
                log.setUserId(currentUser.getId());
                inventoryLogRepository.save(log);
            }

            success++;
        }

        Map<String, Object> results = new HashMap<>();
        results.put("success", success);
        results.put("skipped", skipped);
        results.put("errors", errors);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Import completed: " + success + " successfully added, " + skipped + " skipped.");
        response.put("results", results);
        return response;
    }
}
