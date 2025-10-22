// pages/ai-chat/ai-chat.js
const app = getApp();

Page({
  data: {
    messageList: [
      {
        role: 'assistant',
        content: '您好！我是德烁财务报销助手，请问有什么可以帮您？',
        timestamp: new Date().getTime()
      }
    ],
    inputValue: '',
    isLoading: false,
    isGeneratingQR: false,
    isStreaming: false,
    streamingContent: '',
    streamingMessageIndex: -1,
    scrollToView: '',
    inputBoxBottom: 0,
    keyboardHeight: 0,
    currentConversationId: '',
    showHistoryPanel: false,
    chatHistoryList: [],
    qrCodeUrl: '',
    localQRCodePath: '',
    showShareGuide: false
  },

  // 处理流式响应 - 修改为实时格式化
  handleStreamingResponse: function(chunks) {
    const that = this;
    let currentIndex = 0;
    let accumulatedContent = ''; // 累积内容用于实时格式化
    
    if (this.streamingTimer) {
      clearInterval(this.streamingTimer);
    }
    
    this.streamingTimer = setInterval(() => {
      if (currentIndex < chunks.length) {
        const chunk = chunks[currentIndex];
        currentIndex++;
        
        // 累积内容
        accumulatedContent += chunk;
        
        // 实时格式化当前累积的内容
        const formattedContent = this.formatAIResponseIncremental(accumulatedContent);
        
        const updatedList = [...that.data.messageList];
        if (updatedList[that.data.streamingMessageIndex]) {
          updatedList[that.data.streamingMessageIndex].content = formattedContent;
          that.setData({ 
            messageList: updatedList,
            streamingContent: accumulatedContent
          });
          that.scrollToBottom();
        }
      } else {
        clearInterval(that.streamingTimer);
        
        // 最终格式化确保完整性
        const finalContent = that.formatAIResponse(that.data.streamingContent);
        const finalMessage = { 
          role: 'assistant', 
          content: finalContent, 
          timestamp: new Date().getTime() 
        };
        
        let updatedList = [...that.data.messageList];
        if (updatedList[that.data.streamingMessageIndex]) {
          updatedList[that.data.streamingMessageIndex] = finalMessage;
        }

        that.setData({ 
          messageList: updatedList,
          isLoading: false, 
          isStreaming: false 
        });
        
        that.saveChatHistory();
        that.scrollToBottom();
      }
    }, 50);
  },

  // 增量格式化AI回复 - 用于流式输出过程中的实时格式化
  formatAIResponseIncremental: function(content) {
    if (!content) return '';
    
    // 实时检测并格式化内容
    return this.detectAndFormatContent(content);
  },

  // 检测并格式化内容 - 实时处理
  detectAndFormatContent: function(content) {
    // 如果内容很短，直接返回原始内容
    if (content.length < 10) {
      return this.escapeAndFormat(content);
    }
    
    // 检测是否包含项目格式
    if (content.includes('项目：') && content.includes('申报依据：')) {
      return this.formatContentIncremental(content);
    }
    
    // 默认格式化
    return this.escapeAndFormat(content);
  },

  // 增量格式化内容 - 实时处理项目格式
  formatContentIncremental: function(content) {
    // 分割内容为行
    const lines = content.split('\n').filter(line => line.trim());
    let formattedHtml = '';
    let currentProject = '';
    let currentDeclare = '';
    
    lines.forEach(line => {
      // 检测项目行
      if (line.includes('项目：') && line.includes('申报依据：')) {
        const projectMatch = line.match(/项目：([^，]+)/);
        const declareMatch = line.match(/申报依据：([^，]+)/);
        
        if (projectMatch && declareMatch) {
          // 如果已经有项目内容，先格式化之前的
          if (currentProject || currentDeclare) {
            formattedHtml += this.formatProjectAndDeclare(currentProject, currentDeclare);
            formattedHtml += '<br>';
          }
          
          currentProject = projectMatch[1].trim();
          currentDeclare = declareMatch[1].trim();
          
          // 实时格式化当前项目
          formattedHtml += this.formatProjectAndDeclare(currentProject, currentDeclare);
        }
      } 
      // 如果只有项目开头，先显示部分内容
      else if (line.includes('项目：')) {
        const projectMatch = line.match(/项目：([^，]*)/);
        if (projectMatch) {
          currentProject = projectMatch[1].trim();
          formattedHtml += `<span class="highlight-title">项目：</span>
                           <span class="highlight-content">${this.escapeHtml(currentProject)}</span>`;
        }
      }
      // 如果只有申报依据开头，显示部分内容
      else if (line.includes('申报依据：')) {
        const declareMatch = line.match(/申报依据：([^，]*)/);
        if (declareMatch) {
          currentDeclare = declareMatch[1].trim();
          formattedHtml += `<br><span class="highlight-title">申报依据：</span>
                           <span class="highlight-content">${this.escapeHtml(currentDeclare)}</span>`;
        }
      }
      // 其他内容
      else {
        formattedHtml += this.escapeAndFormat(line) + '<br>';
      }
    });
    
    // 处理最后未完成的项目
    if ((currentProject || currentDeclare) && !formattedHtml.includes(currentProject)) {
      formattedHtml += this.formatProjectAndDeclare(currentProject, currentDeclare);
    }
    
    return formattedHtml || this.escapeAndFormat(content);
  },

  // 获取AI回复
  getAIResponseReal: function (question) {
    const that = this;
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'askAI',
        data: {
          question: question,
          conversation_id: that.data.currentConversationId
        },
        success: (res) => {
          console.log('云函数完整响应:', res);
          
          if (res.result?.code === 200) {
            if (res.result.data.conversation_id) {
              that.setData({ currentConversationId: res.result.data.conversation_id });
            }
            
            console.log("API回复数据:", res.result.data);
            
            // 优先使用answer字段进行格式化
            const answerData = res.result.data.answer;
            if (answerData) {
              console.log("检测到answer字段:", answerData);
              
              // 将answer内容分割成字符数组进行流式显示
              const charArray = answerData.split('');
              that.handleStreamingResponse(charArray);
            } else {
              // 如果没有answer字段，使用chunks
              const chunks = res.result.data.chunks || [];
              if (chunks.length > 0) {
                that.handleStreamingResponse(chunks);
              } else {
                // 如果没有数据，显示错误
                reject(new Error('API返回数据为空'));
              }
            }
            resolve();
          } else {
            console.error('API返回错误:', res.result);
            let errorMsg = res.result.message || 'API返回格式异常';
            reject(new Error(errorMsg));
          }
        },
        fail: (err) => { 
          console.error('云函数调用失败:', err);
          reject(new Error('网络请求失败，请检查网络连接'));
        }
      });
    });
  },

  // 格式化AI回复 - 最终格式化
  formatAIResponse: function(content) {
    if (!content) return '未知回复';

    console.log('格式化前的内容:', content);
    
    if (typeof content === 'string') {
      return this.formatPlainTextResponse(content);
    }
    
    return this.formatJsonResponse(content);
  },

  // 处理纯文本格式 - 最终完整格式化
  formatPlainTextResponse: function(content) {
    console.log('开始格式化纯文本内容:', content);
    
    // 方法1：修复正则表达式 - 匹配图片中的格式
    const projectPattern = /项目：([^，]+)，申报依据：([^项]+?)(?=\s*项目：|$)/g;
    const matches = [];
    let match;
    
    while ((match = projectPattern.exec(content)) !== null) {
      console.log('正则匹配成功:', match);
      matches.push({
        project: match[1].trim(),
        declare: match[2].trim()
      });
    }
    
    if (matches.length > 0) {
      console.log('找到项目匹配:', matches);
      let html = '';
      
      matches.forEach((item, index) => {
        if (index > 0) {
          html += '<hr style="margin: 15px 0; border: 0; border-top: 1px dashed #dadce0;">';
        }
        
        html += `<div style="margin-bottom: 15px;">`;
        if (matches.length > 1) {
          html += `<span style="color: #5f6368; font-size: 14px; font-weight: 500;">方案 ${index + 1}</span><br>`;
        }
        
        html += this.formatProjectAndDeclare(item.project, item.declare);
        html += `</div>`;
      });
      
      console.log('生成的HTML:', html);
      return html;
    }
    
    console.log('正则匹配失败，尝试备选方法');
    
    // 方法2：备选匹配方案 - 更宽松的正则
    const altPattern = /项目：([^，]+)，申报依据：([^，]+)/g;
    const altMatches = [];
    let altMatch;
    
    while ((altMatch = altPattern.exec(content)) !== null) {
      altMatches.push({
        project: altMatch[1].trim(),
        declare: altMatch[2].trim()
      });
    }
    
    if (altMatches.length > 0) {
      console.log('备选方法找到匹配:', altMatches);
      let html = '';
      
      altMatches.forEach((item, index) => {
        if (index > 0) {
          html += '<hr style="margin: 15px 0; border: 0; border-top: 1px dashed #dadce0;">';
        }
        
        html += `<div style="margin-bottom: 15px;">`;
        html += this.formatProjectAndDeclare(item.project, item.declare);
        html += `</div>`;
      });
      
      return html;
    }
    
    // 方法3：手动分割处理
    if (content.includes('项目：') && content.includes('申报依据：')) {
      console.log('使用手动分割方法');
      const parts = content.split('项目：').filter(part => part.trim());
      
      if (parts.length > 1) {
        let html = '';
        
        parts.forEach((part, index) => {
          if (part.trim() && index > 0) {
            if (index > 1) {
              html += '<hr style="margin: 15px 0; border: 0; border-top: 1px dashed #dadce0;">';
            }
            
            html += `<div style="margin-bottom: 15px;">`;
            
            // 提取项目和申报依据
            const projectEnd = part.indexOf('，');
            const declareStart = part.indexOf('申报依据：');
            
            let project = '';
            let declare = '';
            
            if (projectEnd > 0) {
              project = part.substring(0, projectEnd).trim();
            }
            
            if (declareStart > 0) {
              declare = part.substring(declareStart + 5).trim(); // +5 去掉"申报依据："
            }
            
            html += this.formatProjectAndDeclare(project, declare);
            html += `</div>`;
          }
        });
        
        return html || this.escapeAndFormat(content);
      }
    }
    
    console.log('所有方法都失败，使用默认格式化');
    return this.escapeAndFormat(content);
  },

  // 处理JSON格式
  formatJsonResponse: function(jsonObj) {
    if (jsonObj.results && Array.isArray(jsonObj.results)) {
      if (jsonObj.results.length > 0) {
        return this.formatResultsArray(jsonObj.results);
      } else {
        return this.handleEmptyResults(jsonObj);
      }
    }
    
    if (jsonObj.project !== undefined || jsonObj.declare !== undefined) {
      const projectValue = jsonObj.project || '';
      const declareValue = jsonObj.declare || '';
      
      if (projectValue || declareValue) {
        return this.formatProjectAndDeclare(projectValue, declareValue);
      }
    }

    const usefulInfo = this.extractUsefulInfo(jsonObj);
    if (usefulInfo) return usefulInfo;

    return this.escapeAndFormat(JSON.stringify(jsonObj));
  },

  // 格式化项目数组
  formatResultsArray: function(resultsArray) {
    if (!Array.isArray(resultsArray) || resultsArray.length === 0) {
      return '暂无相关信息';
    }

    let html = '';
    
    resultsArray.forEach((result, index) => {
      const projectValue = result.project || '';
      const declareValue = result.declare || '';
      
      if (projectValue || declareValue) {
        if (index > 0) {
          html += '<hr style="margin: 15px 0; border: 0; border-top: 1px dashed #dadce0;">';
        }
        
        html += `<div style="margin-bottom: 15px;">`;
        if (resultsArray.length > 1) {
          html += `<span style="color: #5f6368; font-size: 14px; font-weight: 500;">方案 ${index + 1}</span><br>`;
        }
        
        html += this.formatProjectAndDeclare(projectValue, declareValue);
        html += `</div>`;
      }
    });
    
    return html || '暂无相关信息';
  },

  // 格式化单个项目和申报依据 - 高亮显示
  formatProjectAndDeclare: function(project, declare) {
    let html = '';
    if (project) {
      html += `<span class="highlight-title">项目：</span>
               <span class="highlight-content">${this.escapeHtml(project)}</span><br>`;
    }
    if (declare) {
      html += `<span class="highlight-title">申报依据：</span>
               <span class="highlight-content">${this.escapeHtml(declare)}</span>`;
    }
    return html || '暂无相关信息';
  },

  // 处理空结果
  handleEmptyResults: function(jsonObj) {
    if (jsonObj.answer && typeof jsonObj.answer === 'string') {
      return this.escapeAndFormat(jsonObj.answer);
    }
    
    const answerFields = ['text', 'message', 'content', 'response', 'info', 'suggestion'];
    for (let field of answerFields) {
      if (jsonObj[field] && typeof jsonObj[field] === 'string') {
        return this.escapeAndFormat(jsonObj[field]);
      }
    }
    
    return '抱歉，我没有找到相关的报销项目信息。请尝试提供更详细的信息或咨询财务部门。';
  },

  // 提取有用信息
  extractUsefulInfo: function(jsonObj) {
    const possibleFields = ['text', 'message', 'answer', 'content', 'response', 'info', 'suggestion'];
    
    for (let field of possibleFields) {
      if (jsonObj[field] && typeof jsonObj[field] === 'string') {
        return this.escapeAndFormat(jsonObj[field]);
      }
    }
    
    return null;
  },

  // HTML转义
  escapeHtml: function(text) {
    if (typeof text !== 'string') return text;
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  },

  // 转义处理
  escapeAndFormat: function(content) {
    if (typeof content !== 'string') {
      try {
        content = JSON.stringify(content, null, 2);
      } catch (e) {
        content = String(content);
      }
    }
    
    return content
      .replace(/\\n/g, '<br>')
      .replace(/\\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
      .replace(/\\r/g, '')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\n/g, '<br>')
      .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
  },

  // 发送消息
  sendMessage: function () {
    const that = this;
    const question = this.data.inputValue.trim();

    if (!question) { 
      wx.showToast({ title: '消息不能为空', icon: 'none' }); 
      return; 
    }
    if (this.data.isLoading) return;

    const userMessage = { 
      role: 'user', 
      content: question, 
      timestamp: new Date().getTime() 
    };
    const newMessageList = [...that.data.messageList, userMessage];

    const aiPlaceholder = {
      role: 'assistant',
      content: '',
      timestamp: new Date().getTime(),
      isThinking: true
    };
    const newListWithPlaceholder = [...newMessageList, aiPlaceholder];
    const placeholderIndex = newListWithPlaceholder.length - 1;

    this.setData({
      messageList: newListWithPlaceholder,
      inputValue: '',
      isLoading: true,
      isStreaming: true,
      streamingContent: '',
      streamingMessageIndex: placeholderIndex
    });

    this.scrollToBottom();

    this.getAIResponseReal(question)
      .catch(err => {
        console.error('AI回复获取失败:', err);
        this.handleError(err.message || '请求失败，请重试');
      });
  },

  // 处理错误
  handleError: function (errorMsg = '请求失败，请重试') {
    this.setData({ 
      isLoading: false, 
      isStreaming: false,
      streamingContent: '' 
    });
    
    const errorMessage = {
      role: 'assistant',
      content: `抱歉，出现错误：${errorMsg}`,
      timestamp: new Date().getTime(),
      isError: true
    };
    
    this.setData({ 
      messageList: [...this.data.messageList, errorMessage] 
    });
    
    if (errorMsg.includes('400') || errorMsg.includes('参数')) {
      wx.showToast({ 
        title: '请求参数有误，请重新尝试', 
        icon: 'none',
        duration: 3000 
      });
    } else if (errorMsg.includes('网络') || errorMsg.includes('连接')) {
      wx.showToast({ 
        title: '网络连接异常，请检查网络', 
        icon: 'none',
        duration: 3000 
      });
    } else if (errorMsg.includes('503')) {
      wx.showToast({ 
        title: 'AI服务暂时不可用，请稍后再试', 
        icon: 'none',
        duration: 3000 
      });
    } else {
      wx.showToast({ 
        title: errorMsg, 
        icon: 'none',
        duration: 3000 
      });
    }
    
    this.scrollToBottom();
  },

  onLoad: function (options) {
    this.loadChatHistory();
    this.loadHistoryList();
    this.initKeyboardListener();
  },

  onUnload: function () {
    wx.offKeyboardHeightChange();
    if (this.streamingTimer) {
      clearInterval(this.streamingTimer);
    }
  },

  // 初始化键盘监听
  initKeyboardListener: function () {
    const that = this;
    wx.onKeyboardHeightChange(res => {
      const height = res.height;
      height > 0 ? that.onKeyboardShow(height) : that.onKeyboardHide();
    });
  },

  onKeyboardShow: function(height) {
    this.setData({ inputBoxBottom: height, keyboardHeight: height });
    this.scrollToBottom();
  },

  onKeyboardHide: function() {
    this.setData({ inputBoxBottom: 0, keyboardHeight: 0 });
  },

  onInputFocus: function() { this.scrollToBottom(); },
  onInputBlur: function() {},
  onInput: function (e) { this.setData({ inputValue: e.detail.value }); },

  // 历史记录面板控制
  showHistory: function() {
    this.loadHistoryList();
    this.setData({ showHistoryPanel: true });
  },
  hideHistory: function() {
    this.setData({ showHistoryPanel: false });
  },

  // 加载历史记录列表
  loadHistoryList: function() {
    try {
      const history = wx.getStorageSync('chatHistoryList') || [];
      this.setData({ chatHistoryList: history });
    } catch (err) {
      console.error('加载历史记录失败:', err);
    }
  },

  // 加载指定历史记录
  loadHistory: function(e) {
    const index = e.currentTarget.dataset.index;
    const history = this.data.chatHistoryList[index];
    if (history?.messages) {
      this.setData({
        messageList: history.messages,
        showHistoryPanel: false,
        currentConversationId: history.currentConversationId || ''
      });
      this.saveChatHistory();
      this.scrollToBottom();
    }
  },

  // 生成二维码
  generateQRCode: function() {
    const that = this;
    if (this.data.isGeneratingQR) return;
  
    this.setData({ isGeneratingQR: true });
    wx.showLoading({ title: '生成二维码中...', mask: true });
  
    wx.cloud.callFunction({
      name: 'AIcode',
      data: {
        path: `pages/ai-chat/ai-chat?scene=share_${Date.now()}`,
        width: 400
      },
      success: (res) => {
        wx.hideLoading();
        that.setData({ isGeneratingQR: false });
  
        if (res.result?.code === 200 && res.result.data.tempFileURL) {
          const cloudQRUrl = res.result.data.tempFileURL;
          that.setData({ qrCodeUrl: cloudQRUrl });
  
          wx.downloadFile({
            url: cloudQRUrl,
            success: (downloadRes) => {
              if (downloadRes.statusCode === 200) {
                that.setData({ localQRCodePath: downloadRes.tempFilePath });
                wx.previewImage({
                  urls: [cloudQRUrl],
                  current: cloudQRUrl,
                  fail: () => wx.showToast({ title: '预览二维码失败', icon: 'none' })
                });
              } else {
                wx.showToast({ title: '下载二维码失败', icon: 'none' });
                that.setData({ qrCodeUrl: '', localQRCodePath: '' });
              }
            },
            fail: () => {
              wx.showToast({ title: '下载二维码失败', icon: 'none' });
                that.setData({ qrCodeUrl: '', localQRCodePath: '' });
            }
          });
        } else {
          wx.showToast({ title: res.result?.message || '生成二维码失败', icon: 'none' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        that.setData({ isGeneratingQR: false });
        console.error('生成二维码云函数调用失败:', err);
        wx.showToast({ title: '网络异常，生成失败', icon: 'none' });
      }
    });
  },

  // 关闭二维码预览
  closeQRCode: function() {
    this.setData({ qrCodeUrl: '', showShareGuide: false });
  },

  // 滚动到底部
  scrollToBottom: function () {
    setTimeout(() => { this.setData({ scrollToView: 'bottom-anchor' }); }, 100);
  },

  // 时间格式化
  formatTime: function (timestamp, format = 'full') {
    const date = new Date(timestamp);
    const now = new Date();
    if (isNaN(date.getTime())) return '未知时间';

    const pad = num => num.toString().padStart(2, '0');
    const hourMin = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

    if (format === 'short') return hourMin;
    if (date.toDateString() === now.toDateString()) return `今天 ${hourMin}`;
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `昨天 ${hourMin}`;
    
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${hourMin}`;
  },

  // 加载聊天历史
  loadChatHistory: function () {
    try {
      const history = wx.getStorageSync('aiChatHistory');
    if (history && Array.isArray(history)) {
      this.setData({ messageList: history });
    }
    } catch (err) {
      console.error('加载聊天历史失败:', err);
    }
  },

  // 保存聊天历史
  saveChatHistory: function () {
    try {
      wx.setStorageSync('aiChatHistory', this.data.messageList);
      
      if (this.data.messageList.length > 1) {
        const historyList = wx.getStorageSync('chatHistoryList') || [];
        let preview = '';

        for (let i = this.data.messageList.length - 1; i >= 0; i--) {
          if (this.data.messageList[i].role === 'user') {
            preview = this.data.messageList[i].content.substring(0, 20) + '...';
            break;
          }
        }

        if (!preview && this.data.messageList.length > 0) {
          preview = this.data.messageList[0].content.substring(0, 20) + '...';
        }

        const historyItem = {
          preview: preview,
          timestamp: Date.now(),
          messages: [...this.data.messageList],
          currentConversationId: this.data.currentConversationId
        };

        const existingIndex = historyList.findIndex(item => item.timestamp === historyItem.timestamp);
        if (existingIndex === -1) {
          historyList.unshift(historyItem);
          if (historyList.length > 20) {
            historyList.pop();
          }
          wx.setStorageSync('chatHistoryList', historyList);
          this.setData({ chatHistoryList: historyList });
        }
      }
    } catch (err) {
      console.error('保存聊天历史失败:', err);
    }
  },

  // 清空聊天历史
  clearChatHistory: function () {
    this.setData({
      messageList: [{
        role: 'assistant',
        content: '您好！我是德烁财务报销助手，请问有什么可以帮您？',
        timestamp: new Date().getTime()
      }],
      currentConversationId: '',
      chatHistoryList: [],
      qrCodeUrl: ''
    });
    
    try {
      wx.removeStorageSync('aiChatHistory');
      wx.removeStorageSync('chatHistoryList');
      wx.showToast({ title: '记录已清空', icon: 'success', duration: 1500 });
    } catch (err) {
      console.error('清空聊天历史失败:', err);
    }
  },

  // 分享功能
  shareToFriend: function() {
    const that = this;
    if (!that.data.qrCodeUrl) {
      wx.showToast({ title: '请先生成二维码', icon: 'none' });
      return;
    }
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage']
    });
  },

  onShareAppMessage: function() {
    const qrUrl = this.data.qrCodeUrl || 'https://newlan.oss-cn-shanghai.aliyuncs.com/AI.jpg';
    return {
      title: '德烁财务报销AI助手',
      path: '/pages/ai-chat/ai-chat?scene=share_' + Date.now(),
      imageUrl: qrUrl,
      success: () => wx.showToast({ title: '分享成功', icon: 'success' }),
      fail: (err) => {
        console.error('分享好友失败:', err);
        wx.showToast({ title: '分享失败，请重试', icon: 'none' });
      }
    };
  },

  onShareTimeline: function() {
    const qrUrl = this.data.qrCodeUrl || 'https://newlan.oss-cn-shanghai.aliyuncs.com/AI.jpg';
    return {
      title: '德烁财务报销AI助手',
      query: 'scene=share_timeline_' + Date.now(),
      imageUrl: qrUrl,
      success: () => wx.showToast({ title: '分享到朋友圈成功', icon: 'success' })
    };
  },

  showShareGuide: function() {
    if (!this.data.qrCodeUrl) {
      wx.showToast({ title: '请先生成二维码', icon: 'none' });
      return;
    }
    this.setData({ showShareGuide: true });
  },

  hideShareGuide: function() {
    this.setData({ showShareGuide: false });
  },

  // 保存二维码
  saveQRCode: function() {
    const that = this;
    if (!that.data.localQRCodePath) {
      wx.showToast({ title: '请先生成二维码', icon: 'none' });
      return;
    }

    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.writePhotosAlbum']) {
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: () => that.saveToAlbumCore(),
            fail: () => {
              wx.showModal({
                title: '需要相册权限',
                content: '请在手机设置中开启相册权限，以便保存二维码',
                confirmText: '去设置',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openSetting({
                      success: (settingRes) => {
                        if (settingRes.authSetting['scope.writePhotosAlbum']) {
                          that.saveToAlbumCore();
                        }
                      }
                    });
                  }
                }
              });
            }
          });
        } else {
          that.saveToAlbumCore();
        }
      }
    });
  },

  saveToAlbumCore: function() {
    const that = this;
    wx.saveImageToPhotosAlbum({
      filePath: that.data.localQRCodePath,
      success: () => {
        wx.showToast({ title: '二维码已保存到相册', icon: 'success' });
      },
      fail: (err) => {
        console.error('保存二维码失败:', err);
        if (err.errMsg.includes('cancel')) {
          wx.showToast({ title: '已取消保存', icon: 'none' });
        } else {
          wx.showToast({ title: '保存失败，请重试', icon: 'none' });
        }
      }
    });
  }
});