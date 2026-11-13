const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const db = require('../db');
const { protect } = require('../middlewares/auth');
const { exec } = require('child_process');
const router = express.Router();

// API LẤY LỊCH SỬ CHAT TỪ SQL
router.get('/history/:conversationId', protect, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const [messages] = await db.query(
            'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id ASC',
            [conversationId]
        );
        res.json({ messages });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API CHAT
router.post('/chat', protect, async (req, res) => {
    const { conversationId, message } = req.body;
    const userId = req.user.id;
    let convId = conversationId || crypto.randomUUID();

    try {
        if (!conversationId) {
            await db.query('INSERT INTO conversations (id, user_id) VALUES (?, ?)', [convId, userId]);
        }
        await db.query('INSERT INTO messages (conversation_id, role, content) VALUES (?, "user", ?)', [convId, message]);
        const [history] = await db.query('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id ASC', [convId]);

        const aiRes = await axios.post('http://ai:8000/chat', { history });
        const reply = aiRes.data.reply;
        await db.query('INSERT INTO messages (conversation_id, role, content) VALUES (?, "assistant", ?)', [convId, reply]);

        if (reply.includes('[READY]')) {
            const summary = reply.split('[READY]')[1].split('[/READY]')[0].trim();
            return res.json({ status: 'ready_to_confirm', reply: "Đây là tóm tắt. Bạn có thể sửa trực tiếp nếu cần:", summary, conversationId: convId });
        }
        res.json({ status: 'chatting', reply, conversationId: convId });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// API XÁC NHẬN TẠO WEB
router.post('/confirm/:conversationId', protect, async (req, res) => {
    const { conversationId } = req.params;
    const { summaryText } = req.body;
    try {
        const runId = crypto.randomUUID();
        await db.query('UPDATE conversations SET status = "generating" WHERE id = ?', [conversationId]);

        const runDir = `/app/outputs/${runId}`;
        const workspacePath = `${runDir}/workspace`;
        const statusFile = `${runDir}/status.txt`;

        fs.mkdirSync(workspacePath, { recursive: true });
        fs.writeFileSync(statusFile, 'building');

        res.json({ status: 'generating', run_id: runId });

        console.log(`[Backend] Đang dọn dẹp các web cũ đang chiếm cổng 8888, 5001, 3307...`);

        // LỆNH DỌN DẸP: Tìm và tắt các container đang chiếm port, sau đó mới bật web mới
        const cleanCmd = `
            docker ps -q --filter "publish=8888" | xargs -r docker stop;
            docker ps -q --filter "publish=5001" | xargs -r docker stop;
            docker ps -q --filter "publish=3307" | xargs -r docker stop;
        `;

        axios.post('http://ai:8000/generate', { prompt: summaryText, run_id: runId }, { timeout: 300000 })
            .then(() => {
                console.log(`[Backend 4] AI sinh code xong. Kiểm tra file cấu hình...`);

                // KIỂM TRA FILE DOCKER-COMPOSE TRƯỚC KHI BUILD
                const composeFile = `${workspacePath}/docker-compose.yml`;
                if (!fs.existsSync(composeFile)) {
                    const errMsg = "Lỗi: AI không tạo được file docker-compose.yml";
                    console.error(`[Backend 5-ERROR] ${errMsg}`);
                    fs.writeFileSync(statusFile, `failed: ${errMsg}`);
                    db.query('UPDATE conversations SET status = "done" WHERE id = ?', [conversationId]);
                    return; // Dừng lại, không chạy Docker nữa
                }

                console.log(`[Backend 5] Bắt đầu Build Docker...`);
                exec(`cd ${workspacePath} && docker compose up -d --build`, { timeout: 300000 }, (err, stdout, stderr) => {
                    if (err) {
                        console.error(`[Backend 5-ERROR] Lỗi Build Docker:`, stderr || err.message);
                        fs.writeFileSync(statusFile, 'failed: Build Docker thất bại. Xem log Backend.');
                    } else {
                        console.log(`[Backend 5-OK] Build Docker thành công!`);
                        fs.writeFileSync(statusFile, 'ready');
                    }
                    db.query('UPDATE conversations SET status = "done" WHERE id = ?', [conversationId]);
                });
            })
            .catch((err) => {
                console.error(`[Backend] Lỗi gọi AI:`, err.message);
                fs.writeFileSync(statusFile, 'failed: Lỗi AI: ' + err.message);
                db.query('UPDATE conversations SET status = "done" WHERE id = ?', [conversationId]);
            });
    } catch (error) {
        console.error("[Backend] Lỗi khi tạo thư mục:", error);
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
});

// API CHECK STATUS
router.get('/status/:runId', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const statusFile = `/app/outputs/${req.params.runId}/status.txt`;
    if (!fs.existsSync(statusFile)) return res.json({ status: 'building' });

    const content = fs.readFileSync(statusFile, 'utf8').trim();
    if (content === 'ready') return res.json({ status: 'ready' });
    if (content.startsWith('failed:')) return res.json({ status: 'failed', error: content.replace('failed: ', '') });
    res.json({ status: 'building' });
});

module.exports = router;