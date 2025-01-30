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


function drawLatencyChart(latencyData, maxHeight = 12, progress = 0) {
    console.clear();
    console.log('Latency Chart:');
  
    const maxValue = Math.max(
      ...latencyData
        .filter((data) => data.color !== '\x1b[32m') // Filter out green data
        .flatMap((data) => data.latencies)
    );
    const scale = maxValue / maxHeight;
  
    const chartRows = Array.from({ length: maxHeight }, () =>
      Array(latencyData[0].latencies.length).fill(' ')
    );
  
    latencyData
      .filter((targetData) => targetData.color !== '\x1b[32m') // Skip green bars
      .forEach((targetData) => {
        targetData.latencies.forEach((latency, timeIndex) => {
          const scaledValue = Math.round(latency / scale);
          for (let i = 0; i < scaledValue; i++) {
            const row = maxHeight - i - 1;
            chartRows[row][timeIndex] = `${targetData.color}█\x1b[0m`;
          }
        });
      });
  
    chartRows.forEach((row) => console.log(row.join('   ')));
    console.log('─'.repeat(latencyData[0].latencies.length * 3));
  
    latencyData
      .filter((targetData) => targetData.color !== '\x1b[32m') // Skip green values in display
      .forEach((targetData) => {
        const coloredValues = targetData.latencies
          .map((latency) => `${targetData.color}${latency}ms\x1b[0m`)
          .join(' | ');
        console.log(coloredValues);
      });
  
    console.log('\nTarget Legend and Average Latency:');
    latencyData
      .filter((targetData) => targetData.color !== '\x1b[32m') // Skip green legend
      .forEach((targetData) => {
        const latencies = targetData.latencies.filter((latency) => latency > 0); // Exclude 0 ms
        const averageLatency =
          latencies.reduce((a, b) => a + b, 0) / latencies.length || 0;
        const highestLatency = Math.max(...latencies);
        const lowestLatency = latencies.length > 0 ? Math.min(...latencies) : 'N/A';
  
        console.log(
          `${targetData.color}█\x1b[0m ${targetData.title}: Average Latency = ${averageLatency.toFixed(
            2
          )} ms | Highest = ${highestLatency} ms | Lowest = ${lowestLatency} ms`
        );
      });
  
    // Add progress bar
    const progressBarWidth = 50;
    const progressBlocks = Math.round((progress / 100) * progressBarWidth);
    const progressBar = `[${'█'.repeat(progressBlocks)}${' '.repeat(
      progressBarWidth - progressBlocks
    )}] ${progress.toFixed(2)}%`;
    console.log('\nProgress:');
    console.log(progressBar);
  
    console.log('\nPress Enter to stop');
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

  // Ensure we only keep the last 30 latency values
  if (latencies.length > 30) {
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

  const latencyData = targets.map(target => ({
    title: target.title,
    color: colorMap[target.color?.toLowerCase()] || '\x1b[32m',
    latencies: [],
  }));

  let iteration = 0;
  const totalIterations = 100; // Define the total iterations for progress tracking

  while (keepRunning) {
    iteration++;
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      await testLatencyForTarget(target, latencyData[i].latencies);
    }

    const progress = (iteration / totalIterations) * 100;
    drawLatencyChart(latencyData, 10, progress);

    if (iteration >= totalIterations) {
      keepRunning = false;
    }

    await sleep(1000);
  }

  rl.close();
}

(async function runTests() {
  await runLatencyTests();
})();