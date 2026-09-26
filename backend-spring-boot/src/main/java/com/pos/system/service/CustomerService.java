package com.pos.system.service;

import com.pos.system.dto.CustomerRequest;
import com.pos.system.entity.Customer;
import com.pos.system.repository.CustomerRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    public List<Customer> searchCustomers(String search) {
        if (search == null || search.trim().isEmpty()) {
            return customerRepository.findAllByOrderByCreatedAtDesc();
        }
        return customerRepository.searchCustomers(search.trim());
    }

    public Customer getCustomerById(Integer id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
    }

    @Transactional
    public Customer createCustomer(CustomerRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Customer name is required");
        }

        String phone = request.getPhone() != null && !request.getPhone().trim().isEmpty() ? request.getPhone().trim() : null;
        if (phone != null && customerRepository.existsByPhone(phone)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number already exists");
        }

        Customer customer = new Customer(
            request.getName().trim(),
            phone,
            request.getEmail() != null ? request.getEmail().trim() : null,
            request.getAddress() != null ? request.getAddress().trim() : null
        );

        return customerRepository.save(customer);
    }

    @Transactional
    public Customer updateCustomer(Integer id, CustomerRequest request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            customer.setName(request.getName().trim());
        }

        String phone = request.getPhone() != null && !request.getPhone().trim().isEmpty() ? request.getPhone().trim() : null;
        if (phone != null && !phone.equals(customer.getPhone())) {
            if (customerRepository.existsByPhone(phone)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number already in use");
            }
            customer.setPhone(phone);
        }

        if (request.getEmail() != null) customer.setEmail(request.getEmail().trim());
        if (request.getAddress() != null) customer.setAddress(request.getAddress().trim());

        return customerRepository.save(customer);
    }

    @Transactional
    public void deleteCustomer(Integer id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        customerRepository.delete(customer);
    }
}
