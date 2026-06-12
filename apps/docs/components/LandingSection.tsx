import type { ReactNode } from "react";

/**
 * Shared chrome for the landing demo sections — the repeated
 * eyebrow / title / subtitle header, the fixed-width container, and a centered
 * footer slot (archLink, note, reduction line, …). Sections pass their own
 * content as children and an optional `footer`.
 */
export function LandingSection({
  eyebrow,
  title,
  subtitle,
  footer,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto mb-[120px] max-w-[900px] px-6">
      <header className="mb-8 text-center">
        <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.09em] text-brand">
          {eyebrow}
        </p>
        <h2 className="mb-2.5 whitespace-pre-line text-[clamp(1.5rem,4vw,2rem)] font-extrabold leading-[1.25] tracking-[-0.03em]">
          {title}
        </h2>
        {subtitle != null && (
          <p className="mx-auto max-w-[640px] whitespace-pre-line text-[0.95rem] leading-[1.65] text-gray-500">
            {subtitle}
          </p>
        )}
      </header>

      {children}

      {footer != null && <div className="mt-[18px] text-center">{footer}</div>}
    </section>
  );
}
