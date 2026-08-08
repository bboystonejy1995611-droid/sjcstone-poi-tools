<script setup>
import CountUp from './CountUp.vue'

defineProps({
  plan: { type: Object, required: true },
  index: { type: Number, default: 0 }
})
</script>

<template>
  <article
    class="plan-card card rise-in"
    :class="`plan-card--${plan.accent}`"
    :style="{ animationDelay: `${index * 140}ms` }"
  >
    <header class="plan-card__head">
      <span class="plan-card__badge" :class="`badge--${plan.accent}`">{{ plan.badge }}</span>
      <span class="plan-card__type">【{{ plan.title }}】</span>
    </header>

    <h3 class="plan-card__name">{{ plan.name }}</h3>

    <div class="plan-card__prices">
      <span class="price-origin">
        ￥<s>{{ plan.origin }}</s>
        <em>原价</em>
      </span>
      <span class="price-sale" :class="`text--${plan.accent}`">
        <span class="price-sale__symbol">￥</span>
        <CountUp :to="plan.price" class="price-sale__num" />
        <span class="price-sale__unit">元</span>
      </span>
    </div>

    <div class="plan-card__items">
      <p class="plan-card__items-title">套餐内容</p>
      <ul>
        <li v-for="(item, i) in plan.items" :key="i">
          <span class="plan-card__check" :class="`check--${plan.accent}`">✓</span>
          {{ item }}
        </li>
      </ul>
    </div>

    <div class="plan-card__marketing">
      <div class="plan-card__tags">
        <span class="tag">👥 {{ plan.crowd }}</span>
        <span class="tag">🎯 {{ plan.angle }}</span>
      </div>
      <div class="plan-card__line">
        <span class="plan-card__line-label">🎬 短视频标题</span>
        <span class="plan-card__line-text">{{ plan.videoTitle }}</span>
      </div>
      <div class="plan-card__line">
        <span class="plan-card__line-label">🎙️ 开头3秒话术</span>
        <span class="plan-card__line-text">{{ plan.videoHook }}</span>
      </div>
      <div class="plan-card__line">
        <span class="plan-card__line-label">📌 核销提醒</span>
        <span class="plan-card__line-text">{{ plan.checkin }}</span>
      </div>
      <div class="plan-card__line">
        <span class="plan-card__line-label">➕ 加购建议</span>
        <span class="plan-card__line-text">{{ plan.upsell }}</span>
      </div>
    </div>

    <footer class="plan-card__purpose">
      <span class="plan-card__purpose-tag">适合目的</span>
      <span>{{ plan.purpose }}</span>
    </footer>
  </article>
</template>

<style scoped>
.plan-card {
  position: relative;
  overflow: hidden;
  padding: 16px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plan-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0.85;
}

.plan-card--cyan::before {
  background: linear-gradient(90deg, var(--cyan), transparent);
}

.plan-card--violet::before {
  background: linear-gradient(90deg, var(--violet), transparent);
}

.plan-card--pink::before {
  background: linear-gradient(90deg, var(--pink), transparent);
}

/* ---- 头部 ---- */
.plan-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plan-card__badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
  letter-spacing: 0.5px;
}

.badge--cyan {
  color: var(--cyan);
  background: rgba(56, 224, 255, 0.12);
  border: 1px solid rgba(56, 224, 255, 0.35);
}

.badge--violet {
  color: #b794f6;
  background: rgba(139, 92, 246, 0.14);
  border: 1px solid rgba(139, 92, 246, 0.4);
}

.badge--pink {
  color: #f0abfc;
  background: rgba(232, 121, 249, 0.12);
  border: 1px solid rgba(232, 121, 249, 0.35);
}

.plan-card__type {
  font-size: 12.5px;
  color: var(--text-dim);
}

/* ---- 套餐名称 ---- */
.plan-card__name {
  font-size: 19px;
  font-weight: 800;
  background: var(--grad-text);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

/* ---- 价格 ---- */
.plan-card__prices {
  display: flex;
  align-items: baseline;
  gap: 14px;
}

.price-origin {
  font-size: 15px;
  color: var(--text-faint);
}

.price-origin s {
  margin: 0 2px;
}

.price-origin em {
  font-style: normal;
  font-size: 11px;
  margin-left: 3px;
}

.price-sale {
  display: flex;
  align-items: baseline;
  font-weight: 800;
}

.price-sale__symbol {
  font-size: 16px;
  margin-right: 1px;
}

.price-sale__num {
  font-size: 30px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.price-sale__unit {
  font-size: 13px;
  font-weight: 600;
  margin-left: 2px;
  color: var(--text-dim);
}

.text--cyan {
  color: var(--cyan);
  text-shadow: 0 0 22px rgba(56, 224, 255, 0.35);
}

.text--violet {
  color: #b794f6;
  text-shadow: 0 0 22px rgba(139, 92, 246, 0.4);
}

.text--pink {
  color: #f0abfc;
  text-shadow: 0 0 22px rgba(232, 121, 249, 0.35);
}

/* ---- 内容列表 ---- */
.plan-card__items-title {
  font-size: 12px;
  color: var(--text-faint);
  margin-bottom: 7px;
  letter-spacing: 1px;
}

.plan-card__items ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.plan-card__items li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13.5px;
  color: #cdd3ea;
  line-height: 1.5;
}

.plan-card__check {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 2px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
}

.check--cyan {
  background: rgba(56, 224, 255, 0.16);
  color: var(--cyan);
}

.check--violet {
  background: rgba(139, 92, 246, 0.18);
  color: #c4b5fd;
}

.check--pink {
  background: rgba(232, 121, 249, 0.16);
  color: #f5d0fe;
}

/* ---- 营销信息 ---- */
.plan-card__marketing {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 11px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
}

.plan-card__tags {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tag {
  font-size: 12px;
  color: #c8cff0;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 5px 9px;
  line-height: 1.5;
}

.plan-card__line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12.5px;
  line-height: 1.55;
}

.plan-card__line-label {
  flex-shrink: 0;
  color: var(--text-faint);
  font-size: 11.5px;
  margin-top: 1px;
}

.plan-card__line-text {
  color: #cdd3ea;
}

/* ---- 适合目的 ---- */
.plan-card__purpose {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  padding-top: 11px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
  font-size: 12.5px;
  color: var(--text-dim);
}

.plan-card__purpose-tag {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-faint);
  border: 1px solid var(--card-border-strong);
  border-radius: 6px;
  padding: 1px 7px;
}

@media (min-width: 768px) {
  .plan-card {
    padding: 20px 20px 16px;
  }
}
</style>
