import { createQueries } from "@routar/react-query";
import { PostRouter, postApi } from "./post.api";

export const postQuery = createQueries(postApi, PostRouter);
