<template>
  <aside class="lsb" :class="{ mo: open }">
    <div class="sh">
      <span>📂 文件</span>
      <button class="ibtn small" title="新建文件" aria-label="新建文件" @click="$emit('new')"><Plus :size="14" /></button>
    </div>
    <div class="ft">
      <div
        v-for="f in files"
        :key="f.n"
        class="ti"
        :class="{ a: f.n === active }"
        tabindex="0"
        @click="$emit('open', f.n)"
        @keydown.enter="$emit('open', f.n)"
      >
        <span>{{ iconOf(f.n) }}</span>{{ f.n }}
      </div>
    </div>
  </aside>
</template>

<script setup>
import { Plus } from 'lucide-vue-next'

defineProps({
  files: { type: Array, default: () => [] },
  active: { type: String, default: '' },
  open: { type: Boolean, default: false }
})
defineEmits(['open', 'new'])

function iconOf(n) {
  const e = String(n).split('.').pop().toLowerCase()
  if (e === 'java') return '☕'
  if (e === 'py') return '🐍'
  if (e === 'js') return '🟢'
  if (e === 'go') return '🔷'
  if (e === 'rs') return '🦀'
  return '📄'
}
</script>
