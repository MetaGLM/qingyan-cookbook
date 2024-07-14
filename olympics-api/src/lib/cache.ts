import fs from "fs-extra";
import util from "./util.ts";

class Cache {

    private cache: Map<string, any>;

    constructor() {
        this.cache = new Map();
        if(fs.existsSync("./cache.json"))
            this.cache = new Map(fs.readJSONSync("./cache.json"));
    }

    async set(key: string, value: any, expires: number = 3600) {
        this.cache.set(key, {
            value,
            expireTime: util.unixTimestamp() + expires * 1000
        });
        await fs.writeJSON("./cache.json", [...this.cache.entries()]);
    }

    async get(key: string) {
        const data = this.cache.get(key);
        if(!data)
            return null;
        if(data.expireTime < util.unixTimestamp()) {
            this.cache.delete(key);
            return null;
        }
        return data.value;
    }

    delete(key: string) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

}

export default Cache;