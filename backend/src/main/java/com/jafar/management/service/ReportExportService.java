package com.jafar.management.service;

import com.jafar.management.model.Branch;
import com.jafar.management.model.Report;
import com.jafar.management.repository.BranchRepository;
import com.jafar.management.repository.ReportRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Clock;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ReportExportService {
    public static final int MAX_EXPORT_RECORDS = 10_000;
    private final ReportRepository reports;
    private final BranchRepository branches;
    private final Clock clock;

    public ReportExportService(ReportRepository reports, BranchRepository branches, Clock clock) {
        this.reports = reports;
        this.branches = branches;
        this.clock = clock;
    }

    public byte[] export(String format, Long branchId, Long authorId, com.jafar.management.dto.enums.ReportStatus status,
            com.jafar.management.dto.enums.ReportType type, java.time.LocalDate periodStart,
            java.time.LocalDate periodEnd) {
        long count = reports.searchReports(branchId, authorId, status, type, periodStart, periodEnd,
                org.springframework.data.domain.PageRequest.of(0, 1)).getTotalElements();
        if (count > MAX_EXPORT_RECORDS) throw new IllegalArgumentException("Export exceeds the 10,000 report limit. Narrow the filters and try again.");
        List<Report> rows = reports.findAllMatching(branchId, authorId, status, type, periodStart, periodEnd, MAX_EXPORT_RECORDS);
        Map<Long, String> branchNames = new HashMap<>();
        branches.findAllById(rows.stream().map(Report::getBranchId).distinct().toList())
                .forEach(branch -> branchNames.put(branch.getId(), branch.getName()));
        return switch (format.toLowerCase()) {
            case "xlsx" -> workbook(rows, branchNames, branchId, authorId, status, type, periodStart, periodEnd);
            case "pdf" -> pdf(rows, branchNames, branchId, authorId, status, type, periodStart, periodEnd);
            default -> throw new IllegalArgumentException("Supported export formats are pdf and xlsx");
        };
    }

    private byte[] workbook(List<Report> rows, Map<Long, String> branchNames, Long branchId, Long authorId,
            com.jafar.management.dto.enums.ReportStatus status, com.jafar.management.dto.enums.ReportType type,
            java.time.LocalDate periodStart, java.time.LocalDate periodEnd) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Reports");
            Row meta = sheet.createRow(0);
            meta.createCell(0).setCellValue("JAFAR Management · Report export");
            Row generated = sheet.createRow(1);
            generated.createCell(0).setCellValue("Generated");
            generated.createCell(1).setCellValue(ZonedDateTime.now(clock).format(DateTimeFormatter.ISO_ZONED_DATE_TIME));
            generated.createCell(2).setCellValue("Records: " + rows.size());
            Row filters = sheet.createRow(2);
            filters.createCell(0).setCellValue("Filters");
            filters.createCell(1).setCellValue("Scope: " + scopeLabel(branchId, authorId, branchNames)
                    + " | Type: " + text(type) + " | Status: " + text(status) + " | Period overlap: " + text(periodStart) + " to " + text(periodEnd));
            String[] headers = {"Report ID", "Title", "Type", "Branch", "Period start", "Period end", "Status", "Author ID", "Created", "Submitted", "Reviewed", "Content", "Review remarks"};
            Row header = sheet.createRow(3);
            CellStyle style = workbook.createCellStyle();
            style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            org.apache.poi.ss.usermodel.Font font = workbook.createFont();
            font.setBold(true); font.setColor(IndexedColors.WHITE.getIndex()); style.setFont(font);
            for (int i = 0; i < headers.length; i++) { var cell = header.createCell(i); cell.setCellValue(headers[i]); cell.setCellStyle(style); }
            int rowIndex = 4;
            for (Report report : rows) {
                Row row = sheet.createRow(rowIndex++);
                Object[] values = { report.getId(), report.getTitle(), report.getReportType().name(),
                        branchNames.getOrDefault(report.getBranchId(), "Branch " + report.getBranchId()),
                        report.getPeriodStart().toString(), report.getPeriodEnd().toString(), report.getStatus().name(),
                        report.getAuthorId(), text(report.getCreatedAt()), text(report.getSubmittedAt()), text(report.getReviewedAt()),
                        report.getContent(), report.getReviewRemarks() };
                for (int i = 0; i < values.length; i++) if (values[i] != null) {
                    if (values[i] instanceof Number n) row.createCell(i).setCellValue(n.doubleValue());
                    else row.createCell(i).setCellValue(values[i].toString());
                }
            }
            sheet.createFreezePane(0, 4);
            sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(3, Math.max(3, rowIndex - 1), 0, headers.length - 1));
            int[] widths = {12, 32, 24, 26, 15, 15, 14, 13, 24, 24, 24, 60, 40};
            for (int i = 0; i < widths.length; i++) sheet.setColumnWidth(i, widths[i] * 256);
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) { throw new IllegalStateException("Could not create Excel report export", e); }
    }

    private byte[] pdf(List<Report> rows, Map<Long, String> branchNames, Long branchId, Long authorId,
            com.jafar.management.dto.enums.ReportStatus status, com.jafar.management.dto.enums.ReportType type,
            java.time.LocalDate periodStart, java.time.LocalDate periodEnd) {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            List<String> lines = new java.util.ArrayList<>();
            lines.add("JAFAR MANAGEMENT - REPORT EXPORT");
            lines.add("Generated: " + ZonedDateTime.now(clock).format(DateTimeFormatter.ISO_ZONED_DATE_TIME));
            lines.add("Reports: " + rows.size());
            lines.add("Filters - Scope: " + scopeLabel(branchId, authorId, branchNames)
                    + " | Type: " + text(type) + " | Status: " + text(status));
            lines.add("Period overlap: " + text(periodStart) + " to " + text(periodEnd));
            lines.add("");
            if (rows.isEmpty()) lines.add("No reports matched the selected filters.");
            for (Report r : rows) {
                lines.add("Report #" + r.getId() + " | " + r.getTitle());
                lines.add("Type: " + r.getReportType() + " | Status: " + r.getStatus() + " | Branch: " + branchNames.getOrDefault(r.getBranchId(), "Branch " + r.getBranchId()));
                lines.add("Period: " + r.getPeriodStart() + " to " + r.getPeriodEnd() + " | Author account: " + r.getAuthorId());
                lines.add("Created: " + text(r.getCreatedAt()) + " | Submitted: " + text(r.getSubmittedAt()) + " | Reviewed: " + text(r.getReviewedAt()));
                lines.add("Content:");
                lines.addAll(wrap(r.getContent(), 94));
                if (r.getReviewRemarks() != null && !r.getReviewRemarks().isBlank()) {
                    lines.add("Review remarks:"); lines.addAll(wrap(r.getReviewRemarks(), 94));
                }
                lines.add("");
            }
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            int index = 0;
            while (index < lines.size()) {
                PDPage page = new PDPage(PDRectangle.LETTER); document.addPage(page);
                try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                    stream.beginText(); stream.setFont(font, 9); stream.setLeading(13); stream.newLineAtOffset(42, 750);
                    for (int line = 0; line < 54 && index < lines.size(); line++, index++) {
                        stream.showText(ascii(lines.get(index))); stream.newLine();
                    }
                    stream.endText();
                }
            }
            document.save(out); return out.toByteArray();
        } catch (IOException e) { throw new IllegalStateException("Could not create PDF report export", e); }
    }

    private static String text(Object value) { return value == null ? "" : value.toString(); }
    private static String scopeLabel(Long branchId, Long authorId, Map<Long, String> branchNames) {
        if (authorId != null) return "Teacher-authored reports (account #" + authorId + ")";
        return branchId == null ? "All authorized branches" : branchNames.getOrDefault(branchId, "Branch " + branchId);
    }
    private static String ascii(String value) {
        String safe = value == null ? "" : value.replaceAll("[\\r\\n\\t]+", " ");
        StringBuilder result = new StringBuilder(safe.length());
        for (char c : safe.toCharArray()) result.append(c >= 32 && c <= 126 ? c : '?');
        return result.toString();
    }
    private static List<String> wrap(String value, int width) {
        String normalized = ascii(value).replaceAll("\\s+", " ").trim();
        if (normalized.isEmpty()) return List.of("");
        java.util.ArrayList<String> lines = new java.util.ArrayList<>();
        while (normalized.length() > width) {
            int split = normalized.lastIndexOf(' ', width);
            if (split < 1) split = width;
            lines.add(normalized.substring(0, split)); normalized = normalized.substring(split).stripLeading();
        }
        lines.add(normalized); return lines;
    }
}
