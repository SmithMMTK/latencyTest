// Client Code
const http = require('http');
const fs = require('fs');
const path = require('path');

// Get profile file from command-line arguments
const args = process.argv.slice(2);
const profileArgIndex = args.indexOf('-p');
let profileFile = 'parameters.json'; // Default profile
if (profileArgIndex !== -1 && args[profileArgIndex + 1]) {
  profileFile = args[profileArgIndex + 1];
}

const profileFilePath = path.join(__dirname, profileFile);
let targets;
try {
  const parameters = JSON.parse(fs.readFileSync(profileFilePath, 'utf8'));
  targets = parameters.targets;
  if (!targets || targets.length === 0) throw new Error('No targets defined in the parameters file.');
} catch (error) {
  console.error('Failed to read parameters from profile file:', error.message);
  process.exit(1);
}

function renderProgressBar(percentage) {
  const barWidth = 30; // Width of the progress bar in characters
  const filledLength = Math.round((percentage / 100) * barWidth);
  const bar = '='.repeat(filledLength) + '-'.repeat(barWidth - filledLength);
  process.stdout.write(`\r[${bar}] ${percentage}%`);
}

async function testSpeed(target) {
  console.log(`\nStarting test for: ${target.title}`);
  console.log('Running speed test...');

  const start = Date.now();
  let totalBytes = 0;
  let lastLoggedTime = Date.now();

  await new Promise((resolve, reject) => {
    http.get(`http://${target.serverIp}:3000/data`, (res) => {
      const contentLength = parseInt(res.headers['content-length'], 10);

      res.on('data', (chunk) => {
        totalBytes += chunk.length;
        const currentTime = Date.now();

        // Update progress bar
        const percentage = Math.floor((totalBytes / contentLength) * 100);
        if (currentTime - lastLoggedTime >= 100) { // Update every 100ms
          renderProgressBar(percentage);
          lastLoggedTime = currentTime;
        }
      });
      res.on('end', () => {
        renderProgressBar(100); // Ensure full progress bar at the end
        console.log(); // Move to the next line
        resolve();
      });
    }).on('error', reject);
  });

  const end = Date.now();
  const duration = (end - start) / 1000; // seconds
  const speedMbps = (totalBytes * 8) / (duration * 1024 * 1024); // Mbps

  console.log(`Downloaded: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Speed: ${speedMbps.toFixed(2)} Mbps`);
  console.log(`Download Time: ${duration.toFixed(2)} seconds\n`);
}

(async function runTests() {
  for (const target of targets) {
    await testSpeed(target);
  }
})();