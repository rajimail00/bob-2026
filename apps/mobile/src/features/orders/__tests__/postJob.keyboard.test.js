import fs from "node:fs";
import path from "node:path";

test("Post Job keeps focused inputs above the Android keyboard", () => {
  const source = fs.readFileSync(path.join(__dirname, "../screens/PostJobScreen.tsx"), "utf8");

  expect(source).toContain("<KeyboardScrollContext.Provider value={scrollFocusedInput}>");
  expect(source).toContain("scrollResponderScrollNativeHandleToKeyboard(inputHandle, 32, true)");
  expect(source).toContain('behavior={Platform.OS === "ios" ? "padding" : "height"}');
  expect(source).toContain('Keyboard.addListener("keyboardDidShow"');
  expect(source).toContain("{!isKeyboardVisible ? (");
  expect(source).toContain('name="budget"');
  expect(source).toContain('onFocus={() => scrollFieldIntoView("budget")}');
  expect(source).toContain("formFieldOffsets.current.budget");
  expect(source).toContain("onBlur={field.onBlur}");
});

test("When and where blocks Continue until date and time are explicitly selected", () => {
  const source = fs.readFileSync(path.join(__dirname, "../screens/PostJobScreen.tsx"), "utf8");

  expect(source).toContain("validateJobSchedule(values.date, hasSelectedDate, hasSelectedTime)");
  expect(source).toContain("setHasSelectedDate(true)");
  expect(source).toContain("setHasSelectedTime(true)");
  expect(source).toContain("setScheduleError(scheduleValidationError)");
  expect(source).toContain('scrollFieldIntoView("schedule")');
});

test("Post Job preserves media scroll position and keeps step errors local", () => {
  const source = fs.readFileSync(path.join(__dirname, "../screens/PostJobScreen.tsx"), "utf8");

  expect(source).toContain("pendingMediaScrollRestore.current = formScrollOffset.current");
  expect(source).toContain("onContentSizeChange={() => {");
  expect(source).toContain("formScrollRef.current?.scrollTo({ y, animated: false })");
  expect(source).toContain("onChange={handleMediaChange}");
  expect(source).toContain("setLocationValidationError(locationMissing)");
  expect(source).toContain('t("postJob.validation.location")');
  expect(source).toContain("if (nextBudget > 0) clearErrors(\"budget\")");
  expect(source).toContain("clearErrors();");
  expect(source).toContain("setScheduleError(null)");
});
