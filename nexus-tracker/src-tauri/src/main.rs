#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use axum::{
    extract::{Json, State},
    routing::post,
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    path::{Path, PathBuf},
    sync::Arc,
    time::Instant,
};
use sysinfo::{Pid, Process, ProcessRefreshKind, System};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::Manager;
use tokio::{net::TcpListener, sync::Mutex, time};

#[derive(Debug, Serialize, Deserialize, Clone)]
struct LaunchRequest {
    game_id: String,
    game_title: String,
    executable_path: String,
    user_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct StopRequest {
    game_id: String,
    user_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ApiResponse {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pid: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    total_seconds: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    running: Option<bool>,
}

#[derive(Clone)]
struct AppState {
    active_games: Arc<Mutex<HashMap<String, GameSession>>>,
    http_client: Client,
    api_url: String,
}

struct GameSession {
    start_time: Instant,
    target_exe_canonical: String,
    exe_file_name: String,
    root_pid: u32,
    game_title: String,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let app_state = AppState {
        active_games: Arc::new(Mutex::new(HashMap::new())),
        http_client: Client::new(),
        api_url: "http://localhost:3000".to_string(),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/launch", post(launch_game))
        .route("/stop", post(stop_game))
        .route("/status", post(get_status))
        .layer(cors)
        .with_state(app_state.clone());

    let listener = TcpListener::bind("127.0.0.1:8765")
        .await
        .expect("Failed to bind to port 8765");
    
    println!("🎮 Nexus Tracker HTTP server running on http://localhost:8765");

    let server_state = app_state.clone();
    tokio::spawn(async move {
        axum::serve(listener, app)
            .await
            .expect("HTTP server failed");
    });

    let heartbeat_state = app_state.clone();
    tokio::spawn(async move {
        loop {
            time::sleep(time::Duration::from_secs(30)).await;
            send_heartbeats(heartbeat_state.clone()).await;
        }
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Nexus Tracker - Game time tracking active")
                .on_tray_icon_event(|_tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        println!("🎮 Nexus Tracker tray clicked");
                    }
                })
                .build(app)?;
            
            Ok(())
        })
        .manage(app_state.clone())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn exe_file_name(path: &Path) -> Option<String> {
    path.file_name()
        .and_then(|n| n.to_str())
        .map(|s| s.to_string())
}

fn canonical_exe_path(path: &Path) -> String {
    std::fs::canonicalize(path)
        .unwrap_or_else(|_| path.to_path_buf())
        .to_string_lossy()
        .to_lowercase()
}

fn normalize_exe_file_name(name: &str) -> String {
    let s = name.to_lowercase();
    s.strip_suffix(".exe")
        .map(str::to_string)
        .unwrap_or(s)
}

fn names_match(process_name: &str, exe_file_name: &str) -> bool {
    normalize_exe_file_name(process_name) == normalize_exe_file_name(exe_file_name)
}

/// Match by full exe path (preferred). Name-only fallback when exe path is unavailable.
fn process_matches_target(
    process: &Process,
    target_canonical: &str,
    exe_file_name: &str,
) -> bool {
    if let Some(exe) = process.exe() {
        let proc_canonical = canonical_exe_path(exe);
        return proc_canonical == target_canonical;
    }
    names_match(process.name(), exe_file_name)
}

fn collect_running_pids(
    sys: &System,
    target_canonical: &str,
    exe_file_name: &str,
    tracked: &mut HashSet<u32>,
) {
    tracked.retain(|pid| sys.process(Pid::from_u32(*pid)).is_some());

    for (pid, process) in sys.processes() {
        let pid_u32 = pid.as_u32();

        if process_matches_target(process, target_canonical, exe_file_name) {
            tracked.insert(pid_u32);
        }

        if let Some(parent) = process.parent() {
            if tracked.contains(&parent.as_u32()) {
                tracked.insert(pid_u32);
            }
        }
    }
}

fn is_game_still_running(
    sys: &mut System,
    target_canonical: &str,
    exe_file_name: &str,
    tracked: &mut HashSet<u32>,
) -> bool {
    sys.refresh_processes_specifics(ProcessRefreshKind::new());
    collect_running_pids(sys, target_canonical, exe_file_name, tracked);
    !tracked.is_empty()
}

fn spawn_game_executable(path: &Path) -> Result<(u32, String), String> {
    if !path.is_file() {
        return Err(format!(
            "Executable not found: {}",
            path.display()
        ));
    }

    let exe_name = exe_file_name(path)
        .ok_or_else(|| "Invalid executable path".to_string())?;

    let mut cmd = std::process::Command::new(path);
    if let Some(dir) = path.parent() {
        cmd.current_dir(dir);
    }

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // Detach from Nexus Tracker so the game isn't tied to our process tree
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;
        const DETACHED_PROCESS: u32 = 0x00000008;
        cmd.creation_flags(CREATE_NEW_PROCESS_GROUP | DETACHED_PROCESS);
    }

    let child = cmd
        .spawn()
        .map_err(|e| format!("Failed to start game: {e}"))?;

    let pid = child.id();
    std::mem::forget(child);

    Ok((pid, exe_name))
}

async fn launch_game(
    State(state): State<AppState>,
    Json(payload): Json<LaunchRequest>,
) -> Json<ApiResponse> {
    tracing::info!("🚀 Launching game: {} ({})", payload.game_title, payload.executable_path);

    let path = PathBuf::from(payload.executable_path.trim());

    let (pid, exe_name) = match spawn_game_executable(&path) {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("❌ {}", e);
            return Json(ApiResponse {
                success: false,
                message: None,
                error: Some(e),
                pid: None,
                total_seconds: None,
                running: None,
            });
        }
    };

