import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Platform, ScrollView } from "react-native";
import { useState } from "react";
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
import { CategoryTile } from "@/features/home/components/CategoryTile";
import { IconValue } from "@/features/home/components/IconValue";
import { MediaCarousel } from "@/features/home/components/MediaCarousel";
import { useCategories, useCreateJob } from "@/features/home/hooks/useJobs";
import type { UploadedMedia } from "@/features/media/api/media.api";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { SupportedLocale } from "@/lib/i18n";
import { useCurrentLocation } from "@/lib/useCurrentLocation";
import { LocationPickerMap } from "../components/LocationPickerMap";
import { MediaPicker } from "../components/MediaPicker";
import { StepDots } from "../components/StepDots";
import { postJobSchema, type PostJobFormValues } from "../validation/postJob.schema";

const STEP_COUNT = 5;
const MAX_PEOPLE = 15;
const RECURRENCE_OPTIONS = ["none", "daily", "weekly", "monthly"] as const;
const PAYMENT_OPTIONS = ["cash", "paypal", "both"] as const;

export function PostJobScreen() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language?.slice(0, 2) as SupportedLocale) || "en";
  const categoriesQuery = useCategories();
  const createJob = useCreateJob();
  const { location, requestLocation, setLocation } = useCurrentLocation();

  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  const STEP_FIELDS: (keyof PostJobFormValues)[][] = [
    ["categoryId"],
    ["title", "description"],
    ["address", "peopleNeeded", "budget"],
    ["recurrence", "paymentPreference"],
    [],
  ];

  const goNext = async () => {
    const isValid = await trigger(STEP_FIELDS[step]);
    if (isValid) setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (event.type === "set" && selected) {
      setValue("date", selected);
    }
  };

  const onSubmit = handleSubmit(async (formValues) => {
    setSubmitError(null);
    if (location.status !== "granted") {
      setSubmitError("We need your location to post a job. Enable location access and try again.");
      return;
    }
    try {
      await createJob.mutateAsync({
        categoryId: formValues.categoryId,
        title: formValues.title,
        description: formValues.description,
        media,
        location: location.coords,
        address: formValues.address,
        date: formValues.date.toISOString(),
        peopleNeeded: formValues.peopleNeeded,
        budget: formValues.budget,
        recurrence: formValues.recurrence,
        isEmergency: formValues.isEmergency,
        paymentPreference: formValues.paymentPreference,
      });
      setPublished(true);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, t("common.genericError")));
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

  if (categoriesQuery.isLoading) return <LoadingState label={t("common.loading")} />;

  const isTomorrow =
    new Date(values.date).toDateString() === new Date(Date.now() + 86400000).toDateString();
  const isCustomDate = !isTomorrow && new Date(values.date).toDateString() !== new Date().toDateString();

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      <YStack flex={1} backgroundColor="$background">
        <YStack paddingHorizontal="$4" paddingTop="$4">
          <StepDots total={STEP_COUNT} current={step} />
        </YStack>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
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
                <Controller
                  control={control}
                  name="title"
                  render={({ field }) => (
                    <Input
                      label="Title"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      error={errors.title?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <Input
                      label="Description"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      multiline
                      numberOfLines={4}
                      style={{ height: 110, textAlignVertical: "top" }}
                      error={errors.description?.message}
                    />
                  )}
                />
              </YStack>
            ) : null}

            {step === 2 ? (
              <YStack gap="$4">
                <Text variant="h3">When and where?</Text>
                <YStack gap="$2">
                  <Text variant="label">Date</Text>
                  <XStack gap="$2" alignItems="center">
                    <YStack flex={1}>
                      <PillTabs
                        options={[
                          { value: "today", label: "Today" },
                          { value: "tomorrow", label: "Tomorrow" },
                        ]}
                        value={isTomorrow ? "tomorrow" : "today"}
                        onChange={(v) => {
                          const d = v === "tomorrow" ? new Date(Date.now() + 86400000) : new Date();
                          setValue("date", d);
                        }}
                      />
                    </YStack>
                    <Button variant={isCustomDate ? "primary" : "outline"} size="sm" onPress={() => setShowDatePicker(true)}>
                      {isCustomDate ? values.date.toLocaleDateString(locale) : "Pick date"}
                    </Button>
                  </XStack>
                  {showDatePicker ? (
                    <DateTimePicker
                      value={values.date}
                      mode="date"
                      minimumDate={new Date()}
                      onChange={onDateChange}
                    />
                  ) : null}
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

                <Controller
                  control={control}
                  name="budget"
                  render={({ field }) => (
                    <Input
                      label="Budget (€)"
                      keyboardType="number-pad"
                      value={field.value ? String(field.value) : ""}
                      onChangeText={(v) => field.onChange(Number(v.replace(/[^0-9]/g, "")) || 0)}
                      error={errors.budget?.message}
                    />
                  )}
                />
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
              <Button onPress={onSubmit} loading={createJob.isPending} fullWidth>
                Publish
              </Button>
            )}
          </XStack>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
