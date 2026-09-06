import { apiClient } from "@/lib/apiClient";
import type { AdminApplication, AdminJob, AdminNotification, AdminPeriod, AdminUser, AuditEntry, Category, DashboardData, Faq, JobQuery, LocalizedText, ModerationStatus, Page, Ticket, TicketPriority, TicketQuery, TicketStatus, UserQuery, UserStats } from "../types/admin.types";
import type { UserRole } from "@/features/auth/types/auth.types";

export const adminApi = {
  async dashboard(period: AdminPeriod) { return (await apiClient.get<DashboardData>("/admin/dashboard", { params: { period } })).data; },
  async users(query: UserQuery) { return (await apiClient.get<Page<AdminUser>>("/admin/users", { params: query })).data; },
  async user(id: string) { return (await apiClient.get<{ user: AdminUser; stats: UserStats }>(`/admin/users/${id}`)).data; },
  async setUserStatus(id: string, status: "active" | "banned") { return (await apiClient.patch<{ user: AdminUser }>(`/admin/users/${id}/status`, { status })).data.user; },
  async setUserRole(id: string, role: UserRole) { return (await apiClient.patch<{ user: AdminUser }>(`/admin/users/${id}/role`, { role })).data.user; },
  async bulkUserStatus(userIds: string[], status: "active" | "banned") { return (await apiClient.post<{ users: AdminUser[] }>("/admin/users/bulk-status", { userIds, status })).data.users; },

  async jobs(query: JobQuery) { return (await apiClient.get<Page<AdminJob>>("/admin/jobs", { params: query })).data; },
  async job(id: string) { return (await apiClient.get<{ job: AdminJob; related: { applications: AdminApplication[]; messageCount: number; tickets: Pick<Ticket, "_id" | "reason" | "status" | "priority" | "createdAt">[]; audits: AuditEntry[] } }>(`/admin/jobs/${id}`)).data; },
  async moderateJob(id: string, status: ModerationStatus, reason?: string) { return (await apiClient.patch(`/admin/jobs/${id}/moderation`, { status, reason })).data; },
  async bulkModerateJobs(jobIds: string[], status: ModerationStatus, reason?: string) { return (await apiClient.post("/admin/jobs/bulk-moderation", { jobIds, status, reason })).data; },
  async cancelJob(id: string) { return (await apiClient.post<{ job: AdminJob }>(`/admin/jobs/${id}/cancel`)).data.job; },

  async tickets(query: TicketQuery) { return (await apiClient.get<Page<Ticket>>("/admin/tickets", { params: query })).data; },
  async ticket(id: string) { return (await apiClient.get<{ ticket: Ticket; audits: AuditEntry[] }>(`/admin/tickets/${id}`)).data; },
  async updateTicket(id: string, input: { status?: TicketStatus; priority?: TicketPriority; assignedAdminId?: string | null; resolutionNote?: string }) { return (await apiClient.patch(`/admin/tickets/${id}`, input)).data; },
  async replyTicket(id: string, message: string) { return (await apiClient.post(`/admin/tickets/${id}/replies`, { message })).data; },
  async noteTicket(id: string, note: string) { return (await apiClient.post(`/admin/tickets/${id}/notes`, { note })).data; },
  async bulkUpdateTickets(ticketIds: string[], input: { status?: TicketStatus; priority?: TicketPriority }) { return (await apiClient.post("/admin/tickets/bulk-update", { ticketIds, ...input })).data; },

  async categories() { return (await apiClient.get<{ categories: Category[] }>("/admin/categories")).data.categories; },
  async createCategory(input: { slug: string; name: LocalizedText; icon: string; imageUrl?: string | null; order: number }) { return (await apiClient.post<{ category: Category }>("/admin/categories", input)).data.category; },
  async updateCategory(id: string, input: Partial<{ slug: string; name: LocalizedText; icon: string; imageUrl: string | null; order: number }>) { return (await apiClient.patch<{ category: Category }>(`/admin/categories/${id}`, input)).data.category; },
  async deleteCategory(id: string) { await apiClient.delete(`/admin/categories/${id}`); },
  async reorderCategories(items: { id: string; order: number }[]) { return (await apiClient.patch<{ categories: Category[] }>("/admin/categories/reorder", { items })).data.categories; },

  async faqs(query: { page?: number; pageSize?: number; search?: string }) { return (await apiClient.get<Page<Faq>>("/admin/faqs", { params: query })).data; },
  async createFaq(input: { question: LocalizedText; answer: LocalizedText; section: string; order: number; published: boolean }) { return (await apiClient.post<{ faq: Faq }>("/admin/faqs", input)).data.faq; },
  async updateFaq(id: string, input: Partial<{ question: LocalizedText; answer: LocalizedText; section: string; order: number; published: boolean }>) { return (await apiClient.patch<{ faq: Faq }>(`/admin/faqs/${id}`, input)).data.faq; },
  async deleteFaq(id: string) { await apiClient.delete(`/admin/faqs/${id}`); },
  async reorderFaqs(items: { id: string; order: number }[]) { await apiClient.patch("/admin/faqs/reorder", { items }); },
  async config() { return (await apiClient.get<{ config: { supportEmail?: string; maintenanceMessage?: string } }>("/admin/configuration")).data.config; },
  async updateConfig(input: { supportEmail?: string; maintenanceMessage?: string }) { return (await apiClient.patch<{ config: { supportEmail?: string; maintenanceMessage?: string } }>("/admin/configuration", input)).data.config; },
  async notifications(page = 1) { return (await apiClient.get<Page<AdminNotification>>("/admin/notifications", { params: { page, pageSize: 30 } })).data; },
  async readNotification(id: string) { return (await apiClient.patch<{ notification: AdminNotification }>(`/admin/notifications/${id}/read`)).data.notification; },
  async readAllNotifications() { return (await apiClient.patch<{ updatedCount: number }>("/admin/notifications/read-all")).data; },
};
