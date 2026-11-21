import { llms } from "../lib/llms";
export const GET = () => new Response(llms(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
