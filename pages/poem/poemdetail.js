// pages/poem/detail/index.js

// === 模拟全局 app 对象 (开发测试用) ===
const mockApp = {
  authRequest: ({ url }) => {
    return new Promise((resolve, reject) => {
      // 模拟诗词详情接口
      if (url.includes('api/poem/1')) {
        setTimeout(() => {
          resolve({
            statusCode: 200,
            data: {
              code: 1,
              data: {
                id: 1,
                name: "静夜思 (模拟数据)",
                dynasty: "唐 (模拟)",
                author: "李白 (模拟)",
                fullAncientContent: "床前明月光，\n疑是地上霜。\n举头望明月，\n低头思故乡。",
                fullModernContent: "床前洒满了皎洁的月光，\n迷迷糊糊以为是地上的秋霜。\n抬头凝视着窗外的明月，\n低头不禁深深地思念起故乡。",
                annotation: "明月光：指月亮洒在床前的光。\n疑是：怀疑是。\n地上霜：指地上的秋霜。\n故乡：家乡。",
                appreciation: "这首诗表达了诗人对故乡的思念之情，语言朴素自然，意境深远。",
                background: "作于诗人漂泊他乡之时。",
                peopleAppreciation: "大家觉得这首诗非常经典。",
                links: [2, 3]
              }
            }
          });
        }, 500);
      } 
      // 模拟相关推荐接口
      else if (url.includes('api/poem/2') || url.includes('api/poem/3')) {
        setTimeout(() => {
          resolve({
            statusCode: 200,
            data: {
              code: 1,
              data: {
                id: parseInt(url.split('/').pop()),
                name: `相关诗词${url.split('/').pop()}`,
                dynasty: "宋",
                author: "苏轼"
              }
            }
          });
        }, 300);
      } else {
        setTimeout(() => reject({ title: '接口未模拟或请求失败' }), 500);
      }
    });
  }
};
const app = typeof getApp === 'function' ? getApp() : mockApp;