    let target_canonical = canonical_exe_path(&path);

    // Many PC games exit the launcher quickly and spawn the real process
    time::sleep(time::Duration::from_secs(2)).await;

    let mut tracked = HashSet::from([pid]);
    let mut sys = System::new();
    if !is_game_still_running(&mut sys, &target_canonical, &exe_name, &mut tracked) {
        tracing::error!("❌ Game process exited immediately: {}", path.display());
        return Json(ApiResponse {
            success: false,
            message: None,
            error: Some(
                "The game closed right after launch. Open the .exe manually from its folder first to check it runs, then try again.".to_string(),
            ),
            pid: None,
            total_seconds: None,
            running: None,
        });
    }

    let game_title = payload.game_title.clone();

    let mut games = state.active_games.lock().await;
    games.insert(
        payload.game_id.clone(),
        GameSession {
            start_time: Instant::now(),
            target_exe_canonical: target_canonical.clone(),
            exe_file_name: exe_name.clone(),
            root_pid: pid,
            game_title: game_title.clone(),
        },
    );

    tracing::info!("✅ Game launched with PID: {} ({})", pid, exe_name);

    let state_clone = state.clone();
    let game_id = payload.game_id.clone();
    tokio::spawn(async move {
        monitor_process(
            state_clone,
            game_id,
            target_canonical,
            exe_name,
            tracked,
        )
        .await;
    });

    Json(ApiResponse {
        success: true,
        message: Some(format!("{} launched successfully", game_title)),
        error: None,
        pid: Some(pid),
        total_seconds: None,
        running: Some(true),
    })
}

async fn stop_game(
    State(state): State<AppState>,
    Json(payload): Json<StopRequest>,
) -> Json<ApiResponse> {
    tracing::info!("⏹️ Stopping game tracking: {}", payload.game_id);

    let mut games = state.active_games.lock().await;
    if let Some(session) = games.remove(&payload.game_id) {
        let elapsed = session.start_time.elapsed().as_secs();
        
        let client = state.http_client.clone();
        let api_url = state.api_url.clone();
        let game_id = payload.game_id.clone();
        
        tokio::spawn(async move {
            let _ = client
                .post(format!("{}/api/tracker/session-end", api_url))
                .json(&serde_json::json!({
                    "game_id": game_id,
                    "seconds": elapsed
                }))
                .send()
                .await;
        });

        tracing::info!("✅ Session ended. Total time: {} seconds", elapsed);
        Json(ApiResponse {
            success: true,
            message: Some("Tracking stopped".to_string()),
            error: None,
            pid: None,
            total_seconds: Some(elapsed),
            running: Some(false),
        })
    } else {
        Json(ApiResponse {
            success: false,
            message: Some("Game not found".to_string()),
            error: None,
            pid: None,
            total_seconds: None,
            running: Some(false),
        })
    }
}

async fn get_status(
    State(state): State<AppState>,
    Json(payload): Json<LaunchRequest>,
) -> Json<ApiResponse> {
    let games = state.active_games.lock().await;
    let session = games.get(&payload.game_id);
    let is_running = session.is_some();
    let elapsed = session.map(|s| s.start_time.elapsed().as_secs());

    Json(ApiResponse {
        success: true,
        message: None,
        error: None,
        pid: None,
        total_seconds: elapsed,
        running: Some(is_running),
    })
}

async fn monitor_process(
    state: AppState,
    game_id: String,
    target_canonical: String,
    exe_file_name: String,
    mut tracked: HashSet<u32>,
) {
    let mut sys = System::new();

    loop {
        time::sleep(time::Duration::from_secs(1)).await;

        if is_game_still_running(&mut sys, &target_canonical, &exe_file_name, &mut tracked) {
            continue;
        }

        tracing::info!("🏁 Game process ended: {}", game_id);

        let mut games = state.active_games.lock().await;
        if let Some(session) = games.remove(&game_id) {
            let elapsed = session.start_time.elapsed().as_secs();

            let client = state.http_client.clone();
            let api_url = state.api_url.clone();

            match client
                .post(format!("{}/api/tracker/session-end", api_url))
                .json(&serde_json::json!({
                    "game_id": game_id,
                    "seconds": elapsed
                }))
                .send()
                .await
            {
                Ok(resp) if resp.status().is_success() => {
                    tracing::info!("💾 Saved {} seconds of playtime", elapsed);
                }
                Ok(resp) => {
                    tracing::error!(
                        "❌ session-end failed (HTTP {}): {}",
                        resp.status(),
                        resp.text().await.unwrap_or_default()
                    );
                }
                Err(e) => {
                    tracing::error!("❌ session-end request failed: {}", e);
                }
            }
        }
        break;
    }
}

async fn send_heartbeats(state: AppState) {
    let games = state.active_games.lock().await;
    
    for (game_id, session) in games.iter() {
        let elapsed = session.start_time.elapsed().as_secs();
        
        let client = state.http_client.clone();
        let api_url = state.api_url.clone();
        let game_id_clone = game_id.clone();
        
        tokio::spawn(async move {
            if let Err(e) = client
                .post(format!("{}/api/tracker/heartbeat", api_url))
                .json(&serde_json::json!({
                    "game_id": game_id_clone,
                    "seconds": elapsed
                }))
                .send()
                .await
            {
                tracing::error!("❌ heartbeat failed for {}: {}", game_id_clone, e);
            }
        });
    }
}