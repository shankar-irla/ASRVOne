import { readFile } from "node:fs/promises";
import path from "node:path";

export default async function HomePage() {
  const file = await readFile(path.join(process.cwd(), "public", "legacy", "index.html"), "utf8");
  const body = file.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if (!body) throw new Error("The ASRVOne home page markup could not be loaded.");
  return <div className="platform-page" dangerouslySetInnerHTML={{ __html: body }} />;
}
