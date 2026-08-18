<script setup>
import LandingNav from '../components/landing/LandingNav.vue'
import HeroSection from '../components/landing/HeroSection.vue'
import ToolsSection from '../components/landing/ToolsSection.vue'
import SolutionsSection from '../components/landing/SolutionsSection.vue'
import PoiSection from '../components/landing/PoiSection.vue'
import CasesSection from '../components/landing/CasesSection.vue'
import ContactSection from '../components/landing/ContactSection.vue'
import LandingFooter from '../components/landing/LandingFooter.vue'
</script>

<template>
  <div class="home">
    <LandingNav />
    <main>
      <HeroSection />
      <ToolsSection />
      <SolutionsSection />
      <PoiSection />
      <CasesSection />
      <ContactSection />
    </main>
    <LandingFooter />
  </div>
</template>

<style scoped>
.home {
  position: relative;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}
</style>
