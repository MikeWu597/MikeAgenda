const express = require('express');
const router = express.Router();
const SQLiteManager = require('./SQLiteManager'); // 引入 SQLiteManager
const sqliteManager = new SQLiteManager(); // 实例化 SQLiteManager
const os = require('os'); // 引入 os 模块


// 新增：获取系统状态 API
router.get('/getSystemStatus', async (req, res) => {
    try {
        const memoryUsage = Math.round((os.totalmem() - os.freemem()) / 1024 / 1024); // 内存占用（MB）
        const systemTime = new Date().toLocaleString(); // 系统时钟
        const uptime = Math.floor(os.uptime()); // 运行时间（秒）

        const status = {
            memoryUsage,
            systemTime,
            uptime
        };

        res.json({ success: true, status });
    } catch (err) {
        console.error('Error fetching system status:', err.message);
        res.status(500).json({ success: false, message: '获取系统状态失败' });
    }
});

// 创建事项 API
router.post('/createItem', async (req, res) => {
    try {
        // 确保 SQLiteManager 已初始化
        await sqliteManager.init();

        // 检查 req.body 是否存在
        if (!req.body) {
            return res.status(400).json({ success: false, message: '请求体为空' });
        }

        // 从请求体中获取 session
        const session = req.body.session;

        if (!session) {
            return res.status(401).json({ success: false, message: '未授权' });
        }

        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const { title, description, deadline, plannedTime, category } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: '缺少必要字段' });
        }

        // 修改: 处理分类信息为 JSON 数组，但不再创建新分类
        let categoryIds = [];
        if (category && Array.isArray(category)) {
            for (const categoryId of category) {
                // 检查分类是否已存在
                const existingCategory = await sqliteManager.getCategoryById(categoryId);
                if (existingCategory) {
                    categoryIds.push(existingCategory.id);
                } else {
                    // 如果分类不存在，则返回错误
                    return res.status(400).json({ success: false, message: '分类不存在' });
                }
            }
        }

        const query = `
            INSERT INTO items (title, description, deadline, planned_time, category)
            VALUES (?, ?, ?, ?, ?)
        `;

        // 将分类 ID 数组转换为 JSON 字符串存储
        sqliteManager.db.run(query, [title, description || null, deadline || null, plannedTime || null, JSON.stringify(categoryIds)], function(err) {
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
    try {
        // 确保 SQLiteManager 已初始化
        await sqliteManager.init();

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

        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const { title, description, deadline, planned_time, category } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: '缺少必要字段' });
        }

        // 修改: 处理分类信息为 JSON 数组
        let categoryIds = [];
        if (category && Array.isArray(category)) {
            for (const categoryId of category) {
                // 检查分类是否已存在
                const existingCategory = await sqliteManager.getCategoryById(categoryId);
                if (existingCategory) {
                    categoryIds.push(existingCategory.id);
                } else {
                    // 如果分类不存在，则返回错误
                    return res.status(400).json({ success: false, message: '分类不存在' });
                }
            }
        }
        
        const query = `
            UPDATE items
            SET title = ?, description = ?, deadline = ?, planned_time = ?, category = ?
            WHERE id = ?
        `;

        sqliteManager.db.run(query, [title, description || null, deadline || null, planned_time || null, JSON.stringify(categoryIds), itemId], function(err) {
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

// 标记事项为未完成 API
router.post('/markItemAsUndone', async (req, res) => {
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

        // 调用 SQLiteManager 的 markItemAsUndone 方法
        const result = await sqliteManager.markItemAsUndone(itemId);

        if (!result.success) {
            return res.status(500).json({ success: false, message: result.message });
        }

        res.json({ success: true, message: '事项已恢复为未完成' });
    } catch (err) {
        console.error('Error marking item as undone:', err.message);
        res.status(500).json({ success: false, message: '恢复失败' });
    }
});

// 获取事项列表 API
router.get('/getItems', async (req, res) => {
    try {
        // 确保 SQLiteManager 已初始化
        await sqliteManager.init();

        // 从请求头中获取 session
        const session = req.headers['session'];

        if (!session) {
            return res.status(401).json({ success: false, message: '未授权' });
        }

        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const items = await sqliteManager.getItems();
        res.json({ success: true, items });
    } catch (err) {
        console.error('Error fetching items:', err.message);
        res.status(500).json({ success: false, message: '获取事项失败' });
    }
});

// 获取已完成事项列表 API
router.get('/getDoneItems', async (req, res) => {
    try {
        // 确保 SQLiteManager 已初始化
        await sqliteManager.init();

        // 从请求头中获取 session
        const session = req.headers['session'];

        if (!session) {
            return res.status(401).json({ success: false, message: '未授权' });
        }

        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const doneItems = await sqliteManager.getDoneItems();
        res.json({ success: true, items: doneItems });
    } catch (err) {
        console.error('Error fetching done items:', err.message);
        res.status(500).json({ success: false, message: '获取已完成事项失败' });
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

// 获取所有分类
router.post('/getCategories', async (req, res) => {
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

        const categories = await sqliteManager.getCategories();
        res.json({ success: true, categories });
    } catch (err) {
        console.error('Error fetching categories:', err.message);
        res.status(500).json({ success: false, message: '获取分类失败' });
    }
});

// 根据分类 ID 获取该分类下的所有事项
router.post('/getItemsByCategory', async (req, res) => {
    const categoryId = req.body.id; // 修改: 从请求体中获取分类 ID

    if (!categoryId) {
        return res.status(400).json({ success: false, message: '缺少分类 ID' });
    }

    // 从请求体中获取 session
    const session = req.body.session;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    try {
        // 确保 SQLiteManager 已初始化
        await sqliteManager.init();

        // 验证 session
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        // 修改: 使用更灵活的查询逻辑，确保能够匹配分类 ID，并且只返回未被删除且未被完成的事项
        const query = `
            SELECT * FROM items 
            WHERE (JSON_EXTRACT(category, '$') LIKE ? OR JSON_EXTRACT(category, '$') LIKE ?)
            AND archived = 0
            AND done = 0
        `;
        const params = [`%${categoryId}%`, `%,${categoryId}%`];

        sqliteManager.db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Error fetching items by category:', err.message);
                res.status(500).json({ success: false, message: '获取事项失败' });
            } else {
                console.log(`Found ${rows.length} items for category ID ${categoryId}`); // 调试日志
                res.json({ success: true, items: rows });
            }
        });
    } catch (err) {
        console.error('Error fetching items by category:', err.message);
        res.status(500).json({ success: false, message: '获取事项失败' });
    }
});

