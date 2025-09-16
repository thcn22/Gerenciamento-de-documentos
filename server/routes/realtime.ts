import { Router } from 'express';
import { subscribeRealtime } from '../services/realtime';
import { authenticateTokenAllowQuery } from '../middleware/auth';

const router = Router();

router.get('/events', authenticateTokenAllowQuery, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const unsubscribe = subscribeRealtime((event) => {
    try {
      send(event);
    } catch {
      // ignore write errors
    }
  });

  // Send a ping every 25s to keep connection alive (Heroku/networks)
  const ping = setInterval(() => {
    try { res.write(': ping\n\n'); } catch {}
  }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    unsubscribe();
    try { res.end(); } catch {}
  });
});

export default router;
