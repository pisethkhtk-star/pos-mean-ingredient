package com.pos.system.repository;

import com.pos.system.entity.ProductIngredient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProductIngredientRepository extends JpaRepository<ProductIngredient, Integer> {
    List<ProductIngredient> findByProductId(Integer productId);
    void deleteByProductId(Integer productId);
    long countByIngredientId(Integer ingredientId);
}
