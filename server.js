const express = require('express');
const crypto = require('crypto');
const app = express();

const PORT = process.env.PORT || 10000;

// 中间件
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 全局数据存储
let userMemory = { recentTools: [] };
let toolStats = {}; // 工具使用统计
let userFavorites = []; // 收藏工具列表
const MAX_MEMORY = 15;

// 摩斯密码映射表
const morseCodeMap = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---',
  '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
  '8': '---..', '9': '----.', '.': '.-.-.-', ',': '--..--', '?': '..--..',
  '"': '.-..-.', '/': '-..-.', '@': '.--.-.', '-': '-....-', '(': '-.--.',
  ')': '-.--.-', ' ': '/'
};
const morseDecodeMap = Object.fromEntries(
  Object.entries(morseCodeMap).map(([k, v]) => [v, k])
);

// 记录工具使用 + 更新统计
function addMemory(toolName) {
  const time = new Date().toLocaleString();
  const item = { tool: toolName, time };
  let list = userMemory.recentTools;
  list = list.filter(i => i.tool !== toolName);
  list.unshift(item);
  if (list.length > MAX_MEMORY) list = list.slice(0, MAX_MEMORY);
  userMemory.recentTools = list;

  // 更新统计
  toolStats[toolName] = (toolStats[toolName] || 0) + 1;
}

// 1. 获取记忆
app.get('/api/memory', (req, res) => {
  res.json({ code: 200, data: userMemory.recentTools, msg: '获取记忆成功' });
});

// 2. 获取工具统计
app.get('/api/stats', (req, res) => {
  res.json({ code: 200, data: toolStats, msg: '获取统计成功' });
});

// 3. 收藏工具（增/删）
app.post('/api/favorite', (req, res) => {
  const { toolName, action } = req.body;
  if (!toolName || !action) return res.json({ code: 400, msg: '参数错误' });

  if (action === 'add') {
    if (!userFavorites.includes(toolName)) userFavorites.push(toolName);
  } else if (action === 'remove') {
    userFavorites = userFavorites.filter(t => t !== toolName);
  }
  res.json({ code: 200, data: userFavorites, msg: '操作成功' });
});

// 4. 获取收藏列表
app.get('/api/favorites', (req, res) => {
  res.json({ code: 200, data: userFavorites, msg: '获取收藏成功' });
});

// 5. 导出所有数据
app.get('/api/export', (req, res) => {
  const data = {
    memory: userMemory.recentTools,
    stats: toolStats,
    favorites: userFavorites,
    exportTime: new Date().toLocaleString()
  };
  res.json({ code: 200, data, msg: '导出成功' });
});

// 6. 清空所有数据
app.post('/api/clear', (req, res) => {
  userMemory = { recentTools: [] };
  toolStats = {};
  userFavorites = [];
  res.json({ code: 200, msg: '数据已清空' });
});

// 7. 通用工具接口
app.post('/api/tool', (req, res) => {
  try {
    const { toolName, content = '' } = req.body;
    if (!toolName) return res.json({ code: 400, msg: '工具名不能为空' });
    addMemory(toolName);

    let result = '';
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
      case '摩斯密码编码':
        result = content.toUpperCase().split('').map(c => morseCodeMap[c] || c).join(' ');
        break;
      case '摩斯密码解码':
        result = content.split(' ').map(m => morseDecodeMap[m] || m).join('');
        break;
      case '进制转换':
        const [numStr, fromBaseStr, toBaseStr] = content.split(',');
        const fromBase = parseInt(fromBaseStr);
        const toBase = parseInt(toBaseStr);
        if (isNaN(fromBase) || isNaN(toBase) || fromBase < 2 || fromBase > 36 || toBase < 2 || toBase > 36) {
          result = '格式错误，请输入：数字,原进制(2-36),目标进制(2-36)，例如：123,10,2';
        } else {
          const num = parseInt(numStr, fromBase);
          result = isNaN(num) ? '数字格式错误' : num.toString(toBase);
        }
        break;
      default:
        result = `【${toolName}】已启动，可自行扩展逻辑`;
        break;
    }

    res.json({ code: 200, msg: `执行成功：${toolName}`, data: { tool: toolName, content, result } });
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
