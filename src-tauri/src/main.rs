#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use dotenvy::dotenv;
use futures_util::{SinkExt, StreamExt};
use http::Request;
use serde::Serialize;
use serde_json::Value;
use std::env;
use std::sync::Arc;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tauri::{Emitter, State};
use tokio::sync::{mpsc, Mutex as TokioMutex};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};

// State to hold our audio stream sender
struct DeepgramState {
    sender: Arc<TokioMutex<Option<mpsc::Sender<Vec<u8>>>>>,
}

#[tauri::command]
async fn send_audio_chunk(
    state: State<'_, DeepgramState>,
    chunk: Vec<u8>,
) -> Result<(), String> {
    let sender_lock = state.sender.lock().await;
    if let Some(tx) = sender_lock.as_ref() {
        tx.send(chunk)
            .await
            .map_err(|e| format!("Failed to forward audio: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn start_listening(
    app: tauri::AppHandle,
    state: State<'_, DeepgramState>,
) -> Result<(), String> {
    // 1. Load .env and grab the key
    dotenv().ok();
    let api_key = env::var("DEEPGRAM_API_KEY")
        .map_err(|_| "DEEPGRAM_API_KEY not found in src-tauri/.env".to_string())?;

    // 2. Create communication channel
    let (tx, mut rx) = mpsc::channel::<Vec<u8>>(100);

    // 3. Store sender in state so React can call send_audio_chunk
    {
        let mut sender_lock = state.sender.lock().await;
        *sender_lock = Some(tx);
    }

    // 4. Spawn Background Thread for Deepgram WebSocket
    tauri::async_runtime::spawn(async move {
        // Nova-2 Model + Settings to match your React AudioContext (48kHz, Linear16)
        let url = "wss://api.deepgram.com/v1/listen?model=nova-2&encoding=linear16&sample_rate=48000&channels=1&interim_results=true&endpointing=300&smart_format=true&punctuate=true&numerals=true&vad_events=true";
        let mut request = url.into_client_request().expect("Failed to parse URL");
        request.headers_mut().insert(
        "Authorization",
        format!("Token {}", api_key).parse().unwrap(),);

        match connect_async(request).await {
            Ok((ws_stream, _)) => {
                println!(">>> Rust: Connected Successfully!");
                let (mut write, mut read) = ws_stream.split();

                // TASK A: Forward bytes from React to Deepgram
                let mut forward_task = tauri::async_runtime::spawn(async move {
                    while let Some(chunk) = rx.recv().await {
                        if write.send(Message::Binary(chunk)).await.is_err() {
                            break;
                        }
                    }
                });

                // TASK B: Listen for Transcripts from Deepgram
                let app_handle = app.clone();
                let mut receive_task = tauri::async_runtime::spawn(async move {
                    while let Some(Ok(msg)) = read.next().await {
                        if let Message::Text(text) = msg {
                            if let Ok(json) = serde_json::from_str::<Value>(&text) {
                                // Dig into Deepgram's JSON structure
                                if let Some(alternative) = json["channel"]["alternatives"].get(0) {
                                      let transcript = alternative["transcript"].as_str().unwrap_or("");
                                      let is_final = json["is_final"].as_bool().unwrap_or(false);

                                          if !transcript.is_empty() {
                                              let payload = serde_json::json!({
                                                "text": transcript,
                                                "is_final": is_final
                                              });
                                              let _ = app_handle.emit("transcript", payload);
                                          }
                                 }
                            }
                        }
                    }
                });

                // Wait for either task to stop (cleanup)
                tokio::select! {
                    _ = &mut forward_task => { receive_task.abort(); },
                    _ = &mut receive_task => { forward_task.abort(); },
                }
                println!(">>> Rust: Deepgram session ended.");
            }
            Err(e) => eprintln!(">>> Rust: WebSocket Error: {}", e),
        }
    });

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(DeepgramState {
            sender: Arc::new(TokioMutex::new(None)),
        })
        .invoke_handler(tauri::generate_handler![
            start_listening,
            send_audio_chunk
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri app");
}