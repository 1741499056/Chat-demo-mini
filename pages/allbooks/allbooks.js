// pages/allbooks
const app = getApp();

Page({
  data: {
    ancientTexts: [],
    loading: false,
    error: null
  },

  onLoad: function() {
    this.fetchAncientTexts();
  },

  fetchAncientTexts: function() {
    this.setData({ loading: true, error: null });
    
    // 使用全局的统一请求方法
    app.authRequest({
      url: '/api/getbooks', // 使用相对路径
      method: 'GET'
    }).then(res => {
      let bookList = [];
      
      // 解析不同格式的API响应
      if (res.statusCode === 200) {
        if (res.data?.code === 1 && Array.isArray(res.data.data)) {
          bookList = res.data.data;
        } else if (Array.isArray(res.data)) {
          bookList = res.data;
        }
      }
      
      if (bookList.length > 0) {
        // 使用OSS路径替换本地路径
        const ancientTexts = bookList.map(item => {
          const filename = `${item.title || 'default'}.jpg`;
          return {
            id: item.id || '',
            title: item.title || '无标题',
            author: item.author || '未知',
            dynasty: item.dynasty || '未知',
            description: item.description || '暂无简介',
            chapterFirstId: item.chapterFirstId || '',
            safeImage: app.getOSSImagePath(filename),
            localFallback: `/Guwen/books/${filename}`, // 保留本地路径作为降级方案
            imageLoaded: false,
            imageError: false
          };
        });
        
        this.setData({
          ancientTexts,
          loading: false
        });
      } else {
        this.setData({ 
          error: `暂无书籍数据`,
          loading: false 
        });
      }
    }).catch(err => {
      // 统一错误处理
      this.setData({ 
        error: '网络请求失败: ' + (err?.errMsg || '未知错误'),
        loading: false 
      });
    }).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  navigateToDetail: function(e) {
    const book = this.data.ancientTexts[e.currentTarget.dataset.index];
    if (book?.id && book?.chapterFirstId) {
      // 关键修改：传递书籍ID和第一章节ID
      wx.navigateTo({
        url: `/pages/ArticleDetail/ArticleDetail?bookId=${book.id}&firstChapterId=${book.chapterFirstId}`,
        success: () => console.log('跳转成功', book)
      });
    } else {
      wx.showToast({ title: '书籍信息异常', icon: 'error' });
    }
  },
  
  onPullDownRefresh: function() {
    this.fetchAncientTexts();
  },
  
  handleImageError: function(e) {
    const index = e.currentTarget.dataset.index;
    const book = this.data.ancientTexts[index];
    
    this.setData({
      [`ancientTexts[${index}].imageError`]: true,
      [`ancientTexts[${index}].safeImage`]: book.localFallback
    });
    
    // 上报错误日志
    wx.reportAnalytics('image_load_fail', {
      url: book.safeImage,
      title: book.title
    });
  },
  
  handleImageLoad: function(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      [`ancientTexts[${index}].imageLoaded`]: true
    });
  },
  
  navigateToIndex: function() {
    wx.navigateTo({
      url: '/pages/index/index'
    });
  },
  
  // 新增古籍页面分享功能（好友分享）
  onShareAppMessage() {
    // 如果有数据，取第一本书作为分享封面
    const coverBook = this.data.ancientTexts.length > 0 
      ? this.data.ancientTexts[0] 
      : null;
    
    return {
      title: '古典文学典籍 | 国学精华收藏',
      path: '/pages/guwen/guwen',
      imageUrl: coverBook ? coverBook.safeImage : 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png',
      desc: '探索千载经典，品味华夏文明'
    }
  },
  
  // 新增古籍页面朋友圈分享功能
  onShareTimeline() {
    // 如果有数据，取第一本书作为分享封面
    const coverBook = this.data.ancientTexts.length > 0 
      ? this.data.ancientTexts[0] 
      : null;
    
    return {
      title: '古典典籍精粹',
      query: '',
      imageUrl: coverBook ? coverBook.safeImage : 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  }
});