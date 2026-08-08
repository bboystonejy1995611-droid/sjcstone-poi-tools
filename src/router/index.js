import { createRouter, createWebHashHistory } from 'vue-router'

// 工具路由注册表：以后新增工具（AI视频脚本生成器 / 朋友圈文案生成器 /
// 利润计算器 / 门店诊断工具）只需在下方 routes 追加一项，并放入 src/views/ 即可。
//
// 【后台管理系统预留】以后要接统计后台时，取消下面这段的注释：
//   {
//     path: '/admin',
//     name: 'admin',
//     component: () => import('../views/AdminView.vue'), // 需要自建 src/views/AdminView.vue
//     meta: { title: '数据统计后台' }
//   },
// 访问地址为 域名/#/admin（hash 路由，无需额外服务器配置）。
const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/GeneratorView.vue'),
    meta: { title: 'AI团购套餐生成器' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.afterEach((to) => {
  const title = to.meta?.title
  document.title = title ? `${title} · 本地商家实用工具箱` : '本地商家实用工具箱'
})

export default router
