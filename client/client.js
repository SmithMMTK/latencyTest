// Client Code
const http = require('http');
const readline = require('readline');
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
let serverIp, title, color;
try {
  const parameters = JSON.parse(fs.readFileSync(profileFilePath, 'utf8'));
  serverIp = parameters.serverIp;
  title = parameters.title || 'Latency Test';
  color = parameters.color?.toLowerCase() || 'green';
  if (!serverIp) throw new Error('Server IP is not defined in the profile file.');
} catch (error) {
  console.error('Failed to read parameters from profile file:', error.message);
  process.exit(1);
}

const colorMap = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  orange: '\x1b[38;5;214m', // Orange color
};
const blockColor = colorMap[color] || '\x1b[32m'; // Default to green

function drawTextChart(data, maxHeight = 10, average = null) {
  const maxValue = Math.max(...data);
  const chartLines = [];

  for (let i = maxHeight; i > 0; i--) {
    let line = '';
    for (const value of data) {
      if ((value / maxValue) * maxHeight >= i) {
        line += `${blockColor}█\x1b[0m`; // Colored block
      } else {
        line += ' ';
      }
    }
    chartLines.push(line);
  }

  console.log(chartLines.join('\n'));
  console.log('─'.repeat(data.length)); // X-axis
  console.log(data.map((value) => value + 'ms').join(' ')); // Latency values

  if (average !== null) {
    console.log(`\nAverage Latency: ${average.toFixed(2)} ms`);
    console.log('Press Enter to stop');
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testLatency() {
  const latencies = [];
  console.log(`Test Title: ${title}`);
  console.log('Running latency tests... (Press Enter to stop)');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let keepRunning = true;
  rl.on('line', () => {
    keepRunning = false;
  });

  let testCount = 0;
  while (keepRunning) {
    testCount++;
    const start = Date.now();

    await new Promise((resolve, reject) => {
      http.get(`http://${serverIp}:3000/ping`, (res) => {
        res.on('data', () => {});
        res.on('end', resolve);
      }).on('error', reject);
    });

    const end = Date.now();
    const latency = end - start;
    latencies.push(latency);

    const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    
    // Ensure we only keep the last 30 latency values
    if (latencies.length > 30) {
      latencies.shift();
    }

    // Redraw chart
    console.clear();
    console.log(`Title: ${title}`);
    console.log(`Running latency tests... Test count: ${testCount}`);
    console.log('Y: Latency (ms)');
    drawTextChart(latencies, 10, averageLatency);

    // Delay 1 seconds between tests
    await sleep(1000);
  }

  rl.close();
}

async function testSpeed() {
  console.log('\nRunning speed test...');
  const start = Date.now();
  let totalBytes = 0;
  let lastLoggedTime = Date.now();

  await new Promise((resolve, reject) => {
    http.get(`http://${serverIp}:3000/data`, (res) => {
      const contentLength = parseInt(res.headers['content-length'], 10);

      res.on('data', (chunk) => {
        totalBytes += chunk.length;
        const currentTime = Date.now();

        // Log progress every 10%
        const percentage = Math.floor((totalBytes / contentLength) * 100);
        if (percentage % 10 === 0 && currentTime - lastLoggedTime >= 500) {
          process.stdout.write(`Progress: ${percentage}% \r`);
          lastLoggedTime = currentTime;
        }
      });
      res.on('end', resolve);
    }).on('error', reject);
  });

  const duration = (Date.now() - start) / 1000; // seconds
  const speedMbps = (totalBytes * 8) / (duration * 1024 * 1024); // Mbps
  console.log('\nDownloaded: ' + (totalBytes / (1024 * 1024)).toFixed(2) + ' MB');
  console.log(`Speed: ${speedMbps.toFixed(2)} Mbps`);
}

(async function runTests() {
  await testLatency();
  await testSpeed();
})();