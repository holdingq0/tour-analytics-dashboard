use std::net::TcpStream;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::{Manager, RunEvent};

const SERVER_PORT: u16 = 13210;

struct ServerState {
    child: Mutex<Option<Child>>,
}

fn find_node_executable(resource_dir: &std::path::Path) -> String {
    // Bundled node binary (production builds via CI)
    let bundled = resource_dir.join("node.exe");
    if bundled.exists() {
        return bundled.to_string_lossy().to_string();
    }

    // Fallback to system Node.js
    "node".to_string()
}

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(ServerState {
            child: Mutex::new(None),
        })
        .setup(|app| {
            let resource_dir = app
                .path()
                .resource_dir()
                .expect("failed to resolve resource dir");

            let server_dir = resource_dir.join("server");
            let server_js = server_dir.join("server.js");

            // In development, the server is started by beforeDevCommand
            if !server_js.exists() {
                return Ok(());
            }

            let node_path = find_node_executable(&resource_dir);

            let child = Command::new(&node_path)
                .arg(&server_js)
                .env("PORT", SERVER_PORT.to_string())
                .env("HOSTNAME", "127.0.0.1")
                .env("NODE_ENV", "production")
                .current_dir(&server_dir)
                .stdout(Stdio::null())
                .stderr(Stdio::piped())
                .spawn()
                .map_err(|e| {
                    format!(
                        "Failed to start server: {}. Make sure Node.js is installed.",
                        e
                    )
                })?;

            *app.state::<ServerState>().child.lock().unwrap() = Some(child);

            // Navigate to server once it's ready
            let window = app
                .get_webview_window("main")
                .expect("main window not found");

            thread::spawn(move || {
                let addr = format!("127.0.0.1:{}", SERVER_PORT);

                // Wait up to 30 seconds for the server to become available
                for _ in 0..150 {
                    if TcpStream::connect(&addr).is_ok() {
                        thread::sleep(Duration::from_millis(300));
                        let url = format!("http://{}", addr);
                        let _ = window.eval(&format!("window.location.replace('{}')", url));
                        return;
                    }
                    thread::sleep(Duration::from_millis(200));
                }

                let _ = window.eval(
                    "document.body.innerHTML = \
                     '<div style=\"display:flex;align-items:center;justify-content:center;\
                     height:100vh;font-family:sans-serif;flex-direction:column\">\
                     <h2>Не удалось запустить сервер</h2>\
                     <p>Убедитесь, что Node.js установлен на вашем компьютере.</p></div>'",
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
