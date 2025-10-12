const express = require('express');
const router = express.Router();

router.get('/tenants', (req, res) => {
    res.json({ message: 'tenants endpoint' });
});

module.exports = router;
