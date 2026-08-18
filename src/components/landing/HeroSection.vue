<script setup>
import { siteConfig } from '../../config/siteConfig'

const users = siteConfig.targetUsers

function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const plans = [
  { name: '人气双人餐', price: '¥99', tag: '推荐', tagClass: 'hero__plan-tag--hot' },
  { name: '四人家庭餐', price: '¥228', tag: '超值', tagClass: 'hero__plan-tag--ok' },
  { name: '工作日单人餐', price: '¥49.9', tag: '引流', tagClass: 'hero__plan-tag--ok' }
]
</script>

<template>
  <section class="hero">
    <div class="l-grid-bg" aria-hidden="true"></div>
    <div class="hero__glow hero__glow--1" aria-hidden="true"></div>
    <div class="hero__glow hero__glow--2" aria-hidden="true"></div>

    <div class="l-container hero__inner">
      <div class="hero__copy">
        <span class="l-kicker hero__kicker">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" fill="currentColor" />
          </svg>
          {{ siteConfig.brandSlogan }}
        </span>

        <h1 class="hero__title">
          把视频号 POI 团购
          <br />
          <span class="l-grad-text">做成你的增长生意</span>
        </h1>

        <p class="hero__desc">
          面向本地实体商家、视频号服务商与地推团队的 AI 工具平台。从团购套餐生成、短视频脚本到门店经营诊断，一站式把视频号 POI 团购做成稳定增长的好生意。
        </p>

        <div class="hero__actions">
          <router-link to="/generator" class="l-btn l-btn--primary l-btn--lg">
            立即免费体验
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </router-link>
          <button type="button" class="l-btn l-btn--ghost l-btn--lg" @click="scrollTo('solutions')">
            了解解决方案
          </button>
        </div>

        <ul class="hero__points">
          <li><span class="hero__dot"></span>免费 · 无需登录</li>
          <li><span class="hero__dot"></span>AI 生成即可上架</li>
          <li><span class="hero__dot"></span>手机电脑都能用</li>
        </ul>
      </div>

      <!-- 产品视觉：模拟生成器界面 -->
      <div class="hero__visual" aria-hidden="true">
        <div class="hero__panel">
          <div class="hero__panel-bar">
            <span class="hero__panel-dot"></span>
            <span class="hero__panel-dot"></span>
            <span class="hero__panel-dot"></span>
            <span class="hero__panel-title">AI 团购套餐生成器</span>
          </div>
          <div class="hero__panel-body">
            <div class="hero__field">
              <span>门店</span>
              <strong>老城区 · 川味火锅</strong>
            </div>
            <div class="hero__field">
              <span>类目</span>
              <strong>餐饮美食 · 火锅</strong>
            </div>
            <div class="hero__gen">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M12 3a9 9 0 1 0 8.5 12.5" />
                <path d="M12 3v5M12 8l3-3-3-3" />
              </svg>
              AI 智能生成 3 套方案
            </div>
            <div class="hero__plans">
              <div v-for="(p, i) in plans" :key="p.name" class="hero__plan" :class="{ 'hero__plan--delay': i > 0 }">
                <div class="hero__plan-name">
                  <span :class="['hero__plan-tag', p.tagClass]">{{ p.tag }}</span>
                  {{ p.name }}
                </div>
                <strong class="hero__plan-price">{{ p.price }}</strong>
              </div>
            </div>
            <div class="hero__panel-foot">预计核销率 <b>92%</b> · 适合上架视频号 POI</div>
          </div>
        </div>

        <div class="hero__float hero__float--gmv">
          <span class="hero__float-icon hero__float-icon--green">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 17l6-6 4 4 8-8" />
              <path d="M15 7h6v6" />
            </svg>
          </span>
          <div>
            <b>GMV +186%</b>
            <small>首月对比上月</small>
          </div>
        </div>

        <div class="hero__float hero__float--poi">
          <span class="hero__float-icon hero__float-icon--blue">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.6" />
            </svg>
          </span>
          <div>
            <b>POI 已挂载</b>
            <small>视频号 · 同城可见</small>
          </div>
        </div>
      </div>
    </div>

    <!-- 目标用户 -->
    <div class="hero__users l-container">
      <div v-for="(u, i) in users" :key="u.name" class="hero__user">
        <div class="hero__user-name">
          <span class="hero__user-no">0{{ i + 1 }}</span>{{ u.name }}
        </div>
        <div class="hero__user-desc">{{ u.desc }}</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  padding: 76px 0 0;
}

.hero__glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
}

.hero__glow--1 {
  width: 620px;
  height: 620px;
  top: -260px;
  right: -160px;
  background: radial-gradient(circle, rgba(49, 94, 251, 0.16), transparent 65%);
}

.hero__glow--2 {
  width: 460px;
  height: 460px;
  bottom: -220px;
  left: -180px;
  background: radial-gradient(circle, rgba(124, 92, 252, 0.14), transparent 65%);
}

