// pages/poem/detail/index.js
// 添加全局 app 引用
const app = getApp();

Page({
  data: {
    poemData: {
      id: 0,
      name: '',
      dynasty: '',
      author: '',
      originalContent: '',
      modernContent: '',
      annotation: '',
      appreciation: '',
      background: '',
      peopleAppreciation: ''
    },
    relatedPoems: []
  },

  onLoad(options) {
    const id = options.id;
    if (id) {
      this.fetchPoemDetail(id);
    } else {
      wx.showToast({ title: '诗词ID缺失', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  // 获取诗词详情 - 使用统一请求方法
  fetchPoemDetail(id) {
    wx.showLoading({ title: '加载中...', mask: true });
    
    // 使用相对路径
    app.authRequest({
      url: `/api/poem/${id}`,
      method: 'GET'
    }).then(res => {
      wx.hideLoading();
      if (res.statusCode === 200 && res.data.code === 1) {
        this.processPoemData(res.data.data);
      } else {
        this.handleError(res.data?.msg || '获取详情失败');
      }
    }).catch(() => {
      wx.hideLoading();
      this.handleError('网络请求失败');
    });
  },

  // 处理诗词数据 - 保持不变
  processPoemData(data) {
    // 清洗文本内容
    const cleanText = (text) => {
      if (!text) return '';
      
      // 1. 去除HTML标签
      let cleaned = text.replace(/<[^>]+>/g, '');
      
      // 2. 替换常见的HTML实体
      cleaned = cleaned
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      
      // 3. 去除多余的空格和换行
      cleaned = cleaned
        .replace(/\s+/g, ' ') // 多个空格替换为一个
        .replace(/\n+/g, '\n') // 多个换行替换为一个
        .trim();
      
      return cleaned;
    };
    
    // 处理原文内容（保留换行）
    const cleanOriginalContent = (text) => {
      if (!text) return '';
      
      // 保留<br>作为换行
      let cleaned = text.replace(/<br\s*\/?>/gi, '\n');
      
      // 去除其他HTML标签
      cleaned = cleaned.replace(/<[^>]+>/g, '');
      
      // 替换HTML实体
      cleaned = cleaned
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      
      return cleaned;
    };
    
    const poemData = {
      id: data.id,
      name: cleanText(data.name) || '无标题',
      dynasty: cleanText(data.dynasty) || '不详',
      author: cleanText(data.author) || '未知',
      originalContent: cleanOriginalContent(data.fullAncientContent) || cleanOriginalContent(data.fullModernContent) || '暂无内容',
      modernContent: cleanText(data.fullModernContent) || '',
      annotation: cleanText(data.annotation) || '',
      appreciation: cleanText(data.appreciation) || '',
      background: cleanText(data.background) || '',
      peopleAppreciation: cleanText(data.peopleAppreciation) || ''
    };
    
    this.setData({ poemData });
    
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: poemData.name
    });
    
    // 获取相关古诗
    if (data.links && data.links.length > 0) {
      this.fetchRelatedPoems(data.links);
    }
  },

  // 获取相关古诗 - 使用统一请求方法
  fetchRelatedPoems(ids) {
    // 只保留前3个相关诗词
    const limitIds = ids.slice(0, 3);
    
    const promises = limitIds.map(id => {
      return app.authRequest({
        url: `/api/poem/${id}`,
        method: 'GET'
      }).then(res => {
        if (res.statusCode === 200 && res.data.code === 1) {
          const data = res.data.data;
          return {
            id: data.id,
            name: data.name || '无标题',
            dynasty: data.dynasty || '不详',
            author: data.author || '未知'
          };
        } else {
          return null; // 获取失败时返回null
        }
      }).catch(() => {
        return null; // 获取失败时返回null
      });
    });

    // 等待所有请求完成
    Promise.all(promises).then(results => {
      // 过滤掉获取失败的结果
      const relatedPoems = results.filter(item => item !== null);
      this.setData({ relatedPoems });
    });
  },

  // 导航到相关古诗 - 保持不变
  navigateToRelated(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) {
      console.error('相关古诗ID缺失');
      return;
    }
    
    wx.navigateTo({
      url: `/pages/poem/poemdetail?id=${id}`,
      fail: () => {
        wx.showToast({ title: '打开详情失败', icon: 'none' });
      }
    });
  },

  // 返回上一页 - 保持不变
  goBack() {
    wx.navigateBack();
  },

  handleError(msg) {
    wx.showToast({ title: msg, icon: 'none' });
  },
  startRecitePractice(){
    wx.navigateTo({
      url: '/pages/poemRecite/poemRecite',
    })
  },
  
  // 新增诗词详情页分享功能（好友分享）- 保持不变
  onShareAppMessage() {
    const poem = this.data.poemData;
    
    // 生成内容摘要（取前两句诗）
    const previewContent = poem.originalContent.split('\n').slice(0, 2).join(' ');
    
    return {
      title: `${poem.name} | ${poem.author}（${poem.dynasty}）`,
      path: `/pages/poem/poemdetail?id=${poem.id}`,
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png',
      desc: previewContent
    }
  },
  
  // 新增诗词详情页朋友圈分享功能 - 保持不变
  onShareTimeline() {
    const poem = this.data.poemData;
    
    return {
      title: `${poem.name} · ${poem.author}`,
      query: `id=${poem.id}`,
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  }
});