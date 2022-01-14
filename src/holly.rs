#![allow(non_snake_case)]
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct SentRender {
	pub message: String,
	pub errorCode: u32,
	pub renderID: u32,
}

#[derive(Serialize, Deserialize)]
pub struct RenderAdded {
	pub renderID: u32
}

#[derive(Serialize, Deserialize)]
pub struct RenderProgress {
	pub renderID: u32,
	pub progress: String
}

#[derive(Serialize, Deserialize)]
pub struct RenderDone {
	pub renderID: u32,
	pub videoUrl: String
}

#[derive(Serialize, Deserialize)]
pub struct RenderFailed {
	pub renderID: u32,
	pub errorCode: u32,
	pub errorMessage: String
}
