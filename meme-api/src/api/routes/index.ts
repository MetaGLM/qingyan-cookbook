import fs from 'fs-extra';

import Response from '@/lib/response/Response.ts';
import meme from "./meme.ts";

export default [
    {
        get: {
            '/': async () => {
                const content = await fs.readFile('public/welcome.html');
                return new Response(content, {
                    type: 'html',
                    headers: {
                        Expires: '-1'
                    }
                });
            },
            '/template': async () => {
                const content = await fs.readFile('public/template.html');
                return new Response(content, {
                    type: 'html',
                    headers: {
                        Expires: '-1'
                    }
                });
            }
        }
    },
    meme
];