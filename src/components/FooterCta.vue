<script setup>
import { agentConfig } from '../config/agentConfig'
import { FOOTER_NOTICE } from '../data/rules'
</script>

<template>
  <footer class="footer-cta card">
    <!-- 服务商授权信息（预留）：showContact 为 true 时才显示 -->
    <div v-if="agentConfig.showContact && agentConfig.enabled" class="agent-box">
      <div class="agent-box__deco" aria-hidden="true">🤝</div>
      <h3 class="agent-box__title">{{ agentConfig.agentName || '服务商' }}</h3>
      <p v-if="agentConfig.contactWechat" class="agent-box__line">
        微信：<b>{{ agentConfig.contactWechat }}</b>
      </p>
      <img
        v-if="agentConfig.contactQrCode"
        :src="agentConfig.contactQrCode"
        alt="服务商二维码"
        class="agent-box__qr"
      />
    </div>

    <!-- 中性底部说明 -->
    <p class="footer-cta__notice">{{ FOOTER_NOTICE }}</p>
  </footer>
</template>

<style scoped>
.footer-cta {
  margin-top: 30px;
  text-align: center;
  padding: 24px 20px;
  position: relative;
  overflow: hidden;
}

/* ---- 服务商信息（预留样式） ---- */
.agent-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 6px 0 16px;
  margin-bottom: 14px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.12);
}

.agent-box__deco {
  font-size: 28px;
}

.agent-box__title {
  font-size: 16px;
  font-weight: 800;
  background: var(--grad-text);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.agent-box__line {
  font-size: 13px;
  color: var(--text-dim);
}

.agent-box__line b {
  color: var(--text);
}

.agent-box__qr {
  width: 96px;
  height: 96px;
  border-radius: 12px;
  border: 1px solid var(--card-border-strong);
  margin-top: 4px;
}

/* ---- 中性说明 ---- */
.footer-cta__notice {
  font-size: 12px;
  line-height: 1.8;
  color: var(--text-faint);
}
</style>
