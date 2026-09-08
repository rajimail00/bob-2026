import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { adminService } from "./admin.service.js";
import {
  adminDashboardQuerySchema, adminIdParamsSchema, adminJobsQuerySchema, adminUserJobsQuerySchema, adminUsersQuerySchema,
  bulkModerationSchema, bulkTicketSchema, bulkUserStatusSchema, categoryCreateSchema,
  categoryUpdateSchema, configSchema, faqCreateSchema, faqListQuerySchema, faqUpdateSchema,
  moderationSchema, notificationsQuerySchema, reorderSchema, ticketNoteSchema, ticketReplySchema,
  ticketsQuerySchema, updateTicketSchema, userRoleSchema, userStatusSchema,
} from "./admin.validation.js";

function auth(req: Request) {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth;
}

export const adminController = {
  async dashboard(req: Request, res: Response) { res.json(await adminService.dashboard(adminDashboardQuerySchema.parse(req.query).period)); },
  async users(req: Request, res: Response) { res.json(await adminService.listUsers(adminUsersQuerySchema.parse(req.query))); },
  async user(req: Request, res: Response) { res.json(await adminService.getUser(adminIdParamsSchema.parse(req.params).id)); },
  async userJobs(req: Request, res: Response) { res.json(await adminService.getUserJobs(adminIdParamsSchema.parse(req.params).id, adminUserJobsQuerySchema.parse(req.query))); },
  async userStatus(req: Request, res: Response) { const id = adminIdParamsSchema.parse(req.params).id; const { status } = userStatusSchema.parse(req.body); res.json({ user: await adminService.updateUserStatus(auth(req).userId, id, status) }); },
  async userRole(req: Request, res: Response) { const id = adminIdParamsSchema.parse(req.params).id; const { role } = userRoleSchema.parse(req.body); res.json({ user: await adminService.updateUserRole(auth(req).userId, id, role) }); },
  async bulkUserStatus(req: Request, res: Response) { const input = bulkUserStatusSchema.parse(req.body); res.json({ users: await adminService.bulkUserStatus(auth(req).userId, input.userIds, input.status) }); },

  async jobs(req: Request, res: Response) { res.json(await adminService.listJobs(adminJobsQuerySchema.parse(req.query))); },
  async job(req: Request, res: Response) { res.json(await adminService.getJob(adminIdParamsSchema.parse(req.params).id)); },
  async moderateJob(req: Request, res: Response) { const id = adminIdParamsSchema.parse(req.params).id; const input = moderationSchema.parse(req.body); res.json(await adminService.moderateJob(auth(req).userId, id, input.status, input.reason)); },
  async bulkModerateJobs(req: Request, res: Response) { const input = bulkModerationSchema.parse(req.body); res.json({ jobs: await adminService.bulkModerateJobs(auth(req).userId, input.jobIds, input.status, input.reason) }); },
  async cancelJob(req: Request, res: Response) { res.json({ job: await adminService.cancelJob(auth(req).userId, adminIdParamsSchema.parse(req.params).id) }); },

  async tickets(req: Request, res: Response) { res.json(await adminService.listTickets(ticketsQuerySchema.parse(req.query))); },
  async ticket(req: Request, res: Response) { res.json(await adminService.getTicket(adminIdParamsSchema.parse(req.params).id)); },
  async updateTicket(req: Request, res: Response) { const id = adminIdParamsSchema.parse(req.params).id; res.json(await adminService.updateTicket(auth(req).userId, id, updateTicketSchema.parse(req.body))); },
  async replyTicket(req: Request, res: Response) { const id = adminIdParamsSchema.parse(req.params).id; const { message } = ticketReplySchema.parse(req.body); res.status(201).json(await adminService.replyToTicket(auth(req).userId, id, message)); },
  async noteTicket(req: Request, res: Response) { const id = adminIdParamsSchema.parse(req.params).id; const { note } = ticketNoteSchema.parse(req.body); res.status(201).json(await adminService.addTicketNote(auth(req).userId, id, note)); },
  async bulkTickets(req: Request, res: Response) { const { ticketIds, ...input } = bulkTicketSchema.parse(req.body); res.json({ tickets: await adminService.bulkUpdateTickets(auth(req).userId, ticketIds, input) }); },

  async categories(_req: Request, res: Response) { res.json({ categories: await adminService.listCategories() }); },
  async createCategory(req: Request, res: Response) { res.status(201).json({ category: await adminService.createCategory(auth(req).userId, categoryCreateSchema.parse(req.body)) }); },
  async updateCategory(req: Request, res: Response) { res.json({ category: await adminService.updateCategory(auth(req).userId, adminIdParamsSchema.parse(req.params).id, categoryUpdateSchema.parse(req.body)) }); },
  async deleteCategory(req: Request, res: Response) { await adminService.deleteCategory(auth(req).userId, adminIdParamsSchema.parse(req.params).id); res.status(204).send(); },
  async reorderCategories(req: Request, res: Response) { res.json({ categories: await adminService.reorderCategories(auth(req).userId, reorderSchema.parse(req.body).items) }); },

  async faqs(req: Request, res: Response) { res.json(await adminService.listFaqs(faqListQuerySchema.parse(req.query))); },
  async createFaq(req: Request, res: Response) { res.status(201).json({ faq: await adminService.createFaq(auth(req).userId, faqCreateSchema.parse(req.body)) }); },
  async updateFaq(req: Request, res: Response) { res.json({ faq: await adminService.updateFaq(auth(req).userId, adminIdParamsSchema.parse(req.params).id, faqUpdateSchema.parse(req.body)) }); },
  async deleteFaq(req: Request, res: Response) { await adminService.deleteFaq(auth(req).userId, adminIdParamsSchema.parse(req.params).id); res.status(204).send(); },
  async reorderFaqs(req: Request, res: Response) { await adminService.reorderFaqs(auth(req).userId, reorderSchema.parse(req.body).items); res.status(204).send(); },

  async config(_req: Request, res: Response) { res.json({ config: await adminService.getConfig() }); },
  async updateConfig(req: Request, res: Response) { res.json({ config: await adminService.updateConfig(auth(req).userId, configSchema.parse(req.body)) }); },
  async notifications(req: Request, res: Response) { const query = notificationsQuerySchema.parse(req.query); res.json(await adminService.listNotifications(auth(req).userId, query.page, query.pageSize)); },
  async readNotification(req: Request, res: Response) { res.json({ notification: await adminService.markNotificationRead(auth(req).userId, adminIdParamsSchema.parse(req.params).id) }); },
  async readAllNotifications(req: Request, res: Response) { res.json(await adminService.markAllNotificationsRead(auth(req).userId)); },
};
