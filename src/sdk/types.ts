// 用户身份
export interface Identity {
  publicKey: string;
  secretKey: string;
}

// 消息类型
export type MessageType = 'text' | 'revoke' | 'system';

// 基础消息
export interface BaseMessage {
  id: string;
  sender: string;
  timestamp: number;
  type: MessageType;
}

// 文本消息
export interface TextMessage extends BaseMessage {
  type: 'text';
  content: string;
  encryptedContent?: string;
}

// 撤回消息
export interface RevokeMessage extends BaseMessage {
  type: 'revoke';
  targetId: string;
  reason?: string;
}

export type Message = TextMessage | RevokeMessage;

// 会话
export type ConversationType = 'single' | 'group';

export interface Conversation {
  id: string;
  type: ConversationType;
  participants: string[];
  createdAt: number;
}

// SDK 状态
export type ConnectionStatus = 'initializing' | 'connected' | 'local-only' | 'error';

export interface SDKStatus {
  status: ConnectionStatus;
  peers: number;
  identity?: string;
}

// 处理器
export type MessageHandler = (message: Message, metadata: { source: string; verified: boolean }) => void;

// SDK 选项
export interface SDKOptions {
  secretKey?: string;
  useRelay?: boolean;
}