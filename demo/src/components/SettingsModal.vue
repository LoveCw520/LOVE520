<template>
  <div v-if="open" class="mo o" @click.self="$emit('close')">
    <div class="mod">
      <div class="mh">
        <span>⚙️ 设置</span>
        <button class="icon-btn" aria-label="关闭设置" @click="$emit('close')"><X :size="16" /></button>
      </div>
      <div class="mb">
        <div class="ss">
          <h3>个人资料</h3>
          <div class="sr">
            <span>昵称</span>
            <input type="text" v-model="local.nick" @change="save">
          </div>
          <div class="sr">
            <span>头像</span>
            <div style="display:flex;gap:6px">
              <div class="av" style="width:36px;height:36px;font-size:14px">{{ (local.nick || 'Y').charAt(0).toUpperCase() }}</div>
              <button class="btn btn-gh" style="font-size:11px">更换</button>
            </div>
          </div>
        </div>
        <div class="ss">
          <h3>安全</h3>
          <div class="sr">
            <span>密码</span>
            <button class="btn btn-gh" style="font-size:11px;border:1px solid var(--bd)" @click="alert('修改密码功能演示')">修改密码</button>
          </div>
        </div>
        <div class="ss">
          <h3>编辑器偏好</h3>
          <div class="sr">
            <span>字号</span>
            <select v-model="local.fs" @change="save">
              <option>12px</option>
              <option>14px</option>
              <option>16px</option>
              <option>18px</option>
            </select>
          </div>
          <div class="sr">
            <span>主题</span>
            <select v-model="local.th" @change="save">
              <option>深色</option>
              <option>浅色</option>
            </select>
          </div>
          <div class="sr">
            <span>缩进</span>
            <select v-model="local.ind" @change="save">
              <option>2</option>
              <option>4</option>
            </select>
          </div>
        </div>
        <div class="ss">
          <h3>通知偏好</h3>
          <div class="sr"><span>任务完成</span><input type="checkbox" checked></div>
          <div class="sr"><span>容器过期</span><input type="checkbox" checked></div>
          <div class="sr"><span>AI 分析</span><input type="checkbox" checked></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  settings: { type: Object, default: () => ({ fs: '14px', th: '深色', ind: '4', nick: 'Yun' }) }
})
const emit = defineEmits(['close', 'apply'])

const local = ref({ ...props.settings })

watch(() => props.open, (o) => {
  if (o) local.value = { ...props.settings }
})

function save() {
  emit('apply', { ...local.value })
}
</script>
