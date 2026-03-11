const app = getApp();

// 改进的防抖函数实现
function debounce(func, delay) {
  let timer = null;
  let lastCallTime = 0;
  
  return function(...args) {
    const now = Date.now();
    const remaining = delay - (now - lastCallTime);
    
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastCallTime = now;
      func.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastCallTime = Date.now();
        timer = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}

Page({
  data: {
    currentSkill: null,
    exerciseList: [],
    isLoading: false,
    loadError: false,
    errorMsg: '',
    showGenerateModal: false,
    isButtonLocked: false,
    lockTime: 40,
    animationClass: 'fade-in',
    exerciseCardHeight: 200, // 默认卡片高度
    exerciseCount: 0
  },

  onLoad(options) {
    this.setData({ 
      animationClass: 'fade-in',
      exerciseCount: 0
    });
    this.loadSkillAndGenerate(options);
  },

  onReady() {
    // 设置初始卡片高度避免页面晃动
    this.setExerciseCardHeight();
  },

  // 加载技能和生成题目（带防抖）
  loadSkillAndGenerate: debounce(function(options) {
    console.log('页面加载参数:', options);
    
    let skillData = null;
    
    if (options.skill) {
      try {
        skillData = JSON.parse(decodeURIComponent(options.skill));
        console.log('从参数解析的技巧数据:', skillData);
      } catch (e) {
        console.error('技巧数据解析失败:', e);
        this.showError('技巧数据格式错误');
        return;
      }
    }
    
    if (!skillData) {
      skillData = wx.getStorageSync('currentSkill');
      console.log('从缓存获取的技巧数据:', skillData);
    }
    
    if (skillData?.id && skillData.name) {
      this.setData({ 
        currentSkill: skillData,
        exerciseCount: 0 // 重置题目计数
      }, () => this.generateExercise());
    } else {
      console.error('技巧信息不完整:', skillData);
      this.showError('技巧信息不完整，无法生成题目');
    }
  }, 300),

  // 显示错误提示
  showError(message) {
    this.setData({
      loadError: true,
      errorMsg: message,
      isLoading: false
    });
    wx.vibrateShort(); // 保留错误提示震动
  },

  // 生成练习题目（真实接口调用）
  generateExercise() {
    const that = this;
    console.log('开始生成练习题目，当前技巧ID:', that.data.currentSkill?.id);
    
    if (!that.data.currentSkill?.id) {
      that.showError('技巧信息缺失，无法请求题目');
      return;
    }
    
    that.setData({
      isLoading: true,
      loadError: false,
      errorMsg: ''
    });

    // 设置超时计时器（10秒）
    const timeoutTimer = setTimeout(() => {
      console.error('请求超时（10秒）');
      that.showError('请求超时，请检查网络连接');
      that.setData({ isLoading: false });
    }, 10000);

    // 真实接口调用
    app.authRequest({
      url: '/api/sentence-breaking/skills-questions', 
      method: 'GET',
      data: {
        id: that.data.currentSkill.id 
      }
    })
    .then(res => {
      console.log('题目接口响应:', res);
      clearTimeout(timeoutTimer);
      
      if (res.statusCode === 200 && res.data?.code === 1) {
        // 成功响应：处理题目数据
        that.processExerciseData(res.data.data);
      } else {
        // 接口返回异常：使用本地模拟数据兜底（可选）
        console.warn('接口返回异常，使用本地模拟数据', res);
        that.processExerciseData(that.getMockExerciseData()); 
      }
    })
    .catch(err => {
      console.error('题目接口请求失败:', err);
      clearTimeout(timeoutTimer);
      // 请求失败：使用本地模拟数据兜底（可选）
      console.warn('请求失败，使用本地模拟数据');
      that.processExerciseData(that.getMockExerciseData()); 
    });
  },

  // 处理练习数据（优化初始化逻辑）
  processExerciseData(exerciseData) {
    console.log('处理练习数据:', exerciseData);
    
    const exerciseList = (exerciseData.exerciseQuestionsList || []).map((item, index) => {
      const chars = this.splitTextToChars(item.content);
      // 初始化断句状态数组（长度与字符数一致）
      const breakChars = new Array(chars.length).fill(false);
      
      return {
        ...item,
        showDetail: false, // 保留此属性，但不再使用
        hasStarted: false,
        hasSubmitted: false,
        userBreaks: [],
        breakChars, // 与字符一一对应
        breakAnimating: {},
        isCorrect: false,
        originalChars: chars, // 存储原始字符数组
        answer: item.answer, // 存储正确答案文本，用于比较
        // 固定为 manual 类型
        questionType: 'manual' // 新增字段
      };
    });

    this.setData({
      exerciseList,
      isLoading: false,
      exerciseCount: this.data.exerciseCount + (exerciseData.exerciseQuestionsList?.length || 0)
    });
    
    wx.setStorageSync('currentSkill', this.data.currentSkill);
    
    // 如果是第一次加载，计算卡片高度
    if (this.data.exerciseCount === (exerciseData.exerciseQuestionsList?.length || 0)) {
      this.setExerciseCardHeight();
    }
  },

  // 设置练习卡片高度避免页面晃动
  setExerciseCardHeight() {
    const query = wx.createSelectorQuery();
    query.select('.exercise-card').boundingClientRect(rect => {
      if (rect && rect.height) {
        this.setData({
          exerciseCardHeight: rect.height
        });
      } else {
        // 如果获取不到，设置一个默认高度
        this.setData({
          exerciseCardHeight: 200
        });
      }
    }).exec();
  },

  // 文本拆分（优化特殊字符处理）
  splitTextToChars(text) {
    if (!text) return [];
    // 处理全角空格、换行符等特殊字符
    return text.replace(/\s+/g, ' ').split('').filter(c => c !== '');
  },

  // 开始答题
  startAnswer(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      [`exerciseList[${index}].hasStarted`]: true
    });
    
    this.scrollToElement(`.exercise-card:nth-child(${index + 1}) .answer-section`);
  },

  // 切换断句状态（优化索引校验）
  toggleBreak(e) {
    const { exerciseindex: exIdx, charindex: chIdx } = e.currentTarget.dataset;
    const exercise = this.data.exerciseList[exIdx];
    
    // 校验索引有效性
    if (exIdx < 0 || exIdx >= this.data.exerciseList.length || 
        chIdx < 0 || chIdx >= exercise.breakChars.length) {
      console.error('无效的断句索引:', exIdx, chIdx);
      return;
    }

    const currentValue = exercise.breakChars[chIdx];
    
    this.setData({
      [`exerciseList[${exIdx}].breakAnimating[${chIdx}]`]: true
    });

    setTimeout(() => {
      const newBreakChars = [...exercise.breakChars];
      newBreakChars[chIdx] = !currentValue;
      
      this.setData({
        [`exerciseList[${exIdx}].breakChars`]: newBreakChars,
        [`exerciseList[${exIdx}].breakAnimating[${chIdx}]`]: false
      });
    }, 100);
  },

  // 提交答案（优化断句位置计算）
  submitAnswer(e) {
    const index = e.currentTarget.dataset.index;
    const exercise = this.data.exerciseList[index];
    const { originalChars, breakChars, answer, questionType } = exercise;

    // 计算用户选择的断句位置（字符间的间隙索引）
    const userBreaks = [];
    for (let i = 0; i < breakChars.length - 1; i++) {
      if (breakChars[i]) {
        userBreaks.push(i); // 记录字符间的间隙位置（如第2个字符后断开）
      }
    }

    // 根据answer字段计算正确断句位置
    const correctBreaks = this.calculateBreaksFromAnswer(originalChars, answer);

    // 标准化断句位置（排序并去重）
    const normalizeBreaks = (breaks) => {
      return [...new Set(breaks)].sort((a, b) => a - b);
    };

    const normalizedUserBreaks = normalizeBreaks(userBreaks);
    const normalizedCorrectBreaks = normalizeBreaks(correctBreaks);

    // 详细比较断句位置
    const isCorrect = (
      normalizedUserBreaks.length === normalizedCorrectBreaks.length &&
      normalizedUserBreaks.every((val, idx) => val === normalizedCorrectBreaks[idx])
    );

    // 调试用日志
    console.log('用户断句位置:', normalizedUserBreaks);
    console.log('正确断句位置(来自answer):', normalizedCorrectBreaks);
    console.log('断句位置比较结果:', isCorrect);
    
    // 输出用户答案和正确答案的文本形式，便于对比
    const userAnswerText = this.getTextFromBreaks(originalChars, normalizedUserBreaks);
    const correctAnswerText = this.getTextFromBreaks(originalChars, normalizedCorrectBreaks);
    console.log('用户答案:', userAnswerText);
    console.log('正确答案:', correctAnswerText);

    // 移除 wx.vibrateShort 调用以解决页面晃动问题
    // wx.vibrateShort({ type: isCorrect ? 'success' : 'long' });

    this.setData({
      [`exerciseList[${index}]`]: {
        ...exercise,
        hasSubmitted: true,
        userBreaks: normalizedUserBreaks,
        isCorrect
      }
    });

    // 保存答题记录（使用固定的 manual 类型）
    this.saveAnswerRecord(exercise.id, questionType, normalizedUserBreaks, isCorrect);

    this.scrollToElement(`.exercise-card:nth-child(${index + 1}) .answer-container`);
    
    // 如果回答错误，自动滚动到错误位置
    if (!isCorrect) {
      setTimeout(() => {
        this.highlightIncorrectBreaks(index, normalizedCorrectBreaks, normalizedUserBreaks);
      }, 500);
    }
  },

  // 保存用户答题记录
  saveAnswerRecord(questionId, questionType, userAnswer, isCorrect) {
    const that = this;
    console.log('保存答题记录:', { questionId, questionType, userAnswer, isCorrect });
    
    // 构造请求数据
    const data = {
      questionId: questionId,
      questionType: questionType,
      userAnswer: JSON.stringify(userAnswer), // 将数组转为字符串
      isCorrect: isCorrect ? 1 : 0 // 转换为整数：1为正确，0为错误
    };
    
    console.log('发送到接口的数据:', data);
    
    // 调用保存接口 - 使用新的接口地址
    app.authRequest({
      url: '/api/sentence-breaking/answer', 
      method: 'POST',
      data: data
    })
    .then(res => {
      console.log('答题记录保存接口响应:', res);
      if (res.statusCode === 200 && res.data?.code === 1) {
        console.log('答题记录保存成功');
      } else {
        console.error('答题记录保存失败:', res);
      }
    })
    .catch(err => {
      console.error('答题记录保存请求失败:', err);
    });
  },

  // 新增方法：高亮显示不正确的断句位置
  highlightIncorrectBreaks(index, correctBreaks, userBreaks) {
    const that = this;
    const exercise = that.data.exerciseList[index];
    
    // 找出错误的断句位置
    const incorrectBreaks = [];
    
    // 检查用户添加了哪些不应该有的断句
    userBreaks.forEach(pos => {
      if (!correctBreaks.includes(pos)) {
        incorrectBreaks.push(pos);
      }
    });
    
    // 检查用户漏掉了哪些应该有的断句
    correctBreaks.forEach(pos => {
      if (!userBreaks.includes(pos)) {
        incorrectBreaks.push(pos);
      }
    });
    
    // 如果没有错误断句，直接返回
    if (incorrectBreaks.length === 0) return;
    
    // 更新UI显示错误提示
    that.setData({
      [`exerciseList[${index}].breakChars`]: exercise.breakChars.map((_, i) => 
        incorrectBreaks.includes(i) ? true : exercise.breakChars[i]
      )
    });
    
    // 添加动画类
    that.setData({
      [`exerciseList[${index}].breakAnimating`]: exercise.breakChars.map((_, i) => 
        incorrectBreaks.includes(i) ? true : exercise.breakAnimating[i] || false
      )
    });
    
    // 3秒后清除高亮
    setTimeout(() => {
      that.setData({
        [`exerciseList[${index}].breakAnimating`]: exercise.breakChars.map(() => false)
      });
    }, 3000);
  },

  // 根据answer字段计算断句位置（修正版 - 断句位置向前移动一位）
  calculateBreaksFromAnswer(originalChars, answer) {
    // 去除answer中的斜杠和空格，得到最终的断句文本
    const cleanAnswer = answer.replace(/[\/\s]/g, '');
    
    // 去除originalChars中的空格，得到原始文本
    const originalText = originalChars.join('').replace(/\s+/g, '');
    
    // 确保answer中的文本与originalChars中的文本匹配
    if (cleanAnswer !== originalText) {
      console.warn('答案文本与原始文本不匹配，可能影响断句位置计算');
      // 如果不匹配，尝试直接分割answer来计算断句位置
      return this.calculateBreaksFromAnswerText(answer, originalChars);
    }
    
    // 分割answer字段，基于'/'来计算断句位置
    const answerParts = answer.split('/');
    let charCount = 0;
    const breakPositions = [];
    
    for (let i = 0; i < answerParts.length - 1; i++) {
      const part = answerParts[i];
      // 修正：断句位置向前移动一位（减去1）
      charCount += part.length;
      if (charCount > 0) {  // 确保不会出现负数索引
        breakPositions.push(charCount - 1);  // 关键修改：将断句位置向前移动一位
      } else {
        breakPositions.push(0);
      }
    }
    
    return breakPositions;
  },

  // 备用方法：直接基于answer文本计算断句位置
  calculateBreaksFromAnswerText(answer, originalChars) {
    // 去除answer中的空格，得到纯文本
    const cleanAnswer = answer.replace(/\s+/g, '');
    // 去除originalChars中的空格，得到原始文本
    const originalText = originalChars.join('').replace(/\s+/g, '');
    
    if (cleanAnswer !== originalText) {
      console.warn('答案文本与原始文本不匹配，无法准确计算断句位置');
      // 如果文本不匹配，采用简单的字符计数方法作为备用
      return this.fallbackBreakCalculation(originalChars, answer);
    }
    
    // 分割answer字段，基于'/'来计算断句位置（修正：断句位置向前移动一位）
    const answerParts = answer.split('/');
    let charCount = 0;
    const breakPositions = [];
    
    for (let i = 0; i < answerParts.length - 1; i++) {
      const part = answerParts[i];
      // 修正：断句位置向前移动一位（减去1）
      charCount += part.length;
      if (charCount > 0) {  // 确保不会出现负数索引
        breakPositions.push(charCount - 1);  // 关键修改：将断句位置向前移动一位
      } else {
        breakPositions.push(0);
      }
    }
    
    return breakPositions;
  },

  // 备用方法：当无法准确匹配时使用的简单计算方法
  fallbackBreakCalculation(originalChars, answer) {
    // 基于字符数大致估算断句位置
    // 去除answer中的斜杠和空格
    const cleanAnswer = answer.replace(/[\/\s]/g, '');
    const originalText = originalChars.join('').replace(/\s+/g, '');
    
    if (cleanAnswer !== originalText) {
      console.warn('原始文本与答案文本不匹配，无法准确计算断句位置');
      // 无法准确计算，返回空数组
      return [];
    }
    
    // 如果文本匹配，但无法基于'/'计算，返回空数组，表示不进行断句判断
    // 或者返回一个默认的断句位置（不推荐）
    return [];
  },

  // 新增方法：根据断句位置重建文本（用于调试）
  getTextFromBreaks(chars, breaks) {
    let result = '';
    let charIndex = 0;
    
    for (let i = 0; i < chars.length; i++) {
      result += chars[i];
      // 检查是否是断句位置
      if (breaks.includes(i)) {
        result += '/';
      }
    }
    
    return result;
  },

  // 修改部分：点击"收起全部"会直接隐藏答案和解析，恢复到初始状态
  toggleAllAnswers(e) {
    const index = e.currentTarget.dataset.index;
    const exercise = this.data.exerciseList[index];
    
    // 直接隐藏答案和解析，重置相关数据，恢复到初始状态
    this.setData({
      [`exerciseList[${index}]`]: {
        ...exercise,
        hasStarted: false, // 重置为未开始状态
        hasSubmitted: false, // 隐藏答案和解析
        userBreaks: [], // 清空用户断句
        breakChars: Array(exercise.originalChars.length).fill(false), // 重置断句状态
        breakAnimating: {}, // 清空动画状态
        isCorrect: false // 重置正确性
        // 移除 showDetail 相关的数据重置，因为不再使用
      }
    });
  },

  // 重试生成
  retryGenerate() {
    // 移除 wx.vibrateShort 调用以解决页面晃动问题
    // wx.vibrateShort(); // 保留生成更多题目时的震动（根据需求选择是否保留）
    
    this.loadSkillAndGenerate({});
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 显示生成更多模态框
  showGenerateMoreModal() {
    // 移除 wx.vibrateShort 调用以解决页面晃动问题
    // wx.vibrateShort(); // 保留导航到生成更多题目页面时的震动（根据需求选择是否保留）
    
    wx.navigateTo({
      url: '/pages/sentencetest/sentencetest', // 跳转到新界面
    });
  },

  // 隐藏生成更多模态框
  hideGenerateMoreModal() {
    this.setData({ showGenerateModal: false });
  },

  // 确认生成更多题目（真实接口调用）
  confirmGenerateMore() {
    // 移除 wx.vibrateShort 调用以解决页面晃动问题
    // wx.vibrateShort(); // 保留确认生成更多题目时的震动（根据需求选择是否保留）
    
    this.hideGenerateMoreModal();
    this.lockGenerateButton();
    
    const that = this;

    // 真实接口调用（生成更多题目）
    app.authRequest({
      url: '/api/sentence-breaking/generate-questions', 
      method: 'POST',
      data: {
        skill_id: that.data.currentSkill.id 
      }
    })
    .then(res => {
      console.log('生成更多题目接口响应:', res);
      
      if (res.statusCode === 200 && res.data?.code === 1) {
        // 成功响应：合并新题目
        const newExercises = res.data.data.exerciseQuestionsList.map(item => {
          const chars = that.splitTextToChars(item.content);
          // 初始化断句状态数组（长度与字符数一致）
          const breakChars = new Array(chars.length).fill(false);
          
          return {
            ...item,
            showDetail: false, // 保留此属性，但不再使用
            hasStarted: false,
            hasSubmitted: false,
            userBreaks: [],
            breakChars,
            breakAnimating: {},
            isCorrect: false,
            originalChars: chars, // 存储原始字符数组
            answer: item.answer, // 存储正确答案文本，用于比较
            // 固定为 manual 类型
            questionType: 'manual' // 新增字段
          };
        });

        that.setData({
          exerciseList: [...that.data.exerciseList, ...newExercises],
          animationClass: 'fade-in'
        });
        wx.showToast({ title: '已生成新题目', icon: 'success' });
        
        // 更新卡片高度
        setTimeout(() => this.setExerciseCardHeight(), 300);
      } else {
        wx.showToast({ 
          title: '生成失败：' + (res.data?.msg || '未知错误'), 
          icon: 'none' 
        });
      }
    })
    .catch(err => {
      console.error('生成更多题目接口请求失败:', err);
      wx.showToast({ title: '网络错误，请重试', icon: 'none' });
    });
  },

  // 锁定生成按钮
  lockGenerateButton() {
    this.setData({ isButtonLocked: true, lockTime: 40 });
    const timer = setInterval(() => {
      const newTime = this.data.lockTime - 1;
      this.setData({ lockTime: newTime });
      if (newTime <= 0) clearInterval(timer);
    }, 1000);
  },

  // 滚动到指定元素
  scrollToElement(selector) {
    wx.createSelectorQuery()
      .select(selector)
      .boundingClientRect(rect => {
        if (rect) {
          wx.pageScrollTo({
            scrollTop: rect.top + wx.pageScrollGetScrollTop() - 100,
            duration: 300
          });
        }
      })
      .exec();
  },

  onUnload() {
    // 清理定时器
    const intervals = wx.getStorageSync('activeIntervals') || [];
    intervals.forEach(id => clearInterval(id));
    wx.removeStorageSync('activeIntervals');
  },
  
  // 新增方法：跳转到答题记录页面
  goToBreakingHistory() {
    wx.navigateTo({
      url: '/pages/breakingHistory/breakingHistory'
    });
  },

  // 临时兜底模拟数据（仅用于接口不可用时调试）
  getMockExerciseData() {
    return {
      code: 1,
      data: {
        exerciseQuestionsList: [
          {
            id: 4,
            content: "见渔人乃大惊问所从来具答之",
            answer: "见渔人/乃大惊/问所从来/具答之",
            analysis: "本题使用【对话标志法】。对话词'问'后为询问内容，需在前断开；'答'后为回应内容需断开。难度：初级",
            difficulty: "初级",
            source_text: "《桃花源记》"
          },
          {
            id: 5,
            content: "徐公来孰视之自以为不如窥镜而自视",
            answer: "徐公来/孰视之/自以为不如/窥镜而自视",
            analysis: "本题使用【对话标志法】。动作序列中隐含对话逻辑，'孰视之''自以为'等动作需独立断开。",
            difficulty: "初级",
            source_text: "《邹忌讽齐王纳谏》"
          }
        ]
      }
    };
  }
});