import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { XStack, YStack } from "tamagui";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { PillTabs } from "@/components/ui/PillTabs";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { LoadingState } from "@/components/ui/states/LoadingState";
import { ErrorState } from "@/components/ui/states/ErrorState";
import { CategoryTile } from "@/features/home/components/CategoryTile";
import { IconValue } from "@/features/home/components/IconValue";
import { MediaCarousel } from "@/features/home/components/MediaCarousel";
import {
  useCategories,
  useCreateJob,
  useJob,
  useRepostJob,
  useUpdateJob,
} from "@/features/home/hooks/useJobs";
import type { UploadedMedia } from "@/features/media/api/media.api";
import { color } from "@/design/tokens";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { SupportedLocale } from "@/lib/i18n";
import { useCurrentLocation } from "@/lib/useCurrentLocation";
import type { OrdersStackParamList } from "@/navigation/types";
import { LocationPickerMap } from "../components/LocationPickerMap";
import { MediaPicker } from "../components/MediaPicker";
import { StepDots } from "../components/StepDots";
import { postJobSchema, type PostJobFormValues } from "../validation/postJob.schema";
import {
  buildJobMutationInput,
  canSubmitRepost,
  getEditJobFormState,
  getRepostJobDetailParams,
  getRepostJobFormState,
} from "../utils/jobForm";

const STEP_COUNT = 5;
const MAX_PEOPLE = 15;
const RECURRENCE_OPTIONS = ["none", "daily", "weekly", "monthly"] as const;
const PAYMENT_OPTIONS = ["cash", "paypal", "both"] as const;
const DATE_PICKER_BRAND_COLOR = color.brand500;
const DATE_PICKER_DAY_SIZE = 36;
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));
const MERIDIEM_OPTIONS = ["AM", "PM"] as const;
const TIME_PICKER_CLOCK_SIZE = 260;
const TIME_PICKER_CLOCK_CENTER = TIME_PICKER_CLOCK_SIZE / 2;
const TIME_PICKER_CLOCK_RADIUS = 108;
const TIME_PICKER_CLOCK_NUMBER_SIZE = 50;
const TIME_PICKER_HAND_LENGTH = 88;

interface PostJobScreenProps {
  route?: { name?: string; params?: { jobId?: string } };
}

