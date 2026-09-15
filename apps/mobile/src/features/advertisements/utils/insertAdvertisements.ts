import type { Job } from "@/features/home/types/job.types";
import type { Advertisement } from "../types/advertisement.types";

export type HomeListItem =
  | { kind: "job"; key: string; job: Job }
  | { kind: "advertisement"; key: string; advertisement: Advertisement };

/** Inserts each available advertisement at most once after every two job cards. */
export function insertAdvertisements(jobs: Job[], advertisements: Advertisement[]): HomeListItem[] {
  const items: HomeListItem[] = [];
  let advertisementIndex = 0;
  jobs.forEach((job, index) => {
    items.push({ kind: "job", key: `job:${job._id}`, job });
    const isTwoJobBoundary = (index + 1) % 2 === 0;
    if (isTwoJobBoundary && advertisementIndex < advertisements.length) {
      const advertisement = advertisements[advertisementIndex++]!;
      items.push({ kind: "advertisement", key: `advertisement:${advertisement._id}`, advertisement });
    }
  });
  return items;
}
