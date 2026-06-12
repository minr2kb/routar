import { type Lang, LANDING_COPY } from "./landing-copy";
import { PackageInstall } from "./PackageInstall";

export function Packages({ lang }: { lang: Lang }) {
  const { packages } = LANDING_COPY[lang];

  return (
    <div className="mx-auto mb-[120px] max-w-[900px] px-6">
      <p className="mb-4 text-[0.7rem] font-bold uppercase tracking-[0.09em] text-gray-400">
        Packages
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
        {packages.map((p) => (
          <div
            key={p.name}
            className="flex flex-col gap-2.5 rounded-[12px] border border-black/8 px-5 py-[18px] dark:border-white/10"
          >
            <code className="text-[0.84rem] font-bold text-brand">{p.name}</code>
            <div className="flex-1 text-[0.77rem] leading-[1.5] text-gray-400">
              {p.desc}
            </div>
            <PackageInstall packages={p.pkg} />
          </div>
        ))}
      </div>
    </div>
  );
}
