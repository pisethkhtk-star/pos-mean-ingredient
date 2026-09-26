package com.pos.system.repository;

import com.pos.system.entity.Ingredient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface IngredientRepository extends JpaRepository<Ingredient, Integer> {
    Optional<Ingredient> findByCode(String code);
    boolean existsByCode(String code);

    List<Ingredient> findAllByOrderByNameAsc();

    @Query("SELECT i FROM Ingredient i WHERE " +
           "LOWER(i.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(i.code) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "ORDER BY i.name ASC")
    List<Ingredient> searchIngredients(@Param("query") String query);
}
