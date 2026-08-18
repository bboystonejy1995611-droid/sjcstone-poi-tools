<script setup>
import { useInView } from '../../composables/useInView'

const { el, visible } = useInView()

const cases = [
  {
    industry: '餐饮 · 火锅',
    emoji: '🍲',
    metric: '+186%',
    metricLabel: 'GMV 增长',
    title: '3 套双人餐组合上架视频号',
    desc: '重庆某连锁火锅店，AI 生成套餐并挂载门店 POI，首月核销 1200+ 单。',
    quote: '过去靠线下吆喝，现在刷视频就能下单。',
    cover: 'linear-gradient(135deg, #ff7a59 0%, #ff4d6d 100%)'
  },
  {
    industry: '美业 · 美甲',
    emoji: '💅',
    metric: '+41%',
    metricLabel: '复购率提升',
    title: '体验款 + 次卡组合锁客',
    desc: '杭州某美甲工作室，用「低门槛体验款 + 次卡」组合，新客到店率大幅提升。',
    quote: '次卡把一次性新客，锁成了回头客。',
    cover: 'linear-gradient(135deg, #b16bff 0%, #e055c8 100%)'
  },
  {
    industry: '茶饮 · 新式茶饮',
    emoji: '🧋',
    metric: '3x',
    metricLabel: '单店月销',
    title: '单条挂载视频带来 800+ 下单',
    desc: '长沙某茶饮品牌，短视频挂载门店 POI，内容种草直接转化为团购成交。',
    quote: '内容种草，团购直接成交。',
    cover: 'linear-gradient(135deg, #12b76a 0%, #17c3e6 100%)'
  }
]
</script>

<template>
  <section id="cases" ref="el" class="l-section cases" :class="{ 'is-visible': visible }">
    <div class="l-container">
      <div class="l-center l-reveal" :class="{ 'is-visible': visible }">
        <span class="l-kicker">商家案例</span>
        <h2 class="l-title">真实门店，看得见的增长</h2>
        <p class="l-desc">来自餐饮、美业、茶饮等行业的门店实践，用数据说话。</p>
      </div>

      <div class="cases__grid">
        <article
          v-for="(c, i) in cases"
          :key="c.industry"
          class="l-card cases__item l-reveal"
          :style="{ transitionDelay: `${i * 90}ms` }"
          :class="{ 'is-visible': visible }"
        >
          <div class="cases__cover" :style="{ background: c.cover }">
            <span class="cases__cover-emoji" aria-hidden="true">{{ c.emoji }}</span>
            <span class="cases__cover-industry">{{ c.industry }}</span>
            <div class="cases__cover-metric">
              <b>{{ c.metric }}</b>
              <span>{{ c.metricLabel }}</span>
            </div>
          </div>

          <div class="cases__body">
            <h3 class="cases__title">{{ c.title }}</h3>
            <p class="cases__desc">{{ c.desc }}</p>
            <div class="cases__quote">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.5 6C6 7.5 4 10.2 4 14v4h6v-6H6.8c.3-2.3 1.5-3.8 3.6-4.8L9.5 6Zm10 0c-3.5 1.5-5.5 4.2-5.5 8v4h6v-6h-3.2c.3-2.3 1.5-3.8 3.6-4.8L19.5 6Z" />
              </svg>
              {{ c.quote }}
            </div>
          </div>
        </article>
      </div>

      <p class="cases__note l-reveal" :class="{ 'is-visible': visible }">
        * 以上案例与数据均为演示占位，正式上线前请替换为真实合作商家与授权素材。
      </p>
    </div>
  </section>
</template>

<style scoped>
.cases {
  background: linear-gradient(180deg, var(--surface-2) 0%, var(--bg) 100%);
}

.cases__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  margin-top: 52px;
}

.cases__item {
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease, opacity 0.6s ease, border-color 0.25s ease;
}

.cases__item:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(49, 94, 251, 0.26);
}

.cases__cover {
  position: relative;
  height: 190px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.cases__cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(11, 21, 51, 0.32) 100%);
}

.cases__cover-emoji {
  font-size: 58px;
  filter: drop-shadow(0 8px 18px rgba(11, 21, 51, 0.25));
  transform: translateY(-6px);
}

.cases__cover-industry {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 1;
  padding: 4px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.cases__cover-metric {
  position: absolute;
  right: 14px;
  bottom: 12px;
  z-index: 1;
  color: #fff;
  text-align: right;
}

.cases__cover-metric b {
  display: block;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 10px rgba(11, 21, 51, 0.35);
}

.cases__cover-metric span {
  font-size: 12px;
  opacity: 0.85;
}

.cases__body {
  padding: 22px 22px 24px;
}

.cases__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.2px;
}

.cases__desc {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-2);
}

.cases__quote {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--grad-soft);
  font-size: 13px;
  line-height: 1.6;
  color: var(--primary-deep);
}

.cases__quote svg {
  flex-shrink: 0;
  margin-top: 2px;
  opacity: 0.5;
}

.cases__note {
  margin-top: 30px;
  text-align: center;
  font-size: 12.5px;
  color: var(--text-3);
}

@media (max-width: 960px) {
  .cases__grid {
    grid-template-columns: 1fr;
    max-width: 520px;
    margin-left: auto;
    margin-right: auto;
  }
}
</style>
