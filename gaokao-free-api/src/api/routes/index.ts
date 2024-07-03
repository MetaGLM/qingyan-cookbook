import fs from 'fs-extra';

import Response from '@/lib/response/Response.ts';
import univSelection from "./univ-selection.ts";

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
            }
        }
    },
    univSelection
];