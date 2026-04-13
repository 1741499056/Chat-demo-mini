const app = getApp();

Component({
  properties: {},

  data: {
    // 功能数据
    functions: [
      {
        icon: 'https://ai4d-1thcz6r93hx1vs8rj1.oss-cn-shanghai.aliyuncs.com/wx_mini_program_img/%E5%8F%A4%E7%B1%8D%E5%A4%A7%E5%85%A8.png',
        name: '古籍大全',
        url: '/pages/guwen/guwen',
        isTabBar: false 
      },
      {
        icon: 'https://ai4d-1thcz6r93hx1vs8rj1.oss-cn-shanghai.aliyuncs.com/wx_mini_program_img/%E8%AF%97%E6%96%87%E8%83%8C%E8%AF%B5.png',
        name: '古诗查询',
        url: '/pages/poem/poem',
        isTabBar: false
      },
      {
        icon: 'https://ai4d-1thcz6r93hx1vs8rj1.oss-cn-shanghai.aliyuncs.com/wx_mini_program_img/%E8%AF%8D%E8%AF%AD%E6%9F%A5%E8%AF%A2.png',
        name : '词语查询',
        url: '/pages/AI/AI',
        isTabBar: false
      },
      {
        icon: 'https://ai4d-1thcz6r93hx1vs8rj1.oss-cn-shanghai.aliyuncs.com/wx_mini_program_img/2.png',
        name : '词语练习',
        url: '/pages/word/word',
        isTabBar: false
      },
      {
        icon: 'https://ai4d-1thcz6r93hx1vs8rj1.oss-cn-shanghai.aliyuncs.com/wx_mini_program_img/3.png',
        name: '断句一览',
        url: '/pages/sentencesegmentation/sentencesegmentation',
        isTabBar: false
      },
      {
        icon: 'https://ai4d-1thcz6r93hx1vs8rj1.oss-cn-shanghai.aliyuncs.com/wx_mini_program_img/%E6%AF%8F%E6%97%A5%E4%B8%80%E8%AF%97.png',
        name: '每日一诗',
        url: '/pages/DailyPoem/DailyPoem',
        isTabBar: false
      },
      {
        icon: 'https://ai4d-1thcz6r93hx1vs8rj1.oss-cn-shanghai.aliyuncs.com/wx_mini_program_img/%E5%86%85%E5%AE%B9%E6%9F%A5%E8%AF%A2.png',
        name: '内容查询',
        url: '/pages/ContentSearch/ContentSearch',
        isTabBar: false
      },
      {
        icon: 'https://ai4d-1thcz6r93hx1vs8rj1.oss-cn-shanghai.aliyuncs.com/wx_mini_program_img/AI%E5%AF%B9%E8%AF%9D.png',
        name: 'AI对话',
        url: '/pages/AIchat-konwledge/AIchat-konwledge',
        isTabBar: false
      },
      {
        icon: 'https://ai4d-1thcz6r93hx1vs8rj1.oss-cn-shanghai.aliyuncs.com/wx_mini_program_img/4.png',
        name: '高考真题',
        url: '/pages/Type_of_Questions/Type_of_Questions',
        isTabBar: false
      }
    ],
    // 功能块数据
    focusFunctions: [], // 重点功能 (4个)
    minorFunctions: [], // 其他功能 (6个)
    
    // AI对话相关数据
    userName: '',
    userGrade: '',
    suggestionPrompts: [],
    
    socketTask: null,
    activeConnection: false,
    inputMessage: '',
    messages: [],
    chatIsLoading: false,
    streamingContent: '',
    streamingThinkContent: '',
    streamingMainContent: '',
    streamingHasThink: false,
    showStreamingThink: true,
    conversationId: null,
    hasToken: false,
    showLoginPrompt: false,
    isConnecting: false,
    scrollTop: 0,
    autoScroll: true,
    
    // 历史记录
    conversations: [],
    historyIsLoading: false,
    hasMore: true,
    showHistoryPanel: false,

    // 快捷功能输入弹窗状态
    showActionModal: false,
    currentActionType: 'word',
    actionInputValue: ''
  },

  lifetimes: {
    attached() {
      this.initFunctions();
      this.checkLoginStatus();
      setTimeout(() => this.connect(), 500);
    },
    detached() {
      this.disconnect();
    }
  },

  pageLifetimes: {
    show() {
      this.checkLoginStatus();
      if (this.data.hasToken && !this.data.activeConnection) {
        setTimeout(() => this.connect(), 1000);
      }
    },
    hide() {
      this.disconnect();
    }
  },

  methods: {
    // 初始化功能数据
    initFunctions() {
      const allFuncs = this.data.functions;
      // 定义重点功能的名字
      const focusNames = ['词语练习', '断句一览', '古诗查询', '高考真题'];
      
      const focus = [];
      const minor = [];
      
      allFuncs.forEach(item => {
        if (focusNames.includes(item.name)) {
          focus.push(item);
        } else {
          minor.push(item);
        }
      });

      this.setData({
        focusFunctions: focus,
        minorFunctions: minor
      });
    },

    // 处理跳转
    handleNavigate(e) {
      const func = e.currentTarget.dataset.func;
      if(!func) return;

      if(app.globalData.isLoggedIn || this.data.hasToken){
        if(func.isTabBar){
          wx.switchTab({
            url: func.url
          });
        }else{
          wx.navigateTo({
            url: func.url,
          });
        }
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

    // 检查登录状态
    checkLoginStatus() {
      const storedInfo = wx.getStorageSync('userInfo') || {};
      const globalData = app.globalData || {};

      let displayName = storedInfo.username || storedInfo.phone || globalData.userPhone || '同学';
      let userGrade = storedInfo.gradeName || globalData.userGradeName || '初中';

      this.setData({
        hasToken: !!wx.getStorageSync('token'),
        userName: displayName,
        userGrade: userGrade,
        suggestionPrompts: this.getPromptsByGrade(userGrade)
      });
    },

    getPromptsByGrade(grade) {
      const gradeStr = String(grade);
      if (gradeStr.match(/一|二|三|四|五|六|小学/)) {
        return [
          { icon: '🎨', text: '我想画一幅关于“春天”的画，有哪些古诗可以参考？' },
          { icon: '🤔', text: '李白被称为“诗仙”，他小时候发生过什么有趣的故事？' },
          { icon: '🎮', text: '我们要不要玩“飞花令”？比如带“月”字的诗句有哪些？' }
        ];
      } else if (gradeStr.match(/高|必修|选修/)) {
        return [
          { icon: '⚖️', text: '古诗鉴赏题中，常见的“虚实结合”手法该如何分析？' },
          { icon: '🚀', text: '写议论文想提升文采，有哪些充满哲理、格调高雅的宋词？' },
          { icon: '🆚', text: '李白和杜甫如果写同一个题材，他们的风格有什么本质区别？' }
        ];
      }
      return [
        { icon: '✍️', text: '写作文想描写“坚持不懈”的精神，请推荐几句名言。' },
        { icon: '💌', text: '我很想念远方的朋友，送哪句古诗给他最合适？' },
        { icon: '🕰️', text: '如果穿越回宋朝，我在街头会看到哪些词里描写的景象？' }
      ];
    },

    handleSuggestionClick(e) {
      const text = e.currentTarget.dataset.prompt;
      if (!text) return;
      const fullMessage = `我是${this.data.userGrade}的学生，${text}`;
      this.setData({ inputMessage: fullMessage }, () => this.sendAiMessage());
    },

    openActionModal(e) {
      const type = e.currentTarget.dataset.type;
      this.setData({
        showActionModal: true,
        currentActionType: type,
        actionInputValue: ''
      });
    },

    closeActionModal() {
      this.setData({ showActionModal: false });
    },

    onActionInput(e) {
      this.setData({ actionInputValue: e.detail.value });
    },

    confirmActionSearch() {
      const { currentActionType, actionInputValue } = this.data;
      if (!actionInputValue.trim()) {
        wx.showToast({ title: '请输入内容', icon: 'none' });
        return;
      }

      let prompt = '';
      if (currentActionType === 'word') {
        prompt = `请详细解释古诗词中的“${actionInputValue}”。\n要求：\n1. 给出详细的字词释义；\n2. 列举2-3个包含该词的著名诗句作为例证；\n3. 解析该词在古诗文中通常象征的意象或情感（拓展延伸）。`;
      } else {
        prompt = `请翻译并赏析诗句“${actionInputValue}”。\n要求：\n1. 给出通俗易懂的白话文翻译；\n2. 重点字词解释；\n3. 赏析句子的修辞手法及表达的情感；\n4. 拓展介绍该诗句的出处背景。`;
      }

      this.setData({ showActionModal: false });
      this.setData({ inputMessage: prompt }, () => {
        this.sendAiMessage();
      });
    },

    connect() {
      if (this.data.isConnecting || this.data.activeConnection) return;
      
      const token = wx.getStorageSync('token');
      if (!token) return;
      
      this.setData({ isConnecting: true });
      
      const wsUrl = `wss://zhixunshiyun.yezhiqiu.cn/ws/chat?token=${encodeURIComponent(token)}`;
      
      const socketTask = wx.connectSocket({
        url: wsUrl,
        header: { 'content-type': 'application/json' },
        fail: () => {
          this.setData({ isConnecting: false });
        }
      });
      
      socketTask.onOpen(() => {
        this.setData({ activeConnection: true, isConnecting: false, socketTask });
      });
      
      socketTask.onMessage((res) => {
        try {
          const data = JSON.parse(res.data);
          this.handleDifyMessage(data);
        } catch (e) { console.error(e); }
      });
      
      socketTask.onClose((res) => {
        this.setData({
          activeConnection: false, isConnecting: false, chatIsLoading: false,
          streamingContent: '', streamingThinkContent: '', streamingMainContent: ''
        });
        if (res.code === 1008) {
          this.setData({ showLoginPrompt: true, hasToken: false });
        }
      });
      
      socketTask.onError(() => {
        this.setData({ isConnecting: false });
      });
    },

    disconnect() {
      if (this.data.socketTask) {
        this.data.socketTask.close({ code: 1000 });
      }
      this.setData({ activeConnection: false, isConnecting: false, socketTask: null });
    },

    onAiInput(e) {
      this.setData({ inputMessage: e.detail.value });
    },

    sendAiMessage() {
      const { inputMessage, activeConnection, chatIsLoading, hasToken, conversationId } = this.data;
      if (!inputMessage.trim()) {
        wx.showToast({ title: '消息不能为空', icon: 'error' });
        return;
      }
      if (!hasToken) { 
        this.setData({ showLoginPrompt: true }); 
        return; 
      }
      if (!activeConnection) { 
        this.connect(); 
        wx.showToast({ title: '正在连接...', icon: 'none' }); 
        return; 
      }
      if (chatIsLoading) {
        wx.showToast({ title: '正在生成中，请稍候', icon: 'error' });
        return;
      }
      
      const msgContent = inputMessage.trim();
      this.addMessage('user', msgContent);
      
      this.setData({
        inputMessage: '',
        chatIsLoading: true,
        streamingContent: '',
        streamingThinkContent: '',
        streamingMainContent: '',
        streamingHasThink: false,
        showStreamingThink: true,
        autoScroll: true 
      });
      
      this.data.socketTask.send({
        data: JSON.stringify({
          type: 'chat',
          content: msgContent,
          conversation_id: conversationId,
          timestamp: new Date().toISOString()
        })
      });
      
      this.scrollToBottom();
    },

    handleDifyMessage(data) {
      if (data.type === 'chat_chunk') {
        const newContent = this.data.streamingContent + data.content;
        const processed = this.processStreamingContent(newContent);
        
        this.setData({
          streamingContent: newContent,
          streamingThinkContent: processed.thinkContent,
          streamingMainContent: processed.mainContent,
          streamingHasThink: processed.hasThink
        });
        this.scrollToBottom();
      } else if (data.type === 'chat_complete') {
        if (this.data.streamingContent) {
          this.addMessage('assistant', this.data.streamingContent);
        }
        this.setData({ 
          chatIsLoading: false,
          streamingContent: '',
          streamingThinkContent: '',
          streamingMainContent: '',
          conversationId: data.conversation_id || this.data.conversationId
        });
      } else if (data.type === 'error') {
        wx.showToast({ title: data.message || 'Error', icon: 'error' });
        this.setData({ chatIsLoading: false });
      }
    },

    processStreamingContent(content) {
      if (!content) return { thinkContent: '', mainContent: '', hasThink: false };
      
      let thinkContent = '';
      let mainContent = content;
      let hasThink = false;
      
      const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
      if (thinkMatch) {
        hasThink = true;
        thinkContent = thinkMatch[1];
        mainContent = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
      } else if (content.includes('<think>')) {
        hasThink = true;
        thinkContent = content.replace('<think>', '');
        mainContent = '';
      }
      
      mainContent = mainContent.replace(/\*\*(.*?)\*\*/g, '$1'); 

      return { thinkContent, mainContent, hasThink };
    },

    addMessage(type, content) {
      const processed = type === 'assistant' ? this.processStreamingContent(content) : { mainContent: content, hasThink: false };
      
      const newMsg = {
        id: Date.now() + Math.random(),
        type,
        content: processed.mainContent,
        thinkContent: processed.thinkContent,
        hasThink: processed.hasThink,
        showThink: false,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      };
      
      this.setData({ messages: [...this.data.messages, newMsg] }, () => {
        this.forceScrollToBottom();
      });
    },

    toggleThink(e) {
      const index = e.currentTarget.dataset.index;
      const key = `messages[${index}].showThink`;
      this.setData({ [key]: !this.data.messages[index].showThink });
    },

    toggleStreamingThink() {
      this.setData({ showStreamingThink: !this.data.showStreamingThink });
    },

    scrollToBottom() {
      if (this.data.autoScroll) {
        this.setData({ scrollTop: 999999 });
      }
    },
    
    onChatScroll(e) {
      const { scrollHeight, scrollTop, clientHeight } = e.detail;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      
      this.setData({ 
        autoScroll: isAtBottom
      });
    },

    forceScrollToBottom() {
      this.setData({ scrollTop: 999999, autoScroll: true });
    },

    toggleHistoryPanel() {
      this.setData({ showHistoryPanel: !this.data.showHistoryPanel });
      if (this.data.showHistoryPanel && this.data.conversations.length === 0) {
        this.loadConversations();
      }
    },

    loadConversations() {
      const token = wx.getStorageSync('token');
      if (!token) return;

      this.setData({ historyIsLoading: true });
      wx.request({
        url: 'https://zhixunshiyun.yezhiqiu.cn/api/dify/history/conversations',
        header: { 'token': token },
        data: { limit: 20 },
        success: (res) => {
          if (res.data.code === 1) {
            this.setData({ conversations: res.data.data.data || [] });
          }
        },
        complete: () => this.setData({ historyIsLoading: false })
      });
    },

    loadMoreHistory() {},

    deleteConversation(e) {
      const { id, index } = e.currentTarget.dataset;
      const token = wx.getStorageSync('token');
      
      wx.showModal({
        title: '确认删除',
        content: '删除后无法恢复',
        success: (res) => {
          if (res.confirm) {
            wx.request({
              url: `https://zhixunshiyun.yezhiqiu.cn/api/dify/history/conversations/${id}`,
              method: 'DELETE',
              header: { 'token': token },
              success: () => {
                const list = [...this.data.conversations];
                list.splice(index, 1);
                this.setData({ conversations: list });
                if (this.data.conversationId === id) {
                  this.setData({ messages: [], conversationId: null });
                }
              }
            });
          }
        }
      });
    },

    viewConversationDetail(e) {
      const id = e.currentTarget.dataset.id;
      this.setData({ showHistoryPanel: false, chatIsLoading: true, messages: [] });
      
      const token = wx.getStorageSync('token');
      wx.request({
        url: `https://zhixunshiyun.yezhiqiu.cn/api/dify/history/conversations/${id}/messages`,
        header: { 'token': token },
        success: (res) => {
          if (res.data.code === 1) {
            const raw = res.data.data.data || [];
            const formatted = [];
            raw.forEach(msg => {
              if (msg.query) formatted.push({ type: 'user', content: msg.query, time: this.formatTime(msg.created_at) });
              if (msg.answer) {
                 const processed = this.processStreamingContent(msg.answer);
                 formatted.push({ 
                   type: 'assistant', 
                   content: processed.mainContent, 
                   thinkContent: processed.thinkContent,
                   hasThink: processed.hasThink,
                   showThink: false,
                   time: this.formatTime(msg.created_at) 
                 });
              }
            });
            this.setData({ messages: formatted.reverse(), conversationId: id });
          }
        },
        complete: () => this.setData({ chatIsLoading: false })
      });
    },

    formatTime(ts) {
      const date = new Date(ts * 1000);
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    },

    handleClosePanel() {
      this.setData({ showHistoryPanel: false });
    },
    
    stopPropagation() {},
    
    goToLogin() {
      this.setData({ showLoginPrompt: false });
      app.globalData.targetRoute = null;
      wx.navigateTo({ url: '/pages/login/login?forceLogin=true' });
    },
    
    closeLoginPrompt() {
      this.setData({ showLoginPrompt: false });
    }
  }
});
