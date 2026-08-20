<template>
  <div class="et" role="tablist" aria-label="打开的标签页">
    <div
      v-for="n in tabs"
      :key="n"
      class="tb"
      :class="{ a: n === active }"
      role="tab"
      :aria-selected="n === active ? 'true' : 'false'"
      @click="$emit('open', n)"
    >
      <span>{{ iconOf(n) }}</span>{{ n }}
      <button class="cb" title="关闭" :aria-label="'关闭 ' + n" @click.stop="$emit('close', n)">x</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  tabs: { type: Array, default: () => [] },
  active: { type: String, default: '' }
})
defineEmits(['open', 'close'])

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
