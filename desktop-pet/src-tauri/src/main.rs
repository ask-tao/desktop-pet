#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;

use serde::Serialize;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{App, AppHandle, Emitter, Manager};

const EVENT_PASSTHROUGH_CHANGED: &str = "pet://passthrough-changed";
const MENU_TOGGLE_WINDOW: &str = "toggle_window";
const MENU_TOGGLE_PASSTHROUGH: &str = "toggle_passthrough";
const MENU_QUIT: &str = "quit";

#[derive(Default)]
struct PetState {
    passthrough_enabled: Mutex<bool>,
    tray: Mutex<Option<TrayIcon<tauri::Wry>>>,
    tray_menu: Mutex<Option<Menu<tauri::Wry>>>,
    tray_items: Mutex<Vec<MenuItem<tauri::Wry>>>,
}

#[derive(Clone, Serialize)]
struct PassthroughPayload {
    enabled: bool,
}

#[tauri::command]
fn set_pet_passthrough(app: AppHandle, enabled: bool) -> Result<bool, String> {
    apply_passthrough(&app, enabled).map_err(|error| error.to_string())?;
    Ok(enabled)
}

fn main() {
    tauri::Builder::default()
        .manage(PetState::default())
        .setup(|app| {
            build_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![set_pet_passthrough])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn build_tray(app: &mut App) -> tauri::Result<()> {
    let toggle_window = MenuItem::with_id(app, MENU_TOGGLE_WINDOW, "Show / Hide", true, None::<&str>)?;
    let toggle_passthrough = MenuItem::with_id(
        app,
        MENU_TOGGLE_PASSTHROUGH,
        "Toggle Click-through",
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, MENU_QUIT, "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&toggle_window, &toggle_passthrough, &quit])?;
    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or_else(|| tauri::Error::AssetNotFound("default tray icon".into()))?;

    let tray = TrayIconBuilder::with_id("desktop-pet-tray")
        .icon(icon)
        .tooltip("Desktop Pet")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if matches!(
                event,
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
            ) {
                let _ = toggle_main_window(tray.app_handle());
            }
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            MENU_TOGGLE_WINDOW => {
                let _ = toggle_main_window(app);
            }
            MENU_TOGGLE_PASSTHROUGH => {
                if let Some(enabled) = current_passthrough(app) {
                    let _ = apply_passthrough(app, !enabled);
                }
            }
            MENU_QUIT => app.exit(0),
            _ => {}
        })
        .build(app)?;

    if let Ok(mut state) = app.state::<PetState>().tray.lock() {
        *state = Some(tray);
    }
    if let Ok(mut state) = app.state::<PetState>().tray_menu.lock() {
        *state = Some(menu);
    }
    if let Ok(mut state) = app.state::<PetState>().tray_items.lock() {
        *state = vec![toggle_window, toggle_passthrough, quit];
    }

    Ok(())
}

fn current_passthrough(app: &AppHandle) -> Option<bool> {
    app.state::<PetState>()
        .passthrough_enabled
        .lock()
        .ok()
        .map(|state| *state)
}

fn apply_passthrough(app: &AppHandle, enabled: bool) -> tauri::Result<()> {
    if let Ok(mut state) = app.state::<PetState>().passthrough_enabled.lock() {
        *state = enabled;
    }

    if let Some(window) = app.get_webview_window("main") {
        window.set_ignore_cursor_events(enabled)?;
        if !enabled {
            window.show()?;
            window.set_focus()?;
        }
    }

    let _ = app.emit(
        EVENT_PASSTHROUGH_CHANGED,
        PassthroughPayload { enabled },
    );

    Ok(())
}

fn toggle_main_window(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible()? {
            window.hide()?;
        } else {
            window.show()?;
            window.set_focus()?;
        }
    }

    Ok(())
}
