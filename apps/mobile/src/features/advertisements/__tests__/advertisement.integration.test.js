import fs from "node:fs";
import path from "node:path";
import { advertisementsApi } from "../api/advertisements.api";
import { insertAdvertisements } from "../utils/insertAdvertisements";
import { apiClient } from "@/lib/apiClient";

jest.mock("@/lib/apiClient", () => ({ apiClient: { get: jest.fn() } }));

const jobs = (count) => Array.from({ length: count }, (_, index) => ({ _id: `job-${index + 1}` }));
const advertisements = (count) => Array.from({ length: count }, (_, index) => ({ _id: `ad-${index + 1}` }));

test("active advertisements use the real authenticated API placement", async () => {
  apiClient.get.mockResolvedValueOnce({ data: { advertisements: advertisements(1) } });
  await expect(advertisementsApi.active("home_list")).resolves.toHaveLength(1);
  expect(apiClient.get).toHaveBeenCalledWith("/advertisements/active", { params: { placement: "home_list" } });
});

test("advertisements are inserted predictably after every five jobs without changing job order", () => {
  const originalJobs = jobs(12);
  const result = insertAdvertisements(originalJobs, advertisements(3));
  expect(result.map((item) => item.key)).toEqual([
    "job:job-1", "job:job-2", "job:job-3", "job:job-4", "job:job-5", "advertisement:ad-1",
    "job:job-6", "job:job-7", "job:job-8", "job:job-9", "job:job-10", "advertisement:ad-2",
    "job:job-11", "job:job-12",
  ]);
  expect(originalJobs.map((job) => job._id)).toEqual(jobs(12).map((job) => job._id));
});

test("one advertisement appears once at the end of a short non-empty list", () => {
  expect(insertAdvertisements(jobs(4), advertisements(1)).map((item) => item.key)).toEqual([
    "job:job-1", "job:job-2", "job:job-3", "job:job-4", "advertisement:ad-1",
  ]);
  expect(insertAdvertisements([], advertisements(1))).toEqual([]);
  expect(insertAdvertisements(jobs(6), [])).toHaveLength(6);
});

test("Home confines advertisements to List and keeps advertisement failure separate from jobs", () => {
  const home = fs.readFileSync(path.join(__dirname, "../../home/screens/HomeScreen.tsx"), "utf8");
  expect(home).toContain('useAdvertisements(viewMode === "list")');
  expect(home.indexOf('viewMode === "map"')).toBeLessThan(home.indexOf("<AdvertisementCard"));
  expect(home).toContain("advertisementsQuery.data ?? []");
  expect(home).not.toContain("advertisementsQuery.isError ?");
  expect(home).toContain("onViewableItemsChanged={onViewableItemsChanged}");
});

test("advertisement links are restricted to HTTPS and video playback is controlled", () => {
  const card = fs.readFileSync(path.join(__dirname, "../components/AdvertisementCard.tsx"), "utf8");
  expect(card).toContain('new URL(url).protocol === "https:"');
  expect(card).toContain("Linking.canOpenURL(url)");
  expect(card).toContain("instance.muted = true");
  expect(card).toContain("if (!active && playing)");
});
