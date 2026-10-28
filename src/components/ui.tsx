import Link from "next/link";
import type { ComponentProps } from "react";

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
};

export function ButtonLink({ variant = "primary", size = "md", className = "", children, ...rest }: ButtonLinkProps) {
  const sizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  return (
    <Link {...rest} className={`btn btn-${variant} ${sizeClass} ${className}`}>
      {variant === "outline" ? <span>{children}</span> : children}
    </Link>
  );
}

/** Заглавие на секция: „INTRODUCING <червено>OCCT</червено>“ + tagline под него. */
export function SectionHeading({
  title,
  accent,
  tagline,
  align = "center",
  as: Tag = "h2",
}: {
  title: string;
  accent?: string;
  tagline?: string;
  align?: "center" | "left";
  as?: "h1" | "h2";
}) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <Tag className="h-display text-[30px] sm:text-[40px]">
        {title} {accent && <span className="text-accent">{accent}</span>}
      </Tag>
      {tagline && <p className="tagline mt-2">{tagline}</p>}
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="tagline flex items-center gap-2.5 !text-[13px]">
      <span className="marker" /> {children}
    </p>
  );
}

export function Container({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-4 ${className}`}>{children}</div>;
}
