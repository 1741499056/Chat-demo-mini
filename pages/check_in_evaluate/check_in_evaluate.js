const app = getApp();
const recorderManager = wx.getRecorderManager();
const audioContext = wx.createInnerAudioContext();
const fs = wx.getFileSystemManager();

Page({
  data: {
    // --- 录音状态 ---
    isRecording: false,
    recordingTime: 0,
    recordingTimeText: '00:00', // 新增：专门用于 WXML 显示的时间字符串
    audioFilePath: null,

    // --- 业务数据 ---
    poemId: null,
    poemTitle: '',
    loading: false,
    hasResults: false,

    // --- 测评结果 (与后端 JSON 结构严格对应) ---
    overallScore: 0,
    checkInSuccess: false,
    detailedScores: {
      content_completeness: 0,
      structural_correctness: 0,
      key_imagery_preservation: 0
    },
    feedback: {
      praise: '',
      suggestions: []
    },
    majorErrors: []
  },

  onLoad: function(options) {
    if (options.id) {
      this.setData({
        poemId: options.id,
        poemTitle: decodeURIComponent(options.title || '未知古诗')
      });
    }
    this.initRecorderConfig();
  },

  /**
   * 初始化录音管理器配置
   */
  initRecorderConfig: function() {
    recorderManager.onStart(() => {
      this.setData({
        isRecording: true,
        recordingTime: 0,
        recordingTimeText: '00:00'
      });
      this.startTimer();
    });

    recorderManager.onStop((res) => {
      this.stopTimer();
      this.setData({
        isRecording: false,
        audioFilePath: res.tempFilePath
      });
      wx.showToast({
        title: '录音已就绪',
        icon: 'success'
      });
    });

    recorderManager.onError((err) => {
      console.error('录音报错:', err);
      this.stopTimer();
      this.setData({ isRecording: false });
      wx.showToast({
        title: '录音失败',
        icon: 'none'
      });
    });
  },

  // ---------------- 交互逻辑 ----------------

  startRecording: function() {
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        recorderManager.start({
          duration: 60000,
          format: 'mp3',
          sampleRate: 44100,
          numberOfChannels: 1,
          encodeBitRate: 128000
        });
      },
      fail: () => {
        wx.showModal({
          title: '权限提示',
          content: '需要麦克风权限才能背诵哦',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) wx.openSetting();
          }
        });
      }
    });
  },

  stopRecording: function() {
    recorderManager.stop();
  },

  playRecording: function() {
    if (!this.data.audioFilePath) return;
    audioContext.src = this.data.audioFilePath;
    audioContext.play();
  },

  reUpload: function() {
    this.setData({
      hasResults: false,
      audioFilePath: null,
      recordingTime: 0,
      recordingTimeText: '00:00',
      overallScore: 0,
      majorErrors: [],
      loading: false
    });
  },

  // ---------------- 核心上传与适配逻辑 ----------------

  uploadAndEvaluate: function() {
    const { audioFilePath, poemId } = this.data;
    const token = wx.getStorageSync('token');

    if (!token) {
      return wx.showToast({ title: '请先登录', icon: 'none' });
    }
    if (!audioFilePath) {
      return wx.showToast({ title: '请先录音', icon: 'none' });
    }

    this.setData({ loading: true });
    wx.showLoading({ title: 'AI 老师阅卷中', mask: true });

    const fileName = `rec_${Date.now()}.mp3`;
    const targetPath = `${wx.env.USER_DATA_PATH}/${fileName}`;

    try {
      fs.copyFileSync(audioFilePath, targetPath);
    } catch (e) {
      this.handleUploadError('文件预处理失败');
      return;
    }

    wx.uploadFile({
      url: `${app.globalData.apiBaseUrl}/coze/check-in/evaluate`,
      filePath: targetPath,
      name: 'file',
      header: {
        'token': token,
        'Accept': 'application/json'
      },
      formData: { 'id': poemId },
      success: (res) => {
        try {
          const result = JSON.parse(res.data.trim());
          if (result.code === 1) {
            const d = result.data;
            const evalDetail = d.evaluationDetail || {};
            const rawScores = evalDetail.detailed_scores || {};

            // 核心修复：手动映射后端“缩水”的字段名
            this.setData({
              hasResults: true,
              overallScore: d.overallScore,
              checkInSuccess: d.checkInSuccess,
              detailedScores: {
                content_completeness: rawScores.content_completeness || 0,
                // 适配后端：structural_correctne -> structural_correctness
                structural_correctness: rawScores.structural_correctne || 0,
                // 适配后端：key_imagery_preserva -> key_imagery_preservation
                key_imagery_preservation: rawScores.key_imagery_preserva || 0
              },
              feedback: evalDetail.feedback || { praise: '', suggestions: [] },
              majorErrors: evalDetail.major_errors || []
            });

            if (d.checkInSuccess) {
              wx.showToast({ title: '打卡成功！', icon: 'success' });
            }
          } else {
            wx.showModal({
              title: '评分失败',
              content: result.msg || '未知错误',
              showCancel: false
            });
          }
        } catch (e) {
          console.error('解析失败', e);
          this.handleUploadError('结果解析失败');
        }
      },
      fail: (err) => {
        this.handleUploadError('网络连接失败');
      },
      complete: () => {
        this.setData({ loading: false });
        wx.hideLoading();
        try { fs.unlinkSync(targetPath); } catch (e) {}
      }
    });
  },

  handleUploadError: function(msg) {
    this.setData({ loading: false });
    wx.hideLoading();
    wx.showToast({ title: msg, icon: 'none' });
  },

  // ---------------- 辅助工具 ----------------

  startTimer: function() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      const nextTime = this.data.recordingTime + 1;
      this.setData({
        recordingTime: nextTime,
        recordingTimeText: this.formatTime(nextTime)
      });
    }, 1000);
  },

  stopTimer: function() {
    if (this.timer) clearInterval(this.timer);
  },

  formatTime: function(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
});