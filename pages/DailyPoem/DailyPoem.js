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

  // 新增：HTML实体解码函数（处理&nbsp;、&amp;等）
  decodeHTMLEntities: function(text) {
    const entityMap = {
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&apos;': "'",
      '&#39;': "'",
      '&#34;': '"',
      '&#xa0;': ' ' // 补充不间断空格
    };
    return text.replace(/&[#a-z]+;/gi, match => entityMap[match.toLowerCase()] || match);
  },

  DailyPoem: function() {
    // 使用 app 的 authRequest 方法
    app.authRequest({
      url: '/api/poem/daily', // 使用相对路径，自动添加基础域名
      method: "GET"
    }).then(res => {
      wx.hideLoading();
      const poemData = res.data.data || res.data;
      
      // 处理诗词内容：清理解码+移除标签+分割句子
      let contentLines = [];
      const cleanContent = (rawText) => {
        // 1. 解码HTML实体
        let decoded = this.decodeHTMLEntities(rawText);
        // 2. 移除所有HTML标签（包括换行、空标签）
        decoded = decoded.replace(/<[^>]*>/g, '');
        // 3. 按句号分割，过滤空行
        return decoded.split(/。+/).filter(line => line.trim() !== '');
      };

      if (typeof poemData.content === 'string') {
        // 字符串内容：清理后分割并补全句号
        const sentences = cleanContent(poemData.content);
        contentLines = sentences.map(s => s.trim() + '。');
      } else if (Array.isArray(poemData.content)) {
        // 数组内容：遍历每个元素清理后合并
        poemData.content.forEach(item => {
          const sentences = cleanContent(item);
          contentLines = contentLines.concat(sentences.map(s => s.trim() + '。'));
        });
      }

      // 兜底：若无内容则设为默认提示
      if (contentLines.length === 0) {
        contentLines = ['暂无诗词内容'];
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

  // 跳转到AI聊天页面
  aichat() {
    wx.navigateTo({
      url: '/pages/ai-chat/ai-chat'
    });
  },

  // 跳转到学习更多页面
  learnmore() {
    wx.navigateTo({
      // url: '/pages/index/index'
      url:'/pages/index_v1/index_v1'
    });
  },

  // 跳转到背诵点评页面
  recite() {
    wx.navigateTo({
      url: '/pages/recite/recite'
    });
  },

  // 微信好友分享
  onShareAppMessage() {
    return {
      title: `今日诗词：${this.data.poem.title}`,
      path: `/pages/DailyPoem/DailyPoem?date=${new Date().toISOString().split('T')[0]}`,
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: `${this.data.poem.title} · ${this.data.poem.author}`,
      query: `id=${this.data.poem.id || ''}`,
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    };
  }
});