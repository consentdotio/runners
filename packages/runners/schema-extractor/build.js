import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function commandExists(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore', shell: true });
    return true;
  } catch {
    return false;
  }
}

console.log('Building schema-extractor...');

if (!commandExists('cargo')) {
  console.error('Rust is required but not installed.');
  console.error('Please visit https://rustup.rs and follow the installation instructions.');
  process.exit(1);
}

try {
  execSync('cargo build --release', {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true,
  });
  console.log('Build complete!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

