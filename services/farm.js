const express = require('express');
const fs = require('fs');
const path = require('path');
const SQLiteManager = require('./SQLiteManager');

const router = express.Router();
const sqliteManager = new SQLiteManager();

function getLatestPath() {
  return path.resolve(process.cwd(), 'farm', 'latest.png');
}

function getLatestVoltagePath() {
  return path.resolve(process.cwd(), 'farm', 'latest.txt');
}

function getImagesDir() {
  return path.resolve(process.cwd(), 'farm', 'images');
}

function ensureDirExists(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function formatTimestampFileName(d) {
  // 返回形如 20260111_123045_123.jpg
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}_${ms}.jpg`;
}

function listImageFiles() {
  const dir = getImagesDir();
  if (!fs.existsSync(dir)) return [];
  const names = fs.readdirSync(dir).filter(n => n.toLowerCase().endsWith('.jpg') || n.toLowerCase().endsWith('.jpeg') || n.toLowerCase().endsWith('.png'));
  const arr = names.map(name => {
    const p = path.join(dir, name);
    try {
      const st = fs.statSync(p);
      return { name, path: p, size: st.size, mtime: st.mtime };
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
  // 按时间升序（最老在前）
  arr.sort((a, b) => a.mtime - b.mtime);
  return arr;
}

function getTotalSize(files) {
  return files.reduce((s, f) => s + (f.size || 0), 0);
}

function deleteFile(p) {
  try {
    fs.unlinkSync(p);
    return true;
  } catch (e) {
    return false;
  }
}

async function enforceStorageLimit() {
  try {
    await sqliteManager.init();
    const limit = await sqliteManager.getImageStorageLimit();
    const files = listImageFiles();
    let total = getTotalSize(files);
    if (total <= limit) return { cleaned: 0, total };

    let removed = 0;
    for (const f of files) {
      if (total <= limit) break;
      const ok = deleteFile(f.path);
      if (ok) {
        total -= f.size;
        removed += 1;
      }
    }
    return { cleaned: removed, total };
  } catch (e) {
    return { error: e.message };
  }
}

router.post(
  '/upload',
  express.raw({
    type: ['image/jpeg', 'application/octet-stream'],
    limit: '5mb',
  }),
  async (req, res) => {
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

      // 保存 latest.png（覆盖）
      const tmpPath = latestPath + '.tmp';
      fs.writeFileSync(tmpPath, req.body);
      fs.renameSync(tmpPath, latestPath);

      // 另外按上传时间命名保存一份到 farm/images
      const imagesDir = getImagesDir();
      ensureDirExists(imagesDir);
      const fileName = formatTimestampFileName(new Date());
      const imagePath = path.join(imagesDir, fileName);
      try {
        fs.writeFileSync(imagePath, req.body);
      } catch (e) {
        // 写入归档文件失败但 latest 已保存，继续返回成功
      }

      // 强制执行存储限制清理（异步完成再返回结果）
      const cleanupResult = await enforceStorageLimit();

      return res.json({ ok: true, bytes: req.body.length, savedAs: '/farm/latest.png', archived: `/farm/images/${fileName}`, cleanup: cleanupResult });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'save_failed', message: err.message });
    }
  }
);

// 列表接口：返回所有归档图片与总大小
router.get('/images', async (req, res) => {
  try {
    const files = listImageFiles();
    const items = files.map(f => ({ name: f.name, size: f.size, mtime: f.mtime.toISOString() }));
    const total = getTotalSize(files);
    return res.json({ ok: true, images: items, total });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'list_failed', message: e.message });
  }
});

// 单图访问（安全）
router.get('/images/:name', (req, res) => {
  try {
    const name = req.params.name;
    if (!/^[0-9_\-]{1,}\.(jpg|jpeg|png)$/i.test(name)) {
      return res.status(400).send('invalid name');
    }
    const p = path.join(getImagesDir(), name);
    if (!fs.existsSync(p)) return res.status(404).send('not found');
    res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' });
    return res.sendFile(p);
  } catch (e) {
    return res.status(500).send('failed');
  }
});

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