// 获取单个分类
router.get('/getCategory/:id', async (req, res) => {
    const categoryId = req.params.id;

    if (!categoryId) {
        return res.status(400).json({ success: false, message: '缺少分类 ID' });
    }

    // 从请求头中获取 session
    const session = req.headers['session'];

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    try {
        // 确保 SQLiteManager 已初始化
        await sqliteManager.init();

        // 验证 session
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const query = `
            SELECT * FROM category WHERE id = ?
        `;

        sqliteManager.db.get(query, [categoryId], (err, row) => {
            if (err) {
                console.error('Error fetching category:', err.message);
                res.status(500).json({ success: false, message: '获取分类失败' });
            } else if (!row) {
                res.status(404).json({ success: false, message: '分类未找到' });
            } else {
                res.json({ success: true, category: row });
            }
        });
    } catch (err) {
        console.error('Error fetching category:', err.message);
        res.status(500).json({ success: false, message: '获取分类失败' });
    }
});

// 创建分类
router.post('/createCategory', async (req, res) => {
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

        const { name, color, note, metadata } = req.body;

        if (!name || !color || !note) {
            return res.status(400).json({ success: false, message: '缺少必要字段' });
        }

        const query = `
            INSERT INTO category (name, color, note, metadata)
            VALUES (?, ?, ?, ?)
        `;

        sqliteManager.db.run(query, [name, color, note, metadata || null], function(err) {
            if (err) {
                console.error('Error creating category:', err.message);
                res.status(500).json({ success: false, message: '创建失败' });
            } else {
                res.json({ success: true, message: '分类创建成功' });
            }
        });
    } catch (err) {
        console.error('Error creating category:', err.message);
        res.status(500).json({ success: false, message: '创建失败' });
    }
});

// 更新分类
router.put('/updateCategory/:id', async (req, res) => {
    const categoryId = req.params.id;

    if (!categoryId) {
        return res.status(400).json({ success: false, message: '缺少分类 ID' });
    }

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

        const { name, color, note, metadata } = req.body;

        if (!name || !color || !note) {
            return res.status(400).json({ success: false, message: '缺少必要字段' });
        }

        const query = `
            UPDATE category
            SET name = ?, color = ?, note = ?, metadata = ?
            WHERE id = ?
        `;

        sqliteManager.db.run(query, [name, color, note, metadata || null, categoryId], function(err) {
            if (err) {
                console.error('Error updating category:', err.message);
                res.status(500).json({ success: false, message: '更新失败' });
            } else {
                res.json({ success: true, message: '分类更新成功' });
            }
        });
    } catch (err) {
        console.error('Error updating category:', err.message);
        res.status(500).json({ success: false, message: '更新失败' });
    }
});

