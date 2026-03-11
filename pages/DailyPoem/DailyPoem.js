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
    this.DailyPoem();
  },

  // HTML实体解码函数
  decodeHTMLEntities: function(text) {
    const entityMap = {
      '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
      '&quot;': '"', '&apos;': "'", '&#39;': "'", '&#34;': '"', '&#xa0;': ' '
    };
    return text.replace(/&[#a-z]+;/gi, match => entityMap[match.toLowerCase()] || match);
  },

  DailyPoem: function() {
    this.setData({ refreshing: true });
    wx.showLoading({ title: '刷新中...', mask: true });

    app.authRequest({
      url: '/api/poem/daily',
      method: "GET"
    }).then(res => {
      wx.hideLoading();
      this.setData({ refreshing: false });

      // 提取核心数据
      const rawData = res.data.data || res.data;
      
      // 处理古诗内容：解析 HTML 标签并按标点拆分
      const cleanContent = (rawText) => {
        if (!rawText) return [];
        let decoded = this.decodeHTMLEntities(rawText);
        // 移除所有 HTML 标签 (例如 <br/>)
        decoded = decoded.replace(/<[^>]*>/g, '');
        // 按句号、问号或感叹号拆分，并过滤掉空项
        return decoded.split(/[。！？]+/).filter(line => line.trim() !== '');
      };

      // 映射数据到前端变量
      const contentList = cleanContent(rawData.fullAncientContent);
      const formattedContent = contentList.map(s => s.trim() + '。');

      this.setData({
        poem: {
          title: rawData.name || '无题', // 后端返回的是 name
          author: rawData.author || '佚名',
          dynasty: rawData.dynasty || '',
          content: formattedContent.length > 0 ? formattedContent : ['暂无诗词内容']
        }
      });
    }).catch(err => {
      wx.hideLoading();
      this.setData({ refreshing: false });
      wx.showToast({ title: '刷新失败', icon: 'none' });
    });
  },

  // 页面跳转逻辑
  aichat() { wx.navigateTo({ url: '/pages/ai-chat/ai-chat' }); },
  learnmore() { wx.navigateTo({ url: '/pages/index_v1/index_v1' }); },
  recite() { wx.navigateTo({ url: '/pages/recite/recite' }); },

  // 分享功能
  onShareAppMessage() {
    return {
      title: `今日诗词：${this.data.poem.title}`,
      path: `/pages/DailyPoem/DailyPoem`
    };
  }
});