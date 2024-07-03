# 高考志愿填报助手 API服务

此仓库是用于[2024高考志愿填报助手](https://chatglm.cn/main/gdetail/66657769efbf798a741c9ee8)智能体的API服务，通过模拟请求[掌上高考](https://gaokao.cn/)网页接口获取实时数据。

## 安装

请先安装Node.js 20+。

```shell
# 全局安装Yarn
npm i -g yarn --registry https://registry.npmmirror.com/
# 安装依赖
yarn install
# 构建dist
npm run build
```

# 启动

```shell
# 启动服务
npm run start
```

# 后台运行

请先安装PM2。

```shell
yarn global add pm2
```

使用PM2启动服务并守护进程

```shell
pm2 start dist/index.js --name "gaokao-api"
```