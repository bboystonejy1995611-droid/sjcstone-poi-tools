<script setup>
import { useInView } from '../../composables/useInView'

const { el, visible } = useInView()

const tools = [
  {
    name: 'AI 团购套餐生成器',
    free: true,
    desc: '输入门店信息，自动生成 3 套适合视频号 POI 上架的团购套餐。免费引流工具，无需积分。',
    to: '/generator',
    tint: 'rgba(49, 94, 251, 0.1)',
    color: '#315efb',
    icon: 'spark'
  },
  {
    name: 'AI短视频口播生成器',
    free: true,
    desc: '输入产品或主题，生成可直接录制的短视频口播文案，适合门店日常引流。',
    to: '/tool/oral_script',
    tint: 'rgba(124, 92, 252, 0.1)',
    color: '#7c5cfc',
    icon: 'video'
  },
  {
    name: 'AI探店脚本生成器',
    free: true,
    desc: '输入门店信息，产出探店视频的完整脚本：开场、卖点、节奏与结尾引导。',
    to: '/tool/visit_script',
    tint: 'rgba(224, 85, 200, 0.1)',
    color: '#e055c8',
    icon: 'pen'
  },
  {
    name: 'AI营销方案生成器',
    free: true,
    desc: '针对门店目标输出可执行营销方案：拉新、活动、转化节奏与执行清单。',
    to: '/tool/marketing_plan',
    tint: 'rgba(23, 195, 230, 0.1)',
    color: '#17c3e6',
    icon: 'chart'
  },
  {
    name: 'AI海报提示词生成器',
    free: true,
    desc: '生成海报 AI 绘画提示词，让门店活动海报一键出图。',
    to: '/tool/poster_prompt',
    tint: 'rgba(245, 158, 11, 0.12)',
    color: '#f59e0b',
    icon: 'calc'
  },
  {
    name: 'AI海报生成器',
    points: 20,
    desc: '一句话直接生成门店活动海报图片，选风格、配文案，即出成品图。',
    to: '/tool/poster_image',
    tint: 'rgba(49, 94, 251, 0.1)',
    color: '#315efb',
    icon: 'image'
  },
  {
    name: '宣传视频生成器',
    points: 50,
    desc: '生成门店宣传短视频，适合开业、活动、新品推广（即将上线）。',
    to: '/tool/promo_video',
    tint: 'rgba(224, 85, 200, 0.1)',
    color: '#e055c8',
    icon: 'film'
  }
]
</script>

<template>
  <section id="tools" ref="el" class="l-section tools" :class="{ 'is-visible': visible }">
    <div class="l-container">
      <div class="l-center l-reveal" :class="{ 'is-visible': visible }">
        <span class="l-kicker">AI 工具集</span>
        <h2 class="l-title">一套 AI 工具箱，打通 POI 团购全流程</h2>
        <p class="l-desc">
          围绕「团购套餐 → 内容营销 → 到店转化 → 复购锁客」打造的 AI 工具链，每个工具都开箱即用。
        </p>
      </div>

      <div class="tools__grid">
        <article
          v-for="(tool, i) in tools"
          :key="tool.name"
          class="l-card tools__item l-reveal"
          :style="{ transitionDelay: `${i * 60}ms` }"
          :class="{ 'is-visible': visible }"
        >
          <div class="tools__icon" :style="{ background: tool.tint, color: tool.color }">
            <svg v-if="tool.icon === 'spark'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7L12 2Z" />
              <path d="M19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15Z" />
            </svg>
            <svg v-else-if="tool.icon === 'video'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5.5" width="13" height="13" rx="3" />
              <path d="M16 10.5l5-3v9l-5-3" />
            </svg>
            <svg v-else-if="tool.icon === 'pen'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1Z" />
              <path d="M14 7l3 3" />
            </svg>
            <svg v-else-if="tool.icon === 'chart'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
            </svg>
            <svg v-else-if="tool.icon === 'calc'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <rect x="5" y="3" width="14" height="18" rx="2.5" />
              <path d="M9 7.5h6M9 12h.01M12 12h.01M15 12h.01M9 15h.01M12 15h.01M15 15h.01M9 18h.01M12 18h.01" />
            </svg>
            <svg v-else-if="tool.icon === 'image'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2.5" />
              <circle cx="8.5" cy="9.5" r="1.8" />
              <path d="m21 15.5-4.5-4.5L6 21" />
            </svg>
            <svg v-else-if="tool.icon === 'film'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2.5" />
              <path d="M7.5 4v16M16.5 4v16M3 9h4.5M3 15h4.5M16.5 9H21M16.5 15H21" />
            </svg>
            <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.9-.4-4.1-1L3 21l1.5-5.4A8.5 8.5 0 1 1 21 12Z" />
              <path d="M8.5 10.5h7M8.5 14h4.5" />
            </svg>
          </div>

          <div class="tools__head">
            <h3>{{ tool.name }}</h3>
            <span class="l-tag" :class="tool.free ? 'l-tag--free' : 'l-tag--paid'">
              {{ tool.free ? '免费' : `${tool.points} 积分/次` }}
            </span>
          </div>
          <p class="tools__desc">{{ tool.desc }}</p>

          <router-link :to="tool.to" class="tools__go">
            立即使用
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </router-link>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tools {
  background: linear-gradient(180deg, var(--bg) 0%, var(--surface-2) 100%);
}

.tools__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 52px;
}

.tools__item {
  padding: 26px;
  transition: transform 0.25s ease, box-shadow 0.25s ease, opacity 0.6s ease, border-color 0.25s ease;
}

.tools__item:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(49, 94, 251, 0.28);
}

.tools__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
}

.tools__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 18px;
}

.tools__head h3 {
  font-size: 17.5px;
  font-weight: 700;
  letter-spacing: -0.2px;
  color: var(--text);
}

.tools__desc {
  margin-top: 10px;
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--text-2);
  min-height: 72px;
}

.tools__go {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-deep);
  transition: gap 0.18s ease;
}

.tools__go:hover {
  gap: 10px;
}

.tools__go--disabled {
  color: var(--text-3);
  cursor: default;
}

.l-tag--free {
  color: #0a9b5e;
  background: rgba(18, 183, 106, 0.1);
  border: 1px solid rgba(18, 183, 106, 0.28);
}

.l-tag--paid {
  color: var(--primary-deep);
  background: rgba(49, 94, 251, 0.08);
  border: 1px solid rgba(49, 94, 251, 0.25);
}

@media (max-width: 960px) {
  .tools__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 620px) {
  .tools__grid {
    grid-template-columns: 1fr;
  }

  .tools__desc {
    min-height: 0;
  }
}
</style>
