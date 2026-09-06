import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../api/admin.api";
import type { AdminPeriod, JobQuery, ModerationStatus, TicketPriority, TicketQuery, TicketStatus, UserQuery } from "../types/admin.types";
import { Alert } from "react-native";
import i18n from "@/lib/i18n";
import { getApiErrorMessage } from "@/lib/apiClient";

export const adminKeys = {
  all: ["admin"] as const,
  dashboard: (period: AdminPeriod) => ["admin", "dashboard", period] as const,
  users: (query: UserQuery) => ["admin", "users", query] as const,
  user: (id: string) => ["admin", "user", id] as const,
  jobs: (query: JobQuery) => ["admin", "jobs", query] as const,
  job: (id: string) => ["admin", "job", id] as const,
  tickets: (query: TicketQuery) => ["admin", "tickets", query] as const,
  ticket: (id: string) => ["admin", "ticket", id] as const,
  categories: ["admin", "categories"] as const,
  faqs: ["admin", "faqs"] as const,
  config: ["admin", "config"] as const,
  notifications: ["admin", "notifications"] as const,
};

export const useAdminDashboard = (period: AdminPeriod) => useQuery({ queryKey: adminKeys.dashboard(period), queryFn: () => adminApi.dashboard(period) });
export const useAdminUsers = (query: UserQuery) => useQuery({ queryKey: adminKeys.users(query), queryFn: () => adminApi.users(query) });
export const useAdminUser = (id: string) => useQuery({ queryKey: adminKeys.user(id), queryFn: () => adminApi.user(id) });
export const useAdminJobs = (query: JobQuery) => useQuery({ queryKey: adminKeys.jobs(query), queryFn: () => adminApi.jobs(query) });
export const useAdminJob = (id: string) => useQuery({ queryKey: adminKeys.job(id), queryFn: () => adminApi.job(id) });
export const useAdminTickets = (query: TicketQuery) => useQuery({ queryKey: adminKeys.tickets(query), queryFn: () => adminApi.tickets(query) });
export const useAdminTicket = (id: string) => useQuery({ queryKey: adminKeys.ticket(id), queryFn: () => adminApi.ticket(id) });
export const useAdminCategories = () => useQuery({ queryKey: adminKeys.categories, queryFn: adminApi.categories });
export const useAdminFaqs = () => useQuery({ queryKey: adminKeys.faqs, queryFn: () => adminApi.faqs({ pageSize: 50 }) });
export const useAdminConfig = () => useQuery({ queryKey: adminKeys.config, queryFn: adminApi.config });
export const useAdminNotifications = () => useQuery({ queryKey: adminKeys.notifications, queryFn: () => adminApi.notifications(), refetchInterval: 30_000 });

function useAdminMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>, keys: readonly unknown[] = adminKeys.all) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => client.invalidateQueries({ queryKey: keys }),
    onError: (error) => Alert.alert(i18n.t("admin.common.actionError"), getApiErrorMessage(error, i18n.t("common.genericError"))),
  });
}
export const useSetAdminUserStatus = () => useAdminMutation(({ id, status }: { id: string; status: "active" | "banned" }) => adminApi.setUserStatus(id, status));
export const useSetAdminUserRole = () => useAdminMutation(({ id, role }: { id: string; role: "client" | "worker" | "admin" }) => adminApi.setUserRole(id, role));
export const useBulkAdminUserStatus = () => useAdminMutation(({ userIds, status }: { userIds: string[]; status: "active" | "banned" }) => adminApi.bulkUserStatus(userIds, status));
export const useModerateAdminJob = () => useAdminMutation(({ id, status, reason }: { id: string; status: ModerationStatus; reason?: string }) => adminApi.moderateJob(id, status, reason));
export const useBulkModerateAdminJobs = () => useAdminMutation(({ jobIds, status }: { jobIds: string[]; status: ModerationStatus }) => adminApi.bulkModerateJobs(jobIds, status));
export const useCancelAdminJob = () => useAdminMutation((id: string) => adminApi.cancelJob(id));
export const useUpdateAdminTicket = () => useAdminMutation(({ id, ...input }: { id: string; status?: TicketStatus; priority?: TicketPriority; assignedAdminId?: string | null; resolutionNote?: string }) => adminApi.updateTicket(id, input));
export const useReplyAdminTicket = () => useAdminMutation(({ id, message }: { id: string; message: string }) => adminApi.replyTicket(id, message));
export const useNoteAdminTicket = () => useAdminMutation(({ id, note }: { id: string; note: string }) => adminApi.noteTicket(id, note));
export const useBulkUpdateAdminTickets = () => useAdminMutation(({ ticketIds, status }: { ticketIds: string[]; status: TicketStatus }) => adminApi.bulkUpdateTickets(ticketIds, { status }));
export const useCreateAdminCategory = () => useAdminMutation(adminApi.createCategory, adminKeys.categories);
export const useUpdateAdminCategory = () => useAdminMutation(({ id, ...input }: Parameters<typeof adminApi.updateCategory>[1] & { id: string }) => adminApi.updateCategory(id, input), adminKeys.categories);
export const useDeleteAdminCategory = () => useAdminMutation((id: string) => adminApi.deleteCategory(id), adminKeys.categories);
export const useCreateAdminFaq = () => useAdminMutation(adminApi.createFaq, adminKeys.faqs);
export const useUpdateAdminFaq = () => useAdminMutation(({ id, ...input }: Parameters<typeof adminApi.updateFaq>[1] & { id: string }) => adminApi.updateFaq(id, input), adminKeys.faqs);
export const useDeleteAdminFaq = () => useAdminMutation((id: string) => adminApi.deleteFaq(id), adminKeys.faqs);
export const useUpdateAdminConfig = () => useAdminMutation(adminApi.updateConfig, adminKeys.config);
export const useReadAdminNotification = () => useAdminMutation((id: string) => adminApi.readNotification(id), adminKeys.notifications);
export const useReadAllAdminNotifications = () => useAdminMutation(() => adminApi.readAllNotifications(), adminKeys.notifications);
