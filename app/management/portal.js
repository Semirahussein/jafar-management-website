"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createApiClient } from "../lib/api";
import { REPORT_TIME_ZONE, reportToday, resolveReportPeriod } from "../lib/report-period.mjs";
import "./portal.css";

const localToday = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const blankStudent = { fullName: "", studentNumber: "", gender: "", dateOfBirth: "", guardianName: "", guardianPhone: "", branchId: "", teacherId: "", enrollmentDate: localToday(), currentLevel: "" };
const initialStudentQuery = { q: "", branchId: "", teacherId: "", teacherName: "", page: 0, size: 10 };
const initialTeacherQuery = { q: "", branchId: "", active: "", page: 0, size: 10 };
const blankTeacher = { username: "", password: "", fullName: "", email: "", phone: "", branchId: "" };
const blankUser = { username: "", password: "", role: "BRANCH_MANAGER", branchId: "", fullName: "", email: "", phone: "" };

function AttendanceSummary({ title, summary }) {
  if (!summary) return <article className="portal-card"><h2>{title}</h2><p>This attendance summary is not available.</p></article>;
  const values = [["Present", summary.present], ["Absent", summary.absent], ["Late", summary.late], ["Excused", summary.excused], ["Total records", summary.total]];
  return <article className="portal-card"><h2>{title}</h2><div className="portal-stats">{values.map(([label, value]) => <div className="portal-card stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></article>;
}

export default function ManagementPortal() {
  const [user, setUser] = useState(null);
  const [login, setLogin] = useState({ username: "", password: "", rememberMe: false });
  const [section, setSection] = useState("Dashboard");
  const [data, setData] = useState({ dashboard: null, students: [], branches: [], users: [], teachers: [] });
  const [studentQuery, setStudentQuery] = useState(initialStudentQuery);
  const [studentPage, setStudentPage] = useState({ totalElements: 0, totalPages: 0, number: 0, size: 10 });
  const [teacherQuery, setTeacherQuery] = useState(initialTeacherQuery);
  const [teacherPage, setTeacherPage] = useState({ totalElements: 0, totalPages: 0, number: 0, size: 10 });
  const [teacherForm, setTeacherForm] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [teacherAttendance, setTeacherAttendance] = useState([]);
  const [attendanceRoster, setAttendanceRoster] = useState([]);
  const [quranProgress, setQuranProgress] = useState([]);
  const [progressRoster, setProgressRoster] = useState([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressQuery, setProgressQuery] = useState({ studentId: "", teacherId: "", branchId: "", studentName: "", teacherName: "", surahName: "", startDate: "", endDate: "", page: 0, size: 20 });
  const [progressPage, setProgressPage] = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [progressForm, setProgressForm] = useState(null);
  const [studentAttendanceQuery, setStudentAttendanceQuery] = useState({ startDate: localToday(), endDate: localToday(), studentId: "", q: "", branchId: "", status: "", page: 0, size: 20 });
  const [teacherAttendanceQuery, setTeacherAttendanceQuery] = useState({ startDate: localToday(), endDate: localToday(), teacherId: "", q: "", branchId: "", status: "", page: 0, size: 20 });
  const [studentAttendancePage, setStudentAttendancePage] = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [teacherAttendancePage, setTeacherAttendancePage] = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [branchQuery, setBranchQuery] = useState({ q: "", active: "", page: 0, size: 20 });
  const [branchPage, setBranchPage] = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [branchRows, setBranchRows] = useState([]);
  const [reportQuery, setReportQuery] = useState({ type: "", status: "", branchId: "", periodStart: "", periodEnd: "", page: 0, size: 20 });
  const [reports, setReports] = useState([]);
  const [reportPage, setReportPage] = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [reportAnalytics, setReportAnalytics] = useState(null);
  const [exporting, setExporting] = useState("");
  const [notificationQuery, setNotificationQuery] = useState({ q: "", status: "", notificationType: "", studentId: "", branchId: "", startDate: "", endDate: "", page: 0, size: 20 });
  const [notifications, setNotifications] = useState([]);
  const [notificationPage, setNotificationPage] = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [notificationForm, setNotificationForm] = useState(null);
  const [notificationStudents, setNotificationStudents] = useState([]);
  const [notificationStudentSearch, setNotificationStudentSearch] = useState("");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notificationAttempts, setNotificationAttempts] = useState([]);
  const [notificationBusyId, setNotificationBusyId] = useState(null);
  const [reportForm, setReportForm] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewForm, setReviewForm] = useState(null);
  const [studentAttendanceForm, setStudentAttendanceForm] = useState(null);
  const [teacherAttendanceForm, setTeacherAttendanceForm] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [studentForm, setStudentForm] = useState(null);
  const [branchForm, setBranchForm] = useState(null);
  const [userForm, setUserForm] = useState(null);
  const [userFilter, setUserFilter] = useState({ q: "", role: "", active: "", page: 0, size: 20 });
  const [userPage, setUserPage] = useState({ totalElements: 0, totalPages: 0, number: 0 });
  const [showResetInfo, setShowResetInfo] = useState(false);
  const isAdmin = user?.role === "ADMINISTRATOR";
  const isManager = user?.role === "BRANCH_MANAGER";
  const isTeacher = user?.role === "QURAN_TEACHER";

  const api = useMemo(() => createApiClient(), []);
  const load = useCallback(async (client = api, query = initialStudentQuery) => {
    if (!client) return;
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(query.page), size: String(query.size) });
      if (query.q.trim()) params.set("q", query.q.trim());
      if (query.branchId) params.set("branchId", query.branchId);
      if (query.teacherId) params.set("teacherId", query.teacherId);
      if (query.teacherName.trim()) params.set("teacherName", query.teacherName.trim());
      const dashboardRequest = client("/dashboard").then(dashboard => {
        setData(current => ({ ...current, dashboard }));
        return dashboard;
      }).catch(e => {
        setData(current => ({ ...current, dashboard: null }));
        throw e;
      });
      const [dashboard, studentResults, branches] = await Promise.all([
        dashboardRequest, client(`/students/search?${params}`), client("/branches"),
      ]);
      const isAdmin = dashboard.totalBranches !== undefined;
      const isManager = dashboard.totalStudents !== undefined;
      const [users, teachers] = await Promise.all([
        isAdmin ? client("/users/search?page=0&size=20") : Promise.resolve({ content: [], totalElements: 0, totalPages: 0, number: 0 }),
        isAdmin || isManager
          ? client("/users/teachers/search?page=0&size=100").then(result => result.content)
          : Promise.resolve([]),
      ]);
      setData({ dashboard, students: studentResults.content, branches, users: users.content, teachers });
      setUserPage({ totalElements: users.totalElements, totalPages: users.totalPages, number: users.number });
      setStudentPage({ totalElements: studentResults.totalElements, totalPages: studentResults.totalPages, number: studentResults.number, size: studentResults.size });
    } catch (e) {
      setError(e.message);
      if (e.status === 401) setUser(null);
    } finally { setLoading(false); }
  }, [api]);

  async function refreshDashboard() {
    try {
      const dashboard = await api("/dashboard");
      setData(current => ({ ...current, dashboard }));
      setError("");
    } catch (e) {
      setData(current => ({ ...current, dashboard: null }));
      setError(e.message);
      if (e.status === 401) setUser(null);
    }
  }

  const loadTeachers = useCallback(async (query = teacherQuery) => {
    setTeacherLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(query.page), size: String(query.size) });
      if (query.q.trim()) params.set("q", query.q.trim());
      if (query.branchId) params.set("branchId", query.branchId);
      if (isAdmin && query.active) params.set("active", query.active);
      const result = await api(`/users/teachers/search?${params}`);
      setData(current => ({ ...current, teachers: result.content }));
      setTeacherPage({ totalElements: result.totalElements, totalPages: result.totalPages, number: result.number, size: result.size });
    } catch (e) { setError(e.message); if (e.status === 401) setUser(null); }
    finally { setTeacherLoading(false); }
  }, [api, isAdmin, teacherQuery]);

  async function loadUsers(query = userFilter) {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(query.page), size: String(query.size) });
      if (query.q.trim()) params.set("q", query.q.trim());
      if (query.role) params.set("role", query.role);
      if (query.active) params.set("active", query.active);
      const result = await api(`/users/search?${params}`);
      setData(current => ({ ...current, users: result.content }));
      setUserPage({ totalElements: result.totalElements, totalPages: result.totalPages, number: result.number });
    } catch (e) { setError(e.message); if (e.status === 401) setUser(null); }
    finally { setLoading(false); }
  }

  async function loadBranches(query = branchQuery) {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(query.page), size: String(query.size) });
      if (query.q.trim()) params.set("q", query.q.trim());
      if (isAdmin && query.active) params.set("active", query.active);
      const result = await api(`/branches/search?${params}`);
      setBranchRows(result.content);
      setBranchPage({ totalElements: result.totalElements, totalPages: result.totalPages, number: result.number });
    } catch (e) { setError(e.message); if (e.status === 401) setUser(null); }
    finally { setLoading(false); }
  }

  async function loadReports(query = reportQuery) {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(query.page), size: String(query.size) });
      for (const key of ["type", "status", "branchId", "periodStart", "periodEnd"]) if (query[key]) params.set(key, query[key]);
      const analyticsParams = new URLSearchParams(params);
      analyticsParams.delete("page"); analyticsParams.delete("size");
      const [result, analytics] = await Promise.all([api(`/reports?${params}`), api(`/reports/analytics?${analyticsParams}`)]);
      setReports(result.content);
      setReportPage({ totalElements: result.totalElements, totalPages: result.totalPages, number: result.number });
      setReportAnalytics(analytics);
    } catch (e) { setError(e.message); if (e.status === 401) setUser(null); }
    finally { setLoading(false); }
  }

  async function exportReports(format) {
    setExporting(format); setError(""); setNotice("");
    try {
      const params = new URLSearchParams({ format });
      for (const key of ["type", "status", "branchId", "periodStart", "periodEnd"]) if (reportQuery[key]) params.set(key, reportQuery[key]);
      await api.download(`/reports/export?${params}`, `jafar-reports.${format}`);
      setNotice(`${format.toUpperCase()} report export downloaded.`);
    } catch (e) { setError(e.message); if (e.status === 401) setUser(null); }
    finally { setExporting(""); }
  }

  async function loadNotifications(query = notificationQuery) {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(query.page), size: String(query.size) });
      for (const key of ["q", "status", "notificationType", "studentId", "startDate", "endDate"]) if (query[key]) params.set(key, query[key]);
      if (query.branchId && isAdmin) params.set("branchId", query.branchId);
      const result = await api(`/notifications?${params}`);
      setNotifications(result.content);
      setNotificationPage({ totalElements: result.totalElements, totalPages: result.totalPages, number: result.number });
    } catch (e) { setError(e.message); if (e.status === 401) setUser(null); }
    finally { setLoading(false); }
  }

  async function searchNotificationStudents(query) {
    setNotificationStudentSearch(query);
    try {
      const params = new URLSearchParams({ page: "0", size: "20" });
      if (query.trim()) params.set("q", query.trim());
      const result = await api(`/students/search?${params}`);
      setNotificationStudents(result.content);
    } catch (e) { setError(e.message); if (e.status === 401) setUser(null); }
  }

  function createNotificationDraft() {
    const idempotencyKey = globalThis.crypto?.randomUUID?.() || `notification-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setNotificationForm({ studentId: "", notificationType: "PROGRESS_UPDATE", content: "", relatedProgressId: "", idempotencyKey });
    setNotificationStudents([]); setNotificationStudentSearch(""); setSelectedNotification(null);
  }

  async function saveNotification(event) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const selected = notificationStudents.find(student => String(student.id) === String(notificationForm.studentId));
      if (!selected || !selected.guardianName?.trim() || !selected.guardianPhone?.trim()) {
        setError("Select a student with a saved guardian name and contact number before creating the notification."); return;
      }
      await api("/notifications", { method: "POST", headers: { "Idempotency-Key": notificationForm.idempotencyKey }, body: {
        studentId: Number(notificationForm.studentId), notificationType: notificationForm.notificationType,
        content: notificationForm.content.trim(), relatedProgressId: notificationForm.relatedProgressId ? Number(notificationForm.relatedProgressId) : null,
      } });
      setNotificationForm(null); setNotice("Notification saved as pending. No external delivery provider is configured; it has not been sent.");
      await loadNotifications();
    } catch (e) { setError(e.message); if (e.status === 401) setUser(null); }
    finally { setSaving(false); }
  }

  async function deliverNotification(notification) {
    setNotificationBusyId(notification.id); setError(""); setNotice("");
    try {
      const saved = await api(`/notifications/${notification.id}/send`, { method: "PUT" });
      setSelectedNotification(saved); setNotice(saved.deliveryStatus === "DELIVERED" ? "Provider confirmed delivery." : "Provider accepted the notification; delivery is not yet confirmed.");
      await loadNotificationAttempts(notification.id);
      await loadNotifications();
    } catch (e) {
      if (e.data?.notification) {
        setSelectedNotification(e.data.notification);
        await loadNotificationAttempts(notification.id);
        await loadNotifications();
      }
      setError(e.message); if (e.status === 401) setUser(null);
    }
    finally { setNotificationBusyId(null); }
  }

  async function loadNotificationAttempts(id) {
    try { setNotificationAttempts(await api(`/notifications/${id}/attempts`)); }
    catch (e) { setNotificationAttempts([]); if (e.status === 401) setUser(null); }
  }

  async function openNotification(notification) {
    setSelectedNotification(notification); setNotificationAttempts([]);
    try {
      const [detail, attempts] = await Promise.all([api(`/notifications/${notification.id}`), api(`/notifications/${notification.id}/attempts`)]);
      setSelectedNotification(detail); setNotificationAttempts(attempts);
    } catch (e) { setError(e.message); if (e.status === 401) setUser(null); }
  }

  async function deleteNotification(notification) {
    if (!window.confirm("Delete this pending notification?")) return;
    setNotificationBusyId(notification.id); setError(""); setNotice("");
    try {
      await api(`/notifications/${notification.id}`, { method: "DELETE" });
      if (selectedNotification?.id === notification.id) setSelectedNotification(null);
      setNotice("Pending notification deleted."); await loadNotifications();
    } catch (e) { setError(e.message); if (e.status === 401) setUser(null); }
    finally { setNotificationBusyId(null); }
  }

  function createReportDraft() {
    const today = reportToday();
    const type = isTeacher ? "TEACHER_TO_MANAGER" : "MANAGER_TO_ADMIN";
    setReportForm({ title: "", content: "", reportType: type, periodMode: "DAILY", anchorDate: today, periodStart: today, periodEnd: today });
    setSelectedReport(null);
  }

  function changeReportPeriodMode(mode) {
    const anchorDate = reportForm.anchorDate || reportToday();
    setReportForm({ ...reportForm, periodMode: mode, ...resolveReportPeriod(mode, anchorDate) });
  }

  function changeReportAnchorDate(anchorDate) {
    setReportForm({ ...reportForm, anchorDate, ...resolveReportPeriod(reportForm.periodMode, anchorDate) });
  }

  async function saveReportDraft(event) {
    event.preventDefault(); setError(""); setNotice("");
    if (!reportForm.periodStart || !reportForm.periodEnd || reportForm.periodStart > reportForm.periodEnd) {
      setError("Choose a valid reporting period. The start date must not be after the end date."); return;
    }
    setSaving(true);
    try {
      const payload = { title: reportForm.title.trim(), content: reportForm.content.trim(), reportType: reportForm.reportType,
        periodStart: reportForm.periodStart, periodEnd: reportForm.periodEnd };
      const saved = await api(reportForm.id ? `/reports/${reportForm.id}` : "/reports", { method: reportForm.id ? "PUT" : "POST", body: payload });
      setReportForm(null); setSelectedReport(saved); setNotice(reportForm.id ? "Draft updated." : "Report draft saved.");
      await loadReports();
    } catch (e) { setError(e.message); if (e.status === 401) setUser(null); }
    finally { setSaving(false); }
  }

  async function submitReport(id) {
    setSaving(true); setError(""); setNotice("");
    try {
      const saved = await api(`/reports/${id}/submit`, { method: "PUT" });
      setSelectedReport(saved); setNotice("Report submitted for review."); await loadReports();
    } catch (e) { setError(e.message); if (e.status === 401) setUser(null); }
    finally { setSaving(false); }
  }

  async function reviewReport(event) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const saved = await api(`/reports/${reviewForm.id}/review`, { method: "PUT", body: { reviewRemarks: reviewForm.reviewRemarks.trim() || null } });
      setSelectedReport(saved); setReviewForm(null); setNotice("Report marked as reviewed."); await loadReports();
    } catch (e) { setError(e.message); if (e.status === 401) setUser(null); }
    finally { setSaving(false); }
  }

  async function deleteReportDraft(report) {
    if (!window.confirm(`Delete draft “${report.title}”?`)) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await api(`/reports/${report.id}`, { method: "DELETE" });
      setSelectedReport(null); setNotice("Draft deleted."); await loadReports();
    } catch (e) { setError(e.message); if (e.status === 401) setUser(null); }
    finally { setSaving(false); }
  }

  async function loadStudentAttendance(query = studentAttendanceQuery) {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(query.page), size: String(query.size) });
      if (query.startDate) params.set("startDate", query.startDate);
      if (query.endDate) params.set("endDate", query.endDate);
      if (query.studentId) params.set("studentId", query.studentId);
      if (query.branchId && isAdmin) params.set("branchId", query.branchId);
      if (query.status) params.set("status", query.status);
      if (query.q.trim()) params.set("q", query.q.trim());
      const [result, rosterPage] = await Promise.all([api(`/student-attendance?${params}`), api("/students/search?page=0&size=100")]);
      setStudentAttendance(result.content); setStudentAttendancePage({ totalElements: result.totalElements, totalPages: result.totalPages, number: result.number }); setAttendanceRoster(rosterPage.content);
    } catch (e) { setError(e.message); if (e.status === 401) setUser(null); }
    finally { setLoading(false); }
  }

  async function loadTeacherAttendance(query = teacherAttendanceQuery) {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(query.page), size: String(query.size) });
      if (query.startDate) params.set("startDate", query.startDate);
      if (query.endDate) params.set("endDate", query.endDate);
      if (query.teacherId) params.set("teacherId", query.teacherId);
      if (query.branchId && isAdmin) params.set("branchId", query.branchId);
      if (query.status) params.set("status", query.status);
      if (query.q.trim()) params.set("q", query.q.trim());
      const result = await api(`/teacher-attendance?${params}`);
      setTeacherAttendance(result.content); setTeacherAttendancePage({ totalElements: result.totalElements, totalPages: result.totalPages, number: result.number });
    } catch (e) { setError(e.message); if (e.status === 401) setUser(null); }
    finally { setLoading(false); }
  }

  async function loadQuranProgress(query = progressQuery) {
    setProgressLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      for (const key of ["studentId", "teacherId", "branchId", "surahName"]) if (query[key]) params.set(key, query[key]);
      if (query.studentName.trim()) params.set("studentName", query.studentName.trim());
      if (query.teacherName.trim()) params.set("teacherName", query.teacherName.trim());
      if (query.startDate) params.set("startDate", query.startDate);
      if (query.endDate) params.set("endDate", query.endDate);
      params.set("page", String(query.page)); params.set("size", String(query.size));
      const [records, rosterPage] = await Promise.all([
        api(`/quran-progress?${params}`),
        api("/students/search?page=0&size=100"),
      ]);
      setQuranProgress(records.content); setProgressPage({ totalElements: records.totalElements, totalPages: records.totalPages, number: records.number });
      setProgressRoster(rosterPage.content);
    } catch (e) { setError(e.message); if (e.status === 401) setUser(null); }
    finally { setProgressLoading(false); }
  }

  async function saveQuranProgress(event) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    const { id, ...values } = progressForm;
    const payload = { ...values, studentId: Number(values.studentId), startAyah: Number(values.startAyah), endAyah: Number(values.endAyah) };
    try {
      await api(id ? `/quran-progress/${id}` : "/quran-progress", { method: id ? "PUT" : "POST", body: payload });
      setProgressForm(null); setNotice(id ? "Quran progress updated." : "Quran progress recorded.");
      await loadQuranProgress();
      await refreshDashboard();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function saveStudentAttendance(event) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const { id, ...payload } = studentAttendanceForm;
      await api(id ? `/student-attendance/${id}` : "/student-attendance", { method: id ? "PUT" : "POST", body: id ? payload : { ...payload, studentId: Number(payload.studentId) } });
      setStudentAttendanceForm(null); setNotice(id ? "Student attendance updated." : "Student attendance recorded."); await loadStudentAttendance(); await refreshDashboard();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function saveTeacherAttendance(event) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const { id, ...payload } = teacherAttendanceForm;
      await api(id ? `/teacher-attendance/${id}` : "/teacher-attendance", { method: id ? "PUT" : "POST", body: id ? payload : { ...payload, teacherId: Number(payload.teacherId) } });
      setTeacherAttendanceForm(null); setNotice(id ? "Teacher attendance updated." : "Teacher attendance recorded."); await loadTeacherAttendance(); await refreshDashboard();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  useEffect(() => {
    let active = true;
    api("/auth/me")
      .then(async sessionUser => {
        if (!active) return;
        setUser(sessionUser);
        await load(api, initialStudentQuery);
      })
      .catch(error => {
        if (active && error.status !== 401) setError(error.message);
      })
      .finally(() => { if (active) setAuthChecking(false); });
    const expire = () => {
      setUser(null);
      setData({ dashboard: null, students: [], branches: [], users: [], teachers: [] });
      setNotice("Your session expired. Sign in again.");
    };
    window.addEventListener("jafar:session-expired", expire);
    return () => { active = false; window.removeEventListener("jafar:session-expired", expire); };
  }, [api, load]);

  async function signIn(event) {
    event.preventDefault(); setError(""); setNotice(""); setLoading(true);
    try {
      await api("/auth/csrf");
      const sessionUser = await api("/auth/login", { method: "POST", body: { username: login.username.trim(), password: login.password, rememberMe: login.rememberMe } });
      setUser(sessionUser);
      setLogin({ username: "", password: "", rememberMe: false });
      await load(api, studentQuery);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function signOut() {
    setError(""); setNotice("");
    try {
      await api("/auth/csrf");
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      setData({ dashboard: null, students: [], branches: [], users: [] });
      setNotice("You have signed out.");
    } catch (e) { setError(e.message); }
  }

  async function saveStudent(event) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    const { id, ...payload } = studentForm;
    payload.branchId = Number(payload.branchId);
    payload.teacherId = payload.teacherId ? Number(payload.teacherId) : null;
    payload.dateOfBirth = payload.dateOfBirth || null;
    try {
      await api(id ? `/students/${id}` : "/students", { method: id ? "PUT" : "POST", body: payload });
      const query = id ? studentQuery : initialStudentQuery;
      if (!id) setStudentQuery(query);
      setStudentForm(null); setSelectedStudent(null); setNotice(id ? "Student updated." : "Student registered."); await load(api, query);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function deleteStudent(student) {
    if (!window.confirm(`Permanently delete ${student.fullName}? This removes the student profile from the database.`)) return;
    setError(""); setNotice("");
    try {
      await api(`/students/${student.id}`, { method: "DELETE" });
      const query = data.students.length === 1 && studentPage.number > 0 ? { ...studentQuery, page: studentPage.number - 1 } : studentQuery;
      if (query !== studentQuery) setStudentQuery(query);
      setSelectedStudent(null); setNotice("Student deleted."); await load(api, query);
    }
    catch (e) { setError(e.message); }
  }

  async function saveBranch(event) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    const { id, ...payload } = branchForm;
    try {
      await api(id ? `/branches/${id}` : "/branches", { method: id ? "PUT" : "POST", body: payload });
      setBranchForm(null); setNotice(id ? "Branch updated." : "Branch created."); await load(api, studentQuery); await loadBranches(branchQuery);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function saveTeacher(event) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    const { id, password, ...details } = teacherForm;
    const payload = { ...details, role: "QURAN_TEACHER", branchId: Number(details.branchId), password: password || null };
    try {
      const saved = await api(id ? `/users/${id}` : "/users", { method: id ? "PUT" : "POST", body: id ? { ...payload, active: teacherForm.active } : payload });
      setTeacherForm(null); setSelectedTeacher(saved); setNotice(id ? "Teacher profile updated." : "Teacher profile and login account created.");
      const query = id ? teacherQuery : initialTeacherQuery;
      if (!id) setTeacherQuery(query);
      await loadTeachers(query);
      await refreshDashboard();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function saveUser(event) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    const { id, password, ...details } = userForm;
    const payload = { ...details, password: password || null,
      branchId: details.role === "ADMINISTRATOR" ? null : Number(details.branchId) };
    try {
      const saved = await api(id ? "/users/" + id : "/users", { method: id ? "PUT" : "POST", body: payload });
      setUserForm(null);
      setNotice(id ? saved.username + (saved.active ? " updated and active." : " updated and disabled.") : saved.username + " account created.");
      const query = id ? userFilter : { q: "", role: "", active: "", page: 0, size: 20 };
      if (!id) setUserFilter(query);
      await loadUsers(query);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function toggleUserStatus(account) {
    if (account.active && !window.confirm("Disable " + account.username + "'s " + account.role.replaceAll("_", " ").toLowerCase() + " account?")) return;
    setError(""); setNotice("");
    try {
      const saved = await api("/users/" + account.id, { method: "PUT", body: {
        username: account.username, role: account.role, branchId: account.branchId,
        active: !account.active, fullName: account.fullName, email: account.email, phone: account.phone,
      } });
      setNotice(saved.username + (saved.active ? " account reactivated." : " account deactivated."));
      await loadUsers(userFilter);
    } catch (e) { setError(e.message); }
  }

  async function openTeacher(id) {
    setProfileLoading(true); setError(""); setSelectedTeacher(null);
    try { setSelectedTeacher(await api(`/users/teachers/${id}`)); }
    catch (e) { setError(e.message); }
    finally { setProfileLoading(false); }
  }

  async function toggleTeacherStatus(teacher) {
    setError(""); setNotice("");
    try {
      const saved = await api(`/users/${teacher.id}`, { method: "PUT", body: { username: teacher.username, role: "QURAN_TEACHER", branchId: teacher.branchId, active: !teacher.active, fullName: teacher.fullName, email: teacher.email, phone: teacher.phone } });
      setSelectedTeacher(saved); setNotice(saved.active ? "Teacher account reactivated." : "Teacher account deactivated."); await loadTeachers(teacherQuery); await refreshDashboard();
    } catch (e) { setError(e.message); }
  }

  function applyTeacherFilters(event) {
    event.preventDefault(); const query = { ...teacherQuery, page: 0 }; setTeacherQuery(query); setSelectedTeacher(null); loadTeachers(query);
  }

  function goToTeacherPage(page) {
    const query = { ...teacherQuery, page }; setTeacherQuery(query); loadTeachers(query);
  }

  async function deleteBranch(branch) {
    if (!window.confirm(`Delete ${branch.name}?`)) return;
    setError(""); setNotice("");
    try { await api(`/branches/${branch.id}`, { method: "DELETE" }); setNotice("Branch deleted."); await load(api, studentQuery); await loadBranches(branchQuery); }
    catch (e) { setError(e.message); }
  }

  async function openStudent(studentId) {
    setProfileLoading(true); setError(""); setSelectedStudent(null);
    try { setSelectedStudent(await api(`/students/${studentId}`)); }
    catch (e) { setError(e.message); }
    finally { setProfileLoading(false); }
  }

  function applyStudentFilters(event) {
    event.preventDefault();
    const query = { ...studentQuery, page: 0 };
    setStudentQuery(query);
    setSelectedStudent(null);
    load(api, query);
  }

  function goToStudentPage(page) {
    const query = { ...studentQuery, page };
    setStudentQuery(query);
    load(api, query);
  }

  function editSelectedStudent() {
    if (!selectedStudent) return;
    setStudentForm({ ...selectedStudent, branchId: String(selectedStudent.branchId), teacherId: selectedStudent.teacherId ? String(selectedStudent.teacherId) : "" });
    setSelectedStudent(null);
  }

  if (authChecking) return <main className="portal-login"><div className="portal-card login-card">Checking your session…</div></main>;

  if (!user) return <main className="portal-login"><form className="portal-card login-card" onSubmit={signIn}>
    <Link className="portal-home-link" href="/">← JAFAR</Link><p className="portal-eyebrow">JAFAR MANAGEMENT</p><h1>Sign in</h1><p>Use your administrator, branch manager, or teacher account.</p>
    {error && <div className="portal-alert error" role="alert">{error}</div>}
    {notice && <div className="portal-alert success" role="status">{notice}</div>}
    <label>Username<input autoComplete="username" required value={login.username} onChange={e => setLogin({ ...login, username: e.target.value })} /></label>
    <label>Password<input type="password" autoComplete="current-password" required value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} /></label>
    <label className="remember-me"><input type="checkbox" checked={login.rememberMe} onChange={e => setLogin({ ...login, rememberMe: e.target.checked })} /> Remember me on this device for 14 days</label>
    <button disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
    <button type="button" className="reset-link" onClick={() => setShowResetInfo(!showResetInfo)}>Forgot password?</button>
    {showResetInfo && <div className="portal-alert info" role="status">Password reset is not configured. This system has no email or SMS delivery service and user accounts have no recovery address. Contact an administrator to regain access.</div>}
    <small>Your password is sent only for sign in. The authenticated session uses secure server cookies.</small>
  </form></main>;

  const visibleUsers = data.users;
  const nav = ["Dashboard", "Students", ...((isAdmin || isManager) ? ["Teachers"] : []), "Student Attendance", "Quran Progress", ...(isAdmin || isManager ? ["Teacher Attendance", "Branches"] : []), "Reports", "Notifications", ...(isAdmin ? ["Users"] : [])];
  const stats = data.dashboard ? [
    ...(data.dashboard.totalBranches !== undefined ? [["Branches", data.dashboard.totalBranches]] : []),
    ...(data.dashboard.totalStudents !== undefined ? [[isManager ? "Students in branch" : "Students", data.dashboard.totalStudents]] : []),
    ...(data.dashboard.totalTeachers !== undefined ? [["Active Quran teachers", data.dashboard.totalTeachers]] : []),
    ...(data.dashboard.assignedStudents !== undefined ? [["Assigned students", data.dashboard.assignedStudents]] : []),
    ...(data.dashboard.pendingReports !== undefined ? [[isTeacher ? "Draft reports" : "Reports awaiting review", data.dashboard.pendingReports]] : []),
  ] : [];
  const teacherName = teacherId => data.teachers.find(teacher => teacher.id === teacherId)?.username || (teacherId === user.id ? user.username : teacherId ? `Teacher ${teacherId}` : "—");
  const selectableBranches = currentBranchId => data.branches.filter(branch => branch.active || String(branch.id) === String(currentBranchId));
  const managerBranchActive = !isManager || Boolean(data.branches[0]?.active);

  return <main className="portal-shell"><aside className="portal-sidebar"><Link className="portal-brand" href="/">☪ JAFAR<span>Management</span></Link>
    <p className="portal-label">WORKSPACE</p>{nav.map(item => <button key={item} className={section === item ? "selected" : ""} onClick={() => { setSection(item); setError(""); setNotice(""); if (item === "Dashboard") refreshDashboard(); if (item === "Student Attendance") loadStudentAttendance(); if (item === "Quran Progress") loadQuranProgress(); if (item === "Teacher Attendance") { loadTeacherAttendance(); loadTeachers({ ...initialTeacherQuery, active: "true" }); } if (item === "Branches") loadBranches(); if (item === "Reports") loadReports(); if (item === "Notifications") loadNotifications(); }}>{item}</button>)}
    <div className="portal-sidebar-foot"><span>{user.username}</span><button onClick={signOut}>Sign out</button></div>
  </aside><section className="portal-main"><header className="portal-header"><div><p className="portal-eyebrow">MANAGEMENT PORTAL</p><h1>{section}</h1></div><button className="secondary" onClick={() => section === "Quran Progress" ? loadQuranProgress() : section === "Reports" ? loadReports() : section === "Notifications" ? loadNotifications() : section === "Branches" ? loadBranches() : section === "Dashboard" ? refreshDashboard() : load(api, studentQuery)} disabled={section === "Quran Progress" ? progressLoading : loading}>{(section === "Quran Progress" ? progressLoading : loading) ? "Refreshing…" : "Refresh data"}</button></header>
    {error && <div className="portal-alert error" role="alert">{error}</div>}{notice && <div className="portal-alert success" role="status">{notice}</div>}
    {loading && !data.dashboard ? <div className="portal-card">Loading records…</div> : null}
    {section === "Dashboard" && data.dashboard && <>
      <div className="portal-stats">{stats.map(([label, value]) => <article className="portal-card stat" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
      <AttendanceSummary title={isTeacher ? "Today’s class attendance" : "Today’s student attendance"} summary={data.dashboard.todayStudentAttendance || data.dashboard.todayAttendance} />
      {(isAdmin || isManager) && <AttendanceSummary title="Today’s teacher attendance" summary={data.dashboard.todayTeacherAttendance} />}
      <article className="portal-card"><h2>Recent Quran progress</h2>{data.dashboard.recentProgress?.length ? <div className="portal-table-wrap"><table><thead><tr><th>Date</th><th>Student ID</th><th>Surah</th><th>Activity</th><th>Result</th></tr></thead><tbody>{data.dashboard.recentProgress.map(row => <tr key={row.id}><td>{row.date}</td><td>{row.studentId}</td><td>{row.surahName}</td><td>{row.activityType}</td><td>{row.progressStatus}</td></tr>)}</tbody></table></div> : <p>No Quran progress records yet.</p>}</article>
    </>}
    {section === "Dashboard" && !data.dashboard && !loading && <article className="portal-card"><h2>Dashboard unavailable</h2><p>Metrics could not be loaded, so no totals are being shown.</p><button onClick={refreshDashboard}>Try again</button></article>}
    {section === "Quran Progress" && <article className="portal-card"><div className="portal-card-head"><div><h2>Quran learning progress</h2><p>Record and review saved Surah, ayah range, activity, result, and remarks. Access is limited to your assigned students or branch.</p></div><button onClick={() => setProgressForm({ studentId: "", date: localToday(), surahName: "", startAyah: "", endAyah: "", activityType: "RECITATION", progressStatus: "SATISFACTORY", remarks: "" })}>Record progress</button></div>
      <form className="student-filters" onSubmit={event => { event.preventDefault(); const query = { ...progressQuery, page: 0 }; setProgressQuery(query); loadQuranProgress(query); }}>
        <label>Student<select value={progressQuery.studentId} onChange={event => setProgressQuery({ ...progressQuery, studentId: event.target.value })}><option value="">All students</option>{progressRoster.map(student => <option key={student.id} value={student.id}>{student.fullName} · {student.studentNumber}</option>)}</select></label>
        <label>Student name or number<input type="search" value={progressQuery.studentName} onChange={event => setProgressQuery({ ...progressQuery, studentName: event.target.value })} /></label>
        {(isAdmin || isManager) && <label>Teacher name or username<input type="search" value={progressQuery.teacherName} onChange={event => setProgressQuery({ ...progressQuery, teacherName: event.target.value })} /></label>}
        {(isAdmin || isManager) && <label>Teacher<select value={progressQuery.teacherId} onChange={event => setProgressQuery({ ...progressQuery, teacherId: event.target.value })}><option value="">All teachers</option>{data.teachers.filter(teacher => !isAdmin || !progressQuery.branchId || String(teacher.branchId) === progressQuery.branchId).map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.fullName || teacher.username}</option>)}</select></label>}
        {isAdmin && <label>Branch<select value={progressQuery.branchId} onChange={event => setProgressQuery({ ...progressQuery, branchId: event.target.value, teacherId: "" })}><option value="">All branches</option>{data.branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}
        <label>Surah<input maxLength="100" value={progressQuery.surahName} onChange={event => setProgressQuery({ ...progressQuery, surahName: event.target.value })} placeholder="Surah name" /></label>
        <label>From<input type="date" value={progressQuery.startDate} onChange={event => setProgressQuery({ ...progressQuery, startDate: event.target.value })} /></label><label>To<input type="date" value={progressQuery.endDate} onChange={event => setProgressQuery({ ...progressQuery, endDate: event.target.value })} /></label>
        <button disabled={progressLoading}>{progressLoading ? "Loading…" : "Filter"}</button><button type="button" className="secondary" onClick={() => { const query = { studentId: "", teacherId: "", branchId: "", studentName: "", teacherName: "", surahName: "", startDate: "", endDate: "", page: 0, size: 20 }; setProgressQuery(query); loadQuranProgress(query); }}>Reset</button>
      </form>
      {progressForm && <form className="portal-form-grid" onSubmit={saveQuranProgress}><h3>{progressForm.id ? "Update Quran progress" : "Record Quran progress"}</h3>
        <label>Student<select required disabled={Boolean(progressForm.id)} value={progressForm.studentId} onChange={event => setProgressForm({ ...progressForm, studentId: event.target.value })}><option value="">Choose student</option>{progressRoster.map(student => <option key={student.id} value={student.id}>{student.fullName} · {student.studentNumber}</option>)}</select></label>
        <label>Date<input required type="date" value={progressForm.date} onChange={event => setProgressForm({ ...progressForm, date: event.target.value })} /></label><label>Surah<input required maxLength="100" value={progressForm.surahName} onChange={event => setProgressForm({ ...progressForm, surahName: event.target.value })} /></label>
        <label>Start ayah<input required type="number" min="1" value={progressForm.startAyah} onChange={event => setProgressForm({ ...progressForm, startAyah: event.target.value })} /></label><label>End ayah<input required type="number" min={progressForm.startAyah || 1} value={progressForm.endAyah} onChange={event => setProgressForm({ ...progressForm, endAyah: event.target.value })} /></label>
        <label>Activity<select required value={progressForm.activityType} onChange={event => setProgressForm({ ...progressForm, activityType: event.target.value })}>{["NEW_LESSON", "RECITATION", "REVISION", "MEMORIZATION", "CORRECTION", "OTHER"].map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
        <label>Result<select required value={progressForm.progressStatus} onChange={event => setProgressForm({ ...progressForm, progressStatus: event.target.value })}>{["EXCELLENT", "GOOD", "SATISFACTORY", "NEEDS_IMPROVEMENT", "INCOMPLETE"].map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
        <label>Remarks<input maxLength="1000" value={progressForm.remarks || ""} onChange={event => setProgressForm({ ...progressForm, remarks: event.target.value })} /></label>
        <div className="portal-form-actions"><button disabled={saving}>{saving ? "Saving…" : "Save progress"}</button><button type="button" className="secondary" onClick={() => setProgressForm(null)}>Cancel</button></div>
      </form>}
      {progressLoading ? <p className="portal-empty">Loading Quran progress…</p> : quranProgress.length ? <><div className="portal-table-wrap"><table><thead><tr><th>Date</th><th>Student</th><th>Teacher</th><th>Branch</th><th>Surah · ayahs</th><th>Activity</th><th>Result</th><th>Remarks</th><th>Actions</th></tr></thead><tbody>{quranProgress.map(record => { const student = progressRoster.find(value => value.id === record.studentId); const teacher = data.teachers.find(value => value.id === record.teacherId); return <tr key={record.id}><td>{record.date}</td><td>{student?.fullName || `Student ${record.studentId}`}</td><td>{teacher?.fullName || teacher?.username || (record.teacherId === user.id ? user.username : record.teacherId ? `Teacher ${record.teacherId}` : "—")}</td><td>{data.branches.find(value => value.id === record.branchId)?.name || record.branchId}</td><td>{record.surahName} · {record.startAyah}–{record.endAyah}</td><td>{record.activityType?.replaceAll("_", " ")}</td><td>{record.progressStatus?.replaceAll("_", " ")}</td><td>{record.remarks || "—"}</td><td><button className="table-action" onClick={() => setProgressForm({ ...record, studentId: String(record.studentId), startAyah: String(record.startAyah), endAyah: String(record.endAyah), remarks: record.remarks || "" })}>Edit</button></td></tr>; })}</tbody></table></div><div className="student-pagination"><span>{progressPage.totalElements} records · Page {progressPage.number + 1} of {Math.max(progressPage.totalPages, 1)}</span><div><button className="secondary" disabled={progressLoading || progressPage.number <= 0} onClick={() => { const query = { ...progressQuery, page: progressPage.number - 1 }; setProgressQuery(query); loadQuranProgress(query); }}>Previous</button><button className="secondary" disabled={progressLoading || progressPage.number + 1 >= progressPage.totalPages} onClick={() => { const query = { ...progressQuery, page: progressPage.number + 1 }; setProgressQuery(query); loadQuranProgress(query); }}>Next</button></div></div></> : <p className="portal-empty">No Quran progress records match these filters.</p>}
    </article>}
    {section === "Student Attendance" && <article className="portal-card"><div className="portal-card-head"><div><h2>Student attendance</h2><p>Attendance is recorded once per student per day and stored with the student’s branch and assigned teacher.</p></div><button onClick={() => { setStudentAttendanceForm({ studentId: "", date: localToday(), status: "PRESENT", remarks: "" }); loadStudentAttendance(); }}>Record attendance</button></div>
      <form className="student-filters" onSubmit={e => { e.preventDefault(); const query = { ...studentAttendanceQuery, page: 0 }; setStudentAttendanceQuery(query); loadStudentAttendance(query); }}><label>From<input type="date" value={studentAttendanceQuery.startDate} onChange={e => setStudentAttendanceQuery({ ...studentAttendanceQuery, startDate: e.target.value })} /></label><label>To<input type="date" value={studentAttendanceQuery.endDate} onChange={e => setStudentAttendanceQuery({ ...studentAttendanceQuery, endDate: e.target.value })} /></label>{isAdmin && <label>Branch<select value={studentAttendanceQuery.branchId} onChange={e => setStudentAttendanceQuery({ ...studentAttendanceQuery, branchId: e.target.value })}><option value="">All branches</option>{data.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}<label>Student<select value={studentAttendanceQuery.studentId} onChange={e => setStudentAttendanceQuery({ ...studentAttendanceQuery, studentId: e.target.value })}><option value="">All students</option>{attendanceRoster.filter(s => !isAdmin || !studentAttendanceQuery.branchId || String(s.branchId) === studentAttendanceQuery.branchId).map(s => <option key={s.id} value={s.id}>{s.fullName} · {s.studentNumber}</option>)}</select></label><label>Student name or number<input type="search" value={studentAttendanceQuery.q} onChange={e => setStudentAttendanceQuery({ ...studentAttendanceQuery, q: e.target.value })} /></label><label>Status<select value={studentAttendanceQuery.status} onChange={e => setStudentAttendanceQuery({ ...studentAttendanceQuery, status: e.target.value })}><option value="">All statuses</option>{["PRESENT", "ABSENT", "LATE", "EXCUSED"].map(s => <option key={s}>{s}</option>)}</select></label><button disabled={loading}>{loading ? "Loading…" : "Filter"}</button><button type="button" className="secondary" onClick={() => { const query = { startDate: "", endDate: "", studentId: "", q: "", branchId: "", status: "", page: 0, size: 20 }; setStudentAttendanceQuery(query); loadStudentAttendance(query); }}>Reset</button></form>
      {studentAttendanceForm && <form className="portal-form-grid" onSubmit={saveStudentAttendance}><h3>{studentAttendanceForm.id ? "Update student attendance" : "Record student attendance"}</h3><label>Student<select required disabled={Boolean(studentAttendanceForm.id)} value={studentAttendanceForm.studentId} onChange={e => setStudentAttendanceForm({ ...studentAttendanceForm, studentId: e.target.value })}><option value="">Choose student</option>{attendanceRoster.map(s => <option key={s.id} value={s.id}>{s.fullName} · {s.studentNumber}</option>)}</select></label><label>Date<input required type="date" disabled={Boolean(studentAttendanceForm.id)} value={studentAttendanceForm.date} onChange={e => setStudentAttendanceForm({ ...studentAttendanceForm, date: e.target.value })} /></label><label>Status<select required value={studentAttendanceForm.status} onChange={e => setStudentAttendanceForm({ ...studentAttendanceForm, status: e.target.value })}>{["PRESENT", "ABSENT", "LATE", "EXCUSED"].map(s => <option key={s}>{s}</option>)}</select></label><label>Remarks<input maxLength="500" value={studentAttendanceForm.remarks || ""} onChange={e => setStudentAttendanceForm({ ...studentAttendanceForm, remarks: e.target.value })} /></label><div className="portal-form-actions"><button disabled={saving}>{saving ? "Saving…" : "Save attendance"}</button><button type="button" className="secondary" onClick={() => setStudentAttendanceForm(null)}>Cancel</button></div></form>}
      {studentAttendance.length ? <><div className="portal-table-wrap"><table><thead><tr><th>Date</th><th>Student</th><th>Branch</th><th>Status</th><th>Remarks</th><th>Actions</th></tr></thead><tbody>{studentAttendance.map(a => <tr key={a.id}><td>{a.date}</td><td>{attendanceRoster.find(s => s.id === a.studentId)?.fullName || `Student ${a.studentId}`}</td><td>{data.branches.find(b => b.id === a.branchId)?.name || a.branchId}</td><td>{a.status}</td><td>{a.remarks || "—"}</td><td><button className="table-action" onClick={() => setStudentAttendanceForm({ id: a.id, studentId: String(a.studentId), date: a.date, status: a.status, remarks: a.remarks || "" })}>Edit</button></td></tr>)}</tbody></table></div><div className="student-pagination"><span>{studentAttendancePage.totalElements} records · Page {studentAttendancePage.number + 1} of {Math.max(studentAttendancePage.totalPages, 1)}</span><div><button className="secondary" disabled={loading || studentAttendancePage.number <= 0} onClick={() => { const query = { ...studentAttendanceQuery, page: studentAttendancePage.number - 1 }; setStudentAttendanceQuery(query); loadStudentAttendance(query); }}>Previous</button><button className="secondary" disabled={loading || studentAttendancePage.number + 1 >= studentAttendancePage.totalPages} onClick={() => { const query = { ...studentAttendanceQuery, page: studentAttendancePage.number + 1 }; setStudentAttendanceQuery(query); loadStudentAttendance(query); }}>Next</button></div></div></> : !loading && <p className="portal-empty">No student attendance records for these filters.</p>}
    </article>}
    {section === "Teacher Attendance" && <article className="portal-card"><div className="portal-card-head"><div><h2>Teacher attendance</h2><p>One attendance record per teacher per day. Managers can only access their own branch.</p></div><button onClick={() => { setTeacherAttendanceForm({ teacherId: "", date: localToday(), status: "PRESENT", remarks: "" }); loadTeachers(initialTeacherQuery); }}>Record attendance</button></div>
      <form className="student-filters" onSubmit={e => { e.preventDefault(); const query = { ...teacherAttendanceQuery, page: 0 }; setTeacherAttendanceQuery(query); loadTeacherAttendance(query); }}><label>From<input type="date" value={teacherAttendanceQuery.startDate} onChange={e => setTeacherAttendanceQuery({ ...teacherAttendanceQuery, startDate: e.target.value })} /></label><label>To<input type="date" value={teacherAttendanceQuery.endDate} onChange={e => setTeacherAttendanceQuery({ ...teacherAttendanceQuery, endDate: e.target.value })} /></label>{isAdmin && <label>Branch<select value={teacherAttendanceQuery.branchId} onChange={e => setTeacherAttendanceQuery({ ...teacherAttendanceQuery, branchId: e.target.value })}><option value="">All branches</option>{data.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}<label>Teacher<select value={teacherAttendanceQuery.teacherId} onChange={e => setTeacherAttendanceQuery({ ...teacherAttendanceQuery, teacherId: e.target.value })}><option value="">All teachers</option>{data.teachers.filter(t => !isAdmin || !teacherAttendanceQuery.branchId || String(t.branchId) === teacherAttendanceQuery.branchId).map(t => <option key={t.id} value={t.id}>{t.fullName || t.username}</option>)}</select></label><label>Teacher name or username<input type="search" value={teacherAttendanceQuery.q} onChange={e => setTeacherAttendanceQuery({ ...teacherAttendanceQuery, q: e.target.value })} /></label><label>Status<select value={teacherAttendanceQuery.status} onChange={e => setTeacherAttendanceQuery({ ...teacherAttendanceQuery, status: e.target.value })}><option value="">All statuses</option>{["PRESENT", "ABSENT", "LATE", "EXCUSED"].map(s => <option key={s}>{s}</option>)}</select></label><button disabled={loading}>{loading ? "Loading…" : "Filter"}</button><button type="button" className="secondary" onClick={() => { const query = { startDate: "", endDate: "", teacherId: "", q: "", branchId: "", status: "", page: 0, size: 20 }; setTeacherAttendanceQuery(query); loadTeacherAttendance(query); }}>Reset</button></form>
      {teacherAttendanceForm && <form className="portal-form-grid" onSubmit={saveTeacherAttendance}><h3>{teacherAttendanceForm.id ? "Update teacher attendance" : "Record teacher attendance"}</h3><label>Teacher<select required disabled={Boolean(teacherAttendanceForm.id)} value={teacherAttendanceForm.teacherId} onChange={e => setTeacherAttendanceForm({ ...teacherAttendanceForm, teacherId: e.target.value })}><option value="">Choose teacher</option>{data.teachers.map(t => <option key={t.id} value={t.id}>{t.fullName || t.username} · {data.branches.find(b => b.id === t.branchId)?.name || t.branchId}</option>)}</select></label><label>Date<input required type="date" disabled={Boolean(teacherAttendanceForm.id)} value={teacherAttendanceForm.date} onChange={e => setTeacherAttendanceForm({ ...teacherAttendanceForm, date: e.target.value })} /></label><label>Status<select required value={teacherAttendanceForm.status} onChange={e => setTeacherAttendanceForm({ ...teacherAttendanceForm, status: e.target.value })}>{["PRESENT", "ABSENT", "LATE", "EXCUSED"].map(s => <option key={s}>{s}</option>)}</select></label><label>Remarks<input maxLength="500" value={teacherAttendanceForm.remarks || ""} onChange={e => setTeacherAttendanceForm({ ...teacherAttendanceForm, remarks: e.target.value })} /></label><div className="portal-form-actions"><button disabled={saving}>{saving ? "Saving…" : "Save attendance"}</button><button type="button" className="secondary" onClick={() => setTeacherAttendanceForm(null)}>Cancel</button></div></form>}
      {teacherAttendance.length ? <><div className="portal-table-wrap"><table><thead><tr><th>Date</th><th>Teacher</th><th>Branch</th><th>Status</th><th>Remarks</th><th>Actions</th></tr></thead><tbody>{teacherAttendance.map(a => <tr key={a.id}><td>{a.date}</td><td>{data.teachers.find(t => t.id === a.teacherId)?.fullName || data.teachers.find(t => t.id === a.teacherId)?.username || `Teacher ${a.teacherId}`}</td><td>{data.branches.find(b => b.id === a.branchId)?.name || a.branchId}</td><td>{a.status}</td><td>{a.remarks || "—"}</td><td><button className="table-action" onClick={() => setTeacherAttendanceForm({ id: a.id, teacherId: String(a.teacherId), date: a.date, status: a.status, remarks: a.remarks || "" })}>Edit</button></td></tr>)}</tbody></table></div><div className="student-pagination"><span>{teacherAttendancePage.totalElements} records · Page {teacherAttendancePage.number + 1} of {Math.max(teacherAttendancePage.totalPages, 1)}</span><div><button className="secondary" disabled={loading || teacherAttendancePage.number <= 0} onClick={() => { const query = { ...teacherAttendanceQuery, page: teacherAttendancePage.number - 1 }; setTeacherAttendanceQuery(query); loadTeacherAttendance(query); }}>Previous</button><button className="secondary" disabled={loading || teacherAttendancePage.number + 1 >= teacherAttendancePage.totalPages} onClick={() => { const query = { ...teacherAttendanceQuery, page: teacherAttendancePage.number + 1 }; setTeacherAttendanceQuery(query); loadTeacherAttendance(query); }}>Next</button></div></div></> : !loading && <p className="portal-empty">No teacher attendance records for these filters.</p>}
    </article>}
    {section === "Teachers" && <article className="portal-card"><div className="portal-card-head"><div><h2>Quran teachers</h2><p>Teacher profiles use their existing login account, so student and attendance records keep the same teacher ID.</p></div>{isAdmin && <button onClick={() => { setSelectedTeacher(null); setTeacherForm({ ...blankTeacher }); }}>Add Quran teacher</button>}</div>
      <form className="student-filters" onSubmit={applyTeacherFilters}><label>Search<input type="search" value={teacherQuery.q} onChange={e => setTeacherQuery({ ...teacherQuery, q: e.target.value })} placeholder="Name, username, email, phone" /></label>{isAdmin && <><label>Branch<select value={teacherQuery.branchId} onChange={e => setTeacherQuery({ ...teacherQuery, branchId: e.target.value })}><option value="">All branches</option>{data.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>Status<select value={teacherQuery.active} onChange={e => setTeacherQuery({ ...teacherQuery, active: e.target.value })}><option value="">All statuses</option><option value="true">Active</option><option value="false">Disabled</option></select></label></>}<button disabled={teacherLoading}>{teacherLoading ? "Searching…" : "Search"}</button><button type="button" className="secondary" onClick={() => { const query = { ...initialTeacherQuery }; setTeacherQuery(query); loadTeachers(query); }}>Reset</button></form>
      {selectedTeacher && <section className="student-profile"><div className="portal-card-head"><div><p className="portal-eyebrow">TEACHER PROFILE · ACCOUNT #{selectedTeacher.id}</p><h3>{selectedTeacher.fullName || selectedTeacher.username}</h3></div><div><button className="secondary" onClick={() => setSelectedTeacher(null)}>Close</button>{isAdmin && <button onClick={() => setTeacherForm({ ...selectedTeacher, password: "", branchId: String(selectedTeacher.branchId) })}>Edit profile</button>}</div></div><dl className="student-profile-grid"><div><dt>Login username</dt><dd>{selectedTeacher.username}</dd></div><div><dt>Branch</dt><dd>{data.branches.find(b => b.id === selectedTeacher.branchId)?.name || selectedTeacher.branchId}</dd></div><div><dt>Email</dt><dd>{selectedTeacher.email || "Not provided"}</dd></div><div><dt>Phone</dt><dd>{selectedTeacher.phone || "Not provided"}</dd></div><div><dt>Status</dt><dd>{selectedTeacher.active ? "Active" : "Disabled"}</dd></div></dl>{isAdmin && <button className={selectedTeacher.active ? "secondary" : ""} onClick={() => toggleTeacherStatus(selectedTeacher)}>{selectedTeacher.active ? "Deactivate account" : "Reactivate account"}</button>}</section>}
      {profileLoading && <p className="portal-empty">Loading teacher profile…</p>}
      {teacherForm && <form className="portal-form-grid" onSubmit={saveTeacher}><h3>{teacherForm.id ? "Edit Quran teacher" : "Create Quran teacher"}</h3><label>Full name<input required maxLength="150" value={teacherForm.fullName || ""} onChange={e => setTeacherForm({ ...teacherForm, fullName: e.target.value })} /></label><label>Username<input required maxLength="80" value={teacherForm.username} onChange={e => setTeacherForm({ ...teacherForm, username: e.target.value })} /></label><label>{teacherForm.id ? "New password (optional)" : "Initial password"}<input type="password" autoComplete="new-password" required={!teacherForm.id} minLength="12" maxLength="100" value={teacherForm.password || ""} onChange={e => setTeacherForm({ ...teacherForm, password: e.target.value })} /></label><label>Email<input type="email" maxLength="254" value={teacherForm.email || ""} onChange={e => setTeacherForm({ ...teacherForm, email: e.target.value })} /></label><label>Phone<input type="tel" maxLength="30" value={teacherForm.phone || ""} onChange={e => setTeacherForm({ ...teacherForm, phone: e.target.value })} /></label><label>Branch<select required value={teacherForm.branchId} onChange={e => setTeacherForm({ ...teacherForm, branchId: e.target.value })}><option value="">Choose branch</option>{selectableBranches(teacherForm.branchId).map(b => <option key={b.id} value={b.id}>{b.name}{b.active ? "" : " (inactive; keep existing assignment)"}</option>)}</select></label><div className="portal-form-actions"><button disabled={saving}>{saving ? "Saving…" : "Save teacher"}</button><button type="button" className="secondary" onClick={() => setTeacherForm(null)}>Cancel</button></div></form>}
      {data.teachers.length ? <div className="portal-table-wrap"><table><thead><tr><th>Teacher</th><th>Username</th><th>Branch</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.teachers.map(t => <tr key={t.id}><td><button className="table-action student-name" onClick={() => openTeacher(t.id)}>{t.fullName || t.username}</button></td><td>{t.username}</td><td>{data.branches.find(b => b.id === t.branchId)?.name || t.branchId}</td><td>{t.email || t.phone || "—"}</td><td>{t.active ? "Active" : "Disabled"}</td><td>{isAdmin && <button className="table-action" onClick={() => setTeacherForm({ ...t, password: "", branchId: String(t.branchId) })}>Edit</button>}</td></tr>)}</tbody></table><div className="student-pagination"><span>{teacherPage.totalElements} teacher{teacherPage.totalElements === 1 ? "" : "s"} · Page {teacherPage.number + 1} of {Math.max(teacherPage.totalPages, 1)}</span><div><button className="secondary" disabled={teacherLoading || teacherPage.number <= 0} onClick={() => goToTeacherPage(teacherPage.number - 1)}>Previous</button><button className="secondary" disabled={teacherLoading || teacherPage.number + 1 >= teacherPage.totalPages} onClick={() => goToTeacherPage(teacherPage.number + 1)}>Next</button></div></div></div> : !teacherLoading && <p className="portal-empty">No teachers match these filters.</p>}
    </article>}
    {section === "Students" && <article className="portal-card"><div className="portal-card-head"><div><h2>Students</h2><p>Records from your authorized branches and classes.</p>{isManager && !managerBranchActive && <p>This branch is inactive. Existing student records remain available, but new assignments are disabled.</p>}</div>{(isAdmin || isManager) && <button disabled={!managerBranchActive} title={!managerBranchActive ? "The assigned branch is inactive" : ""} onClick={() => { setSelectedStudent(null); setStudentForm({ ...blankStudent, branchId: isManager ? String(data.branches[0]?.id || "") : "" }); }}>Register student</button>}</div>
      <form className="student-filters" onSubmit={applyStudentFilters}>
        <label>Search<input type="search" value={studentQuery.q} onChange={e => setStudentQuery({ ...studentQuery, q: e.target.value })} placeholder="Name, student number, guardian" /></label>
        {isAdmin && <label>Branch<select value={studentQuery.branchId} onChange={e => setStudentQuery({ ...studentQuery, branchId: e.target.value, teacherId: "" })}><option value="">All branches</option>{data.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
        {(isAdmin || isManager) && <><label>Teacher<select value={studentQuery.teacherId} onChange={e => setStudentQuery({ ...studentQuery, teacherId: e.target.value })}><option value="">All teachers</option>{data.teachers.filter(t => !isAdmin || !studentQuery.branchId || String(t.branchId) === studentQuery.branchId).map(t => <option key={t.id} value={t.id}>{t.username}</option>)}</select></label><label>Teacher name or username<input type="search" value={studentQuery.teacherName} onChange={e => setStudentQuery({ ...studentQuery, teacherName: e.target.value })} /></label></>}
        <button disabled={loading}>{loading ? "Searching…" : "Search"}</button><button type="button" className="secondary" onClick={() => { const query = { ...initialStudentQuery }; setStudentQuery(query); setSelectedStudent(null); load(api, query); }}>Reset</button>
      </form>
      {selectedStudent && <section className="student-profile" aria-label="Student profile"><div className="portal-card-head"><div><p className="portal-eyebrow">STUDENT PROFILE</p><h3>{selectedStudent.fullName}</h3></div><div><button className="secondary" onClick={() => setSelectedStudent(null)}>Close</button>{(isAdmin || isManager) && <button onClick={editSelectedStudent}>Edit student</button>}</div></div>
        <dl className="student-profile-grid"><div><dt>Student number</dt><dd>{selectedStudent.studentNumber}</dd></div><div><dt>Branch</dt><dd>{data.branches.find(b => b.id === selectedStudent.branchId)?.name || selectedStudent.branchId}</dd></div><div><dt>Teacher</dt><dd>{teacherName(selectedStudent.teacherId)}</dd></div><div><dt>Gender</dt><dd>{selectedStudent.gender || "Not provided"}</dd></div><div><dt>Date of birth</dt><dd>{selectedStudent.dateOfBirth || "Not provided"}</dd></div><div><dt>Guardian</dt><dd>{selectedStudent.guardianName || "Not provided"}</dd></div><div><dt>Guardian phone</dt><dd>{selectedStudent.guardianPhone || "Not provided"}</dd></div><div><dt>Enrollment date</dt><dd>{selectedStudent.enrollmentDate}</dd></div><div><dt>Current level</dt><dd>{selectedStudent.currentLevel || "Not provided"}</dd></div><div><dt>Registered</dt><dd>{selectedStudent.createdAt || "—"}</dd></div></dl>
      </section>}
      {profileLoading && <p className="portal-empty">Loading student profile…</p>}
      {studentForm && <form className="portal-form-grid" onSubmit={saveStudent}><h3>{studentForm.id ? "Update student" : "Register student"}</h3>
        <label>Full name<input required pattern=".*\S.*" title="Enter a name that is not only spaces." maxLength="150" value={studentForm.fullName} onChange={e => setStudentForm({ ...studentForm, fullName: e.target.value })} /></label>
        <label>Student number<input required pattern=".*\S.*" title="Enter a student number that is not only spaces." maxLength="50" value={studentForm.studentNumber} onChange={e => setStudentForm({ ...studentForm, studentNumber: e.target.value })} /></label>
        <label>Gender<input maxLength="20" value={studentForm.gender || ""} onChange={e => setStudentForm({ ...studentForm, gender: e.target.value })} /></label>
        <label>Date of birth<input type="date" value={studentForm.dateOfBirth || ""} onChange={e => setStudentForm({ ...studentForm, dateOfBirth: e.target.value || null })} /></label>
        <label>Guardian name<input maxLength="150" value={studentForm.guardianName || ""} onChange={e => setStudentForm({ ...studentForm, guardianName: e.target.value })} /></label>
        <label>Guardian phone<input maxLength="30" value={studentForm.guardianPhone || ""} onChange={e => setStudentForm({ ...studentForm, guardianPhone: e.target.value })} /></label>
        <label>Branch<select required value={studentForm.branchId} onChange={e => { const branchId = e.target.value; const assignedTeacher = data.teachers.some(t => String(t.id) === String(studentForm.teacherId) && String(t.branchId) === branchId); setStudentForm({ ...studentForm, branchId, teacherId: assignedTeacher ? studentForm.teacherId : "" }); }}><option value="">Choose branch</option>{selectableBranches(studentForm.branchId).map(b => <option key={b.id} value={b.id}>{b.name}{b.active ? "" : " (inactive; keep existing assignment)"}</option>)}</select></label>
        <label>Teacher<select value={studentForm.teacherId || ""} onChange={e => setStudentForm({ ...studentForm, teacherId: e.target.value })}><option value="">Not assigned</option>{data.teachers.filter(t => Number(t.branchId) === Number(studentForm.branchId)).map(t => <option key={t.id} value={t.id}>{t.username}</option>)}</select></label>
        <label>Enrollment date<input required type="date" max={localToday()} value={studentForm.enrollmentDate || ""} onChange={e => setStudentForm({ ...studentForm, enrollmentDate: e.target.value || null })} /></label>
        <label>Current level<input maxLength="80" value={studentForm.currentLevel || ""} onChange={e => setStudentForm({ ...studentForm, currentLevel: e.target.value })} /></label>
        <div className="portal-form-actions"><button disabled={saving}>{saving ? "Saving…" : "Save student"}</button><button type="button" className="secondary" onClick={() => setStudentForm(null)}>Cancel</button></div>
      </form>}
      {data.students.length ? <div className="portal-table-wrap"><table><thead><tr><th>Student</th><th>Number</th><th>Branch</th><th>Level</th><th>Guardian</th><th>Teacher</th><th>Actions</th></tr></thead><tbody>{data.students.map(s => <tr key={s.id}><td><button className="table-action student-name" onClick={() => openStudent(s.id)}>{s.fullName}</button></td><td>{s.studentNumber}</td><td>{data.branches.find(b => b.id === s.branchId)?.name || s.branchId}</td><td>{s.currentLevel || "—"}</td><td>{s.guardianName || "—"}</td><td>{teacherName(s.teacherId)}</td><td>{(isAdmin || isManager) && <><button className="table-action" onClick={() => setStudentForm({ ...s, branchId: String(s.branchId), teacherId: s.teacherId ? String(s.teacherId) : "" })}>Edit</button><button className="table-action danger-text" onClick={() => deleteStudent(s)}>Delete</button></>}</td></tr>)}</tbody></table>
        <div className="student-pagination"><span>{studentPage.totalElements} student{studentPage.totalElements === 1 ? "" : "s"} · Page {studentPage.number + 1} of {Math.max(studentPage.totalPages, 1)}</span><div><button className="secondary" disabled={loading || studentPage.number <= 0} onClick={() => goToStudentPage(studentPage.number - 1)}>Previous</button><button className="secondary" disabled={loading || studentPage.number + 1 >= studentPage.totalPages} onClick={() => goToStudentPage(studentPage.number + 1)}>Next</button></div></div>
      </div> : !loading && <p className="portal-empty">No students match these filters.</p>}
    </article>}
    {section === "Branches" && <article className="portal-card"><div className="portal-card-head"><div><h2>Branches</h2><p>Branch records stored in the management database. Managers see only their assigned branch.</p></div>{isAdmin && <button onClick={() => setBranchForm({ name: "", address: "", active: true })}>Add branch</button>}</div>
      <form className="student-filters" onSubmit={event => { event.preventDefault(); const query = { ...branchQuery, page: 0 }; setBranchQuery(query); loadBranches(query); }}><label>Search name or address<input type="search" value={branchQuery.q} onChange={event => setBranchQuery({ ...branchQuery, q: event.target.value })} /></label>{isAdmin && <label>Status<select value={branchQuery.active} onChange={event => setBranchQuery({ ...branchQuery, active: event.target.value })}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select></label>}<button disabled={loading}>{loading ? "Searching…" : "Search"}</button><button type="button" className="secondary" onClick={() => { const query = { q: "", active: "", page: 0, size: 20 }; setBranchQuery(query); loadBranches(query); }}>Reset</button></form>
      {branchForm && <form className="portal-form-grid" onSubmit={saveBranch}><h3>{branchForm.id ? "Update branch" : "Add branch"}</h3><label>Branch name<input required pattern=".*\S.*" maxLength="120" value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} /></label><label>Address<input maxLength="255" value={branchForm.address || ""} onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} /></label><label>Status<select required value={String(branchForm.active)} onChange={e => setBranchForm({ ...branchForm, active: e.target.value === "true" })}><option value="true">Active</option><option value="false">Inactive</option></select></label><div className="portal-form-actions"><button disabled={saving}>{saving ? "Saving…" : "Save branch"}</button><button type="button" className="secondary" onClick={() => setBranchForm(null)}>Cancel</button></div></form>}
      {branchRows.length ? <><div className="portal-table-wrap"><table><thead><tr><th>Name</th><th>Address</th><th>Status</th><th>Actions</th></tr></thead><tbody>{branchRows.map(b => <tr key={b.id}><td>{b.name}</td><td>{b.address || "—"}</td><td>{b.active ? "Active" : "Inactive"}</td><td>{(isAdmin || isManager) && <button className="table-action" onClick={() => setBranchForm({ id: b.id, name: b.name, address: b.address || "", active: b.active })}>Edit</button>}{isAdmin && <button className="table-action danger-text" onClick={() => deleteBranch(b)}>Delete</button>}</td></tr>)}</tbody></table></div><div className="student-pagination"><span>{branchPage.totalElements} branches · Page {branchPage.number + 1} of {Math.max(branchPage.totalPages, 1)}</span><div><button className="secondary" disabled={loading || branchPage.number <= 0} onClick={() => { const query = { ...branchQuery, page: branchPage.number - 1 }; setBranchQuery(query); loadBranches(query); }}>Previous</button><button className="secondary" disabled={loading || branchPage.number + 1 >= branchPage.totalPages} onClick={() => { const query = { ...branchQuery, page: branchPage.number + 1 }; setBranchQuery(query); loadBranches(query); }}>Next</button></div></div></> : !loading && <p className="portal-empty">No branches found for this account.</p>}</article>}
    {section === "Reports" && <article className="portal-card"><div className="portal-card-head"><div><h2>Reports</h2><p>Draft, submit, review, and search reports allowed for your role and branch. Export files include the same filtered reports shown here.</p></div><div className="portal-form-actions"><button className="secondary" disabled={Boolean(exporting)} onClick={() => exportReports("pdf")}>{exporting === "pdf" ? "Preparing PDF…" : "Export PDF"}</button><button className="secondary" disabled={Boolean(exporting)} onClick={() => exportReports("xlsx")}>{exporting === "xlsx" ? "Preparing Excel…" : "Export Excel"}</button>{(isTeacher || isManager) && <button onClick={createReportDraft}>New report</button>}</div></div>
      <form className="student-filters" onSubmit={event => { event.preventDefault(); const query = { ...reportQuery, page: 0 }; setReportQuery(query); loadReports(query); }}><label>Report type<select value={reportQuery.type} onChange={event => setReportQuery({ ...reportQuery, type: event.target.value })}><option value="">All types</option><option value="TEACHER_TO_MANAGER">Teacher to manager</option><option value="MANAGER_TO_ADMIN">Manager to administrator</option></select></label><label>Status<select value={reportQuery.status} onChange={event => setReportQuery({ ...reportQuery, status: event.target.value })}><option value="">All statuses</option><option value="DRAFT">Draft</option><option value="SUBMITTED">Submitted</option><option value="REVIEWED">Reviewed</option></select></label>{isAdmin && <label>Branch<select value={reportQuery.branchId} onChange={event => setReportQuery({ ...reportQuery, branchId: event.target.value })}><option value="">All branches</option>{data.branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}<label>Period from<input type="date" value={reportQuery.periodStart} onChange={event => setReportQuery({ ...reportQuery, periodStart: event.target.value })} /></label><label>Period to<input type="date" value={reportQuery.periodEnd} onChange={event => setReportQuery({ ...reportQuery, periodEnd: event.target.value })} /></label><button disabled={loading}>{loading ? "Loading…" : "Filter"}</button><button type="button" className="secondary" onClick={() => { const query = { type: "", status: "", branchId: "", periodStart: "", periodEnd: "", page: 0, size: 20 }; setReportQuery(query); loadReports(query); }}>Reset</button></form>
      {reportForm && <form className="portal-form-grid" onSubmit={saveReportDraft}><h3>{reportForm.id ? "Edit report draft" : "New report draft"}</h3><label>Report type<select required value={reportForm.reportType} disabled><option value="TEACHER_TO_MANAGER">Teacher to manager</option><option value="MANAGER_TO_ADMIN">Manager to administrator</option></select></label><label>Title<input required maxLength="200" value={reportForm.title} onChange={event => setReportForm({ ...reportForm, title: event.target.value })} /></label><label>Reporting period<select required value={reportForm.periodMode} onChange={event => changeReportPeriodMode(event.target.value)}><option value="DAILY">Daily</option><option value="WEEKLY">Weekly (Monday to Sunday)</option><option value="MONTHLY">Monthly</option><option value="CUSTOM">Custom date range</option></select></label>{reportForm.periodMode !== "CUSTOM" ? <label>Reference date<input required type="date" value={reportForm.anchorDate} onChange={event => changeReportAnchorDate(event.target.value)} /></label> : <><label>Period from<input required type="date" value={reportForm.periodStart} onChange={event => setReportForm({ ...reportForm, periodStart: event.target.value })} /></label><label>Period to<input required type="date" value={reportForm.periodEnd} onChange={event => setReportForm({ ...reportForm, periodEnd: event.target.value })} /></label></>}<p className="portal-form-hint">Saved period: {reportForm.periodStart || "Choose start"} – {reportForm.periodEnd || "Choose end"}. Daily, weekly, and monthly dates use {REPORT_TIME_ZONE}; weekly periods start Monday.</p><label className="wide-field">Report content<textarea required rows="8" value={reportForm.content} onChange={event => setReportForm({ ...reportForm, content: event.target.value })} placeholder={isTeacher ? "Student progress, attendance, teaching activities, and relevant remarks." : "Student attendance, teacher attendance, Quran progress, teacher activities, and branch performance."} /></label><div className="portal-form-actions"><button disabled={saving}>{saving ? "Saving…" : "Save draft"}</button><button type="button" className="secondary" onClick={() => setReportForm(null)}>Cancel</button></div></form>}
      {reportAnalytics && <section className="portal-card"><h3>Report analytics</h3><p className="portal-form-hint">Counts come from persisted reports matching the current filters and your authorized scope. No attendance or progress totals are inferred from narrative report text.</p><div className="portal-stats"><div className="portal-card stat"><span>Matching reports</span><strong>{reportAnalytics.totalReports}</strong></div>{Object.entries(reportAnalytics.byStatus || {}).map(([label, value]) => <div className="portal-card stat" key={label}><span>{label.replaceAll("_", " ")}</span><strong>{value}</strong></div>)}</div><div className="portal-stats">{Object.entries(reportAnalytics.byType || {}).map(([label, value]) => <div className="portal-card stat" key={label}><span>{label.replaceAll("_", " ")}</span><strong>{value}</strong></div>)}{Object.entries(reportAnalytics.byBranch || {}).map(([label, value]) => <div className="portal-card stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>}
      {reports.length ? <><div className="portal-table-wrap"><table><thead><tr><th>Title</th><th>Type</th><th>Branch</th><th>Reporting period</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{reports.map(report => <tr key={report.id}><td><button className="table-action student-name" onClick={() => { setSelectedReport(report); setReportForm(null); }}>{report.title}</button></td><td>{report.reportType?.replaceAll("_", " ")}</td><td>{data.branches.find(branch => branch.id === report.branchId)?.name || report.branchId}</td><td>{report.periodStart} – {report.periodEnd}</td><td>{report.status}</td><td>{report.createdAt?.slice(0, 10) || "—"}</td><td><button className="table-action" onClick={() => { setSelectedReport(report); setReportForm(null); }}>View</button>{report.authorId === user.id && report.status === "DRAFT" && <><button className="table-action" onClick={() => setReportForm({ ...report, periodMode: "CUSTOM", anchorDate: report.periodStart })}>Edit</button><button className="table-action" disabled={saving} onClick={() => submitReport(report.id)}>Submit</button></>}{(isAdmin || report.authorId === user.id) && report.status === "DRAFT" && <button className="table-action danger-text" disabled={saving} onClick={() => deleteReportDraft(report)}>Delete draft</button>}</td></tr>)}</tbody></table></div><div className="student-pagination"><span>{reportPage.totalElements} reports · Page {reportPage.number + 1} of {Math.max(reportPage.totalPages, 1)}</span><div><button className="secondary" disabled={loading || reportPage.number <= 0} onClick={() => { const query = { ...reportQuery, page: reportPage.number - 1 }; setReportQuery(query); loadReports(query); }}>Previous</button><button className="secondary" disabled={loading || reportPage.number + 1 >= reportPage.totalPages} onClick={() => { const query = { ...reportQuery, page: reportPage.number + 1 }; setReportQuery(query); loadReports(query); }}>Next</button></div></div></> : !loading && <p className="portal-empty">No reports match these filters.</p>}
      {selectedReport && <section className="student-profile"><div className="portal-card-head"><div><p className="portal-eyebrow">REPORT · {selectedReport.status}</p><h3>{selectedReport.title}</h3></div><button className="secondary" onClick={() => { setSelectedReport(null); setReviewForm(null); }}>Close</button></div><dl className="student-profile-grid"><div><dt>Type</dt><dd>{selectedReport.reportType?.replaceAll("_", " ")}</dd></div><div><dt>Branch</dt><dd>{data.branches.find(branch => branch.id === selectedReport.branchId)?.name || selectedReport.branchId}</dd></div><div><dt>Period</dt><dd>{selectedReport.periodStart} – {selectedReport.periodEnd}</dd></div><div><dt>Author account</dt><dd>#{selectedReport.authorId}</dd></div></dl><h4>Content</h4><p className="report-content">{selectedReport.content}</p><h4>Status history</h4><p className="portal-form-hint">New timestamps use {REPORT_TIME_ZONE}; older creation timestamps may use the server timezone from when they were saved.</p><ol className="report-history"><li><strong>Draft created</strong><span>{selectedReport.createdAt || "Timestamp unavailable"}</span></li>{selectedReport.submittedAt && <li><strong>Submitted for review</strong><span>{selectedReport.submittedAt}</span></li>}{selectedReport.reviewedAt && <li><strong>Marked reviewed by account #{selectedReport.reviewedById}</strong><span>{selectedReport.reviewedAt}</span>{selectedReport.reviewRemarks && <p>{selectedReport.reviewRemarks}</p>}</li>}</ol>{(isManager && selectedReport.reportType === "TEACHER_TO_MANAGER" && selectedReport.branchId === user.branchId || isAdmin && selectedReport.reportType === "MANAGER_TO_ADMIN") && selectedReport.status === "SUBMITTED" && !reviewForm && <button onClick={() => setReviewForm({ id: selectedReport.id, reviewRemarks: "" })}>Review submitted report</button>}{reviewForm && <form className="portal-form-grid" onSubmit={reviewReport}><h4>Complete review</h4><label className="wide-field">Review remarks<textarea rows="4" maxLength="1000" value={reviewForm.reviewRemarks} onChange={event => setReviewForm({ ...reviewForm, reviewRemarks: event.target.value })} /></label><div className="portal-form-actions"><button disabled={saving}>{saving ? "Saving…" : "Mark reviewed"}</button><button type="button" className="secondary" onClick={() => setReviewForm(null)}>Cancel</button></div><p className="portal-form-hint">The backend supports marking a report reviewed. Approval, rejection, and return for correction are not defined.</p></form>}</section>}
    </article>}
    {section === "Notifications" && <article className="portal-card"><div className="portal-card-head"><div><h2>Parent notifications</h2><p>Review notification history and prepare parent messages from saved student and guardian records. SMS/WhatsApp delivery is not configured; pending records are not treated as sent.</p></div>{(isTeacher || isManager) && <button onClick={createNotificationDraft}>New notification</button>}</div>
      <form className="student-filters" onSubmit={event => { event.preventDefault(); const query = { ...notificationQuery, page: 0 }; setNotificationQuery(query); loadNotifications(query); }}><label>Parent, student, or student number<input type="search" value={notificationQuery.q} onChange={event => setNotificationQuery({ ...notificationQuery, q: event.target.value })} /></label><label>Delivery status<select value={notificationQuery.status} onChange={event => setNotificationQuery({ ...notificationQuery, status: event.target.value })}><option value="">All statuses</option><option value="PENDING">Pending</option><option value="SENT">Sent to provider</option><option value="DELIVERED">Delivered</option><option value="FAILED">Failed</option></select></label><label>Type<select value={notificationQuery.notificationType} onChange={event => setNotificationQuery({ ...notificationQuery, notificationType: event.target.value })}><option value="">All types</option><option value="PROGRESS_UPDATE">Progress update</option><option value="ATTENDANCE_ALERT">Attendance alert</option><option value="GENERAL">General</option></select></label>{isAdmin && <label>Branch<select value={notificationQuery.branchId} onChange={event => setNotificationQuery({ ...notificationQuery, branchId: event.target.value })}><option value="">All branches</option>{data.branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}<label>From<input type="date" value={notificationQuery.startDate} onChange={event => setNotificationQuery({ ...notificationQuery, startDate: event.target.value })} /></label><label>To<input type="date" value={notificationQuery.endDate} onChange={event => setNotificationQuery({ ...notificationQuery, endDate: event.target.value })} /></label><button disabled={loading}>{loading ? "Searching…" : "Filter"}</button><button type="button" className="secondary" onClick={() => { const query = { q: "", status: "", notificationType: "", studentId: "", branchId: "", startDate: "", endDate: "", page: 0, size: 20 }; setNotificationQuery(query); loadNotifications(query); }}>Reset</button></form>
      {notificationForm && <form className="portal-form-grid" onSubmit={saveNotification}><h3>Create parent notification</h3><label>Find student<input type="search" value={notificationStudentSearch} onChange={event => setNotificationStudentSearch(event.target.value)} placeholder="Name or student number" /></label><button type="button" className="secondary" onClick={() => searchNotificationStudents(notificationStudentSearch)}>Search students</button><label className="wide-field">Student<select required value={notificationForm.studentId} onChange={event => setNotificationForm({ ...notificationForm, studentId: event.target.value })}><option value="">Choose a student</option>{notificationStudents.map(student => <option key={student.id} value={student.id}>{student.fullName} · {student.studentNumber}</option>)}</select></label>{(() => { const selected = notificationStudents.find(student => String(student.id) === String(notificationForm.studentId)); return selected ? <p className="portal-form-hint wide-field">Guardian: {selected.guardianName || "Missing name"} · Contact: {selected.guardianPhone ? `${selected.guardianPhone.slice(0, 2)}••••${selected.guardianPhone.slice(-2)}` : "Missing number"}. Verify the saved contact on the student profile before sending.</p> : null; })()}<label>Notification type<select value={notificationForm.notificationType} onChange={event => setNotificationForm({ ...notificationForm, notificationType: event.target.value })}><option value="PROGRESS_UPDATE">Progress update</option><option value="ATTENDANCE_ALERT">Attendance alert</option><option value="GENERAL">General</option></select></label><label>Related Quran progress ID (optional)<input type="number" min="1" value={notificationForm.relatedProgressId} onChange={event => setNotificationForm({ ...notificationForm, relatedProgressId: event.target.value })} /></label><label className="wide-field">Message<textarea required maxLength="4000" rows="5" value={notificationForm.content} onChange={event => setNotificationForm({ ...notificationForm, content: event.target.value })} /></label><p className="portal-form-hint wide-field">Saving creates a pending history record only. No provider has been selected or configured, so this will not send an SMS or WhatsApp message.</p><div className="portal-form-actions"><button disabled={saving}>{saving ? "Saving…" : "Save pending notification"}</button><button type="button" className="secondary" onClick={() => setNotificationForm(null)}>Cancel</button></div></form>}
      {notifications.length ? <><div className="portal-table-wrap"><table><thead><tr><th>Date</th><th>Student</th><th>Parent contact</th><th>Type</th><th>Status</th><th>Attempts</th><th>Actions</th></tr></thead><tbody>{notifications.map(notification => <tr key={notification.id}><td>{notification.createdAt?.slice(0, 16)?.replace("T", " ") || "—"}</td><td>{notification.studentName || `Student #${notification.studentId}`}</td><td><details><summary>{notification.parentName || "Guardian"} · {notification.parentContact ? `${notification.parentContact.slice(0, 2)}••••${notification.parentContact.slice(-2)}` : "No contact"}</summary><span>{notification.parentContact || "No saved contact"}</span></details></td><td>{notification.notificationType?.replaceAll("_", " ")}</td><td>{notification.deliveryStatus}</td><td>{notification.attemptCount || 0}</td><td><button className="table-action" onClick={() => openNotification(notification)}>View</button>{(isAdmin || isManager) && (notification.deliveryStatus === "PENDING" || notification.deliveryStatus === "FAILED") && <button className="table-action" disabled={notificationBusyId === notification.id} onClick={() => deliverNotification(notification)}>{notificationBusyId === notification.id ? "Attempting…" : notification.deliveryStatus === "FAILED" ? "Retry" : "Send"}</button>}{(isAdmin || isManager) && notification.deliveryStatus === "PENDING" && <button className="table-action danger-text" disabled={notificationBusyId === notification.id} onClick={() => deleteNotification(notification)}>Delete</button>}</td></tr>)}</tbody></table></div><div className="student-pagination"><span>{notificationPage.totalElements} notifications · Page {notificationPage.number + 1} of {Math.max(notificationPage.totalPages, 1)}</span><div><button className="secondary" disabled={loading || notificationPage.number <= 0} onClick={() => { const query = { ...notificationQuery, page: notificationPage.number - 1 }; setNotificationQuery(query); loadNotifications(query); }}>Previous</button><button className="secondary" disabled={loading || notificationPage.number + 1 >= notificationPage.totalPages} onClick={() => { const query = { ...notificationQuery, page: notificationPage.number + 1 }; setNotificationQuery(query); loadNotifications(query); }}>Next</button></div></div></> : !loading && <p className="portal-empty">No notifications match these filters.</p>}
      {selectedNotification && <section className="student-profile"><div className="portal-card-head"><div><p className="portal-eyebrow">NOTIFICATION · {selectedNotification.deliveryStatus}</p><h3>{selectedNotification.parentName || "Parent/guardian"} · {selectedNotification.studentName || `Student #${selectedNotification.studentId}`}</h3></div><button className="secondary" onClick={() => setSelectedNotification(null)}>Close</button></div><dl className="student-profile-grid"><div><dt>Contact</dt><dd>{selectedNotification.parentContact || "Not recorded"}</dd></div><div><dt>Type</dt><dd>{selectedNotification.notificationType?.replaceAll("_", " ")}</dd></div><div><dt>Channel</dt><dd>{selectedNotification.deliveryChannel || "Not configured"}</dd></div><div><dt>Created</dt><dd>{selectedNotification.createdAt || "—"}</dd></div><div><dt>Delivery attempts</dt><dd>{selectedNotification.attemptCount || 0}</dd></div><div><dt>Last attempt</dt><dd>{selectedNotification.lastAttemptAt || "Not attempted"}</dd></div><div><dt>Sent / delivered</dt><dd>{selectedNotification.deliveredAt || selectedNotification.sentAt || "Not confirmed"}</dd></div><div><dt>Provider reference</dt><dd>{selectedNotification.providerMessageId || "—"}</dd></div></dl><h4>Message</h4><p className="report-content">{selectedNotification.content}</p>{selectedNotification.failureReason && <p className="portal-alert error">{selectedNotification.failureReason}</p>}{selectedNotification.providerResponse && <><h4>Latest provider response</h4><p className="report-content">{selectedNotification.providerResponse}</p></>}<h4>Delivery attempt history</h4>{notificationAttempts.length ? <ol className="report-history">{notificationAttempts.map(attempt => <li key={attempt.id}><strong>Attempt {attempt.attemptNumber} · {attempt.status}</strong><span>{attempt.attemptedAt} · {attempt.channel || "Provider unavailable"}</span>{attempt.failureReason && <p>{attempt.failureReason}</p>}{attempt.providerResponse && <p>{attempt.providerResponse}</p>}</li>)}</ol> : <p className="portal-form-hint">No provider attempts have been recorded.</p>}</section>}
    </article>}
    {section === "Users" && <article className="portal-card"><div className="portal-card-head"><div><h2>Users</h2><p>Create administrator, branch manager, and teacher accounts, edit account details, and enable or disable them.</p></div>{isAdmin && <button onClick={() => setUserForm({ ...blankUser })}>Add user</button>}</div>
      <form className="student-filters" onSubmit={event => { event.preventDefault(); const query = { ...userFilter, page: 0 }; setUserFilter(query); loadUsers(query); }}><label>Search<input type="search" value={userFilter.q} onChange={event => setUserFilter({ ...userFilter, q: event.target.value })} placeholder="Username, name, email, or phone" /></label><label>Role<select value={userFilter.role} onChange={event => setUserFilter({ ...userFilter, role: event.target.value })}><option value="">All roles</option><option value="ADMINISTRATOR">Administrator</option><option value="BRANCH_MANAGER">Branch manager</option><option value="QURAN_TEACHER">Quran teacher</option></select></label><label>Status<select value={userFilter.active} onChange={event => setUserFilter({ ...userFilter, active: event.target.value })}><option value="">All statuses</option><option value="true">Active</option><option value="false">Disabled</option></select></label><button disabled={loading}>{loading ? "Searching…" : "Search"}</button><button type="button" className="secondary" onClick={() => { const query = { q: "", role: "", active: "", page: 0, size: 20 }; setUserFilter(query); loadUsers(query); }}>Reset</button></form>
      {userForm && <form className="portal-form-grid" onSubmit={saveUser}><h3>{userForm.id ? "Edit account · #" + userForm.id : "Create account"}</h3><label>Username<input required maxLength="80" value={userForm.username} onChange={event => setUserForm({ ...userForm, username: event.target.value })} /></label><label>Role<select required value={userForm.role} onChange={event => setUserForm({ ...userForm, role: event.target.value, branchId: event.target.value === "ADMINISTRATOR" ? "" : userForm.branchId })}><option value="ADMINISTRATOR">Administrator</option><option value="BRANCH_MANAGER">Branch manager</option><option value="QURAN_TEACHER">Quran teacher</option></select></label>{userForm.role !== "ADMINISTRATOR" && <label>Branch<select required value={userForm.branchId || ""} onChange={event => setUserForm({ ...userForm, branchId: event.target.value })}><option value="">Choose branch</option>{selectableBranches(userForm.branchId).map(branch => <option key={branch.id} value={branch.id}>{branch.name}{branch.active ? "" : " (inactive; keep existing assignment)"}</option>)}</select></label>}<label>Full name<input maxLength="150" value={userForm.fullName || ""} onChange={event => setUserForm({ ...userForm, fullName: event.target.value })} /></label><label>Email<input type="email" maxLength="254" value={userForm.email || ""} onChange={event => setUserForm({ ...userForm, email: event.target.value })} /></label><label>Phone<input type="tel" maxLength="30" value={userForm.phone || ""} onChange={event => setUserForm({ ...userForm, phone: event.target.value })} /></label><label>{userForm.id ? "New password (optional)" : "Initial password"}<input type="password" autoComplete="new-password" required={!userForm.id} minLength="12" maxLength="100" value={userForm.password || ""} onChange={event => setUserForm({ ...userForm, password: event.target.value })} /></label>{userForm.id && <label>Status<select required value={String(userForm.active)} onChange={event => setUserForm({ ...userForm, active: event.target.value === "true" })}><option value="true">Active</option><option value="false">Disabled</option></select></label>}<div className="portal-form-actions"><button disabled={saving}>{saving ? "Saving…" : "Save account"}</button><button type="button" className="secondary" onClick={() => setUserForm(null)}>Cancel</button></div></form>}
      {visibleUsers.length ? <><div className="portal-table-wrap"><table><thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Branch</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visibleUsers.map(account => <tr key={account.id}><td>{account.username}</td><td>{account.fullName || "—"}</td><td>{account.role.replaceAll("_", " ")}</td><td>{data.branches.find(branch => branch.id === account.branchId)?.name || (account.branchId || "—")}</td><td>{account.active ? "Active" : "Disabled"}</td><td><button className="table-action" onClick={() => setUserForm({ ...account, password: "", branchId: account.branchId ? String(account.branchId) : "" })}>Edit</button><button disabled={account.active && account.id === user.id} className={account.active ? "table-action danger-text" : "table-action"} onClick={() => toggleUserStatus(account)}>{account.active ? "Disable" : "Reactivate"}</button></td></tr>)}</tbody></table></div><div className="student-pagination"><span>{userPage.totalElements} accounts · Page {userPage.number + 1} of {Math.max(userPage.totalPages, 1)}</span><div><button className="secondary" disabled={loading || userPage.number <= 0} onClick={() => { const query = { ...userFilter, page: userPage.number - 1 }; setUserFilter(query); loadUsers(query); }}>Previous</button><button className="secondary" disabled={loading || userPage.number + 1 >= userPage.totalPages} onClick={() => { const query = { ...userFilter, page: userPage.number + 1 }; setUserFilter(query); loadUsers(query); }}>Next</button></div></div></> : !loading && <p className="portal-empty">No user accounts match these filters.</p>}</article>}
  </section></main>;
}
