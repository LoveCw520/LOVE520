<template>
  <div class="app" :class="{ lt: settings.th === '浅色' }">
    <header class="topbar">
      <div class="topbar-l">
        <button v-if="isMobile" class="ibtn mbtns" title="文件" aria-label="切换文件栏" @click="mobileSide = !mobileSide"><Menu :size="18" /></button>
        <div class="topbar-logo">M</div>
        <span class="topbar-title">码瑙</span>
        <div class="dw">
          <div class="topbar-proj" @click="toggleMenu('pd')">📁 demo-project <ChevronDown :size="12" /></div>
          <div v-if="menu === 'pd'" class="dm o" style="min-width:220px">
            <div class="nh"><span>项目</span></div>
            <div class="di">📁 demo-project</div>
            <div class="di" @click="alert('演示版暂未接入项目管理')">➕ 新建项目</div>
          </div>
        </div>
      </div>
      <div class="topbar-r">
        <button class="btn btn-pri" :disabled="running" title="运行 (Ctrl+Enter)" @click="runCode">
          <span v-if="running" class="sp"></span>
          <Play v-else :size="14" /> 运行
        </button>
        <div class="dw">
          <button class="btn btn-gh" @click="toggleMenu('ed')">{{ langName }} <ChevronDown :size="12" /></button>
          <div v-if="menu === 'ed'" class="dm o" role="menu" aria-label="选择语言">
            <div v-for="(info, name) in LANGS" :key="name" class="di" tabindex="0" role="menuitem" @click="chooseLang(name)">{{ name }}</div>
          </div>
        </div>
        <button v-if="isMobile" class="ibtn mbtns" title="AI 助手" aria-label="打开 AI 助手" @click="mobileAi = !mobileAi"><Bot :size="18" /></button>
        <div class="dw">
          <button class="ibtn" title="通知" aria-label="通知" @click="toggleMenu('nd')"><Bell :size="16" /><span v-if="unread" class="bdg">{{ unread }}</span></button>
          <div v-if="menu === 'nd'" class="dm o" style="min-width:300px">
            <div class="nh"><span>通知</span><span class="mr" @click="markAll">全部标记已读</span></div>
            <div v-for="n in notifications" :key="n.id" class="ni" tabindex="0" @click="n.read = true">
              <span class="nd" :class="{ rd: n.read }"></span>
              <div>
                <div class="nt">{{ n.title }}</div>
                <div style="font-size:11px;color:var(--t2)">{{ n.desc }}</div>
                <div class="ntm">{{ n.time }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="dw">
          <button class="av" title="账户" aria-label="账户菜单" @click="toggleMenu('ud')">{{ (settings.nick || 'Y').charAt(0).toUpperCase() }}</button>
          <div v-if="menu === 'ud'" class="dm o" style="min-width:180px">
            <div class="di">👤 个人资料</div>
            <div class="di" @click="showSettings = true; menu = ''">⚙️ 设置</div>
            <div class="dv"></div>
            <div class="di" @click="alert('演示版暂未接入项目管理')">📋 我的项目</div>
            <div class="di" @click="alert('演示版暂未接入使用统计')">📊 使用统计</div>
            <div class="dv"></div>
            <div class="di" @click="alert('演示版暂未接入登录系统')">🚪 退出登录</div>
          </div>
        </div>
      </div>
    </header>

    <div class="marea">
      <FileTree :files="files" :active="active" :open="mobileSide" @open="openFile" @new="newFile" />
      <div class="eda">
        <TabBar :tabs="tabs" :active="active" @open="openFile" @close="closeTab" />
        <CodeEditor
          :model-value="activeContent"
          :mode="activeMode"
          :font-size="settings.fs"
          :indent-unit="Number(settings.ind)"
          :empty="!active"
          @update:model-value="onEdit"
          @run="runCode"
          @save="flash('已保存 ' + ts())"
        />
        <LogPanel :logs="logs" :status="logStatus" :time="runTime" :cpu="runCpu" :mem="runMem" :running="running" />
      </div>
      <AIPanel :open="mobileAi" @close="mobileAi = false" />
    </div>

    <SettingsModal :open="showSettings" :settings="settings" @close="showSettings = false" @apply="applySettings" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Play, Bell, Menu, Bot, ChevronDown } from 'lucide-vue-next'
import FileTree from './components/FileTree.vue'
import TabBar from './components/TabBar.vue'
import CodeEditor from './components/CodeEditor.vue'
import LogPanel from './components/LogPanel.vue'
import AIPanel from './components/AIPanel.vue'
import SettingsModal from './components/SettingsModal.vue'
import { LANGS, EXT_MODE, EXT_LANG, TEMPLATES, DEFAULT_FILES } from './data'

