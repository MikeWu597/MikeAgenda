const express = require('express');
const fs = require('fs');
const yaml = require('js-yaml');
const SQLiteManager = require('./services/SQLiteManager'); // 引入 SQLiteManager

const app = express();
const sqliteManager = new SQLiteManager(); // 实例化 SQLiteManager

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

// 解析 cookie 中间件
app.use((req, res, next) => {
    req.cookies = {};
    if (req.headers.cookie) {
        req.headers.cookie.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            req.cookies[parts[0].trim()] = (parts[1] || '').trim();
        });
    }
    next();
});

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

// 启动服务器
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

// 程序退出时关闭数据库连接
process.on('SIGINT', () => {
    sqliteManager.close();
    process.exit(0);
});