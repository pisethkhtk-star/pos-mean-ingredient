package com.pos.system.repository;

import com.pos.system.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {
    Optional<Product> findByCode(String code);
    boolean existsByCode(String code);
    long countByCategoryId(Integer categoryId);

    List<Product> findAllByOrderByNameAsc();
    List<Product> findByCategoryIdOrderByNameAsc(Integer categoryId);

    @Query("SELECT p FROM Product p WHERE " +
           "LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.code) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "ORDER BY p.name ASC")
    List<Product> searchByNameOrCode(@Param("query") String query);

    @Query("SELECT p FROM Product p WHERE " +
           "(LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.code) LIKE LOWER(CONCAT('%', :query, '%'))) AND " +
           "p.categoryId = :categoryId " +
           "ORDER BY p.name ASC")
    List<Product> searchByNameOrCodeAndCategoryId(@Param("query") String query, @Param("categoryId") Integer categoryId);
}
