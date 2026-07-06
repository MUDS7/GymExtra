# 群组数据库索引

在云开发控制台创建以下联合索引。当前查询在没有联合索引时也能运行；数据量增长后，按下面的顺序建索引可避免全量扫描。

| 集合 | 索引字段（依次） | 用途 |
| --- | --- | --- |
| `group_members` | `userId` 升序、`status` 升序、`groupId` 升序 | 查询用户加入的群组 |
| `group_members` | `groupId` 升序、`status` 升序、`displayOrder` 升序 | 查询群组成员 |
| `group_goals` | `groupId` 升序、`status` 升序、`periodStart` 降序 | 查询当前群目标 |
| `group_daily_activities` | `groupId` 升序、`activityDateKey` 降序、`sharedToGroup` 升序、`displayOrder` 升序 | 查询今日训练墙 |
| `group_challenges` | `groupId` 升序、`status` 升序、`startAt` 降序 | 查询进行中的挑战 |
| `challenge_progress` | `challengeId` 升序、`userId` 升序（唯一） | 查询个人挑战进度 |
| `training_templates` | `groupId` 升序、`status` 升序、`displayOrder` 升序 | 查询群训练模板 |
| `group_stat_snapshots` | `groupId` 升序、`periodType` 升序、`periodStart` 降序 | 查询最新排行榜快照 |
| `trainings` | `groupId` 升序、`completedAt` 降序、`sharedToGroup` 升序 | 聚合群组训练记录 |

成员关系建议额外建立 `groupId + userId` 唯一索引。演示初始化数据使用确定性的文档 `_id`，重复调用不会重复插入。
