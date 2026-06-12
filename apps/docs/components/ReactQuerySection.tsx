import { highlight } from "./highlight";
import { type Lang, LANDING_COPY } from "./landing-copy";
import { LandingSection } from "./LandingSection";

const CODE = `import { useQuery, useSuspenseQuery, useMutation } from '@tanstack/react-query'
import { createQueries } from '@routar/react-query'

// Keys + queryFn + mutationFn — all derived from \`api\`. One source of truth.
export const todoQuery = createQueries(todoApi)

// It returns options objects, not hooks — reuse them anywhere:
useQuery(todoQuery.getList())                              // client component
useSuspenseQuery(todoQuery.getDetail({ path: { id: 1 } }))
queryClient.prefetchQuery(todoQuery.getList())            // server / RSC
queryClient.ensureQueryData(todoQuery.getDetail({ path: { id: 1 } }))

// Compose & override per call — they're just objects
useQuery({ ...todoQuery.getList(), staleTime: 60_000 })

// Mutations are options too
useMutation(todoQuery.create())                           // POST → mutationOptions`;

export async function ReactQuerySection({ lang }: { lang: Lang }) {
  const c = LANDING_COPY[lang].reactQuery;
  const html = await highlight(CODE);

  return (
    <LandingSection
      eyebrow={c.eyebrow}
      title={c.title}
      subtitle={c.subtitle}
      footer={
        <span className="text-[0.77rem] font-semibold tracking-[0.01em] text-brand-fg dark:text-[#818cf8]">
          {c.note}
        </span>
      }
    >
      <div
        className="overflow-hidden rounded-[14px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] [&_.shiki]:m-0 [&_.shiki]:overflow-x-auto [&_.shiki]:rounded-[14px] [&_.shiki]:px-8 [&_.shiki]:py-7 [&_.shiki]:text-[0.82rem] [&_.shiki]:leading-[1.7]"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: code to html
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {c.points.map((p) => (
          <div
            key={p.title}
            className="rounded-[12px] border border-black/8 px-5 py-[18px] dark:border-white/10"
          >
            <div className="mb-1.5 inline-flex items-center gap-1.5 text-[0.84rem] font-bold text-brand-fg dark:text-[#a5b4fc]">
              <span aria-hidden="true">✓</span>
              {p.title}
            </div>
            <div className="text-[0.8rem] leading-[1.6] text-gray-500">
              {p.desc}
            </div>
          </div>
        ))}
      </div>
    </LandingSection>
  );
}
