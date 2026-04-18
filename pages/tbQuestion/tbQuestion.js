// pages/reTest/reTest.js
const app = getApp();

Page({
    data: {
      // 系统导航栏信息
      navHeight: 44,
      statusBarHeight: 20,
      
      // 用户输入数据
      articleInput: '',
      currentArticle: '未选择文章',
      currentType: '未选择题型',
  
      questionTypes: [
          { en: 'NULL', cn: '请选择题目类型' },
          { en: 'fill_blank', cn: '填空题' },
          { en: 'comprehension', cn: '判断题' },
          { en: 'translation', cn: '翻译题' },
          { en: 'choice', cn: '选择题' }
        ],
        typeIndex: 0,
      // 接口返回数据
      questionList: [],
      //存储选择题数据
      choiceContents:[],
      //存储选择题答案
      questionAnswer:[],
      //判断用户选择是否正确
     isTrue:false,
     //用来判断是否应该隐藏提示语
     isHide:false,
     //判断题存储用户选择
     judgeAnswers: {}, // 改为对象存储，格式如 {0: "正确", 1: "错误"}
     //解决循环渲染问题
      // 用对象存储各题目的状态 {题号: {isTrue, isHide}}
       questionStates: {} ,
       submitted: false ,// 用来控制是否已经提交答案
      //控制提交按钮
      isSubmitted:false,
    },
    //底部按钮
    handleButtonClick: function () {
        if (this.data.isSubmitted) {
          this.resetAnswers(); // Reset the answers if the user has submitted
        } else {
          this.submitAnswers(); // Submit the answers if not submitted yet
        }
      },
      //重新作答函数
      resetAnswers: function () {
        if(this.data.currentType=='choice'){
            let resetChoiceContents = this.data.choiceContents.map(question => {
                return question.map(option => {
                  option.isChoose = false; // Deselect all options
                  return option;
                });
              });
           this.setData({
            choiceContents: resetChoiceContents,   
            isSubmitted:false,
            questionStates: {} ,
            submitted: false ,// 用来控制是否已经提交答案
            
           })
        }
        else if(this.data.currentType=='comprehension'){
           
           
            this.setData({ 
                judgeAnswers:{},
                isSubmitted:false,
                questionStates: {} ,
                submitted: false ,// 用来控制是否已经提交答案
               })
        }
 
         
      },
    //判断与答案存储
    handleJudgeSelect(e) {
        if(this.data.isSubmitted){
            return;
        }
        const { qindex, value } = e.currentTarget.dataset;
        let judgeAnswers = { ...this.data.judgeAnswers };
        judgeAnswers[qindex] = value; // 保存用户选择的答案（√ 或 ×）
        this.setData({ judgeAnswers });
    },

    //记录用户选择
    handleOptionTap(e) {
        //if user have submitted
        if(this.data.isSubmitted){
            return;
        }
        const { qIndex, oIndex } = e.currentTarget.dataset;
        const choiceContents = [...this.data.choiceContents]; // Create a copy of choiceContents to avoid direct modification
      
        const questionType = this.data.currentType; // Determine if the current question is single-select or multi-select
      
        if (questionType === 'choice') {
          // Single-select (Radio) logic: Only one option can be selected at a time
          choiceContents[qIndex].forEach((item, index) => {
            if (index === oIndex) {
              item.isChoose = !item.isChoose; // Toggle the clicked option
            } else {
              item.isChoose = false; // Deselect other options
            }
          });
        } else if (questionType === 'multiChoice') {
          // Multi-select (Checkbox) logic: Multiple options can be selected
          choiceContents[qIndex][oIndex].isChoose = !choiceContents[qIndex][oIndex].isChoose; // Toggle the clicked option
        }
      
        // Update the state with the modified choiceContents
        this.setData({ choiceContents });
      },
      
    //判断每一题是否正确
    submitAnswers() {

        const { questionList, choiceContents, questionAnswer, judgeAnswers } = this.data;
        let questionStates = {}; // 存储每道题的判断结果
    
        // 遍历每一道题
        if(this.data.currentType=='choice'){
            choiceContents.forEach((choices, qIndex) => {
                const userAnswer = choices.find(choice => choice.isChoose); // 获取用户选择的选项
                if (userAnswer) {
                    const correctAnswer = questionAnswer[qIndex]; // 获取正确答案
                    const isCorrect = correctAnswer.includes(userAnswer.prefix); // 判断答案是否正确
                    questionStates[qIndex] = { 
                        isTrue: isCorrect, 
                        isHide: true, // 答案提交后显示答案 
                        correctAnswer: correctAnswer // 显示正确答案
                    };
                } else {
                    questionStates[qIndex] = { 
                        isTrue: false, 
                        isHide: true,
                        correctAnswer: questionAnswer[qIndex]
                    };
                }
            });
            this.setData({
                isSubmitted: true, // Mark as submitted
              });
        }
        else if(this.data.currentType=="comprehension"){
         questionList.forEach((item, qIndex) => {
               
                    const userAnswer = judgeAnswers[qIndex]; // 获取用户选择的判断题答案
                    const correctAnswer = this.data.questionAnswer[qIndex][0];  // 获取正确答案（√ 或 ×）
                    const isCorrect = userAnswer === correctAnswer; // 判断答案是否正确

                    questionStates[qIndex] = { 
                        isTrue: isCorrect, 
                        isHide: true, // 答案提交后显示答案 
                        correctAnswer: correctAnswer // 显示正确答案
                    };
         });
         this.setData({
            isSubmitted: true, // Mark as submitted
          });
        }
    
        // 更新页面状态
        this.setData({
            questionStates,
            submitted: true // 标记为已提交答案
        });
    },
      // 初始化答案
      initAnswer() {
          const  questionAnswer = this.data.questionList.map(question => {
            try {
              return JSON.parse(question.correct_answer || "[]");
            } catch (e) {
              console.error('解析选项失败:', e);
              return [];
            }
          });
          this.setData({ questionAnswer});
        },
       // 初始化选项
       initAllChoices() {
          const choiceContents = this.data.questionList.map(question => {
            try {
              const options = JSON.parse(question.options || "[]");
              return options.map((item, idx) => ({
                text: item,
                prefix: String.fromCharCode(65 + idx) , // A. B. C. D.
                isChoose: false
              }));
            } catch (e) {
              console.error('解析选项失败:', e);
              return [];
            }
          });
          this.setData({ choiceContents });
        },
     /**
     * 生命周期函数--监听页面加载
     */
   onLoad(options) {
     // 使用新API获取系统信息
     const windowInfo = wx.getWindowInfo()
     this.setData({
       statusBarHeight: windowInfo.statusBarHeight,
       navHeight: windowInfo.navBarHeight || (windowInfo.platform === 'android' ? 48 : 44)
     })
     this.initAnswer()
     if(this.data.currentType==='choice'){
      this.initChoices()
      this.initAllChoices();
     }
    },
      // 处理文章名输入
      handleArticleInput(e) {
          this.setData({ articleInput: e.detail.value })
        },
  // JS 获取选中值
  bindTypeChange(e) {
      const selected = this.data.questionTypes[e.detail.value];
      this.setData({
        typeIndex: e.detail.value,
        currentType: selected.en // 提交时仍用英文
      });
      this.fetchData()
    },
    async fetchData() {
        if (this.data.questionList && this.data.questionList.length > 0) {
            this.setData({
                questionList: [],
                choiceContents: [],
                questionAnswer: [],
                isTrue: false,
                isHide: false,
                judgeAnswers: {},
                questionStates: {},
                submitted:false,
                isSubmitted:false,
            });
        }
    
        if (!this.data.articleInput || !this.data.currentType) {
            wx.showToast({ title: '请完整填写', icon: 'none' });
            return;
        }
    
        // 更新导航栏显示
        this.setData({
            currentArticle: this.data.articleInput
        });
    
        // 显示加载提示
        wx.showLoading({ title: '加载中...' });
    
        try {
            // 调用全局的authRequest方法
            const res = await app.authRequest({
                url: '/questions/comprehension',
                method: 'GET',
                data: {
                    poemName: this.data.articleInput,
                    questionType: this.data.currentType
                }
            });
    
            console.log("请求成功:", res);
    
            // 判断响应格式是否正确
            if (Array.isArray(res.data.data)) {
                // 更新问题列表数据
                this.setData({
                    questionList: [...this.data.questionList, ...res.data.data]
                }, () => {
                    this.initAnswer();
                    if (this.data.currentType === 'choice') {
                        this.initAllChoices();
                    }
                    // 隐藏加载提示
                    wx.hideLoading();
                });
            } else {
                console.error('Unexpected response format:', res.data);
                wx.hideLoading();
                wx.showToast({ title: '响应格式错误，请重试', icon: 'none' });
            }
        } catch (err) {
            console.error("请求失败:", err);
            wx.hideLoading();
            wx.showToast({ title: '请求失败，请重试', icon: 'none' });
        }
    },
    
  
    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady() {
       
    },
  
    /**
     * 生命周期函数--监听页面显示
     */
    onShow() {
    },
  
    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide() {
  
    },
  
    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload() {
  
    },
  
    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh() {
    },
  
    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom() {
  
    },
  
    /**
     * 用户点击右上角分享
     */
    onShareAppMessage() {
  
    }
  })