import { manipulateAsync } from "expo-image-manipulator";
import { Video, getVideoMetaData } from "react-native-compressor";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { getInfoAsync } from "expo-file-system/legacy";
import { compressMedia } from "../utils/compressMedia";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { executionEnvironment: "standalone", appOwnership: null },
  ExecutionEnvironment: { StoreClient: "storeClient" },
}));

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: jest.fn(),
}));

jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  manipulateAsync: jest.fn(),
}));

jest.mock("react-native-compressor", () => ({
  Video: { compress: jest.fn() },
  getImageMetaData: jest.fn(),
  getVideoMetaData: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  Constants.executionEnvironment = "standalone";
  Constants.appOwnership = null;
});

test("resizes and converts a camera photo to a compressed JPEG", async () => {
  manipulateAsync.mockResolvedValue({ uri: "file:///cache/compressed.jpg" });
  getInfoAsync.mockResolvedValue({ exists: true, size: 450_000 });

  const result = await compressMedia(
    { uri: "content://camera/photo", width: 4032, height: 3024 },
    "photo"
  );

  expect(manipulateAsync).toHaveBeenCalledWith(
    "content://camera/photo",
    [{ resize: { width: 1600 } }],
    { compress: 0.72, format: "jpeg" }
  );
  expect(result).toMatchObject({
    uri: "file:///cache/compressed.jpg",
    fileSize: 450_000,
    mimeType: "image/jpeg",
  });
  expect(result.name).toMatch(/^bob-photo-\d+\.jpg$/);
});

test("passes through an Expo Go video without loading native compression", async () => {
  Constants.executionEnvironment = ExecutionEnvironment.StoreClient;
  getInfoAsync.mockResolvedValue({ exists: true, size: 2_000_000 });

  const result = await compressMedia(
    {
      uri: "file:///cache/selected.mp4",
      width: 1280,
      height: 720,
      mimeType: "video/mp4",
      fileSize: 2_000_000,
    },
    "video"
  );

  expect(Video.compress).not.toHaveBeenCalled();
  expect(result).toMatchObject({
    uri: "file:///cache/selected.mp4",
    fileSize: 2_000_000,
    mimeType: "video/mp4",
  });
});

test("compresses video and returns stable MP4 upload metadata", async () => {
  Video.compress.mockResolvedValue("file:///cache/compressed.mp4");
  getVideoMetaData.mockResolvedValue({ size: 2_500_000 });

  const result = await compressMedia(
    { uri: "content://camera/video", width: 1920, height: 1080 },
    "video"
  );

  expect(Video.compress).toHaveBeenCalledWith("content://camera/video", {
    compressionMethod: "auto",
    maxSize: 720,
    minimumFileSizeForCompress: 0,
  });
  expect(result).toMatchObject({
    uri: "file:///cache/compressed.mp4",
    fileSize: 2_500_000,
    mimeType: "video/mp4",
  });
  expect(result.name).toMatch(/^bob-video-\d+\.mp4$/);
});
