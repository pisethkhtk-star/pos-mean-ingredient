package com.pos.system.dto;

import java.math.BigDecimal;

public class PurchaseItemRequest {
    private Integer ingredientId;
    private BigDecimal quantity;
    private BigDecimal cost;

    public PurchaseItemRequest() {}

    public Integer getIngredientId() { return ingredientId; }
    public void setIngredientId(Integer ingredientId) { this.ingredientId = ingredientId; }

    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }

    public BigDecimal getCost() { return cost; }
    public void setCost(BigDecimal cost) { this.cost = cost; }
}
