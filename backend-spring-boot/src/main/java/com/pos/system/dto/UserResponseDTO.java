package com.pos.system.dto;

import com.pos.system.entity.Role;
import java.util.List;

public class UserResponseDTO {
    private Integer id;
    private String email;
    private String name;
    private Role role;
    private List<String> permissions;

    public UserResponseDTO() {}

    public UserResponseDTO(Integer id, String email, String name, Role role, List<String> permissions) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.role = role;
        this.permissions = permissions;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public List<String> getPermissions() { return permissions; }
    public void setPermissions(List<String> permissions) { this.permissions = permissions; }
}
