import _ from "lodash";

import Request from "@/lib/request/Request.ts";
import logger from "@/lib/logger.ts";
import meme from "@/api/controllers/meme.ts";

export default {
    prefix: "/meme-api",

    post: {

        "/generate_meme": async (request: Request) => {
            request
                .validate('body.query');
            const { query } = request.body;
            const imageUrl = await (async () => {
                const imageUrl = await meme.generateMeme(query);
                return imageUrl
            })()
                .then(v => v)
                .catch(err => {
                    logger.error(err);
                    throw new Error('生成MEME表情包失败，可能是生成超时或失败，请重新调用generateMeme工具！');
                });
            return `MEME图像已经生成，请以Markdown输出：\n![MEME](${imageUrl})`;
        }

    },
};
