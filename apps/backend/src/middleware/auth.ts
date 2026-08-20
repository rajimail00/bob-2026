import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { UserModel, type UserRole } from "../features/auth/auth.model.js";
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { userId: string; role: UserRole };
    }
  }
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    next(AppError.unauthorized());
    return;
  }

  const token = header.slice("Bearer ".length);

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    next(AppError.unauthorized("Session expired. Please log in again."));
    return;
  }

  void UserModel.exists({
    _id: payload.sub,
    status: "active",
  })
    .then((accountExists) => {
      if (!accountExists) {
        next(
          AppError.unauthorized(
            "This account is no longer active. Please log in again."
          )
        );
        return;
      }

      req.auth = {
        userId: payload.sub,
        role: payload.role,
      };

      next();
    })
    .catch(next);
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw AppError.unauthorized();
    if (!roles.includes(req.auth.role)) throw AppError.forbidden();
    next();
  };
}