// 删除分类
router.post('/deleteCategory', async (req, res) => {
    const categoryId = req.body.id;

    if (!categoryId) {
        return res.status(400).json({ success: false, message: '缺少分类 ID' });
    }

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

        // 检查分类下是否有未完成的事项
        const queryCheckItems = `
            SELECT COUNT(*) as count 
            FROM items 
            WHERE (JSON_EXTRACT(category, '$') LIKE ? OR JSON_EXTRACT(category, '$') LIKE ?)
            AND archived = 0
        `;
        const paramsCheckItems = [`%${categoryId}%`, `%,${categoryId}%`];

        sqliteManager.db.get(queryCheckItems, paramsCheckItems, async (err, result) => {
            if (err) {
                console.error('Error checking items for category:', err.message);
                res.status(500).json({ success: false, message: '检查分类事项失败' });
            } else if (result.count > 0) {
                // 如果分类下有未完成的事项，不允许删除
                res.status(400).json({ success: false, message: '该分类下有未完成的事项，无法删除' });
            } else {
                // 删除分类
                const queryDeleteCategory = `
                    DELETE FROM category
                    WHERE id = ?
                `;

                sqliteManager.db.run(queryDeleteCategory, [categoryId], function(err) {
                    if (err) {
                        console.error('Error deleting category:', err.message);
                        res.status(500).json({ success: false, message: '删除失败' });
                    } else {
                        res.json({ success: true, message: '分类已删除' });
                    }
                });
            }
        });
    } catch (err) {
        console.error('Error deleting category:', err.message);
        res.status(500).json({ success: false, message: '删除失败' });
    }
});

// 新增：根据分类名称获取分类 ID
router.get('/getCategoryByName/:name', async (req, res) => {
    const categoryName = req.params.name;

    if (!categoryName) {
        return res.status(400).json({ success: false, message: '缺少分类名称' });
    }

    // 新增：从请求头中获取 session 并验证
    const session = req.headers['session'];
    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    try {
        // 确保 SQLiteManager 已初始化
        await sqliteManager.init();

        // 验证 session 是否有效
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const query = `
            SELECT * FROM category WHERE name = ?
        `;

        sqliteManager.db.get(query, [categoryName], (err, row) => {
            if (err) {
                console.error('Error fetching category:', err.message);
                res.status(500).json({ success: false, message: '获取分类失败' });
            } else if (!row) {
                res.status(404).json({ success: false, message: '分类未找到' });
            } else {
                res.json({ success: true, category: row });
            }
        });
    } catch (err) {
        console.error('Error fetching category:', err.message);
        res.status(500).json({ success: false, message: '获取分类失败' });
    }
});

// 新增：获取授课状态 API
router.get('/getTeachingStatus', async (req, res) => {
    const session = req.headers['session'];

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        // 使用 SQLiteManager 的方法获取 teaching 状态
        const teachingStatus = await sqliteManager.getTeachingStatus();
        res.json({ success: true, teaching: teachingStatus });
    } catch (err) {
        console.error('Error fetching teaching status:', err.message);
        res.status(500).json({ success: false, message: '获取授课状态失败' });
    }
});

// 新增：设置授课状态 API
router.post('/setTeachingStatus', async (req, res) => {
    const session = req.body.session;
    const { teaching } = req.body;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    // 验证 teaching 值是否为 '0' 或 '1'
    if (teaching !== '0' && teaching !== '1') {
        return res.status(400).json({ success: false, message: '无效的授课状态值' });
    }

    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        // 使用 SQLiteManager 的方法设置 teaching 状态
        await sqliteManager.setTeachingStatus(teaching);
        
        res.json({ success: true, message: '授课状态已更新' });
    } catch (err) {
        console.error('Error setting teaching status:', err.message);
        res.status(500).json({ success: false, message: '设置授课状态失败' });
    }
});

// 新增：获取图片存储限制（字节）
router.get('/getImageStorageLimit', async (req, res) => {
    const session = req.headers['session'];

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const limit = await sqliteManager.getImageStorageLimit();
        res.json({ success: true, limit });
    } catch (err) {
        console.error('Error fetching image storage limit:', err.message);
        res.status(500).json({ success: false, message: '获取图片存储限制失败' });
    }
});

// 新增：设置图片存储限制（字节）
router.post('/setImageStorageLimit', async (req, res) => {
    const session = req.body.session;
    const { limit } = req.body;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    const n = parseInt(limit, 10);
    if (!Number.isFinite(n) || n <= 0) {
        return res.status(400).json({ success: false, message: '无效的限制值' });
    }

    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        await sqliteManager.setImageStorageLimit(n);
        res.json({ success: true, message: '图片存储限制已更新' });
    } catch (err) {
        console.error('Error setting image storage limit:', err.message);
        res.status(500).json({ success: false, message: '设置图片存储限制失败' });
    }
});

// 创建循环 API
router.post('/createCycle', async (req, res) => {
    try {
        // 确保 SQLiteManager 已初始化
        await sqliteManager.init();

        // 检查 req.body 是否存在
        if (!req.body) {
            return res.status(400).json({ success: false, message: '请求体为空' });
        }

        // 从请求体中获取 session
        const session = req.body.session;

        if (!session) {
            return res.status(401).json({ success: false, message: '未授权' });
        }

        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const { name, note, cycle, next, config } = req.body;

        if (!name || !cycle || !next) {
            return res.status(400).json({ success: false, message: '缺少必要字段' });
        }

        const query = `
            INSERT INTO cycle (name, note, cycle, next)
            VALUES (?, ?, ?, ?)
        `;

        sqliteManager.db.run(query, [name, note || null, JSON.stringify({cycle: cycle, config: config}), next], function(err) {
            if (err) {
                console.error('Error creating cycle:', err.message);
                res.status(500).json({ success: false, message: '创建失败' });
            } else {
                res.json({ success: true, message: '循环创建成功' });
            }
        });
    } catch (err) {
        console.error('Error creating cycle:', err.message);
        res.status(500).json({ success: false, message: '创建失败' });
    }
});

