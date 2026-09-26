package com.pos.system.dto;

import com.pos.system.entity.Role;
import java.util.List;

public class RoleUpdateRequest {
    private Role role;
    private List<String> pages;

    public RoleUpdateRequest() {}

    public RoleUpdateRequest(Role role, List<String> pages) {
        this.role = role;
        this.pages = pages;
    }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public List<String> getPages() { return pages; }
    public void setPages(List<String> pages) { this.pages = pages; }
}
