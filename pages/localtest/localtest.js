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
    exerciseCardHeight: 200,
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
    this.setExerciseCardHeight();
  },

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
    
    if (skillData?.id && skillData.name) {
      this.setData({ 
        currentSkill: skillData,
        exerciseCount: 0 
      }, () => this.generateExercise());
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

  generateExercise() {
    const that = this;
    if (!that.data.currentSkill?.id) {
      that.showError('技巧信息缺失，无法请求题目');
      return;
    }
    
    that.setData({
      isLoading: true,
      loadError: false,
      errorMsg: ''
    });

    const timeoutTimer = setTimeout(() => {
      that.showError('请求超时，请检查网络连接');
      that.setData({ isLoading: false });
    }, 10000);

    app.authRequest({
      url: '/sentence-breaking/skills-questions', 
      method: 'GET',
      data: {
        id: that.data.currentSkill.id 
      }
    })
    .then(res => {
      clearTimeout(timeoutTimer);
      if (res.statusCode === 200 && res.data?.code === 1) {
        that.processExerciseData(res.data.data);
      } else {
        that.processExerciseData(that.getMockExerciseData().data); 
      }
    })
    .catch(err => {
      clearTimeout(timeoutTimer);
      that.processExerciseData(that.getMockExerciseData().data); 
    });
  },

  processExerciseData(exerciseData) {
    const exerciseList = (exerciseData.exerciseQuestionsList || []).map((item, index) => {
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
        questionType: 'manual'
      };
    });

    this.setData({
      exerciseList,
      isLoading: false,
      exerciseCount: this.data.exerciseCount + (exerciseData.exerciseQuestionsList?.length || 0)
    });
    
    wx.setStorageSync('currentSkill', this.data.currentSkill);
    
    if (this.data.exerciseCount === (exerciseData.exerciseQuestionsList?.length || 0)) {
      this.setExerciseCardHeight();
    }
  },

  setExerciseCardHeight() {
    const query = wx.createSelectorQuery();
    query.select('.exercise-card').boundingClientRect(rect => {
      this.setData({
        exerciseCardHeight: (rect && rect.height) ? rect.height : 200
      });
    }).exec();
  },

  splitTextToChars(text) {
    if (!text) return [];
    return text.replace(/\s+/g, ' ').split('').filter(c => c !== '');
  },

  startAnswer(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      [`exerciseList[${index}].hasStarted`]: true
    });
    this.scrollToElement(`.exercise-card:nth-child(${index + 1}) .answer-section`);
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
      this.setData({
        [`exerciseList[${exIdx}].breakChars`]: newBreakChars,
        [`exerciseList[${exIdx}].breakAnimating[${chIdx}]`]: false
      });
    }, 100);
  },

  submitAnswer(e) {
    const index = e.currentTarget.dataset.index;
    const exercise = this.data.exerciseList[index];
    const { originalChars, breakChars, answer, questionType } = exercise;

    const userBreaks = [];
    for (let i = 0; i < breakChars.length - 1; i++) {
      if (breakChars[i]) userBreaks.push(i);
    }

    const correctBreaks = this.calculateBreaksFromAnswer(originalChars, answer);
    const normalizeBreaks = (breaks) => [...new Set(breaks)].sort((a, b) => a - b);
    const normalizedUserBreaks = normalizeBreaks(userBreaks);
    const normalizedCorrectBreaks = normalizeBreaks(correctBreaks);

    const isCorrect = (
      normalizedUserBreaks.length === normalizedCorrectBreaks.length &&
      normalizedUserBreaks.every((val, idx) => val === normalizedCorrectBreaks[idx])
    );

    this.setData({
      [`exerciseList[${index}]`]: {
        ...exercise,
        hasSubmitted: true,
        userBreaks: normalizedUserBreaks,
        isCorrect
      }
    });

    this.saveAnswerRecord(exercise.id, questionType, normalizedUserBreaks, isCorrect);
    this.scrollToElement(`.exercise-card:nth-child(${index + 1}) .answer-container`);
    
    if (!isCorrect) {
      setTimeout(() => this.highlightIncorrectBreaks(index, normalizedCorrectBreaks, normalizedUserBreaks), 500);
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
    .then(res => { console.log('答题记录保存成功'); })
    .catch(err => { console.error('答题记录保存请求失败:', err); });
  },

  highlightIncorrectBreaks(index, correctBreaks, userBreaks) {
    const that = this;
    const exercise = that.data.exerciseList[index];
    const incorrectBreaks = [];
    
    userBreaks.forEach(pos => { if (!correctBreaks.includes(pos)) incorrectBreaks.push(pos); });
    correctBreaks.forEach(pos => { if (!userBreaks.includes(pos)) incorrectBreaks.push(pos); });
    
    if (incorrectBreaks.length === 0) return;
    
    that.setData({
      [`exerciseList[${index}].breakChars`]: exercise.breakChars.map((_, i) => incorrectBreaks.includes(i) ? true : exercise.breakChars[i]),
      [`exerciseList[${index}].breakAnimating`]: exercise.breakChars.map((_, i) => incorrectBreaks.includes(i) ? true : exercise.breakAnimating[i] || false)
    });
    
    setTimeout(() => {
      that.setData({ [`exerciseList[${index}].breakAnimating`]: exercise.breakChars.map(() => false) });
    }, 3000);
  },

  calculateBreaksFromAnswer(originalChars, answer) {
    const cleanAnswer = answer.replace(/[\/\s]/g, '');
    const originalText = originalChars.join('').replace(/\s+/g, '');
    
    if (cleanAnswer !== originalText) {
      return this.calculateBreaksFromAnswerText(answer, originalChars);
    }
    
    const answerParts = answer.split('/');
    let charCount = 0;
    const breakPositions = [];
    
    for (let i = 0; i < answerParts.length - 1; i++) {
      charCount += answerParts[i].length;
      breakPositions.push(charCount > 0 ? charCount - 1 : 0);
    }
    return breakPositions;
  },

  calculateBreaksFromAnswerText(answer, originalChars) {
    return this.calculateBreaksFromAnswer(originalChars, answer);
  },

  getTextFromBreaks(chars, breaks) {
    let result = '';
    for (let i = 0; i < chars.length; i++) {
      result += chars[i];
      if (breaks.includes(i)) result += '/';
    }
    return result;
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

  retryGenerate() { this.loadSkillAndGenerate({}); },
  goBack() { wx.navigateBack(); },
  showGenerateMoreModal() { wx.navigateTo({ url: '/pages/sentencetest/sentencetest' }); },
  hideGenerateMoreModal() { this.setData({ showGenerateModal: false }); },

  confirmGenerateMore() {
    this.hideGenerateMoreModal();
    this.lockGenerateButton();
    const that = this;

    app.authRequest({
      url: '/sentence-breaking/generate-questions', 
      method: 'POST',
      data: { skill_id: that.data.currentSkill.id }
    })
    .then(res => {
      if (res.statusCode === 200 && res.data?.code === 1) {
        const newExercises = res.data.data.exerciseQuestionsList.map(item => {
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
            questionType: 'manual'
          };
        });
        that.setData({
          exerciseList: [...that.data.exerciseList, ...newExercises],
          animationClass: 'fade-in'
        });
        setTimeout(() => this.setExerciseCardHeight(), 300);
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
    wx.createSelectorQuery().select(selector).boundingClientRect(rect => {
      if (rect) {
        wx.pageScrollTo({ scrollTop: rect.top + 0 - 100, duration: 300 });
      }
    }).exec();
  },

  onUnload() {
    const intervals = wx.getStorageSync('activeIntervals') || [];
    intervals.forEach(id => clearInterval(id));
    wx.removeStorageSync('activeIntervals');
  },

  goToBreakingHistory() { wx.navigateTo({ url: '/pages/breakingHistory/breakingHistory' }); },

  getMockExerciseData() {
    return {
      code: 1,
      data: {
        exerciseQuestionsList: [
          { id: 4, content: "见渔人乃大惊问所从来具答之", answer: "见渔人/乃大惊/问所从来/具答之" },
          { id: 5, content: "徐公来孰视之自以为不如窥镜而自视", answer: "徐公来/孰视之/自以为不如/窥镜而自视" }
        ]
      }
    };
  }
});