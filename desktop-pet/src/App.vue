<template>
  <main class="shell">
    <section class="stage-frame" @mousedown.left="onWindowDrag">
      <div ref="stageRef" class="stage"></div>
      <!-- 应用内气泡提醒 -->
      <Transition name="fade">
        <div v-if="showBubble" class="speech-bubble">
          {{ reminderText }}
        </div>
      </Transition>
    </section>

    <button
      class="pet-chip"
      type="button"
      @click="togglePalette"
      :aria-pressed="paletteOpen"
      :title="paletteOpen ? '收起控制' : '展开控制'"
    >
      {{ passthroughEnabled ? "穿透中" : "桌宠" }}
    </button>

    <section v-if="paletteOpen" class="palette">
      <header class="palette-head">
        <div>
          <p class="eyebrow">Desktop Pet</p>
          <p class="status">{{ runtimeLabel }}</p>
        </div>
        <button class="tool danger" type="button" @click="close">x</button>
      </header>

      <div class="action-grid">
        <button type="button" @click="trigger('idle')">待机</button>
        <button type="button" @click="trigger('attack')">攻击</button>
        <button type="button" @click="trigger('hit')">受击</button>
        <button type="button" @click="trigger('die')">死亡</button>
      </div>

      <div class="reminder-zone" :class="{ 'active': activeTimer }">
        <div class="flex-between">
          <p class="section-title">定时提醒</p>
          <button class="text-btn" @click="testNotification">立即测试通知</button>
        </div>
        <div class="reminder-form">
          <div class="input-group">
            <input v-model.number="reminderMinutes" type="number" min="0.1" step="0.1" />
            <span>分钟后提醒我</span>
          </div>
          <input v-model="reminderText" type="text" placeholder="提醒内容..." class="text-input" />
          <div class="toggle-group">
            <label class="checkbox-label">
              <input v-model="reminderRepeat" type="checkbox" /> 循环提醒
            </label>
            <button v-if="!activeTimer" class="primary start-btn" @click="startReminder">开启提醒</button>
            <button v-else class="danger stop-btn" @click="stopReminder">停止提醒</button>
          </div>
        </div>
        
        <div v-if="activeTimer" class="timer-display">
          <div class="timer-info">
            <span class="pulse-dot"></span>
            <span class="remaining-text">下次提醒：{{ remainingTimeLabel }}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
        </div>
      </div>

      <div class="meta-row">
        <button class="ghost" type="button" @click="togglePassthrough">
          {{ passthroughEnabled ? "关闭穿透" : "开启穿透" }}
        </button>
        <button class="ghost" type="button" @click="minimize">最小化</button>
      </div>
      <p class="hint">若无系统通知，请检查系统“通知与专注模式”设置。</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { PetAnimationName, PetStage } from "./lib/pet-stage";
import { createPetStage } from "./lib/pet-stage";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import {
  closeWindow,
  dragWindow,
  isTauriRuntime,
  listenToPassthroughChanges,
  minimizeWindow,
  setPetPassthrough
} from "./lib/tauri";

const stageRef = ref<HTMLDivElement | null>(null);
const stage = ref<PetStage | null>(null);
const paletteOpen = ref(true);
const passthroughEnabled = ref(false);
const showBubble = ref(false);
const runtimeLabel = computed(() =>
  passthroughEnabled.value ? "点击穿透已开启" : isTauriRuntime() ? "桌面预览模式" : "浏览器开发模式"
);

// 提醒逻辑
const reminderMinutes = ref(30);
const reminderText = ref("该休息一下啦！");
const reminderRepeat = ref(true);
const activeTimer = ref<number | null>(null);
const nextTickTime = ref<number | null>(null);
const remainingSeconds = ref(0);
const totalSeconds = ref(0);

const remainingTimeLabel = computed(() => {
  const m = Math.floor(remainingSeconds.value / 60);
  const s = remainingSeconds.value % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
});

const progressPercent = computed(() => {
  if (totalSeconds.value === 0) return 0;
  return ((totalSeconds.value - remainingSeconds.value) / totalSeconds.value) * 100;
});

let unlistenPassthrough: (() => void) | null = null;
let statusUpdateInterval: number | null = null;