export function PostJobScreen({ route }: PostJobScreenProps = {}) {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language?.slice(0, 2) as SupportedLocale) || "en";
  const navigation = useNavigation<NativeStackNavigationProp<OrdersStackParamList>>();
  const jobId = route?.params?.jobId;
  const isRepostMode = route?.name === "RepostJob";
  const isEditMode = Boolean(jobId) && !isRepostMode;
  const isExistingJobMode = Boolean(jobId);
  const categoriesQuery = useCategories();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob(jobId ?? "");
  const repostJob = useRepostJob(jobId ?? "");
  const jobQuery = useJob(jobId);
  // Edit/repost modes start from persisted coordinates and never substitute the phone's
  // current location. The Provider can still move the map intentionally.
  const currentLocation = useCurrentLocation(!isExistingJobMode);
  const [editLocation, setEditLocation] = useState<
    | { status: "loading" }
    | { status: "granted"; coords: { lng: number; lat: number } }
    | { status: "denied" }
  >({ status: "loading" });
  const location = isExistingJobMode ? editLocation : currentLocation.location;
  const setLocation = isExistingJobMode ? setEditLocation : currentLocation.setLocation;
  const requestLocation = currentLocation.requestLocation;
  const initializedEditJobId = useRef<string | null>(null);
  const submitInFlight = useRef(false);
  const formScrollRef = useRef<ScrollView>(null);
  const formFieldOffsets = useRef({ title: 0, description: 0, budget: 0 });
  const focusScrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [draftDate, setDraftDate] = useState(new Date());
  const [datePickerMonth, setDatePickerMonth] = useState(startOfMonth(new Date()));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [draftTime, setDraftTime] = useState(new Date());
  const [hasSelectedRepostDate, setHasSelectedRepostDate] = useState(false);

  const {
    control,
    handleSubmit,
    trigger,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PostJobFormValues>({
    resolver: zodResolver(postJobSchema),
    defaultValues: {
      categoryId: "",
      title: "",
      description: "",
      address: "",
      date: new Date(),
      peopleNeeded: 1,
      budget: 0,
      recurrence: "none",
      isEmergency: false,
      paymentPreference: "cash",
    },
  });

  const values = watch();
  const selectedCategory = categoriesQuery.data?.find((category) => category._id === values.categoryId);

  const scrollFormFieldIntoView = (field: "title" | "description" | "budget") => {
    if (focusScrollTimeout.current) clearTimeout(focusScrollTimeout.current);
    focusScrollTimeout.current = setTimeout(
      () => {
        formScrollRef.current?.scrollTo({
          y: Math.max(0, formFieldOffsets.current[field] - 16),
          animated: true,
        });
      },
      Platform.OS === "ios" ? 250 : 180
    );
  };

  useEffect(
    () => () => {
      if (focusScrollTimeout.current) clearTimeout(focusScrollTimeout.current);
    },
    []
  );

  useEffect(() => {
    if (!isExistingJobMode || !jobId || !jobQuery.data || initializedEditJobId.current === jobId) {
      return;
    }

    const initial = isRepostMode
      ? getRepostJobFormState(jobQuery.data)
      : getEditJobFormState(jobQuery.data);
    reset(initial.values);
    setMedia(initial.media);
    setEditLocation({ status: "granted", coords: initial.location });
    setDraftDate(initial.values.date);
    setDraftTime(initial.values.date);
    setDatePickerMonth(startOfMonth(initial.values.date));
    setHasSelectedRepostDate(!isRepostMode);
    initializedEditJobId.current = jobId;
  }, [isExistingJobMode, isRepostMode, jobId, jobQuery.data, reset]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      setStep(0);
      setSubmitError(null);
      setPublished(false);
      setMedia([]);
      setEditLocation({ status: "loading" });
      setHasSelectedRepostDate(false);
      submitInFlight.current = false;
      initializedEditJobId.current = null;
      reset();
    });
    return unsubscribe;
  }, [navigation, reset]);

  const STEP_FIELDS: (keyof PostJobFormValues)[][] = [
    ["categoryId"],
    ["title", "description"],
    ["address", "peopleNeeded", "budget"],
    ["recurrence", "paymentPreference"],
    [],
  ];

  const goNext = async () => {
    if (isRepostMode && step === 2 && !hasSelectedRepostDate) {
      setSubmitError(t("jobReposting.chooseNewDate"));
      return;
    }
    const isValid = await trigger(STEP_FIELDS[step]);
    if (isValid) {
      setSubmitError(null);
      setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
    }
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const openDatePicker = () => {
    const date = values.date;
    setDraftDate(date);
    setDatePickerMonth(startOfMonth(date));
    setShowDatePicker(true);
  };

  const openTimePicker = () => {
    setDraftTime(values.date);
    setShowTimePicker(true);
  };

  const onSubmit = handleSubmit(async (formValues) => {
    setSubmitError(null);
    if (
      isRepostMode &&
      !canSubmitRepost(hasSelectedRepostDate, repostJob.isPending)
    ) {
      if (repostJob.isPending) return;
      setSubmitError(t("jobReposting.chooseNewDate"));
      return;
    }
    if (location.status !== "granted") {
      setSubmitError(
        isRepostMode
          ? t("jobReposting.error")
          : isEditMode
          ? t("jobEditing.updateError")
          : "We need your location to post a job. Enable location access and try again."
      );
      return;
    }
    if (submitInFlight.current) return;
    submitInFlight.current = true;
    try {
      const input = buildJobMutationInput(formValues, media, location.coords);
      if (isRepostMode && jobId) {
        const newJob = await repostJob.mutateAsync(input);
        Alert.alert(t("jobReposting.success"));
        navigation.navigate("JobDetail", getRepostJobDetailParams(newJob));
      } else if (jobId) {
        await updateJob.mutateAsync(input);
        Alert.alert(t("jobEditing.successTitle"));
        // Return to an existing detail route when it is below this screen, or open the
        // edited detail when edit mode was entered from the Home tab.
        navigation.navigate("JobDetail", { jobId });
      } else {
        await createJob.mutateAsync(input);
        setPublished(true);
      }
    } catch (err) {
      setSubmitError(
        getApiErrorMessage(
          err,
          isRepostMode
            ? t("jobReposting.error")
            : isEditMode
              ? t("jobEditing.updateError")
              : t("common.genericError")
        )
      );
    } finally {
      submitInFlight.current = false;
    }
  });

  if (published) {
    return (
      <Screen>
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$4">
          <Text variant="h2" textAlign="center">
            Your job is online!
          </Text>
          <Button
            onPress={() => {
              setPublished(false);
              setStep(0);
              setMedia([]);
              reset();
            }}
          >
            Post another job
          </Button>
        </YStack>
      </Screen>
    );
  }

  if (categoriesQuery.isLoading || (isExistingJobMode && jobQuery.isLoading)) {
    return <LoadingState label={t("common.loading")} />;
  }
  if (isExistingJobMode && (jobQuery.isError || !jobQuery.data)) {
    return (
      <ErrorState
        title={isRepostMode ? t("jobReposting.error") : t("jobEditing.updateError")}
        retryLabel={t("common.retry")}
        onRetry={() => jobQuery.refetch()}
      />
    );
  }

  const isTomorrow =
    new Date(values.date).toDateString() === new Date(Date.now() + 86400000).toDateString();
  const isCustomDate = !isTomorrow && new Date(values.date).toDateString() !== new Date().toDateString();

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <YStack flex={1} backgroundColor="$background">
          <YStack paddingHorizontal="$4" paddingTop="$4">
            <StepDots total={STEP_COUNT} current={step} />
          </YStack>

          <ScrollView
            ref={formScrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: step === 1 || step === 2 ? 180 : 32,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
          <YStack gap="$5">
            {step === 0 ? (
              <YStack gap="$4">
                <Text variant="h3">What do you need help with?</Text>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <XStack flexWrap="wrap" gap="$2">
                      {(categoriesQuery.data ?? []).map((category) => (
                        <CategoryTile
                          key={category._id}
                          category={category}
                          label={category.name[locale] ?? category.name.en}
                          isSelected={field.value === category._id}
                          onPress={() => field.onChange(category._id)}
                        />
                      ))}
                    </XStack>
                  )}
                />
                {errors.categoryId ? (
                  <Text variant="small" color="$danger">
                    {errors.categoryId.message}
                  </Text>
                ) : null}
              </YStack>
            ) : null}

            {step === 1 ? (
              <YStack gap="$4">
                <Text variant="h3">Describe the job</Text>
                <YStack gap="$2">
                  <Text variant="label">Photos &amp; videos (optional)</Text>
                  <MediaPicker media={media} onChange={setMedia} />
                </YStack>
                <View
                  onLayout={(event) => {
                    formFieldOffsets.current.title = event.nativeEvent.layout.y;
                  }}
                >
                  <Controller
                    control={control}
                    name="title"
                    render={({ field }) => (
                      <Input
                        label="Title"
                        value={field.value}
                        onChangeText={field.onChange}
                        onFocus={() => scrollFormFieldIntoView("title")}
                        onBlur={field.onBlur}
                        error={errors.title?.message}
                      />
                    )}
                  />
                </View>
                <View
                  onLayout={(event) => {
                    formFieldOffsets.current.description = event.nativeEvent.layout.y;
                  }}
                >
                  <Controller
                    control={control}
                    name="description"
                    render={({ field }) => (
                      <Input
                        label="Description"
                        value={field.value}
                        onChangeText={field.onChange}
                        onFocus={() => scrollFormFieldIntoView("description")}
                        onBlur={field.onBlur}
                        multiline
                        numberOfLines={4}
                        style={{ height: 110, textAlignVertical: "top" }}
                        error={errors.description?.message}
                      />
                    )}
                  />
                </View>
              </YStack>
            ) : null}

            {step === 2 ? (
              <YStack gap="$4">
                <Text variant="h3">When and where?</Text>
                <YStack gap="$2">
                  <Text variant="label">Date</Text>
                  {isRepostMode && !hasSelectedRepostDate ? (
                    <Text variant="small" color="$danger">
                      {t("jobReposting.chooseNewDate")}
                    </Text>
                  ) : null}
                  <XStack gap="$2" alignItems="center">
                    <YStack flex={1}>
                      <PillTabs
                        options={[
                          { value: "today", label: "Today" },
                          { value: "tomorrow", label: "Tomorrow" },
                        ]}
                        value={isTomorrow ? "tomorrow" : "today"}
                        onChange={(v) => {
                          const d = new Date(
                            Date.now() + (v === "tomorrow" ? 86400000 : 3600000)
                          );
                          setValue("date", d);
                          if (isRepostMode) setHasSelectedRepostDate(true);
                        }}
                      />
                    </YStack>
                    <Button variant={isCustomDate ? "primary" : "outline"} size="sm" onPress={openDatePicker}>
                      {isCustomDate ? values.date.toLocaleDateString(locale) : "Pick date"}
                    </Button>
                  </XStack>
                  <BrandDatePicker
                    visible={showDatePicker}
                    locale={locale}
                    selectedDate={draftDate}
                    month={datePickerMonth}
                    minimumDate={new Date()}
                    onMonthChange={setDatePickerMonth}
                    onSelectDate={setDraftDate}
                    onCancel={() => setShowDatePicker(false)}
                    onConfirm={() => {
                      setValue("date", draftDate);
                      if (isRepostMode) setHasSelectedRepostDate(true);
                      setShowDatePicker(false);
                    }}
                  />
                </YStack>

                <YStack gap="$2">
                  <Text variant="label">Select time</Text>

                  <Button variant="outline" onPress={openTimePicker}>
                    {values.date.toLocaleTimeString(locale, {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </Button>

                  <BrandTimePicker
                    visible={showTimePicker}
                    locale={locale}
                    selectedTime={draftTime}
                    onSelectTime={setDraftTime}
                    onCancel={() => setShowTimePicker(false)}
                    onConfirm={() => {
                      setValue("date", mergeDateWithTime(values.date, draftTime));
                      setShowTimePicker(false);
                    }}
                  />
                </YStack>

                <YStack gap="$2">
                  <Text variant="label">Address</Text>
                  {location.status === "granted" ? (
                    <Controller
                      control={control}
                      name="address"
                      render={({ field }) => (
                        <LocationPickerMap
                          coords={location.status === "granted" ? location.coords : { lat: 0, lng: 0 }}
                          address={field.value}
                          onLocationChange={({ coords, address }) => {
                            setLocation({ status: "granted", coords });
                            field.onChange(address);
                          }}
                        />
                      )}
                    />
                  ) : (
                    <YStack gap="$2">
                      <Text variant="small" color="$danger">
                        {location.status === "denied"
                          ? "Location access is off — turn it on in settings to pick your address on the map."
                          : "Getting your location…"}
                      </Text>
                      {location.status === "denied" ? (
                        <Button variant="outline" onPress={() => void requestLocation()}>
                          I've enabled it — retry
                        </Button>
                      ) : null}
                    </YStack>
                  )}
                  {errors.address ? (
                    <Text variant="small" color="$danger">
                      {errors.address.message}
                    </Text>
                  ) : null}
                </YStack>

                <YStack gap="$2">
                  <Text variant="label">People needed</Text>
                  <Controller
                    control={control}
                    name="peopleNeeded"
                    render={({ field }) => (
                      <NumberStepper value={field.value} onChange={field.onChange} min={1} max={MAX_PEOPLE} />
                    )}
                  />
                </YStack>

                <View
                  onLayout={(event) => {
                    formFieldOffsets.current.budget = event.nativeEvent.layout.y;
                  }}
                >
                  <Controller
                    control={control}
                    name="budget"
                    render={({ field }) => (
                      <Input
                        label="Budget (€)"
                        keyboardType="number-pad"
                        value={field.value ? String(field.value) : ""}
                        onChangeText={(v) => field.onChange(Number(v.replace(/[^0-9]/g, "")) || 0)}
                        onFocus={() => scrollFormFieldIntoView("budget")}
                        error={errors.budget?.message}
                      />
                    )}
                  />
                </View>
              </YStack>
            ) : null}

            {step === 3 ? (
              <YStack gap="$5">
                <Text variant="h3">Options</Text>
                <YStack gap="$2">
                  <Text variant="label">How often?</Text>
                  <XStack flexWrap="wrap" gap="$2">
                    {RECURRENCE_OPTIONS.map((option) => {
                      const isSelected = values.recurrence === option;
                      return (
                        <XStack
                          key={option}
                          borderRadius="$pill"
                          borderWidth={1.5}
                          borderColor={isSelected ? "$primary" : "$borderColor"}
                          backgroundColor={isSelected ? "$primary" : "$backgroundStrong"}
                          paddingHorizontal="$4"
                          paddingVertical="$2"
                          onPress={() => setValue("recurrence", option)}
                        >
                          <Text variant="small" fontWeight="600" color={isSelected ? "$primaryText" : "$color"}>
                            {option}
                          </Text>
                        </XStack>
                      );
                    })}
                  </XStack>
                </YStack>

                <YStack gap="$2">
                  <Text variant="label">Payment method</Text>
                  <XStack flexWrap="wrap" gap="$2">
                    {PAYMENT_OPTIONS.map((option) => {
                      const isSelected = values.paymentPreference === option;
                      return (
                        <Controller
                          key={option}
                          control={control}
                          name="paymentPreference"
                          render={({ field }) => (
                            <XStack
                              borderRadius="$pill"
                              borderWidth={1.5}
                              borderColor={isSelected ? "$primary" : "$borderColor"}
                              backgroundColor={isSelected ? "$primary" : "$backgroundStrong"}
                              paddingHorizontal="$4"
                              paddingVertical="$2"
                              onPress={() => field.onChange(option)}
                            >
                              <Text variant="small" fontWeight="600" color={isSelected ? "$primaryText" : "$color"}>
                                {option}
                              </Text>
                            </XStack>
                          )}
                        />
                      );
                    })}
                  </XStack>
                </YStack>

                <Controller
                  control={control}
                  name="isEmergency"
                  render={({ field }) => (
                    <XStack
                      justifyContent="space-between"
                      alignItems="center"
                      onPress={() => field.onChange(!field.value)}
                    >
                      <Text variant="body">This is an emergency</Text>
                      <XStack
                        width={48}
                        height={28}
                        borderRadius={14}
                        backgroundColor={field.value ? "$primary" : "$neutral200"}
                        padding={2}
                        justifyContent={field.value ? "flex-end" : "flex-start"}
                      >
                        <YStack width={24} height={24} borderRadius={12} backgroundColor="$backgroundStrong" />
                      </XStack>
                    </XStack>
                  )}
                />
              </YStack>
            ) : null}

            {step === 4 ? (
              <YStack gap="$4">
                <Text variant="h3">Review</Text>

                {media.length > 0 ? <MediaCarousel media={media} /> : null}

                <Text variant="label" color="$brand600">
                  {selectedCategory?.name[locale] ?? selectedCategory?.name.en ?? ""}
                </Text>

                <Text variant="h2">{values.title}</Text>
                <Text variant="body" muted>
                  {values.description}
                </Text>

                <Card gap="$3">
                  <XStack flexWrap="wrap" gap="$4">
                    <IconValue icon="pricetag-outline" value={`€${values.budget}`} />
                    <IconValue icon="calendar-outline" value={new Date(values.date).toLocaleDateString(locale)} />
                    <IconValue
                      icon="time-outline"
                      value={new Date(values.date).toLocaleTimeString(locale, {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    />
                    <IconValue icon="person-outline" value={`${values.peopleNeeded} people`} />
                  </XStack>
                  <XStack alignItems="flex-start" gap="$2">
                    <Ionicons name="location-outline" size={16} color="#4F8266" style={{ marginTop: 2 }} />
                    <Text variant="body" flex={1}>
                      {values.address}
                    </Text>
                  </XStack>
                  <IconValue icon="card-outline" value={`Payment: ${values.paymentPreference}`} muted />
                </Card>
              </YStack>
            ) : null}
            </YStack>
          </ScrollView>

          <YStack padding="$4" gap="$3" borderTopWidth={1} borderColor="$borderColor" backgroundColor="$background">
          {submitError ? (
            <YStack gap="$2">
              <Text variant="small" color="$danger">
                {submitError}
              </Text>
              {location.status === "denied" ? (
                <Button variant="outline" onPress={() => void requestLocation()}>
                  I've enabled it — retry
                </Button>
              ) : null}
            </YStack>
          ) : null}

          <XStack gap="$3">
            {step > 0 ? (
              <Button variant="outline" onPress={goBack}>
                {t("common.back")}
              </Button>
            ) : null}
            {step < STEP_COUNT - 1 ? (
              <Button onPress={goNext} fullWidth={step === 0}>
                {t("common.continue")}
              </Button>
            ) : (
              <Button
                onPress={onSubmit}
                loading={
                  isRepostMode
                    ? repostJob.isPending
                    : isEditMode
                      ? updateJob.isPending
                      : createJob.isPending
                }
                disabled={
                  isRepostMode &&
                  !canSubmitRepost(hasSelectedRepostDate, repostJob.isPending)
                }
                fullWidth
              >
                {isRepostMode
                  ? t("jobReposting.publish")
                  : isEditMode
                    ? t("jobEditing.saveChanges")
                    : "Publish"}
              </Button>
            )}
          </XStack>
          </YStack>
        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface BrandDatePickerProps {
  visible: boolean;
  locale: SupportedLocale;
  selectedDate: Date;
  month: Date;
  minimumDate: Date;
  onMonthChange: (month: Date) => void;
  onSelectDate: (date: Date) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

function BrandDatePicker({
  visible,
  locale,
  selectedDate,
  month,
  minimumDate,
  onMonthChange,
  onSelectDate,
  onCancel,
  onConfirm,
}: BrandDatePickerProps) {
  const minimumDay = startOfDay(minimumDate);
  const calendarWeeks = getCalendarWeeks(month);
  const canGoPreviousMonth = startOfMonth(month).getTime() > startOfMonth(minimumDay).getTime();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.datePickerBackdrop} onPress={onCancel}>
        <Pressable style={styles.datePickerCard} onPress={(event) => event.stopPropagation()}>
          <YStack backgroundColor="$backgroundStrong" borderRadius="$md" overflow="hidden">
            <YStack backgroundColor="$primary" padding="$4" gap="$1">
              <Text variant="body" color="$primaryText" opacity={0.78} fontWeight="600">
                {selectedDate.getFullYear()}
              </Text>
              <Text variant="h1" color="$primaryText">
                {selectedDate.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" })}
              </Text>
            </YStack>

            <YStack padding="$4" gap="$4">
              <XStack alignItems="center" justifyContent="space-between">
                <XStack
                  width={40}
                  height={40}
                  borderRadius={20}
                  alignItems="center"
                  justifyContent="center"
                  opacity={canGoPreviousMonth ? 1 : 0.3}
                  onPress={canGoPreviousMonth ? () => onMonthChange(addMonths(month, -1)) : undefined}
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                >
                  <Ionicons name="chevron-back" size={24} color={DATE_PICKER_BRAND_COLOR} />
                </XStack>
                <Text variant="body" fontWeight="700">
                  {month.toLocaleDateString(locale, { month: "long", year: "numeric" })}
                </Text>
                <XStack
                  width={40}
                  height={40}
                  borderRadius={20}
                  alignItems="center"
                  justifyContent="center"
                  onPress={() => onMonthChange(addMonths(month, 1))}
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                >
                  <Ionicons name="chevron-forward" size={24} color={DATE_PICKER_BRAND_COLOR} />
                </XStack>
              </XStack>

              <XStack justifyContent="space-between">
                {WEEKDAY_LABELS.map((day, index) => (
                  <YStack key={`${day}-${index}`} width={DATE_PICKER_DAY_SIZE} alignItems="center">
                    <Text variant="body" muted>
                      {day}
                    </Text>
                  </YStack>
                ))}
              </XStack>

              <YStack gap="$2">
                {calendarWeeks.map((week, weekIndex) => (
                  <XStack key={weekIndex} justifyContent="space-between">
                    {week.map((date, dayIndex) => {
                      if (!date) {
                        return (
                          <YStack
                            key={`empty-${dayIndex}`}
                            width={DATE_PICKER_DAY_SIZE}
                            height={DATE_PICKER_DAY_SIZE}
                          />
                        );
                      }

                      const isDisabled = startOfDay(date).getTime() < minimumDay.getTime();
                      const isSelected = isSameDay(date, selectedDate);

                      return (
                        <YStack
                          key={date.toISOString()}
                          width={DATE_PICKER_DAY_SIZE}
                          height={DATE_PICKER_DAY_SIZE}
                          borderRadius={DATE_PICKER_DAY_SIZE / 2}
                          alignItems="center"
                          justifyContent="center"
                          backgroundColor={isSelected ? "$primary" : "transparent"}
                          opacity={isDisabled ? 0.35 : 1}
                          onPress={isDisabled ? undefined : () => onSelectDate(date)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected, disabled: isDisabled }}
                          accessibilityLabel={date.toLocaleDateString(locale, {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        >
                          <Text variant="body" color={isSelected ? "$primaryText" : "$color"}>
                            {date.getDate()}
                          </Text>
                        </YStack>
                      );
                    })}
                  </XStack>
                ))}
              </YStack>

              <XStack justifyContent="flex-end" gap="$2" paddingTop="$2">
                <Button variant="ghost" size="sm" onPress={onCancel}>
                  CANCEL
                </Button>
                <Button variant="ghost" size="sm" onPress={onConfirm}>
                  OK
                </Button>
              </XStack>
            </YStack>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface BrandTimePickerProps {
  visible: boolean;
  locale: SupportedLocale;
  selectedTime: Date;
  onSelectTime: (time: Date) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

function BrandTimePicker({
  visible,
  locale,
  selectedTime,
  onSelectTime,
  onCancel,
  onConfirm,
}: BrandTimePickerProps) {
  const [clockMode, setClockMode] = useState<"hour" | "minute">("hour");
  const selectedHour = getDisplayHour(selectedTime);
  const selectedMinute = String(selectedTime.getMinutes()).padStart(2, "0");
  const selectedMeridiem = getMeridiem(selectedTime);
  const clockOptions = clockMode === "hour" ? HOUR_OPTIONS : MINUTE_OPTIONS;
  const selectedClockValue = clockMode === "hour" ? selectedHour : selectedMinute;
  const handAngle = getClockAngle(clockMode, selectedClockValue);

  useEffect(() => {
    if (visible) setClockMode("hour");
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.datePickerBackdrop} onPress={onCancel}>
        <Pressable style={styles.datePickerCard} onPress={(event) => event.stopPropagation()}>
          <YStack backgroundColor="$backgroundStrong" borderRadius="$md" overflow="hidden">
            <YStack backgroundColor="$primary" padding="$4" style={styles.timePickerHeader}>
              <XStack alignItems="center" justifyContent="space-between">
                <XStack alignItems="center">
                  <Pressable onPress={() => setClockMode("hour")}>
                    <Text color="$primaryText" style={styles.timePickerHeaderTime}>
                      {selectedHour}
                    </Text>
                  </Pressable>
                  <Text color="$primaryText" opacity={0.65} style={styles.timePickerHeaderTime}>
                    :
                  </Text>
                  <Pressable onPress={() => setClockMode("minute")}>
                    <Text
                      color="$primaryText"
                      opacity={clockMode === "minute" ? 1 : 0.65}
                      style={styles.timePickerHeaderTime}
                    >
                      {selectedMinute}
                    </Text>
                  </Pressable>
                </XStack>

                <YStack gap="$2" alignItems="center">
                  {MERIDIEM_OPTIONS.map((meridiem) => {
                    const isSelected = selectedMeridiem === meridiem;
                    return (
                      <Pressable
                        key={meridiem}
                        onPress={() => onSelectTime(setTimeMeridiem(selectedTime, meridiem))}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={meridiem}
                      >
                        <Text
                          variant="h3"
                          color="$primaryText"
                          opacity={isSelected ? 1 : 0.58}
                          fontWeight="700"
                        >
                          {meridiem}
                        </Text>
                      </Pressable>
                    );
                  })}
                </YStack>
              </XStack>
            </YStack>

            <YStack padding="$4" gap="$3" alignItems="center">
              <View style={styles.timePickerClockFace}>
                <View
                  style={[
                    styles.timePickerHand,
                    {
                      transform: [{ rotate: `${handAngle}deg` }],
                    },
                  ]}
                />
                <View style={styles.timePickerCenterDot} />

                {clockOptions.map((option) => {
                  const isSelected = selectedClockValue === option;
                  const position = getClockOptionPosition(clockMode, option);

                  return (
                    <Pressable
                      key={option}
                      style={[
                        styles.timePickerNumber,
                        position,
                        isSelected ? styles.timePickerNumberSelected : null,
                      ]}
                      onPress={() => {
                        if (clockMode === "hour") {
                          onSelectTime(setTimeHour(selectedTime, option));
                          setClockMode("minute");
                        } else {
                          onSelectTime(setTimeMinute(selectedTime, option));
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={clockMode === "hour" ? `Hour ${option}` : `Minute ${option}`}
                    >
                      <Text
                        variant="h4"
                        color={isSelected ? "$primaryText" : "$color"}
                        fontWeight={isSelected ? "700" : "500"}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <XStack justifyContent="flex-end" alignItems="center" width="100%" paddingTop="$2">
                <XStack gap="$2">
                  <Button variant="ghost" size="sm" onPress={onCancel}>
                    CANCEL
                  </Button>
                  <Button variant="ghost" size="sm" onPress={onConfirm}>
                    OK
                  </Button>
                </XStack>
              </XStack>
            </YStack>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function mergeDateWithTime(date: Date, time: Date) {
  const merged = new Date(date);
  merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return merged;
}

function getClockAngle(mode: "hour" | "minute", value: string) {
  const numericValue = Number(value);
  if (mode === "hour") return (numericValue % 12) * 30 - 90;
  return numericValue * 6 - 90;
}

function getClockOptionPosition(mode: "hour" | "minute", value: string) {
  const angle = (getClockAngle(mode, value) * Math.PI) / 180;
  const x = TIME_PICKER_CLOCK_CENTER + Math.cos(angle) * TIME_PICKER_CLOCK_RADIUS;
  const y = TIME_PICKER_CLOCK_CENTER + Math.sin(angle) * TIME_PICKER_CLOCK_RADIUS;

  return {
    left: x - TIME_PICKER_CLOCK_NUMBER_SIZE / 2,
    top: y - TIME_PICKER_CLOCK_NUMBER_SIZE / 2,
  };
}

function getDisplayHour(time: Date) {
  const hour = time.getHours() % 12;
  return String(hour === 0 ? 12 : hour);
}

function getMeridiem(time: Date): (typeof MERIDIEM_OPTIONS)[number] {
  return time.getHours() >= 12 ? "PM" : "AM";
}

function setTimeHour(time: Date, hourValue: string) {
  const updated = new Date(time);
  const hour = Number(hourValue) % 12;
  updated.setHours(getMeridiem(time) === "PM" ? hour + 12 : hour);
  return updated;
}

function setTimeMinute(time: Date, minuteValue: string) {
  const updated = new Date(time);
  updated.setMinutes(Number(minuteValue));
  return updated;
}

function setTimeMeridiem(time: Date, meridiem: (typeof MERIDIEM_OPTIONS)[number]) {
  const updated = new Date(time);
  const hour = updated.getHours();
  if (meridiem === "AM" && hour >= 12) updated.setHours(hour - 12);
  if (meridiem === "PM" && hour < 12) updated.setHours(hour + 12);
  return updated;
}

function getCalendarWeeks(month: Date): (Date | null)[][] {
  const firstDay = startOfMonth(month);
  const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: firstDay.getDay() }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(firstDay.getFullYear(), firstDay.getMonth(), day));
  }

  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const styles = StyleSheet.create({
  datePickerBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  datePickerCard: {
    borderRadius: 10,
    elevation: 12,
    maxWidth: 360,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    width: "100%",
  },
  timePickerHeader: {
    minHeight: 190,
    justifyContent: "center",
  },
  timePickerHeaderTime: {
    fontSize: 64,
    fontWeight: "400",
    lineHeight: 78,
  },
  timePickerClockFace: {
    backgroundColor: color.neutral100,
    borderRadius: TIME_PICKER_CLOCK_SIZE / 2,
    height: TIME_PICKER_CLOCK_SIZE,
    position: "relative",
    width: TIME_PICKER_CLOCK_SIZE,
  },
  timePickerHand: {
    backgroundColor: color.brand500,
    height: 2,
    left: TIME_PICKER_CLOCK_CENTER,
    position: "absolute",
    top: TIME_PICKER_CLOCK_CENTER - 1,
    transformOrigin: "left center",
    width: TIME_PICKER_HAND_LENGTH,
  },
  timePickerCenterDot: {
    backgroundColor: color.brand500,
    borderRadius: 5,
    height: 10,
    left: TIME_PICKER_CLOCK_CENTER - 5,
    position: "absolute",
    top: TIME_PICKER_CLOCK_CENTER - 5,
    width: 10,
  },
  timePickerNumber: {
    alignItems: "center",
    borderRadius: TIME_PICKER_CLOCK_NUMBER_SIZE / 2,
    height: TIME_PICKER_CLOCK_NUMBER_SIZE,
    justifyContent: "center",
    position: "absolute",
    width: TIME_PICKER_CLOCK_NUMBER_SIZE,
  },
  timePickerNumberSelected: {
    backgroundColor: color.brand500,
  },
});
