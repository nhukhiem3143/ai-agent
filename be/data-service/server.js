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

    // Chỉnh lại lệnh một chút để đảm bảo tìm đúng cổng
    const command = `cd ${workspacePath} && export DOCKER_BUILDKIT=0 && docker compose down && sed -i 's/[0-9]*:80/8888:80/g; s/[0-9]*:5000/5001:5000/g' docker-compose.yml && docker compose up -d --build`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`[LỖI EXEC]: ${error.message}`);
            console.error(`[STDERR]: ${stderr}`);
            // Trả thẳng lỗi thật ra ngoài trình duyệt
            return res.status(500).json({ success: false, error: stderr || error.message });
        }
        res.json({ success: true, url: 'http://localhost:8888' });
    });
});

app.listen(5000, () => console.log('Backend running on port 5000'));