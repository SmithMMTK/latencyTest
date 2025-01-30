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

function renderProgressBar(percentage, speed) {
  const barWidth = 30; // Width of the progress bar in characters
  const filledLength = Math.round((percentage / 100) * barWidth);
  const bar = '='.repeat(filledLength) + '-'.repeat(barWidth - filledLength);
  process.stdout.write(`\r[${bar}] ${percentage}% - Speed: ${speed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Mbps`);
}

async function testSpeed(target, size, label, results) {
  const startTime = Date.now();
  console.log(`\nStarting test for: ${target.title} (${size / (1024 * 1024)} MB - ${label})`);
  console.log('Running speed test...');

  const start = Date.now();
  let totalBytes = 0;
  let lastLoggedTime = Date.now();

  await new Promise((resolve, reject) => {
    http.get(`http://${target.serverIp}:3000/data?size=${size}`, (res) => {
      const contentLength = parseInt(res.headers['content-length'], 10);

      res.on('data', (chunk) => {
        totalBytes += chunk.length;
        const currentTime = Date.now();

        // Update progress bar
        const elapsedTime = (currentTime - start) / 1000; // seconds
        const speedMbps = (totalBytes * 8) / (elapsedTime * 1024 * 1024); // Mbps
        const percentage = Math.floor((totalBytes / contentLength) * 100);
        if (currentTime - lastLoggedTime >= 100) { // Update every 100ms
          renderProgressBar(percentage, speedMbps);
          lastLoggedTime = currentTime;
        }
      });
      res.on('end', () => {
        renderProgressBar(100, (totalBytes * 8) / ((Date.now() - start) / 1000 * 1024 * 1024)); // Final update
        console.log(); // Move to the next line
        resolve();
      });
    }).on('error', reject);
  });

  const end = Date.now();
  const duration = (end - start) / 1000; // seconds
  const speedMbps = (totalBytes * 8) / (duration * 1024 * 1024); // Mbps

  results[label] = {
    downloaded: (totalBytes / (1024 * 1024)).toFixed(2),
    speed: speedMbps.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    time: duration.toFixed(2)
  };

  console.log(`Test completed in ${duration.toFixed(2)} seconds.`);
}

(async function runTests() {
  const results = {};
  const totalStartTime = Date.now();

  for (const target of targets) {
    const targetResults = {};
    await testSpeed(target, 5 * 1024 * 1024, 'Small', targetResults); // 5MB
    await testSpeed(target, 50 * 1024 * 1024, 'Medium', targetResults); // 50MB
    await testSpeed(target, 100 * 1024 * 1024, 'Large', targetResults); // 100MB
    results[target.title] = targetResults;
  }

  const totalEndTime = Date.now();
  const totalDuration = (totalEndTime - totalStartTime) / 1000; // seconds

  console.log('\nTest Results:');
  const labels = ['Small', 'Medium', 'Large'];
  const columnWidths = {
    target: Math.max(...Object.keys(results).map(key => key.length), 6),
    small: Math.max(...Object.values(results).map(r => (r.Small?.speed?.length || 0) + 10), 17),
    medium: Math.max(...Object.values(results).map(r => (r.Medium?.speed?.length || 0) + 10), 17),
    large: Math.max(...Object.values(results).map(r => (r.Large?.speed?.length || 0) + 10), 17)
  };

  const pad = (str, length) => {
    const padding = Math.max(0, length - str.length);
    return str + ' '.repeat(padding);
  };
  const header = [
    pad('Target', columnWidths.target),
    pad('Small (5 MB)', columnWidths.small),
    pad('Medium (50 MB)', columnWidths.medium),
    pad('Large (100 MB)', columnWidths.large)
  ].join(' | ');
  const separator = '-'.repeat(header.length);

  console.log(header);
  console.log(separator);
  for (const [target, targetResults] of Object.entries(results)) {
    const row = [
      pad(target, columnWidths.target),
      pad(`${targetResults.Small?.speed || 'N/A'} Mbps (${targetResults.Small?.time || 'N/A'}s)`, columnWidths.small),
      pad(`${targetResults.Medium?.speed || 'N/A'} Mbps (${targetResults.Medium?.time || 'N/A'}s)`, columnWidths.medium),
      pad(`${targetResults.Large?.speed || 'N/A'} Mbps (${targetResults.Large?.time || 'N/A'}s)`, columnWidths.large)
    ].join(' | ');
    console.log(row);
  }

  console.log(`\nTotal Test Duration: ${totalDuration.toFixed(2)} seconds`);
})();