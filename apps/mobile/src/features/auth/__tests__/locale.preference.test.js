import fs from "node:fs";
import path from "node:path";
import { authApi } from "../api/auth.api";
import { apiClient } from "@/lib/apiClient";

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

test("updating the preferred locale uses the protected locale endpoint", async () => {
  const user = { id: "user-1", locale: "fr" };
  apiClient.patch.mockResolvedValueOnce({ data: { user } });

  await expect(authApi.updateLocale("fr")).resolves.toBe(user);
  expect(apiClient.patch).toHaveBeenCalledWith("/auth/locale", { locale: "fr" });
});

test("login, email verification, and session restoration apply the server locale", () => {
  const hooksDirectory = path.join(__dirname, "..", "hooks");
  const mutations = fs.readFileSync(path.join(hooksDirectory, "useAuthMutations.ts"), "utf8");
  const useMe = fs.readFileSync(path.join(hooksDirectory, "useMe.ts"), "utf8");

  expect(mutations.match(/setAppLocale\(data\.user\.locale\)/g)).toHaveLength(2);
  expect(mutations).toContain("authApi.updateLocale(locale)");
  expect(mutations).toContain("setAppLocale(user.locale)");
  expect(useMe).toContain("setAppLocale(user.locale)");
});

test("Register and Profile share the complete central language list", () => {
  const sourceRoot = path.join(__dirname, "..", "..");
  const register = fs.readFileSync(path.join(sourceRoot, "auth", "screens", "RegisterScreen.tsx"), "utf8");
  const profile = fs.readFileSync(path.join(sourceRoot, "profile", "screens", "ProfileScreen.tsx"), "utf8");

  expect(register).toContain("LANGUAGE_OPTIONS.map");
  expect(profile).toContain("LANGUAGE_OPTIONS.map");
  expect(profile).toContain("updateLocale.mutateAsync(locale)");
});