// 获取所有循环 API
router.get('/getCycles', async (req, res) => {
    try {
        // 确保 SQLiteManager 已初始化
        await sqliteManager.init();

        // 新增：从请求头中获取 session 并验证
        const session = req.headers['session'];
        if (!session) {
            return res.status(401).json({ success: false, message: '未授权' });
        }

        // 验证 session 是否有效
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const cycles = await sqliteManager.getCycles();
        res.json({ success: true, cycles });
    } catch (err) {
        console.error('Error fetching cycles:', err.message);
        res.status(500).json({ success: false, message: '获取循环失败' });
    }
});

// 更新循环 API
router.post('/updateCycle', async (req, res) => {
    const cycleId = req.body.id;

    if (!cycleId) {
        return res.status(400).json({ success: false, message: '缺少循环 ID' });
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

        const { name, note, cycle, next, config } = req.body;

        if (!name || !cycle || !next) {
            return res.status(400).json({ success: false, message: '缺少必要字段' });
        }

        const query = `
            UPDATE cycle
            SET name = ?, note = ?, cycle = ?, next = ?
            WHERE id = ?
        `;

        sqliteManager.db.run(query, [name, note || null, JSON.stringify({cycle: cycle, config: config}), next, cycleId], function(err) {
            if (err) {
                console.error('Error updating cycle:', err.message);
                res.status(500).json({ success: false, message: '更新失败' });
            } else {
                res.json({ success: true, message: '循环已更新' });
            }
        });
    } catch (err) {
        console.error('Error updating cycle:', err.message);
        res.status(500).json({ success: false, message: '更新失败' });
    }
});

// 新增：更新循环下次执行时间 API
router.post('/updateCycleNextTime', async (req, res) => {
    const cycleId = req.body.id;
    const nextTime = req.body.nexttime;

    if (!cycleId || !nextTime) {
        return res.status(400).json({ success: false, message: '缺少必要字段' });
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

        const query = `
            UPDATE cycle
            SET next = ?
            WHERE id = ?
        `;

        sqliteManager.db.run(query, [nextTime, cycleId], function(err) {
            if (err) {
                console.error('Error updating cycle next time:', err.message);
                res.status(500).json({ success: false, message: '更新失败' });
            } else {
                res.json({ success: true, message: '循环下次执行时间已更新' });
            }
        });
    } catch (err) {
        console.error('Error updating cycle next time:', err.message);
        res.status(500).json({ success: false, message: '更新失败' });
    }
});

// 删除循环 API
router.post('/deleteCycle', async (req, res) => {
    const cycleId = req.body.id;

    if (!cycleId) {
        return res.status(400).json({ success: false, message: '缺少循环 ID' });
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

        const query = `
            DELETE FROM cycle
            WHERE id = ?
        `;

        sqliteManager.db.run(query, [cycleId], function(err) {
            if (err) {
                console.error('Error deleting cycle:', err.message);
                res.status(500).json({ success: false, message: '删除失败' });
            } else {
                res.json({ success: true, message: '循环已删除' });
            }
        });
    } catch (err) {
        console.error('Error deleting cycle:', err.message);
        res.status(500).json({ success: false, message: '删除失败' });
    }
});

// 新增：推迟循环的下次执行日期 API
router.post('/delayCycleNextDate', async (req, res) => {
    const cycleId = req.body.id;

    if (!cycleId) {
        return res.status(400).json({ success: false, message: '缺少循环 ID' });
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

        // 调用 SQLiteManager 的 delayCycleNextDate 方法
        const result = await sqliteManager.delayCycleNextDate(cycleId);

        if (!result.success) {
            return res.status(500).json({ success: false, message: result.message });
        }

        res.json({ success: true, message: '循环的下次执行日期已推迟一天' });
    } catch (err) {
        console.error('Error delaying cycle next date:', err.message);
        res.status(500).json({ success: false, message: '推迟失败' });
    }
});

