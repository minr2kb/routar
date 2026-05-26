import { createMswHandlers } from "@routar/msw";
import { HttpResponse } from "msw";
import { TodoRouter } from "../remote/services/todo/todo.api";
import { PostRouter } from "../remote/services/post/post.api";
import { UserRouter } from "../remote/services/user/user.api";

const LOCAL_API = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const JSONPLACEHOLDER = "https://jsonplaceholder.typicode.com";

// ---------------------------------------------------------------------------
// Note on path params: MSW extracts path params as strings (e.g. { id: "42" }).
// Endpoints using z.number() will throw during schema parse — switch to
// z.coerce.number() in the router definition for automatic coercion.
// Endpoints below that rely on path params are marked with their requirement.
// ---------------------------------------------------------------------------

// --- Todo (local Next.js route handlers) ------------------------------------
export const todoHandlers = createMswHandlers(TodoRouter, `${LOCAL_API}/api`, {
  // Works as-is: no path params
  getList: () =>
    HttpResponse.json([
      { id: 1, userId: 1, title: "Buy groceries", completed: false },
      { id: 2, userId: 1, title: "Read a book", completed: true },
    ]),

  // Works as-is: body schema uses z.string() / z.boolean(), no numeric coercion
  create: ({ body }) =>
    HttpResponse.json({
      id: Math.floor(Math.random() * 1000) + 100,
      userId: body.userId,
      title: body.title,
      completed: body.completed,
    }),

  // Requires z.coerce.number() on path.id in TodoRouter for params.id to be a number.
  // As-is (z.number()), the schema parse throws on the string "42" from MSW.
  //
  // getDetail: ({ params }) =>
  //   HttpResponse.json({ id: params.id, userId: 1, title: `Mock Todo #${params.id}`, completed: false }),
  //
  // update: ({ params, body }) =>
  //   HttpResponse.json({ id: params.id, userId: 1, title: body.title ?? `Mock Todo #${params.id}`, completed: body.completed ?? false }),
  //
  // remove: () => new Response(null, { status: 200 }),
});

// --- Posts (https://jsonplaceholder.typicode.com) ---------------------------
export const postHandlers = createMswHandlers(PostRouter, JSONPLACEHOLDER, {
  getList: () =>
    HttpResponse.json([
      { id: 1, userId: 1, title: "Mock Post", body: "Mock body content." },
    ]),

  create: ({ body }) =>
    HttpResponse.json({ id: 101, userId: body.userId, title: body.title, body: body.body }),

  // Requires z.coerce.number() on path.id in PostRouter.
  //
  // getDetail: ({ params }) =>
  //   HttpResponse.json({ id: params.id, userId: 1, title: `Mock Post #${params.id}`, body: "Mock." }),
  //
  // getComments: ({ params }) =>
  //   HttpResponse.json([{ id: 1, postId: params.id, name: "Mock", email: "m@e.com", body: "Nice!" }]),
});

// --- Users (https://jsonplaceholder.typicode.com) ---------------------------
export const userHandlers = createMswHandlers(UserRouter, JSONPLACEHOLDER, {
  getList: () =>
    HttpResponse.json([
      {
        id: 1,
        name: "Alice Mock",
        username: "alice",
        email: "alice@example.com",
        phone: "010-0000-0000",
        website: "alice.dev",
        company: { name: "Acme Corp" },
        address: { city: "Seoul" },
      },
    ]),

  // Requires z.coerce.number() on path.id in UserRouter.
  //
  // getDetail: ({ params }) =>
  //   HttpResponse.json({ id: params.id, name: `User #${params.id}`, ... }),
});

export const allHandlers = [...todoHandlers, ...postHandlers, ...userHandlers];
