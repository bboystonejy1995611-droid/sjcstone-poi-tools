/**
 * poiCategories.js — POI 行业大类 + 二级细分类目（本地数据，纯前端）
 *
 * ── 正式 POI 类目表导入预留 ──────────────────────────────
 * 以后你把飞书里的 POI 类目表导出为 Excel / CSV 后：
 *   1. 按下方结构整理（value / label / icon / words / items 五个字段）；
 *   2. 直接替换 POI_CATEGORIES 数组内容即可，业务代码无需任何改动。
 *
 * 字段约定：
 *   value    唯一标识（英文小写，如 'huoguo'，新增时保持唯一）
 *   label    展示名称（如 '火锅'）
 *   icon     emoji 图标（选填，缺省用大类图标）
 *   words    套餐命名关键词池（生成「XX招牌体验套餐」这类名称时随机取用）
 *   items    该细分类目的特色内容项（会被混入套餐内容）
 *            项支持两种写法：
 *              '招牌毛肚'                    → 普通内容项
 *              { label: '招牌{name}', tag: '1份' } → 模板项，{name} 会被替换为门店主营产品
 * ─────────────────────────────────────────────────────────
 */

export const POI_CATEGORIES = [
  {
    value: 'canyin',
    label: '餐饮美食',
    icon: '🍜',
    words: ['招牌', '人气', '经典', '必点', '热卖'],
    children: [
      { value: 'huoguo', label: '火锅', icon: '🍲', words: ['麻辣', '鸳鸯', '牛油'], items: ['招牌毛肚', '鲜切牛肉', '鸳鸯锅底', '特色小料自助', '冰粉甜品'] },
      { value: 'shaokao', label: '烧烤', icon: '🍢', words: ['炭火', '秘制', '深夜'], items: ['秘制烤串拼盘', '炭火烤鱼', '烤生蚝', '拍黄瓜小菜', '啤酒畅饮2瓶'] },
      { value: 'zhongcan', label: '中餐', icon: '🥘', words: ['家常', '匠心', '老味道'], items: ['招牌热菜任选', '时令例汤', '凉菜双拼', '手工主食'] },
      { value: 'chuan', label: '川菜', icon: '🌶️', words: ['麻辣', '鲜香', '巴适'], items: ['水煮鱼/毛血旺任选', '川味凉菜', '特色主食', '酸梅汤1扎'] },
      { value: 'xiaochi', label: '小吃快餐', icon: '🍟', words: ['人气', '快餐', '快捷'], items: ['招牌小吃拼盘', '经典主食1份', '饮品1杯', '小食1份'] },
      { value: 'mianguan', label: '面馆', icon: '🍜', words: ['手工', '浇头', '老汤'], items: ['招牌面1碗', '手工浇头', '卤蛋/小菜', '汤品1份'] },
      { value: 'chayin', label: '茶饮', icon: '🧋', words: ['人气', '手作', '爆款'], items: ['招牌奶茶任选', '人气果茶', '小料加料', '烘焙小食'] },
      { value: 'kafei', label: '咖啡', icon: '☕', words: ['手冲', '精品', '醇香'], items: ['招牌咖啡任选', '手冲单品1杯', '精致甜品', '美式双杯'] },
      { value: 'tianpin', label: '甜品', icon: '🍰', words: ['甜蜜', '法式', '人气'], items: ['招牌甜品任选', '饮品1杯', '精致小点', '当季限定款'] },
      { value: 'hongbei', label: '烘焙', icon: '🥐', words: ['现烤', '手作', '麦香'], items: ['现烤面包任选', '招牌蛋糕切件', '饮品1杯', '当季新品'] },
      { value: 'zizhu', label: '自助餐', icon: '🥩', words: ['畅吃', '豪享', '不限量'], items: ['全场菜品畅吃', '海鲜/烤肉档任选', '饮品畅饮', '甜品台畅享'] },
      { value: 'yexiao', label: '夜宵', icon: '🌙', words: ['深夜', '烟火', '撸串'], items: ['夜宵拼盘', '招牌烤串', '啤酒/饮品', '解腻小菜'] },
      { value: 'difang', label: '地方特色菜', icon: '🏮', words: ['地道', '乡愁', '匠心'], items: ['地方招牌菜', '特色小吃', '手工主食', '时令饮品'] },
      { value: 'qita_canyin', label: '其他餐饮', icon: '🍽️', words: ['招牌', '人气', '精选'], items: ['招牌菜品任选', '特色饮品', '精致小食', '当季限定'] }
    ]
  },
  {
    value: 'meiyi',
    label: '丽人美业',
    icon: '💅',
    words: ['焕颜', '轻奢', '精致', '人气'],
    children: [
      { value: 'meirong', label: '美容', icon: '💆‍♀️', words: ['焕颜', '嫩肤', '水光'], items: ['深层清洁护理', '面部补水导入', '院线精华面膜', '肩颈放松'] },
      { value: 'meifa', label: '美发', icon: '💇', words: ['焕新', '造型', '塑型'], items: ['首席发型师剪发', '头皮深层清洁', '洗护造型', '发丝护理'] },
      { value: 'meijia', label: '美甲美睫', icon: '💅', words: ['指尖', '美甲', '轻奢'], items: ['日式美甲', '手部护理', '甲型修剪塑形', '款式任选'] },
      { value: 'pifu', label: '皮肤管理', icon: '✨', words: ['净透', '水光', '紧致'], items: ['皮肤检测', '深层清洁管理', '补水导入', '院线面膜'] },
      { value: 'anmo', label: '按摩SPA', icon: '💆', words: ['舒缓', '经络', '深度'], items: ['全身经络疏通', '肩颈深度放松', '头部舒缓理疗', '艾灸/拔罐体验'] },
      { value: 'yangsheng', label: '养生馆', icon: '🍵', words: ['养生', '温养', '古法'], items: ['古法艾灸', '经络调理', '养生茶饮', '肩颈温养'] },
      { value: 'zuyu', label: '足浴', icon: '🦶', words: ['舒压', '暖足', '放松'], items: ['中药足浴', '足底反射按摩', '肩颈放松', '养生茶点'] },
      { value: 'caier', label: '采耳', icon: '👂', words: ['舒爽', '精细', '放松'], items: ['专业采耳', '耳部清洁', '头部按摩', '肩颈舒缓'] },
      { value: 'shoushen', label: '瘦身塑形', icon: '🏃‍♀️', words: ['塑形', '燃脂', '紧致'], items: ['体脂检测', '燃脂塑形体验', '局部紧致护理', '定制瘦身方案'] },
      { value: 'qita_meiyi', label: '其他美业', icon: '🌸', words: ['精致', '人气', '精选'], items: ['核心项目体验', '专属顾问咨询', '精致礼遇', '增值服务'] }
    ]
  },
  {
    value: 'xiuxian',
    label: '休闲娱乐',
    icon: '🎮',
    words: ['欢乐', '人气', '畅玩', '精选'],
    children: [
      { value: 'ktv', label: 'KTV', icon: '🎤', words: ['欢唱', '麦霸', '嗨唱'], items: ['欢唱时段2小时', '果盘1份', '饮品2杯', '点歌特权'] },
      { value: 'qipai', label: '棋牌室', icon: '🀄', words: ['畅玩', '休闲', '包间'], items: ['包间畅玩4小时', '茶水无限续', '小食拼盘', '空调包间'] },
      { value: 'chalou', label: '茶楼', icon: '🍵', words: ['雅致', '清幽', '慢生活'], items: ['茶位2位', '精选茶叶1泡', '茶点拼盘', '包间2小时'] },
      { value: 'jiuba', label: '酒吧', icon: '🍸', words: ['微醺', '氛围', '人气'], items: ['精酿/特调2杯', '小食拼盘', '驻唱演出观赏', '吧台畅聊'] },
      { value: 'taiqiu', label: '台球', icon: '🎱', words: ['竞技', '高手', '畅打'], items: ['台球畅打2小时', '球杆使用', '饮品1杯', '助教指导1次'] },
      { value: 'mishi', label: '密室逃脱', icon: '🔐', words: ['烧脑', '沉浸', '悬疑'], items: ['主题密室1场', 'NPC演绎体验', '谜题卡组', '通关纪念照'] },
      { value: 'hongpa', label: '轰趴馆', icon: '🎉', words: ['狂欢', '聚会', '包场'], items: ['场地包场4小时', '桌游/电玩畅玩', '饮品小食', 'K歌设备'] },
      { value: 'dianjing', label: '电竞馆', icon: '🖥️', words: ['开黑', '竞技', '畅玩'], items: ['电竞区畅玩2小时', '高端配置主机', '饮品1杯', '组队开黑'] },
      { value: 'dianwan', label: '电玩城', icon: '🕹️', words: ['欢乐', '嗨玩', '人气'], items: ['游戏币40枚', '娃娃机体验', '赛车/投篮任选', '小礼品1份'] },
      { value: 'qita_xiuxian', label: '其他娱乐', icon: '🎯', words: ['畅玩', '人气', '精选'], items: ['核心项目体验', '畅玩时段', '饮品小食', '增值礼遇'] }
    ]
  },
  {
    value: 'jiudian',
    label: '酒店民宿',
    icon: '🏨',
    words: ['观景', '静谧', '轻奢', '精品'],
    children: [
      { value: 'jiudian2', label: '酒店', icon: '🏨', words: ['臻选', '商务', '品质'], items: ['精品房型1晚', '双人自助早餐', '欢迎水果', '延迟退房'] },
      { value: 'minsu', label: '民宿', icon: '🏡', words: ['观景', '文艺', '私享'], items: ['特色房型1晚', '双人早餐', '庭院/露台体验', '欢迎茶点'] },
      { value: 'gongyu', label: '公寓', icon: '🏢', words: ['舒适', '居家', '长住'], items: ['舒适公寓1晚', '独立厨卫', '洗衣便利', '延迟退房'] },
      { value: 'kezhan', label: '客栈', icon: '⛩️', words: ['古韵', '质朴', '风情'], items: ['特色客房1晚', '双人早餐', '古镇导览', '欢迎茶点'] },
      { value: 'zhongdian', label: '钟点房', icon: '⏰', words: ['快捷', '休憩', '灵活'], items: ['钟点房4小时', '洗漱用品', '空调网络', '免费续钟1小时'] },
      { value: 'qinzifang', label: '亲子房', icon: '🧸', words: ['亲子', '童趣', '温馨'], items: ['亲子主题房1晚', '儿童洗漱礼包', '早餐3份', '亲子互动空间'] },
      { value: 'qinglv', label: '情侣房', icon: '💞', words: ['浪漫', '私密', '仪式感'], items: ['情侣主题房1晚', '浪漫布置', '双人早餐', '延迟退房'] },
      { value: 'qita_jiudian', label: '其他住宿', icon: '🛏️', words: ['舒适', '精选', '品质'], items: ['精选房型1晚', '早餐2份', '欢迎礼遇', '延迟退房'] }
    ]
  },
  {
    value: 'tiyu',
    label: '运动健身',
    icon: '🏋️',
    words: ['燃动', '塑形', '体验', '进阶'],
    children: [
      { value: 'jianshen', label: '健身房', icon: '🏋️', words: ['燃脂', '塑形', '私教'], items: ['私教体验课', '体态评估', '团操课程', '器械畅用'] },
      { value: 'yujia', label: '瑜伽', icon: '🧘', words: ['柔韧', '身心', '舒缓'], items: ['瑜伽体验课', '体态评估', '普拉提小班', '冥想放松'] },
      { value: 'pulati', label: '普拉提', icon: '🤸', words: ['核心', '塑形', '体态'], items: ['普拉提体验课', '核心评估', '小班授课', '器械体验'] },
      { value: 'youyong', label: '游泳', icon: '🏊', words: ['畅游', '健将', '清凉'], items: ['游泳体验1次', '泳具使用', '教练指导', '淋浴更衣'] },
      { value: 'lanqiu', label: '篮球馆', icon: '🏀', words: ['竞技', '对抗', '热血'], items: ['球场时段2小时', '篮球使用', '组队约战', '饮料1瓶'] },
      { value: 'yumaoqiu', label: '羽毛球馆', icon: '🏸', words: ['挥拍', '竞技', '畅打'], items: ['场地2小时', '球拍/球使用', '畅打时段', '淋浴更衣'] },
      { value: 'taiqiuguan', label: '台球馆', icon: '🎱', words: ['竞技', '高手', '畅打'], items: ['台球畅打2小时', '球杆使用', '助教指导', '饮品1杯'] },
      { value: 'wudao', label: '舞蹈', icon: '💃', words: ['律动', '燃脂', '舞感'], items: ['舞蹈体验课', '舞感评估', '小班教学', '成品舞学习'] },
      { value: 'sijiao', label: '私教', icon: '🥊', words: ['定制', '高效', '燃脂'], items: ['1对1私教课', '体测分析', '定制训练计划', '饮食建议'] },
      { value: 'qita_tiyu', label: '其他运动', icon: '⛹️', words: ['畅玩', '体验', '进阶'], items: ['运动体验1次', '装备使用', '教练指导', '运动饮品'] }
    ]
  },
  {
    value: 'qiche',
    label: '汽车服务',
    icon: '🚗',
    words: ['焕新', '精洗', '养护', '臻选'],
    children: [
      { value: 'xiche', label: '洗车', icon: '🚿', words: ['精洗', '焕新', '洁净'], items: ['全车精洗', '车内吸尘', '玻璃清洁', '轮毂清洗'] },
      { value: 'qichemeirong', label: '汽车美容', icon: '✨', words: ['焕新', '镀膜', '闪亮'], items: ['漆面打蜡', '内饰清洁', '玻璃镀膜', '轮胎养护'] },
      { value: 'baoyang', label: '保养', icon: '🛠️', words: ['省心', '专业', '养护'], items: ['基础保养', '机油更换', '全车检测', '轮胎检查'] },
      { value: 'weixiu', label: '维修', icon: '🔧', words: ['专业', '快捷', '靠谱'], items: ['故障检测', '维修工时', '配件更换', '洗车1次'] },
      { value: 'tiemo', label: '贴膜', icon: '🎞️', words: ['隔热', '隐形', '保护'], items: ['全车贴膜', '车窗隔热膜', '内饰保护膜', '贴膜质保'] },
      { value: 'gaise', label: '改色', icon: '🎨', words: ['个性', '潮流', '定制'], items: ['全车改色膜', '车顶黑化', '轮毂改色', '改色备案指导'] },
      { value: 'luntai', label: '轮胎', icon: '⚙️', words: ['安全', '耐磨', '专业'], items: ['轮胎更换', '四轮定位', '动平衡', '胎压监测'] },
      { value: 'motuo', label: '摩托车服务', icon: '🏍️', words: ['酷炫', '专业', '养护'], items: ['摩托车精洗', '链条养护', '机油更换', '全车检测'] },
      { value: 'qita_qiche', label: '其他汽车服务', icon: '🚙', words: ['专业', '省心', '精选'], items: ['核心服务体验', '全车检测', '增值养护', '洗车1次'] }
    ]
  },
  {
    value: 'jiaoyu',
    label: '教育培训',
    icon: '🎓',
    words: ['启航', '成长', '培优', '进阶'],
    children: [
      { value: 'zhiye', label: '职业培训', icon: '💼', words: ['技能', '认证', '职场'], items: ['精品体验课', '职业测评', '1对1规划', '资料礼包'] },
      { value: 'yishu', label: '艺术培训', icon: '🎨', words: ['启蒙', '美育', '素养'], items: ['艺术体验课', '作品测评', '小班教学', '材料礼包'] },
      { value: 'wudao2', label: '舞蹈培训', icon: '💃', words: ['形体', '律动', '考级'], items: ['舞蹈体验课', '形体测评', '小班教学', '汇演机会'] },
      { value: 'yinyue', label: '音乐培训', icon: '🎹', words: ['乐感', '启蒙', '考级'], items: ['乐器体验课', '乐感测评', '1对1教学', '练习曲谱'] },
      { value: 'shufa', label: '书法绘画', icon: '🖌️', words: ['静心', '素养', '传承'], items: ['书法/绘画体验课', '作品点评', '笔墨纸砚', '亲子共学'] },
      { value: 'yuyan', label: '语言培训', icon: '🗣️', words: ['流利', '地道', '进阶'], items: ['语言体验课', '水平测试', '1对1口语', '学习资料'] },
      { value: 'tiyu2', label: '体育培训', icon: '⚽', words: ['体能', '专业', '成长'], items: ['体育体验课', '体能测评', '专业教练', '训练方案'] },
      { value: 'qita_jiaoyu', label: '其他培训', icon: '📚', words: ['成长', '培优', '精选'], items: ['体验课1节', '学情测评', '规划咨询', '资料礼包'] }
    ]
  },
  {
    value: 'qinzi',
    label: '亲子娱乐',
    icon: '🎡',
    words: ['童趣', '亲子', '欢乐', '成长'],
    children: [
      { value: 'leyuan', label: '儿童乐园', icon: '🎠', words: ['欢乐', '畅玩', '童趣'], items: ['乐园畅玩2小时', '海洋球/滑梯任玩', '家长陪同', '小礼品1份'] },
      { value: 'qinzisheying', label: '亲子摄影', icon: '📷', words: ['纪念', '温馨', '童真'], items: ['亲子写真1组', '精修照片', '主题服装', '相册礼遇'] },
      { value: 'zaojiao', label: '早教', icon: '🧩', words: ['启蒙', '专注', '成长'], items: ['早教体验课', '成长测评', '亲子互动', '教具礼包'] },
      { value: 'ertongyundong', label: '儿童运动', icon: '🏃', words: ['体能', '活力', '成长'], items: ['体适能体验课', '体能测评', '专业教练', '运动礼包'] },
      { value: 'shougong', label: '儿童手工', icon: '🎨', words: ['创意', '动手', '童趣'], items: ['手工体验课', '材料包畅用', '作品带走', '亲子共做'] },
      { value: 'qinzicanting', label: '亲子餐厅', icon: '🍽️', words: ['童趣', '温馨', '亲子'], items: ['亲子套餐1份', '儿童餐1份', '游乐区畅玩', '家长饮品'] },
      { value: 'qita_qinzi', label: '其他亲子', icon: '🎈', words: ['欢乐', '亲子', '精选'], items: ['亲子项目体验', '家长陪同礼遇', '小礼品', '增值服务'] }
    ]
  },
  {
    value: 'shenghuo',
    label: '生活服务',
    icon: '🧹',
    words: ['省心', '精选', '贴心', '便捷'],
    children: [
      { value: 'jiazheng', label: '家政', icon: '🧹', words: ['省心', '专业', '洁净'], items: ['深度保洁2小时', '玻璃清洁', '厨房除油', '卫生间清洁'] },
      { value: 'sheying', label: '摄影写真', icon: '📸', words: ['写真', '纪念', '大片'], items: ['写真拍摄1组', '精修底片', '服装造型', '电子相册'] },
      { value: 'chongwu', label: '宠物服务', icon: '🐶', words: ['贴心', '专业', '宠爱'], items: ['宠物洗护1次', '基础美容', '指甲修剪', '零食礼包'] },
      { value: 'xiyi', label: '洗衣', icon: '👔', words: ['洁净', '护衣', '便捷'], items: ['衣物洗涤3件', '干洗1件', '鞋类清洁', '上门取送'] },
      { value: 'kaisuo', label: '开锁', icon: '🔑', words: ['快捷', '专业', '安心'], items: ['开锁服务1次', '锁具检测', '紧急上门', '换锁芯咨询'] },
      { value: 'banjia', label: '搬家', icon: '📦', words: ['省心', '高效', '稳妥'], items: ['基础搬家服务', '家具打包', '搬运上楼', '拆装服务'] },
      { value: 'weixiu2', label: '家电维修', icon: '🔧', words: ['专业', '快捷', '省心'], items: ['上门检测', '故障维修', '零件更换', '清洗保养'] },
      { value: 'qita_shenghuo', label: '其他生活服务', icon: '🛎️', words: ['贴心', '便捷', '精选'], items: ['核心服务体验', '上门服务', '增值礼遇', '优先预约'] }
    ]
  },
  {
    value: 'lingshou',
    label: '零售百货',
    icon: '🛍️',
    words: ['精选', '爆款', '臻选', '人气'],
    children: [
      { value: 'shuiguo', label: '水果生鲜', icon: '🍎', words: ['新鲜', '当季', '爆款'], items: ['当季水果拼盒', '精选果切', '果汁1杯', '坚果小食'] },
      { value: 'yanjiu', label: '烟酒茶', icon: '🍷', words: ['臻选', '礼遇', '品质'], items: ['精选酒水1瓶', '茶叶礼盒', '下酒小食', '礼盒包装'] },
      { value: 'bianli', label: '便利店', icon: '🏪', words: ['便利', '精选', '实惠'], items: ['零食大礼包', '饮料组合', '日用精选', '满减券包'] },
      { value: 'huadian', label: '花店', icon: '💐', words: ['浪漫', '清新', '花艺'], items: ['精选花束1束', '花瓶礼遇', '节日款花礼', '花艺卡片'] },
      { value: 'muying', label: '母婴', icon: '🍼', words: ['安心', '精选', '成长'], items: ['母婴精选礼包', '婴儿洗护', '益智玩具', '试用装组合'] },
      { value: 'fuzhuang', label: '服装鞋帽', icon: '👗', words: ['潮流', '穿搭', '精选'], items: ['精选单品1件', '搭配服务', '会员体验装', '满减券'] },
      { value: 'shuma', label: '数码产品', icon: '📱', words: ['科技', '爆款', '潮品'], items: ['数码配件任选', '贴膜服务', '清洁保养', '延保咨询'] },
      { value: 'qita_lingshou', label: '其他零售', icon: '🧺', words: ['精选', '爆款', '人气'], items: ['店内精选商品', '人气爆款', '会员体验装', '礼盒包装'] }
    ]
  },
  {
    value: 'qita',
    label: '其他实体商家',
    icon: '🏬',
    words: ['人气', '招牌', '精选', '体验'],
    children: [
      { value: 'qita_all', label: '其他实体商家', icon: '🏬', words: ['人气', '招牌', '精选'], items: ['核心服务体验', '专属顾问咨询', '增值服务', '优先预约'] }
    ]
  }
]

/**
 * 根据大类 value 查找大类配置（无则回退到「其他实体商家」）
 */
export function findCategoryGroup(groupValue) {
  return POI_CATEGORIES.find((g) => g.value === groupValue) || POI_CATEGORIES[POI_CATEGORIES.length - 1]
}

/**
 * 根据大类 + 类目 value 查找二级类目配置
 */
export function findSubCategory(groupValue, subValue) {
  const group = findCategoryGroup(groupValue)
  return group.children.find((c) => c.value === subValue) || group.children[0]
}
