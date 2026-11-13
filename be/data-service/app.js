const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/generate', require('./routes/generate'));
app.use('/api/runs', require('./routes/runs'));

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  res.status(500).json({ success: false, message: err.message });
});

module.exports = app;
