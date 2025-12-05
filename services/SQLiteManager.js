const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SQLiteManager {

    getLocalTimeString() {
        // 获取当前本地时间（东八区）
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const localTimeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        return localTimeString;
    }
    
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
                }
            });

            // 初始化表结构
            await this.createTables();
            
            // 初始化配置
            await this.initializeConfig();
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

        // 修改：为课程表添加 day 列
        const createCourseTableQuery = `
            CREATE TABLE IF NOT EXISTS courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_code TEXT NOT NULL,
                course_color TEXT NOT NULL,
                course_name TEXT NOT NULL,
                venue TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                instructor_name TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                day INTEGER NOT NULL DEFAULT 0
            );
        `;

        // 创建 renewal_category 表
        const createRenewalCategoryTableQuery = `
            CREATE TABLE IF NOT EXISTS renewal_category (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                note TEXT
            );
        `;

        // 创建 renewal 表
        const createRenewalTableQuery = `
            CREATE TABLE IF NOT EXISTS renewal (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                category_id INTEGER NOT NULL,
                expiry_date DATETIME NOT NULL,
                reminder_days INTEGER NOT NULL,
                FOREIGN KEY (category_id) REFERENCES renewal_category (id)
            );
        `;

        // 新增：创建 project 表
        const createProjectTableQuery = `
            CREATE TABLE IF NOT EXISTS project (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                color TEXT,
                deleted BOOLEAN DEFAULT 0
            );
        `;

        // 新增：创建 project_record 表
        const createProjectRecordTableQuery = `
            CREATE TABLE IF NOT EXISTS project_record (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES project (id)
            );
        `;

        // 创建 config 表
        const createConfigTableQuery = `
            CREATE TABLE IF NOT EXISTS config (
                config TEXT NOT NULL,
                value TEXT NOT NULL
            );
        `;

        // 新增：创建 checklist 表
        const createChecklistTableQuery = `
            CREATE TABLE IF NOT EXISTS checklist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                order_index INTEGER NOT NULL DEFAULT 0
            );
        `;

        // 新增：创建 checklist_item 表
        const createChecklistItemTableQuery = `
            CREATE TABLE IF NOT EXISTS checklist_item (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                checklist_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                order_index INTEGER NOT NULL DEFAULT 0,
                checked BOOLEAN DEFAULT 0,
                FOREIGN KEY (checklist_id) REFERENCES checklist (id) ON DELETE CASCADE
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
                                            this.db.run(createCourseTableQuery, (err) => {
                                                if (err) {
                                                    reject(err);
                                                } else {
                                                    this.db.run(createRenewalCategoryTableQuery, (err) => {
                                                        if (err) {
                                                            reject(err);
                                                        } else {
                                                            this.db.run(createRenewalTableQuery, (err) => {
                                                                if (err) {
                                                                    reject(err);
                                                                } else {
                                                                    // 新增：创建 project 表
                                                                    this.db.run(createProjectTableQuery, (err) => {
                                                                        if (err) {
                                                                            reject(err);
                                                                        } else {
                                                                            // 新增：创建 project_record 表
                                                                            this.db.run(createProjectRecordTableQuery, (err) => {
                                                                                if (err) {
                                                                                    reject(err);
                                                                                } else {
                                                                                    // 创建 config 表
                                                                                    this.db.run(createConfigTableQuery, (err) => {
                                                                                        if (err) {
                                                                                            reject(err);
                                                                                        } else {
                                                                                            // 创建 checklist 表
                                                                                            this.db.run(createChecklistTableQuery, (err) => {
                                                                                                if (err) {
                                                                                                    reject(err);
                                                                                                } else {
                                                                                                    // 创建 checklist_item 表
                                                                                                    this.db.run(createChecklistItemTableQuery, (err) => {
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
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
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

    // 检查并初始化配置表
    async initializeConfig() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            
            // 检查是否已有 teaching 配置
            const checkConfigQuery = `SELECT value FROM config WHERE config = 'teaching'`;
            this.db.get(checkConfigQuery, [], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    // 如果没有 teaching 配置，则插入默认值
                    if (!row) {
                        const insertConfigQuery = `INSERT INTO config (config, value) VALUES ('teaching', '1')`;
                        this.db.run(insertConfigQuery, [], (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    } else {
                        resolve();
                    }
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

    // 新增：推迟循环的下次执行日期
    async delayCycleNextDate(cycleId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }

            const query = `
                UPDATE cycle
                SET next = DATETIME(next, '+1 day')
                WHERE id = ?
            `;

            this.db.run(query, [cycleId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, message: '循环的下次执行日期已推迟一天' });
                }
            });
        });
    }

    // 新增：添加课程
    async addCourse(course) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }

            const query = `
                INSERT INTO courses (course_code, course_color, course_name, venue, start_time, end_time, instructor_name, is_active, day)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                course.course_code,
                course.course_color,
                course.course_name,
                course.venue,
                course.start_time,
                course.end_time,
                course.instructor_name,
                course.is_active,
                course.day
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // 新增：删除课程
    async deleteCourse(courseId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }

            const query = `
                DELETE FROM courses
                WHERE id = ?
            `;

            this.db.run(query, [courseId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // 新增：更新课程
    async updateCourse(courseId, updatedCourse) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }

            const query = `
                UPDATE courses
                SET course_code = ?, course_color = ?, course_name = ?, venue = ?, start_time = ?, end_time = ?, instructor_name = ?, is_active = ?, day = ?
                WHERE id = ?
            `;

            this.db.run(query, [
                updatedCourse.course_code,
                updatedCourse.course_color,
                updatedCourse.course_name,
                updatedCourse.venue,
                updatedCourse.start_time,
                updatedCourse.end_time,
                updatedCourse.instructor_name,
                updatedCourse.is_active,
                updatedCourse.day,
                courseId
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // 新增：查询课程
    async getCourses() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }

            const query = `
                SELECT * FROM courses
            `;

            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // 新增：创建 renewal_category
    async createRenewalCategory(name, color, note) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            const query = `
                INSERT INTO renewal_category (name, color, note)
                VALUES (?, ?, ?)
            `;
            this.db.run(query, [name, color, note], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // 新增：更新 renewal_category
    async updateRenewalCategory(id, name, color, note) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            const query = `
                UPDATE renewal_category
                SET name = ?, color = ?, note = ?
                WHERE id = ?
            `;
            this.db.run(query, [name, color, note, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // 新增：删除 renewal_category
    async deleteRenewalCategory(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            const query = `
                DELETE FROM renewal_category
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

    // 新增：获取所有 renewal_category
    async getRenewalCategories() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            this.db.all('SELECT * FROM renewal_category', [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
    
    // 新增：获取 renewal_category by ID
    async getRenewalCategoryById(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            this.db.get('SELECT * FROM renewal_category WHERE id = ?', [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // 新增：创建项目
    async createProject(name, description, color) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            const query = `
                INSERT INTO project (name, description, color)
                VALUES (?, ?, ?)
            `;
            this.db.run(query, [name, description, color], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // 新增：更新项目
    async updateProject(id, name, description, color) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            const query = `
                UPDATE project
                SET name = ?, description = ?, color = ?
                WHERE id = ?
            `;
            this.db.run(query, [name, description, color, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // 新增：删除项目（软删除）
    async deleteProject(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            const query = `
                UPDATE project
                SET deleted = 1
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

    // 新增：获取所有未删除的项目
    async getProjects() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            this.db.all('SELECT * FROM project WHERE deleted = 0', [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // 新增：根据ID获取项目
    async getProjectById(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            this.db.get('SELECT * FROM project WHERE id = ? AND deleted = 0', [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // 新增：参与项目（创建项目记录）
    async participateInProject(projectId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            
            // 先检查项目是否存在且未被删除
            this.getProjectById(projectId).then(project => {
                if (!project) {
                    reject(new Error('Project not found or deleted'));
                    return;
                }
                                
                const query = `
                    INSERT INTO project_record (project_id, timestamp)
                    VALUES (?, ?)
                `;
                this.db.run(query, [projectId, this.getLocalTimeString()], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                });
            }).catch(err => {
                reject(err);
            });
        });
    }

    // 新增：获取项目的所有参与记录
    async getProjectRecords(projectId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            this.db.all('SELECT * FROM project_record WHERE project_id = ? ORDER BY timestamp DESC', [projectId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getAllRenewals(session) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            const query = `
                SELECT * FROM renewal
            `;
            this.db.all(query, [session], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
    async getRenewalsByCategory(categoryId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            const query = `
                SELECT * FROM renewal WHERE category_id = ?
            `;
            this.db.all(query, [categoryId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
    
    // 新增：创建 renewal
    async createRenewal(name, description, categoryId, expiryDate, reminderDays) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            const query = `
                INSERT INTO renewal (name, description, category_id, expiry_date, reminder_days)
                VALUES (?, ?, ?, ?, ?)
            `;
            this.db.run(query, [name, description, categoryId, expiryDate, reminderDays], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // 新增：更新 renewal
    async updateRenewal(id, name, description, categoryId, expiryDate, reminderDays) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            const query = `
                UPDATE renewal
                SET name = ?, description = ?, category_id = ?, expiry_date = ?, reminder_days = ?
                WHERE id = ?
            `;
            this.db.run(query, [name, description, categoryId, expiryDate, reminderDays, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // 新增：删除 renewal
    async deleteRenewal(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            const query = `
                DELETE FROM renewal
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

    // 新增：获取所有 renewal
    async getRenewals() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            this.db.all('SELECT * FROM renewal', [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // 新增：获取教学状态
    async getTeachingStatus() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            
            const query = `SELECT value FROM config WHERE config = 'teaching'`;
            this.db.get(query, [], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    // 如果没有设置teaching配置，默认返回'0'
                    resolve(row ? row.value : '0');
                }
            });
        });
    }

    // 新增：设置教学状态
    async setTeachingStatus(teachingValue) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            
            // First try to update the existing record
            const updateQuery = `UPDATE config SET value = ? WHERE config = 'teaching'`;
            this.db.run(updateQuery, [teachingValue], (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Check if any rows were affected
                if (this.db.changes > 0) {
                    // Successfully updated
                    resolve();
                } else {
                    // No rows were updated, so insert a new record
                    const insertQuery = `INSERT INTO config (config, value) VALUES ('teaching', ?)`;
                    this.db.run(insertQuery, [teachingValue], (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                }
            });
        });
    }

    // 新增：创建检查表
    async createChecklist(name, orderIndex) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            
            const query = `INSERT INTO checklist (name, order_index) VALUES (?, ?)`;
            this.db.run(query, [name, orderIndex], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // 新增：获取所有检查表
    async getChecklists() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            
            const query = `SELECT * FROM checklist ORDER BY order_index ASC`;
            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // 新增：获取检查表详情（包括检查项）
    async getChecklistDetails(checklistId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            
            // 获取检查表信息
            const checklistQuery = `SELECT * FROM checklist WHERE id = ?`;
            this.db.get(checklistQuery, [checklistId], (err, checklistRow) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!checklistRow) {
                    resolve(null);
                    return;
                }
                
                // 获取检查项信息
                const itemsQuery = `SELECT * FROM checklist_item WHERE checklist_id = ? ORDER BY order_index ASC`;
                this.db.all(itemsQuery, [checklistId], (err, itemRows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            ...checklistRow,
                            items: itemRows
                        });
                    }
                });
            });
        });
    }

    // 新增：更新检查表
    async updateChecklist(id, name, orderIndex) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            
            const query = `UPDATE checklist SET name = ?, order_index = ? WHERE id = ?`;
            this.db.run(query, [name, orderIndex, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // 新增：删除检查表
    async deleteChecklist(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            
            const query = `DELETE FROM checklist WHERE id = ?`;
            this.db.run(query, [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // 新增：创建检查项
    async createChecklistItem(checklistId, name, orderIndex) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            
            const query = `INSERT INTO checklist_item (checklist_id, name, order_index) VALUES (?, ?, ?)`;
            this.db.run(query, [checklistId, name, orderIndex], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // 新增：更新检查项
    async updateChecklistItem(id, name, orderIndex, checked) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            
            const query = `UPDATE checklist_item SET name = ?, order_index = ?, checked = ? WHERE id = ?`;
            this.db.run(query, [name, orderIndex, checked ? 1 : 0, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // 新增：删除检查项
    async deleteChecklistItem(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            
            const query = `DELETE FROM checklist_item WHERE id = ?`;
            this.db.run(query, [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // 新增：更新检查项状态
    async updateChecklistItemStatus(id, checked) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
            }
            
            const query = `UPDATE checklist_item SET checked = ? WHERE id = ?`;
            this.db.run(query, [checked ? 1 : 0, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

}

module.exports = SQLiteManager;