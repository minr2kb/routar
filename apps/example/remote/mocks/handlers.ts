import { createMswHandlers } from "@routar/msw";
import { HttpResponse } from "msw";
import { TodoRouter } from "../services/todo";
import { PostRouter } from "../services/post";
import { UserRouter } from "../services/user";
import {
  getAllTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
} from "./stores/todo-store";
import { JSONPLACEHOLDER_URL, LOCAL_API_URL } from "../lib/executor";


// --- Todo (local Next.js route handlers) ------------------------------------
export const todoHandlers = createMswHandlers(TodoRouter, LOCAL_API_URL, {
  getList: ({ query }) => HttpResponse.json(getAllTodos(query)),

  getDetail: ({ params }) => {
    const todo = getTodoById(params.id);
    if (!todo) return new Response(null, { status: 404 });
    return HttpResponse.json(todo);
  },

  create: ({ body }) => HttpResponse.json(createTodo(body), { status: 201 }),

  update: ({ params, body }) => {
    const todo = updateTodo(params.id, body);
    if (!todo) return new Response(null, { status: 404 });
    return HttpResponse.json(todo);
  },

  remove: ({ params }) => {
    deleteTodo(params.id);
    return new Response(null, { status: 200 });
  },
});

// --- Posts (https://jsonplaceholder.typicode.com) ---------------------------
export const postHandlers = createMswHandlers(PostRouter, JSONPLACEHOLDER_URL, {
  getList: () =>
    HttpResponse.json([
      { id: 1, userId: 1, title: "Mock Post", body: "Mock body content." },
    ]),

  create: ({ body }) =>
    HttpResponse.json({ id: 101, userId: body.userId, title: body.title, body: body.body }),

  getDetail: ({ params }) =>
    HttpResponse.json({ id: params.id, userId: 1, title: `Mock Post #${params.id}`, body: "Mock." }),

  getComments: ({ params }) =>
    HttpResponse.json([{ id: 1, postId: params.id, name: "Mock", email: "m@e.com", body: "Nice!" }]),
});

// --- Users (https://jsonplaceholder.typicode.com) ---------------------------
export const userHandlers = createMswHandlers(UserRouter, JSONPLACEHOLDER_URL, {
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

  getDetail: ({ params }) =>
    HttpResponse.json({
      id: params.id,
      name: `User #${params.id}`,
      username: `user${params.id}`,
      email: `user${params.id}@example.com`,
      phone: "010-0000-0000",
      website: "example.dev",
      company: { name: "Mock Corp" },
      address: { city: "Seoul" },
    }),
});

export const allHandlers = [...todoHandlers, ...postHandlers, ...userHandlers];
