const app = getApp();
Page({
  data: {
    id: null,         // 使用接口要求的id字段
    bookTitle: '',
    chapterTitle: '',
    navTreeData: [],
    contentList: [],
    fontSize: 30,
    nightMode: false,
    loading: true,
    error: null,
    requestId: ''     // 用于跟踪请求
  },

  onLoad(options) {
    console.log('详情页接收的参数:', options);
    
    // 处理不同的参数名（优先使用id）
    const articleId = options.id || options.articleId || options.firstChapterId || options.chapterId;
    
    if (!articleId) {
      const errorMsg = '缺少文章ID参数';
      console.error(errorMsg, options);
      this.showFatalError(errorMsg);
      return;
    }
    
    // 将ID转为数字（接口要求整数）
    const idNum = parseInt(articleId);
    if (isNaN(idNum) || idNum < 1) {
      const errorMsg = `无效的文章ID: ${articleId}`;
      console.error(errorMsg);
      this.showFatalError(errorMsg);
      return;
    }
    
    console.log('有效文章ID:', idNum);
    
    this.setData({
      id: idNum
    }, () => {
      this.fetchChapterData();
    });
  },

  fetchChapterData() {
    const { id } = this.data;
    if (!id) return;
    
    console.log('请求文章详情:', { id });
    
    const requestId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.setData({ 
      loading: true,
      error: null,
      requestId
    });
    
    wx.showLoading({ title: '加载中...', mask: true });
    
    // 使用全局的统一请求方法
    app.authRequest({
      url: '/api/getArticleDetail', // 使用相对路径
      method: 'GET',
      data: { id } // 接口要求参数名为id
    }).then(res => {
      console.log(`[${requestId}] 详情响应:`, res);
      wx.hideLoading();
      
      if (res.statusCode === 200 && res.data?.code === 1) {
        this.processApiResponse(res.data);
      } else {
        this.handleError(res.data?.msg || '服务器错误');
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(`[${requestId}] 请求失败:`, err);
      this.handleError(`网络请求失败: ${err?.errMsg || '未知错误'}`);
    });
  },

  processApiResponse(apiData) {
    try {
      const data = apiData.data || {};
      const result = data.result || {};
      const navTree = data.navTreeData || [];
      
      // 提取书籍和章节标题
      const bookTitle = this.getBookTitleFromNav(navTree);
      const chapterTitle = result.title || '无标题';
      
      // 处理导航树
      const processedNavTree = this.processNavTree(navTree);
      
      // 解析内容
      const contentList = this.parseContent(result.contentList || []);
      
      console.log('处理后的详情数据:', {
        bookTitle,
        chapterTitle,
        navTreeItems: processedNavTree.length,
        contentItems: contentList.length
      });
      
      this.setData({
        bookTitle,
        chapterTitle,
        navTreeData: processedNavTree,
        contentList,
        loading: false
      });
      
    } catch (error) {
      console.error('数据处理失败:', error);
      this.handleError(`数据处理错误: ${error.message}`);
    }
  },

  getBookTitleFromNav(navTree) {
    return (navTree[0]?.label) || '未知书籍';
  },

  processNavTree(navTree) {
    if (!navTree || navTree.length === 0) return [];
    
    const rootNode = navTree[0];
    const currentId = this.data.id;
    
    const hasDirectChapters = rootNode.children && 
                             rootNode.children.length > 0 && 
                             !rootNode.children[0].children;
    
    const categories = hasDirectChapters ? [{
        ...rootNode, 
        id: rootNode.id + '-virtual-category',
        children: []
    }] : rootNode.children;
    
    return categories.map(category => {
      const chapters = hasDirectChapters ? rootNode.children : category.children;
      
      // 检查当前章节是否在此分类下
      const hasActiveChapter = (chapters || []).some(
        chapter => parseInt(chapter.id) === currentId
      );
      
      return {
        id: category.id,
        label: hasDirectChapters ? '' : category.label,
        isExpanded: hasActiveChapter,
        children: (chapters || []).map(chapter => ({
          id: chapter.id,
          label: chapter.label,
          isActive: parseInt(chapter.id) === currentId
        }))
      };
    });
  },

  parseContent(contentList) {
    return contentList.map(item => ({
      ancientContent: item.ancientContent || "",
      modernContent: item.modernContent || ""
    })).filter(item => {
      // 过滤空内容
      const hasAncient = item.ancientContent && item.ancientContent.trim().length > 0;
      const hasModern = item.modernContent && item.modernContent.trim().length > 0;
      return hasAncient || hasModern;
    });
  },

  selectChapter(e) {
    const chapterId = e.currentTarget.dataset.id;
    const chapterIdNum = parseInt(chapterId);
    
    if (chapterIdNum && chapterIdNum !== this.data.id) {
      console.log('选择章节:', chapterIdNum);
      
      this.setData({ 
        id: chapterIdNum,
        loading: true
      }, () => {
        this.fetchChapterData();
        wx.pageScrollTo({ scrollTop: 0, duration: 300 });
      });
    }
  },

  toggleExpand(e) {
    const nodeId = e.currentTarget.dataset.id;
    const newNavTree = this.data.navTreeData.map(node => 
      node.id === nodeId ? 
        {...node, isExpanded: !node.isExpanded} : 
        node
    );
    this.setData({ navTreeData: newNavTree });
  },

  adjustFontSize(e) {
    const size = e.currentTarget.dataset.size;
    this.setData({
      fontSize: Math.max(24, Math.min(40, 
        this.data.fontSize + (size === '+' ? 2 : -2)
      ))
    });
  },

  toggleNightMode() {
    const newMode = !this.data.nightMode;
    this.setData({ nightMode: newMode });
    
    wx.setNavigationBarColor({
      frontColor: newMode ? '#ffffff' : '#000000',
      backgroundColor: newMode ? '#1a1a1a' : '#ffffff'
    });
  },

  handleError(msg) {
    console.error('详情页错误:', msg);
    this.setData({ 
      error: msg || '请求失败',
      loading: false 
    });
  },
  
  showFatalError(msg) {
    this.setData({
      error: msg,
      loading: false
    });
    
    wx.showModal({
      title: '初始化失败',
      content: msg || '页面无法加载',
      showCancel: false,
      confirmText: '返回',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack();
        }
      }
    });
  },

  retryLoad() {
    if (this.data.id) {
      this.fetchChapterData();
    }
  },
  
  // 新增文章详情页分享功能（好友分享）
  onShareAppMessage() {
    return {
      title: `${this.data.chapterTitle} | ${this.data.bookTitle}`,
      path: `/pages/ArticleDetail/ArticleDetail?id=${this.data.id}`,
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png',
      
      // 添加回调用于追踪分享行为
      complete(res) {
        if (res.shareTickets) {
          console.log('分享成功，分享卡片ID:', res.shareTickets[0]);
        }
      }
    }
  },
  
  // 新增文章详情页朋友圈分享功能
  onShareTimeline() {
    return {
      title: `${this.data.chapterTitle} - ${this.data.bookTitle}`,
      query: `id=${this.data.id}`,
      imageUrl: 'https://newlan.oss-cn-shanghai.aliyuncs.com/%E7%81%B5%E6%9F%A9%E8%AF%97%E9%89%B4.png'
    }
  }
});