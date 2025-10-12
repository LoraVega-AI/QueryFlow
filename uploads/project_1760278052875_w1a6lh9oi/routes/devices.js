const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'Devices endpoint' });
});

module.exports = router;
