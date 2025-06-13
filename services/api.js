const express = require('express');
const router = express.Router();
const SQLiteManager = require('./SQLiteManager'); // 引入 SQLiteManager
const sqliteManager = new SQLiteManager(); // 实例化 SQLiteManager

// 创建事项 API
router.post('/createItem', async (req, res) => {
    // 检查 req.body 是否存在
    if (!req.body) {
        return res.status(400).json({ success: false, message: '请求体为空' });
    }

    // 从请求体中获取 session
    const session = req.body.session;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    try {
        // 确保 SQLiteManager 已初始化
        await sqliteManager.init();

        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const { title, description, deadline, plannedTime } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: '缺少必要字段' });
        }

        const query = `
            INSERT INTO items (title, description, deadline, planned_time)
            VALUES (?, ?, ?, ?)
        `;

        sqliteManager.db.run(query, [title, description || null, deadline || null, plannedTime || null], function(err) {
            if (err) {
                console.error('Error inserting item:', err.message);
                res.status(500).json({ success: false, message: '创建失败' });
            } else {
                res.json({ success: true, message: '事项创建成功' });
            }
        });
    } catch (err) {
        console.error('Error creating item:', err.message);
        res.status(500).json({ success: false, message: '创建失败' });
    }
});

// 更新事项 API
router.post('/updateItem', async (req, res) => {
    // 检查 req.body 是否存在
    if (!req.body) {
        return res.status(400).json({ success: false, message: '请求体为空' });
    }

    // 从请求体中获取 session 和事项 ID
    const session = req.body.session;
    const itemId = req.body.id;

    if (!session || !itemId) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    try {
        // 确保 SQLiteManager 已初始化
        await sqliteManager.init();

        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const { title, description, deadline, planned_time } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: '缺少必要字段' });
        }

        const query = `
            UPDATE items
            SET title = ?, description = ?, deadline = ?, planned_time = ?
            WHERE id = ?
        `;

        sqliteManager.db.run(query, [title, description || null, deadline || null, planned_time || null, itemId], function(err) {
            if (err) {
                console.error('Error updating item:', err.message);
                res.status(500).json({ success: false, message: '更新失败' });
            } else {
                res.json({ success: true, message: '事项更新成功' });
            }
        });
    } catch (err) {
        console.error('Error updating item:', err.message);
        res.status(500).json({ success: false, message: '更新失败' });
    }
});

// 更新事项 metadata API
router.post('/updateItemMetadata', async (req, res) => {
    // 检查 req.body 是否存在
    if (!req.body) {
        return res.status(400).json({ success: false, message: '请求体为空' });
    }

    // 从请求体中获取 session 和事项 ID
    const session = req.body.session;
    const itemId = req.body.id;
    const metadata = req.body.metadata;

    if (!session || !itemId || !metadata) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    try {
        // 确保 SQLiteManager 已初始化
        await sqliteManager.init();

        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const query = `
            UPDATE items
            SET metadata = ?
            WHERE id = ?
        `;

        sqliteManager.db.run(query, [metadata, itemId], function(err) {
            if (err) {
                console.error('Error updating item metadata:', err.message);
                res.status(500).json({ success: false, message: '更新失败' });
            } else {
                res.json({ success: true, message: '事项元数据已更新' });
            }
        });
    } catch (err) {
        console.error('Error updating item metadata:', err.message);
        res.status(500).json({ success: false, message: '更新失败' });
    }
});

// 标记事项为完成 API
router.post('/markItemAsDone', async (req, res) => {
    // 检查 req.body 是否存在
    if (!req.body) {
        return res.status(400).json({ success: false, message: '请求体为空' });
    }

    // 从请求体中获取 session 和事项 ID
    const session = req.body.session;
    const itemId = req.body.id;

    if (!session || !itemId) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    try {
        // 确保 SQLiteManager 已初始化
        await sqliteManager.init();

        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const query = `
            UPDATE items
            SET done = 1
            WHERE id = ?
        `;

        sqliteManager.db.run(query, [itemId], function(err) {
            if (err) {
                console.error('Error marking item as done:', err.message);
                res.status(500).json({ success: false, message: '标记失败' });
            } else {
                res.json({ success: true, message: '事项已标记为完成' });
            }
        });
    } catch (err) {
        console.error('Error marking item as done:', err.message);
        res.status(500).json({ success: false, message: '标记失败' });
    }
});

// 获取事项列表 API
router.get('/getItems', async (req, res) => {
    try {
        // 确保 SQLiteManager 已初始化
        await sqliteManager.init();

        const items = await sqliteManager.getItems();
        res.json({ success: true, items });
    } catch (err) {
        console.error('Error fetching items:', err.message);
        res.status(500).json({ success: false, message: '获取事项失败' });
    }
});

// 删除事项 API
router.post('/deleteItem', async (req, res) => {
    // 检查 req.body 是否存在
    if (!req.body) {
        return res.status(400).json({ success: false, message: '请求体为空' });
    }

    // 从请求体中获取 session 和事项 ID
    const session = req.body.session;
    const itemId = req.body.id;

    if (!session || !itemId) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    try {
        // 确保 SQLiteManager 已初始化
        await sqliteManager.init();

        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const query = `
            UPDATE items
            SET archived = 1
            WHERE id = ?
        `;

        sqliteManager.db.run(query, [itemId], function(err) {
            if (err) {
                console.error('Error deleting item:', err.message);
                res.status(500).json({ success: false, message: '删除失败' });
            } else {
                res.json({ success: true, message: '事项已删除' });
            }
        });
    } catch (err) {
        console.error('Error deleting item:', err.message);
        res.status(500).json({ success: false, message: '删除失败' });
    }
});

module.exports = router;