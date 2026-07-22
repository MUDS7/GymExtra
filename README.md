# GymExtra 微信小程序

这是一个微信小程序基础工程结构，当前已根据 `E:\wechatcode\zip` 的移动端健身界面迁移为训练、群组、我的三栏体验，并保留本库原有的小程序视觉风格、全局样式、配置模块、请求封装和工具函数目录。

## 目录结构

```text
miniprogram/
  app.js                小程序入口
  app.json              全局页面、窗口和 tabBar 配置
  app.wxss              全局样式
  config/               应用配置
  services/             接口请求封装
  utils/                通用工具函数
  pages/
    train/              训练页：周训练进度、数据卡片、最近记录
    index/              群组页：我的群组、本周排行、发现群组入口
    profile/            我的页：用户信息、统计、成就、菜单设置
cloudfunctions/         云函数目录
```

## 开发

使用微信开发者工具打开项目根目录，确认 `project.config.json` 中的 `appid` 与小程序账号一致后即可预览。

如需使用云开发，请复制 `miniprogram/config/env.example.js` 为
`miniprogram/config/env.local.js`，并在本地配置 `cloudEnvId`。本地配置文件已
加入 `.gitignore`，不会提交到 Git。

## 微信登录

项目使用云函数上下文提供的 `openid` 作为本小程序内的唯一用户 ID。首次进入时，用户需要主动选择微信头像并确认昵称；注册后每次冷启动都会静默识别 `openid` 并自动登录。

使用前请在微信开发者工具中开通云开发，然后上传并部署 `quickstartFunctions` 云函数（选择“云端安装依赖”）。`users` 集合会在首次登录时自动创建。

动作数据存放在云数据库的 `actions` 集合。部署最新版 `quickstartFunctions`
云函数后，首次进入动作选择页会自动创建集合。用户进入某个动作分类时，云函数才将该分类的图片上传到云存储、写入对应文件 ID；小程序随后下载并保存到本地文件系统。
后续会复用缓存，因此动作图不再进入小程序主包，也不会在首次打开页面时全量上传或下载。

> 升级到本版后，请重新部署 `quickstartFunctions`。数据版本已更新，下一次请求动作表时会自动同步图片。

微信小程序不提供读取用户个人“微信号”的 API，因此不能把微信号本身作为 ID；`openid` 才是适用于此场景的官方稳定身份标识。

## 数据库索引

`cloudbaserc.json` 为 `trainings` 集合声明了 `userId ASC + completedAt DESC` 联合索引。它支持按用户查询，也支持将某个用户的训练记录按完成时间倒序排列。

使用 `npx @cloudbase/cli framework deploy` 部署索引；也可以在微信开发者工具的“云开发 → 数据库 → trainings → 索引管理”中创建相同索引。
