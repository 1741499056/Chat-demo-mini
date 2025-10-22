// 在顶部获取 app 实例
const app = getApp();

Page({
  data: {
    poem: {
      title: '',
      author: '',
      dynasty: '',
      content: []  // 每项是一句
    },
    today: '',
    refreshing: false
  },

  onLoad: function() {
    this.loadDate();
    this.DailyPoem();
  },
  
  loadDate: function() {
    const date = new Date();
    const today = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    this.setData({ today });
  },

  refreshPoem: function() {
    if (this.data.refreshing) return;
    
    this.setData({ refreshing: true });
    wx.showLoading({
      title: '刷新中...',
      mask: true
    });
    
    // 调用统一请求方法
    this.DailyPoem();
  },

  DailyPoem: function() {
    // 使用 app 的 authRequest 方法
    app.authRequest({
      url: '/api/poem/daily', // 使用相对路径，自动添加基础域名
      method: "GET"
    }).then(res => {
      wx.hideLoading();
      const poemData = res.data.data || res.data;
      
      // 处理诗词内容：按句号分割，每句独立
      let contentLines = [];
      if (typeof poemData.content === 'string') {
        // 去掉换行标签，然后按句号分割
        let cleaned = poemData.content.replace(/<br\s*\/?>/gi, '');
        // 按句号分割，去掉空行
        contentLines = cleaned.split(/。+/).filter(line => line.trim() !== '');
        // 每句后面加上句号（因为split去掉了句号）
        contentLines = contentLines.map(line => line.trim() + '。');
      } else if (Array.isArray(poemData.content)) {
        // 数组中的每一项可能是一行（包含两句）也可能是一句，我们将其展平
        poemData.content.forEach(item => {
          // 先去除<br>标签
          let line = item.replace(/<br\s*\/?>/gi, '');
          // 然后按句号分割
          let sentences = line.split(/。+/).filter(s => s.trim() !== '');
          sentences = sentences.map(s => s.trim() + '。');
          contentLines = contentLines.concat(sentences);
        });
      }
      
      // 如果上述处理没有得到任何行，则设为空数组
      if (contentLines.length === 0) {
        contentLines = [''];
      }

      this.setData({
        poem: {
          title: poemData.title || '无题',
          author: poemData.author || '佚名',
          dynasty: poemData.dynasty || '',
          content: contentLines
        },
        refreshing: false
      });
    }).catch(err => {
      wx.hideLoading();
      this.setData({ refreshing: false });
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    });
  },
  aichat(){
    wx.navigateTo({
      url: '/pages/ai-chat/ai-chat'
    });
  },
  learnmore() {
    wx.navigateTo({
      url: '/pages/index/index'
    });
  },
  //跳转到背诵点评页面
  recite(){
    wx.navigateTo({
      url:'/pages/recite/recite'
    });
  },
  
  // 新增分享函数 (微信好友分享)
  onShareAppMessage() {
    return {
      title: `今日诗词：${this.data.poem.title}`,
      path: `/pages/DailyPoem/DailyPoem?date=${new Date().toISOString().split('T')[0]}`,
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  },
  
  // 新增分享到朋友圈功能
  onShareTimeline() {
    return {
      title: `${this.data.poem.title} · ${this.data.poem.author}`,
      query: `id=${this.data.poem.id || ''}`,
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  }
});