import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function runCommand(command) {
  try {
    execSync(command, { stdio: 'inherit', shell: true });
  } catch (error) {
    console.error(`Command failed: ${command}: ${error}`);
    process.exit(1);
  }
}

function commandExists(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore', shell: true });
    return true;
  } catch {
    return false;
  }
}

console.log('Building swc-plugin-runners WASM...');

// Check if cargo is installed
if (!commandExists('cargo')) {
  console.error('Rust is required but not installed.');
  console.error(
    'Please visit https://rustup.rs and follow the installation instructions.'
  );
  console.error(
    'After installing, run "rustup target add wasm32-unknown-unknown"'
  );
  process.exit(1);
}

// Check if wasm32-unknown-unknown target exists and install if needed
console.log('Checking wasm32-unknown-unknown target...');
try {
  const installedTargets = execSync('rustup target list --installed', {
    stdio: 'pipe',
    shell: true,
  }).toString();
  if (!installedTargets.includes('wasm32-unknown-unknown')) {
    console.log('wasm32-unknown-unknown target not found, installing...');
    runCommand('rustup target add wasm32-unknown-unknown');
  } else {
    console.log('wasm32-unknown-unknown target already installed');
  }
} catch (error) {
  console.error(
    'Failed to check/install wasm32-unknown-unknown target:',
    error.message
  );
  process.exit(1);
}

// Build the WASM plugin
console.log('Running cargo build...');
runCommand('cargo build-wasm32 -p swc_plugin_runners');

// Copy the WASM file
const wasmSource = join(
  __dirname,
  'target/wasm32-unknown-unknown/release/swc_plugin_runners.wasm'
);
const wasmDest = join(__dirname, 'swc_plugin_runners.wasm');

if (!existsSync(wasmSource)) {
  console.error(`WASM file not found at ${wasmSource}`);
  console.error(
    'The cargo build may have failed or produced output at a different location.'
  );
  process.exit(1);
}

console.log(`Copying WASM file from ${wasmSource} to ${wasmDest}...`);
copyFileSync(wasmSource, wasmDest);

console.log('Build complete!');

