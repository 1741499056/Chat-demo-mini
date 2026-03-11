const cloud = require('wx-server-sdk');
const axios = require('axios');
const { PassThrough } = require('stream');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const DIFY_STREAM_URL = 'http://121.40.171.211:8888/stream'; // 注意端口号8888

exports.main = async (event, context) => {
  const { question, conversation_id = '' } = event;

  try {
    let chunks = [];
    let fullResponse = '';
    
    // 发送流式请求
    const response = await axios({
      method: 'post',
      url: DIFY_STREAM_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        query: question,
        conversation_id: conversation_id || ""
      },
      responseType: 'stream'
    });

    // 处理流式数据
    await new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        const text = chunk.toString('utf-8');
        chunks.push(text);
        fullResponse += text;
      });

      response.data.on('end', () => {
        resolve();
      });

      response.data.on('error', (err) => {
        reject(err);
      });
    });

    // 尝试从响应中提取conversation_id
    let newConversationId = conversation_id;
    const conversationIdMatch = fullResponse.match(/conversation_id:\s*([^\s]+)/);
    if (conversationIdMatch) {
      newConversationId = conversationIdMatch[1];
    }

    return {
      code: 200,
      data: {
        chunks: chunks,
        conversation_id: newConversationId,
        answer: fullResponse
      }
    };

  } catch (error) {
    console.error('云函数调用Dify API失败:', error);
    
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误响应数据:', error.response.data);
      
      let errorMsg = `服务错误 (${error.response.status}): `;
      errorMsg += error.response.data?.message || error.response.statusText || '未知错误';
      
      return {
        code: error.response.status,
        message: errorMsg
      };
    } else if (error.request) {
      console.error('无响应:', error.request);
      return {
        code: 503,
        message: '网络错误，无法连接到AI服务'
      };
    } else {
      console.error('错误信息:', error.message);
      return {
        code: 500,
        message: `请求配置错误: ${error.message}`
      };
    }
  }
};