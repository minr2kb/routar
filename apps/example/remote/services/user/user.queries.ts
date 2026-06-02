import { createQueries } from "@routar/react-query";
import { UserRouter, userApi } from "./user.api";

export const userQuery = createQueries(userApi, UserRouter);
