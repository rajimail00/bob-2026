import type { CreateJobInput } from "@/features/home/api/jobs.api";
import type { JobDetail } from "@/features/home/types/job.types";
import type { UploadedMedia } from "@/features/media/api/media.api";
import type { PostJobFormValues } from "../validation/postJob.schema";

export interface JobFormLocation {
  lng: number;
  lat: number;
}

export function getEditJobFormState(job: JobDetail) {
  return {
    values: {
      categoryId: job.categoryId._id,
      title: job.title,
      description: job.description,
      address: job.address,
      date: new Date(job.date),
      peopleNeeded: job.peopleNeeded,
      budget: job.budget,
      recurrence: job.recurrence,
      isEmergency: job.isEmergency,
      paymentPreference: job.paymentPreference,
    } satisfies PostJobFormValues,
    media: job.media.map((item) => ({ ...item })) satisfies UploadedMedia[],
    location: {
      lng: job.location.coordinates[0],
      lat: job.location.coordinates[1],
    } satisfies JobFormLocation,
  };
}

export function getRepostJobFormState(job: JobDetail, now = new Date()) {
  const copied = getEditJobFormState(job);
  const suggestedDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  suggestedDate.setSeconds(0, 0);

  return {
    ...copied,
    values: {
      ...copied.values,
      // This is only a safe picker starting point. RepostJobScreen still requires the
      // Provider to explicitly confirm a new date before it will submit.
      date: suggestedDate,
    } satisfies PostJobFormValues,
  };
}

export function canSubmitRepost(hasSelectedNewDate: boolean, isPending: boolean) {
  return hasSelectedNewDate && !isPending;
}

export function getRepostJobDetailParams(job: Pick<JobDetail, "_id">) {
  return { jobId: job._id };
}

export function buildJobMutationInput(
  values: PostJobFormValues,
  media: UploadedMedia[],
  location: JobFormLocation
): CreateJobInput {
  return {
    categoryId: values.categoryId,
    title: values.title,
    description: values.description,
    media,
    location,
    address: values.address,
    date: values.date.toISOString(),
    peopleNeeded: values.peopleNeeded,
    budget: values.budget,
    recurrence: values.recurrence,
    isEmergency: values.isEmergency,
    paymentPreference: values.paymentPreference,
  };
}
