package com.pos.system.repository;

import com.pos.system.entity.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Integer> {
    List<Supplier> findAllByOrderByCreatedAtDesc();

    @Query("SELECT s FROM Supplier s WHERE " +
           "LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "(s.contact IS NOT NULL AND LOWER(s.contact) LIKE LOWER(CONCAT('%', :search, '%'))) OR " +
           "(s.phone IS NOT NULL AND LOWER(s.phone) LIKE LOWER(CONCAT('%', :search, '%'))) OR " +
           "(s.email IS NOT NULL AND LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY s.createdAt DESC")
    List<Supplier> searchSuppliers(@Param("search") String search);
}
