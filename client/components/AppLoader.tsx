import React from "react";

type AppLoaderProps = {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
  alt?: string;
};

// Use width-only sizing to preserve the GIF's natural aspect ratio (height auto)
const sizeMap = {
  sm: "w-6",   // 24px wide
  md: "w-16",  // 64px wide
  lg: "w-32",  // 128px wide
};

export function AppLoader({ size = "md", label, className = "", alt = "Carregando" }: AppLoaderProps) {
  const sizeCls = sizeMap[size];
  return (
    <div className={`flex flex-col items-center justify-center ${className}`.trim()}>
      <img
        src="/logo.gif"
        alt={alt}
        className={`${sizeCls} bg-transparent object-contain`}
        style={{ backgroundColor: "transparent", height: "auto" }}
        onError={(e) => {
          // Fallback seguro caso o GIF não esteja disponível
          (e.currentTarget as HTMLImageElement).src = "/favicon.svg";
        }}
      />
      {label ? <p className="mt-3 text-slate-600 text-sm text-center">{label}</p> : null}
    </div>
  );
}

export default AppLoader;
