// FR5: 模拟身份生成与安全方案
export function generateKeyPair() {
  // 实际场景应使用 ed25519 等算法，Demo 采用随机字符串模拟密钥对
  const secretKey = crypto.randomUUID();
  const publicKey = btoa(secretKey).slice(0, 8);
  return { secretKey, publicKey };
}

// FR5: 完整性保护 - 签名
export function simpleSign(data, secret) {
  // 模拟 HMAC 或数字签名
  return btoa(data + "_" + secret).slice(0, 32);
}

// FR4: 撤回鉴权 - 验证签名
export function verifySignature(msg, secret) {
  const expected = simpleSign(msg.id + (msg.content || '') + (msg.targetId || ''), secret);
  return msg.signature === expected;
}