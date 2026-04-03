// utils/agent/executor.js
import { AtomicActions } from './actions.js';

/**
 * 核心引擎：与 Agent 后端进行递归交互 (Ping-Pong 架构)
 * @param {Array} messages - 对话历史上下文
 * @param {Function} onProgress - 用于更新 UI 状态的回调
 */
// ... 前面引入省略
export async function runAgentLoop(messages, onProgress) {
  try {
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: 'http://localhost:3000/api/agent/chat', 
        method: 'POST',
        data: { messages: messages },
        success: resolve,
        fail: reject
      });
    });

    const aiResponse = res.data;

    if (aiResponse.type === 'tool_call') {
      // 🌟 修复：这里的变量名必须和后端 res.json 保持一致
      const { toolName, params, toolCallId } = aiResponse;
      let finalParams = params;
      if (params && params.input) {
        finalParams = typeof params.input === 'string' ? JSON.parse(params.input) : params.input;
      }
      
      console.log(`[前端执行器] 修正后的参数:`, finalParams);
      if (typeof onProgress === 'function') {
        const actionTextMap = {
          'SET_GRADE': '🔐 正在切换权限环境...',
          'QUERY_DATA': '🔍 正在全库搜寻...',
          'NAVIGATE': '🚀 正在为您规划路线...',
          'SHOW_MSG': '💬 正在生成提示...'
        };
        onProgress(actionTextMap[toolName] || `⚙️ 执行: ${toolName}...`);
      }

      console.log(`[前端执行器] 收到指令: ${toolName}`, params);

      // 执行动作...
      let actionResult = null;
      // 注意：确保 params 是对象，如果是字符串则 parse 掉
      const cleanParams = typeof params === 'string' ? JSON.parse(params) : params;

      switch (toolName) {
        case 'SET_GRADE':
          actionResult = await AtomicActions.updateGrade(cleanParams);
          //增加等待时间
          if (cleanParams.gradeId === 18) {
            console.log("[前端执行器] 提权操作，等待权限同步...");
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          break;
        case 'QUERY_DATA':
          actionResult = await AtomicActions.fetchData(cleanParams);
          break;
        case 'NAVIGATE':
          actionResult = await AtomicActions.navigateTo(cleanParams);
          break;
        case 'SHOW_MSG':
          actionResult = await AtomicActions.showToast(cleanParams);
          break;
        default:
          actionResult = { success: false, error: '未知的工具名称' };
      }

      // 🌟 修复：构造标准的 OpenAI 历史记录格式发送回后端
      // 1. Assistant 消息必须包含对应的 tool_calls
      messages.push({
        role: 'assistant',
        tool_calls: [{
          id: toolCallId,
          type: 'function',
          function: { 
            name: toolName, 
            arguments: JSON.stringify(cleanParams) 
          }
        }]
      });

      // 2. Tool 消息必须带有对应的 tool_call_id
      messages.push({
        role: 'tool',
        tool_call_id: toolCallId,
        name: toolName,
        content: JSON.stringify(actionResult)
      });

      await new Promise(r => setTimeout(r, 600));
      return await runAgentLoop(messages, onProgress); // 递归进入下一轮 Ping-Pong
    } 
    else if (aiResponse.type === 'message') {
      return { success: true, message: aiResponse.content };
    }
  } catch (error) {
    console.error('Agent 交互中断:', error);
    return { success: false, error: error };
  }
}