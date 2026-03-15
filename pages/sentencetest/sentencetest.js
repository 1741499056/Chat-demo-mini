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

  ensureConsistentStyles() {},

  loadSkillAndGenerate: debounce(function(options) {
    console.log('页面加载参数:', options);
    
    let skillData = null;
    
    if (options.skill) {
      try {
        skillData = JSON.parse(decodeURIComponent(options.skill));
      } catch (e) {
        this.showError('技巧数据格式错误');
        return;
      }
    }
    
    if (!skillData) {
      skillData = wx.getStorageSync('currentSkill');
    }
    
    if (skillData && skillData.id && skillData.name) {
      this.setData({ 
        currentSkill: skillData,
        exerciseCount: 0,
        retryCount: 0
      }, () => this.generateExercise(skillData));
    } else {
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
    
    that.setData({
      isLoading: true,
      loadError: false,
      errorMsg: ''
    });

    app.authRequest({
      url: '/sentence-breaking/generate-questions', 
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
      this.showError('服务器返回异常，请稍后重试');
      this.setData({ isLoading: false });
    }
  },

  handleRequestError(err) {
    this.showError('网络请求失败，请检查网络连接');
    this.setData({ 
      isLoading: false,
      retryCount: 0
    });
  },

  processExerciseData(resData) {
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
        questionType: 'ai'
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
    this.setData({ [`exerciseList[${index}].hasStarted`]: true });
    this.scrollToElement(`.exercise-card:nth-child(${index + 1})`);
  },

  toggleBreak(e) {
    const { exerciseindex: exIdx, charindex: chIdx } = e.currentTarget.dataset;
    const exercise = this.data.exerciseList[exIdx];
    
    if (exIdx < 0 || exIdx >= this.data.exerciseList.length || chIdx < 0 || chIdx >= exercise.breakChars.length) return;

    const currentValue = exercise.breakChars[chIdx];
    this.setData({ [`exerciseList[${exIdx}].breakAnimating[${chIdx}]`]: true });

    setTimeout(() => {
      const newBreakChars = [...exercise.breakChars];
      newBreakChars[chIdx] = !currentValue;
      const newUserBreaks = [...exercise.userBreaks];
      
      if (newBreakChars[chIdx]) {
        if (!newUserBreaks.includes(chIdx)) newUserBreaks.push(chIdx);
      } else {
        const index = newUserBreaks.indexOf(chIdx);
        if (index > -1) newUserBreaks.splice(index, 1);
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
    const isCorrect = this.compareAnswers(userAnswerText, answer);

    this.setData({
      [`exerciseList[${index}]`]: {
        ...exercise,
        hasSubmitted: true,
        userBreaks: [...userBreaks],
        isCorrect
      }
    });

    this.saveAnswerRecord(exercise.id, questionType, userBreaks, isCorrect);
    this.scrollToElement(`.exercise-card:nth-child(${index + 1})`);

    if (!isCorrect) {
      setTimeout(() => this.highlightIncorrectBreaks(index, answer, userBreaks), 500);
    }
  },

  saveAnswerRecord(questionId, questionType, userAnswer, isCorrect) {
    app.authRequest({
      url: '/sentence-breaking/answer', 
      method: 'POST',
      data: {
        questionId: questionId,
        questionType: questionType,
        userAnswer: JSON.stringify(userAnswer),
        isCorrect: isCorrect ? 1 : 0
      }
    })
    .then(res => { console.log('记录保存响应:', res); })
    .catch(err => { console.error('记录保存失败:', err); });
  },

  compareAnswers(userAnswer, correctAnswer) {
    const normalize = str => str.replace(/？/g, '，').replace(/\s+/g, '');
    const userNormalized = normalize(userAnswer);
    const correctNormalized = normalize(correctAnswer);
    return userNormalized === correctNormalized;
  },

  getTextFromBreaks(chars, breaks) {
    let result = '';
    for (let i = 0; i < chars.length; i++) {
      result += chars[i];
      if (breaks.includes(i) && i !== chars.length - 1) result += '，';
    }
    return result;
  },

  highlightIncorrectBreaks(index, correctAnswer, userBreaks) {
    const correctBreaks = this.findBreakPositions(correctAnswer);
    const userAnswerText = this.getTextFromBreaks(this.data.exerciseList[index].originalChars, userBreaks);
    const userBreakPositions = this.findBreakPositions(userAnswerText);
    
    this.setData({
      [`exerciseList[${index}].incorrectBreaks`]: {
        correct: correctBreaks,
        user: userBreaks,
        missing: correctBreaks.filter(pos => !userBreakPositions.includes(pos)),
        extra: userBreakPositions.filter(pos => !correctBreaks.includes(pos))
      }
    });
  },

  findBreakPositions(answerText) {
    const punctuationMarks = ['，', '。', '？', '！', '；', '：', '、', '「', '」', '『', '』', '（', '）', '【', '】', '—', '…'];
    const positions = [];
    for (let i = 0; i < answerText.length; i++) {
      if (punctuationMarks.includes(answerText[i])) positions.push(i);
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

  goBack() { wx.navigateBack(); },

  showGenerateMoreModal() {
    wx.vibrateShort();
    wx.navigateTo({ url: '/pages/sentencetest/sentencetest' });
  },

  hideGenerateMoreModal() { this.setData({ showGenerateModal: false }); },

  confirmGenerateMore() {
    wx.vibrateShort();
    this.lockGenerateButton();
    const that = this;

    app.authRequest({
      url: '/sentence-breaking/generate-questions', 
      method: 'POST',
      data: that.data.currentSkill
    })
    .then(res => {
      if (res.statusCode === 200 && res.data?.code === 1) {
        const newExercises = res.data.data.exerciseQuestionsList.map((item, idx) => {
          const chars = that.splitTextToChars(item.content);
          return {
            ...item,
            hasStarted: false,
            hasSubmitted: false,
            userBreaks: [],
            breakChars: new Array(chars.length).fill(false),
            breakAnimating: {},
            isCorrect: false,
            originalChars: chars,
            answer: item.answer,
            styleId: that.data.exerciseList.length + idx,
            questionType: 'ai'
          };
        });
        that.setData({
          exerciseList: [...that.data.exerciseList, ...newExercises],
          animationClass: 'fade-in'
        });
        wx.showToast({ title: '已生成新题目', icon: 'success' });
      }
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