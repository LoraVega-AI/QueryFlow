const express = require('express');
const sqlite3 = require('sqlite3');
const app = express();

const db = new sqlite3.Database('./iot_nodejs_sqlite.db');

app.use(express.json());

app.get('/api/devices', (req, res) => {
    db.all('SELECT * FROM devices', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('IoT Dashboard running on port ' + PORT);
});
