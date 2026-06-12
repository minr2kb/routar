import { codeToHtml } from "shiki";

/** Server-side TypeScript → highlighted HTML, shared by the landing sections. */
export function highlight(code: string): Promise<string> {
  return codeToHtml(code, { lang: "typescript", theme: "github-dark" });
}
