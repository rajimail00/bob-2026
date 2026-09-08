import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { adminController as c } from "./admin.controller.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get("/dashboard", asyncHandler(c.dashboard));
adminRouter.get("/users", asyncHandler(c.users));
adminRouter.post("/users/bulk-status", asyncHandler(c.bulkUserStatus));
adminRouter.get("/users/:id/jobs", asyncHandler(c.userJobs));
adminRouter.get("/users/:id", asyncHandler(c.user));
adminRouter.patch("/users/:id/status", asyncHandler(c.userStatus));
adminRouter.patch("/users/:id/role", asyncHandler(c.userRole));

adminRouter.get("/jobs", asyncHandler(c.jobs));
adminRouter.post("/jobs/bulk-moderation", asyncHandler(c.bulkModerateJobs));
adminRouter.get("/jobs/:id", asyncHandler(c.job));
adminRouter.patch("/jobs/:id/moderation", asyncHandler(c.moderateJob));
adminRouter.post("/jobs/:id/cancel", asyncHandler(c.cancelJob));

adminRouter.get("/tickets", asyncHandler(c.tickets));
adminRouter.post("/tickets/bulk-update", asyncHandler(c.bulkTickets));
adminRouter.get("/tickets/:id", asyncHandler(c.ticket));
adminRouter.patch("/tickets/:id", asyncHandler(c.updateTicket));
adminRouter.post("/tickets/:id/replies", asyncHandler(c.replyTicket));
adminRouter.post("/tickets/:id/notes", asyncHandler(c.noteTicket));

adminRouter.get("/categories", asyncHandler(c.categories));
adminRouter.post("/categories", asyncHandler(c.createCategory));
adminRouter.patch("/categories/reorder", asyncHandler(c.reorderCategories));
adminRouter.patch("/categories/:id", asyncHandler(c.updateCategory));
adminRouter.delete("/categories/:id", asyncHandler(c.deleteCategory));

adminRouter.get("/faqs", asyncHandler(c.faqs));
adminRouter.post("/faqs", asyncHandler(c.createFaq));
adminRouter.patch("/faqs/reorder", asyncHandler(c.reorderFaqs));
adminRouter.patch("/faqs/:id", asyncHandler(c.updateFaq));
adminRouter.delete("/faqs/:id", asyncHandler(c.deleteFaq));

adminRouter.get("/configuration", asyncHandler(c.config));
adminRouter.patch("/configuration", asyncHandler(c.updateConfig));
adminRouter.get("/notifications", asyncHandler(c.notifications));
adminRouter.patch("/notifications/read-all", asyncHandler(c.readAllNotifications));
adminRouter.patch("/notifications/:id/read", asyncHandler(c.readNotification));