// 新增：判断日期是否符合循环配置
function isCycleMatch(nextDateRaw, cycleConfig, date) {
    const { cycle, config } = JSON.parse(cycleConfig);

    // 修改：正确解析日期
    const year = parseInt(date.slice(0, 4), 10);
    const month = parseInt(date.slice(4, 6), 10);
    const day = parseInt(date.slice(6, 8), 10);

    // 判断nextDate是否是date
    const nextDate = new Date(nextDateRaw);
    if (nextDate.getFullYear() === year && nextDate.getMonth() === month - 1 && nextDate.getDate() === day) {
        return true;
    }

    switch (cycle) {
        case 'daily':
            return true; // 每日循环，默认匹配
        case 'weekly':
            const weekday = new Date(year, month - 1, day).getDay(); // 获取星期几（0-6）
            const parsedConfig = JSON.parse(config); // 解析 config 字符串
            const daysOfWeek = parsedConfig.day.split(',').map(Number); // 支持多个星期几
            return daysOfWeek.includes(weekday);
        case 'monthly':
            return day === Number(JSON.parse(config).day);
        case 'monthly_last': // 新增：支持每月倒数第几天
            const lastDayOfMonth = new Date(year, month, 0).getDate(); // 当月最后一天
            return day === Number(lastDayOfMonth - JSON.parse(config).day + 1);
        default:
            return false;
    }
}

