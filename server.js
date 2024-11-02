import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import ollama from 'ollama';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3002;

// 中间件
app.use(bodyParser.json());
app.use(express.static('public')); // 提供静态文件

// 处理根路径请求
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 处理聊天请求
app.post('/chat', async (req, res) => {
    const userMessage = req.body.message;
    try {
        const response = await ollama.chat({
            model: 'gemma:2b',
            messages: [
                { role: 'user', content: userMessage }
            ],
            stream: false // 设置为 false
        });
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});
