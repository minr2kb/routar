import { type Lang, LANDING_COPY } from "./landing-copy";

export function Features({ lang }: { lang: Lang }) {
  const { features } = LANDING_COPY[lang];

  return (
    <div className="mx-auto mb-[120px] max-w-[900px] px-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] overflow-hidden rounded-[14px] border border-black/8">
        {features.map((f, i) => (
          <div
            key={f.title}
            className={`px-[22px] py-[26px] ${i % 2 === 0 ? "bg-brand/[0.025]" : ""} ${i % 3 !== 2 ? "border-r border-black/6" : ""} ${i < 3 ? "border-b border-black/6" : ""}`}
          >
            <div className="mb-2.5 text-[1.35rem]">{f.icon}</div>
            <div className="mb-1.5 text-[0.88rem] font-bold">{f.title}</div>
            <div className="text-[0.81rem] leading-[1.65] text-gray-500">
              {f.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
