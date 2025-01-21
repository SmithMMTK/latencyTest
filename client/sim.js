// Install dependencies first: npm install blessed blessed-contrib

const blessed = require('blessed');
const contrib = require('blessed-contrib');
const os = require('os');

// Create a screen object.
const screen = blessed.screen({
  smartCSR: true,
  title: 'Latency Simulation',
});

// Create a grid layout.
const grid = new contrib.grid({
  rows: 12,
  cols: 12,
  screen: screen,
});

// Add a text widget to display messages.
const textBox = grid.set(0, 0, 2, 12, blessed.box, {
  content: 'Latency Simulation between Locations...',
  tags: true,
  border: {
    type: 'line',
  },
  style: {
    fg: 'green',
    border: {
      fg: 'cyan',
    },
  },
});

// Add a sparkline for latency graph.
const sparkline = grid.set(2, 0, 10, 12, contrib.sparkline, { // Increase rowSpan to maximize height
  label: 'Latency (ms)',
  tags: true,
  style: {
    fg: 'blue',
  },
});

// Locations for simulation.
const locations = [
  { source: 'New York', destination: 'Los Angeles' },
  { source: 'Seattle', destination: 'Los Angeles' }
];
const latencies = [[], []];

// Function to simulate latency.
function simulateLatency() {
  locations.forEach((location, index) => {
    const latency = Math.random() * 200 + 50; // Random latency between 50ms and 250ms.
    latencies[index].push(latency);
    if (latencies[index].length > 30) latencies[index].shift(); // Limit graph to 30 data points.

    textBox.setContent(
      locations
        .map((loc, i) => {
          const currentLatency = latencies[i].length > 0 ? latencies[i][latencies[i].length - 1].toFixed(2) : 'N/A';
          return `Simulating latency from {bold}${loc.source}{/bold} to {bold}${loc.destination}{/bold}...\nCurrent Latency: {green-fg}${currentLatency} ms{/green-fg}`;
        })
        .join('\n\n')
    );
  });

  // Scale the latencies for better visual impact.
  const maxLatency = 250; // Set a maximum value for scaling.
  const scaledLatencies = latencies.map((data) => data.map((value) => (value / maxLatency) * 100));

  sparkline.setData(
    locations.map((loc) => `${loc.source} -> ${loc.destination}`),
    scaledLatencies
  );
  screen.render();
}

// Update simulation every second.
setInterval(simulateLatency, 1000);

// Exit the program on keypress.
screen.key(['escape', 'q', 'C-c'], () => {
  process.exit(0);
});

screen.render();