// 修改：获取当天需要执行的循环事项 API
router.post('/getTodayCycles', async (req, res) => {
    try {
        // 确保 SQLiteManager 已初始化
        await sqliteManager.init();

        // 从请求头中获取 session
        const session = req.headers['session'];

        if (!session) {
            return res.status(401).json({ success: false, message: '未授权' });
        }

        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        // 检查 req.body 是否存在
        if (!req.body) {
            return res.status(400).json({ success: false, message: '请求体为空' });
        }

        // 从请求体中获取日期
        const date = req.body.date;

        if (!date || !/^\d{8}$/.test(date)) {
            return res.status(400).json({ success: false, message: '无效的日期格式，应为 YYYYMMDD' });
        }

        // 将日期转换为 SQL 可用的格式
        const formattedDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00`;
        
        // 查询当天需要执行的循环事项
        const query = `
            SELECT * FROM cycle 
            WHERE next <= ? AND archived = 0 AND done = 0
        `;

        sqliteManager.db.all(query, [formattedDate], (err, rows) => {
            if (err) {
                console.error('Error fetching today\'s cycles:', err.message);
                res.status(500).json({ success: false, message: '获取循环事项失败' });
            } else {
                // 过滤出符合条件的循环事项
                const filteredCycles = rows.filter(row => isCycleMatch(row.next, row.cycle, date));
                res.json({ success: true, cycles: filteredCycles });
            }
        });
    } catch (err) {
        console.error('Error fetching today\'s cycles:', err.message);
        res.status(500).json({ success: false, message: '获取循环事项失败' });
    }
});

// 新增：获取课程表 API
router.get('/getCourses', async (req, res) => {
    const session = req.headers['session'];

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const courses = await sqliteManager.getCourses();
        res.json({ success: true, courses });
    } catch (err) {
        console.error('Error fetching courses:', err.message);
        res.status(500).json({ success: false, message: '加载课程失败' });
    }
});

// 修改：在添加或更新课程时处理 day 参数
router.post('/addOrUpdateCourse', async (req, res) => {
    const session = req.body.session;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const course = req.body;
        if (course.id) {
            const updated = await sqliteManager.updateCourse(course.id, course);
            if (updated) {
                res.json({ success: true, message: '课程已更新' });
            } else {
                res.status(500).json({ success: false, message: '更新失败' });
            }
        } else {
            const newId = await sqliteManager.addCourse(course);
            res.json({ success: true, message: '课程已添加', id: newId });
        }
    } catch (err) {
        console.error('Error adding/updating course:', err.message);
        res.status(500).json({ success: false, message: '保存失败' });
    }
});

// 新增：删除课程 API
router.post('/deleteCourse', async (req, res) => {
    const session = req.body.session;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const courseId = req.body.id;
        const deleted = await sqliteManager.deleteCourse(courseId);
        if (deleted) {
            res.json({ success: true, message: '课程已删除' });
        } else {
            res.status(500).json({ success: false, message: '删除失败' });
        }
    } catch (err) {
        console.error('Error deleting course:', err.message);
        res.status(500).json({ success: false, message: '删除失败' });
    }
});

// 新增：续费管理相关 API

// 获取所有续费项目
router.post('/getAllRenewals', async (req, res) => {
    const session = req.body.session;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        const renewals = await sqliteManager.getAllRenewals();
        res.json({ success: true, data: renewals });
    } catch (err) {
        console.error('Error fetching renewals:', err.message);
        res.status(500).json({ success: false, message: '获取续费项目失败' });
    }
});

// 创建续费项目
router.post('/createRenewals', async (req, res) => {
    const session = req.body.session;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        const { name, description, categoryId, expiryDate, reminderDays } = req.body;
        if (!name || !categoryId || !expiryDate || reminderDays === undefined) {
            return res.status(400).json({ success: false, message: '缺少必要字段' });
        }
        await sqliteManager.createRenewal(name, description, categoryId, expiryDate, reminderDays);
        res.json({ success: true, message: '续费项目创建成功' });
    } catch (err) {
        console.error('Error creating renewal:', err.message);
        res.status(500).json({ success: false, message: '创建续费项目失败' });
    }
});

// 更新续费项目
router.put('/updateRenewals/:id', async (req, res) => {
    const session = req.body.session;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        const { id } = req.params;
        const { name, description, categoryId, expiryDate, reminderDays } = req.body;
        if (!id || !name || !categoryId || !expiryDate || reminderDays === undefined) {
            return res.status(400).json({ success: false, message: '缺少必要字段' });
        }
        await sqliteManager.updateRenewal(id, name, description, categoryId, expiryDate, reminderDays);
        res.json({ success: true, message: '续费项目更新成功' });
    } catch (err) {
        console.error('Error updating renewal:', err.message);
        res.status(500).json({ success: false, message: '更新续费项目失败' });
    }
});

// 删除续费项目
router.delete('/deleteRenewals/:id', async (req, res) => {
    const session = req.body.session;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: '缺少续费项目 ID' });
        }
        await sqliteManager.deleteRenewal(id);
        res.json({ success: true, message: '续费项目删除成功' });
    } catch (err) {
        console.error('Error deleting renewal:', err.message);
        res.status(500).json({ success: false, message: '删除续费项目失败' });
    }
});

// 获取所有续费分类
router.post('/getAllRenewalCategories', async (req, res) => {
    const session = req.body.session;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        const categories = await sqliteManager.getRenewalCategories();
        res.json({ success: true, data: categories });
    } catch (err) {
        console.error('Error fetching renewal categories:', err.message);
        res.status(500).json({ success: false, message: '获取续费分类失败' });
    }
});

// 创建续费分类
router.post('/createRenewalCategories', async (req, res) => {
    const session = req.body.session;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        const { name, color, description } = req.body;
        if (!name || !color) {
            return res.status(400).json({ success: false, message: '缺少必要字段' });
        }
        await sqliteManager.createRenewalCategory(name, color, description);
        res.json({ success: true, message: '续费分类创建成功' });
    } catch (err) {
        console.error('Error creating renewal category:', err.message);
        res.status(500).json({ success: false, message: '创建续费分类失败' });
    }
});

router.post('/getRenewalCategoryById', async (req, res) => {
    const session = req.body.session;
    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: '缺少续费分类 ID' });
        }
        const category = await sqliteManager.getRenewalCategoryById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: '续费分类未找到' });
        }
        res.json({ success: true, data: category });
    } catch (err) {
        console.error('Error fetching renewal category by ID:', err.message);
        res.status(500).json({ success: false, message: '获取续费分类失败' });
    }
});

// 更新续费分类
router.put('/updateRenewalCategories/:id', async (req, res) => {
    const session = req.body.session;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        const { id } = req.params;
        const { name, description, color } = req.body;
        if (!id || !name || !color) {
            return res.status(400).json({ success: false, message: '缺少必要字段' });
        }
        await sqliteManager.updateRenewalCategory(id, name, color, description);
        res.json({ success: true, message: '续费分类更新成功' });
    } catch (err) {
        console.error('Error updating renewal category:', err.message);
        res.status(500).json({ success: false, message: '更新续费分类失败' });
    }
});

router.post('/fetchRenewalsByCategory', async (req, res) => {
    const session = req.body.session;
    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        const { categoryId } = req.body;
        if (!categoryId) {
            return res.status(400).json({ success: false, message: '缺少分类 ID' });
        }
        const renewals = await sqliteManager.getRenewalsByCategory(categoryId);
        res.json({ success: true, data: renewals });
    } catch (err) {
        console.error('Error fetching renewals by category:', err.message);
        res.status(500).json({ success: false, message: '获取续费项目失败' });
    }
});

// 删除续费分类
router.post('/deleteRenewalCategories/:id', async (req, res) => {
    const session = req.body.session;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: '缺少续费分类 ID' });
        }
        await sqliteManager.deleteRenewalCategory(id);
        res.json({ success: true, message: '续费分类删除成功' });
    } catch (err) {
        console.error('Error deleting renewal category:', err.message);
        res.status(500).json({ success: false, message: '删除续费分类失败' });
    }
});

// 新增：项目管理 API

// 创建项目
router.post('/createProject', async (req, res) => {
    const session = req.body.session;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    
    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const { name, description, color } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: '项目名称不能为空' });
        }
        
        const projectId = await sqliteManager.createProject(name, description, color);
        res.json({ success: true, message: '项目创建成功', id: projectId });
    } catch (err) {
        console.error('Error creating project:', err.message);
        res.status(500).json({ success: false, message: '创建项目失败' });
    }
});

// 更新项目
router.put('/updateProject/:id', async (req, res) => {
    const session = req.body.session;
    const projectId = req.params.id;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    
    if (!projectId) {
        return res.status(400).json({ success: false, message: '缺少项目 ID' });
    }
    
    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const { name, description, color } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: '项目名称不能为空' });
        }
        
        const updated = await sqliteManager.updateProject(projectId, name, description, color);
        if (updated) {
            res.json({ success: true, message: '项目更新成功' });
        } else {
            res.status(404).json({ success: false, message: '项目未找到' });
        }
    } catch (err) {
        console.error('Error updating project:', err.message);
        res.status(500).json({ success: false, message: '更新项目失败' });
    }
});

// 删除项目（软删除）
router.delete('/deleteProject/:id', async (req, res) => {
    const session = req.body.session;
    const projectId = req.params.id;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    
    if (!projectId) {
        return res.status(400).json({ success: false, message: '缺少项目 ID' });
    }
    
    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const deleted = await sqliteManager.deleteProject(projectId);
        if (deleted) {
            res.json({ success: true, message: '项目删除成功' });
        } else {
            res.status(404).json({ success: false, message: '项目未找到' });
        }
    } catch (err) {
        console.error('Error deleting project:', err.message);
        res.status(500).json({ success: false, message: '删除项目失败' });
    }
});

// 获取所有项目
router.get('/getProjects', async (req, res) => {
    const session = req.headers['session'];

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    
    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const projects = await sqliteManager.getProjects();
        res.json({ success: true, projects });
    } catch (err) {
        console.error('Error fetching projects:', err.message);
        res.status(500).json({ success: false, message: '获取项目列表失败' });
    }
});

// 根据ID获取项目
router.get('/getProject/:id', async (req, res) => {
    const session = req.headers['session'];
    const projectId = req.params.id;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    
    if (!projectId) {
        return res.status(400).json({ success: false, message: '缺少项目 ID' });
    }
    
    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const project = await sqliteManager.getProjectById(projectId);
        if (project) {
            res.json({ success: true, project });
        } else {
            res.status(404).json({ success: false, message: '项目未找到' });
        }
    } catch (err) {
        console.error('Error fetching project:', err.message);
        res.status(500).json({ success: false, message: '获取项目失败' });
    }
});

// 参与项目
router.post('/participateInProject', async (req, res) => {
    const session = req.body.session;
    const { projectId } = req.body;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    
    if (!projectId) {
        return res.status(400).json({ success: false, message: '缺少项目 ID' });
    }
    
    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        const recordId = await sqliteManager.participateInProject(projectId);
        res.json({ success: true, message: '参与项目记录创建成功', id: recordId });
    } catch (err) {
        console.error('Error participating in project:', err.message);
        if (err.message === 'Project not found or deleted') {
            res.status(404).json({ success: false, message: '项目未找到或已被删除' });
        } else {
            res.status(500).json({ success: false, message: '参与项目失败' });
        }
    }
});

// 获取项目参与记录
router.get('/getProjectRecords/:projectId', async (req, res) => {
    const session = req.headers['session'];
    const projectId = req.params.projectId;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }
    
    if (!projectId) {
        return res.status(400).json({ success: false, message: '缺少项目 ID' });
    }
    
    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }
        
        // 检查项目是否存在
        const project = await sqliteManager.getProjectById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: '项目未找到' });
        }
        
        const records = await sqliteManager.getProjectRecords(projectId);
        res.json({ success: true, records });
    } catch (err) {
        console.error('Error fetching project records:', err.message);
        res.status(500).json({ success: false, message: '获取项目参与记录失败' });
    }
});

// 新增：设置授课状态 API
router.post('/setTeachingStatus', async (req, res) => {
    const session = req.body.session;
    const { teaching } = req.body;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    // 验证 teaching 值是否为 '0' 或 '1'
    if (teaching !== '0' && teaching !== '1') {
        return res.status(400).json({ success: false, message: '无效的授课状态值' });
    }

    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        // 使用 SQLiteManager 的方法设置 teaching 状态
        await sqliteManager.setTeachingStatus(teaching);
        
        res.json({ success: true, message: '授课状态已更新' });
    } catch (err) {
        console.error('Error setting teaching status:', err.message);
        res.status(500).json({ success: false, message: '设置授课状态失败' });
    }
});

// 新增：创建检查表 API
router.post('/createChecklist', async (req, res) => {
    const session = req.body.session;
    const { name, orderIndex } = req.body;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    if (!name) {
        return res.status(400).json({ success: false, message: '缺少检查表名称' });
    }

    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const checklistId = await sqliteManager.createChecklist(name, orderIndex || 0);
        res.json({ success: true, message: '检查表创建成功', id: checklistId });
    } catch (err) {
        console.error('Error creating checklist:', err.message);
        res.status(500).json({ success: false, message: '创建检查表失败' });
    }
});

// 新增：获取所有检查表 API
router.get('/getChecklists', async (req, res) => {
    const session = req.headers['session'];

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const checklists = await sqliteManager.getChecklists();
        res.json({ success: true, checklists });
    } catch (err) {
        console.error('Error fetching checklists:', err.message);
        res.status(500).json({ success: false, message: '获取检查表失败' });
    }
});

// 新增：获取检查表详情 API
router.get('/getChecklist/:id', async (req, res) => {
    const session = req.headers['session'];
    const checklistId = req.params.id;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    if (!checklistId) {
        return res.status(400).json({ success: false, message: '缺少检查表 ID' });
    }

    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const checklist = await sqliteManager.getChecklistDetails(checklistId);
        if (!checklist) {
            return res.status(404).json({ success: false, message: '检查表未找到' });
        }

        res.json({ success: true, checklist });
    } catch (err) {
        console.error('Error fetching checklist:', err.message);
        res.status(500).json({ success: false, message: '获取检查表详情失败' });
    }
});

// 新增：更新检查表 API
router.put('/updateChecklist/:id', async (req, res) => {
    const session = req.body.session;
    const checklistId = req.params.id;
    const { name, orderIndex } = req.body;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    if (!checklistId) {
        return res.status(400).json({ success: false, message: '缺少检查表 ID' });
    }

    if (!name) {
        return res.status(400).json({ success: false, message: '缺少检查表名称' });
    }

    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const updated = await sqliteManager.updateChecklist(checklistId, name, orderIndex || 0);
        if (updated) {
            res.json({ success: true, message: '检查表更新成功' });
        } else {
            res.status(404).json({ success: false, message: '检查表未找到' });
        }
    } catch (err) {
        console.error('Error updating checklist:', err.message);
        res.status(500).json({ success: false, message: '更新检查表失败' });
    }
});

// 新增：删除检查表 API
router.delete('/deleteChecklist/:id', async (req, res) => {
    const session = req.body.session;
    const checklistId = req.params.id;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    if (!checklistId) {
        return res.status(400).json({ success: false, message: '缺少检查表 ID' });
    }

    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const deleted = await sqliteManager.deleteChecklist(checklistId);
        if (deleted) {
            res.json({ success: true, message: '检查表删除成功' });
        } else {
            res.status(404).json({ success: false, message: '检查表未找到' });
        }
    } catch (err) {
        console.error('Error deleting checklist:', err.message);
        res.status(500).json({ success: false, message: '删除检查表失败' });
    }
});

// 新增：创建检查项 API
router.post('/createChecklistItem', async (req, res) => {
    const session = req.body.session;
    const { checklistId, name, orderIndex } = req.body;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    if (!checklistId || !name) {
        return res.status(400).json({ success: false, message: '缺少必要字段' });
    }

    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const itemId = await sqliteManager.createChecklistItem(checklistId, name, orderIndex || 0);
        res.json({ success: true, message: '检查项创建成功', id: itemId });
    } catch (err) {
        console.error('Error creating checklist item:', err.message);
        res.status(500).json({ success: false, message: '创建检查项失败' });
    }
});

// 新增：更新检查项 API
router.put('/updateChecklistItem/:id', async (req, res) => {
    const session = req.body.session;
    const itemId = req.params.id;
    const { name, orderIndex, checked } = req.body;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    if (!itemId || !name) {
        return res.status(400).json({ success: false, message: '缺少必要字段' });
    }

    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const updated = await sqliteManager.updateChecklistItem(itemId, name, orderIndex || 0, checked);
        if (updated) {
            res.json({ success: true, message: '检查项更新成功' });
        } else {
            res.status(404).json({ success: false, message: '检查项未找到' });
        }
    } catch (err) {
        console.error('Error updating checklist item:', err.message);
        res.status(500).json({ success: false, message: '更新检查项失败' });
    }
});

// 新增：删除检查项 API
router.delete('/deleteChecklistItem/:id', async (req, res) => {
    const session = req.body.session;
    const itemId = req.params.id;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    if (!itemId) {
        return res.status(400).json({ success: false, message: '缺少检查项 ID' });
    }

    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const deleted = await sqliteManager.deleteChecklistItem(itemId);
        if (deleted) {
            res.json({ success: true, message: '检查项删除成功' });
        } else {
            res.status(404).json({ success: false, message: '检查项未找到' });
        }
    } catch (err) {
        console.error('Error deleting checklist item:', err.message);
        res.status(500).json({ success: false, message: '删除检查项失败' });
    }
});

// 新增：更新检查项状态 API
router.post('/updateChecklistItemStatus', async (req, res) => {
    const session = req.body.session;
    const { id, checked } = req.body;

    if (!session) {
        return res.status(401).json({ success: false, message: '未授权' });
    }

    if (!id) {
        return res.status(400).json({ success: false, message: '缺少检查项 ID' });
    }

    try {
        await sqliteManager.init();
        const isValid = await sqliteManager.validateSession(session);
        if (!isValid) {
            return res.status(401).json({ success: false, message: '会话无效' });
        }

        const updated = await sqliteManager.updateChecklistItemStatus(id, checked);
        if (updated) {
            res.json({ success: true, message: '检查项状态更新成功' });
        } else {
            res.status(404).json({ success: false, message: '检查项未找到' });
        }
    } catch (err) {
        console.error('Error updating checklist item status:', err.message);
        res.status(500).json({ success: false, message: '更新检查项状态失败' });
    }
});

module.exports = router;