// 添加全局 app 引用
const app = getApp();

Page({
  data: {
    sentenceSkills: [],
    skillCount: 0,
    isLoading: false,
    loadError: false,
    errorMsg: '',
    expandedSkills: {} // 使用对象记录每个技能的展开状态
  },

  onLoad() {
    this.fetchSkills();
  },

  // 切换技能展开状态
  toggleSkill(e) {
    const index = e.currentTarget.dataset.index;
    const id = this.data.sentenceSkills[index].id;
    const expandedSkills = {...this.data.expandedSkills};
    
    // 切换当前技能的展开状态
    expandedSkills[id] = !expandedSkills[id];
    
    this.setData({ expandedSkills });
  },

  // 使用统一请求方法获取技能数据
  fetchSkills() {
    this.setData({
      isLoading: true,
      loadError: false,
      errorMsg: '',
      expandedSkills: {}
    });

    // 检查是否已登录
    if (!app.globalData.token) {
      this.setData({
        isLoading: false,
        loadError: true,
        errorMsg: '请先登录'
      });
      
      // 设置登录成功后要返回的页面
      app.globalData.targetRoute = {
        path: '/pages/sentencesegmentation/sentencesegmentation',
        type: 'page'
      };
      
      wx.navigateTo({
        url: '/pages/login/login',
      });
      return;
    }

    // 使用统一请求方法
    app.authRequest({
      url: '/api/sentence-breaking/skills',
      method: 'GET'
    }).then(res => {
      if (res.statusCode === 200) {
        if (res.data && String(res.data.code) === '1') {
          const skills = res.data.data.map(skill => ({
            ...skill,
            id: String(skill.id),
            steps: skill.steps.map(step => ({
              ...step,
              step: String(step.step)
            }))
          }));
          
          // 初始化所有技能为折叠状态
          const expandedSkills = {};
          skills.forEach(skill => {
            expandedSkills[skill.id] = false;
          });
          
          this.setData({
            sentenceSkills: skills,
            skillCount: skills.length,
            expandedSkills
          });
        } else {
          this.setData({
            loadError: true,
            errorMsg: res.data?.msg || '获取数据失败'
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

  // 处理未授权情况
  handleUnauthorized() {
    this.setData({
      loadError: true,
      errorMsg: '登录信息已过期，请重新登录'
    });
    wx.removeStorageSync('userInfo');
    
    // 设置登录成功后要返回的页面
    app.globalData.targetRoute = {
      path: '/pages/sentencesegmentation/sentencesegmentation',
      type: 'page'
    };
    
    wx.navigateTo({ url: '/pages/login/login' });
  },

  // 生成题目
  generateQuestions(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.sentenceSkills[index];
    const skillStr = encodeURIComponent(JSON.stringify(item));
    wx.navigateTo({
      url: `/pages/localtest/localtest?skill=${skillStr}`
    });
  },

  // 重试获取数据
  retryFetch() {
    this.fetchSkills();
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '文言文断句技巧大全',
      path: '/pages/sentencesegmentation/sentencesegmentation',
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png',
      desc: '精研断句之道，畅读文言之美'
    }
  },

  // 朋友圈分享功能
  onShareTimeline() {
    return {
      title: '文言文断句技巧',
      query: '',
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  }
});