import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { UserModel, type UserRole } from "../features/auth/auth.model.js";
import { recordUserActivity } from "../features/admin/activity.service.js";
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { userId: string; role: UserRole };
    }
  }
}

function authenticateRequest(
  req: Request,
  next: NextFunction,
  required: boolean
) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    if (required) next(AppError.unauthorized(undefined, "AUTH_REQUIRED"));
    else next();
    return;
  }

  const token = header.slice("Bearer ".length);

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    next(AppError.unauthorized("Session expired. Please log in again.", "SESSION_EXPIRED"));
    return;
  }

  void UserModel.findOne({
    _id: payload.sub,
    status: "active",
  })
    .select("role")
    .lean()
    .then((account) => {
      if (!account) {
        next(
          AppError.unauthorized(
            "This account is no longer active. Please log in again.",
            "SESSION_EXPIRED"
          )
        );
        return;
      }

      req.auth = {
        userId: payload.sub,
        // Authorization uses the current database role. A demoted administrator
        // therefore loses access immediately, even if an older JWT says "admin".
        role: account.role,
      };

      // Activity is best-effort. Waiting for this bounded aggregate write avoids
      // leaving database work running after a request/test has completed.
      void recordUserActivity(payload.sub).then(() => next()).catch(() => next());
    })
    .catch(next);
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  authenticateRequest(req, next, true);
}

/** Adds req.auth when a valid token is supplied while preserving public access. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  authenticateRequest(req, next, false);
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw AppError.unauthorized(undefined, "AUTH_REQUIRED");
    if (!roles.includes(req.auth.role)) throw AppError.forbidden();
    next();
  };
}
