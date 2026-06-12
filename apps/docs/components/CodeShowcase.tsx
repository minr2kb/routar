import { highlight } from "./highlight";

const CODE = `import { z } from 'zod'
import { endpoint, defineRouter, createApi, createFetchExecutor } from '@routar/core'

const TodoSchema = z.object({ id: z.number(), title: z.string(), done: z.boolean() })

const api = createApi(createFetchExecutor('https://api.example.com'), defineRouter('/todos', {
  list:   endpoint({ method: 'GET',  path: '/',    response: z.array(TodoSchema) }),
  detail: endpoint({ method: 'GET',  path: '/:id', response: TodoSchema,
                     request: { path: z.object({ id: z.number() }) } }),
  create: endpoint({ method: 'POST', path: '/',    response: TodoSchema,
                     request: { body: z.object({ title: z.string() }) } }),
}))

const todos = await api.list()                              // Todo[]
const todo  = await api.detail({ path: { id: 1 } })          // Todo
const next  = await api.create({ body: { title: 'buy milk' } }) // Todo`;

export async function CodeShowcase() {
  const html = await highlight(CODE);

  return (
    <div className="mx-auto mb-[120px] max-w-[900px] px-6">
      <div
        className="overflow-hidden rounded-[14px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] [&_.shiki]:m-0 [&_.shiki]:overflow-x-auto [&_.shiki]:rounded-[14px] [&_.shiki]:px-8 [&_.shiki]:py-7 [&_.shiki]:text-[0.82rem] [&_.shiki]:leading-[1.7]"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: code to html
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
