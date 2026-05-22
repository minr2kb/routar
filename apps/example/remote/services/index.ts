import { fetchExecutor } from '../lib/executor';
import { TodoRouter } from './todo/todo.api';
import { PostRouter } from './post/post.api';
import { UserRouter } from './user/user.api';
import { createApi } from '@routar/core';

// Per-domain server APIs
export const todoServerApi = createApi(fetchExecutor, TodoRouter);
export const postServerApi = createApi(fetchExecutor, PostRouter);
export const userServerApi = createApi(fetchExecutor, UserRouter);
