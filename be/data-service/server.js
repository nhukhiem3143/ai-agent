const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const { exec } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.post('/api/generate', async (req, res) => {
    const { prompt } = req.body;
    const runId = crypto.randomUUID();
    try {
        const response = await axios.post('http://ai:8000/generate', { prompt: prompt, run_id: runId });
        res.json({ success: true, data: response.data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/preview/:runId', (req, res) => {
    const { runId } = req.params;
    const workspacePath = path.join('/app/outputs', runId, 'workspace');

    // LỆNH 1: Tự động tắt và xóa các container web cũ (có tên chứa 'workspace')
    const killOld = `docker ps -q --filter "name=workspace" | xargs -r docker stop && docker ps -aq --filter "name=workspace" | xargs -r docker rm`;

    // LỆNH 2: Build và chạy web mới
    const startNew = `cd ${workspacePath} && export DOCKER_BUILDKIT=0 && sed -i 's/[0-9]*:80/8888:80/g; s/[0-9]*:5000/5001:5000/g' docker-compose.yml && docker compose up -d --build`;

    // Chạy cả 2 lệnh liên tiếp
    exec(`${killOld} ; ${startNew}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`[LỖI EXEC]: ${stderr || error.message}`);
            return res.status(500).json({ success: false, error: stderr || error.message });
        }
        res.json({ success: true, url: 'http://localhost:8888' });
    });
});

app.listen(5000, () => console.log('Backend running on port 5000'));