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
