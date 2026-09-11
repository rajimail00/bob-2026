import { Image } from "react-native";

const BOB_LOGO = require("../../../assets/splash-icon.png");

/** The canonical BOB mark. This renders the bundled artwork without redrawing or altering it. */
export function BobLogo({ size = 48 }: { size?: number }) {
  return (
    <Image
      source={BOB_LOGO}
      resizeMode="contain"
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="BOB"
    />
  );
}
