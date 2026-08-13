import { ProblemReportModel } from "./problem.model.js";

export const problemRepository = {
  create(data: { jobId: string; reporterId: string; reason: string; note?: string }) {
    return ProblemReportModel.create(data);
  },
};
