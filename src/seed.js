// 种子菜品数据：覆盖早/午/晚、多种菜系与口味
// meals: breakfast | lunch | dinner
// tags: 荤 / 素 / 清淡 / 辣 / 汤 / 主食 / 轻食 / 重口
export const SEED_DISHES = [
  // ---------- 早餐 ----------
  { name: '豆浆油条', cuisine: '家常', meals: ['breakfast'], tags: ['素', '主食'], spice: 0, cook: 10, price: 8, ingredients: ['黄豆', '面粉'] },
  { name: '小笼包', cuisine: '沪菜', meals: ['breakfast'], tags: ['荤', '主食'], spice: 0, cook: 15, price: 18, ingredients: ['面粉', '猪肉'] },
  { name: '皮蛋瘦肉粥', cuisine: '粤菜', meals: ['breakfast'], tags: ['荤', '清淡'], spice: 0, cook: 30, price: 12, ingredients: ['大米', '皮蛋', '猪肉'] },
  { name: '肠粉', cuisine: '粤菜', meals: ['breakfast'], tags: ['清淡', '主食'], spice: 0, cook: 15, price: 12, ingredients: ['米浆', '鸡蛋', '生菜'] },
  { name: '煎饼果子', cuisine: '津菜', meals: ['breakfast'], tags: ['主食'], spice: 0, cook: 10, price: 8, ingredients: ['面粉', '鸡蛋', '薄脆'] },
  { name: '三明治', cuisine: '西餐', meals: ['breakfast'], tags: ['清淡', '主食'], spice: 0, cook: 8, price: 15, ingredients: ['面包', '鸡蛋', '生菜'] },
  { name: '燕麦牛奶', cuisine: '轻食', meals: ['breakfast'], tags: ['素', '清淡', '轻食'], spice: 0, cook: 5, price: 8, ingredients: ['燕麦', '牛奶'] },
  { name: '小米粥配咸菜', cuisine: '家常', meals: ['breakfast'], tags: ['素', '清淡'], spice: 0, cook: 25, price: 6, ingredients: ['小米', '咸菜'] },
  { name: '生煎包', cuisine: '沪菜', meals: ['breakfast'], tags: ['荤', '主食'], spice: 0, cook: 20, price: 16, ingredients: ['面粉', '猪肉'] },

  // ---------- 午晚餐 · 家常 ----------
  { name: '番茄炒蛋', cuisine: '家常', meals: ['lunch', 'dinner'], tags: ['清淡'], spice: 0, cook: 10, price: 15, ingredients: ['番茄', '鸡蛋'] },
  { name: '青椒肉丝', cuisine: '家常', meals: ['lunch', 'dinner'], tags: ['荤'], spice: 1, cook: 20, price: 22, ingredients: ['青椒', '猪肉'] },
  { name: '酸辣土豆丝', cuisine: '家常', meals: ['lunch', 'dinner'], tags: ['素', '辣'], spice: 2, cook: 15, price: 12, ingredients: ['土豆', '辣椒'] },
  { name: '红烧肉', cuisine: '本帮菜', meals: ['dinner'], tags: ['荤', '重口'], spice: 0, cook: 60, price: 35, ingredients: ['五花肉', '冰糖'] },
  { name: '可乐鸡翅', cuisine: '家常', meals: ['lunch', 'dinner'], tags: ['荤'], spice: 0, cook: 30, price: 28, ingredients: ['鸡翅', '可乐'] },
  { name: '糖醋排骨', cuisine: '浙菜', meals: ['dinner'], tags: ['荤', '重口'], spice: 0, cook: 45, price: 38, ingredients: ['排骨', '醋', '糖'] },
  { name: '干煸豆角', cuisine: '家常', meals: ['lunch', 'dinner'], tags: ['素', '辣'], spice: 2, cook: 20, price: 18, ingredients: ['豆角', '辣椒'] },
  { name: '皮蛋豆腐', cuisine: '家常', meals: ['lunch', 'dinner'], tags: ['素', '清淡'], spice: 1, cook: 5, price: 10, ingredients: ['皮蛋', '豆腐'] },
  { name: '拍黄瓜', cuisine: '家常', meals: ['lunch', 'dinner'], tags: ['素', '清淡'], spice: 1, cook: 5, price: 8, ingredients: ['黄瓜', '蒜'] },
  { name: '凉拌木耳', cuisine: '家常', meals: ['lunch', 'dinner'], tags: ['素', '清淡'], spice: 1, cook: 10, price: 10, ingredients: ['木耳', '香菜'] },
  { name: '番茄牛腩', cuisine: '家常', meals: ['dinner'], tags: ['荤', '汤'], spice: 0, cook: 90, price: 45, ingredients: ['牛腩', '番茄'] },

  // ---------- 午晚餐 · 川湘 ----------
  { name: '麻婆豆腐', cuisine: '川菜', meals: ['lunch', 'dinner'], tags: ['辣', '重口'], spice: 2, cook: 20, price: 20, ingredients: ['豆腐', '肉末', '花椒'] },
  { name: '宫保鸡丁', cuisine: '川菜', meals: ['lunch', 'dinner'], tags: ['荤', '辣'], spice: 2, cook: 25, price: 30, ingredients: ['鸡胸肉', '花生', '辣椒'] },
  { name: '鱼香肉丝', cuisine: '川菜', meals: ['lunch', 'dinner'], tags: ['荤', '辣'], spice: 2, cook: 25, price: 28, ingredients: ['猪肉', '木耳', '胡萝卜'] },
  { name: '回锅肉', cuisine: '川菜', meals: ['lunch', 'dinner'], tags: ['荤', '辣', '重口'], spice: 2, cook: 30, price: 32, ingredients: ['五花肉', '青蒜', '豆瓣酱'] },
  { name: '水煮鱼', cuisine: '川菜', meals: ['dinner'], tags: ['荤', '辣', '重口'], spice: 3, cook: 40, price: 60, ingredients: ['草鱼', '辣椒', '花椒'] },
  { name: '麻辣香锅', cuisine: '川菜', meals: ['dinner'], tags: ['辣', '重口'], spice: 3, cook: 40, price: 55, ingredients: ['莲藕', '虾', '香锅底料'] },
  { name: '麻辣烫', cuisine: '川菜', meals: ['lunch', 'dinner'], tags: ['辣', '汤'], spice: 2, cook: 20, price: 30, ingredients: ['时蔬', '丸子', '麻酱'] },
  { name: '火锅', cuisine: '川菜', meals: ['dinner'], tags: ['辣', '重口', '汤'], spice: 3, cook: 60, price: 80, ingredients: ['牛羊肉', '毛肚', '火锅底料'] },
  { name: '烤鱼', cuisine: '川菜', meals: ['dinner'], tags: ['荤', '辣', '重口'], spice: 3, cook: 50, price: 70, ingredients: ['鲈鱼', '辣椒', '土豆'] },
  { name: '小炒黄牛肉', cuisine: '湘菜', meals: ['lunch', 'dinner'], tags: ['荤', '辣'], spice: 3, cook: 25, price: 40, ingredients: ['牛肉', '小米辣', '芹菜'] },
  { name: '辣椒炒肉', cuisine: '湘菜', meals: ['lunch', 'dinner'], tags: ['荤', '辣'], spice: 2, cook: 20, price: 28, ingredients: ['猪肉', '螺丝椒'] },
  { name: '麻辣小龙虾', cuisine: '湘菜', meals: ['dinner'], tags: ['荤', '辣', '重口'], spice: 3, cook: 60, price: 90, ingredients: ['小龙虾', '辣椒', '啤酒'] },

  // ---------- 午晚餐 · 粤菜 ----------
  { name: '清蒸鲈鱼', cuisine: '粤菜', meals: ['dinner'], tags: ['荤', '清淡'], spice: 0, cook: 25, price: 45, ingredients: ['鲈鱼', '葱姜'] },
  { name: '白灼虾', cuisine: '粤菜', meals: ['lunch', 'dinner'], tags: ['荤', '清淡'], spice: 0, cook: 15, price: 50, ingredients: ['虾', '姜'] },
  { name: '白切鸡', cuisine: '粤菜', meals: ['lunch', 'dinner'], tags: ['荤', '清淡'], spice: 0, cook: 40, price: 40, ingredients: ['三黄鸡', '姜葱'] },
  { name: '广式烧腊饭', cuisine: '粤菜', meals: ['lunch', 'dinner'], tags: ['荤', '主食'], spice: 0, cook: 40, price: 30, ingredients: ['叉烧', '米饭', '青菜'] },

  // ---------- 午晚餐 · 面食 ----------
  { name: '兰州拉面', cuisine: '面食', meals: ['breakfast', 'lunch', 'dinner'], tags: ['主食', '汤'], spice: 1, cook: 15, price: 20, ingredients: ['拉面', '牛肉', '香菜'] },
  { name: '重庆小面', cuisine: '面食', meals: ['breakfast', 'lunch'], tags: ['主食', '辣'], spice: 2, cook: 12, price: 15, ingredients: ['面条', '辣椒油', '豌豆'] },
  { name: '西红柿鸡蛋面', cuisine: '面食', meals: ['breakfast', 'lunch', 'dinner'], tags: ['主食', '清淡'], spice: 0, cook: 15, price: 12, ingredients: ['面条', '番茄', '鸡蛋'] },
  { name: '炸酱面', cuisine: '面食', meals: ['lunch', 'dinner'], tags: ['主食', '荤'], spice: 0, cook: 25, price: 18, ingredients: ['面条', '肉末', '黄豆酱'] },
  { name: '螺蛳粉', cuisine: '桂菜', meals: ['lunch', 'dinner'], tags: ['主食', '辣', '重口'], spice: 3, cook: 15, price: 18, ingredients: ['米粉', '酸笋', '螺蛳汤'] },
  { name: '牛肉粉', cuisine: '黔菜', meals: ['breakfast', 'lunch'], tags: ['主食', '辣', '汤'], spice: 1, cook: 15, price: 18, ingredients: ['米粉', '牛肉', '酸菜'] },
  { name: '蒸饺', cuisine: '家常', meals: ['breakfast', 'lunch'], tags: ['荤', '主食'], spice: 0, cook: 25, price: 16, ingredients: ['面粉', '猪肉', '白菜'] },

  // ---------- 午晚餐 · 快餐/外食 ----------
  { name: '沙县拌面扁肉', cuisine: '闽菜', meals: ['breakfast', 'lunch'], tags: ['主食', '清淡'], spice: 0, cook: 12, price: 16, ingredients: ['面条', '花生酱', '扁肉'] },
  { name: '黄焖鸡米饭', cuisine: '家常', meals: ['lunch', 'dinner'], tags: ['荤', '主食'], spice: 1, cook: 30, price: 25, ingredients: ['鸡腿', '香菇', '米饭'] },
  { name: '咖喱鸡饭', cuisine: '日料', meals: ['lunch', 'dinner'], tags: ['荤', '主食'], spice: 1, cook: 40, price: 30, ingredients: ['鸡腿', '咖喱', '土豆'] },
  { name: '寿司拼盘', cuisine: '日料', meals: ['lunch', 'dinner'], tags: ['清淡', '主食'], spice: 0, cook: 30, price: 60, ingredients: ['米饭', '三文鱼', '海苔'] },
  { name: '日式拉面', cuisine: '日料', meals: ['lunch', 'dinner'], tags: ['主食', '汤'], spice: 0, cook: 20, price: 45, ingredients: ['拉面', '叉烧', '溏心蛋'] },
  { name: '韩式拌饭', cuisine: '韩料', meals: ['lunch', 'dinner'], tags: ['主食', '辣'], spice: 1, cook: 20, price: 35, ingredients: ['米饭', '时蔬', '辣酱'] },
  { name: '部队锅', cuisine: '韩料', meals: ['dinner'], tags: ['辣', '汤', '重口'], spice: 2, cook: 30, price: 55, ingredients: ['火腿', '泡面', '辣酱'] },
  { name: '披萨', cuisine: '西餐', meals: ['lunch', 'dinner'], tags: ['荤', '主食'], spice: 0, cook: 45, price: 60, ingredients: ['面粉', '芝士', '香肠'] },
  { name: '番茄意面', cuisine: '西餐', meals: ['lunch', 'dinner'], tags: ['主食'], spice: 0, cook: 25, price: 40, ingredients: ['意面', '番茄', '肉酱'] },
  { name: '汉堡薯条', cuisine: '西餐', meals: ['lunch', 'dinner'], tags: ['荤', '主食'], spice: 0, cook: 15, price: 35, ingredients: ['面包', '牛肉饼', '土豆'] },
  { name: '鸡胸肉沙拉', cuisine: '轻食', meals: ['lunch', 'dinner'], tags: ['轻食', '清淡'], spice: 0, cook: 15, price: 30, ingredients: ['鸡胸肉', '生菜', '藜麦'] },
  { name: '蔬菜沙拉', cuisine: '轻食', meals: ['lunch', 'dinner'], tags: ['素', '轻食', '清淡'], spice: 0, cook: 10, price: 28, ingredients: ['生菜', '圣女果', '玉米'] }
];
