# Olympics API

## 简介

此API从olympics.com拉取数据，提供了奥运会的相关数据。

## API文档

请参考[API文档](https://apifox.com/apidoc/shared-5329d838-2b1a-4f8f-beb1-123075a15da9)。

## 部署

首先，您需要安装Node.js 18+。然后，您可以使用以下命令在项目根目录安装依赖和构建部署：

```bash
# 确认Node版本是否在18以上
node -v
# 全局安装PM2进程管理器
npm install pm2 -g --registry https://registry.npmmirror.com
# 安装依赖
npm install --registry https://registry.npmmirror.com
# 编译构建
npm run build
# 启动服务
pm2 start dist/index.js --name "olympics-api"
# 查看服务日志
pm2 logs olympics-api
```