<template>
  <div class="eb">
    <div class="cw">
      <div ref="host" class="editor-host"></div>
    </div>
    <div v-if="empty" class="eempty">
      <div class="eempty-icon">📝</div>
      <div>选择或创建一个文件开始编辑</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/clike/clike.js'
import 'codemirror/mode/python/python.js'
import 'codemirror/mode/javascript/javascript.js'
import 'codemirror/mode/go/go.js'
import 'codemirror/mode/rust/rust.js'
import 'codemirror/mode/markdown/markdown.js'
import 'codemirror/mode/xml/xml.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  mode: { type: String, default: 'text/plain' },
  fontSize: { type: String, default: '14px' },
  indentUnit: { type: Number, default: 4 },
  empty: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'run', 'save'])

const host = ref(null)
let editor = null

onMounted(() => {
  editor = CodeMirror(host.value, {
    value: props.modelValue || '',
    mode: props.mode,
    lineNumbers: true,
    lineWrapping: false,
    indentUnit: props.indentUnit,
    tabSize: 4,
    viewportMargin: Infinity,
    extraKeys: {
      'Ctrl-S': () => emit('save'),
      'Cmd-S': () => emit('save'),
      'Ctrl-Enter': () => emit('run'),
      'Cmd-Enter': () => emit('run')
    }
  })
  editor.on('change', () => emit('update:modelValue', editor.getValue()))
  applyFont(props.fontSize)
})

watch(() => props.modelValue, (v) => {
  if (editor && editor.getValue() !== v) editor.setValue(v || '')
})
watch(() => props.mode, (m) => editor && editor.setOption('mode', m))
watch(() => props.indentUnit, (v) => editor && editor.setOption('indentUnit', v || 4))
watch(() => props.fontSize, applyFont)

function applyFont(size) {
  if (!editor) return
  const el = editor.getWrapperElement()
  if (el) el.style.fontSize = size || '14px'
}

onBeforeUnmount(() => {
  if (editor) editor.toTextArea()
})
</script>
