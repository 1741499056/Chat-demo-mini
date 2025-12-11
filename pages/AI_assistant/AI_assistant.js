const app = getApp();

Component({
  properties: {
    // 组件属性定义
  },

  data: {
    // 功能轮播图数据
    functions: [
      {
        icon: 'https://newlan.oss-cn-shanghai.aliyuncs.com/v1%E5%8A%9F%E8%83%BD%E8%BD%AE%E6%92%AD%E5%9B%BE/v1-gnt/%E5%8F%A4%E7%B1%8D%E5%A4%A7%E5%85%A8.png',
        text: '古籍大全',
        url: '/pages/guwen/guwen',
        isTabBar: true
      },
      {
        icon: 'https://newlan.oss-cn-shanghai.aliyuncs.com/v1%E5%8A%9F%E8%83%BD%E8%BD%AE%E6%92%AD%E5%9B%BE/v1-gnt/%E5%8F%A4%E8%AF%97%E6%9F%A5%E8%AF%A2.png',
        text: '古诗查询',
        url: '/pages/poem/poem',
        isTabBar: true
      },
      {
        icon: 'https://newlan.oss-cn-shanghai.aliyuncs.com/v1%E5%8A%9F%E8%83%BD%E8%BD%AE%E6%92%AD%E5%9B%BE/v1-gnt/%E8%AF%8D%E8%AF%AD%E6%9F%A5%E8%AF%A2.png',
        text: '词语查询',
        url: '/pages/AI/AI',
        isTabBar: true
      },
      {
        icon: 'https://newlan.oss-cn-shanghai.aliyuncs.com/v1%E5%8A%9F%E8%83%BD%E8%BD%AE%E6%92%AD%E5%9B%BE/v1-gnt/%E8%AF%8D%E8%AF%AD%E7%BB%83%E4%B9%A0.png',
        text: '词语练习',
        url: '/pages/word/word',
        isTabBar: false
      },
      {
        icon: 'https://newlan.oss-cn-shanghai.aliyuncs.com/v1%E5%8A%9F%E8%83%BD%E8%BD%AE%E6%92%AD%E5%9B%BE/v1-gnt/%E6%96%AD%E5%8F%A5%E4%B8%80%E8%A7%88.png',
        text: '断句一览',
        url: '/pages/sentencesegmentation/sentencesegmentation',
        isTabBar: false
      },
      {
        icon: 'https://newlan.oss-cn-shanghai.aliyuncs.com/v1%E5%8A%9F%E8%83%BD%E8%BD%AE%E6%92%AD%E5%9B%BE/v1-gnt/%E6%96%AD%E5%8F%A5%E7%BB%83%E4%B9%A0.png',
        text: '断句练习',
        url: '/pages/sentencetest/sentencetest',
        isTabBar: false
      },
      {
        icon: 'https://newlan.oss-cn-shanghai.aliyuncs.com/v1%E5%8A%9F%E8%83%BD%E8%BD%AE%E6%92%AD%E5%9B%BE/v1-gnt/%E6%AF%8F%E6%97%A5%E4%B8%80%E8%AF%97.png',
        text: '每日一诗',
        url: '/pages/DailyPoem/DailyPoem',
        isTabBar: false
      },
      {
        icon: 'https://newlan.oss-cn-shanghai.aliyuncs.com/v1%E5%8A%9F%E8%83%BD%E8%BD%AE%E6%92%AD%E5%9B%BE/v1-gnt/%E5%86%85%E5%AE%B9%E6%9F%A5%E8%AF%A2.png',
        text: '内容查询',
        url: '/pages/ContentSearch/ContentSearch',
        isTabBar: false
      },
      {
        icon: 'https://newlan.oss-cn-shanghai.aliyuncs.com/v1%E5%8A%9F%E8%83%BD%E8%BD%AE%E6%92%AD%E5%9B%BE/v1-gnt/AI%E5%AF%B9%E8%AF%9D.png',
        text: 'AI对话',
        url: '/pages/AIchat-konwledge/AIchat-konwledge',
        isTabBar: false
      },
      {
        icon: 'https://www.helloimg.com/i/2025/12/09/6936ff3b96898.png',
        text: '高考真题',
        url: '/pages/gaokaoList/gaokaoList',
        isTabBar: false
      }
    ],
    functionPages: [], 
    
    // AI对话相关数据
    messagesHeight: 500,
    autoScroll: true,
    socketTask: null,
    activeConnection: false,
    inputMessage: '',
    messages: [],
    chatIsLoading: false,
    streamingContent: '',
    conversationId: null,
    hasToken: false,
    showLoginPrompt: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    showStreamingThink: true,
    scrollTop: 0,
    streamingThinkContent: '',
    streamingMainContent: '',
    streamingHasThink: false,
    isConnecting: false,
    connectionTimeout: null,
    scrollToView: '',
    lastScrollHeight: 0
  },

  lifetimes: {
    attached() {
      this.handleFunctionPagination();
      this.checkLoginStatus();
      
      // 初始化AI连接
      setTimeout(() => {
        this.connect();
      }, 500);
    },

    detached() {
      // 组件卸载时清理连接
      this.cleanupConnection();
    }
  },

  pageLifetimes: {
    show() {
      this.checkLoginStatus();
      
      // 如果当前在AI助手页面，尝试连接
      if (this.data.hasToken && !this.data.activeConnection) {
        setTimeout(() => {
          this.connect();
        }, 1000);
      }
      
      // 确保布局正确
      setTimeout(() => {
        this.forceScrollToBottom();
      }, 500);
    },

    hide() {
      // 页面隐藏时断开AI连接
      this.disconnect();
    }
  },

  methods: {
    // ==============================================
    // 功能轮播图相关方法
    // ==============================================

    // 处理功能项分页
    handleFunctionPagination() {
      const {functions} = this.data;
      const pageSize = 4;
      const totalPages = Math.ceil(functions.length / pageSize);
      const functionPages = [];

      for(let i = 0; i < totalPages; i++){
        const pageItems = [];
        for(let j = 0; j < pageSize; j++){
          const itemIndex = i * pageSize + j;
          pageItems.push(functions[itemIndex] || null);
        }
        functionPages.push(pageItems);
      }
      this.setData({functionPages});
    },

    // 处理跳转
    handleNavigate(e) {
      const func = e.currentTarget.dataset.func;
      if(!func) return;

      if(app.globalData.isLoggedIn){
        this.directNavigate(func)
      }else{
        app.globalData.targetRoute = {
          path: func.url,
          type: func.isTabBar ? 'tabBar' : 'page'
        };
        wx.navigateTo({
          url: '/pages/login/login?source=index&forceLogin=true',
        })
      }
    },

    // 根据页面类型执行跳转
    directNavigate(func) {
      if(func.isTabBar){
        wx.switchTab({
          url: func.url
        });
      }else{
        wx.navigateTo({
          url: func.url,
        });
      }
    },

    // ==============================================
    // AI对话核心功能
    // ==============================================

    // 跳转到历史记录页面
    navigateToHistoryPage() {
      if (!this.data.hasToken) {
        this.setData({ showLoginPrompt: true });
        return;
      }
      
      wx.navigateTo({
        url: '/pages/AIchat-history/AIchat-history'
      });
    },

    // 检查登录状态
    checkLoginStatus() {
      const storedInfo = wx.getStorageSync('userInfo') || {};
      const globalState = app.globalData;

      if ((globalState.isLoggedIn || (storedInfo && storedInfo.token)) && storedInfo) {
        this.setData({
          hasToken: !!storedInfo.token
        });
      } else {
        this.setData({
          hasToken: false
        });
      }
    },

    // 清理连接资源
    cleanupConnection() {
      if (this.data.connectionTimeout) {
        clearTimeout(this.data.connectionTimeout);
      }
      if (this.data.socketTask) {
        this.data.socketTask.close({ code: 1000 });
      }
      this.setData({
        socketTask: null,
        connectionTimeout: null,
        isConnecting: false
      });
    },

    // WebSocket连接
    connect() {
      if (this.data.isConnecting || this.data.activeConnection) {
        console.log('连接已存在或正在连接中');
        return;
      }
      
      this.checkLoginStatus();
      if (!this.data.hasToken) {
        this.setData({ showLoginPrompt: true });
        return;
      }
      
      this.setData({ isConnecting: true });
      
      const wsUrl = this.getWebSocketUrl();
      
      try {
        const socketTask = wx.connectSocket({
          url: wsUrl,
          header: { 'content-type': 'application/json' },
          fail: (err) => {
            console.error('创建连接失败:', err);
            this.setData({ isConnecting: false });
            this.handleConnectionError('创建连接失败');
          }
        });
        
        // 设置连接超时
        const timeout = setTimeout(() => {
          if (!this.data.activeConnection) {
            socketTask.close({ code: 1000 });
            this.handleConnectionError('连接超时');
          }
        }, 10000);
        
        socketTask.onOpen((res) => {
          clearTimeout(timeout);
          this.setData({
            activeConnection: true,
            isConnecting: false,
            reconnectAttempts: 0,
            socketTask: socketTask
          });
          console.log('WebSocket连接成功');
        });
        
        socketTask.onMessage((res) => {
          try {
            const data = JSON.parse(res.data);
            this.handleDifyMessage(data);
          } catch (error) {
            console.error('解析WebSocket消息错误:', error);
          }
        });
        
        socketTask.onClose((res) => {
          console.log('WebSocket连接关闭:', res);
          this.setData({
            activeConnection: false,
            isConnecting: false,
            chatIsLoading: false,
            streamingContent: '',
            streamingThinkContent: '',
            streamingMainContent: '',
            streamingHasThink: false
          });
          
          if (res.code === 1008) {
            this.handleConnectionError('认证失败，请重新登录');
            this.setData({ showLoginPrompt: true });
          } else if (res.code !== 1000) {
            this.addSystemMessage('连接已断开');
            this.attemptReconnect();
          }
        });
        
        socketTask.onError((error) => {
          console.error('WebSocket错误:', error);
          this.handleConnectionError('连接错误');
        });
        
        this.setData({
          socketTask: socketTask,
          connectionTimeout: timeout
        });
        
      } catch (error) {
        console.error('连接异常:', error);
        this.setData({ isConnecting: false });
        this.handleConnectionError('连接异常');
      }
    },

    // 获取WebSocket地址
    getWebSocketUrl() {
      const protocol = 'wss:';
      const host = 'zhixunshiyun.yezhiqiu.cn';
      const token = wx.getStorageSync('token') || '';
      return `${protocol}//${host}/ws/chat?token=${encodeURIComponent(token)}`;
    },

    // 断开连接
    disconnect() {
      if (this.data.socketTask) {
        this.data.socketTask.close({ code: 1000, reason: '用户主动断开' });
      }
      this.cleanupConnection();
      this.setData({ activeConnection: false });
    },

    // 输入框处理
    onAiInput(e) {
      this.setData({ inputMessage: e.detail.value });
    },

    // 发送消息
    sendAiMessage() {
      const { inputMessage, activeConnection, chatIsLoading, hasToken, conversationId } = this.data;
      
      if (!inputMessage.trim()) {
        wx.showToast({ title: '消息不能为空', icon: 'error' });
        return;
      }
      
      if (!activeConnection) {
        wx.showToast({ title: '未连接到服务器', icon: 'error' });
        this.connect();
        return;
      }
      
      if (chatIsLoading) {
        wx.showToast({ title: '正在生成中，请稍候', icon: 'error' });
        return;
      }
      
      if (!hasToken) {
        this.setData({ showLoginPrompt: true });
        return;
      }
      
      const message = {
        type: 'chat',
        content: inputMessage.trim(),
        userId: 'user-' + Date.now(),
        conversation_id: conversationId,
        timestamp: new Date().toISOString()
      };
      
      this.addMessage('user', inputMessage.trim());
      this.setData({
        inputMessage: '',
        chatIsLoading: true,
        streamingContent: '',
        streamingThinkContent: '',
        streamingMainContent: '',
        streamingHasThink: false,
        showStreamingThink: true,
        autoScroll: true // 发送消息时开启自动滚动
      });
      
      try {
        this.data.socketTask.send({
          data: JSON.stringify(message)
        });
      } catch (error) {
        console.error('发送消息失败:', error);
        wx.showToast({ title: '发送失败', icon: 'error' });
        this.setData({ chatIsLoading: false });
      }
    },

    // 处理服务器消息
    handleDifyMessage(data) {
      switch (data.type) {
        case 'chat_chunk':
          if (data.content) {
            const newContent = this.data.streamingContent + data.content;
            const processed = this.processStreamingContent(newContent);
            
            this.setData({
              streamingContent: newContent,
              streamingThinkContent: processed.thinkContent,
              streamingMainContent: processed.mainContent,
              streamingHasThink: processed.hasThink
            }, () => {
              // 流式输出时持续滚动
              this.scrollToBottom();
            });
          }
          break;
        case 'chat_complete':
          if (this.data.streamingContent) {
            this.addMessage('assistant', this.data.streamingContent);
            this.setData({ 
              streamingContent: '',
              streamingThinkContent: '',
              streamingMainContent: '',
              streamingHasThink: false
            });
          }
          this.setData({ chatIsLoading: false });
          if (data.conversation_id) {
            this.setData({ conversationId: data.conversation_id });
          }
          break;
        case 'error':
          this.addSystemMessage('错误: ' + data.message);
          this.setData({ chatIsLoading: false });
          wx.showToast({ title: data.message || '发生错误', icon: 'error' });
          break;
      }
    },

    // 添加消息到列表
    addMessage(type, content, thinkContent = '', hasThink = false) {
      const messages = [...this.data.messages];
      
      let processedThinkContent = thinkContent;
      let processedMainContent = content;
      let processedHasThink = hasThink;
      
      if (!hasThink && type === 'assistant') {
        const extracted = this.extractThinkContent(content);
        processedMainContent = extracted.mainContent;
        processedThinkContent = extracted.thinkContent;
        processedHasThink = extracted.hasThink;
      }
      
      const displayContent = this.renderMarkdown(processedMainContent);
      const displayThinkContent = this.renderMarkdown(processedThinkContent);
      
      const newMessage = {
        id: Date.now() + '_' + type,
        type,
        content: displayContent,
        thinkContent: displayThinkContent,
        hasThink: processedHasThink,
        showThink: false,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      };
      
      messages.push(newMessage);
      this.setData({ messages }, () => {
        // 使用setTimeout确保DOM更新完成后再滚动
        setTimeout(() => {
          this.forceScrollToBottom();
        }, 100);
      });
    },

    // 添加系统消息
    addSystemMessage(content) {
      const messages = [...this.data.messages];
      messages.push({
        type: 'system',
        content: content,
        time: new Date().toLocaleTimeString()
      });
      this.setData({ messages }, () => {
        this.scrollToBottom();
      });
    },

    // 切换思考过程显示
    toggleThink(e) {
      const index = e.currentTarget.dataset.index;
      const messages = [...this.data.messages];
      if (messages[index] && messages[index].hasThink) {
        messages[index].showThink = !messages[index].showThink;
        this.setData({ messages });
      }
    },

    // 切换流式思考显示
    toggleStreamingThink() {
      this.setData({ 
        showStreamingThink: !this.data.showStreamingThink 
      });
    },

    // 重连逻辑
    attemptReconnect() {
      if (this.data.reconnectAttempts < this.data.maxReconnectAttempts) {
        const reconnectAttempts = this.data.reconnectAttempts + 1;
        const delay = Math.min(1000 * reconnectAttempts, 10000);
        
        this.setData({ reconnectAttempts }, () => {
          console.log(`尝试第${reconnectAttempts}次重连，延迟${delay}ms`);
          setTimeout(() => {
            if (!this.data.activeConnection) {
              this.connect();
            }
          }, delay);
        });
      } else {
        this.addSystemMessage('重连失败，请检查网络连接');
      }
    },

    // 连接错误处理
    handleConnectionError(message) {
      wx.showToast({ title: message, icon: 'error' });
      this.addSystemMessage(message);
      this.setData({ isConnecting: false });
    },

    // Markdown渲染处理
    renderMarkdown(content) {
      if (!content) return '';
      
      return content
        .replace(/^#{1,3}\s+/gm, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/_(.*?)_/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/^[-*+]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        .replace(/^>\s+/gm, '')
        .replace(/\n/g, '\n');
    },

    // 提取思考内容
    extractThinkContent(content) {
      if (!content) return { mainContent: '', thinkContent: '', hasThink: false };
      
      let thinkContent = '';
      let mainContent = content;
      let hasThink = false;
      
      if (content.includes('</think>')) {
        const parts = content.split('</think>');
        if (parts.length > 1) {
          mainContent = parts[1];
          hasThink = true;
          
          const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
          if (thinkMatch && thinkMatch[1]) {
            thinkContent = thinkMatch[1];
          } else {
            thinkContent = parts[0].replace(/<think>/g, '').replace(/<\/think>/g, '').trim();
          }
        }
      }
      
      mainContent = mainContent.replace(/<\|im_end\|>/g, '').replace(/<\|im_start\|>/g, '').trim();
      thinkContent = thinkContent.replace(/<\|im_end\|>/g, '').replace(/<\|im_start\|>/g, '').trim();
      
      return {
        mainContent: mainContent || content,
        thinkContent: thinkContent,
        hasThink: hasThink && thinkContent.length > 0
      };
    },

    // 处理流式内容
    processStreamingContent(content) {
      if (!content) return { thinkContent: '', mainContent: '', hasThink: false };
      
      let thinkContent = '';
      let mainContent = content;
      let hasThink = false;
      
      if (content.includes('</think>')) {
        const parts = content.split('</think>');
        if (parts.length > 1) {
          mainContent = parts[1];
          hasThink = true;
          
          const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
          if (thinkMatch && thinkMatch[1]) {
            thinkContent = thinkMatch[1];
          } else {
            thinkContent = parts[0].replace(/<[^>]+>/g, '').replace(/<\/think>/g, '').trim();
          }
        }
      }
      
      return {
        thinkContent: thinkContent,
        mainContent: mainContent,
        hasThink: hasThink
      };
    },

    // ==============================================
    // AI对话滚动修复方法
    // ==============================================

    // 监听聊天区域滚动
    onChatScroll(e) {
      const { scrollHeight, scrollTop, clientHeight } = e.detail;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      
      // 更新自动滚动状态
      this.setData({ 
        autoScroll: isAtBottom,
        lastScrollHeight: scrollHeight
      });
    },

    // 智能滚动到底部
    scrollToBottom() {
      if (!this.data.autoScroll) return;
      
      this.setData({
        scrollTop: 999999
      });
    },

    // 强制滚动到底部（用于新消息）
    forceScrollToBottom() {
      const query = wx.createSelectorQuery().in(this);
      query.select('#bottomSpacer').boundingClientRect();
      query.exec((res) => {
        if (res[0]) {
          this.setData({
            scrollTop: 999999,
            autoScroll: true
          });
        }
      });
    },

    // ==============================================
    // 登录相关方法
    // ==============================================

    // 去登录
    goToLogin() {
      this.setData({ showLoginPrompt: false });
      app.globalData.targetRoute = null;
      wx.navigateTo({
        url: `/pages/login/login?forceLogin=true&redirect=${encodeURIComponent('/pages/index_v1/index_v1')}`
      });
    },

    // 关闭登录提示
    closeLoginPrompt() {
      this.setData({ showLoginPrompt: false });
    },

    // 停止事件冒泡
    stopPropagation(e) {
      e.stopPropagation(); 
    },

    // ==============================================
    // 组件生命周期方法
    // ==============================================

    // 页面显示时调用
    onPageShow() {
      this.checkLoginStatus();
      
      // 重新连接WebSocket
      if (this.data.hasToken && !this.data.activeConnection) {
        setTimeout(() => {
          this.connect();
        }, 1000);
      }
    },

    // 重新连接如果需要
    reconnectIfNeeded() {
      if (this.data.hasToken && !this.data.activeConnection) {
        this.connect();
      }
    }
  }
})