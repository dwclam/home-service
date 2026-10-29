package com.homeservice.catalog.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "categories")
@Getter
@Setter
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Category parent;

    private String name;

    private String slug;

    private String description;

    private String iconName;

    @Column(name = "sort_order", nullable = false)

    @Column(name = "is_active", nullable = false)
}