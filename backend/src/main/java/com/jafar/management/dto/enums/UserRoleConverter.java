package com.jafar.management.dto.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class UserRoleConverter implements AttributeConverter<UserRole, String> {
    @Override
    public String convertToDatabaseColumn(UserRole role) {
        return role == null ? null : role.name();
    }

    @Override
    public UserRole convertToEntityAttribute(String role) {
        if ("CENTRAL_MANAGER".equals(role)) {
            return UserRole.ADMINISTRATOR;
        }
        return role == null ? null : UserRole.valueOf(role);
    }
}
