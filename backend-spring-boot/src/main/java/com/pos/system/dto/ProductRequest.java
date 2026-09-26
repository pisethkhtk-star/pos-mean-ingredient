package com.pos.system.dto;

import java.math.BigDecimal;
import java.util.List;

public class ProductRequest {
    private String name;
    private String code;
    private String sku;
    private BigDecimal price;
    private BigDecimal cost;
    private Integer stock;
    private Integer minStock;
    private String image;
    private Integer categoryId;
    private Boolean hasRecipe;
    private List<ProductIngredientDTO> ingredients;

    public ProductRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public BigDecimal getCost() { return cost; }
    public void setCost(BigDecimal cost) { this.cost = cost; }

    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }

    public Integer getMinStock() { return minStock; }
    public void setMinStock(Integer minStock) { this.minStock = minStock; }

    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }

    public Integer getCategoryId() { return categoryId; }
    public void setCategoryId(Integer categoryId) { this.categoryId = categoryId; }

    public Boolean getHasRecipe() { return hasRecipe; }
    public void setHasRecipe(Boolean hasRecipe) { this.hasRecipe = hasRecipe; }

    public List<ProductIngredientDTO> getIngredients() { return ingredients; }
    public void setIngredients(List<ProductIngredientDTO> ingredients) { this.ingredients = ingredients; }
}
