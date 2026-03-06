mod ai;
mod commands;
mod db;
mod error;
mod notifier;
mod scheduler;
mod state;

use db::connection::init_db;
use db::queries::topics::get_active_topics;
use scheduler::engine::SchedulerEngine;
use state::AppState;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");
            let db_path = app_data_dir.join("newslens.db");

            let app_handle = app.handle().clone();

            tauri::async_runtime::block_on(async move {
                let db = init_db(db_path.to_str().expect("Invalid DB path"))
                    .await
                    .expect("Failed to initialize database");

                let mut scheduler = SchedulerEngine::new()
                    .await
                    .expect("Failed to create scheduler");

                // Start scheduler first, then add jobs
                scheduler.start().await.expect("Failed to start scheduler");

                // Load active topics and register jobs
                if let Ok(topics) = get_active_topics(&db).await {
                    for topic in topics {
                        let _ = scheduler
                            .add_topic_job(
                                topic.id,
                                &topic.cron_schedule,
                                app_handle.clone(),
                                db.clone(),
                            )
                            .await;
                    }
                }

                let state = AppState::new(db, scheduler);
                app_handle.manage(state);
            });

            // ── System Tray ──────────────────────────────────────────────
            let show_item = MenuItemBuilder::new("Show NewsLens")
                .id("show")
                .build(app)?;
            let quit_item = MenuItemBuilder::new("Quit").id("quit").build(app)?;
            let tray_menu = MenuBuilder::new(app)
                .item(&show_item)
                .separator()
                .item(&quit_item)
                .build()?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .tooltip("NewsLens")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            // ── Hide window on close instead of quitting ─────────────────
            if let Some(window) = app.get_webview_window("main") {
                let win = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Topics
            commands::topics::get_topics,
            commands::topics::get_topic,
            commands::topics::create_topic,
            commands::topics::update_topic,
            commands::topics::archive_topic,
            commands::topics::recover_topic,
            commands::topics::delete_topic,
            commands::topics::ai_suggest_topic,
            // Checklist
            commands::checklist::get_checklist_items,
            commands::checklist::add_checklist_item,
            commands::checklist::reorder_checklist_items,
            commands::checklist::delete_checklist_item,
            // Focus Points
            commands::focus_points::get_focus_points,
            commands::focus_points::add_focus_point,
            commands::focus_points::delete_focus_point,
            // Updates
            commands::updates::get_updates,
            commands::updates::get_all_recent_updates,
            // Chat
            commands::chat::get_chat_messages_cmd,
            commands::chat::send_chat_message_cmd,
            // Scheduler
            commands::scheduler::trigger_fetch,
            commands::scheduler::get_scheduler_status,
            // Settings
            commands::settings::get_settings_cmd,
            commands::settings::update_settings_cmd,
            // Events
            commands::events::get_news_events_cmd,
            // Stats
            commands::stats::get_topic_run_logs_cmd,
            commands::stats::get_global_stats_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
