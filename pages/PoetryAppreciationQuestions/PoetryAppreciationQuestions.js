const app = getApp();

Page({
  data: {
    id: null,
    materialInfo: null,
    questions: [],
    isLoading: false,
    userAnswer: {},     // 记录用户选择 { questionId: 'A' }
    showAnswer: {},     // 记录展开状态 { questionId: boolean }
    // 新增：存储后端返回的解析结果，结构以 questionId 为键
    results: {}         // { questionId: { correctAnswer, isCorrect, answerAnalysis } }
  },

  onLoad(options) {
    const id = options.id || options.textId;
    if (id) {
      this.setData({ id }, () => this.fetchQuestionDetail(id));
      if (options.title) wx.setNavigationBarTitle({ title: decodeURIComponent(options.title) });
    }
  },

  // I. 获取文章和题目列表
  fetchQuestionDetail(id) {
    this.setData({ isLoading: true });
    app.authRequest({
      url: `/questions/exam/${id}`,
      method: 'GET'
    }).then(res => {
      if (res.data && String(res.data.code) === '1') {
        this.setData({
          materialInfo: res.data.data.materialInfo,
          questions: res.data.data.questions || []
        });
      }
    }).finally(() => this.setData({ isLoading: false }));
  },

  // II. 核心修改：用户选择并实时提交
  selectOption(e) {
    const { id, key } = e.currentTarget.dataset; // id 是题目ID, key 是选的 A/B/C/D
    const { userAnswer, results } = this.data;

    // 1. 防止重复提交
    if (userAnswer[id]) return;

    // 2. 本地立即标记用户已选，展示加载态（可选）
    this.setData({
      [`userAnswer.${id}`]: key
    });

    // 3. 调用提交接口获取结果
    app.authRequest({
      url: '/questions/exam/submit',
      method: 'POST',
      data: {
        questionId: id,
        userAnswer: key
      }
    }).then(res => {
      if (res.data && String(res.data.code) === '1') {
        const resultData = res.data.data;
        
        // 4. 将后端返回的正确答案和解析存入 results
        this.setData({
          [`results.${id}`]: {
            correctAnswer: resultData.correctAnswer,
            isCorrect: resultData.isCorrect,
            answerAnalysis: resultData.answerAnalysis
          },
          // 提交后自动展开解析
          [`showAnswer.${id}`]: true 
        });

        // 5.震动反馈
        if (!resultData.isCorrect) {
          // wx.vibrateShort();
        }
      } else {
        wx.showToast({ title: '结果获取失败', icon: 'none' });
      }
    }).catch(() => {
      wx.showToast({ title: '网络连接失败', icon: 'none' });
    });
  },

  toggleAnswer(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ [`showAnswer.${id}`]: !this.data.showAnswer[id] });
  }
});