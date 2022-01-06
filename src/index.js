const fs = require('fs');
const path = require('path');
const io = require('socket.io-client');
const fetch = require('node-fetch-commonjs');
const owy = require('owy');
const FormData = require('form-data');
const form = new FormData();
const spinner = new owy.Spinner();

const filePath = process.argv[2];
const fileStream = fs.createReadStream(filePath);

form.append('replayFile', fileStream, path.basename(filePath));
form.append('skin', 'blueberry_v1_7_0')
form.append('username', 'Holly')
form.append('resolution', '1280x720')

const options = {
    method: 'POST',
    body: form,
    headers: {
    	'Content-Type': `multipart/form-data; boundary=${form._boundary}`
    }
}

spinner.start('Uploading replay...');

function timeRelative(time) {
	const now = Date.now();
	const diff = time - now;
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	
	if (minutes > 0) {
		return `in ${minutes} minutes, ${seconds % 60} seconds`;
	} else if (seconds > 0) {
		return `in ${seconds} seconds`;
	} else {
		return 'in less than a second';
	}
}

const res = fetch('https://ordr-api.issou.best/renders', options)
.then(async res => {
	if(res.status === 429) {
		spinner.fail(`Replay has been uploaded recently. Please wait ${timeRelative(Number(res.headers.get("X-RateLimit-Reset")) * 1000)} before trying again.`);
		process.exit(1);
	}

	const resp = await res.json();
	if(res.status !== 201) {
		spinner.fail(`Error: ${resp.message} (${res.status})`);
		process.exit(1);
	}
	spinner.success('Replay uploaded! Render will start in a few seconds.')

	const socket = io('https://ordr-ws.issou.best');
	spinner.start('Waiting for ordr...');
	socket.on('render_progress_json', renderInfo => {
		if(renderInfo.renderID === resp.renderID) {
			if(renderInfo.progress.includes('Finalizing')) {
				spinner.text = 'Video is being uploaded...';
				return
			}
			spinner.text = `${renderInfo.progress}`;
		}
	});

	socket.on('render_done_json', renderInfo => {
		if(renderInfo.renderID === resp.renderID) {
			socket.disconnect();
			spinner.success(renderInfo.videoUrl)
		}
	});
});
