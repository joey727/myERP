import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const databaseName = process.env.D1_DATABASE_NAME;
const databaseId = process.env.D1_DATABASE_ID;

if (!databaseName || !databaseId) {
  console.error(
    "Set D1_DATABASE_NAME and D1_DATABASE_ID, or add them to worker/.env, before deploying the usage worker."
  );
  process.exit(1);
}

writeFileSync(
  fileURLToPath(new URL("./wrangler.toml", import.meta.url)),
  `name = "myerp-usage"
main = "index.js"
compatibility_date = "2026-11-16"

[[d1_databases]]
binding = "DB"
database_name = "${databaseName}"
database_id = "${databaseId}"
`
);

execFileSync("npx", ["wrangler", "deploy"], {
  cwd: fileURLToPath(new URL(".", import.meta.url)),
  stdio: "inherit"
});
