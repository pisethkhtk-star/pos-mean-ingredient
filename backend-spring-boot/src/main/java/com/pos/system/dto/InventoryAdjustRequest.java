package com.pos.system.dto;

import java.math.BigDecimal;

public class InventoryAdjustRequest {
    private Integer productId;
    private Integer ingredientId;
    private String type;
    private BigDecimal quantity;
    private String note;

    public InventoryAdjustRequest() {}

    public Integer getProductId() { return productId; }
    public void setProductId(Integer productId) { this.productId = productId; }

    public Integer getIngredientId() { return ingredientId; }
    public void setIngredientId(Integer ingredientId) { this.ingredientId = ingredientId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
