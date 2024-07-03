# 新手狼人杀 API服务

此仓库是用于[新手狼人杀（开发中）](https://chatglm.cn/main/gdetail/66767eb0261596f253d11c9f)智能体的API服务，通过外置共享上下文+智能体API调用的方式实现多智能体交互能力。

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
pm2 start dist/index.js --name "werewolf-api"
```