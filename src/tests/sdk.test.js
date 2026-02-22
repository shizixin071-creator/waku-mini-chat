import { describe, it, expect, beforeEach } from 'vitest';
import { generateKeyPair, encryptGroupMessage, decryptGroupMessage } from '../sdk/crypto.js';

describe('Crypto 模块', () => {
  it('生成密钥对', () => {
    const keys = generateKeyPair();
    expect(keys.publicKey).toBeDefined();
    expect(keys.secretKey).toBeDefined();
    expect(keys.publicKey.length).toBeGreaterThan(20);
  });

  it('群聊加密解密', () => {
    const topic = '/test/group/1';
    const plaintext = 'Hello World!';
    
    const encrypted = encryptGroupMessage(plaintext, topic);
    const decrypted = decryptGroupMessage(encrypted, topic);
    
    expect(decrypted).toBe(plaintext);
  });

  it('不同 Topic 密钥不同', () => {
    const topic1 = '/group/a';
    const topic2 = '/group/b';
    
    const encrypted = encryptGroupMessage('secret', topic1);
    
    expect(() => {
      decryptGroupMessage(encrypted, topic2);
    }).toThrow();
  });
});

describe('消息格式', () => {
  it('消息结构正确', () => {
    const msg = {
      id: 'test-id',
      sender: 'User_A',
      content: 'Hello',
      timestamp: Date.now(),
      type: 'text'
    };
    
    expect(msg.id).toBeDefined();
    expect(msg.timestamp).toBeGreaterThan(0);
  });

  it('撤回消息结构', () => {
    const revoke = {
      id: 'revoke-1',
      type: 'revoke',
      targetId: 'msg-123',
      timestamp: Date.now()
    };
    
    expect(revoke.targetId).toBe('msg-123');
  });
});