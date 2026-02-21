import { spawnSync } from "node:child_process"

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  })

  const status = result.status ?? 1
  if (status !== 0 && !allowFailure) {
    process.exit(status)
  }
}

// Keep local schema in sync so Auth.js adapter tables exist before OAuth callbacks.
run("npx", ["prisma", "db", "push"], { allowFailure: true })
run("npx", ["next", "dev"])