const files = ref(DEFAULT_FILES.map((n) => ({ n })))
const SC = ref({ ...TEMPLATES })
const tabs = ref([])
const active = ref('')
const running = ref(false)
const logs = ref([])
const logStatus = ref('就绪')
const runTime = ref('—')
const runCpu = ref('—')
const runMem = ref('—')
const menu = ref('')
const showSettings = ref(false)
const mobileSide = ref(false)
const mobileAi = ref(false)
const isMobile = ref(window.innerWidth <= 900)
const settings = ref({ fs: '14px', th: '深色', ind: '4', nick: 'Yun' })
const notifications = ref([
  { id: 1, title: '✅ 任务运行完成', desc: 'Main.java 执行成功', time: '2 分钟前', read: false },
  { id: 2, title: '🔍 AI 分析完成', desc: '报错分析已就绪', time: '5 分钟前', read: false },
  { id: 3, title: '⏰ 容器即将过期', desc: '将在 5 分钟后回收', time: '10 分钟前', read: false }
])

const activeContent = computed(() => (active.value ? SC.value[active.value] ?? '' : ''))
const activeMode = computed(() => EXT_MODE[extOf(active.value)] || 'text/plain')
const langName = computed(() => EXT_LANG[extOf(active.value)] || 'Java 21')
const unread = computed(() => notifications.value.filter((n) => !n.read).length)

function extOf(n) {
  return String(n || '').split('.').pop().toLowerCase()
}

function ts() {
  const d = new Date()
  const p = (x) => (x < 10 ? '0' : '') + x
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
}

function flash(m) {
  logStatus.value = m
  clearTimeout(flash._t)
  flash._t = setTimeout(() => { logStatus.value = '就绪' }, 1500)
}

function saveState() {
  try {
    localStorage.setItem('manao_demo_fs', JSON.stringify(files.value.map((f) => f.n)))
    localStorage.setItem('manao_demo_SC', JSON.stringify(SC.value))
    localStorage.setItem('manao_demo_af', active.value)
    localStorage.setItem('manao_demo_set', JSON.stringify(settings.value))
  } catch (e) {}
}

function loadState() {
  try {
    const a = JSON.parse(localStorage.getItem('manao_demo_fs'))
    const s = JSON.parse(localStorage.getItem('manao_demo_SC'))
    const n = localStorage.getItem('manao_demo_af')
    const set = JSON.parse(localStorage.getItem('manao_demo_set'))
    if (Array.isArray(a) && a.length) files.value = a.map((x) => ({ n: x }))
    if (s && typeof s === 'object') Object.keys(s).forEach((k) => { SC.value[k] = s[k] })
    if (n && SC.value[n] !== undefined) active.value = n
    if (set && typeof set === 'object') settings.value = { ...settings.value, ...set }
  } catch (e) {}
}

function openFile(n) {
  if (SC.value[n] === undefined) SC.value[n] = ''
  active.value = n
  if (!tabs.value.includes(n)) tabs.value.push(n)
  if (isMobile.value) {
    mobileSide.value = false
    mobileAi.value = false
  }
  saveState()
}

function closeTab(n) {
  const i = tabs.value.indexOf(n)
  if (i < 0) return
  tabs.value.splice(i, 1)
  if (active.value === n) {
    if (tabs.value.length) openFile(tabs.value[tabs.value.length - 1])
    else active.value = ''
  }
  saveState()
}

function newFile() {
  const n = prompt('文件名：')
  if (!n) return
  const name = n.trim()
  if (!name) return
  if (!files.value.some((f) => f.n === name)) files.value.push({ n: name })
  openFile(name)
}

function chooseLang(name) {
  const info = LANGS[name]
  if (!info) return
  menu.value = ''
  if (!files.value.some((f) => f.n === info.file)) files.value.push({ n: info.file })
  openFile(info.file)
}

function onEdit(v) {
  if (active.value) SC.value[active.value] = v
}

function runCode() {
  if (running.value) return
  running.value = true
  logs.value = []
  logStatus.value = '运行中...'
  const st = Date.now()
  const t0 = ts()
  const steps = [
    t0 + ' > 正在提交代码...',
    t0 + ' > 环境: ' + langName.value,
    t0 + ' > Job 已创建',
    t0 + ' > Pod 运行中...',
    'Hello, 码瑙!',
    '1 1 2 3 5 8 13 21 34 55',
    ts() + ' > Process exited with code 0'
  ]
  let idx = 0
  const iv = setInterval(() => {
    if (idx >= steps.length) {
      clearInterval(iv)
      const el = ((Date.now() - st) / 1000).toFixed(2)
      running.value = false
      logStatus.value = '已完成 (' + el + 's)'
      runTime.value = el + 's'
      runCpu.value = '12%'
      runMem.value = '128MB'
      return
    }
    logs.value.push(steps[idx])
    idx++
  }, 400)
}

function applySettings(p) {
  settings.value = { ...settings.value, ...p }
  saveState()
}

function toggleMenu(id) {
  menu.value = menu.value === id ? '' : id
}

function markAll() {
  notifications.value.forEach((n) => { n.read = true })
}

function onDocClick(e) {
  if (!e.target.closest('.dw')) menu.value = ''
}

function onKey(e) {
  if (e.key === 'Escape') {
    menu.value = ''
    mobileSide.value = false
    mobileAi.value = false
    showSettings.value = false
  }
}

function onResize() {
  isMobile.value = window.innerWidth <= 900
}

watch([SC, files, tabs, active], saveState, { deep: true })

onMounted(() => {
  loadState()
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
  window.addEventListener('resize', onResize)
  openFile(active.value || 'Main.java')
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onResize)
})
</script>
