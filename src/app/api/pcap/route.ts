
import { NextResponse, type NextRequest } from 'next/server';
import { spawn } from 'child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// Ensure the scripts directory and python script exist
const PYTHON_SCRIPT_NAME = 'pcap-analyzer.py';
const SCRIPTS_DIR = path.join(process.cwd(), 'src', 'lib', 'scripts');
const PYTHON_SCRIPT_PATH = path.join(SCRIPTS_DIR, PYTHON_SCRIPT_NAME);
// Use absolute path for the Python interpreter
const PYTHON_INTERPRETER_PATH = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe');

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  let tempDir: string | undefined;
  try {
    console.log(`Current working directory: ${process.cwd()}`);
    console.log(`Looking for Python script at: ${PYTHON_SCRIPT_PATH}`);
    console.log(`Looking for Python interpreter at: ${PYTHON_INTERPRETER_PATH}`);

    if (!await fileExists(PYTHON_SCRIPT_PATH)) {
      console.error(`Python script not found at ${PYTHON_SCRIPT_PATH}`);
      return NextResponse.json({ success: false, error: 'PCAP analysis script not found on server.' }, { status: 500 });
    }

    if (!await fileExists(PYTHON_INTERPRETER_PATH)) {
      console.error(`Python interpreter not found at ${PYTHON_INTERPRETER_PATH}`);
      return NextResponse.json({ success: false, error: 'Python interpreter not found on server.' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('pcapFile') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No PCAP file uploaded.' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pcap')) {
      return NextResponse.json({ success: false, error: 'Invalid file type. Please upload a .pcap file.' }, { status: 400 });
    }

    // Create a unique temporary directory for this request
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pcap-'));
    const pcapInputDirPath = path.join(tempDir, 'input');
    const pcapOutputDirPath = path.join(tempDir, 'output');
    await fs.mkdir(pcapInputDirPath, { recursive: true });
    await fs.mkdir(pcapOutputDirPath, { recursive: true });

    const uploadedPcapPath = path.join(pcapInputDirPath, file.name);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(uploadedPcapPath, fileBuffer);

    // Execute the Python script
    const pythonProcess = spawn(PYTHON_INTERPRETER_PATH, [PYTHON_SCRIPT_PATH, pcapInputDirPath, pcapOutputDirPath], {
        cwd: SCRIPTS_DIR, // Optional: set current working directory for the script if it relies on relative paths for other things
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const exitCode = await new Promise<number | null>((resolve) => {
      pythonProcess.on('close', (code) => {
        resolve(code);
      });
      pythonProcess.on('error', (err) => {
        console.error('Failed to start Python process:', err);
        stderr += `\nFailed to start Python process: ${err.message}`;
        resolve(null); // Indicate error
      });
    });

    console.log('Python script stdout:', stdout);
    if (stderr) {
      console.error('Python script stderr:', stderr);
    }


    if (exitCode !== 0) {
      // Try to read output files even if script reports error, for partial data or debugging
      let outputJson, dnsMapping;
      try {
        outputJson = JSON.parse(await fs.readFile(path.join(pcapOutputDirPath, 'output.json'), 'utf8'));
      } catch { /* ignore if not found */ }
      try {
        dnsMapping = JSON.parse(await fs.readFile(path.join(pcapOutputDirPath, 'dnsMapping.json'), 'utf8'));
      } catch { /* ignore if not found */ }

      return NextResponse.json({
        success: false,
        error: `PCAP analysis script failed with exit code ${exitCode}.`,
        details: stderr || 'No standard error output.',
        stdout: stdout,
        data: { outputJson, dnsMapping } // Send partial data if available
      }, { status: 500 });
    }

    // Read the generated JSON files
    const outputJsonPath = path.join(pcapOutputDirPath, 'output.json');
    const dnsMappingPath = path.join(pcapOutputDirPath, 'dnsMapping.json');

    if (!await fileExists(outputJsonPath) || !await fileExists(dnsMappingPath)) {
        return NextResponse.json({
            success: false,
            error: 'Analysis script completed, but output files are missing.',
            details: stderr,
            stdout: stdout
        }, { status: 500 });
    }

    const outputJson = JSON.parse(await fs.readFile(outputJsonPath, 'utf8'));
    const dnsMapping = JSON.parse(await fs.readFile(dnsMappingPath, 'utf8'));

    return NextResponse.json({ success: true, outputJson, dnsMapping });

  } catch (error: any) {
    console.error('Error processing PCAP file:', error);
    return NextResponse.json({ success: false, error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  } finally {
    // Clean up the temporary directory
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Error cleaning up temporary directory:', cleanupError);
      }
    }
  }
}
