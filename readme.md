
# Latency Test

1. Latency client will send curl request to /ping then server will return "pong" then measure total latency between send vs receive
2. Latency server will send 100 MB dummy binary to client to measure download speed Mbps


# How to run server

Initial npm and install dependencies
```bash
npm init -y
npm install
```

### Run node server
```bash
node server.js
```


# How to run client

Modify parameter file parameters.json or create new file

parameter format

```json
{
    "title": "Local host",
    "serverIp": "localhost",
    "color": "green"
}

```

### color schema
```javascript
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
```

### Execution
```bash
node client.js -p parameters.json
```

>Remark: if not -p specific client.js will load parameters from parameters.json


