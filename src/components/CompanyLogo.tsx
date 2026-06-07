import React, { useState } from "react";

interface CompanyLogoProps {
  name: string;
  logoUrl?: string;
  className?: string;
  alt?: string;
}

// Maps company name patterns to the local static SVG files
const getLocalLogoPath = (name: string): string | null => {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes("google")) return "/logos/google.svg";
  if (n.includes("tcs") || n.includes("tata consultancy")) return "/logos/tcs.svg";
  if (n.includes("uber")) return "/logos/uber.svg";
  if (n.includes("bcg") || n.includes("boston consulting")) return "/logos/bcg.svg";
  if (n.includes("wipro")) return "/logos/wipro.svg";
  if (n.includes("microsoft")) return "/logos/microsoft.svg";
  if (n.includes("amazon")) return "/logos/amazon.svg";
  if (n.includes("adobe")) return "/logos/adobe.svg";
  return null;
};

// Generates cohesive, professional initials for fallback rendering
const getCompanyInitials = (name: string): string => {
  if (!name) return "";
  const upper = name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim();
  if (upper.includes("TATA CONSULTANCY SERVICES")) return "TCS";
  if (upper.includes("BOSTON CONSULTING GROUP")) return "BCG";
  if (upper.includes("TCS")) return "TCS";
  if (upper.includes("BCG")) return "BCG";
  const words = upper.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).substring(0, 3);
  }
  return upper.substring(0, 3);
};

// Smart background and text theme for initials placeholder
const getFallbackStyle = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes("google")) return "bg-red-950/50 text-red-400 border-red-900/50";
  if (n.includes("uber")) return "bg-slate-950 text-slate-100 border-slate-800";
  if (n.includes("tcs") || n.includes("tata")) return "bg-blue-950/50 text-blue-400 border-blue-900/50";
  if (n.includes("bcg") || n.includes("boston")) return "bg-emerald-950/50 text-emerald-400 border-emerald-900/50";
  if (n.includes("wipro")) return "bg-violet-950/50 text-violet-400 border-violet-900/50";
  if (n.includes("microsoft")) return "bg-sky-950/50 text-sky-400 border-sky-900/50";
  if (n.includes("amazon")) return "bg-amber-955/50 text-amber-500 border-amber-900/50";
  if (n.includes("adobe")) return "bg-rose-950/50 text-rose-450 border-rose-900/50";
  return "bg-slate-900/80 text-indigo-400 border-slate-800";
};

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  name,
  logoUrl,
  className = "",
  alt = ""
}) => {
  const [hasError, setHasError] = useState(false);

  // Try to match named local static logo asset first
  const localLogo = getLocalLogoPath(name);
  
  // Decide target url
  const srcUrl = localLogo || (logoUrl && logoUrl.trim() !== "" ? logoUrl : null);

  const shouldRenderFallback = hasError || !srcUrl;

  const baseStyle = {
    width: "64px",
    height: "64px",
    padding: "8px",
    borderRadius: "12px",
  };

  if (shouldRenderFallback) {
    const initials = getCompanyInitials(name);
    const themeClass = getFallbackStyle(name);

    return (
      <div
        style={baseStyle}
        className={`flex items-center justify-center font-black text-sm border shadow-inner shrink-0 leading-none select-none tracking-wider ${themeClass} ${className}`}
        title={name}
        id={`fallback-logo-${name.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      style={baseStyle}
      className={`bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0 ${className}`}
      id={`logo-container-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <img
        src={srcUrl!}
        alt={alt || `${name} Logo`}
        referrerPolicy="no-referrer"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
        }}
        onError={() => setHasError(true)}
      />
    </div>
  );
};
