// 添加全局 app 引用
const app = getApp();

Page({
    data: {
        textId: null,
        pageTitle: '题目详情',
        
        // 数据结构
        textInfo: null,     // 文章信息 (text_id, title, content)
        questions: [],      // 题目列表 (已解析 options_json)
        
        // 状态管理
        isLoading: false,
        loadError: false,
        errorMsg: '',
        // 新增：记录用户的选择 { question_id: 'A' }
        userAnswer: {},
        // 用户交互状态
        showAnswer: {}, // { question_id: boolean } 记录每道题的答案展示状态
    },

    onLoad(options) {
        // 1. 获取传递的 textId
        const textId = options.textId;
        const title = options.title || '题目详情';
        
        if (textId) {
            this.setData({
                textId: textId,
                pageTitle: decodeURIComponent(title)
            }, () => {
                this.fetchQuestionDetail(textId);
            });
            // 设置页面导航栏标题
            wx.setNavigationBarTitle({ title: decodeURIComponent(title) });
        } else {
            this.setData({
                loadError: true,
                errorMsg: '缺少题目ID参数'
            });
        }
    },

    // ----------------------------------------------------
    // I. 数据获取与处理
    // ----------------------------------------------------

    fetchQuestionDetail(textId) {
        this.setData({
            isLoading: true,
            loadError: false,
            errorMsg: '',
        });

        if (!app.globalData.token) {
            // 沿用登录检查逻辑
            this.handleUnauthorized(); 
            return;
        }

        // 使用统一请求方法，注意 URL 中需要拼接 textId
        app.authRequest({
            url: `/api/questions/choice/${textId}`,
            method: 'GET'
        }).then(res => {
            if (res.statusCode === 200) {
                if (res.data && String(res.data.code) === '1') {
                    const data = res.data.data;
                    
                    // 解析题目列表，将 options_json 字符串转换为数组
                    const questions = (data.questions || []).map(q => {
                        let optionsArray = [];
                        try {
                            const optionsObj = JSON.parse(q.options_json);
                            // 转换为 { key: 'A', content: '选项内容' } 数组格式
                            optionsArray = Object.keys(optionsObj).map(key => ({
                                key: key,
                                content: optionsObj[key]
                            }));
                        } catch (e) {
                            console.error("解析 options_json 失败:", e);
                        }
                        return {
                            ...q,
                            options: optionsArray
                        };
                    });

                    this.setData({
                        textInfo: data.text_info,
                        questions: questions,
                    });

                } else {
                    this.setData({
                        loadError: true,
                        errorMsg: res.data?.msg || '获取题目详情失败'
                    });
                }
            } else if (res.statusCode === 401) {
                this.handleUnauthorized();
            } else {
                this.setData({
                    loadError: true,
                    errorMsg: `请求失败，状态码：${res.statusCode}`
                });
            }
        }).catch(err => {
            if (err.statusCode === 401) {
                this.handleUnauthorized();
            } else {
                this.setData({
                    loadError: true,
                    errorMsg: '网络请求失败: ' + (err?.errMsg || '未知错误')
                });
            }
        }).finally(() => {
            this.setData({ isLoading: false });
        });
    },

    // ----------------------------------------------------
    // II. 页面交互
    // ----------------------------------------------------
    // 新增：用户选择选项
    selectOption(e) {
      const { id, key } = e.currentTarget.dataset; // id 是 question_id, key 是选项 (A, B, C, D)
      const { userAnswer, questions } = this.data;
      
      // 1. 如果该题已经选择，则不再允许修改（可选，根据需求调整）
      if (userAnswer[id]) {
          // 可以添加提示或直接返回
          wx.showToast({ title: '已作答，请查看解析', icon: 'none' });
          return;
      }

      // 2. 更新用户选择状态
      const newUserAnswer = {
          ...userAnswer,
          [id]: key 
      };
      
      this.setData({
          userAnswer: newUserAnswer
      });

      // 3. 自动展开答案解析（可选）
      const showAnswer = { ...this.data.showAnswer };
      showAnswer[id] = true;
      this.setData({ showAnswer });

      
  },
    // 切换答案解析的显示状态
    toggleAnswer(e) {
        const questionId = e.currentTarget.dataset.id;
        const showAnswer = { ...this.data.showAnswer };
        showAnswer[questionId] = !showAnswer[questionId];
        this.setData({ showAnswer });
    },

    // 处理未授权情况 (沿用列表页逻辑)
    handleUnauthorized() {
        this.setData({
            loadError: true,
            errorMsg: '登录信息已过期，请重新登录'
        });
        wx.removeStorageSync('userInfo');
        
        // 设置登录成功后要返回的页面
        app.globalData.targetRoute = {
            path: `/pages/gaokaoQuestions/gaokaoQuestions?textId=${this.data.textId}`,
            type: 'page'
        };
        
        wx.navigateTo({ url: '/pages/login/login' });
    },

    // 重试获取数据
    retryFetch() {
        this.fetchQuestionDetail(this.data.textId);
    }
});