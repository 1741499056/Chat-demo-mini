const app = getApp();

Page({
  data: {
    reciteRecords: [],
    isLoading: true,
    hasError: false,
    expandedRecordId: null,
    currentPlayingId: null,
    isPlaying: false,
    audioContext: null
  },

  onLoad: function(options) {
    if (options && options.token) {
      app.globalData.token = options.token;
      wx.setStorageSync('token', options.token);
    }
    
    this.setData({
      audioContext: wx.createInnerAudioContext()
    });
    
    this.getReciteRecords();
  },

  onUnload: function() {
    if (this.data.audioContext) {
      this.data.audioContext.stop();
      this.data.audioContext.destroy();
    }
  },

  onPullDownRefresh: function() {
    this.getReciteRecords();
  },

  getReciteRecords: function() {
    const that = this;
    
    that.setData({
      isLoading: true,
      hasError: false,
      expandedRecordId: null,
      currentPlayingId: null,
      isPlaying: false
    });

    app.authRequest({
      url: '/api/dify/records',
      method: 'GET'
    }).then(res => {
      wx.stopPullDownRefresh();
      if (res.statusCode === 200 && res.data.code === 1) {
        const formattedRecords = res.data.data.map(record => {
          return {
            ...record,
            formattedDate: this.formatDate(record.createdAt),
            recordingUrl: record.recordingUrl || null,
            currentTime: '0:00',
            duration: '0:00',
            progress: 0
          };
        });
        
        that.setData({
          reciteRecords: formattedRecords || [],
          isLoading: false,
          hasError: false
        });
      } else {
        that.setData({
          isLoading: false,
          hasError: true
        });
        wx.showToast({
          title: res.data.msg || '获取背诵记录失败',
          icon: 'none',
          duration: 2000
        });
      }
    }).catch(err => {
      wx.stopPullDownRefresh();
      that.setData({
        isLoading: false,
        hasError: true
      });
      wx.showToast({
        title: '获取背诵记录失败',
        icon: 'none',
        duration: 2000
      });
      console.error('API请求失败:', err);
    });
  },

  toggleRecordDetail: function(e) {
    const recordId = e.currentTarget.dataset.id;
    this.setData({
      expandedRecordId: this.data.expandedRecordId === recordId ? null : recordId
    });
  },

  toggleAudioPlayback: function(e) {
    const recordId = e.currentTarget.dataset.id;
    const recordingUrl = e.currentTarget.dataset.url;
    
    if (!recordingUrl) {
      wx.showToast({
        title: '暂无录音文件',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    const audioContext = this.data.audioContext;
    
    if (this.data.currentPlayingId === recordId && this.data.isPlaying) {
      audioContext.pause();
      this.setData({
        isPlaying: false
      });
    } else {
      if (this.data.currentPlayingId !== recordId) {
        audioContext.stop();
        audioContext.src = recordingUrl;
        
        audioContext.onCanplay(() => {
          const duration = audioContext.duration;
          const formattedDuration = this.formatTime(duration);
          
          this.updateRecordAudioInfo(recordId, {
            duration: formattedDuration
          });
        });
        
        audioContext.onTimeUpdate(() => {
          const currentTime = audioContext.currentTime;
          const duration = audioContext.duration;
          const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
          
          this.updateRecordAudioInfo(recordId, {
            currentTime: this.formatTime(currentTime),
            progress: progress
          });
        });
        
        audioContext.onEnded(() => {
          this.setData({
            isPlaying: false,
            currentPlayingId: null
          });
        });
      }
      
      audioContext.play();
      this.setData({
        isPlaying: true,
        currentPlayingId: recordId
      });
    }
  },

  updateRecordAudioInfo: function(recordId, audioInfo) {
    const records = this.data.reciteRecords.map(record => {
      if (record.id === recordId) {
        return {
          ...record,
          ...audioInfo
        };
      }
      return record;
    });
    
    this.setData({
      reciteRecords: records
    });
  },

  formatTime: function(seconds) {
    if (isNaN(seconds) || seconds < 0) {
      return '0:00';
    }
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${minutes}:${secs < 10 ? '0' + secs : secs}`;
  },

  retryLoad: function() {
    this.getReciteRecords();
  },

  formatDate: function(dateString) {
    if (!dateString) return '';
    
    try {
      let dateStr = dateString;
      if (dateStr.includes('T') && dateStr.includes('Z')) {
        dateStr = dateStr.replace('Z', '');
      }
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.warn('无效的日期:', dateString);
        return dateString;
      }
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const hours = date.getHours();
      const minutes = date.getMinutes();
      
      return `${year}年${month}月${day}日 ${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
    } catch (error) {
      console.error('日期格式化错误:', error);
      return dateString;
    }
  },

  navigateToRecite: function() {
    wx.navigateTo({
      url: '/pages/Recite/Recite'
    });
  },

  navigateBack: function() {
    wx.navigateBack();
  }
});