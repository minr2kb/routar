import { BeforeAfterDemo } from "../../components/BeforeAfterDemo";
import { CodeShowcase } from "../../components/CodeShowcase";
import { ComposableDemo } from "../../components/ComposableDemo";
import { Features } from "../../components/Features";
import { Hero } from "../../components/Hero";
import { toLocale } from "../../components/landing-copy";
import { NavLinks } from "../../components/NavLinks";
import { Packages } from "../../components/Packages";
import { ReactQuerySection } from "../../components/ReactQuerySection";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = toLocale(lang);

  return (
    <div className="min-h-screen pb-24">
      <Hero lang={locale} />
      <CodeShowcase />
      <BeforeAfterDemo lang={locale} />
      <ComposableDemo lang={locale} />
      <ReactQuerySection lang={locale} />
      <Features lang={locale} />
      <Packages lang={locale} />
      <NavLinks lang={locale} />
    </div>
  );
}