Page({
  data: {
    // == 数据源 ==
    poemData: {},
    relatedPoems: [],
    
    // == 处理后的渲染数据 ==
    renderLines: [],     // 包含原文片段、注释ID、译文的数组
    finalAnnotations: [], // 最终清洗出的注释列表
    
    // == 交互状态 ==
    showTranslation: false, // 是否展开译文
    showAnnotations: true,  // 是否高亮注释
    isMenuOpen: false,      // 悬浮菜单开关
    toView: '',             // 滚动锚点
    activeNoteIndex: -1,    // 当前高亮的注释索引(底部卡片)
    
    // == 回到原位功能 ==
    showBackBtn: false,
    lastOriginId: '',       // 记录点击注释前的原文位置ID

    // == 悬浮按钮位置 ==
    controlX: 320,
    controlY: 500
  },

  onLoad(options) {
    // 1. 初始化悬浮按钮位置 (右下角)
    const sys = wx.getSystemInfoSync();
    this.setData({
      controlX: sys.windowWidth - 70,
      controlY: sys.windowHeight * 0.7
    });

    // 2. 获取数据
    const id = options.id || '1';
    if (id) {
      this.fetchPoemDetail(id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  /**
   * 获取诗词详情
   */
  fetchPoemDetail(id) {
    wx.showLoading({ title: '加载中' });
    app.authRequest({
      url: `/api/poem/${id}`,
      method: 'GET'
    }).then(res => {
      wx.hideLoading();
      if (res.statusCode === 200 && res.data.code === 1) {
        this.processData(res.data.data);
      } else {
        wx.showToast({ title: res.data.msg || '获取失败', icon: 'none' });
      }
    }).catch((err) => {
      wx.hideLoading();
      console.error('Fetch detail error:', err);
      wx.showToast({ title: '网络异常', icon: 'none' });
    });
  },

  /**
   * 核心：数据清洗与结构化处理
   * 将后端返回的 HTML/文本 转换为小程序可渲染的结构化数据
   */
  processData(data) {
    // 工具：清理HTML标签和多余空格
    const cleanHtml = (str) => {
      if (!str) return '';
      return str
        .replace(/<(br|p|div)[^>]*>/gi, '\n') // 块级元素转换行
        .replace(/<[^>]+>/g, '')              // 去除其他标签
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .trim();
    };

    // 1. 基础数据清洗
    const rawOriginal = cleanHtml(data.fullAncientContent || '');
    const poemData = {
      id: data.id,
      name: cleanHtml(data.name),
      dynasty: cleanHtml(data.dynasty),
      author: cleanHtml(data.author),
      originalContent: rawOriginal,
      modernContent: cleanHtml(data.fullModernContent),
      annotation: cleanHtml(data.annotation),
      appreciation: cleanHtml(data.appreciation),
      background: cleanHtml(data.background),
      peopleAppreciation: cleanHtml(data.peopleAppreciation)
    };

    // 2. 提取并标准化注释列表
    let annotations = [];
    if (poemData.background) {
      annotations.push(`【创作背景】${poemData.background}`);
    }
    if (poemData.annotation) {
      const raws = poemData.annotation.split(/\r\n|\n|\r/);
      raws.forEach(line => {
        // 去除序号 (如 "1. " 或 "[1]")
        let t = line.trim().replace(/^(\d+\.|\[\d+\]|[\u2460-\u2473]|\u2022)\s*/, '').trim();
        // 过滤掉仅包含“注释”二字的标题行
        const isTitleOnly = /^(注释|注|词语解释|\[\])$/.test(t) || t.length < 3;
        if (t && !isTitleOnly) annotations.push(t);
      });
    }

    // 3. 准备行数据 (原文 vs 译文)
    const originLines = rawOriginal.split('\n').map(l => l.trim());
    let transLines = poemData.modernContent.split(/\r\n|\n/).map(l => l.trim()).filter(l => l);

    // 容错：如果译文行数远少于原文，尝试按句号分割（应对长段落译文）
    if (transLines.length < originLines.filter(l => l).length * 0.5) {
      const splitByPunc = poemData.modernContent.split(/[。！？]/).map(l => l.trim()).filter(l => l);
      if (splitByPunc.length > transLines.length) {
        transLines = splitByPunc;
      }
    }

    // 4. 构建渲染结构：将原文每一行拆分为 [普通文本, 注释关键词, 普通文本]
    const renderLines = originLines.map((lineText, idx) => {
      // 处理空行
      if (lineText === '') return { segments: [], isSpacer: true };

      // 核心算法：在行内匹配注释关键词
      const segments = this.matchAnnotationsToLine(lineText, annotations);
      
      // 简单匹配译文 (注意：originLines包含空行，计算索引需排除空行)
      const validLineCount = originLines.slice(0, idx + 1).filter(l => l).length;
      
      return {
        segments: segments,
        translation: transLines[validLineCount - 1] || '',
        isSpacer: false
      };
    });

    this.setData({
      poemData,
      finalAnnotations: annotations,
      renderLines
    });

    if (data.links && data.links.length) {
      this.fetchRelated(data.links);
    }
  },

  /**
   * 核心算法：文本分词匹配
   * 输入："床前明月光"，注释列表
   * 输出：[{text:"床前", isNote:false}, {text:"明月光", isNote:true, noteId:0}]
   */
  matchAnnotationsToLine(lineText, annotations) {
    if (!lineText) return [];

    // A. 找出该行包含的所有潜在注释关键词
    const notesMap = [];
    annotations.forEach((note, index) => {
      if (note.startsWith('【创作背景】')) return;
      // 提取冒号前的关键词 (如 "明月光：指月亮..." -> "明月光")
      const match = note.match(/^([^：:—\s]+)/);
      if (match && match[1]) {
        const keyword = match[1].trim();
        // 限制关键词长度防止误配，且必须存在于当前行
        if (keyword.length > 0 && keyword.length < 8 && lineText.includes(keyword)) {
          notesMap.push({ keyword, id: index });
        }
      }
    });

    // B. 确定关键词在行内的具体位置 (Start, End)
    let hits = [];
    notesMap.forEach(n => {
      let pos = lineText.indexOf(n.keyword);
      while (pos !== -1) {
        // 检查重叠：如果当前位置已经被更长的关键词占用了，则跳过
        const isOverlap = hits.some(h =>
          (pos >= h.start && pos < h.end) || // 起点在别人内部
          (pos + n.keyword.length > h.start && pos + n.keyword.length <= h.end) // 终点在别人内部
        );
        if (!isOverlap) {
          hits.push({ start: pos, end: pos + n.keyword.length, noteId: n.id, text: n.keyword });
        }
        pos = lineText.indexOf(n.keyword, pos + 1);
      }
    });

    // 按在字符串中的出现顺序排序
    hits.sort((a, b) => a.start - b.start);

    if (hits.length === 0) {
      return [{ text: lineText, isNote: false }];
    }

    // C. 切割字符串
    let segments = [];
    let lastEnd = 0;
    hits.forEach(hit => {
      // 填补关键词前的普通文本
      if (hit.start > lastEnd) {
        segments.push({ text: lineText.substring(lastEnd, hit.start), isNote: false });
      }
      // 添加关键词
      segments.push({ text: hit.text, isNote: true, noteId: hit.noteId });
      lastEnd = hit.end;
    });

    // 填补最后的剩余文本
    if (lastEnd < lineText.length) {
      segments.push({ text: lineText.substring(lastEnd), isNote: false });
    }

    return segments;
  },

  // === 交互事件处理 ===

  toggleTranslation() {
    this.setData({ showTranslation: !this.data.showTranslation });
  },

  toggleAnnotations() {
    this.setData({ showAnnotations: !this.data.showAnnotations });
  },

  toggleMenu() {
    this.setData({ isMenuOpen: !this.data.isMenuOpen });
  },

  // 滚动到指定锚点
  scrollToTarget(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ toView: id, isMenuOpen: false });
  },

  // 点击文中注释 -> 滚动到底部注释详解
  handleNoteClick(e) {
    if (!this.data.showAnnotations) return;
    const noteId = e.currentTarget.dataset.noteid;
    const originId = e.currentTarget.dataset.originid; // 记录当前位置

    this.setData({
      toView: `note-item-${noteId}`, // 滚动到底部
      activeNoteIndex: noteId,       // 高亮底部条目
      lastOriginId: originId,        // 存下“回去”的路
      showBackBtn: true              // 显示“回文”按钮
    });

    // 3秒后取消高亮效果
    setTimeout(() => {
      this.setData({ activeNoteIndex: -1 });
    }, 3000);
  },

  // 点击“回文” -> 回到原文位置
  goBackToText() {
    const originId = this.data.lastOriginId;
    if (originId) {
      this.setData({
        toView: originId,
        showBackBtn: false
      });
    }
  },

  handleScroll(e) {
    // 可在此处监听滚动位置，动态隐藏/显示某些元素
  },

  startRecitePractice() {
    wx.navigateTo({ url: '/pages/poemRecite/poemRecite' });
  },

  navigateToRelated(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/poem/detail/index?id=${id}` });
  },

  // === 辅助请求 ===
  fetchRelated(links) {
    if (typeof app.authRequest !== 'function') return;
    const ids = links.slice(0, 3);
    Promise.all(ids.map(id => app.authRequest({ url: `/api/poem/${id}` })))
      .then(results => {
        const poems = results
          .filter(r => r.statusCode === 200)
          .map(r => r.data.data)
          .filter(d => d);
        this.setData({ relatedPoems: poems });
      })
      .catch(err => console.error("Fetch related error:", err));
  }
});
