const express = require('express');
const fs = require('fs');
const yaml = require('js-yaml');
const SQLiteManager = require('./services/SQLiteManager'); // 引入 SQLiteManager
const crypto = require('crypto');
const apiRoutes = require('./services/api'); // 引入 API 路由

const app = express();
const sqliteManager = new SQLiteManager(); // 实例化 SQLiteManager

// 使用 express.static 提供静态资源
app.use(express.static('public'));
app.use(express.json());

// 引入 API 路由
app.use('/api', apiRoutes);

// 读取配置文件
const configPath = './config.yml';
let config = {};
try {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    config = yaml.load(fileContents);
} catch (e) {
    console.error('Error reading or parsing config.yml:', e);
    process.exit(1);
}

// 获取配置
const { port, username, password } = config;

// 初始化 SQLite 数据库
sqliteManager.init().then(() => {
    console.log('SQLite database initialized successfully.');
}).catch((error) => {
    console.error('Failed to initialize SQLite database:', error);
    process.exit(1);
});

// 安装并使用 cookie-parser 中间件
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// 简单的路由示例
app.get('/', async (req, res) => {
    const session = req.cookies.session;

    if (!session) {
        return res.redirect('/login.html');
    }

    try {
        const isValid = await sqliteManager.validateSession(session);
        if (isValid) {
            res.redirect('/dash.html');
        } else {
            res.redirect('/login.html');
        }
    } catch (err) {
        console.error('Error validating session:', err.message);
        res.redirect('/login.html');
    }
});

// 登录路由
app.post('/login', async (req, res) => {
    const { username: inputUsername, password: inputPassword } = req.body;

    if (inputUsername === username && inputPassword === password) {
        const session = crypto.randomBytes(32).toString('hex');
        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        await sqliteManager.createSession(session, ipAddress, userAgent);

        res.json({ success: true, session });
    } else {
        res.json({ success: false });
    }
});

// 创建会话
SQLiteManager.prototype.createSession = function(session, ipAddress, userAgent) {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO sessions (session, ip_address, timestamp, user_agent)
            VALUES (?, ?, datetime('now'), ?)
        `;
        this.db.run(query, [session, ipAddress, userAgent], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

// 启动服务器
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

// 程序退出时关闭数据库连接
process.on('SIGINT', () => {
    sqliteManager.close();
    process.exit(0);
});