.hero__inner {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 64px;
  align-items: center;
  padding-top: 40px;
  padding-bottom: 72px;
}

.hero__kicker {
  animation: l-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.hero__title {
  margin-top: 22px;
  font-size: clamp(34px, 5.4vw, 56px);
  line-height: 1.16;
  font-weight: 800;
  letter-spacing: -1px;
  animation: l-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both;
}

.hero__desc {
  margin-top: 22px;
  max-width: 560px;
  font-size: 17px;
  line-height: 1.8;
  color: var(--text-2);
  animation: l-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.16s both;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 32px;
  animation: l-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.24s both;
}

.hero__points {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 26px;
  list-style: none;
  font-size: 14px;
  color: var(--text-2);
  animation: l-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.32s both;
}

.hero__points li {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.hero__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--grad-main);
}

/* ---- 视觉面板 ---- */
.hero__visual {
  position: relative;
  animation: l-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both;
}

.hero__panel {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 20px;
  box-shadow: 0 30px 70px -30px rgba(15, 23, 42, 0.35);
  overflow: hidden;
  transform: perspective(1200px) rotateY(-4deg) rotateX(1.5deg);
}

.hero__panel-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}

.hero__panel-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e8b04b;
}

.hero__panel-dot:nth-child(2) {
  background: #58c08b;
}

.hero__panel-dot:nth-child(3) {
  background: #e27c7c;
}

.hero__panel-title {
  margin-left: 8px;
  font-size: 12.5px;
  color: var(--text-3);
}

.hero__panel-body {
  padding: 18px 20px 20px;
}

.hero__field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  margin-bottom: 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-2);
  font-size: 13.5px;
}

.hero__field span {
  color: var(--text-3);
}

.hero__field strong {
  color: var(--text);
  font-weight: 600;
}

.hero__gen {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  margin-top: 4px;
  border-radius: 12px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  background: var(--grad-main);
  box-shadow: 0 10px 22px -10px rgba(72, 84, 251, 0.6);
  position: relative;
  overflow: hidden;
}

.hero__gen::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 40%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  animation: l-shine 2.8s ease-in-out infinite;
}

.hero__plans {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.hero__plan {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  font-size: 13.5px;
  color: var(--text);
  opacity: 0;
  animation: l-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.7s forwards;
}

.hero__plan--delay {
  animation-delay: 0.82s;
}

.hero__plan-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.hero__plan-tag {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.hero__plan-tag--hot {
  color: #fff;
  background: var(--grad-main);
}

.hero__plan-tag--ok {
  color: #0a9b5e;
  background: rgba(18, 183, 106, 0.12);
}

.hero__plan-price {
  font-size: 15px;
  font-weight: 800;
}

.hero__panel-foot {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-strong);
  font-size: 12.5px;
  color: var(--text-3);
  text-align: center;
}

.hero__panel-foot b {
  color: var(--green);
}

/* 浮动小卡 */
.hero__float {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--border);
  box-shadow: 0 18px 40px -16px rgba(15, 23, 42, 0.3);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.hero__float b {
  display: block;
  font-size: 15.5px;
  font-weight: 800;
  color: var(--text);
}

.hero__float small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-3);
}

.hero__float-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
}

.hero__float-icon--green {
  color: #0a9b5e;
  background: rgba(18, 183, 106, 0.12);
}

.hero__float-icon--blue {
  color: var(--primary);
  background: rgba(49, 94, 251, 0.1);
}

.hero__float--gmv {
  top: 44px;
  left: -34px;
  animation: l-float 5s ease-in-out 1.2s infinite;
}

.hero__float--poi {
  bottom: 36px;
  right: -28px;
  animation: l-float 5.6s ease-in-out 2.4s infinite;
}

/* ---- 目标用户 ---- */
.hero__users {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding-top: 34px;
  padding-bottom: 60px;
  border-top: 1px solid var(--border);
}

.hero__user {
  text-align: center;
  padding: 6px 10px;
}

.hero__user-name {
  font-size: 18px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.2px;
}

.hero__user-no {
  margin-right: 8px;
  font-size: 13px;
  font-weight: 800;
  background: var(--grad-text);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.hero__user-desc {
  margin-top: 6px;
  font-size: 13.5px;
  color: var(--text-3);
}

@media (max-width: 960px) {
  .hero__inner {
    grid-template-columns: 1fr;
    gap: 56px;
    padding-top: 24px;
  }

  .hero__visual {
    max-width: 520px;
    margin: 0 auto;
    width: 100%;
  }

  .hero__float--gmv {
    left: -8px;
  }

  .hero__float--poi {
    right: -8px;
  }
}

@media (max-width: 640px) {
  .hero {
    padding-top: 44px;
  }

  .hero__users {
    grid-template-columns: 1fr;
    gap: 24px;
    padding-bottom: 48px;
  }

  .hero__float {
    padding: 10px 13px;
  }
}
</style>
