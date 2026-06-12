import { logger } from "@routar/core";
import { createKyExecutor } from "@routar/ky";
import ky from "ky";
import { LOCAL_API_URL } from "../constants";
import { correlationPlugin } from "../plugins";

// ky-based executor for the catalog domain. ky's `prefixUrl` requires relative
// route paths — createKyExecutor strips the leading "/" for us. Accepts a
// KyInstance or a factory; here we hand it a configured instance.
const localKy = ky.create({ prefixUrl: LOCAL_API_URL });

export const localKyExecutor = createKyExecutor(localKy, {
  plugins: [
    correlationPlugin,
    logger({ log: (msg, data) => console.log(`[ky] ${msg}`, data) }),
  ],
});
