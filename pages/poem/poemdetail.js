// pages/poem/detail/index.js

// 获取全局 App 实例 (用于调用 authRequest)
const app = getApp();

Page({
  data: {
    // == 数据源 ==
    poemData: {},
    relatedPoems: [],
    // == 渲染数据 ==
    renderLines: [],
    finalAnnotations: [],
    // == 视图状态 ==
    showAnnotations: true,
    isMenuOpen: false,
    toView: '',
    activeNoteIndex: -1,
    // == 悬浮球位置 ==
    controlX: 320,
    controlY: 500,
    // == AI 交互状态 ==
    showAiTipToast: false,
    selectionText: '',
    selectionStart: 0,
    selectionEnd: 0,
    showAiBtn: false,
    showAiModal: false,
    aiLoading: false,
    aiResult: '', // 存储最终 AI 返回的解释文本
  },

  onLoad(options) {
    const sys = wx.getSystemInfoSync();
    this.setData({
      controlX: sys.windowWidth - 70,
      controlY: sys.windowHeight * 0.7
    });

    const id = options.id || '1';
    this.fetchPoemDetail(id);
  },

  // =========================================================
  // 1. 数据获取与处理 (后端接口: /api/poem/:id)
  // =========================================================
  fetchPoemDetail(id) {
    wx.showLoading({ title: '加载中' });
    
    // 使用 app.authRequest 自动携带 Token 和基础域名
    app.authRequest({
      url: `/api/poem/${id}`,
      method: 'GET'
    })
      .then(res => {
        wx.hideLoading();
        // 校验后端返回的 code
        if (res.statusCode === 200 && res.data.code === 1) {
          this.processData(res.data.data);
        } else {
          wx.showToast({ title: res.data.msg || '获取失败', icon: 'none' });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('详情页获取失败:', err);
        wx.showToast({ title: '网络异常', icon: 'none' });
      });
  },

  processData(data) {
    const cleanHtml = (str) => {
      if (!str) return '';
      return str.replace(/<(br|p|div)[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\u00A0/g, ' ')
        .trim();
    };

    // 1. 基础清洗
    const rawOriginal = cleanHtml(data.fullAncientContent || '');
    let cleanModern = cleanHtml(data.fullModernContent);
    if (cleanModern) {
      cleanModern = cleanModern.replace(/^[\s\r\n]*(【?译文】?|【?翻译】?)[\s:：]*(\r\n|\n)?/g, '').trim();
    }

    // 2. 构建 poemData 对象
    const poemData = {
      id: data.id,
      name: cleanHtml(data.name),
      dynasty: cleanHtml(data.dynasty),
      author: cleanHtml(data.author),
      originalContent: rawOriginal,
      modernContent: cleanModern,
      annotation: cleanHtml(data.annotation),
      appreciation: cleanHtml(data.appreciation),
      background: cleanHtml(data.background),
      peopleAppreciation: cleanHtml(data.peopleAppreciation)
    };

    // 3. 核心：切分数组以便 WXML 循环渲染并缩进
    poemData.modernContentArray = poemData.modernContent ?
      poemData.modernContent.split('\n').map(s => s.trim()).filter(s => s !== '') :
      [];

    poemData.appreciationArray = poemData.appreciation ?
      poemData.appreciation.split('\n').map(s => s.trim()).filter(s => s !== '') :
      [];

    // 4. 处理注释逻辑
    let annotations = [];
    if (poemData.background) annotations.push(`【创作背景】${poemData.background}`);
    if (poemData.annotation) {
      const raws = poemData.annotation.split(/\r\n|\n|\r/);
      raws.forEach(line => {
        let t = line.trim().replace(/^(\d+\s*[\.\．\、]?\s*|\[\d+\]|[\u2460-\u2473]|\u2022)\s*/, '').trim();
        const isTitleOnly = /^(注释|注|词语解释|\[\])$/.test(t) || t.length < 3;
        if (t && !isTitleOnly) annotations.push(t);
      });
    }

    // 5. 全局匹配原文中的注释位置
    const globalMatches = [];
    let strictSearchIndex = 0;
    annotations.forEach((note, index) => {
      if (note.startsWith('【创作背景】')) return;
      const match = note.match(/^([^：:—\s]+)/);
      if (match && match[1]) {
        const keyword = match[1].trim();
        if (keyword.length > 0 && keyword.length < 10) {
          const foundIndex = rawOriginal.indexOf(keyword, strictSearchIndex);
          if (foundIndex !== -1) {
            globalMatches.push({
              noteId: index,
              text: keyword,
              start: foundIndex,
              end: foundIndex + keyword.length
            });
            strictSearchIndex = foundIndex + 1;
          }
        }
      }
    });

    // 6. 处理原文渲染行 (原文缩进逻辑)
    const originLines = rawOriginal.split('\n');
    let currentLineStartOffset = 0;
    let nextLineIsFirst = true;

    const renderLines = originLines.map((lineText) => {
      const lineEndOffset = currentLineStartOffset + lineText.length;
      const isSpacer = lineText.trim() === '';
      const lineMatches = globalMatches
        .filter(m => m.start >= currentLineStartOffset && m.end <= lineEndOffset)
        .map(m => ({
          ...m,
          relativeStart: m.start - currentLineStartOffset,
          relativeEnd: m.end - currentLineStartOffset
        }));

      let segments = [];
      if (lineText.length > 0) {
        segments = this.generateSegmentsForLine(lineText, lineMatches);
      }

      const res = {
        segments: segments,
        isSpacer: isSpacer,
        isFirstInParagraph: nextLineIsFirst && !isSpacer
      };

      nextLineIsFirst = isSpacer;
      currentLineStartOffset += lineText.length + 1;
      return res;
    });

    // 7. 更新视图
    this.setData({
      poemData,
      finalAnnotations: annotations,
      renderLines
    });
  },

  generateSegmentsForLine(lineText, lineMatches) {
    if (lineMatches.length === 0) return [{
      text: lineText,
      isNote: false
    }];
    const segments = [];
    let lastEnd = 0;
    lineMatches.forEach(hit => {
      if (hit.relativeStart > lastEnd) {
        segments.push({
          text: lineText.substring(lastEnd, hit.relativeStart),
          isNote: false
        });
      }
      segments.push({
        text: hit.text,
        isNote: true,
        noteId: hit.noteId
      });
      lastEnd = hit.relativeEnd;
    });
    if (lastEnd < lineText.length) {
      segments.push({
        text: lineText.substring(lastEnd),
        isNote: false
      });
    }
    return segments;
  },

  // =========================================================
  // 2. Editor 选读模式与 AI 交互
  // =========================================================
  onEditorReady() {
    const that = this;
    wx.createSelectorQuery().select('#poemEditor').context(function (res) {
      that.editorCtx = res.context;
      if (!that.data.showAnnotations) {
        that.setEditorContent();
      }
    }).exec();
  },

  setEditorContent() {
    if (!this.editorCtx || !this.data.poemData.originalContent) return;
    const htmlContent = this.data.poemData.originalContent
      .split('\n')
      .map(line => `<p style="margin:0; padding:0; text-indent: 2em; line-height: 1.8;">${line}</p>`)
      .join('');
    this.editorCtx.setContents({
      html: htmlContent
    });
  },

  onEditorTouchEnd() {
    if (this.data.showAnnotations) return;
    setTimeout(() => {
      this.checkEditorSelection();
    }, 300);
  },

  checkEditorSelection() {
    if (!this.editorCtx) return;
    this.editorCtx.getSelectionText({
      success: (textRes) => {
        const text = (textRes.text || '').trim();
        if (text.length === 0) {
          this.setData({
            showAiBtn: false,
            selectionText: ''
          });
          return;
        }
        this.editorCtx.getSelection({
          success: (posRes) => {
            let start = (posRes.range && typeof posRes.range.index === 'number') ? posRes.range.index : (posRes.start || 0);
            this.setData({
              selectionText: text,
              selectionStart: start,
              selectionEnd: start + text.length,
              showAiBtn: true
            });
          }
        });
      }
    });
  },

  toggleAnnotations() {
    const nextState = !this.data.showAnnotations;
    this.setData({
      showAnnotations: nextState,
      showAiBtn: false
    });
    
    // 切换模式逻辑
    if (!nextState) {
      // 1. 显示提示
      this.setData({ showAiTipToast: true });
      // 2. 清除可能存在的旧定时器
      if (this.tipTimer) clearTimeout(this.tipTimer);
      // 3. 3秒后自动隐藏
      this.tipTimer = setTimeout(() => {
        this.setData({ showAiTipToast: false });
      }, 3000);
      
      // 初始化编辑器内容
      setTimeout(() => { this.setEditorContent(); }, 100);
    }
  },

  // =========================================================
  // 3. AI 请求逻辑 (/coze/explain)
  // =========================================================
  
  // 生成带标记的上下文，例如 "这里是<<<选中的词>>>的上下文"
  generateMarkedContent() {
    const { originalContent } = this.data.poemData;
    const { selectionStart, selectionEnd, selectionText } = this.data;
    
    if (!originalContent || selectionStart === undefined) return "";
    
    // 截取前后文，减少 token 消耗 (前后各取约 10 字符即可，根据需求调整)
    const contextRange = 10; 
    const slimBefore = originalContent.slice(Math.max(0, selectionStart - contextRange), selectionStart);
    const slimAfter = originalContent.slice(selectionEnd, selectionEnd + contextRange);
    
    return `...${slimBefore}<<<${selectionText}>>>${slimAfter}...`;
  },

  onAiAsk() {
    if (!this.data.selectionText) return;
    
    const markedContent = this.generateMarkedContent();
    
    // 初始化弹窗状态
    this.setData({
      showAiModal: true,
      aiResult: '', // 清空旧结果
      aiLoading: true, // 显示加载动画
      showAiBtn: false
    });

    this.requestCozeAi(markedContent);
  },

  closeAiModal() {
    this.setData({
      showAiModal: false
    });
    if (this.editorCtx) this.editorCtx.clearSelection();
  },

  // 调用/coze/explain
  requestCozeAi(markedContent) {
    const that = this;
    const postData = {
      full_context: this.data.poemData.originalContent,
      full_translation: this.data.poemData.modernContent || "暂无译文",
      marked_content: markedContent
    };

    // 使用 app.authRequest 自动拼接域名: https://zhixunshiyun.yezhiqiu.cn/api/coze/explain
    app.authRequest({
      url: '/api/coze/explain', // 只需要写路径
      method: 'POST',
      data: postData
    })
    .then(res => {
      // 请求成功进入这里
      if (res.statusCode === 200 && res.data.code === 1) {
        that.setData({
          aiLoading: false,
          aiResult: res.data.data // 直接取出字符串
        });
      } else {
        // 业务逻辑错误
        that.setData({
          aiLoading: false,
          aiResult: `解析失败: ${res.data.msg || '未知错误'}`
        });
      }
    })
    .catch(err => {
      // 网络或服务器错误
      console.error('AI Request Error:', err);
      that.setData({
        aiLoading: false,
        aiResult: '网络请求超时或出错，请稍后再试。'
      });
    });
  },

  // =========================================================
  // 4. 其他交互逻辑
  // =========================================================
  toggleMenu() {
    this.setData({
      isMenuOpen: !this.data.isMenuOpen
    });
  },
  scrollToTarget(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      toView: id,
      isMenuOpen: false
    });
  },
  handleNoteClick(e) {
    if (!this.data.showAnnotations) return;
    const noteId = e.currentTarget.dataset.noteid;
    this.setData({
      toView: `note-item-${noteId}`,
      activeNoteIndex: noteId
    });
    setTimeout(() => {
      this.setData({
        activeNoteIndex: -1
      });
    }, 3000);
  },
  toRecite: function () {
    wx.navigateTo({
      url: '/pages/recite/recite'
    })
  }
});
