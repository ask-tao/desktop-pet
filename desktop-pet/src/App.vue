<template>
  <main class="shell">
    <section class="stage-frame" @mousedown.left="onWindowDrag">
      <div ref="stageRef" class="stage"></div>
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

      <div class="meta-row">
        <button class="ghost" type="button" @click="togglePassthrough">
          {{ passthroughEnabled ? "关闭穿透" : "开启穿透" }}
        </button>
        <button class="ghost" type="button" @click="minimize">最小化</button>
      </div>

      <p class="hint">托盘支持显示/隐藏和穿透切换，适合进入纯桌宠模式后恢复控制。</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { PetAnimationName, PetStage } from "./lib/pet-stage";
import { createPetStage } from "./lib/pet-stage";
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
const runtimeLabel = computed(() =>
  passthroughEnabled.value
    ? "Click-through enabled"
    : isTauriRuntime()
      ? "Tauri desktop preview"
      : "Browser preview mode"
);
let unlistenPassthrough: (() => void) | null = null;

onMounted(async () => {
  if (!stageRef.value) {
    return;
  }

  stage.value = await createPetStage(stageRef.value);

  unlistenPassthrough = await listenToPassthroughChanges((enabled) => {
    passthroughEnabled.value = enabled;
    if (enabled) {
      paletteOpen.value = false;
    }
  });
});

onBeforeUnmount(() => {
  unlistenPassthrough?.();
  stage.value?.destroy();
});

async function onWindowDrag(): Promise<void> {
  await dragWindow();
}

function trigger(name: PetAnimationName): void {
  stage.value?.playAnimation(name);
}

function togglePalette(): void {
  if (passthroughEnabled.value) {
    void togglePassthrough();
    return;
  }

  paletteOpen.value = !paletteOpen.value;
}

async function togglePassthrough(): Promise<void> {
  const enabled = await setPetPassthrough(!passthroughEnabled.value);
  passthroughEnabled.value = enabled;
  if (enabled) {
    paletteOpen.value = false;
  }
}

async function minimize(): Promise<void> {
  await minimizeWindow();
}

async function close(): Promise<void> {
  await closeWindow();
}
</script>
