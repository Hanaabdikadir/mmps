import { spawnSync } from "node:child_process";

// Netlify injects env vars into the process. Existing keys are not
// overridden by Next.js dotenv files. Clear short/empty secrets so
// .env.production.local can load the real values for the build.
for (const key of ["JWT_SECRET", "DATABASE_URL", "NEXT_PUBLIC_APP_URL"]) {
  const value = String(process.env[key] || "");
  if (!value || value.length < 32 || value.includes("SENSITIVE")) {
    delete process.env[key];
  }
}

console.log(
  "build_env",
  "jwt",
  String(process.env.JWT_SECRET || "").length || "from-files",
  "db",
  String(process.env.DATABASE_URL || "").length || "from-files",
);

const result = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "build"],
  { stdio: "inherit", env: process.env, shell: true },
);
process.exit(result.status ?? 1);
