const express = require('express');
const router = express.Router();
const SQLiteManager = require('./SQLiteManager'); // 引入 SQLiteManager
const sqliteManager = new SQLiteManager(); // 实例化 SQLiteManager

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

// 获取已完成事项列表 API
router.get('/getDoneItems', async (req, res) => {
    try {
        // 确保 SQLiteManager 已初始化
        await sqliteManager.init();

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

    try {
        // 确保 SQLiteManager 已初始化
        await sqliteManager.init();

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

// 新增：根据分类 ID 获取分类信息
// sqliteManager.getCategoryById = async (id) => {
//     return new Promise((resolve, reject) => {
//         if (!this.db) {
//             reject(new Error('Database not initialized'));
//         }
//         const query = `
//             SELECT * FROM category WHERE id = ?
//         `;
//         this.db.get(query, [id], (err, row) => {

//             if (err) {
//                 reject(err);
//             } else {
//                 resolve(row);
//             }
//         });
//     });
// };

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

module.exports = router;