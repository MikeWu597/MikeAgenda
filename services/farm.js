const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

function getLatestPath() {
  // Save under project root: <cwd>/farm/latest.png
  return path.resolve(process.cwd(), 'farm', 'latest.png');
}

function getLatestVoltagePath() {
  // Save under project root: <cwd>/farm/latest.txt
  return path.resolve(process.cwd(), 'farm', 'latest.txt');
}

function ensureDirExists(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

router.post(
  '/upload',
  express.raw({
    type: ['image/jpeg', 'application/octet-stream'],
    limit: '5mb',
  }),
  (req, res) => {
    try {
      const contentType = (req.headers['content-type'] || '').toLowerCase();
      const allowed =
        contentType.startsWith('image/jpeg') ||
        contentType.startsWith('application/octet-stream');

      if (!allowed) {
        return res.status(415).json({
          ok: false,
          error: 'unsupported_content_type',
          expect: 'image/jpeg',
          got: req.headers['content-type'] || null,
        });
      }

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ ok: false, error: 'empty_body' });
      }

      const latestPath = getLatestPath();
      const dir = path.dirname(latestPath);
      ensureDirExists(dir);

      const tmpPath = latestPath + '.tmp';
      fs.writeFileSync(tmpPath, req.body);
      fs.renameSync(tmpPath, latestPath);

      return res.json({ ok: true, bytes: req.body.length, savedAs: '/farm/latest.png' });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'save_failed', message: err.message });
    }
  }
);

router.get('/latest.png', (req, res) => {
  try {
    const latestPath = getLatestPath();
    if (!fs.existsSync(latestPath)) {
      return res.status(404).send('latest image not found');
    }

    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'Surrogate-Control': 'no-store',
    });

    return res.sendFile(latestPath);
  } catch (err) {
    return res.status(500).send('failed to read latest image');
  }
});

router.head('/latest.png', (req, res) => {
  try {
    const latestPath = getLatestPath();
    if (!fs.existsSync(latestPath)) {
      return res.status(404).end();
    }

    const st = fs.statSync(latestPath);

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'Surrogate-Control': 'no-store',
      'Last-Modified': st.mtime.toUTCString(),
    });

    return res.status(200).end();
  } catch (err) {
    return res.status(500).end();
  }
});

router.post(
  '/voltage',
  express.text({
    type: ['text/plain', 'application/json'],
    limit: '1kb',
  }),
  (req, res) => {
    try {
      const raw = typeof req.body === 'string' ? req.body.trim() : '';
      if (!raw) {
        return res.status(400).json({ ok: false, error: 'empty_body' });
      }

      // Expect integer millivolts like "3700".
      if (!/^\d{1,6}$/.test(raw)) {
        return res.status(400).json({ ok: false, error: 'invalid_voltage', got: raw });
      }

      const mv = Number.parseInt(raw, 10);
      if (!Number.isFinite(mv) || mv <= 0) {
        return res.status(400).json({ ok: false, error: 'invalid_voltage', got: raw });
      }

      const latestPath = getLatestVoltagePath();
      const dir = path.dirname(latestPath);
      ensureDirExists(dir);

      const tmpPath = latestPath + '.tmp';
      fs.writeFileSync(tmpPath, String(mv) + '\n', 'utf8');
      fs.renameSync(tmpPath, latestPath);

      return res.json({ ok: true, mv, savedAs: '/farm/latest.txt' });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'save_failed', message: err.message });
    }
  }
);

router.get('/latest.txt', (req, res) => {
  try {
    const latestPath = getLatestVoltagePath();
    if (!fs.existsSync(latestPath)) {
      return res.status(404).send('latest voltage not found');
    }

    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'Surrogate-Control': 'no-store',
    });

    return res.sendFile(latestPath);
  } catch (err) {
    return res.status(500).send('failed to read latest voltage');
  }
});

module.exports = router;
