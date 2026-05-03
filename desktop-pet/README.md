# 桌面小宠 (Desktop Pet)

基于 **Tauri v2** + **Vue 3** + **PixiJS v7** 开发的跨平台桌宠应用模板，支持 macOS 和 Windows。

## 🌟 核心特性

- **透明窗体**：完美的桌面融合效果，无边框设计。
- **Spine 动画支持**：集成 `PixiJS` 与 `Spine v3.8` 骨骼动画引擎，动作流畅。
- **鼠标穿透**：一键切换“穿透模式”，不干扰日常办公。
- **系统托盘**：完整的托盘菜单支持，支持快速显示/隐藏及穿透切换。
- **占位模式**：即使 Spine 资源缺失，也能自动降级到自定义 Graphics 占位图，保证程序稳定运行。
- **窗口管理**：支持点击拖拽、最小化、关闭等基础功能。

## 🛠️ 开发环境要求

- **Node.js**: 18+ (推荐)
- **Rust**: 最新稳定版 (Tauri 开发必备)
- **系统依赖**: 请参考 [Tauri 官方文档](https://tauri.app/v2/guides/getting-started/prerequisites/) 安装对应系统的构建工具。

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 浏览器预览 (仅限 UI 调试)
```bash
npm run dev
```

### 启动桌面预览 (完整功能)
```bash
npm run tauri:dev
```

### 构建发布版本
```bash
npm run tauri:build
```

## 📁 资源配置

### Spine 资源路径
将您的 Spine 导出文件放入 `public/spine/` 目录下：
- `mao.json` (骨骼数据)
- `mao.atlas` (图集描述)
- `mao.png` (图集图片)

### 动画映射
当前项目已适配的动画名称为：`idle` (待机), `attack` (攻击), `hit` (受击), `die` (死亡)。
如果您的 Spine 资源包含不同的动画名，请在 `src/lib/pet-stage.ts` 中修改相应的映射逻辑。

## ⚙️ 核心逻辑说明

- **src-tauri/src/main.rs**: 处理窗口透明、鼠标穿透、系统托盘及 Rust 后端命令。
- **src/lib/pet-stage.ts**: PixiJS 舞台初始化、Spine 资源加载及动画切换控制。
- **src/App.vue**: 前端 UI 控制面板，负责与舞台及 Tauri 后端交互。

## 📜 许可证

本项目采用 MIT 协议开源。
