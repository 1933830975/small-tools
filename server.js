const express = require('express');
const crypto = require('crypto');
const app = express();

const PORT = process.env.PORT || 10000;

// 中间件
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 全局记忆存储（Render内存模式，简单高效）
let userMemory = {
  recentTools: []
};

// 最大记忆条数
const MAX_MEMORY = 15;

// 记录工具使用
function addMemory(toolName) {
  const time = new Date().toLocaleString();
  const item = { tool: toolName, time };

  let list = userMemory.recentTools;
  // 去重
  list = list.filter(i => i.tool !== toolName);
  list.unshift(item);
  if (list.length > MAX_MEMORY) list = list.slice(0, MAX_MEMORY);
  userMemory.recentTools = list;
}

// 1. 获取记忆
app.get('/api/memory', (req, res) => {
  res.json({
    code: 200,
    data: userMemory.recentTools,
    msg: '获取记忆成功'
  });
});

// 2. 通用工具接口
app.post('/api/tool', (req, res) => {
  try {
    const { toolName, content = '' } = req.body;
    if (!toolName) return res.json({ code: 400, msg: '工具名不能为空' });

    // 记录记忆
    addMemory(toolName);

    let result = '';

    // ========== 真实工具逻辑 ==========
    switch (toolName) {
      case 'MD5加密':
        result = crypto.createHash('md5').update(content).digest('hex');
        break;
      case 'SHA256加密':
        result = crypto.createHash('sha256').update(content).digest('hex');
        break;
      case 'Base64编码':
        result = Buffer.from(content).toString('base64');
        break;
      case 'Base64解码':
        result = Buffer.from(content, 'base64').toString('utf8');
        break;
      case 'URL编码':
        result = encodeURIComponent(content);
        break;
      case 'URL解码':
        result = decodeURIComponent(content);
        break;
      case '文本翻转':
        result = content.split('').reverse().join('');
        break;
      case '字数统计':
        result = `字符数：${content.length} 字`;
        break;
      case '密码生成':
        result = crypto.randomBytes(6).toString('hex');
        break;
      default:
        result = `【${toolName}】已启动，可自行扩展逻辑`;
        break;
    }

    res.json({
      code: 200,
      msg: `执行成功：${toolName}`,
      data: { tool: toolName, content, result }
    });

  } catch (err) {
    res.json({ code: 500, msg: '执行失败：' + err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
  console.log(`服务运行在端口 ${PORT}`);
});
