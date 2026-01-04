const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

function getLatestPath() {
  // Save under project root: <cwd>/farm/latest.png
  return path.resolve(process.cwd(), 'farm', 'latest.png');
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

module.exports = router;
