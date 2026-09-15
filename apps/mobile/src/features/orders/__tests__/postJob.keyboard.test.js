import fs from "node:fs";
import path from "node:path";

test("Post Job keeps focused inputs above the Android keyboard", () => {
  const source = fs.readFileSync(path.join(__dirname, "../screens/PostJobScreen.tsx"), "utf8");

  expect(source).toContain("<KeyboardScrollContext.Provider value={scrollFocusedInput}>");
  expect(source).toContain("scrollResponderScrollNativeHandleToKeyboard(inputHandle, 32, true)");
  expect(source).toContain('behavior={Platform.OS === "ios" ? "padding" : "height"}');
  expect(source).toContain('name="budget"');
  expect(source).toContain("onBlur={field.onBlur}");
});
