import React from "react";

interface IconProps {
  className?: string;
}

const Svg: React.FC<IconProps & { children: React.ReactNode }> = ({
  className = "w-5 h-5",
  children,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const IconDashboard: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </Svg>
);

export const IconClock: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

export const IconInbox: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M4 13h4l2 3h4l2-3h4" />
    <path d="M5 5h14l2 8v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z" />
  </Svg>
);

export const IconChart: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M3 3v18h18" />
    <rect x="7" y="12" width="3" height="6" />
    <rect x="12" y="8" width="3" height="10" />
    <rect x="17" y="4" width="3" height="14" />
  </Svg>
);

export const IconUserCog: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="4" />
    <path d="M3 20v-1a5 5 0 0 1 5-5h2" />
    <circle cx="17" cy="16" r="3" />
    <path d="M17 12.5V11M17 21v-1.5M20.5 14.5l-1.3.75M14.8 17.75l-1.3.75M20.5 19.5l-1.3-.75M14.8 15.25l-1.3-.75" />
  </Svg>
);

export const IconOrgChart: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="9" y="2" width="6" height="5" rx="1" />
    <rect x="2" y="16" width="6" height="5" rx="1" />
    <rect x="16" y="16" width="6" height="5" rx="1" />
    <path d="M12 7v4M5 16v-2h14v2" />
  </Svg>
);

export const IconCalendar: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
);

export const IconKey: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="M10.7 12.3 21 2m-4 4 2 2m-5 1 2 2" />
  </Svg>
);

export const IconLogout: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </Svg>
);

export const IconMenu: React.FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Svg>
);
