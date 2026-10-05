/**
 * Windows / OneDrive safe Prisma generate for npm postinstall.
 * If the query engine DLL is locked (dev server running), warn instead of failing install.
 */
void import("node:child_process").then(({ execSync }) => {
  try {
    execSync("npx prisma generate", {
      stdio: "inherit",
      env: process.env,
    });
  } catch (error) {
    const code =
      error && typeof error.status === "number" ? error.status : 1;
    console.warn(
      "\n[postinstall] prisma generate failed (often EPERM on Windows when Next.js is running or OneDrive is syncing)."
    );
    console.warn(
      "[postinstall] Stop `npm run dev`, close other terminals using this app, then run: npx prisma generate\n"
    );
    // Do not fail `npm install` on lock errors — packages are already installed.
    if (
      process.env.CI === "true" ||
      process.env.PRISMA_GENERATE_STRICT === "true"
    ) {
      process.exit(code || 1);
    }
    process.exit(0);
  }
});
