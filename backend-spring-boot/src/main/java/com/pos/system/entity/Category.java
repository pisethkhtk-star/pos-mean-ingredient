package com.pos.system.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.util.Map;

@Entity
@Table(name = "categories")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column
    private String icon;

    @Transient
    @JsonProperty("_count")
    private Map<String, Long> count;

    public Category() {}

    public Category(String name, String icon) {
        this.name = name;
        this.icon = icon;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public Map<String, Long> getCount() { return count; }
    public void setCount(Map<String, Long> count) { this.count = count; }
}
