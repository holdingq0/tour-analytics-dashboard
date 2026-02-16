use std::fs;
use std::io;
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{Manager, RunEvent};

const SERVER_PORT: u16 = 13210;
const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

struct ServerState {
    child: Arc<Mutex<Option<Child>>>,
}

/// Get the application data path for storing extracted server files
fn get_app_data_dir() -> PathBuf {
    let appdata = std::env::var("APPDATA")
        .unwrap_or_else(|_| std::env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".to_string()));
    PathBuf::from(appdata).join("tour-analytics-dashboard")
}

/// Extract the server bundle zip to the app data directory
fn extract_server_bundle(resource_dir: &Path, target_dir: &Path) -> Result<(), String> {
    let zip_path = resource_dir.join("server-bundle.zip");
    if !zip_path.exists() {
        return Err(format!("Server bundle not found: {}", zip_path.display()));
    }

    // Remove old server directory if it exists
    let server_dir = target_dir.join("server");
    if server_dir.exists() {
        fs::remove_dir_all(&server_dir).map_err(|e| format!("Failed to clean old server: {}", e))?;
    }
    fs::create_dir_all(&server_dir).map_err(|e| format!("Failed to create server dir: {}", e))?;

    let file = fs::File::open(&zip_path).map_err(|e| format!("Failed to open zip: {}", e))?;
    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("Failed to read zip: {}", e))?;

    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read entry {}: {}", i, e))?;

        let out_path = server_dir.join(
            entry
                .enclosed_name()
                .ok_or_else(|| "Invalid zip entry name".to_string())?,
        );

        if entry.is_dir() {
            fs::create_dir_all(&out_path)
                .map_err(|e| format!("Failed to create dir {}: {}", out_path.display(), e))?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent).map_err(|e| {
                    format!("Failed to create parent dir {}: {}", parent.display(), e)
                })?;
            }
            let mut outfile = fs::File::create(&out_path)
                .map_err(|e| format!("Failed to create file {}: {}", out_path.display(), e))?;
            io::copy(&mut entry, &mut outfile)
                .map_err(|e| format!("Failed to write {}: {}", out_path.display(), e))?;
        }
    }

    // Write version marker
    let marker = target_dir.join(".version");
    fs::write(&marker, APP_VERSION).ok();

    Ok(())
}

/// Check if server needs extraction (first run or version mismatch)
fn needs_extraction(app_data_dir: &Path) -> bool {
    let marker = app_data_dir.join(".version");
    let server_js = app_data_dir.join("server").join("server.js");

    if !server_js.exists() {
        return true;
    }

    match fs::read_to_string(&marker) {
        Ok(ver) => ver.trim() != APP_VERSION,
        Err(_) => true,
    }
}

fn find_node_executable(resource_dir: &Path) -> String {
    let bundled = resource_dir.join("node.exe");
    if bundled.exists() {
        return bundled.to_string_lossy().to_string();
    }
    "node".to_string()
}

fn show_error(window: &tauri::WebviewWindow, title: &str, message: &str) {
    let html = format!(
        "document.body.innerHTML = '<div style=\"display:flex;align-items:center;\
         justify-content:center;height:100vh;font-family:sans-serif;flex-direction:column;\
         background:#09090b;color:#fafafa;gap:16px\">\
         <h2 style=\"font-size:20px\">{}</h2>\
         <p style=\"color:#71717a;font-size:14px;max-width:400px;text-align:center\">{}</p></div>'",
        title, message
    );
    let _ = window.eval(&html);
}

fn show_loading(window: &tauri::WebviewWindow, message: &str) {
    let html = format!(
        "document.body.innerHTML = '<div style=\"display:flex;align-items:center;\
         justify-content:center;height:100vh;font-family:sans-serif;flex-direction:column;\
         background:#09090b;color:#fafafa;gap:16px\">\
         <div style=\"width:32px;height:32px;border:3px solid #27272a;border-top-color:#fafafa;\
         border-radius:50%;animation:spin 0.8s linear infinite\"></div>\
         <p style=\"color:#71717a;font-size:14px\">{}</p></div>\
         <style>@keyframes spin{{from{{transform:rotate(0deg)}}to{{transform:rotate(360deg)}}}}</style>'",
        message
    );
    let _ = window.eval(&html);
}

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .manage(ServerState {
            child: Arc::new(Mutex::new(None)),
        })
        .setup(|app| {
            let resource_dir = app
                .path()
                .resource_dir()
                .expect("failed to resolve resource dir");

            let window = app
                .get_webview_window("main")
                .expect("main window not found");

            let app_data_dir = get_app_data_dir();
            let server_dir = app_data_dir.join("server");
            let server_js = server_dir.join("server.js");
            let bundle_zip = resource_dir.join("server-bundle.zip");

            // In development, the server is started by beforeDevCommand
            if !bundle_zip.exists() && !server_js.exists() {
                return Ok(());
            }

            let node_path = find_node_executable(&resource_dir);
            let app_state = app.state::<ServerState>();
            let child_state = app_state.child.clone();
            let w = window.clone();

            // Extract and start server in a background thread
            thread::spawn(move || {
                // Extract server if needed
                if needs_extraction(&app_data_dir) {
                    show_loading(&w, "Preparing application...");

                    if let Err(e) = extract_server_bundle(&resource_dir, &app_data_dir) {
                        show_error(&w, "Setup Failed", &e);
                        return;
                    }
                }

                if !server_js.exists() {
                    show_error(&w, "Error", "Server files not found after extraction.");
                    return;
                }

                // Start Node.js server
                let child = match Command::new(&node_path)
                    .arg(&server_js)
                    .env("PORT", SERVER_PORT.to_string())
                    .env("HOSTNAME", "127.0.0.1")
                    .env("NODE_ENV", "production")
                    .current_dir(&server_dir)
                    .stdout(Stdio::null())
                    .stderr(Stdio::piped())
                    .spawn()
                {
                    Ok(child) => child,
                    Err(e) => {
                        let msg = format!("Failed to start Node.js: {}. Path: {}", e, node_path);
                        show_error(&w, "Startup Error", &msg);
                        return;
                    }
                };

                *child_state.lock().unwrap() = Some(child);

                // Wait for server to become available
                let addr = format!("127.0.0.1:{}", SERVER_PORT);
                for _ in 0..150 {
                    if TcpStream::connect(&addr).is_ok() {
                        thread::sleep(Duration::from_millis(300));
                        let url = format!("http://{}", addr);
                        let _ = w.eval(&format!("window.location.replace('{}')", url));
                        return;
                    }
                    thread::sleep(Duration::from_millis(200));
                }

                show_error(
                    &w,
                    "Server Timeout",
                    "The server did not respond within 30 seconds. Please restart the application.",
                );
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building application");

    app.run(|app_handle, event| {
        if let RunEvent::Exit = event {
            if let Some(mut child) = app_handle
                .state::<ServerState>()
                .child
                .lock()
                .unwrap()
                .take()
            {
                let _ = child.kill();
            }
        }
    });
}
