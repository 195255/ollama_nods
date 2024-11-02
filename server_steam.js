import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import ollama from 'ollama';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

// 中间件
app.use(bodyParser.json());
app.use(express.static('public'));

app.server = app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});

// 处理聊天请求
app.post('/chat', async (req, res) => {
    const userMessage = req.body.message;
    console.log('Received message:', userMessage);

    try {
        const response = await ollama.chat({
            model: 'glm4:9b',
            messages: [
                { role: 'user', content: userMessage }
            ],
            stream: true // 开启流式输出
        });

        // 使用 Chunked Transfer Encoding 实现流式输出
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        for await (const part of response) {
            const content = part.message.content;
            console.log('发送部分内容:', content);
            res.write(`data: ${content}\n\n`); // 将内容写入响应
        }

        res.end(); // 结束响应

    } catch (error) {
        console.error('处理消息时出错:', error);
        res.status(500).json({ error: error.message });
    }
});
