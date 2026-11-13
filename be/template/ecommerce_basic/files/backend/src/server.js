const express = require('express');
const app = express();
app.get('/api/health', (_, res) => res.json({ ok: true }));
app.listen(5000, () => console.log('Backend :5000'));