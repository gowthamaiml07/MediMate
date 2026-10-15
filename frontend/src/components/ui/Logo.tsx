import React from "react";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  clickable?: boolean;
}

export function Logo({
  size = "md",
  showSubtitle = true,
  clickable = true,
}: LogoProps) {
  const iconDimensions = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  }[size];

  const titleSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  }[size];

  const content = (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className={`${iconDimensions} relative flex items-center justify-center shrink-0`}
      >
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xs"
        >
          {/* Royal blue/indigo heart */}
          <path
            d="M18 32.5C18 32.5 4 23.5 4 13.5C4 8.5 8 4.5 13 4.5C15.8 4.5 17.2 5.8 18 7C18.8 5.8 20.2 4.5 23 4.5C28 4.5 32 8.5 32 13.5C32 23.5 18 32.5 18 32.5Z"
            fill="url(#heartGradient)"
          />
          {/* Medical cross inside */}
          <rect x="16" y="10" width="4" height="11" rx="1.5" fill="white" />
          <rect x="12.5" y="13.5" width="11" height="4" rx="1.5" fill="white" />
          <defs>
            <linearGradient
              id="heartGradient"
              x1="4"
              y1="4.5"
              x2="32"
              y2="32.5"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#3b82f6" />
              <stop offset="1" stopColor="#4338ca" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className={`${titleSizes} font-bold tracking-tight text-slate-900 leading-none`}
        >
          Medi<span className="text-blue-600">Mate</span>
        </span>
        {showSubtitle && (
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 leading-tight mt-0.5">
            Your Health. In One Place.
          </span>
        )}
      </div>
    </div>
  );

  if (clickable) {
    return (
      <Link href="/dashboard" className="inline-block hover:opacity-95 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
