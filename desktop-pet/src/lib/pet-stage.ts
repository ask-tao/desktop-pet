import { Application, Assets, Container, Graphics, Text, TextStyle } from "pixi.js";

export type PetAnimationName = "idle" | "attack" | "hit" | "die";

export interface PetStage {
  destroy: () => void;
  playAnimation: (name: PetAnimationName) => void;
  setStatus: (message: string) => void;
}

interface StageState {
  app: Application;
  pet: any;
  statusText: Text;
  usingSpine: boolean;
  pulseTick: number;
}

const SPINE_SKELETON_PATH = "/spine/mao.json";
const SPINE_ATLAS_PATH = "/spine/mao.atlas";

export async function createPetStage(host: HTMLDivElement): Promise<PetStage> {
  const app = new Application({
    antialias: true,
    autoDensity: true,
    backgroundAlpha: 0 as unknown as number,
    resizeTo: host
  });

  host.appendChild(app.view as HTMLCanvasElement);

  const root = new Container();
  app.stage.addChild(root);

  const shadow = new Graphics();
  shadow.beginFill(0x190e0a, 0.22);
  shadow.drawEllipse(0, 0, 88, 24);
  shadow.endFill();
  shadow.position.set(host.clientWidth / 2, host.clientHeight - 72);
  root.addChild(shadow);

  let pet: any;
  let usingSpine = false;

  try {
    const spineModule = await import("@pixi-spine/all-3.8");
    const Spine = (spineModule as any).Spine;

    Assets.add({
      alias: "pet-data",
      src: SPINE_SKELETON_PATH,
      data: { spineAtlasFile: SPINE_ATLAS_PATH }
    });
    
    const resource = await Assets.load("pet-data");
    if (resource && resource.spineData) {
      pet = new Spine(resource.spineData);
      pet.scale.set(0.45);
      usingSpine = true;
    } else {
      throw new Error("Missing spineData");
    }
  } catch (e) {
    console.error("Spine load failed:", e);
    pet = createPlaceholderPet();
  }

  pet.position.set(host.clientWidth / 2, host.clientHeight - 116);
  root.addChild(pet);

  const statusText = new Text(usingSpine ? "Spine Ready" : "Fallback Mode", new TextStyle({
    fill: "#fff5ea",
    fontSize: 16,
    fontWeight: "600"
  }));
  statusText.anchor.set(0.5, 0);
  statusText.position.set(host.clientWidth / 2, 34);
  root.addChild(statusText);

  const state: StageState = {
    app,
    pet,
    statusText,
    usingSpine,
    pulseTick: 0
  };

  app.ticker.add((delta) => {
    state.pulseTick += delta * 0.05;
    if (!state.usingSpine) {
      const scale = 1 + Math.sin(state.pulseTick) * 0.02;
      pet.scale.set(scale, 1 / scale);
    }
    shadow.scale.x = 1 + Math.sin(state.pulseTick) * 0.05;
    shadow.alpha = 0.16 + (Math.sin(state.pulseTick) + 1) * 0.04;
  });

  const resize = () => {
    shadow.position.set(host.clientWidth / 2, host.clientHeight - 72);
    pet.position.set(host.clientWidth / 2, host.clientHeight - 116);
    statusText.position.set(host.clientWidth / 2, 34);
  };

  window.addEventListener("resize", resize);
  playAnimation(state, "idle");

  return {
    destroy: () => {
      window.removeEventListener("resize", resize);
      app.destroy(true, { children: true });
    },
    playAnimation: (name) => playAnimation(state, name),
    setStatus: (msg) => (statusText.text = msg)
  };
}

function createPlaceholderPet(): Graphics {
  const g = new Graphics();
  g.beginFill(0xf59f6c);
  g.drawRoundedRect(-60, -120, 120, 120, 30);
  g.endFill();
  return g;
}

function playAnimation(state: StageState, name: PetAnimationName): void {
  if (state.usingSpine && state.pet.state) {
    const pet = state.pet;
    // 现在只有 idle 动画是循环的
    const isLoop = (name === "idle");
    try {
      pet.state.setAnimation(0, name, isLoop);
      if (!isLoop) {
        // 如果不是循环动画（包括 die, attack, hit），播放完自动切回 idle
        pet.state.addAnimation(0, "idle", true, 0);
      }
      state.statusText.text = `Spine: ${name}`;
    } catch (e) {
      console.error("Animation error:", e);
    }
  } else {
    state.statusText.text = `Fallback: ${name}`;
    const g = state.pet as Graphics;
    switch (name) {
      case "attack":
        g.rotation = 0.2;
        setTimeout(() => g.rotation = 0, 300);
        break;
      case "hit":
        g.tint = 0xff0000;
        setTimeout(() => g.tint = 0xffffff, 300);
        break;
      case "die":
        g.alpha = 0.5;
        setTimeout(() => g.alpha = 1, 1000);
        break;
      default:
        g.rotation = 0;
        g.tint = 0xffffff;
        g.alpha = 1;
        break;
    }
  }
}
