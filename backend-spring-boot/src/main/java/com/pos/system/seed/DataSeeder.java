package com.pos.system.seed;

import com.pos.system.entity.Category;
import com.pos.system.entity.Role;
import com.pos.system.entity.RolePermission;
import com.pos.system.entity.User;
import com.pos.system.repository.CategoryRepository;
import com.pos.system.repository.RolePermissionRepository;
import com.pos.system.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final CategoryRepository categoryRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(
        UserRepository userRepository,
        RolePermissionRepository rolePermissionRepository,
        CategoryRepository categoryRepository,
        PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.categoryRepository = categoryRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // 1. Seed Admin User
        String adminEmail = "admin@pos.com";
        if (!userRepository.existsByEmail(adminEmail)) {
            User admin = new User(
                "Admin User",
                adminEmail,
                passwordEncoder.encode("Admin@123"),
                Role.ADMIN
            );
            userRepository.save(admin);
            System.out.println("✅ Seeded default admin user: " + adminEmail);
        }

        // 2. Seed Role Permissions
        List<String> adminPages = List.of(
            "/", "/pos", "/products", "/categories", "/ingredients",
            "/discounts", "/inventory", "/purchases", "/suppliers",
            "/customers", "/orders", "/reports", "/users", "/settings", "/roles"
        );
        List<String> managerPages = List.of(
            "/", "/pos", "/products", "/categories", "/ingredients",
            "/discounts", "/inventory", "/purchases", "/suppliers",
            "/customers", "/orders"
        );
        List<String> cashierPages = List.of("/pos");

        if (rolePermissionRepository.findByRole(Role.ADMIN).isEmpty()) {
            rolePermissionRepository.save(new RolePermission(Role.ADMIN, adminPages));
        }
        if (rolePermissionRepository.findByRole(Role.MANAGER).isEmpty()) {
            rolePermissionRepository.save(new RolePermission(Role.MANAGER, managerPages));
        }
        if (rolePermissionRepository.findByRole(Role.CASHIER).isEmpty()) {
            rolePermissionRepository.save(new RolePermission(Role.CASHIER, cashierPages));
        }

        // 3. Seed Default Categories if empty
        if (categoryRepository.count() == 0) {
            categoryRepository.saveAll(List.of(
                new Category("Beverages", "Coffee"),
                new Category("Snacks", "Cookie"),
                new Category("Main Course", "Utensils"),
                new Category("Desserts", "IceCream"),
                new Category("Merchandise", "Shirt")
            ));
            System.out.println("✅ Seeded default categories");
        }
    }
}
