import { type Lang, LANDING_COPY } from "./landing-copy";

export function NavLinks({ lang }: { lang: Lang }) {
  const { navLinks } = LANDING_COPY[lang];

  return (
    <div className="mx-auto max-w-[900px] px-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5">
        {navLinks.map((link) => (
          <a
            key={link.slug}
            href={`/${lang}/${link.slug}`}
            className="block rounded-[10px] border border-black/8 px-5 py-4 text-[0.88rem] font-semibold text-inherit no-underline"
          >
            {link.label} →
          </a>
        ))}
      </div>
    </div>
  );
}
