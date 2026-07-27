import cron from 'node-cron';
import pool from './db.js';

cron.schedule('* * * * *', async() => {
    try {
        await pool.query(
            "INSERT INTO _health_check (checked_by) VALUES ('worker')"
        );
        const result = await pool.query('SELECT COUNT(*) FROM _health_check');
        console.log(`[worker] inserted row. Running count: ${result.rows[0].count}`);
    } catch (err) {
        console.error('[worker] health check failed:', err);
    }
});

console.log('Worker started - running every minute.')