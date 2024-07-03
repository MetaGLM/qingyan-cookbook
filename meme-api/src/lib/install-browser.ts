import os from "os";
import path from "path";
import assert from "assert";
import fs from "fs-extra";
import _ from "lodash";
import { BrowserPlatform, Browser, install, resolveBuildId, computeExecutablePath } from "@puppeteer/browsers";

import cliProgress from "cli-progress";
import logger from "./logger.ts";

// 默认浏览器安装路径
const browserInstallPath = ".bin";
// 默认浏览器名称
// 目前只限于chrome，如使用chromium可能会缺失H264解码功能
const browserName = Browser.CHROME;
// 默认浏览器版本号，不能低于119.0.6018.0，否则无法使用VideoDecoder解码H264
// 请参考：https://github.com/GoogleChromeLabs/chrome-for-testing/issues/18
const browserVersion = "119.0.6029.0";
// 下载进度条
const downloadProgressBar = new cliProgress.SingleBar({ hideCursor: true }, cliProgress.Presets.shades_classic);

/**
 * 安装浏览器
 * 
 * @param installPath - 安装路径
 */
export default async function installBrowser(installPath = browserInstallPath) {
    assert(_.isString(installPath), "install path must be string");
    
    const version = browserVersion;

    const platform = os.platform();
    const arch = os.arch();
    let browserPlatform: BrowserPlatform;

    // 根据不同平台架构选择浏览器平台
    if (platform == "win32") {
        if (arch == "x64")
            browserPlatform = BrowserPlatform.WIN64;
        else
            browserPlatform = BrowserPlatform.WIN32;
    }
    else if (platform == "darwin") {
        if (arch == "arm64")
            browserPlatform = BrowserPlatform.MAC_ARM;
        else
            browserPlatform = BrowserPlatform.MAC;
    }
    else
        browserPlatform = BrowserPlatform.LINUX;

    // 获取buildId
    const buildId = await resolveBuildId(browserName, browserPlatform, version);
    installPath = path.resolve(installPath);
    const downloadOptions = {
        cacheDir: installPath,
        browser: browserName,
        platform: browserPlatform,
        buildId
    };

    // 补全可执行文件路径
    const executablePath = computeExecutablePath(downloadOptions);
    // 如果不存在可执行文件则进行下载安装
    if (!await fs.pathExists(executablePath)) {
        logger.info(`Installing chrome into ${installPath}`);
        let downloadStart = false;
        await install({
            ...downloadOptions,
            downloadProgressCallback: (downloadedBytes, totalBytes) => {
                if (!downloadStart) {
                    downloadProgressBar.start(Infinity, 0);
                    downloadStart = true;
                }
                downloadProgressBar.setTotal(totalBytes);
                downloadProgressBar.update(downloadedBytes);
            }
        });
        logger.info("\nInstallation completed");
    }

    return {
        executablePath
    };

}