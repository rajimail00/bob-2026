import { Text } from "react-native";

interface ResponsiveTabLabelProps {
  label: string;
  color: string;
  maxWidth?: number;
}

/** Keeps translated tab labels readable without increasing the tab bar height. */
export function ResponsiveTabLabel({ label, color, maxWidth = 84 }: ResponsiveTabLabelProps) {
  return (
    <Text
      numberOfLines={2}
      adjustsFontSizeToFit
      minimumFontScale={0.65}
      style={{
        color,
        width: "100%",
        maxWidth,
        minHeight: 24,
        fontSize: 10,
        lineHeight: 12,
        fontWeight: "600",
        textAlign: "center",
        includeFontPadding: false,
      }}
    >
      {label}
    </Text>
  );
}
