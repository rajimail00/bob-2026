import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

interface ValidationTargets {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/** Parses and replaces req.body/query/params with the validated, typed result. Throws (via Zod) on failure — caught by errorHandler. */
export function validate({ body, query, params }: ValidationTargets) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (body) req.body = body.parse(req.body);
    if (query) req.query = query.parse(req.query);
    if (params) req.params = params.parse(req.params);
    next();
  };
}
