import ollama from 'ollama';

// 定义一个异步函数来处理AI的响应
async function handleAIResponse() {
    try {
        // 调用Ollama库，指定模型和消息
        const response = await ollama.chat({
            model: 'gemma:2b', // 这里使用的是Mistral模型，您可以根据需要更换
            messages: [
                {
                    role: 'user',
                    content: '你好，Ollama！'
                }
            ],
            stream: true // 启用流式输出
        });

        // 流式处理响应
        for await (const part of response) {
            console.log(part.message.content); // 在控制台输出每一部分的响应
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// 调用函数
handleAIResponse();