onMounted(async () => {
  if (!stageRef.value) return;
  stage.value = await createPetStage(stageRef.value);
  unlistenPassthrough = await listenToPassthroughChanges((enabled) => {
    passthroughEnabled.value = enabled;
    if (enabled) paletteOpen.value = false;
  });

  statusUpdateInterval = window.setInterval(() => {
    if (nextTickTime.value) {
      remainingSeconds.value = Math.max(0, Math.floor((nextTickTime.value - Date.now()) / 1000));
    }
  }, 500);
});

onBeforeUnmount(() => {
  unlistenPassthrough?.();
  if (statusUpdateInterval) clearInterval(statusUpdateInterval);
  stopReminder();
  stage.value?.destroy();
});

async function testNotification() {
  console.log("Direct notification test triggered");
  let permission = await isPermissionGranted();
  if (!permission) permission = await requestPermission() === 'granted';
  
  if (permission) {
    sendNotification({ title: "桌宠测试", body: "如果你看到这个，说明通知功能正常！" });
    triggerNotificationEffect();
  } else {
    alert("没有通知权限");
  }
}

async function startReminder() {
  let hasPermission = await isPermissionGranted();
  if (!hasPermission) hasPermission = (await requestPermission()) === 'granted';

  if (hasPermission) {
    scheduleNext();
  } else {
    alert("请在系统设置中开启通知权限，否则无法弹窗提醒。");
  }
}

function scheduleNext() {
  const ms = reminderMinutes.value * 60 * 1000;
  totalSeconds.value = Math.floor(ms / 1000);
  nextTickTime.value = Date.now() + ms;
  remainingSeconds.value = totalSeconds.value;
  
  activeTimer.value = window.setTimeout(async () => {
    sendNotification({ title: "定时提醒", body: reminderText.value });
    triggerNotificationEffect();
    if (reminderRepeat.value) scheduleNext(); else stopReminder();
  }, ms);
}

function triggerNotificationEffect() {
  stage.value?.playAnimation("attack");
  showBubble.value = true;
  setTimeout(() => showBubble.value = false, 5000);
}

function stopReminder() {
  if (activeTimer.value) {
    clearTimeout(activeTimer.value);
    activeTimer.value = null;
    nextTickTime.value = null;
    remainingSeconds.value = 0;
    totalSeconds.value = 0;
  }
}

async function onWindowDrag() { await dragWindow(); }
function trigger(name: PetAnimationName) { stage.value?.playAnimation(name); }
function togglePalette() {
  if (passthroughEnabled.value) { void togglePassthrough(); return; }
  paletteOpen.value = !paletteOpen.value;
}
async function togglePassthrough() {
  const enabled = await setPetPassthrough(!passthroughEnabled.value);
  passthroughEnabled.value = enabled;
  if (enabled) paletteOpen.value = false;
}
async function minimize() { await minimizeWindow(); }
async function close() { await closeWindow(); }
</script>

<style scoped>
.speech-bubble {
  position: absolute;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  color: #2d1912;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 100;
  max-width: 200px;
  text-align: center;
}
.speech-bubble:after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  margin-left: -8px;
  border-width: 8px 8px 0;
  border-style: solid;
  border-color: white transparent transparent;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.reminder-zone {
  margin: 12px 0;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.active { border-color: rgba(140, 217, 176, 0.4); background: rgba(140, 217, 176, 0.05); }
.flex-between { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.section-title { font-size: 11px; font-weight: 800; color: #d9b08c; text-transform: uppercase; }
.text-btn { background: none; border: none; color: #8cd9b0; font-size: 10px; cursor: pointer; text-decoration: underline; }
.reminder-form { display: flex; flex-direction: column; gap: 8px; }
.input-group { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.input-group input {
  width: 45px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 4px;
  border-radius: 4px;
  text-align: center;
}
.text-input {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 6px;
  border-radius: 6px;
  font-size: 12px;
}
.toggle-group { display: flex; justify-content: space-between; align-items: center; }
.checkbox-label { font-size: 11px; display: flex; align-items: center; gap: 4px; }
.timer-display { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.1); }
.timer-info { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.pulse-dot { width: 6px; height: 6px; background: #8cd9b0; border-radius: 50%; animation: pulse 1.5s infinite; }
@keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
.remaining-text { font-size: 11px; color: #8cd9b0; font-weight: 600; }
.progress-bar { height: 3px; background: rgba(255, 255, 255, 0.1); border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: #8cd9b0; transition: width 0.5s linear; }
button.primary { background: #f59f6c; color: #2d1912; border: none; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer; }
button.danger { background: #ff6b6b; color: white; border: none; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer; }
</style>
