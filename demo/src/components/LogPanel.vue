<template>
  <div class="lp">
    <div class="lh">
      <div class="lh-l">
        <span class="lp-title">📋 日志</span>
        <span class="ls">{{ status }}</span>
      </div>
      <div class="lp-meta">
        <span>⏱ {{ time }}</span>
        <span>🖥 {{ cpu }}</span>
        <span>💾 {{ mem }}</span>
      </div>
    </div>
    <div class="lc">
      <div v-if="!logs.length" class="lemp">
        <span style="font-size:20px;opacity:.4">📄</span>
        <span>还没有运行记录 — 点击「运行」按钮执行你的代码</span>
      </div>
      <div v-for="(l, i) in logs" :key="i">{{ l }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  logs: { type: Array, default: () => [] },
  status: { type: String, default: '就绪' },
  time: { type: String, default: '—' },
  cpu: { type: String, default: '—' },
  mem: { type: String, default: '—' },
  running: { type: Boolean, default: false }
})
</script>
