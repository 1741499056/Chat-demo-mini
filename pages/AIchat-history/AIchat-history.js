// pages/AIchat-history/AIchat-history.js
const app = getApp();

Page({
  data: {
    conversations: [],
    isLoading: false,
    hasMore: true,
    lastId: null,
    limit: 20
  },

  onLoad() {
    this.loadConversations();
  },

  // 加载对话列表
  loadConversations() {
    if (this.data.isLoading) return;

    this.setData({ isLoading: true });

    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'error' });
      this.setData({ isLoading: false });
      return;
    }

    const params = {
      limit: this.data.limit
    };

    if (this.data.lastId) {
      params.last_id = this.data.lastId;
    }

    wx.request({
      url: 'https://zhixunshiyun.yezhiqiu.cn/api/dify/history/conversations',
      method: 'GET',
      header: {
        'content-type': 'application/json',
        'token': token
      },
      data: params,
      success: (res) => {
        console.log('对话列表API响应:', res);
        
        if (res.statusCode === 200) {
          if (res.data.code === 1) {
            const newConversations = res.data.data.data || [];
            console.log('获取到的对话数量:', newConversations.length);
            
            // 为每个对话添加重命名相关状态
            const conversationsWithRenameState = newConversations.map(conv => ({
              ...conv,
              isRenaming: false,
              editingName: conv.name || '',
              originalName: conv.name || ''
            }));
            
            this.setData({
              conversations: this.data.conversations.concat(conversationsWithRenameState),
              hasMore: res.data.data.has_more,
              lastId: newConversations.length > 0 ? newConversations[newConversations.length - 1].id : null
            });
          } else {
            console.error('API返回错误码:', res.data.code, '错误信息:', res.data.msg);
            wx.showToast({ title: res.data.msg || '加载失败', icon: 'error' });
          }
        } else {
          console.error('HTTP错误状态码:', res.statusCode);
          wx.showToast({ title: `服务器错误: ${res.statusCode}`, icon: 'error' });
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', err);
        wx.showToast({ title: '网络错误', icon: 'error' });
      },
      complete: () => {
        this.setData({ isLoading: false });
      }
    });
  },

  // 开始重命名
  startRename(e) {
    const index = e.currentTarget.dataset.index;
    const conversationId = e.currentTarget.dataset.id;
    
    const conversation = this.data.conversations[index];
    if (!conversation) return;
    
    const conversations = this.data.conversations.map((conv, i) => {
      if (i === index) {
        return {
          ...conv,
          isRenaming: true,
          editingName: conv.name || '',
          originalName: conv.name || ''
        };
      }
      return { ...conv, isRenaming: false }; // 关闭其他对话的重命名状态
    });
    
    this.setData({ conversations });
  },

  // 重命名输入处理
  onRenameInput(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    
    const conversations = [...this.data.conversations];
    if (conversations[index]) {
      conversations[index].editingName = value;
      this.setData({ conversations });
    }
  },

  // 确认重命名
  confirmRename(e) {
    const index = e.currentTarget.dataset.index;
    const conversation = this.data.conversations[index];
    
    if (!conversation || !conversation.editingName.trim()) {
      wx.showToast({ title: '请输入有效名称', icon: 'error' });
      return;
    }

    this.renameConversation(conversation.id, conversation.editingName.trim(), index);
  },

  // 取消重命名
  cancelRename(e) {
    const index = e.currentTarget.dataset.index;
    
    const conversations = [...this.data.conversations];
    if (conversations[index]) {
      conversations[index].isRenaming = false;
      conversations[index].editingName = conversations[index].originalName;
      this.setData({ conversations });
    }
  },

  // 调用重命名接口
  renameConversation(conversationId, newName, index) {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'error' });
      return;
    }

    wx.showLoading({ title: '重命名中...' });

    wx.request({
      url: `https://zhixunshiyun.yezhiqiu.cn/api/dify/history/conversations/${conversationId}/rename`,
      method: 'POST',
      header: {
        'content-type': 'application/json',
        'token': token
      },
      data: {
        name: newName,
        auto_generate: false
      },
      success: (res) => {
        wx.hideLoading();
        console.log('重命名API响应:', res);
        
        if (res.statusCode === 200) {
          if (res.data.code === 1) {
            wx.showToast({ title: '重命名成功', icon: 'success' });
            
            // 更新本地数据
            const conversations = [...this.data.conversations];
            if (conversations[index]) {
              conversations[index].name = newName;
              conversations[index].isRenaming = false;
              conversations[index].originalName = newName;
              this.setData({ conversations });
            }
          } else {
            console.error('重命名API返回错误码:', res.data.code, '错误信息:', res.data.msg);
            wx.showToast({ title: res.data.msg || '重命名失败', icon: 'error' });
            
            // 恢复原始名称
            this.cancelRename({ currentTarget: { dataset: { index } } });
          }
        } else {
          console.error('重命名HTTP错误状态码:', res.statusCode);
          wx.showToast({ title: `服务器错误: ${res.statusCode}`, icon: 'error' });
          
          // 恢复原始名称
          this.cancelRename({ currentTarget: { dataset: { index } } });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('重命名网络请求失败:', err);
        wx.showToast({ title: '网络错误', icon: 'error' });
        
        // 恢复原始名称
        this.cancelRename({ currentTarget: { dataset: { index } } });
      }
    });
  },

  // 删除对话
  deleteConversation(e) {
    const index = e.currentTarget.dataset.index;
    const conversationId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条对话记录吗？此操作不可撤销。',
      confirmColor: '#f44336',
      success: (res) => {
        if (res.confirm) {
          this.doDeleteConversation(conversationId, index);
        }
      }
    });
  },

  // 执行删除对话
  doDeleteConversation(conversationId, index) {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'error' });
      return;
    }

    wx.showLoading({ title: '删除中...' });

    wx.request({
      url: `https://zhixunshiyun.yezhiqiu.cn/api/dify/history/conversations/${conversationId}`,
      method: 'DELETE',
      header: {
        'content-type': 'application/json',
        'token': token
      },
      success: (res) => {
        wx.hideLoading();
        console.log('删除API响应:', res);
        
        if (res.statusCode === 200) {
          if (res.data.code === 1) {
            wx.showToast({ title: '删除成功', icon: 'success' });
            
            // 更新本地数据
            const conversations = [...this.data.conversations];
            conversations.splice(index, 1);
            this.setData({ conversations });
          } else {
            console.error('删除API返回错误码:', res.data.code, '错误信息:', res.data.msg);
            wx.showToast({ title: res.data.msg || '删除失败', icon: 'error' });
          }
        } else {
          console.error('删除HTTP错误状态码:', res.statusCode);
          wx.showToast({ title: `服务器错误: ${res.statusCode}`, icon: 'error' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('删除网络请求失败:', err);
        wx.showToast({ title: '网络错误', icon: 'error' });
      }
    });
  },

  // 加载更多
  loadMore() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadConversations();
    }
  },

  // 点击记录跳转到对话页面并加载历史对话
  viewConversationDetail(e) {
    const conversationId = e.currentTarget.dataset.id;
    const conversation = this.data.conversations.find(conv => conv.id === conversationId);
    
    if (conversation) {
      // 跳转到对话页面，并传递对话ID
      wx.navigateTo({
        url: `/pages/AIchat-konwledge/AIchat-konwledge?conversationId=${conversationId}&loadHistory=true`
      });
    }
  },

  // 时间格式化
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now - date;

    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    } else {
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});