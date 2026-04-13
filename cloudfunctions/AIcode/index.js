const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  try {
    // 获取参数
    const { path = 'pages/ai-chat/ai-chat', width = 300 } = event;
    console.log('生成纯净无Logo二维码，参数:', { path, width });

    // 关键修改：使用createQRCode接口生成无Logo的传统二维码
    // 注意：wxacode.get和wxacode.getUnlimited生成的是带Logo的小程序码
    const result = await cloud.openapi.wxacode.createQRCode({
      path: path,   // 页面路径，包含查询参数
      width: width  // 二维码宽度，范围100-1280
    })

    // 将生成的二维码上传到云存储
    const timestamp = Date.now()
    const cloudPath = `qrcodes/pure-qr-${timestamp}.png`
    const uploadResult = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: result.buffer  // 直接使用接口返回的二进制数据
    })

    // 获取临时访问链接
    const fileID = uploadResult.fileID
    const fileUrlRes = await cloud.getTempFileURL({
      fileList: [fileID]
    })

    if (fileUrlRes.fileList && fileUrlRes.fileList.length > 0) {
      return {
        code: 200,
        message: '纯净无Logo二维码生成成功',
        data: {
          fileID: fileID,
          tempFileURL: fileUrlRes.fileList[0].tempFileURL
        }
      }
    } else {
      throw new Error('获取二维码临时URL失败')
    }

  } catch (err) {
    console.error('生成纯净二维码失败:', err)
    return {
      code: 500,
      message: err.errMsg || '生成二维码失败',
      error: err
    }
  }
}
