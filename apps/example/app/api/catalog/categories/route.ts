import { ok } from "../../_lib/http";
import { categories } from "../_store";

export function GET() {
  return ok(categories);
}
