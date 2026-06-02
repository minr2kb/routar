import { createQueries } from "@routar/react-query";
import { TodoRouter, todoApi } from "./todo.api";

export const todoQuery = createQueries(todoApi, TodoRouter);
