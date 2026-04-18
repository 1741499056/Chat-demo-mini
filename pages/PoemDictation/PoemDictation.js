const app = getApp();

Page({
  data: {
    poemId: '',
    title: '',
    questions: [],
    userAnswers: {}, // key: questionId, value: text
    isSubmitted: false,
    resultData: null,
    isLoading: false
  },

  onLoad(options) {
    this.setData({
      poemId: options.poemId,
      title: decodeURIComponent(options.title || '古诗默写')
    });
    this.fetchQuestions();
  },

  // 获取题目详情
  fetchQuestions() {
    this.setData({ isLoading: true });
    app.authRequest({
      url: `/questions/recitation/${this.data.poemId}`,
      method: 'GET'
    }).then(res => {
      if (res.data && res.data.code === 1) {
        this.setData({ questions: res.data.data });
      }
    }).finally(() => {
      this.setData({ isLoading: false });
    });
  },

  // 输入监听
  onInputAnswer(e) {
    const { id } = e.currentTarget.dataset;
    const { value } = e.detail;
    let userAnswers = this.data.userAnswers;
    userAnswers[id] = value;
    this.setData({ userAnswers });
  },

  // 提交答案
  submitAnswers() {
    const answersArray = Object.keys(this.data.userAnswers).map(id => ({
      questionId: parseInt(id),
      userAnswer: this.data.userAnswers[id]
    }));

    if (answersArray.length === 0) {
      wx.showToast({ title: '请输入答案再提交', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '评判中...' });
    app.authRequest({
      url: '/questions/recitation/submit',
      method: 'POST',
      data: {
        poemId: parseInt(this.data.poemId),
        isEarlyFinish: false,
        answers: answersArray
      }
    }).then(res => {
      if (res.data && res.data.code === 1) {
        this.setData({
          isSubmitted: true,
          resultData: res.data.data
        });
        wx.pageScrollTo({ scrollTop: 0 });
      }
    }).finally(() => {
      wx.hideLoading();
    });
  },

  // 重新练习
  retry() {
    this.setData({
      isSubmitted: false,
      resultData: null,
      userAnswers: {}
    });
  }
});