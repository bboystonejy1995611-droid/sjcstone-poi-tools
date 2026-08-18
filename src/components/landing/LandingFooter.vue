<script setup>
import { siteConfig } from '../../config/siteConfig'

const quickLinks = [
  { id: 'tools', label: 'AI 工具' },
  { id: 'solutions', label: '解决方案' },
  { id: 'poi', label: 'POI 团购' },
  { id: 'cases', label: '商家案例' },
  { id: 'contact', label: '合作咨询' }
]

function scrollToId(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <footer class="lfoot">
    <div class="l-container lfoot__inner">
      <div class="lfoot__brand">
        <div class="lfoot__logo" aria-hidden="true">
          <svg viewBox="0 0 28 28" fill="none">
            <defs>
              <linearGradient id="lfoot-g" x1="4" y1="4" x2="24" y2="24">
                <stop stop-color="#315efb" />
                <stop offset="1" stop-color="#7c5cfc" />
              </linearGradient>
            </defs>
            <rect x="1.5" y="1.5" width="25" height="25" rx="8" stroke="url(#lfoot-g)" stroke-width="2" />
            <path d="M9 17.5l4-6 3 4.5 2.5-3.5" stroke="url(#lfoot-g)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div>
          <b>{{ siteConfig.brandName }}</b>
          <p>用 AI 帮实体门店把视频号团购做成增长生意。</p>
        </div>
      </div>

      <nav class="lfoot__nav">
        <span class="lfoot__nav-title">快速导航</span>
        <button v-for="l in quickLinks" :key="l.id" type="button" @click="scrollToId(l.id)">
          {{ l.label }}
        </button>
        <router-link to="/generator">AI 团购套餐生成器</router-link>
      </nav>
    </div>

    <div class="lfoot__bottom">
      <div class="l-container lfoot__bottom-inner">
        <span>© {{ new Date().getFullYear() }} {{ siteConfig.brandName }} · 保留所有权利</span>
        <span class="lfoot__muted">品牌展示页 · 生成器工具：<router-link to="/generator">立即使用</router-link></span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.lfoot {
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.lfoot__inner {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 48px;
  padding-top: 56px;
  padding-bottom: 44px;
}

.lfoot__brand {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.lfoot__logo {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
}

.lfoot__logo svg {
  width: 100%;
  height: 100%;
}

.lfoot__brand b {
  display: block;
  font-size: 17px;
  font-weight: 800;
  color: var(--text);
}

.lfoot__brand p {
  margin-top: 8px;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--text-3);
  max-width: 340px;
}

.lfoot__nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}

.lfoot__nav-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-3);
  letter-spacing: 0.4px;
  margin-bottom: 2px;
}

.lfoot__nav button,
.lfoot__nav a {
  font-size: 14px;
  color: var(--text-2);
  transition: color 0.18s ease;
  padding: 2px 0;
}

.lfoot__nav button:hover,
.lfoot__nav a:hover {
  color: var(--primary-deep);
}

.lfoot__bottom {
  border-top: 1px solid var(--border);
  padding: 18px 0;
}

.lfoot__bottom-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12.5px;
  color: var(--text-3);
}

.lfoot__muted a {
  color: var(--primary-deep);
  font-weight: 600;
}

@media (max-width: 640px) {
  .lfoot__inner {
    grid-template-columns: 1fr;
    gap: 32px;
    padding-top: 40px;
  }
}
</style>
