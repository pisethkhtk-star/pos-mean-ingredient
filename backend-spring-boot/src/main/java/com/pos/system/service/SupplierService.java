package com.pos.system.service;

import com.pos.system.dto.SupplierRequest;
import com.pos.system.entity.Supplier;
import com.pos.system.repository.SupplierRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public SupplierService(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    public List<Supplier> searchSuppliers(String search) {
        if (search == null || search.trim().isEmpty()) {
            return supplierRepository.findAllByOrderByCreatedAtDesc();
        }
        return supplierRepository.searchSuppliers(search.trim());
    }

    public Supplier getSupplierById(Integer id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found"));
    }

    @Transactional
    public Supplier createSupplier(SupplierRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Supplier name is required");
        }

        Supplier supplier = new Supplier(
                request.getName().trim(),
                request.getContact(),
                request.getPhone(),
                request.getEmail(),
                request.getAddress()
        );

        return supplierRepository.save(supplier);
    }

    @Transactional
    public Supplier updateSupplier(Integer id, SupplierRequest request) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found"));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            supplier.setName(request.getName().trim());
        }
        if (request.getContact() != null) supplier.setContact(request.getContact());
        if (request.getPhone() != null) supplier.setPhone(request.getPhone());
        if (request.getEmail() != null) supplier.setEmail(request.getEmail());
        if (request.getAddress() != null) supplier.setAddress(request.getAddress());

        return supplierRepository.save(supplier);
    }

    @Transactional
    public void deleteSupplier(Integer id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found"));
        supplierRepository.delete(supplier);
    }
}
