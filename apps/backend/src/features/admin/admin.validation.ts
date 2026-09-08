import { z } from "zod";
import { USER_ROLES } from "../auth/auth.model.js";
import { JOB_MODERATION_STATUSES, JOB_STATUSES } from "../jobs/job.model.js";
import { PROBLEM_REASONS, TICKET_PRIORITIES, TICKET_STATUSES } from "../problems/problem.model.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");
const page = z.coerce.number().int().min(1).default(1);
const pageSize = z.coerce.number().int().min(1).max(50).default(20);
const search = z.string().trim().max(120).optional();

export const adminIdParamsSchema = z.object({ id: objectId }).strict();
export const adminDashboardQuerySchema = z
  .object({ period: z.enum(["day", "week", "month", "year"]).default("week") })
  .strict();

export const adminUsersQuerySchema = z
  .object({
    page,
    pageSize,
    search,
    type: z.enum(["admin", "worker", "client"]).optional(),
    status: z.enum(["active", "banned"]).optional(),
    sort: z.enum(["name_asc", "name_desc", "newest", "oldest", "recent_activity"]).default("newest"),
  })
  .strict();
export const adminUserJobsQuerySchema = z
  .object({
    page,
    pageSize,
    search,
    kind: z.enum(["offered", "taken"]).default("offered"),
    status: z.enum(JOB_STATUSES).optional(),
    sort: z.enum(["newest", "oldest", "scheduled_asc", "scheduled_desc"]).default("newest"),
  })
  .strict();
export const userStatusSchema = z.object({ status: z.enum(["active", "banned"]) }).strict();
export const userRoleSchema = z.object({ role: z.enum(USER_ROLES) }).strict();
export const bulkUserStatusSchema = z
  .object({ userIds: z.array(objectId).min(1).max(100), status: z.enum(["active", "banned"]) })
  .strict();

export const adminJobsQuerySchema = z
  .object({
    page,
    pageSize,
    search,
    status: z.enum(JOB_STATUSES).optional(),
    moderationStatus: z.enum(JOB_MODERATION_STATUSES).optional(),
    categoryId: objectId.optional(),
    emergency: z.coerce.boolean().optional(),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional(),
    scheduledFrom: z.coerce.date().optional(),
    scheduledTo: z.coerce.date().optional(),
    sort: z.enum(["newest", "oldest", "scheduled_asc", "scheduled_desc"]).default("newest"),
  })
  .strict();
export const moderationSchema = z
  .object({ status: z.enum(JOB_MODERATION_STATUSES), reason: z.string().trim().max(1000).optional() })
  .strict();
export const bulkModerationSchema = z
  .object({ jobIds: z.array(objectId).min(1).max(100), status: z.enum(JOB_MODERATION_STATUSES), reason: z.string().trim().max(1000).optional() })
  .strict();

export const ticketsQuerySchema = z
  .object({
    page,
    pageSize,
    search,
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    reason: z.enum(PROBLEM_REASONS).optional(),
    assignedAdminId: objectId.optional(),
    sort: z.enum(["newest", "oldest", "priority", "updated"]).default("newest"),
  })
  .strict();
export const updateTicketSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    assignedAdminId: objectId.nullable().optional(),
    resolutionNote: z.string().trim().max(2000).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Provide a ticket update");
export const ticketReplySchema = z.object({ message: z.string().trim().min(1).max(2000) }).strict();
export const ticketNoteSchema = z.object({ note: z.string().trim().min(1).max(2000) }).strict();
export const bulkTicketSchema = z
  .object({ ticketIds: z.array(objectId).min(1).max(100), status: z.enum(TICKET_STATUSES).optional(), priority: z.enum(TICKET_PRIORITIES).optional(), assignedAdminId: objectId.nullable().optional() })
  .strict()
  .refine((value) => value.status || value.priority || value.assignedAdminId !== undefined, "Provide a ticket update");

const localizedText = z.object({ en: z.string().trim().min(1), de: z.string().trim().min(1), es: z.string().trim().min(1), fr: z.string().trim().min(1) }).strict();
export const categoryCreateSchema = z.object({ slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(80), name: localizedText, icon: z.string().trim().min(1).max(80), imageUrl: z.string().url().max(2048).nullable().optional(), order: z.number().int().min(0).default(0) }).strict();
export const categoryUpdateSchema = categoryCreateSchema.partial().refine((value) => Object.keys(value).length > 0, "Provide a category update");
export const reorderSchema = z.object({ items: z.array(z.object({ id: objectId, order: z.number().int().min(0) }).strict()).min(1).max(200) }).strict();

export const faqCreateSchema = z.object({ question: localizedText, answer: localizedText, section: z.string().trim().min(1).max(80), order: z.number().int().min(0).default(0), published: z.boolean().default(false) }).strict();
export const faqUpdateSchema = faqCreateSchema.partial().refine((value) => Object.keys(value).length > 0, "Provide an FAQ update");
export const faqListQuerySchema = z.object({ page, pageSize, search, published: z.coerce.boolean().optional() }).strict();

export const configSchema = z.object({ supportEmail: z.string().email().or(z.literal("")).optional(), maintenanceMessage: z.string().trim().max(1000).optional() }).strict().refine((value) => Object.keys(value).length > 0, "Provide a configuration update");
export const notificationsQuerySchema = z.object({ page, pageSize }).strict();

export type AdminDashboardQuery = z.infer<typeof adminDashboardQuerySchema>;
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type AdminUserJobsQuery = z.infer<typeof adminUserJobsQuerySchema>;
export type AdminJobsQuery = z.infer<typeof adminJobsQuerySchema>;
export type TicketsQuery = z.infer<typeof ticketsQuerySchema>;
