<script setup>
import { useInView } from '../../composables/useInView'

const { el, visible } = useInView()

const solutions = [
  {
    title: '拉新获客',
    desc: 'POI 挂载 + 团购引流，让门店被同城刷到，附近的人划到就能下单。',
    icon: 'user',
    tint: 'rgba(49, 94, 251, 0.1)',
    color: '#315efb'
  },
  {
    title: '转化提升',
    desc: 'AI 设计高转化套餐组合与限时话术，把「进店看看」变成「直接下单」。',
    icon: 'cart',
    tint: 'rgba(124, 92, 252, 0.1)',
    color: '#7c5cfc'
  },
  {
    title: '复购锁客',
    desc: '次卡、会员、储值等组合玩法，把一次性流量沉淀成回头客。',
    icon: 'heart',
    tint: 'rgba(224, 85, 200, 0.1)',
    color: '#e055c8'
  },
  {
    title: '经营提效',
    desc: '内容批量生产 + 数据复盘，一个人也能管好门店线上经营。',
    icon: 'bolt',
    tint: 'rgba(18, 183, 106, 0.12)',
    color: '#12b76a'
  }
]

const industries = ['餐饮美食', '美业健身', '休闲娱乐', '零售便利', '酒店民宿', '亲子教育']
</script>

<template>
  <section id="solutions" ref="el" class="l-section solutions" :class="{ 'is-visible': visible }">
    <div class="l-container solutions__inner">
      <!-- 左：文案 -->
      <div class="solutions__copy l-reveal" :class="{ 'is-visible': visible }">
        <span class="l-kicker">本地商家解决方案</span>
        <h2 class="l-title">
          从新客进店
          <br />
          到老客复购
        </h2>
        <p class="l-desc">
          围绕视频号 POI 团购与门店经营目标，把 AI 工具组合成真正能落地的增长方案——不分行业、不看规模。
        </p>

        <div class="solutions__ind">
          <span class="solutions__ind-label">适合行业</span>
          <div class="solutions__ind-list">
            <span v-for="ind in industries" :key="ind" class="solutions__ind-chip">{{ ind }}</span>
          </div>
        </div>
      </div>

      <!-- 右：2x2 卡片 -->
      <div class="solutions__grid">
        <article
          v-for="(s, i) in solutions"
          :key="s.title"
          class="l-card solutions__item l-reveal"
          :style="{ transitionDelay: `${i * 70}ms` }"
          :class="{ 'is-visible': visible }"
        >
          <div class="solutions__icon" :style="{ background: s.tint, color: s.color }">
            <svg v-if="s.icon === 'user'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="3.6" />
              <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
            </svg>
            <svg v-else-if="s.icon === 'cart'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="20" r="1.6" />
              <circle cx="17" cy="20" r="1.6" />
              <path d="M3 4h2l2.4 11.2a1.6 1.6 0 0 0 1.6 1.3h7.6a1.6 1.6 0 0 0 1.6-1.3L20 8H6" />
            </svg>
            <svg v-else-if="s.icon === 'heart'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20.5S4 15.5 4 9.8A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8 2.8c0 5.7-8 10.7-8 10.7Z" />
            </svg>
            <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
            </svg>
          </div>
          <h3 class="solutions__title">{{ s.title }}</h3>
          <p class="solutions__desc">{{ s.desc }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.solutions {
  background: var(--bg);
}

.solutions__inner {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 64px;
  align-items: start;
}

.solutions__ind {
  margin-top: 30px;
}

.solutions__ind-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-3);
  letter-spacing: 0.4px;
}

.solutions__ind-list {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 12px;
}

.solutions__ind-chip {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 13px;
  color: var(--text-2);
}

.solutions__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.solutions__item {
  padding: 24px;
  transition: transform 0.25s ease, box-shadow 0.25s ease, opacity 0.6s ease, border-color 0.25s ease;
}

.solutions__item:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(124, 92, 252, 0.28);
}

.solutions__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 13px;
}

.solutions__title {
  margin-top: 16px;
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}

.solutions__desc {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-2);
}

@media (max-width: 960px) {
  .solutions__inner {
    grid-template-columns: 1fr;
    gap: 40px;
  }
}

@media (max-width: 560px) {
  .solutions__grid {
    grid-template-columns: 1fr;
  }
}
</style>
