// 添加全局 app 引用
const app = getApp();

Page({
  data: {
    sessionId: '',
    questionDetail: {
      choiceQuestionsList: [],
      blankQuestionsList: []
    },
    activeTab: 'choice',
    optionLetters: ['A', 'B', 'C', 'D'],
    loading: false,
    error: null
  },

  onLoad(options) {
    const sessionId = options.sessionId || '';
    this.setData({ sessionId }, () => {
      this.fetchQuestionDetail();
    });
  },

  fetchQuestionDetail() {
    const { sessionId } = this.data;
    if (!sessionId) {
      this.handleError('缺少sessionId');
      return;
    }
    
    this.setData({ loading: true });
    
    const token = app.globalData.token || '';
    
    if (!token) {
      this.handleError('请先登录系统');
      this.setData({ loading: false });
      return;
    }
    
    // 使用统一请求方法
    app.authRequest({
      url: '/api/ai/questionDetail',
      method: 'GET',
      data: { sessionId },
      header: {
        'X-Session-ID': this.data.sessionId
      }
    }).then(res => {
      if (res.statusCode !== 200) {
        this.handleError(`详情获取失败(${res.statusCode})`);
        return;
      }
      
      if (!res.data || res.data.code !== 1 || !res.data.data) {
        this.handleError(res.data?.msg || '题目详情异常');
        return;
      }
      
      this.processQuestionData(res.data.data);
    }).catch(err => {
      this.handleError('题目详情失败: ' + (err.errMsg || '未知错误'));
    });
  },

  processQuestionData(apiData) {
    const result = {
      choiceQuestionsList: [],
      blankQuestionsList: []
    };
    
    if (!apiData) {
      this.setData({ 
        questionDetail: result,
        loading: false 
      });
      return;
    }

    // 处理选择题列表 - 添加更健壮的处理逻辑
    if (apiData.choiceQuestionsList?.length > 0) {
      result.choiceQuestionsList = apiData.choiceQuestionsList.map(q => {
        // 确保选项数组存在 (空值检查)
        const safeOptions = (q.options || []).map(opt => {
          // 将选项转换为安全的字符串
          const text = opt == null ? '' : typeof opt === 'string' ? opt : String(opt);
          
          // 预解析选项格式
          let isStructured = false;
          let optionPart1 = '';
          let optionPart2 = '';
          
          // 安全处理结构化选项
          if (text.includes('|')) {
            const parts = text.split('|');
            optionPart1 = parts[0] || '';
            optionPart2 = parts[1] || '';
            isStructured = optionPart1 && optionPart2;
          }
          
          return {
            text, // 原始文本
            isStructured, // 是否为结构化格式
            optionPart1,  // 第一部分（分割符前的部分）
            optionPart2   // 第二部分（分割符后的部分）
          };
        });
        
        // 返回处理后的题目对象
        return {
          ...q,
          id: q.id ? q.id.toString() : Date.now().toString(), // 确保ID不为空
          userAnswer: null,
          answered: false,
          isCorrect: false,
          options: safeOptions // 使用处理后的安全选项
        };
      });
    }
  
    // 处理填空题列表 - 添加安全处理
    if (apiData.blankQuestionsList?.length > 0) {
      result.blankQuestionsList = apiData.blankQuestionsList.map(q => ({
        ...q,
        id: q.id ? q.id.toString() : Date.now().toString(), // 确保ID不为空
        userAnswer: '',
        answered: false,
        isCorrect: false
      }));
    }
    
    // 确定默认标签
    const activeTab = result.choiceQuestionsList.length > 0 ? 'choice' : 
                     result.blankQuestionsList.length > 0 ? 'blank' : 'choice';

    this.setData({
      questionDetail: result,
      activeTab,
      loading: false
    });
  },
  
  // 选择题：选择选项 - 保持不变
  selectOption(e) {
    const qIndex = e.currentTarget.dataset.qindex;
    const oIndex = e.currentTarget.dataset.oindex;
    const question = this.data.questionDetail.choiceQuestionsList[qIndex];
    
    question.userAnswer = oIndex;
    question.answered = true;
    
    // 检查答案
    question.isCorrect = oIndex === question.answer;
    
    this.setData({
      [`questionDetail.choiceQuestionsList[${qIndex}]`]: question
    });
  },
  
  // 填空题：输入答案 - 保持不变
  onBlankInput(e) {
    const qIndex = e.currentTarget.dataset.qindex;
    const value = e.detail.value;
    
    const blankQuestion = this.data.questionDetail.blankQuestionsList[qIndex];
    blankQuestion.userAnswer = value;
    
    this.setData({
      [`questionDetail.blankQuestionsList[${qIndex}]`]: blankQuestion
    });
  },
  
  // 填空题：提交答案 - 保持不变
  submitBlankAnswer(e) {
    const qIndex = e.currentTarget.dataset.qindex;
    const blankQuestion = this.data.questionDetail.blankQuestionsList[qIndex];
    
    blankQuestion.answered = true;
    // 检查答案是否正确
    blankQuestion.isCorrect = blankQuestion.userAnswer.trim() === blankQuestion.answer.trim();
    
    this.setData({
      [`questionDetail.blankQuestionsList[${qIndex}]`]: blankQuestion
    });
  },
  
  // 填空题：重置答案 - 保持不变
  resetBlankAnswer(e) {
    const qIndex = e.currentTarget.dataset.qindex;
    const blankQuestion = this.data.questionDetail.blankQuestionsList[qIndex];
    
    blankQuestion.userAnswer = '';
    blankQuestion.answered = false;
    blankQuestion.isCorrect = false;
    
    this.setData({
      [`questionDetail.blankQuestionsList[${qIndex}]`]: blankQuestion
    });
  },
  
  // 重置选择题答案 - 保持不变
  resetChoiceAnswer(e) {
    const qIndex = e.currentTarget.dataset.qindex;
    const question = this.data.questionDetail.choiceQuestionsList[qIndex];
    
    question.userAnswer = null;
    question.answered = false;
    question.isCorrect = false;
    
    this.setData({
      [`questionDetail.choiceQuestionsList[${qIndex}]`]: question
    });
  },

  // 切换选项卡 - 保持不变
  switchTab(e) {
    const type = e.currentTarget.dataset.type;
    const { choiceQuestionsList, blankQuestionsList } = this.data.questionDetail;
    
    if (type === 'choice' && choiceQuestionsList.length === 0) {
      wx.showToast({ title: '暂无选择题', icon: 'none' });
      return;
    }
    
    if (type === 'blank' && blankQuestionsList.length === 0) {
      wx.showToast({ title: '暂无填空题', icon: 'none' });
      return;
    }
    
    this.setData({ activeTab: type });
  },
  
  handleError(msg) {
    console.error('错误:', msg);
    this.setData({ 
      loading: false, 
      error: msg
    });
    
    const showMsg = msg.length > 50 ? `${msg.substring(0, 47)}...` : msg;
    wx.showToast({
      title: showMsg,
      icon: 'none',
      duration: 3000
    });
  },
  
  // 返回上一页 - 保持不变
  goBack() {
    wx.navigateBack();
  }
});