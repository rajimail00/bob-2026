export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export const USER_FACING_ERROR_IDS = [
  "AUTH_REQUIRED",
  "SESSION_EXPIRED",
  "EMAIL_EXISTS",
  "INVALID_CREDENTIALS",
  "EMAIL_NOT_VERIFIED",
  "VERIFICATION_INVALID",
  "VERIFICATION_EXPIRED",
  "JOB_NOT_FOUND",
  "JOB_NOT_ACTIVE",
  "JOB_EDIT_LOCKED",
  "JOB_REPOST_LOCKED",
  "APPLICATION_DUPLICATE",
  "APPLICATION_FORBIDDEN",
  "MESSAGE_FORBIDDEN",
  "REVIEW_DUPLICATE",
  "MEDIA_TOO_LARGE",
  "MEDIA_UNSUPPORTED",
  "ACCOUNT_DELETE_FORBIDDEN",
] as const;

export type UserFacingErrorId = (typeof USER_FACING_ERROR_IDS)[number];

export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly errorId?: UserFacingErrorId;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown, errorId?: UserFacingErrorId) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.errorId = errorId;
  }

  static badRequest(message: string, details?: unknown, errorId?: UserFacingErrorId) {
    return new AppError(400, "VALIDATION_ERROR", message, details, errorId);
  }
  static unauthorized(message = "Authentication required", errorId?: UserFacingErrorId) {
    return new AppError(401, "UNAUTHORIZED", message, undefined, errorId);
  }
  static forbidden(message = "You do not have access to this resource", errorId?: UserFacingErrorId) {
    return new AppError(403, "FORBIDDEN", message, undefined, errorId);
  }
  static notFound(message = "Resource not found", errorId?: UserFacingErrorId) {
    return new AppError(404, "NOT_FOUND", message, undefined, errorId);
  }
  static conflict(message: string, errorId?: UserFacingErrorId) {
    return new AppError(409, "CONFLICT", message, undefined, errorId);
  }
}
