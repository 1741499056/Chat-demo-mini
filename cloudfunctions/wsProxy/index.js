// cloudfunctions/wsProxy/index.js
const cloud = require('wx-server-sdk');
const WebSocket = require('ws');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 存储活跃的连接
const connections = new Map();

exports.main = async (event, context) => {
  const { action, message } = event;

  if (action === 'createConnection') {
    const { question, conversation_id, user } = message;
    const channelId = generateChannelId();

    return new Promise((resolve, reject) => {
      const backendWS = new WebSocket('ws://121.40.171.211:8000/ws');

      backendWS.on('error', (error) => {
        reject(new Error('无法连接到AI服务'));
      });

      backendWS.on('open', () => {
        const payload = {
          query: question,
          user: user || "user-test",
          conversation_id: conversation_id || ""
        };
        backendWS.send(JSON.stringify(payload));
        connections.set(channelId, backendWS);
        resolve({ code: 200, data: { channelId } });
      });

      setTimeout(() => {
        reject(new Error('连接超时'));
      }, 5000);
    });
  }
};

function generateChannelId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}