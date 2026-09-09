import type { Job } from "@/features/home/types/job.types";
import type { Advertisement } from "../types/advertisement.types";

export type HomeListItem =
  | { kind: "job"; key: string; job: Job }
  | { kind: "advertisement"; key: string; advertisement: Advertisement };

/** Inserts each available advertisement at most once. With 1-4 jobs, one ad is appended;
 * otherwise ads occupy the slots after jobs 5, 10, 15, and so on. */
export function insertAdvertisements(jobs: Job[], advertisements: Advertisement[]): HomeListItem[] {
  const items: HomeListItem[] = [];
  let advertisementIndex = 0;
  jobs.forEach((job, index) => {
    items.push({ kind: "job", key: `job:${job._id}`, job });
    const isFiveJobBoundary = (index + 1) % 5 === 0;
    if (isFiveJobBoundary && advertisementIndex < advertisements.length) {
      const advertisement = advertisements[advertisementIndex++]!;
      items.push({ kind: "advertisement", key: `advertisement:${advertisement._id}`, advertisement });
    }
  });
  if (jobs.length > 0 && jobs.length < 5 && advertisements[0]) {
    items.push({ kind: "advertisement", key: `advertisement:${advertisements[0]._id}`, advertisement: advertisements[0] });
  }
  return items;
}
