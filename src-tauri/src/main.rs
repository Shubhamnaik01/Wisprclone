// Prevents extra console window on Windows release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::TcpStream;
use std::sync::{Arc, Mutex};
use std::thread;

use tauri::{Emitter, Manager, State};
use tungstenite::{connect, Message};
use tungstenite::stream::MaybeTlsStream;
use tungstenite::client::IntoClientRequest;

use std::env;
use dotenv::dotenv;

// Shared state
struct DeepgramState {
    socket: Arc<Mutex<tungstenite::WebSocket<MaybeTlsStream<TcpStream>>>>,
}

// Called from frontend
#[tauri::command]
fn send_audio_chunk(chunk: Vec<u8>, state: State<DeepgramState>) {
    let mut socket = state.socket.lock().unwrap();
    socket
        .send(Message::Binary(chunk.into()))
        .expect("Failed to send audio");
}

fn main() {
    dotenv().ok();

    let api_key = env::var("DEEPGRAM_API_KEY")
        .expect("DEEPGRAM_API_KEY not set");

    let mut request = "wss://api.deepgram.com/v1/listen?model=nova-3&encoding=opus&container=webm"
        .into_client_request()
        .unwrap();
    request.headers_mut().insert(
        "Authorization",
        format!("Token {}", api_key).parse().unwrap(),
    );

    let (socket, _) = connect(request)
        .expect("Failed to connect to Deepgram");

    println!("Connected to Deepgram");

    let socket = Arc::new(Mutex::new(socket));

    tauri::Builder::default()
        .manage(DeepgramState {
            socket: socket.clone(),
        })
        .setup(|app| {
            let app_handle = app.handle().clone();
            let socket = app.state::<DeepgramState>().socket.clone();

            // Background listener thread
            thread::spawn(move || loop {
                let msg = {
                    let mut ws = socket.lock().unwrap();
                    ws.read()
                };

                match msg {
                    Ok(Message::Text(text)) => {
                        println!("Transcript: {}", text);
                        let _ = app_handle.emit("transcript", text.to_string());
                    }
                    Ok(_) => {}
                    Err(e) => {
                        eprintln!("WebSocket error: {:?}", e);// Deepgram closes the socket if no audio is received shortly after connection.
                                                              // Once frontend starts sending audio chunks, the connection remains open.
                        break;
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![send_audio_chunk])
        .run(tauri::generate_context!())
        .expect("Error running Tauri app");
}
