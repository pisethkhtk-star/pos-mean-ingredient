package com.pos.system.service;

import com.pos.system.dto.CategoryRequest;
import com.pos.system.entity.Category;
import com.pos.system.repository.CategoryRepository;
import com.pos.system.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public CategoryService(CategoryRepository categoryRepository, ProductRepository productRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
    }

    public List<Category> getAllCategories() {
        List<Category> categories = categoryRepository.findAllByOrderByNameAsc();
        for (Category cat : categories) {
            long count = productRepository.countByCategoryId(cat.getId());
            cat.setCount(Map.of("products", count));
        }
        return categories;
    }

    @Transactional
    public Category createCategory(CategoryRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category name is required");
        }

        String name = request.getName().trim();
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category name already exists");
        }

        Category category = new Category(name, request.getIcon());
        Category saved = categoryRepository.save(category);
        saved.setCount(Map.of("products", 0L));
        return saved;
    }

    @Transactional
    public Category updateCategory(Integer id, CategoryRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category name is required");
        }

        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));

        String newName = request.getName().trim();
        if (!category.getName().equalsIgnoreCase(newName) && categoryRepository.existsByNameIgnoreCase(newName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category name already exists");
        }

        category.setName(newName);
        if (request.getIcon() != null) {
            category.setIcon(request.getIcon());
        }

        Category updated = categoryRepository.save(category);
        long count = productRepository.countByCategoryId(updated.getId());
        updated.setCount(Map.of("products", count));
        return updated;
    }

    @Transactional
    public void deleteCategory(Integer id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));

        long count = productRepository.countByCategoryId(id);
        if (count > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete category that contains products");
        }

        categoryRepository.delete(category);
    }
}
