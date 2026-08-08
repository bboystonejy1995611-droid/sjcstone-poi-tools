<script setup>
const SCOPES = ['餐饮', '美业', '酒店民宿', '休闲娱乐', '零售', '更多实体商家']
</script>

<template>
  <header class="brand">
    <div class="brand__logo" aria-hidden="true">
      <span class="brand__logo-spark">✦</span>
    </div>

    <h1 class="brand__title">
      <span class="grad-text">AI</span>团购套餐生成器
    </h1>

    <p class="brand__subtitle">
      输入你的门店信息，AI 帮你设计适合销售的团购套餐
    </p>

    <div class="brand__scopes">
      <span v-for="s in SCOPES" :key="s" class="scope-chip">{{ s }}</span>
    </div>
  </header>
</template>

<style scoped>
.brand {
  text-align: center;
  padding: 22px 4px 10px;
}

.brand__logo {
  width: 58px;
  height: 58px;
  margin: 0 auto 14px;
  border-radius: 18px;
  background: var(--grad-main);
  box-shadow: 0 10px 30px rgba(99, 102, 241, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  animation: logo-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.brand__logo::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 22px;
  border: 1px solid rgba(139, 92, 246, 0.35);
  animation: pulse-glow 2.4s ease-in-out infinite;
}

.brand__logo-spark {
  font-size: 28px;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}

.brand__title {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.5px;
  line-height: 1.3;
}

.brand__subtitle {
  margin-top: 8px;
  font-size: 14.5px;
  color: var(--text-dim);
}

.brand__scopes {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.scope-chip {
  font-size: 12px;
  color: var(--text-dim);
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--card-border);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

@keyframes logo-in {
  from {
    opacity: 0;
    transform: scale(0.6) rotate(-12deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}

@media (min-width: 768px) {
  .brand__title {
    font-size: 32px;
  }

  .brand__subtitle {
    font-size: 16px;
  }
}
</style>
