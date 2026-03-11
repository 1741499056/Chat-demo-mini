const app = getApp();

Page({
  data: {
    loading: false,
    error: null,
    hasUploaded: false,
    isRecording: false,
    recordingTime: 0,
    audioFilePath: null,
    audioFileSize: 0,
    recordingTimestamp: '',
    waveformData: [],
    recorderManager: null,
    audioContext: null,
    
    poemList: [],
    poemIndex: 0,
    selectedPoemId: null,
    overallScore: 0,
    detailedScores: {
      content_completeness: 0,
      structural_correctness: 0,
      key_imagery_preservation: 0
    },
    majorErrors: [],
    feedback: {
      praise: "",
      suggestions: []
    },
    isLoggedIn: false,
    userInfo: null,
    poemListLoaded: false,
    
    // 新增：当前古诗名称
    currentPoemName: ''
  },

  onLoad: function(options) {
    console.log('页面加载，初始化');
    this.initRecorder();
    this.initPage();
    
    // 新增：检查是否从详情页进入
    if (options.poemId) {
      const poemId = parseInt(options.poemId);
      const poemName = options.poemName || '';
      
      this.setData({
        selectedPoemId: poemId,
        currentPoemName: poemName
      });
      
      console.log('从详情页进入，古诗ID:', poemId, '古诗名称:', poemName);
    }
  },

  onShow: function() {
    console.log('页面显示，刷新状态');
    this.checkLoginStatus();
  },

  onUnload: function() {
    if (this.data.isRecording) {
      this.stopRecording();
    }
    if (this.data.audioContext) {
      this.data.audioContext.destroy();
    }
  },

  initRecorder: function() {
    const recorderManager = wx.getRecorderManager();
    const audioContext = wx.createInnerAudioContext();
    
    recorderManager.onStart(() => {
      console.log('录音开始');
      this.setData({ isRecording: true });
      this.startRecordingTimer();
    });
    
    recorderManager.onStop((res) => {
      console.log('录音结束', res);
      this.handleRecordingStop(res);
    });
    
    recorderManager.onError((err) => {
      console.error('录音错误', err);
      this.handleRecordingError(err);
    });
    
    this.setData({
      recorderManager: recorderManager,
      audioContext: audioContext
    });
  },

  startRecording: function() {
    if (!this.checkLoginStatus()) {
      this.showLoginModal();
      return;
    }
    
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.startActualRecording();
      },
      fail: () => {
        wx.showModal({
          title: '需要录音权限',
          content: '请允许使用麦克风进行录音',
          success: (res) => {
            if (res.confirm) {
                wx.openSetting();
            }
          }
        });
      }
    });
  },

  startActualRecording: function() {
    const { recorderManager } = this.data;
    
    recorderManager.start({
      duration: 300000, // 修改为300秒（5分钟）
      sampleRate: 44100,
      numberOfChannels: 1,
      encodeBitRate: 192000,
      format: 'mp3',
      frameSize: 50
    });
    
    this.initWaveform();
  },

  stopRecording: function() {
    const { recorderManager } = this.data;
    recorderManager.stop();
    this.stopRecordingTimer();
  },

  handleRecordingStop: function(res) {
    const { tempFilePath, duration } = res;
    
    this.setData({
      isRecording: false,
      audioFilePath: tempFilePath,
      recordingTime: Math.floor(duration / 1000),
      audioFileSize: Math.round(res.fileSize / 1024),
      recordingTimestamp: this.formatTimestamp(new Date())
    });
    
    console.log('录音文件路径:', tempFilePath);
  },

  handleRecordingError: function(err) {
    this.setData({ isRecording: false });
    this.stopRecordingTimer();
    
    let errorMsg = '录音失败';
    switch (err.errMsg) {
      case 'operateRecorder:fail auth deny':
        errorMsg = '麦克风权限被拒绝';
        break;
      case 'operateRecorder:fail system busy':
        errorMsg = '系统繁忙，请稍后重试';
        break;
      default:
        errorMsg = err.errMsg || '未知错误';
    }
    
    wx.showToast({ title: errorMsg, icon: 'none' });
  },

  startRecordingTimer: function() {
    this.recordingTimer = setInterval(() => {
      this.setData({ 
        recordingTime: this.data.recordingTime + 1 
      });
      this.updateWaveform();
    }, 1000);
  },

  stopRecordingTimer: function() {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  },

  initWaveform: function() {
    const waveformData = Array(20).fill(20);
    this.setData({ waveformData });
  },

  updateWaveform: function() {
    const { waveformData } = this.data;
    const newWaveform = [...waveformData];
    
    for (let i = 0; i < 5; i++) {
      const index = Math.floor(Math.random() * newWaveform.length);
      newWaveform[index] = 20 + Math.random() * 60;
    }
    
    this.setData({ waveformData: newWaveform });
  },

  playRecording: function() {
    const { audioContext, audioFilePath } = this.data;
    
    if (!audioFilePath) {
      wx.showToast({ title: '没有可播放的录音', icon: 'none' });
      return;
    }
    
    audioContext.src = audioFilePath;
    audioContext.play();
    
    audioContext.onPlay(() => {
      console.log('开始播放');
    });
    
    audioContext.onEnded(() => {
      console.log('播放结束');
    });
    
    audioContext.onError((err) => {
      console.error('播放错误', err);
      wx.showToast({ title: '播放失败', icon: 'none' });
    });
  },

  formatTime: function(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  formatTimestamp: function(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  initPage: function() {
    if (this.checkLoginStatus()) {
      this.getPoemList();
    }
  },

  checkLoginStatus: function() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    console.log('检查登录状态，token:', token ? '存在' : '缺失');
    
    if (token && userInfo) {
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo
      });
      return true;
    } else {
      this.setData({ isLoggedIn: false });
      return false;
    }
  },

  getPoemList: function() {
    const token = wx.getStorageSync('token');
    
    if (!token) {
      console.log('未登录，无法获取古诗列表');
      this.showLoginModal();
      return;
    }
    
    wx.showLoading({ title: '加载中...' });
    
    wx.request({
      url: 'https://zhixunshiyun.yezhiqiu.cn/api/poemsByGrade',
      method: 'GET',
      header: {
        'token': token
      },
      data:{
        page:1,
        pageSize:10000
      },
      success: (res) => {
        wx.hideLoading();
        console.log('古诗列表接口响应:', res);
        
        if (res.statusCode === 401) {
          this.handleAuthError('获取古诗列表时认证失败');
          return;
        }
        
        if (res.data && res.data.code === 1) {
          const poemList = res.data.data.rows || [];
          
          const validPoemList = poemList.map((poem, index) => {
            return {
              id: poem.id || index + 1,
              name: poem.name || `古诗${index + 1}`,
              dynasty: poem.dynasty || '未知朝代',
              author: poem.author || '未知作者',
              ...poem
            };
          });
          
          console.log('处理后的古诗列表:', validPoemList);
          
          // 如果是从详情页进入，设置对应的古诗索引
          let poemIndex = 0;
          if (this.data.selectedPoemId) {
            const index = validPoemList.findIndex(p => p.id === this.data.selectedPoemId);
            if (index !== -1) poemIndex = index;
          }
          
          this.setData({
            poemList: validPoemList,
            poemListLoaded: true,
            poemIndex: poemIndex,
            selectedPoemId: validPoemList[poemIndex].id
          });
        } else {
          this.setData({ error: '获取古诗列表失败: ' + (res.data.msg || '未知错误') });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('网络错误:', err);
        this.setData({ error: '网络错误' });
      }
    });
  },

  onPoemChange: function(e) {
    const index = parseInt(e.detail.value);
    const selectedPoem = this.data.poemList[index];
    
    console.log('选择古诗变化:', index, selectedPoem);
    
    if (selectedPoem && selectedPoem.id) {
      this.setData({
        poemIndex: index,
        selectedPoemId: selectedPoem.id
      });
    } else {
      console.error('选择的古诗数据无效:', selectedPoem);
      wx.showToast({ title: '选择无效，请重试', icon: 'none' });
    }
  },

  uploadAndEvaluate: function() {
    const token = wx.getStorageSync('token');
    console.log('上传前token检查:', token ? '存在' : '缺失');
    
    if (!token) {
      this.showLoginModal();
      return;
    }
    
    if (!this.data.audioFilePath) {
      wx.showToast({ title: '请先录制语音', icon: 'none' });
      return;
    }
    
    if (!this.data.selectedPoemId) {
      wx.showToast({ title: '请选择古诗', icon: 'none' });
      return;
    }
    
    if (this.data.recordingTime < 3) {
      wx.showToast({ title: '录音时间太短，请录制至少3秒', icon: 'none' });
      return;
    }
    
    this.setData({ loading: true, error: null });
    this.doUploadFile();
  },

  doUploadFile: function() {
    const token = wx.getStorageSync('token');
    const filePath = this.data.audioFilePath;
    const poemId = this.data.selectedPoemId;
    
    console.log('上传参数 - poemId:', poemId, '文件路径:', filePath);
    
    if (!token) {
      this.handleAuthError('Token不存在');
      return;
    }
    
    wx.showLoading({ title: '分析中...', mask: true });
    
    const header = {
      'token': token
    };
    
    console.log('上传请求头:', header);
    
    wx.uploadFile({
      url: 'https://zhixunshiyun.yezhiqiu.cn/api/dify/evaluate',
      filePath: filePath,
      name: 'file',
      header: header,
      formData: {
        id: poemId
      },
      success: (res) => {
        wx.hideLoading();
        this.setData({ loading: false });
        console.log('上传接口响应状态:', res.statusCode);
        console.log('上传接口响应数据:', res.data);
        
        this.handleUploadResponse(res);
      },
      fail: (err) => {
        wx.hideLoading();
        this.setData({ 
          loading: false, 
          error: '上传失败: ' + (err.errMsg || '网络错误')
        });
      }
    });
  },

  handleUploadResponse: function(res) {
    try {
      let result;
      if (typeof res.data === 'string') {
        try {
          result = JSON.parse(res.data);
        } catch (e) {
          result = { error: res.data };
        }
      } else {
        result = res.data;
      }
      
      console.log('解析结果:', result);
      
      if (res.statusCode === 401 || (result && result.error === "token缺失")) {
        this.handleAuthError('Token已过期或无效');
        return;
      }
      
      if (result && result.code === 1) {
        this.handleSuccessResponse(result.data);
      } else {
        this.handleErrorResponse(result);
      }
    } catch (e) {
      console.error('解析响应异常:', e);
      this.setData({ error: '解析响应失败: ' + e.message });
    }
  },

  handleSuccessResponse: function(data) {
    console.log('处理成功响应:', data);
    
    this.setData({
      hasUploaded: true,
      overallScore: data.overall_score || 0,
      detailedScores: data.detailed_scores || this.data.detailedScores,
      majorErrors: data.major_errors || [],
      feedback: data.feedback || this.data.feedback
    });
    
    wx.showToast({ title: '分析完成', icon: 'success' });
  },

  handleErrorResponse: function(result) {
    let errorMsg = '分析失败';
    if (result && result.msg) errorMsg += ': ' + result.msg;
    if (result && result.error) errorMsg += ': ' + result.error;
    if (result && result.message) errorMsg += ': ' + result.message;
    
    this.setData({ error: errorMsg });
  },

  handleAuthError: function(message) {
    console.log('认证错误:', message);
    
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    
    this.setData({
      isLoggedIn: false,
      loading: false,
      error: message
    });
    
    wx.showModal({
      title: '认证失败',
      content: message + '，请重新登录',
      confirmText: '重新登录',
      success: (res) => {
        if (res.confirm) {
          this.goToLogin();
        }
      }
    });
  },

  showLoginModal: function() {
    wx.showModal({
      title: '需要登录',
      content: '请先登录后再继续操作',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          this.goToLogin();
        }
      }
    });
  },

  goToLogin: function() {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    wx.redirectTo({
      url: `/pages/login/login?redirect=/${currentPage.route}`
    });
  },

  // 重新上传
  reUpload: function() {
    this.setData({
      hasUploaded: false,
      audioFilePath: null,
      recordingTime: 0,
      audioFileSize: 0,
      recordingTimestamp: '',
      overallScore: 0,
      detailedScores: { content_completeness: 0, structural_correctness: 0, key_imagery_preservation: 0 },
      majorErrors: [],
      feedback: { praise: "", suggestions: [] },
      error: null
    });
  },

  retryUpload: function() {
    this.setData({ error: null });
    this.uploadAndEvaluate();
  },

  viewPoemList: function() {
    wx.switchTab({
      url: '/pages/poem/poem',
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '跳转失败，请检查页面是否存在',
          icon: 'none'
        });
      }
    });
  },

  // 新增：跳转到背诵页面
  goToChallengePage: function() {
    wx.navigateTo({
      url: '/pages/ReciteRecords/ReciteRecords',
      success: () => {
        console.log('成功跳转到背诵记录页面');
      },
      fail: (err) => {
        console.error('跳转到背诵记录页面失败:', err);
        wx.showToast({
          title: '跳转失败，请稍后重试',
          icon: 'none'
        });
      }
    });
  },

  // 返回上一页
  goBack: function() {
    wx.navigateBack({
      delta: 1
    });
  }
});