import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function commandExists(command) {
  try {
    execSync(`${command} --version`, { stdio: "ignore", shell: true });
    return true;
  } catch {
    return false;
  }
}

console.log("Building schema-extractor...");

if (!commandExists("cargo")) {
  console.error("Rust is required but not installed.");
  console.error(
    "Please visit https://rustup.rs and follow the installation instructions."
  );
  process.exit(1);
}

try {
  execSync("cargo build --release", {
    cwd: __dirname,
    stdio: "inherit",
    shell: true,
  });

  const binaryPath = join(__dirname, "target/release/schema-extractor");
  const binaryExists =
    existsSync(binaryPath) || existsSync(`${binaryPath}.exe`);
  if (!binaryExists) {
    console.error("Build succeeded but binary not found at expected location");
    process.exit(1);
  }

  console.log("Build complete!");
} catch (error) {
  console.error("Build failed:", error.message);
  process.exit(1);
}
