<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { siteConfig } from '../../config/siteConfig'
import { useAuth } from '../../composables/useAuth'
import AccountModal from './AccountModal.vue'

const { points } = useAuth()

const scrolled = ref(false)
const menuOpen = ref(false)
const redeemOpen = ref(false)

const links = [
  { id: 'tools', label: 'AI 工具' },
  { id: 'solutions', label: '解决方案' },
  { id: 'poi', label: 'POI 团购' },
  { id: 'cases', label: '商家案例' },
  { id: 'contact', label: '合作咨询' }
]

function onScroll() {
  scrolled.value = window.scrollY > 10
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

function scrollToId(id) {
  menuOpen.value = false
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function backToTop() {
  menuOpen.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openRedeem() {
  menuOpen.value = false
  redeemOpen.value = true
}
</script>

<template>
  <header class="lnav" :class="{ 'lnav--scrolled': scrolled }">
    <div class="l-container lnav__inner">
      <button class="lnav__brand" type="button" @click="backToTop">
        <span class="lnav__logo" aria-hidden="true">
          <svg viewBox="0 0 28 28" fill="none">
            <defs>
              <linearGradient id="lnav-g" x1="4" y1="4" x2="24" y2="24">
                <stop stop-color="#315efb" />
                <stop offset="1" stop-color="#7c5cfc" />
              </linearGradient>
            </defs>
            <rect x="1.5" y="1.5" width="25" height="25" rx="8" stroke="url(#lnav-g)" stroke-width="2" />
            <path d="M9 17.5l4-6 3 4.5 2.5-3.5" stroke="url(#lnav-g)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="lnav__name">{{ siteConfig.brandName }}</span>
      </button>

      <nav class="lnav__menu" :class="{ 'lnav__menu--open': menuOpen }">
        <button
          v-for="l in links"
          :key="l.id"
          class="lnav__link"
          type="button"
          @click="scrollToId(l.id)"
        >
          {{ l.label }}
        </button>

        <div class="lnav__actions">
          <button type="button" class="lnav__points" @click="openRedeem">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" fill="currentColor" stroke="none" />
            </svg>
            {{ points }} 积分
          </button>
          <button type="button" class="lnav__link lnav__link--btn" @click="openRedeem">
            兑换卡密
          </button>
          <router-link class="lnav__link lnav__link--btn" to="/generations">我的生成</router-link>
          <router-link class="l-btn l-btn--primary lnav__cta" to="/generator">免费使用</router-link>
        </div>
      </nav>

      <button
        class="lnav__burger"
        type="button"
        :aria-label="menuOpen ? '关闭菜单' : '打开菜单'"
        @click="menuOpen = !menuOpen"
      >
        <span :class="{ 'lnav__bar--x': menuOpen }"></span>
        <span :class="{ 'lnav__bar--x': menuOpen }"></span>
      </button>
    </div>
  </header>

  <AccountModal v-model="redeemOpen" />
</template>

<style scoped>
.lnav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: transparent;
  transition: background 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  border-bottom: 1px solid transparent;
}

.lnav--scrolled {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom-color: var(--border);
  box-shadow: 0 6px 24px -18px rgba(15, 23, 42, 0.25);
}

.lnav__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
}

.lnav__brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.2px;
  color: var(--text);
}

.lnav__logo {
  display: inline-flex;
  width: 30px;
  height: 30px;
}

.lnav__logo svg {
  width: 100%;
  height: 100%;
}

.lnav__menu {
  display: flex;
  align-items: center;
  gap: 30px;
}

.lnav__link {
  position: relative;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-2);
  transition: color 0.18s ease;
  padding: 6px 2px;
}

.lnav__link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 100%;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  background: var(--grad-main);
  transition: right 0.22s ease;
}

.lnav__link:hover {
  color: var(--primary-deep);
}

.lnav__link:hover::after {
  right: 0;
}

.lnav__actions {
  display: flex;
  align-items: center;
  gap: 18px;
}

.lnav__link--btn::after {
  display: none;
}

.lnav__points {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  color: var(--primary-deep);
  background: rgba(49, 94, 251, 0.08);
  border: 1px solid rgba(49, 94, 251, 0.25);
  transition: background 0.18s ease, border-color 0.18s ease;
}

.lnav__points:hover {
  background: rgba(49, 94, 251, 0.14);
  border-color: rgba(49, 94, 251, 0.4);
}

.lnav__cta {
  padding: 10px 20px;
  font-size: 14px;
}

.lnav__burger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 40px;
  height: 40px;
  align-items: center;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
}

.lnav__burger span {
  width: 18px;
  height: 2px;
  border-radius: 2px;
  background: var(--text);
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.lnav__burger .lnav__bar--x:first-child {
  transform: translateY(3.5px) rotate(45deg);
}

.lnav__burger .lnav__bar--x:last-child {
  transform: translateY(-3.5px) rotate(-45deg);
}

@media (max-width: 960px) {
  .lnav__burger {
    display: inline-flex;
  }

  .lnav__menu {
    position: absolute;
    top: 72px;
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    padding: 14px 20px 22px;
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    box-shadow: 0 24px 40px -24px rgba(15, 23, 42, 0.28);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-8px);
    transition: opacity 0.22s ease, transform 0.22s ease, visibility 0.22s;
  }

  .lnav__menu--open {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .lnav__link {
    padding: 12px 8px;
    border-radius: 10px;
    font-size: 16px;
  }

  .lnav__link:hover {
    background: var(--surface-2);
  }

  .lnav__link::after {
    display: none;
  }

  .lnav__actions {
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 10px;
  }

  .lnav__cta {
    margin-top: 2px;
  }
}
</style>
