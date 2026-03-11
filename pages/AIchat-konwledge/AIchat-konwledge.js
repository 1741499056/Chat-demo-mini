// pages/AIchat-konwledge/AIchat-konwledge.js
const app = getApp();

Page({
  data: {
    socket: null,
    activeConnection: false,
    inputMessage: '',
    messages: [],
    isLoading: false,
    streamingContent: '',
    conversationId: null,
    hasToken: false,
    showLoginPrompt: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    showStreamingThink: true,
    scrollTop: 0,
    loadingHistory: false,
    streamingThinkContent: '',
    streamingMainContent: '',
    streamingHasThink: false,
    isConnecting: false,
    connectionTimeout: null,
    socketTask: null
  },

  onLoad(options) {
    this.checkTokenStatus();
    
    if (options.loadHistory === 'true' && options.conversationId) {
      this.setData({
        conversationId: options.conversationId,
        loadingHistory: true
      });
      this.loadHistoryMessages(options.conversationId);
    } else {
      setTimeout(() => {
        this.connect();
        this.addWelcomeMessage(); // 页面加载后添加欢迎消息
      }, 500);
    }
  },

  onUnload() {
    this.cleanupConnection();
  },

  onHide() {
    this.disconnect();
  },

  onShow() {
    if (this.data.hasToken && !this.data.activeConnection) {
      setTimeout(() => {
        this.connect();
      }, 1000);
    }
  },

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

  checkTokenStatus() {
    const token = wx.getStorageSync('token') || '';
    this.setData({ hasToken: !!token });
  },

  loadHistoryMessages(conversationId) {
    if (this.data.isLoading) return;
    
    this.setData({ isLoading: true });
    const token = wx.getStorageSync('token');
    
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'error' });
      this.setData({ isLoading: false, loadingHistory: false });
      return;
    }
    
    wx.request({
      url: `https://zhixunshiyun.yezhiqiu.cn/api/dify/history/conversations/${conversationId}/messages`,
      method: 'GET',
      header: {
        'content-type': 'application/json',
        'token': token
      },
      data: { limit: 50 },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 1) {
          const responseData = res.data.data;
          const historyMessages = Array.isArray(responseData.data) ? responseData.data : [];
          
          if (historyMessages.length > 0) {
            const formattedMessages = this.formatHistoryMessages(historyMessages);
            
            this.setData({
              messages: formattedMessages,
              loadingHistory: false
            }, () => {
              this.scrollToBottom();
            });
          } else {
            this.setData({
              messages: [],
              loadingHistory: false
            });
          }
        } else {
          wx.showToast({ title: res.data.msg || '加载失败', icon: 'error' });
          this.setData({ loadingHistory: false });
        }
      },
      fail: (err) => {
        wx.showToast({ title: '网络错误', icon: 'error' });
        this.setData({ loadingHistory: false });
      },
      complete: () => {
        this.setData({ isLoading: false });
        setTimeout(() => {
          this.connect();
        }, 500);
      }
    });
  },

  formatHistoryMessages(allMessages) {
    const formattedMessages = [];
    
    allMessages.forEach(msg => {
      if (msg.query) {
        formattedMessages.push({
          id: msg.id + '_user',
          type: 'user',
          content: msg.query,
          time: this.formatTime(msg.created_at),
          originalData: msg
        });
      }
      
      if (msg.answer) {
        const { mainContent, thinkContent, hasThink } = this.extractThinkContent(msg.answer);
        if (mainContent) {
          formattedMessages.push({
            id: msg.id + '_assistant',
            type: 'assistant',
            content: mainContent,
            thinkContent: thinkContent,
            hasThink: hasThink,
            showThink: true, // 历史消息默认显示思考部分 ✅
            time: this.formatTime(msg.created_at),
            originalData: msg
          });
        }
      }
    });
    
    return formattedMessages.sort((a, b) => a.originalData.created_at - b.originalData.created_at);
  },
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  },

  renderMarkdown(content) {
    if (!content) return '';
    
    let formatted = content
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
    
    return formatted;
  },

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
          thinkContent = parts[0].replace(/<think>/g, '').replace(/<\/think>/g, '').trim();
        }
      }
    }
    
    return {
      thinkContent: thinkContent,
      mainContent: mainContent,
      hasThink: hasThink
    };
  },

  addMessage(type, content, thinkContent = '', hasThink = false) {
    const messages = this.data.messages;
    
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
      showThink: true, // 默认显示思考部分
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };
    
    messages.push(newMessage);
    this.setData({ messages }, () => {
      this.scrollToBottom();
    });
  },

  // 新增：添加欢迎消息
  addWelcomeMessage() {
    const welcomeMessage = {
      id: 'welcome_' + Date.now(),
      type: 'system',
      content: 'Hi，欢迎来到诗文小驿智能对话界面，你可以问我：',
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      quickQuestions: [
        { id: 1, text: '断句题型怎么得高分' },
        { id: 2, text: '怎样背诵效率最高' }
      ]
    };
    
    this.setData({
      messages: [welcomeMessage]
    }, () => {
      this.scrollToBottom();
    });
  },

  // 新增：处理快捷问题点击
  handleQuickQuestion(e) {
    const question = e.currentTarget.dataset.question;
    this.setData({ inputMessage: question });
    this.sendMessage();
  },

  toggleThink(e) {
    const index = e.currentTarget.dataset.index;
    const messages = this.data.messages;
    if (messages[index] && messages[index].hasThink) {
      messages[index].showThink = !messages[index].showThink;
      this.setData({ messages });
    }
  },

  toggleStreamingThink() {
    this.setData({ 
      showStreamingThink: !this.data.showStreamingThink 
    });
  },

  connect() {
    if (this.data.isConnecting || this.data.activeConnection) {
      console.log('连接已存在或正在连接中');
      return;
    }
    
    this.checkTokenStatus();
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
          isLoading: false,
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

  getWebSocketUrl() {
    const protocol = 'wss:';
    const host = 'zhixunshiyun.yezhiqiu.cn';
    const token = wx.getStorageSync('token') || '';
    this.setData({ hasToken: !!token });
    return `${protocol}//${host}/ws/chat?token=${encodeURIComponent(token)}`;
  },

  disconnect() {
    if (this.data.socketTask) {
      this.data.socketTask.close({ code: 1000, reason: '用户主动断开' });
    }
    this.cleanupConnection();
    this.setData({ activeConnection: false });
  },

  onInput(e) {
    this.setData({ inputMessage: e.detail.value });
  },

  sendMessage() {
    const { inputMessage, activeConnection, isLoading, hasToken, conversationId } = this.data;
    
    if (!inputMessage.trim()) {
      wx.showToast({ title: '消息不能为空', icon: 'error' });
      return;
    }
    
    if (!activeConnection) {
      wx.showToast({ title: '未连接到服务器', icon: 'error' });
      this.connect();
      return;
    }
    
    if (isLoading) {
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
      isLoading: true,
      streamingContent: '',
      streamingThinkContent: '',
      streamingMainContent: '',
      streamingHasThink: false,
      showStreamingThink: true
    });
    
    try {
      this.data.socketTask.send({
        data: JSON.stringify(message)
      });
    } catch (error) {
      console.error('发送消息失败:', error);
      wx.showToast({ title: '发送失败', icon: 'error' });
      this.setData({ isLoading: false });
    }
  },

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
            streamingHasThink: processed.hasThink,
            showStreamingThink: true // 流式消息也默认显示思考部分
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
        this.setData({ isLoading: false });
        if (data.conversation_id) {
          this.setData({ conversationId: data.conversation_id });
        }
        break;
      case 'error':
        this.addSystemMessage('错误: ' + data.message);
        this.setData({ isLoading: false });
        wx.showToast({ title: data.message || '发生错误', icon: 'error' });
        break;
    }
  },

  addSystemMessage(content) {
    const messages = this.data.messages;
    messages.push({
      type: 'system',
      content: content,
      time: new Date().toLocaleTimeString()
    });
    this.setData({ messages }, () => {
      this.scrollToBottom();
    });
  },

  scrollToBottom() {
    this.setData({
      scrollTop: 999999
    });
  },

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

  handleConnectionError(message) {
    wx.showToast({ title: message, icon: 'error' });
    this.addSystemMessage(message);
    this.setData({ isConnecting: false });
  },

  goToLogin() {
    this.setData({ showLoginPrompt: false });
    wx.navigateTo({ url: '/pages/login/login' });
  },
  
  closeLoginPrompt() {
    this.setData({ showLoginPrompt: false });
  },

  goToHistory() {
    if (!this.data.hasToken) {
      wx.showToast({ title: '请先登录', icon: 'error' });
      return;
    }
    wx.navigateTo({
      url: '/pages/AIchat-history/AIchat-history'
    });
  }
});