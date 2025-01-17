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

let targets;
try {
  const parameters = JSON.parse(fs.readFileSync(profileFilePath, 'utf8'));
  targets = parameters.targets;
  if (!Array.isArray(targets)) throw new Error('Targets should be an array in the profile file.');
  targets.forEach(target => {
    if (!target.serverIp || !target.title) {
      throw new Error(`Invalid target configuration: ${JSON.stringify(target)}`);
    }
  });
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
  gray: '\x1b[90m',         // Gray for shadow/overlap
};

function drawLatencyChart(latencyData, maxHeight = 12) {
  console.clear();
  console.log('Latency Chart:');

  // Find the max latency across all targets for scaling
  const maxValue = Math.max(...latencyData.flatMap(data => data.latencies));
  const scale = maxValue / maxHeight; // Scale latency values to fit the maxHeight

  // Generate chart rows (height-based)
  const chartRows = Array.from({ length: maxHeight }, () =>
    Array(latencyData[0].latencies.length).fill(' ')
  ); // Fixed width of 30 (time points)

  latencyData.forEach((targetData, targetIndex) => {
    targetData.latencies.forEach((latency, timeIndex) => {
      const scaledValue = Math.round(latency / scale);

      for (let i = 0; i < scaledValue; i++) {
        const row = maxHeight - i - 1; // Invert to match chart Y-axis
        if (chartRows[row][timeIndex] !== ' ') {
          // If there is already a block, use green with black dot
          chartRows[row][timeIndex] = `\x1b[102m\x1b[30m▒\x1b[0m`; // Green block with black dots
        } else {
          chartRows[row][timeIndex] = `${targetData.color}█\x1b[0m`; // Default color block
        }
      }
    });
  });

  // Print the chart
  chartRows.forEach(row => console.log(row.join('   '))); // Add spacing between columns
  console.log('─'.repeat(latencyData[0].latencies.length * 3)); // X-axis

  // Print latency values below the chart, separated by target
  latencyData.forEach(targetData => {
    const coloredValues = targetData.latencies
      .map(latency => `${targetData.color}${latency}ms\x1b[0m`)
      .join(' | ');
    console.log(coloredValues);
  });

  // Print labels and average latencies with color blocks
  console.log('\nTarget Legend and Average Latency:');
  latencyData.forEach(targetData => {
    const averageLatency =
      targetData.latencies.reduce((a, b) => a + b, 0) / targetData.latencies.length || 0;
    console.log(
      `${targetData.color}█\x1b[0m ${targetData.title}: Average Latency = ${averageLatency.toFixed(
        2
      )} ms`
    );
  });

  // Explain the green block with black dot
  console.log(
    '\x1b[102m\x1b[30m▒\x1b[0m Latency values that are close or nearly identical.'
  );

  console.log('Press Enter to stop');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testLatencyForTarget(target, latencies) {
  const start = Date.now();

  await new Promise((resolve, reject) => {
    http.get(`http://${target.serverIp}:3000/ping`, res => {
      res.on('data', () => {});
      res.on('end', resolve);
    }).on('error', reject);
  });

  const end = Date.now();
  const latency = end - start;
  latencies.push(latency);

  // Ensure we only keep the last 20 latency values
  if (latencies.length > 20) {
    latencies.shift();
  }

  return latency;
}

async function runLatencyTests() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('Running latency tests... (Press Enter to stop)');
  let keepRunning = true;

  rl.on('line', () => {
    keepRunning = false;
  });

  // Initialize latency data for each target
  const latencyData = targets.map(target => ({
    title: target.title,
    color: colorMap[target.color?.toLowerCase()] || '\x1b[32m', // Default green
    latencies: [],
  }));

  while (keepRunning) {
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      await testLatencyForTarget(target, latencyData[i].latencies);
    }

    drawLatencyChart(latencyData, 10);
    await sleep(1000); // Delay between tests
  }

  rl.close();
}

(async function runTests() {
  await runLatencyTests();
})();