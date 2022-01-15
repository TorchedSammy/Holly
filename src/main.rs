mod holly;

use indicatif::ProgressBar;
use reqwest::blocking::multipart;
use rust_socketio::{Client, ClientBuilder, Payload};
use std::io::Read;
use std::{env, time};

fn main() {
	let args: Vec<String> = env::args().collect();
	let spinner = ProgressBar::new_spinner(); // thanks indicatif this makes sense
	spinner.enable_steady_tick(80);

	let form = multipart::Form::new()
		.text("skin", "blueberry_v1_7_0")
		.text("resolution", "1280x720")
		.text("username", "Holly")
		.text("showDanserLogo", "false")
		.file("replayFile", &args[1])
		.unwrap();

	spinner.set_message("Uploading replay...");
	let client = reqwest::blocking::Client::new();
	let mut res = client
		.post("https://ordr-api.issou.best/renders")
		.multipart(form)
		.send()
		.unwrap();
	spinner.set_message("Replay uploaded, waiting for response");

	// check if status code is 429
	if res.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
		// get X-RateLimit-Reset header
		let now = time::Instant::now();
		let stamp = res
			.headers()
			.get("X-RateLimit-Reset")
			.unwrap()
			.to_str()
			.unwrap()
			.parse::<u64>()
			.unwrap();
		let duration = time::Duration::from_secs(stamp) - now.elapsed();

		println!("{}", duration.as_secs());
		println!("Ratelimited, try again later...");
		return;
	}

	let mut body = String::new();
	res.read_to_string(&mut body).unwrap();

	let r: holly::SentRender = serde_json::from_str(&body).unwrap();

	// on 429 it doesn't send json so we check if response code isnt 201 and
	// print error message from json
	if res.status() != reqwest::StatusCode::CREATED {
		println!("Error: {} ({})", r.message, r.errorCode);
		return;
	}
	spinner.set_message("Uploaded successfully, waiting for render to start");
	let render_id = r.renderID;

	let done_callback = {
		let spinner = spinner.clone();
		move |payload: Payload, socket: Client| {
			let render_id = render_id;
			let data = match payload {
				Payload::String(s) => s,
				_ => "".to_string(),
			};

			let p: holly::RenderDone = serde_json::from_str(&data).unwrap();
			if p.renderID == render_id {
				spinner.set_message(p.videoUrl);
				spinner.finish();
				socket.disconnect();
				std::process::exit(0);
			}
		}
	};

	let progress_callback = {
		let spinner = spinner.clone();
		move |payload: Payload, _: Client| {
			let data = match payload {
				Payload::String(s) => s,
				_ => "".to_string(),
			};
			let p: holly::RenderProgress = serde_json::from_str(&data).unwrap();
			if p.renderID == render_id {
				spinner.set_message(p.progress);
			}
		}
	};

	let failed_callback = {
		let spinner = spinner.clone();
		move |payload: Payload, socket: Client| {
			let data = match payload {
				Payload::String(s) => s,
				_ => "".to_string(),
			};

			let p: holly::RenderFailed = serde_json::from_str(&data).unwrap();
			if p.renderID == render_id {
				spinner.set_message(format!(
					"Render failed. Error: {} ({})",
					p.errorMessage, p.errorCode
				));
				spinner.finish();
				socket.disconnect();
				std::process::exit(0);
			}
		}
	};
	ClientBuilder::new("https://ordr-ws.issou.best")
		.on("render_progress_json", progress_callback)
		.on("render_done_json", done_callback)
		.on("render_failed_json", failed_callback)
		.connect()
		.expect("Connection failed");

    loop {}
}
