const app = getApp();

// 网络状态管理模块
const networkStatus = {
  isOnline: true,
  init() {
    if (typeof wx !== 'undefined' && wx.getNetworkType) {
      wx.getNetworkType({
        success: (res) => {
          this.isOnline = res.networkType !== 'none';
        },
        fail: () => {
          this.isOnline = false;
        }
      });
      
      wx.onNetworkStatusChange((res) => {
        this.isOnline = res.isConnected;
      });
    }
  },
  
  getOnlineStatus() {
    return this.isOnline;
  }
};

networkStatus.init();

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
    showSkillInfo: false,
    exerciseCardHeight: 220,
    retryCount: 0,
    maxRetries: 3,
    isButtonLocked: false,
    lockTime: 0,
    animationClass: 'fade-in',
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
    setTimeout(() => {
      this.ensureConsistentStyles();
    }, 100);
  },

  ensureConsistentStyles() {
    // 目前不需要动态设置高度，因为已经使用固定高度
    // 可以在此方法中添加其他确保样式一致的逻辑
  },

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
    
    if (skillData && skillData.id && skillData.name) {
      this.setData({ 
        currentSkill: skillData,
        exerciseCount: 0,
        retryCount: 0
      }, () => this.generateExercise(skillData));
    } else {
      console.error('技巧信息不完整:', skillData);
      this.showError('技巧信息不完整，无法生成题目');
    }
  }, 300),

  showError(message) {
    this.setData({
      loadError: true,
      errorMsg: message,
      isLoading: false
    });
    wx.vibrateShort();
  },

  generateExercise(skillData) {
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

    app.authRequest({
      url: '/api/sentence-breaking/generate-questions', 
      method: 'POST',
      data: skillData
    })
    .then(res => {
      that.handleRequestSuccess(res);
    })
    .catch(err => {
      that.handleRequestError(err);
    });
  },

  handleRequestSuccess(res) {
    const that = this;
    
    if (res.statusCode === 200 && res.data?.code === 1) {
      that.processExerciseData(res.data);
    } else {
      console.warn('接口返回异常:', res);
      this.showError('服务器返回异常，请稍后重试');
      this.setData({ 
        isLoading: false
      });
    }
  },

  handleRequestError(err) {
    console.warn('请求失败:', err);
    this.showError('网络请求失败，请检查网络连接');
    this.setData({ 
      isLoading: false,
      retryCount: 0
    });
  },

  processExerciseData(resData) {
    console.log('处理练习数据:', resData);

    const exerciseQuestionsList = resData.data?.exerciseQuestionsList || [];

    const exerciseList = exerciseQuestionsList.map((item, index) => {
      const chars = this.splitTextToChars(item.content);
      const breakChars = new Array(chars.length).fill(false);

      return {
        ...item,
        showDetail: false,
        hasStarted: false,
        hasSubmitted: false,
        userBreaks: [],
        breakChars,
        breakAnimating: {},
        isCorrect: false,
        originalChars: chars,
        answer: item.answer,
        positions: item.positions || [],
        analysis: item.analysis || '',
        styleId: index,
        // 固定为 ai 类型
        questionType: 'ai' // 新增字段
      };
    });

    this.setData({
      exerciseList,
      isLoading: false,
      exerciseCount: exerciseQuestionsList.length
    });
    
    wx.setStorageSync('currentSkill', this.data.currentSkill);
  },

  splitTextToChars(text) {
    return text ? text.split('') : [];
  },

  startAnswer(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      [`exerciseList[${index}].hasStarted`]: true
    });
    this.scrollToElement(`.exercise-card:nth-child(${index + 1})`);
  },

  toggleBreak(e) {
    const { exerciseindex: exIdx, charindex: chIdx } = e.currentTarget.dataset;
    const exercise = this.data.exerciseList[exIdx];
    
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
      
      const newUserBreaks = [...exercise.userBreaks];
      if (newBreakChars[chIdx]) {
        if (!newUserBreaks.includes(chIdx)) {
          newUserBreaks.push(chIdx);
        }
      } else {
        const index = newUserBreaks.indexOf(chIdx);
        if (index > -1) {
          newUserBreaks.splice(index, 1);
        }
      }

      this.setData({
        [`exerciseList[${exIdx}].breakChars`]: newBreakChars,
        [`exerciseList[${exIdx}].breakAnimating[${chIdx}]`]: false,
        [`exerciseList[${exIdx}].userBreaks`]: newUserBreaks
      });
    }, 100);
  },

  submitAnswer(e) {
    const index = e.currentTarget.dataset.index;
    const exercise = this.data.exerciseList[index];
    const { originalChars, userBreaks, answer, questionType } = exercise;

    const userAnswerText = this.getTextFromBreaks(originalChars, userBreaks);
    const correctAnswerText = answer;

    console.log('===== 提交答案验证 =====');
    console.log('原始句子:', originalChars.join(''));
    console.log('用户断句点:', userBreaks);
    console.log('用户答案:', userAnswerText);
    console.log('正确答案:', correctAnswerText);
    
    // 验证用户答案文本长度
    if (userAnswerText.length !== correctAnswerText.length) {
      console.warn('答案长度不匹配:', {
        userLength: userAnswerText.length,
        correctLength: correctAnswerText.length
      });
    }
    
    // 验证标点符号位置 - 修复问号处理问题
    const userPunctuationPositions = this.findBreakPositions(userAnswerText);
    const correctPunctuationPositions = this.findBreakPositions(correctAnswerText);
    
    console.log('用户标点位置:', userPunctuationPositions);
    console.log('正确标点位置:', correctPunctuationPositions);
    
    const isCorrect = this.compareAnswers(userAnswerText, correctAnswerText);

    this.setData({
      [`exerciseList[${index}]`]: {
        ...exercise,
        hasSubmitted: true,
        userBreaks: [...userBreaks],
        isCorrect
      }
    });

    // 保存答题记录（使用固定的 ai 类型）
    this.saveAnswerRecord(exercise.id, questionType, userBreaks, isCorrect);

    this.scrollToElement(`.exercise-card:nth-child(${index + 1})`);

    if (!isCorrect) {
      setTimeout(() => {
        this.highlightIncorrectBreaks(index, correctAnswerText, userBreaks);
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

  // 改进比较算法，确保问号等标点符号正确比较
  compareAnswers(userAnswer, correctAnswer) {
    // 将用户答案和正确答案中的问号（？）替换为逗号（，）
    const replaceQuestionWithComma = str => str.replace(/？/g, '，');
    
    const userReplaced = replaceQuestionWithComma(userAnswer);
    const correctReplaced = replaceQuestionWithComma(correctAnswer);
    
    // 标准化处理：去除所有空格，确保标点符号正确保留
    const normalize = str => {
      // 去除所有空格
      let normalized = str.replace(/\s+/g, '');
      // 确保标点符号正确保留
      return normalized;
    };
    
    const userNormalized = normalize(userReplaced);
    const correctNormalized = normalize(correctReplaced);
    
    console.log('标准化用户答案（问号替换为逗号）:', userNormalized);
    console.log('标准化正确答案（问号替换为逗号）:', correctNormalized);
    
    // 字符级别的精确比较
    if (userNormalized.length !== correctNormalized.length) {
      return false;
    }
    
    // 逐个字符比较，确保问号等标点符号被正确识别
    for (let i = 0; i < userNormalized.length; i++) {
      if (userNormalized[i] !== correctNormalized[i]) {
        console.log(`字符不匹配位置 ${i}: 用户="${userNormalized[i]}", 正确="${correctNormalized[i]}"`);
        return false;
      }
    }
    
    return true;
  },

  getTextFromBreaks(chars, breaks) {
    let result = '';
    for (let i = 0; i < chars.length; i++) {
      result += chars[i];
      // 只在非句尾位置添加逗号或问号作为断句标记
      if (breaks.includes(i) && i !== chars.length - 1) {
        // 这里假设断句标记为逗号（，），如果需要根据用户选择动态添加，可以调整
        result += '，';
      }
    }
    return result;
  },

  highlightIncorrectBreaks(index, correctAnswer, userBreaks) {
    const correctBreaks = this.findBreakPositions(correctAnswer);
    const userAnswerText = this.getTextFromBreaks(this.data.exerciseList[index].originalChars, userBreaks);
    const userBreakPositions = this.findBreakPositions(userAnswerText);
    
    // 计算差异
    const missingBreaks = correctBreaks.filter(pos => !userBreakPositions.includes(pos));
    const extraBreaks = userBreakPositions.filter(pos => !correctBreaks.includes(pos));
    
    // 转换为字符索引
    const userCharBreaks = userBreaks;
    const correctCharBreaks = this.findBreakPositions(correctAnswer);
    
    this.setData({
      [`exerciseList[${index}].incorrectBreaks`]: {
        correct: correctCharBreaks,
        user: userCharBreaks,
        missing: missingBreaks,
        extra: extraBreaks
      }
    });

    console.log('===== 断句位置分析 =====');
    console.log('正确答案文本:', correctAnswer);
    console.log('用户答案文本:', userAnswerText);
    console.log('正确断句位置(字符索引):', correctCharBreaks);
    console.log('用户断句位置(字符索引):', userCharBreaks);
    console.log('缺失的断句点:', missingBreaks);
    console.log('多余的断句点:', extraBreaks);
    console.log('=======================');
  },

  // 改进标点符号识别，确保问号被正确识别
  findBreakPositions(answerText) {
    // 明确列出所有需要识别的中文标点符号，包括问号
    const punctuationMarks = ['，', '。', '？', '！', '；', '：', '、', '「', '」', '『', '』', '（', '）', '【', '】', '—', '…'];
    const positions = [];
    
    for (let i = 0; i < answerText.length; i++) {
      if (punctuationMarks.includes(answerText[i])) {
        positions.push(i);
      }
    }
    
    return positions;
  },

  toggleAllAnswers(e) {
    const index = e.currentTarget.dataset.index;
    const exercise = this.data.exerciseList[index];
    
    this.setData({
      [`exerciseList[${index}]`]: {
        ...exercise,
        hasStarted: false,
        hasSubmitted: false,
        userBreaks: [],
        breakChars: Array(exercise.originalChars.length).fill(false),
        breakAnimating: {},
        isCorrect: false
      }
    });
  },

  retryGenerate() {
    wx.vibrateShort();
    this.loadSkillAndGenerate({});
  },

  goBack() {
    wx.navigateBack();
  },

  showGenerateMoreModal() {
    wx.vibrateShort();
    wx.navigateTo({
      url: '/pages/sentencetest/sentencetest'
    });
  },

  hideGenerateMoreModal() {
    this.setData({ showGenerateModal: false });
  },

  confirmGenerateMore() {
    wx.vibrateShort();
    this.lockGenerateButton();
    
    const that = this;

    app.authRequest({
      url: '/api/sentence-breaking/generate-questions', 
      method: 'POST',
      data: that.data.currentSkill
    })
    .then(res => {
      console.log('生成更多题目接口响应:', res);
      
      if (res.statusCode === 200 && res.data?.code === 1) {
        const newExercises = res.data.data.exerciseQuestionsList.map((item, idx) => {
          const chars = that.splitTextToChars(item.content);
          const breakChars = new Array(chars.length).fill(false);
          
          return {
            ...item,
            showDetail: false,
            hasStarted: false,
            hasSubmitted: false,
            userBreaks: [],
            breakChars,
            breakAnimating: {},
            isCorrect: false,
            originalChars: chars,
            answer: item.answer,
            positions: item.positions || [],
            analysis: item.analysis || '',
            styleId: that.data.exerciseList.length + idx,
            // 固定为 ai 类型
            questionType: 'ai' // 新增字段
          };
        });

        that.setData({
          exerciseList: [...that.data.exerciseList, ...newExercises],
          animationClass: 'fade-in'
        });
        wx.showToast({ title: '已生成新题目', icon: 'success' });
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

  lockGenerateButton() {
    this.setData({ isButtonLocked: true, lockTime: 40 });
    const timer = setInterval(() => {
      const newTime = this.data.lockTime - 1;
      this.setData({ lockTime: newTime });
      if (newTime <= 0) clearInterval(timer);
    }, 1000);
  },

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
    const intervals = wx.getStorageSync('activeIntervals') || [];
    intervals.forEach(id => clearInterval(id));
    wx.removeStorageSync('activeIntervals');
  }
});