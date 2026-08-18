<script setup>
import { useInView } from '../../composables/useInView'

const { el, visible } = useInView()

const steps = [
  { no: '01', title: '认领门店 POI', desc: '创建并认领门店在视频号上的地理位置名片，点亮同城入口。' },
  { no: '02', title: 'AI 生成团购套餐', desc: '输入门店信息，自动产出适合上架的套餐组合、定价与卖点。' },
  { no: '03', title: '短视频挂载 POI', desc: '拍摄或 AI 生成视频内容，一键挂载门店 POI 与团购链接。' },
  { no: '04', title: '下单到店核销', desc: '用户刷到即可下单，到店核销，转化数据全程可追踪。' }
]

const benefits = [
  {
    title: '亿级流量入口',
    desc: '依托视频号与微信生态，让同城用户更容易刷到你的门店。',
    icon: 'eye'
  },
  {
    title: '内容 + 交易闭环',
    desc: '短视频种草 → 在线下单 → 到店核销，一条链路完成转化。',
    icon: 'loop'
  },
  {
    title: '数据可追踪',
    desc: '曝光、下单、核销数据清晰可见，每一分钱花在哪都算得清。',
    icon: 'data'
  }
]
</script>

<template>
  <section id="poi" ref="el" class="poi" :class="{ 'is-visible': visible }">
    <div class="poi__grid" aria-hidden="true"></div>
    <div class="poi__glow poi__glow--1" aria-hidden="true"></div>
    <div class="poi__glow poi__glow--2" aria-hidden="true"></div>

    <div class="l-container poi__inner">
      <div class="l-center l-reveal" :class="{ 'is-visible': visible }">
        <span class="poi__kicker">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
            <circle cx="12" cy="10" r="2.6" />
          </svg>
          视频号 POI 团购服务
        </span>
        <h2 class="poi__title">
          把门店搬到视频号
          <br />
          <span class="poi__grad">让流量直接变成订单</span>
        </h2>
        <p class="poi__desc">
          POI（Point of Interest）是门店在视频号上的数字名片。挂载团购套餐后，用户刷到短视频即可一键进入门店页面下单，形成「内容种草 → 在线下单 → 到店核销」的完整闭环。
        </p>
      </div>

      <!-- 流程 -->
      <div class="poi__steps">
        <div
          v-for="(s, i) in steps"
          :key="s.no"
          class="poi__step l-reveal"
          :style="{ transitionDelay: `${i * 90}ms` }"
          :class="{ 'is-visible': visible }"
        >
          <div class="poi__step-no">{{ s.no }}</div>
          <h3 class="poi__step-title">{{ s.title }}</h3>
          <p class="poi__step-desc">{{ s.desc }}</p>
        </div>
      </div>

      <!-- 优势 -->
      <div class="poi__benefits">
        <div
          v-for="(b, i) in benefits"
          :key="b.title"
          class="poi__benefit l-reveal"
          :style="{ transitionDelay: `${i * 90}ms` }"
          :class="{ 'is-visible': visible }"
        >
          <div class="poi__benefit-icon">
            <svg v-if="b.icon === 'eye'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <svg v-else-if="b.icon === 'loop'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 8a8 8 0 1 0 1.2 6.2" />
              <path d="M20 2v6h-6" />
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3v18M5 7h14M5 7l-2.5 4 2.5 4M19 7l2.5 4-2.5 4" />
            </svg>
          </div>
          <h3>{{ b.title }}</h3>
          <p>{{ b.desc }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.poi {
  position: relative;
  overflow: hidden;
  padding: 110px 0;
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(62, 97, 255, 0.22), transparent 60%),
    linear-gradient(180deg, #0a1130 0%, #0c1438 100%);
  color: #eef2ff;
}

.poi__grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(148, 163, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 255, 0.06) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 0%, #000 20%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 0%, #000 20%, transparent 75%);
}

.poi__glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
}

.poi__glow--1 {
  width: 560px;
  height: 560px;
  top: -220px;
  left: 50%;
  transform: translateX(-50%);
  background: radial-gradient(circle, rgba(74, 108, 255, 0.35), transparent 65%);
}

.poi__glow--2 {
  width: 480px;
  height: 480px;
  bottom: -260px;
  right: -160px;
  background: radial-gradient(circle, rgba(124, 92, 252, 0.28), transparent 65%);
}

.poi__inner {
  position: relative;
}

.poi__kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 255, 0.35);
  background: rgba(99, 102, 241, 0.14);
  color: #b9c4ff;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.poi__title {
  margin-top: 18px;
  font-size: clamp(28px, 4.6vw, 42px);
  line-height: 1.24;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.poi__grad {
  background: linear-gradient(115deg, #6ea1ff 0%, #a78bfa 55%, #f0abfc 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.poi__desc {
  margin: 18px auto 0;
  max-width: 680px;
  font-size: 16px;
  line-height: 1.8;
  color: rgba(226, 232, 255, 0.78);
}

/* 流程 */
.poi__steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 60px;
}

.poi__step {
  position: relative;
  padding: 26px 22px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 255, 0.16);
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  transition: transform 0.25s ease, border-color 0.25s ease, opacity 0.6s ease, background 0.25s ease;
}

.poi__step:hover {
  transform: translateY(-5px);
  border-color: rgba(148, 163, 255, 0.4);
  background: rgba(255, 255, 255, 0.07);
}

.poi__step:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 50%;
  right: -18px;
  width: 20px;
  height: 1px;
  background: linear-gradient(90deg, rgba(148, 163, 255, 0.5), transparent);
}

.poi__step-no {
  font-size: 26px;
  font-weight: 800;
  background: linear-gradient(115deg, #6ea1ff, #c084fc);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  opacity: 0.9;
}

.poi__step-title {
  margin-top: 12px;
  font-size: 16.5px;
  font-weight: 700;
  color: #f1f4ff;
}

.poi__step-desc {
  margin-top: 8px;
  font-size: 13.5px;
  line-height: 1.7;
  color: rgba(200, 210, 245, 0.66);
}

/* 优势 */
.poi__benefits {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-top: 26px;
}

.poi__benefit {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 255, 0.16);
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  transition: transform 0.25s ease, border-color 0.25s ease, opacity 0.6s ease;
}

.poi__benefit:hover {
  transform: translateY(-4px);
  border-color: rgba(148, 163, 255, 0.38);
}

.poi__benefit-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  color: #a5b4fc;
  background: rgba(99, 102, 241, 0.18);
}

.poi__benefit h3 {
  font-size: 16.5px;
  font-weight: 700;
  color: #f1f4ff;
}

.poi__benefit p {
  margin-top: 7px;
  font-size: 13.5px;
  line-height: 1.7;
  color: rgba(200, 210, 245, 0.66);
}

@media (max-width: 960px) {
  .poi__steps {
    grid-template-columns: repeat(2, 1fr);
    row-gap: 22px;
  }

  .poi__step:nth-child(2)::after {
    display: none;
  }

  .poi__benefits {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .poi {
    padding: 80px 0;
  }

  .poi__steps {
    grid-template-columns: 1fr;
  }

  .poi__step::after {
    display: none;
  }
}
</style>
