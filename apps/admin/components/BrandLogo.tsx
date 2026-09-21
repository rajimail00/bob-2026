import Image from "next/image";
import bobLogo from "../../mobile/assets/splash-icon.png";

export function BrandLogo({ size = "default" }: { size?: "default" | "large" }) {
  const pixels = size === "large" ? 82 : 48;
  return (
    <div className={`brand-logo brand-logo-${size}`} aria-label="BOB">
      <Image className="brand-logo-image" src={bobLogo} width={pixels} height={pixels} alt="BOB" priority={size === "large"} />
      {size === "default" ? <span className="brand-logo-word">BOB Admin</span> : null}
    </div>
  );
}
