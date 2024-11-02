import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import ollama from 'ollama';
import cors from 'cors'; // 引入 cors

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3002;

// 中间件
app.use(cors()); // 允许所有来源的请求
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.server = app.listen(port, () => {
    console.log(`服务器运行在 http://0.0.0.0:${port}`); // 监听所有网络接口
});


// 初始化对话历史
const conversationHistory = [];

// 处理聊天请求
app.post('/chat', async (req, res) => {
    const userMessage = req.body.message;
    conversationHistory.push({ role: 'user', content: userMessage });

    const contextMessage = "你是古人李白，接下来的回答请全部使用古文";
    conversationHistory.unshift({ role: 'system', content: contextMessage });

    try {
        const response = await ollama.chat({
            model: 'glm4:9b',
            messages: conversationHistory,
            stream: true
        });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        for await (const part of response) {
            const content = part.message.content;
            res.write(`data: ${content}\n\n`);
            conversationHistory.push({ role: 'assistant', content: content });
        }

        res.end();
    } catch (error) {
        console.error('处理消息时出错:', error);
        res.status(500).json({ error: error.message });
    }
});
