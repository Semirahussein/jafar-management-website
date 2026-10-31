package com.jafar.management.model;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.jafar.management.dto.enums.UserRole;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Entity
@Table(name = "app_users")
public class AppUser implements UserDetails {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String username;

    @JsonIgnore
    @Column(nullable = false, length = 100)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private UserRole role;

    private Long branchId;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "app_user_additional_branches", joinColumns = @JoinColumn(name = "app_user_id"))
    @Column(name = "branch_id", nullable = false)
    private Set<Long> additionalBranchIds = new LinkedHashSet<>();

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean active = true;

    protected AppUser() {}

    public AppUser(String username, String passwordHash, UserRole role, Long branchId) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.role = role;
        this.branchId = branchId;
        this.active = true;
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public UserRole getRole() { return role; }
    public Long getBranchId() { return branchId; }
    public Set<Long> getBranchIds() {
        Set<Long> branchIds = new LinkedHashSet<>();
        if (branchId != null) branchIds.add(branchId);
        branchIds.addAll(additionalBranchIds);
        return branchIds;
    }
    public boolean isActive() { return active; }
    public void setUsername(String username) { this.username = username; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void setRole(UserRole role) { this.role = role; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
    public void setBranchIds(java.util.Collection<Long> values) {
        Set<Long> branchIds = new LinkedHashSet<>(values);
        branchId = branchIds.stream().findFirst().orElse(null);
        additionalBranchIds.clear();
        additionalBranchIds.addAll(branchIds);
        if (branchId != null) additionalBranchIds.remove(branchId);
    }
    public boolean canAccessBranch(Long requestedBranchId) {
        return requestedBranchId != null && getBranchIds().contains(requestedBranchId);
    }
    public void setActive(boolean active) { this.active = active; }

    @Override @JsonIgnore
    public String getPassword() { return passwordHash; }
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return active; }
}
