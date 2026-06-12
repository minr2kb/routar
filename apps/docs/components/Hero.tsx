import { type Lang, LANDING_COPY } from "./landing-copy";
import { PackageInstall } from "./PackageInstall";

export function Hero({ lang }: { lang: Lang }) {
  const c = LANDING_COPY[lang];

  return (
    <div className="relative px-6 pb-20 pt-24 text-center [background:radial-gradient(ellipse_60%_50%_at_30%_0%,rgba(99,102,241,0.15)_0%,transparent_70%),radial-gradient(ellipse_50%_40%_at_75%_10%,rgba(168,85,247,0.12)_0%,transparent_70%)]">
      <div className="mx-auto max-w-[640px]">
        <div className="mb-8 inline-flex items-center rounded-full border border-brand/30 bg-brand/7 px-3.5 py-[5px] text-[0.72rem] font-bold uppercase tracking-[0.07em] text-brand">
          {c.tagline}
        </div>

        <h1 className="hero-title mb-5 animate-hero-shimmer text-[clamp(3.5rem,10vw,6rem)] font-black leading-none tracking-[-0.04em] motion-reduce:animate-none">
          routar
        </h1>

        <p className="mb-10 whitespace-pre-line text-[1.15rem] leading-[1.75] text-gray-500">
          {c.description}
        </p>

        <div className="mb-10 flex flex-wrap justify-center gap-2.5">
          <a
            href={`/${lang}/getting-started`}
            className="inline-flex items-center rounded-[10px] px-[26px] py-[11px] text-[0.9rem] font-semibold text-white no-underline [background:linear-gradient(135deg,#6366f1_0%,#baa9f7_100%)]"
          >
            {c.getStarted}
          </a>
          <a
            href={`/${lang}/why`}
            className="inline-flex items-center rounded-[10px] border border-brand/30 px-[26px] py-[11px] text-[0.9rem] font-semibold text-brand no-underline"
          >
            {c.whyRoutar}
          </a>
        </div>

        <div className="mx-auto max-w-[500px]">
          <PackageInstall packages={["@routar/core"]} />
        </div>
      </div>
    </div>
  );
}
