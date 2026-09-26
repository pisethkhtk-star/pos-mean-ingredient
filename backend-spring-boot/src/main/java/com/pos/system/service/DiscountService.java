package com.pos.system.service;

import com.pos.system.dto.DiscountRequest;
import com.pos.system.entity.Discount;
import com.pos.system.repository.DiscountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class DiscountService {

    private final DiscountRepository discountRepository;

    public DiscountService(DiscountRepository discountRepository) {
        this.discountRepository = discountRepository;
    }

    public List<Discount> getAllDiscounts() {
        return discountRepository.findAllByOrderByIdAsc();
    }

    @Transactional
    public Discount createDiscount(DiscountRequest request) {
        if (request.getType() == null || request.getValue() == null || request.getMinPurchase() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type, value, and minPurchase are required");
        }

        Discount discount = new Discount();
        discount.setName(request.getName());
        discount.setType(request.getType());
        discount.setValue(request.getValue());
        discount.setMinPurchase(request.getMinPurchase());
        discount.setStartDate(request.getStartDate());
        discount.setEndDate(request.getEndDate());
        discount.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        return discountRepository.save(discount);
    }

    @Transactional
    public Discount updateDiscount(Integer id, DiscountRequest request) {
        Discount discount = discountRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discount not found"));

        if (request.getName() != null) discount.setName(request.getName());
        if (request.getType() != null) discount.setType(request.getType());
        if (request.getValue() != null) discount.setValue(request.getValue());
        if (request.getMinPurchase() != null) discount.setMinPurchase(request.getMinPurchase());
        if (request.getStartDate() != null) discount.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) discount.setEndDate(request.getEndDate());
        if (request.getIsActive() != null) discount.setIsActive(request.getIsActive());

        return discountRepository.save(discount);
    }

    @Transactional
    public void deleteDiscount(Integer id) {
        Discount discount = discountRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discount not found"));
        discountRepository.delete(discount);
    }
}
