const router = require('express').Router();
const axios = require('axios');
const { ok, fail } = require('../utils/response');

router.get('/', async (req, res, next) => {
    try {
        const { data } = await axios.get(`${process.env.AI_URL}/templates`);
        ok(res, data);
    } catch (e) { next(e); }
});

router.get('/skills', async (req, res, next) => {
    try {
        const { data } = await axios.get(`${process.env.AI_URL}/skills`);
        ok(res, data);
    } catch (e) { next(e); }
});

module.exports = router;