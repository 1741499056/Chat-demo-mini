// my.js
const app = getApp();

// 🌟 引入全新的递归执行器 (注意这里的导入名变了)
import { runAgentLoop } from '../../utils/agent/executor.js'; 

Component({
  properties: {
    userInfo: { type: Object, value: { nickname: '未登录', username: '' } },
    isLoggedIn: { type: Boolean, value: false },
    currentGrade: { type: String, value: '' },
    currentGradeId: { type: Number, value: null },
    gradeList: { type: Array, value: [] }
  },

  data: {
    searchKeyword: "", 
    isSearching: false, 
    agentStatusText: "" // 用于存放 Agent 当前执行的动作文案
  },

  methods: {
    onInput: function(e) {
      this.setData({ searchKeyword: e.detail.value });
    },

    doSearch: function() {
      const keyword = this.data.searchKeyword.trim();
      if (!keyword) {
        wx.showToast({ title: '请输入古诗名', icon: 'none' });
        return;
      }
      this.autoSearchAndJump(keyword);
    },

    // 🌟 Agent 核心接管逻辑 (彻底抛弃静态数组)
    autoSearchAndJump: async function(poemName) {
      if (this.data.isSearching) return;
      
      // 开启自定义遮罩，初始化文案
      this.setData({ 
        isSearching: true,
        agentStatusText: 'Agent 大脑连接中...' 
      });

      // 1. 获取用户的原始年级（极其重要，大模型后续要用来恢复权限）
      const originalGradeId = app.globalData.userGradeId || wx.getStorageSync('userInfo')?.gradeId;
      if (!originalGradeId) {
        wx.showToast({ title: '请先登录并设置年级', icon: 'none' });
        this.setData({ isSearching: false, agentStatusText: '' });
        return;
      }

      try {
        // 2. 构造发给大模型的第一句话，悄悄把上下文信息塞进去
        const initialMessages = [
          { 
            role: 'user', 
            // 明确告诉大模型用户的需求，以及系统隐式的环境变量
            content: `帮我找古诗《${poemName}》。(系统隐式上下文：当前用户的 originalGradeId 为 ${originalGradeId})` 
          }
        ];

        // 3. 将任务丢给 Agent 引擎跑，传入回调函数实时更新文案
        const finalResult = await runAgentLoop(initialMessages, (comment) => {
          this.setData({ agentStatusText: comment });
        });

        // 4. Agent 执行结束的处理
        if (finalResult && finalResult.success) {
          // 任务圆满完成（比如已经跳转或已经弹窗），清空输入框
          this.setData({ searchKeyword: "" }); 
        } else {
          // 出现异常（网络断开或代码报错）
          wx.showToast({ title: 'Agent 执行被打断', icon: 'none' });
        }

      } catch (error) {
        console.error('Agent 链路异常:', error);
        wx.showToast({ title: 'Agent调度崩溃', icon: 'none' });
      } finally {
        // 无论成功失败，重置搜索状态和文案，关闭遮罩
        this.setData({ 
          isSearching: false,
          agentStatusText: '' 
        });
      }
    },

    // --------------------------------------------------
    // 👇 以下所有的基础页面跳转和方法保持原样完全不动 👇
    // --------------------------------------------------

    goToGradeSelect() {
      if (!this.data.isLoggedIn) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      const currentPageUrl = '/pages/index_v1/index_v1';
      wx.navigateTo({
        url: `/pages/index_gradeselect/index_gradeselect?redirectUrl=${encodeURIComponent(currentPageUrl)}`
      });
    },

    goToLogin() {
      wx.setStorageSync('indexV1CurrentTab', 2);
      app.globalData.targetRoute = null;
      wx.navigateTo({
        url: `/pages/login/login?forceLogin=true&redirect=${encodeURIComponent('/pages/index_v1/index_v1')}`
      });
    },

    clearCache() {
      wx.showModal({
        title: '提示',
        content: '确定要清理缓存吗？',
        success: (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '清理中...' });
            setTimeout(() => {
              wx.hideLoading();
              wx.showToast({ title: '清理完成', icon: 'success' });
            }, 1000);
          }
        }
      });
    },

    aboutUs() { wx.navigateTo({ url: '/pages/about/about' }); },
    userAgreement() { wx.navigateTo({ url: '/pages/agreement/agreement' }); },
    feedback() { wx.navigateTo({ url: '/pages/feedback/feedback' }); },
    privacy() { wx.navigateTo({ url: '/pages/privacy/privacy' }); },

    logout() {
      if (!this.data.isLoggedIn) return;
      wx.showModal({
        title: '退出确认',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');
            app.globalData.token = '';
            app.globalData.isLoggedIn = false;
            this.setData({
              userInfo: { nickname: '未登录', username: '' },
              isLoggedIn: false,
              currentGrade: '',
              currentGradeId: null
            });
            this.triggerEvent('logoutSuccess');
            wx.showToast({ title: '已退出登录', icon: 'success' });
          }
        }
      });
    },

    goTodaka: function() {
      wx.navigateTo({ url: '/pages/check_in/check_in' });
    }
  }  
});