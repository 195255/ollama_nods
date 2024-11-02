//使用ollama运行本地模型
//模型下载 https://ollama.com/library
//程序设计：195255
//2024.11.1
import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import ollama from 'ollama';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', true);
const port = 3002;	//设置端口号

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.server = app.listen(port, () => {
    console.log(`服务器运行在 http://0.0.0.0:${port}`);
});

// 初始化对话历史
const conversationHistory = [];
const MAX_CONCURRENT_REQUESTS = 3;  // 最大并发请求数 根据自己电脑性能设置
const requestQueue = [];  // 请求队列
let activeRequests = 0;   // 当前活动请求数


// 处理聊天请求的逻辑
import fs from 'fs';
import XLSX from 'xlsx';  // 引入 xlsx 模块

const logFilePath = 'logs.xlsx';
let logData = [];

// 如果 Excel 文件存在，读取现有数据
if (fs.existsSync(logFilePath)) {
    const workbook = XLSX.readFile(logFilePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    logData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
}

// 添加表头（如果文件是新创建的）
if (logData.length === 0) {
    logData.push(['客户IP', '请求标题', '请求时间']);
}

async function handleChatRequest(req, res) {
    const userMessage = req.body.message;

    // 记录客户端信息
    //const clientIp = req.ip;  // 获取客户端IP
    const clientIp = req.headers['x-forwarded-for'] || req.ip;

    const requestTitle = userMessage;  // 假设请求标题为用户发送的消息
    const requestTime = new Date().toISOString();  // 获取请求时间

    // 将记录的数据存储到 logData 数组中
    logData.push([clientIp, requestTitle, requestTime]);

    // 写入日志到 Excel 文件
    const newWorksheet = XLSX.utils.aoa_to_sheet(logData);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Logs');
    XLSX.writeFile(newWorkbook, logFilePath);

    conversationHistory.push({ role: 'user', content: userMessage });

    const contextMessage = '注意输出的格式，有代码的地方 请使用<pre></pre>标签，如：\n\n```python\nprint("hello world")\n```\n\n注意：请将代码中的换行符替换为 `<br>` 标签，如：\n\n```python\nprint("hello world")<br/>\n\n这样代码才会显示为多行。\n\n如需显示图片，请使用 `<img>` 标签，如：\n\n```html\n<img src="https://example.com/image.png" alt="example image">\n```\n\n注意：请确保图片地址可访问``';

    conversationHistory.unshift({ role: 'system', content: contextMessage });

    try {
        const response = await ollama.chat({
            model: 'qwen2.5',
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
    } finally {
        activeRequests--;
        processNextRequest();  // 处理下一个请求
    }
}



// 处理请求队列
function processNextRequest() {
    if (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
        const nextRequest = requestQueue.shift();
        activeRequests++;
        handleChatRequest(nextRequest.req, nextRequest.res);
    }
}

// 接口
app.post('/chat', (req, res) => {
    requestQueue.push({ req, res });
    processNextRequest();  // 立即尝试处理请求
});
