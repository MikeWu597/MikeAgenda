const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SQLiteManager {
    constructor() {
        this.db = null;
    }

    async init() {
        try {
            // 确保根目录下存在 database.db 文件
            const dbPath = path.join(__dirname, '..', 'database.db');
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err.message);
                } else {
                    console.log('Connected to the database.');
                }
            });

            // 初始化表结构
            await this.createTables();
        } catch (error) {
            console.error('Error initializing SQLite database:', error);
            process.exit(1);
        }
    }

    async createTables() {
        // 创建 sessions 表
        const createSessionsTableQuery = `
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session TEXT NOT NULL,
                ip_address TEXT NOT NULL,
                timestamp DATETIME NOT NULL,
                user_agent TEXT NOT NULL,
                logged_out BOOLEAN DEFAULT 0
            );
        `;

        // 创建 items 表
        const createItemsTableQuery = `
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deadline DATETIME,
                metadata TEXT,
                archived BOOLEAN DEFAULT 0,
                done BOOLEAN DEFAULT 0,
                planned_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                category TEXT
            );
        `;

        // 创建 category 表
        const createCategoryTableQuery = `
            CREATE TABLE IF NOT EXISTS category (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                note TEXT NOT NULL,
                metadata TEXT
            );
        `;

        // 新增：创建 cycle 表
        const createCycleTableQuery = `
            CREATE TABLE IF NOT EXISTS cycle (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                note TEXT,
                archived BOOLEAN DEFAULT 0,
                done BOOLEAN DEFAULT 0,
                cycle TEXT NOT NULL,
                next DATETIME
            );
        `;

        return new Promise((resolve, reject) => {
            this.db.run(createSessionsTableQuery, (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.db.run(createItemsTableQuery, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            this.db.run(createCategoryTableQuery, (err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    this.db.run(createCycleTableQuery, (err) => {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolve();
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        });
    }

    async validateSession(session) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            this.db.get('SELECT * FROM sessions WHERE session = ? AND logged_out = 0', [session], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? true : false);
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed.');
                }
            });
        }
    }

    // 新增：创建分类
    async createCategory(name, color, note, metadata) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            const query = `
                INSERT INTO category (name, color, note, metadata)
                VALUES (?, ?, ?, ?)
            `;
            this.db.run(query, [name, color, note, metadata], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // 新增：编辑分类
    async updateCategory(id, name, color, note, metadata) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            const query = `
                UPDATE category
                SET name = ?, color = ?, note = ?, metadata = ?
                WHERE id = ?
            `;
            this.db.run(query, [name, color, note, metadata, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // 新增：删除分类
    async deleteCategory(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            const query = `
                DELETE FROM category
                WHERE id = ?
            `;
            this.db.run(query, [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // 新增：根据分类名称获取分类 ID
    async getCategoryByName(name) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            const query = `
                SELECT * FROM category WHERE name = ?
            `;
            this.db.get(query, [name], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // 新增：根据分类 ID 获取分类信息
    async getCategoryById(id) {
        // 确保数据库已初始化
        if (!this.db) {
            await this.init();
        }
        // 将 id 转换为整数
        const categoryId = parseInt(id, 10);
        if (isNaN(categoryId)) {
            throw new Error('Invalid category ID');
        }
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM category WHERE id = ?
            `;
            this.db.get(query, [categoryId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // 新增：获取所有分类
    async getCategories() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            this.db.all('SELECT * FROM category', [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // 新增：获取所有循环
    async getCycles() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            this.db.all('SELECT * FROM cycle WHERE archived = 0 AND done = 0', [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // 获取事项列表
    async getItems() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            this.db.all('SELECT * FROM items WHERE done = 0 AND archived = 0', [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // 新增：获取已完成的事项列表
    async getDoneItems() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            this.db.all('SELECT * FROM items WHERE done = 1 AND archived = 0', [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // 新增：将事项标记为未完成
    async markItemAsUndone(itemId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }

            const query = `
                UPDATE items
                SET done = 0
                WHERE id = ?
            `;

            this.db.run(query, [itemId], function(err) {
                if (err) {
                    console.error('Error marking item as undone:', err.message);
                    reject({ success: false, message: '恢复失败' });
                } else {
                    resolve({ success: true, message: '事项已恢复为未完成' });
                }
            });
        });
    }
}

module.exports = SQLiteManager;