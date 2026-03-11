// cloudfunctions/uploadFileToDify/index.js
const cloud = require('wx-server-sdk');
const axios = require('axios');
const FormData = require('form-data');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_UPLOAD_URL = 'http://121.40.171.211/v1/files/upload';

exports.main = async (event, context) => {
  const { fileID, fileName } = event;

  try {
    // 1. 从云存储下载文件
    const res = await cloud.downloadFile({
      fileID: fileID
    });
    const fileContent = res.fileContent;

    // 2. 创建FormData对象
    const form = new FormData();
    form.append('file', fileContent, {
      filename: fileName,
      contentType: 'application/octet-stream'
    });
    form.append('user', 'mini-program-user');

    // 3. 调用Dify上传接口
    const response = await axios.post(DIFY_UPLOAD_URL, form, {
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        ...form.getHeaders()
      }
    });

    // 4. 返回Dify的响应
    return {
      code: 200,
      data: response.data
    };

  } catch (error) {
    console.error('上传文件到Dify失败:', error);
    let errorMsg = '文件上传失败';
    
    if (error.response) {
      errorMsg = `Dify服务错误 (${error.response.status}): ${error.response.data?.message || error.response.statusText}`;
    }
    
    return {
      code: 500,
      message: errorMsg
    };
  }
};