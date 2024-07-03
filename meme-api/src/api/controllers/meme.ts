import { jsonrepair } from 'jsonrepair';
import puppeteer from "puppeteer-core";
import axios from "axios";
import FormData from "form-data";
import fs from 'fs-extra';
import chat from "./chat.ts";

import installBrowser from "@/lib/install-browser.js";
import logger from "@/lib/logger.ts";
import util from '@/lib/util.ts';

const REFRESH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTcxMzMzNTQzMSwianRpIjoiNGZhYTk2MTctOTcyYS00MWU4LTg0NjEtNjE0OWNlM2NiZjUyIiwidHlwZSI6InJlZnJlc2giLCJzdWIiOiIwZDU4MTZkMDQwODA0NTdiODI3YzZlNzE3ZjgwMzhlZiIsIm5iZiI6MTcxMzMzNTQzMSwiZXhwIjoxNzI4ODg3NDMxLCJ1aWQiOiI2NTc5NjcwOGM2ZmY0YjA2YWI5MTYzODMiLCJ1cGxhdGZvcm0iOiJpT1MiLCJyb2xlcyI6WyJ1bmF1dGhlZF91c2VyIl19.SmIPbpNzmxjsqEZ-iPFTnXvd-cBBqkOZbZdK9vXJxE4';
const FAKE_HEADERS = {
    Referer: "https://chatglm.cn/glms",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwZDU4MTZkMDQwODA0NTdiODI3YzZlNzE3ZjgwMzhlZiIsImV4cCI6MTcxOTYzODY3MiwibmJmIjoxNzE5NTUyMjcyLCJpYXQiOjE3MTk1NTIyNzIsImp0aSI6IjZkYzdlM2YxZGIzMzRmMWU5MmI5ZmQxY2JkYmViMjYyIiwidWlkIjoiNjU3OTY3MDhjNmZmNGIwNmFiOTE2MzgzIiwidHlwZSI6ImFjY2VzcyJ9.tYJpXfdBf6JnphCCtwoaoa13pPFm0C_JRR6m2J0YkIo",
    "Sec-Ch-Ua": '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": 'Windows"',
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
};

let browser: puppeteer.Browser;

async function generateText(query: string) {
    // 调用讽刺大师
    let result = await chat.createCompletion([
        {
            role: "user", content: `你是讽刺大师，你能够根据用户提供的{关键词}，提供八条讽刺矛盾的搞笑文本，你会直接生成文本，不需要解释。

        以下是一个{关键词}为“AI自媒体”时的举例：
        【AI自媒体】
        1. "我的内容100%原创" – 从10个不同网站复制粘贴。
        2. "这篇文章花了我一整天" – 用AI生成后花5分钟编辑。
        3. "AI写作太棒了!" – 不知道如何调整提示词。
        4. "我的观点很有深度" – 只是复述大模型的输出。
        5. "这是独家爆料" – 改编自热搜榜第一。
        6. "我是行业专家" – 上周才开始研究这个话题。
        7. "我的粉丝都是真实用户" – 90%是买来的僵尸粉。
        8. "绝对不会被算法封号" – 已经换了17个账号。
        
        \n\n关键词：${query}`
        }
    ], REFRESH_TOKEN);
    const text = result.choices[0].message.content;
    console.log(`生成文本：\n${text}`);
    // 调用JSON格式化
    result = await chat.createCompletion([
        { role: "user", content: `${text}\n\n请将以上内容处理为[["“我永不疲倦”", "但晚上10点准时关机"],["“你做饭真好吃”","每次都是外卖"],...]这样的二维JSON数组格式，不需要解释直接输出结果。` }
    ], REFRESH_TOKEN);
    const json = result.choices[0].message.content.replace(/\n?```(json)?\n?/g, '');
    console.log(`生成JSON：\n${json}`);
    const repaired = jsonrepair(json);
    console.log(`完整JSON：\n${repaired}`);
    return {
        text: text,
        data: JSON.parse(repaired)
    };
}

async function generateImage(query: string) {
    const result = await chat.generateImages('65940acff94777010aa6b796', `绘制一个“${query}”的手绘简笔画，图像采用纯白色背景，绘制线条采用黑色，线条粗犷有力的勾勒出轮廓和特征。`, REFRESH_TOKEN);
    const _result = await axios.get(result[0], {
        responseType: 'arraybuffer'
    });
    return _result.data;
}

async function generateMeme(query: string) {
    const template = (await fs.readFile('public/template.html')).toString();
    const imageBuffer = await generateImage(query);
    const { text, data } = await generateText(query);
    let html = template;
    html = html.replace('{{title}}', query);
    html = html.replace('{{image_url}}', `data:image/png;base64,${imageBuffer.toString('base64')}`);
    for (let i = 0; i < data.length; i++) {
        const [text, reply] = data[i];
        html = html.replace(`{{text${i}}}`, text.replace(/“|”|"|。/g, '')).replace(`{{reply${i}}}`, reply.replace(/“|”|"|。/g, ''));
    }
    if (browser && !browser.connected) {
        browser.close().catch(err => logger.error(err));
        browser = null;
    }
    if (!browser) {
        const { executablePath } = await installBrowser();
        browser = await puppeteer.launch({
            executablePath: executablePath,
            args: [
                // 禁用沙箱
                "--no-sandbox",
                // 禁用UID沙箱
                "--disable-setuid-sandbox",
                // Windows下--single-process支持存在问题
                util.isLinux() ? "--single-process" : "--process-per-tab",
                // 如果共享内存/dev/shm比较小，可能导致浏览器无法启动
                "--disable-dev-shm-usage",
                // 禁用扩展程序
                "--disable-extensions",
                // 隐藏滚动条
                "--hide-scrollbars",
                // 静音
                "--mute-audio",
                // 禁用GPU
                "--disable-gpu"
            ]
        });
    }
    let page: puppeteer.Page;
    return (async () => {
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 960, deviceScaleFactor: 2 });
        await page.setContent(html);
        const data = await page.screenshot();
        const url = await uploadFile(data);
        return url;
    })()
        .finally(() => page.close())
        .then(v => v)
        .catch(err => logger.error(err));
}

async function uploadFile(buffer: Buffer) {
    const formData = new FormData();
    formData.append("file", buffer, 'meme.png');
    const result = await axios.request({
        method: "POST",
        url: "https://chatglm.cn/chatglm/backend-api/assistant/file_upload",
        data: formData,
        // 100M限制
        maxBodyLength: 100 * 1024 * 1024,
        // 120秒超时
        timeout: 120000,
        headers: {
            ...FAKE_HEADERS,
            ...formData.getHeaders(),
        },
        validateStatus: () => true,
    });
    let { status, message, result: data } = result.data;
    if (status !== 0)
        throw new Error(`Upload file failed: ${message || 'JSON Error'}`);
    const { file_url } = data;
    return file_url;
}

export default {
    generateMeme
}