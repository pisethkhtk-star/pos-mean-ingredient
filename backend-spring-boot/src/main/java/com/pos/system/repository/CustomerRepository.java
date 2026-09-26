package com.pos.system.repository;

import com.pos.system.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Integer> {
    Optional<Customer> findByPhone(String phone);
    boolean existsByPhone(String phone);

    List<Customer> findAllByOrderByCreatedAtDesc();

    @Query("SELECT c FROM Customer c WHERE " +
           "LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "(c.phone IS NOT NULL AND LOWER(c.phone) LIKE LOWER(CONCAT('%', :search, '%'))) OR " +
           "(c.email IS NOT NULL AND LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY c.createdAt DESC")
    List<Customer> searchCustomers(@Param("search") String search);
}
