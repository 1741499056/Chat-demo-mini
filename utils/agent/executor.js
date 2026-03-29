// utils/agent/executor.js

import { AtomicActions } from './actions.js';

export async function runPlanner(plan, onProgress) { // 🌟 新增 onProgress 回调参数
  const context = {
    originalGradeId: getApp().globalData.userGradeId || wx.getStorageSync('userInfo')?.gradeId,
    lastResult: null,
    timestamp: Date.now() 
  };

  console.log('--- Agent 规划开始执行 ---', plan);

  for (let i = 0; i < plan.length; i++) {
    const step = plan[i];
    const { action, params, outputKey, comment } = step;

    // --- 核心优化点：UI 实时反馈 ---
    // 通过回调函数将状态推给页面组件，彻底摆脱 wx.showLoading 的字数限制
    if (comment && typeof onProgress === 'function') {
      onProgress(comment);
    }

    const processedParams = parseParams(params, context);
    let result = null;

    try {
      switch (action) {
        case 'SET_GRADE':
          result = await AtomicActions.updateGrade(processedParams);
          break;
        case 'QUERY_DATA':
          result = await AtomicActions.fetchData(processedParams);
          break;
        case 'NAVIGATE':
          // 统一走自定义回调更新状态，跳转前给个反馈
          if (typeof onProgress === 'function') {
            onProgress('🚀 准备为您跳转页面...');
          }
          result = await AtomicActions.navigateTo(processedParams);
          break;
        case 'SHOW_MSG':
          result = await AtomicActions.showToast(processedParams);
          break;
        default:
          result = { success: false, error: 'UNKNOWN_ACTION' };
      }
    } catch (err) {
      result = { success: false, error: err };
    }

    if (result && result.success === false) {
      return { ...context, _error: result.error };
    }

    const stepData = result ? result.data : null;
    if (outputKey && stepData !== undefined) {
      context[outputKey] = stepData;
    }
    context.lastResult = stepData;

    // 每步之间留 300ms 间隙，防止 UI 闪烁太快用户看不清“思考过程”
    await new Promise(r => setTimeout(r, 1200));
  }

  return context;
}

/**
 * 安全的参数解析器：递归遍历对象，只替换字符串类型中的变量
 */
function parseParams(params, context) {
  if (!params) return params;

  // 处理字符串类型
  if (typeof params === 'string') {
    // 匹配完全等于 "{{xxx}}" 的情况，这样可以保持原类型（比如数字、对象）
    const exactMatch = params.match(/^\{\{([\w.]+)\}\}$/);
    if (exactMatch) {
      const key = exactMatch[1];
      const val = key.split('.').reduce((o, i) => o?.[i], context);
      return val !== undefined ? val : '';
    }

    // 匹配包含在字符串中间的 "{{xxx}}"（比如 "id={{poemId}}&type=1"）
    return params.replace(/\{\{([\w.]+)\}\}/g, (match, key) => {
      const val = key.split('.').reduce((o, i) => o?.[i], context);
      return val !== undefined && val !== null ? val : '';
    });
  }

  // 处理数组类型
  if (Array.isArray(params)) {
    return params.map(item => parseParams(item, context));
  }

  // 处理对象类型
  if (typeof params === 'object' && params !== null) {
    const result = {};
    for (const key in params) {
      result[key] = parseParams(params[key], context);
    }
    return result;
  }

  // 其他类型（数字、布尔等）直接返回
  return params;
}