const app = getApp();

Page({
  data: {
    searchWord: '',
    wordData: null,
    wordList: [],
    wordClasses: [],
    selectedWordClass: null,
    sessionId: Date.now().toString(),
    error: null,
    loading: false,
    isGenerating: false,
    countdown: 0,
    timer: null,
    activeTab: 'class'
  },

  onLoad() {
    this.fetchWordClasses();
    this.fetchInitialWordList();
  },

  onUnload() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
  },

  fetchWordClasses() {
    this.setData({ loading: true });
    
    app.authRequest({
      url: '/api/word/searchWordClass',
      method: 'GET'
    }).then(res => {
      if (res.statusCode === 200 && res.data) {
        if (res.data.code === 1 && Array.isArray(res.data.data)) {
          const categories = res.data.data;
          
          // 找到"全部"分类并标记
          const allCategory = categories.find(item => item.displayName === "全部");
          if (allCategory) {
            allCategory.isAll = true;
          }
          
          this.setData({ 
            wordClasses: categories,
            selectedWordClass: categories[0].displayName, // 使用displayName作为选中标识
            loading: false
          });
          
          // 加载全部字词
          this.fetchInitialWordList();
        } else {
          this.handleError('获取分类失败: ' + (res.data.msg || '返回格式不正确'));
        }
      } else {
        this.handleError('获取分类失败: ' + (res.statusCode || '网络请求失败'));
      }
    }).catch(err => {
      this.handleError('获取分类失败: ' + (err.errMsg || '未知错误'));
    }).finally(() => {
      this.setData({ loading: false });
    });
  },

  fetchInitialWordList() {
    this.fetchWordList({ word: '' });
  },

  fetchWordList(params = {}) {
    this.setData({ 
      loading: true,
      wordData: null,
      wordList: []
    });
    
    if (params.priority) {
      this.setData({ activeTab: 'priority' });
    } else if (params.initial) {
      this.setData({ activeTab: 'class' });
    } else if (params.word !== undefined) {
      this.setData({ activeTab: 'class' });
    }
    
    app.authRequest({
      url: '/api/word/searchWord',
      method: 'GET',
      data: params
    }).then(res => {
      if (res.statusCode === 200 && res.data) {
        if (res.data.code === 1 && Array.isArray(res.data.data)) {
          this.setData({ 
            wordList: res.data.data || [],
            loading: false
          });
        } else {
          if (res.data.code === 1) {
            this.setData({ 
              wordList: [],
              loading: false
            });
          } else {
            this.handleError('获取词语失败: ' + (res.data.msg || '返回格式不正确'));
          }
        }
      } else {
        this.handleError('获取词语失败: ' + (res.statusCode || '网络请求失败'));
      }
    }).catch(err => {
      this.handleError('获取词语失败: ' + (err.errMsg || '未知错误'));
    }).finally(() => {
      this.setData({ loading: false });
    });
  },

  searchWord() {
    const word = this.data.searchWord.trim();
    
    if (!word) {
      this.fetchInitialWordList();
      return;
    }

    this.setData({ 
      loading: true,
      error: null,
      wordList: [],
      selectedWordClass: null,
      activeTab: 'search'
    });
    
    app.authRequest({
      url: '/api/word/searchWord',
      method: 'GET',
      data: { word }
    }).then(res => {
      if (res.statusCode === 200 && res.data) {
        if (res.data.code === 1 && Array.isArray(res.data.data) && res.data.data.length > 0) {
          this.setData({ 
            wordData: res.data.data[0],
            loading: false
          });
        } else {
          if (res.data.code === 1 && res.data.data.length === 0) {
            this.handleError('未找到匹配词条');
          } else {
            this.handleError(res.data?.msg || '未找到匹配词条');
          }
        }
      } else {
        this.handleError('词语查询失败: ' + (res.statusCode || '网络请求失败'));
      }
    }).catch(err => {
      this.handleError('词语查询失败: ' + (err.errMsg || '未知错误'));
    }).finally(() => {
      this.setData({ loading: false });
    });
  },

  generateQuestion() {
    if (!this.data.wordData) {
      this.handleError('请先查询词语数据');
      return;
    }
    
    if (this.data.isGenerating) {
      wx.showToast({
        title: '请等待 ' + this.data.countdown + ' 秒后重试',
        icon: 'none'
      });
      return;
    }
    
    this.startCountdown();
    
    const requestData = {
      ...this.data.wordData,
      sessionId: this.data.sessionId
    };
    
    app.authRequest({
      url: '/api/ai/generate-questions',
      method: 'POST',
      data: requestData
    }).then(res => {
      if (res.statusCode === 200 && res.data && res.data.code === 1) {
        const sessionId = res.data.data;
        this.setData({
          sessionId: sessionId
        }, () => {
          wx.navigateTo({
            url: `/pages/test-item/test-item?sessionId=${sessionId}`
          });
        });
      } else {
        this.handleError(res.data?.msg || '题目生成失败');
      }
    }).catch(err => {
      this.handleError('题目生成失败: ' + (err.errMsg || '未知错误'));
    });
  },

  startCountdown() {
    this.setData({ 
      isGenerating: true,
      countdown: 30
    });
    
    const timer = setInterval(() => {
      if (this.data.countdown > 1) {
        this.setData({ countdown: this.data.countdown - 1 });
      } else {
        clearInterval(timer);
        this.setData({ 
          isGenerating: false,
          countdown: 0
        });
      }
    }, 1000);
    
    this.setData({ timer: timer });
  },

  // 修复后的分类选择逻辑
  selectClass(e) {
    const initial = e.currentTarget.dataset.initial;
    const displayName = e.currentTarget.dataset.displayname;
    
    let params = {};
    
    // 特殊处理"全部"分类
    if (displayName === "全部") {
      params = { word: '' }; 
    } 
    // 处理高频/中频分类
    else if (displayName === "高频") {
      params = { priority: "高频重点词" };
    } else if (displayName === "中频") {
      params = { priority: "中频重要词" };
    } 
    // 处理字母分类
    else {
      params = { initial };
    }
    
    this.setData({
      selectedWordClass: displayName, // 使用displayName作为选中标识
      searchWord: ''
    }, () => {
      this.fetchWordList(params);
    });
  },

  selectWordItem(e) {
    const word = e.currentTarget.dataset.word;
    this.setData({
      searchWord: word,
      wordData: null
    }, () => {
      this.searchWord();
    });
  },

  navigateToHistory() {
    wx.navigateTo({
      url: '/pages/wordtest-history/wordtest-history'
    });
  },

  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ 
      [field]: e.detail.value,
      selectedWordClass: null,
      wordData: null
    });
  },
  
  handleError(msg) {
    console.error('错误:', msg);
    
    if (msg === "success" || msg.includes("success")) {
      msg = "请求成功但未返回有效数据";
    } else if (msg === "undefined" || msg.includes("undefined")) {
      msg = "未定义错误";
    }
    
    this.setData({ 
      loading: false, 
      error: msg
    });
    
    let showMsg = msg;
    if (msg.includes("Network Error")) {
      showMsg = "网络连接错误，请检查网络";
    } else if (msg.includes("timeout")) {
      showMsg = "请求超时，请稍后再试";
    }
    
    wx.showToast({
      title: showMsg,
      icon: 'none',
      duration: 3000
    });
  },
  
  onShareAppMessage() {
    if (this.data.wordData) {
      return {
        title: `词语查询：${this.data.wordData.word}`,
        path: `/pages/word/word?word=${encodeURIComponent(this.data.wordData.word)}`,
        imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png',
        desc: `${this.data.wordData.word}：${this.data.wordData.meaningsPoemsList?.[0]?.meaning || '暂无解释'}`
      };
    }
    return {
      title: '词语查询工具 | 探索汉语之美',
      path: '/pages/word/word',
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    };
  },
  
  onShareTimeline() {
    if (this.data.wordData) {
      return {
        title: `汉语词语：${this.data.wordData.word}`,
        query: `word=${encodeURIComponent(this.data.wordData.word)}`,
        imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
      };
    }
    return {
      title: '词语查询工具',
      query: '',
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    };
  }
});