package com.pos.system.dto;

import java.math.BigDecimal;

public class ProductIngredientDTO {
    private Integer ingredientId;
    private BigDecimal quantity;

    public ProductIngredientDTO() {}

    public ProductIngredientDTO(Integer ingredientId, BigDecimal quantity) {
        this.ingredientId = ingredientId;
        this.quantity = quantity;
    }

    public Integer getIngredientId() { return ingredientId; }
    public void setIngredientId(Integer ingredientId) { this.ingredientId = ingredientId; }

    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
}
