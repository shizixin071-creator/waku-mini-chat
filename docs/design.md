# Waku Chat SDK 设计协议文档

## 1. 协议选择与架构 (FR6)
- **节点模式**：本 SDK 采用 **Light Node (轻节点)** 模式。
- **选择理由**：考虑到 Web 环境资源受限，使用 `LightPush` 发送和 `Filter` 订阅，相比 `Relay` 模式能显著降低带宽消耗和 CPU 占用。同时集成 `Store` 协议以支持历史消息回溯 (FR3)。

## 2. Topic 规划 (Topic Design)
- **Pubsub Topic (路由层)**：默认使用 `/waku/2/default-waku/proto`，确保消息能在 P2P 网络中通过 Bootstrap 节点正常传播。
- **Content Topic (应用层)**：
  - **公共广场**：`/mini-chat/1/group-lobby/proto`
  - **私聊 (1:1)**：`/mini-chat/1/private-<ID_A>-<ID_B>/proto` (ID 按字母排序，确保双方生成一致的 Topic)。
  - **群聊 (N:N)**：`/mini-chat/1/group-<UUID>/proto`。

## 3. 消息格式定义 (Message Schema)
消息采用 **JSON** 封装，版本标识为 `v1.0`：
- `id`: 消息唯一标识符（UUID）。
- `type`: 消息类型 (`text` | `revoke`)。
- `sender`/`senderName`: 发送者 ID 与自定义昵称。
- `content`: 消息正文。
- `targetId`: 仅在 `type='revoke'` 时使用，指向被撤回的消息 ID。
- `signature`: 身份签名，用于 FR5 安全校验。

## 4. 撤回与删除机制 (FR4)
- **撤回 (Revoke)**：去中心化网络具有不可篡改性。我们通过发布 **Tombstone (墓碑消息)** 指令实现逻辑撤回。客户端接收到指令后，会校验签名，确认为原发送者操作后，在 UI 层隐藏原消息。
- **删除 (Delete)**：仅限本地操作。通过 Filter 过滤本地存储状态，不向网络广播，确保用户隐私。
- **现实边界**：由于 P2P 网络中存在 Store 节点缓存，撤回无法保证从所有物理节点抹除，仅能保证在兼容本协议的客户端中不可见。

## 5. 安全方案 (FR5)
- **完整性**：每条消息均附带基于用户 `secretKey` 生成的数字签名，防止第三方篡改内容。
- **机密性**：当前版本采用应用层加密模拟。后续可扩展 WAKU2-NOISE 协议实现传输层加密。