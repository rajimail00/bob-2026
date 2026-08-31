import { ActivityIndicator } from "react-native";
import { GetProps, styled, Text as TamaguiText, XStack } from "tamagui";

const ButtonFrame = styled(XStack, {
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "$pill",
  paddingHorizontal: "$5",
  height: 52,
  pressStyle: { opacity: 0.85 },

  variants: {
    variant: {
      primary: { backgroundColor: "$primary" },
      outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: "$primary" },
      ghost: { backgroundColor: "transparent" },
      destructive: { backgroundColor: "$danger" },
      // White-fill / white-outline CTAs for use on top of the brand-green background (e.g. Welcome screen).
      inverse: { backgroundColor: "$backgroundStrong" },
      outlineInverse: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: "$backgroundStrong" },
    },
    size: {
      md: { height: 52, paddingHorizontal: "$5" },
      sm: { height: 40, paddingHorizontal: "$4" },
    },
    disabled: {
      true: { opacity: 0.5 },
    },
    fullWidth: {
      true: { alignSelf: "stretch" },
    },
  } as const,

  defaultVariants: { variant: "primary", size: "md" },
});

const ButtonText = styled(TamaguiText, {
  fontFamily: "$heading",
  fontWeight: "600",
  fontSize: "$3",

  variants: {
    variant: {
      primary: { color: "$primaryText" },
      outline: { color: "$primary" },
      ghost: { color: "$primary" },
      destructive: { color: "white" },
      inverse: { color: "$primary" },
      outlineInverse: { color: "$backgroundStrong" },
    },
  } as const,

  defaultVariants: { variant: "primary" },
});

const SPINNER_COLOR_BY_VARIANT: Record<string, string> = {
  primary: "white",
  destructive: "white",
  outline: "#4F8266",
  ghost: "#4F8266",
  inverse: "#4F8266",
  outlineInverse: "white",
};

type ButtonFrameProps = GetProps<typeof ButtonFrame>;

export interface ButtonProps extends Omit<ButtonFrameProps, "children"> {
  children: string;
  loading?: boolean;
  onPress?: () => void;
}

/** The single button component for the app — do not introduce PrimaryButton/SubmitButton variants, extend this instead. */
export function Button({ children, loading = false, disabled, variant = "primary", onPress, ...rest }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <ButtonFrame
      variant={variant}
      disabled={isDisabled}
      onPress={isDisabled ? undefined : onPress}
      role="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={SPINNER_COLOR_BY_VARIANT[variant ?? "primary"]} />
      ) : (
        <ButtonText variant={variant}>{children}</ButtonText>
      )}
    </ButtonFrame>
  );
}
