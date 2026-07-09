# 群组数据库索引

在云开发控制台创建以下联合索引。当前查询在没有联合索引时也能运行；数据量增长后，按下面的顺序建索引可避免全量扫描。

| 集合 | 索引字段（依次） | 用途 |
| --- | --- | --- |
| `group_members` | `userId` 升序、`status` 升序、`groupId` 升序 | 查询用户加入的群组 |
| `group_members` | `groupId` 升序、`status` 升序、`displayOrder` 升序 | 查询群组成员 |
| `group_applications` | `userId` 升序、`status` 升序、`groupId` 升序 | 查询用户已提交的群申请 |
| `group_applications` | `groupId` 升序、`status` 升序、`createdAt` 降序 | 查询相关群组的申请列表 |
| `group_goals` | `groupId` 升序、`status` 升序、`periodStart` 降序 | 查询当前群目标 |
| `group_daily_activities` | `groupId` 升序、`activityDateKey` 降序、`sharedToGroup` 升序、`displayOrder` 升序 | 查询今日训练墙 |
| `group_daily_activities` | `groupId` 升序、`activityDateKey` 降序、`sharedToGroup` 升序、`checkInStatus` 升序、`userId` 升序 | 统计今日打卡人数 |
| `group_daily_activities` | `groupId` 升序、`sharedToGroup` 升序、`checkInStatus` 升序、`activityDateKey` 降序、`userId` 升序 | 查询连续打卡榜、本周活跃和进步榜 |
| `group_daily_activities` | `groupId` 升序、`userId` 升序、`sharedToGroup` 升序、`checkInStatus` 升序、`activityDateKey` 降序 | 统计个人群挑战进度 |
| `group_challenges` | `groupId` 升序、`status` 升序、`startAt` 降序 | 查询进行中的挑战 |
| `challenge_progress` | `challengeId` 升序、`userId` 升序（唯一） | 查询个人挑战进度 |
| `training_templates` | `groupId` 升序、`status` 升序、`displayOrder` 升序 | 查询群训练模板 |
| `trainings` | `groupId` 升序、`sharedToGroup` 升序、`status` 升序、`completedAt` 降序 | 聚合本周群组累计训练时间 |

成员关系建议额外建立 `groupId + userId` 唯一索引。演示初始化数据使用确定性的文档 `_id`，重复调用不会重复插入。
