package com.pos.system.dto;

import java.math.BigDecimal;

public class SettingsDTO {
    private String storeName = "My POS System";
    private String storeAddress = "123 Main Street, Phnom Penh";
    private String storePhone = "012-345-678";
    private BigDecimal taxRate = new BigDecimal("10");
    private String receiptHeader = "Thank you for shopping with us!";
    private String receiptFooter = "Please come again!";

    public SettingsDTO() {}

    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }

    public String getStoreAddress() { return storeAddress; }
    public void setStoreAddress(String storeAddress) { this.storeAddress = storeAddress; }

    public String getStorePhone() { return storePhone; }
    public void setStorePhone(String storePhone) { this.storePhone = storePhone; }

    public BigDecimal getTaxRate() { return taxRate; }
    public void setTaxRate(BigDecimal taxRate) { this.taxRate = taxRate; }

    public String getReceiptHeader() { return receiptHeader; }
    public void setReceiptHeader(String receiptHeader) { this.receiptHeader = receiptHeader; }

    public String getReceiptFooter() { return receiptFooter; }
    public void setReceiptFooter(String receiptFooter) { this.receiptFooter = receiptFooter; }
}
