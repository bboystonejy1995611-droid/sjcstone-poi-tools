<script setup>
import { useToast } from '../composables/useToast'

const { state } = useToast()
</script>

<template>
  <Transition name="toast">
    <div v-if="state.visible" class="toast" :class="`toast--${state.type}`" role="status">
      <span class="toast__icon" aria-hidden="true">
        {{ state.type === 'success' ? '✓' : state.type === 'error' ? '!' : 'ℹ' }}
      </span>
      <span class="toast__msg">{{ state.message }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: calc(56px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100vw - 48px);
  padding: 11px 18px;
  border-radius: 999px;
  font-size: 14px;
  background: rgba(13, 20, 44, 0.92);
  border: 1px solid var(--card-border-strong);
  box-shadow: 0 12px 32px rgba(2, 6, 23, 0.55);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.toast__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  color: #04121a;
}

.toast--success .toast__icon {
  background: var(--green);
}

.toast--error .toast__icon {
  background: var(--danger);
}

.toast--info .toast__icon {
  background: var(--cyan);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
</style>
