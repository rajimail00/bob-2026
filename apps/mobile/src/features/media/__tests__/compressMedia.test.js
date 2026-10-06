import { manipulateAsync } from "expo-image-manipulator";
import { Video, getImageMetaData, getVideoMetaData } from "react-native-compressor";
import { compressMedia } from "../utils/compressMedia";

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
});

test("resizes and converts a camera photo to a compressed JPEG", async () => {
  manipulateAsync.mockResolvedValue({ uri: "file:///cache/compressed.jpg" });
  getImageMetaData.mockResolvedValue({ size: 450_000 });

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

test("compresses video and returns stable MP4 upload metadata", async () => {
  Video.compress.mockResolvedValue("file:///cache/compressed.mp4");
  getVideoMetaData.mockResolvedValue({ size: 2_500_000 });

  const result = await compressMedia(
    { uri: "content://camera/video", width: 1920, height: 1080 },
    "video"
  );

  expect(Video.compress).toHaveBeenCalledWith("content://camera/video", {
    compressionMethod: "auto",
    maxSize: 1280,
    minimumFileSizeForCompress: 0,
  });
  expect(result).toMatchObject({
    uri: "file:///cache/compressed.mp4",
    fileSize: 2_500_000,
    mimeType: "video/mp4",
  });
  expect(result.name).toMatch(/^bob-video-\d+\.mp4$/);
});
