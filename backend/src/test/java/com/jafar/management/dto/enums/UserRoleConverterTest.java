package com.jafar.management.dto.enums;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

class UserRoleConverterTest {
    private final UserRoleConverter converter = new UserRoleConverter();

    @Test
    void exposesOnlyTheThreeSupportedRoles() {
        assertArrayEquals(new UserRole[] {
                UserRole.ADMINISTRATOR,
                UserRole.BRANCH_MANAGER,
                UserRole.QURAN_TEACHER
        }, UserRole.values());
    }

    @Test
    void treatsPreviouslyStoredCentralManagerRoleAsAdministrator() {
        assertEquals(UserRole.ADMINISTRATOR, converter.convertToEntityAttribute("CENTRAL_MANAGER"));
        assertEquals("ADMINISTRATOR", converter.convertToDatabaseColumn(UserRole.ADMINISTRATOR));
    }
}
