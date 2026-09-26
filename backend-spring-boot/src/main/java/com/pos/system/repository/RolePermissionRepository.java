package com.pos.system.repository;

import com.pos.system.entity.Role;
import com.pos.system.entity.RolePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermission, Integer> {
    Optional<RolePermission> findByRole(Role role);
    List<RolePermission> findAllByOrderByRoleAsc();
}
