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

如需使用云开发，在 `miniprogram/app.js` 中配置 `globalData.env`。
