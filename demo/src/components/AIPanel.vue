<template>
  <aside class="aip" :class="{ mo: open }">
    <div class="aih">
      <span>🤖</span> AI 助手
      <button class="ibtn aiclose" title="关闭" aria-label="关闭 AI 助手" @click="$emit('close')"><X :size="16" /></button>
    </div>
    <div ref="box" class="aim">
      <div v-if="!messages.length" class="aiemp">
        <div style="font-size:36px;opacity:.3">💡</div>
        <p>你可以问我这些问题——</p>
        <div class="ais">
          <button v-for="q in quick" :key="q" class="sb" @click="ask(q)">{{ q }}</button>
        </div>
      </div>
      <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role === 'ai' ? 'a' : 'u'">{{ m.text }}</div>
    </div>
    <div class="aiib">
      <input v-model="input" placeholder="输入问题..." aria-label="输入问题" @keydown.enter="send">
      <button class="sndb" title="发送" aria-label="发送" @click="send"><Send :size="16" /></button>
    </div>
  </aside>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { X, Send } from 'lucide-vue-next'

defineProps({
  open: { type: Boolean, default: false }
})
defineEmits(['close'])

const input = ref('')
const messages = ref([])
const box = ref(null)
const quick = ['📖 解释这段代码', '⚡ 帮我优化性能', '🔍 分析报错原因']

async function send() {
  const m = input.value.trim()
  if (!m) return
  input.value = ''
  messages.value.push({ role: 'u', text: m })
  await nextTick()
  scroll()
  setTimeout(() => {
    messages.value.push({ role: 'ai', text: reply(m) })
    scroll()
  }, 800)
}

function ask(q) {
  input.value = q
  send()
}

function reply(m) {
  if (m.includes('解释')) return '这段 Java 代码递归计算斐波那契数列。fib(n) 返回第 n 项，main 循环打印前 10 项。时间复杂度 O(2^n)。'
  if (m.includes('优化')) return '改用迭代：初始化 a=0,b=1，循环累加，返回 b。时间复杂度 O(n)，空间 O(1)。'
  if (m.includes('报错')) return '当前代码运行正常，没有报错。'
  return '你好！我是码瑙 AI 助手，可以帮你解释代码、优化性能或分析报错。'
}

function scroll() {
  if (box.value) box.value.scrollTop = box.value.scrollHeight
}
</script>
