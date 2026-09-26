package com.pos.system.dto;

import java.util.List;

public class PurchaseCreateRequest {
    private Integer supplierId;
    private String note;
    private List<PurchaseItemRequest> items;

    public PurchaseCreateRequest() {}

    public Integer getSupplierId() { return supplierId; }
    public void setSupplierId(Integer supplierId) { this.supplierId = supplierId; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public List<PurchaseItemRequest> getItems() { return items; }
    public void setItems(List<PurchaseItemRequest> items) { this.items = items; }
}
