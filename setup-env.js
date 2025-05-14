const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Determine platform-specific commands
const isWindows = os.platform() === 'win32';
const pythonCmd = isWindows ? 'python' : 'python3';
const venvPath = path.join(process.cwd(), '.venv');
const venvActivate = isWindows 
  ? path.join(venvPath, 'Scripts', 'activate')
  : path.join(venvPath, 'bin', 'activate');
const requirementsPath = path.join(process.cwd(), 'src', 'lib', 'scripts', 'requirements.txt');

console.log('Setting up Python environment...');

try {
  // Create virtual environment if it doesn't exist
  if (!fs.existsSync(venvPath)) {
    console.log('Creating virtual environment...');
    execSync(`${pythonCmd} -m venv .venv`);
  }

  // Install requirements
  console.log('Installing Python dependencies...');
  const pipInstallCmd = isWindows
    ? `.\\${path.join('.venv', 'Scripts', 'pip')} install -r ${requirementsPath}`
    : `./${path.join('.venv', 'bin', 'pip')} install -r ${requirementsPath}`;
  
  execSync(pipInstallCmd);
  
  console.log('Python environment setup complete!');
} catch (error) {
  console.error('Error setting up Python environment:', error);
  process.exit(1);
}