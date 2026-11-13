const db = require('../db');

exports.create = async (data) => {
    await db.query(
        `INSERT INTO runs (id, user_id, prompt, status) VALUES (?, ?, ?, 'running')`,
        [data.id, data.user_id || null, data.prompt]
    );
};

exports.update = async (id, fields) => {
    const keys = Object.keys(fields);
    if (!keys.length) return;
    const sets = keys.map(k => `${k}=?`).join(', ');
    await db.query(`UPDATE runs SET ${sets} WHERE id=?`, [...keys.map(k => fields[k]), id]);
};

exports.findAll = async (userId) => {
    const [rows] = await db.query(
        `SELECT * FROM runs WHERE user_id=? OR user_id IS NULL ORDER BY created_at DESC LIMIT 50`,
        [userId]
    );
    return rows;
};

exports.findById = async (id) => {
    const [rows] = await db.query(`SELECT * FROM runs WHERE id=?`, [id]);
    return rows[0];
};