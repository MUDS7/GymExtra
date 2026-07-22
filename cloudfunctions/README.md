# 云函数部署说明

业务云函数已按领域拆分，分别在以下目录中右键选择“上传并部署：云端安装依赖”：

- `authFunctions`：登录和注册
- `trainingFunctions`：训练记录
- `groupFunctions`：群组业务
- `actionFunctions`：动作库、图标和自定义动作
- `statsFunctions`：个人统计

`quickstartFunctions` 保留为旧示例页兼容入口，业务前端不再调用它。

部署 `groupFunctions` 前，请在云开发控制台创建群组相关集合和索引。在线请求不再创建集合或清理历史演示数据，以避免拖慢群组首页并防止读请求改写数据。
