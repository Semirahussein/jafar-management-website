package com.jafar.management.service;

import com.jafar.management.dto.enums.ReportStatus;
import com.jafar.management.dto.enums.ReportType;
import com.jafar.management.model.Report;
import com.jafar.management.repository.BranchRepository;
import com.jafar.management.repository.ReportRepository;
import org.apache.pdfbox.Loader;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.io.ByteArrayInputStream;
import java.lang.reflect.Proxy;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;

class ReportExportServiceTest {
    @Test
    void exportsFilteredReportAsReadableExcelWithMetadataAndContent() throws Exception {
        Report report = report();
        ReportExportService service = service(report, 1, new AtomicBoolean());
        byte[] file = service.export("xlsx", 4L, null, ReportStatus.REVIEWED, ReportType.TEACHER_TO_MANAGER,
                report.getPeriodStart(), report.getPeriodEnd());

        try (var workbook = WorkbookFactory.create(new ByteArrayInputStream(file))) {
            var sheet = workbook.getSheetAt(0);
            assertEquals("JAFAR Management · Report export", sheet.getRow(0).getCell(0).getStringCellValue());
            assertTrue(sheet.getRow(2).getCell(1).getStringCellValue().contains("REVIEWED"));
            assertEquals("A saved report body", sheet.getRow(4).getCell(11).getStringCellValue());
        }
    }

    @Test
    void exportsFilteredReportAsReadablePdf() throws Exception {
        ReportExportService service = service(report(), 1, new AtomicBoolean());
        byte[] file = service.export("pdf", 4L, null, null, null, null, null);
        try (var pdf = Loader.loadPDF(file)) {
            assertEquals(1, pdf.getNumberOfPages());
            assertTrue(file.length > 500);
        }
    }

    @Test
    void stopsBeforeLoadingRowsWhenExportLimitIsExceeded() {
        AtomicBoolean rowsLoaded = new AtomicBoolean();
        ReportExportService service = service(report(), (long) ReportExportService.MAX_EXPORT_RECORDS + 1, rowsLoaded);
        assertThrows(IllegalArgumentException.class,
                () -> service.export("xlsx", null, null, null, null, null, null));
        assertFalse(rowsLoaded.get());
    }

    private ReportExportService service(Report report, long total, AtomicBoolean rowsLoaded) {
        ReportRepository reports = proxy(ReportRepository.class, (proxy, method, args) -> switch (method.getName()) {
            case "searchReports" -> new PageImpl<>(List.of(), (Pageable) args[6], total);
            case "findAllMatching" -> { rowsLoaded.set(true); yield List.of(report); }
            default -> null;
        });
        BranchRepository branches = proxy(BranchRepository.class, (proxy, method, args) ->
                method.getName().equals("findAllById") ? List.of() : null);
        return new ReportExportService(reports, branches, Clock.system(ZoneId.of("Africa/Addis_Ababa")));
    }

    private Report report() {
        Report report = new Report();
        report.setId(7L); report.setAuthorId(2L); report.setBranchId(4L);
        report.setTitle("Weekly class report"); report.setContent("A saved report body");
        report.setReportType(ReportType.TEACHER_TO_MANAGER); report.setStatus(ReportStatus.REVIEWED);
        report.setPeriodStart(LocalDate.of(2026, 10, 19)); report.setPeriodEnd(LocalDate.of(2026, 10, 25));
        return report;
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, java.lang.reflect.InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, handler);
    }
}
