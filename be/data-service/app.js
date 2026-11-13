const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');

const app = express();

// ÉP CORS MỞ HOÀN TOÀN BẰNG TAY (Không phụ thuộc thư viện)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
    return res.status(200).json({});
  }
  next();
});

app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/generate', require('./routes/generate')); 
app.use('/api/runs', require('./routes/runs'));

app.post('/api/preview/:runId', (req, res) => {
    const { runId } = req.params;
    const workspacePath = path.join('/app/outputs', runId, 'workspace');
    const killOld = `docker ps -q --filter "name=workspace" | xargs -r docker stop && docker ps -aq --filter "name=workspace" | xargs -r docker rm`;
    const startNew = `cd ${workspacePath} && export DOCKER_BUILDKIT=0 && docker compose up -d --build`;

    exec(`${killOld} ; ${startNew}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`[LỖI EXEC PREVIEW]: ${stderr || error.message}`);
            return res.status(500).json({ success: false, error: stderr || error.message });
        }
        res.json({ success: true, url: 'http://localhost:8888' });
    });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message });
});

module.exports = app;
