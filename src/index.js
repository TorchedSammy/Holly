const fs = require('fs');
const path = require('path');
const io = require('socket.io-client');
const fetch = require('node-fetch-commonjs');
const FormData = require('form-data');
const form = new FormData();

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

const res = fetch('https://ordr-api.issou.best/renders', { ...options })

.then(async res => {
	if(res.status !== 201) {
		console.log(`Error: ${res.status}`);
		process.exit(1);
	}
	const resp = await res.json();
	console.log('Replay uploaded! Render will start in a few seconds.')

	const socket = io('https://ordr-ws.issou.best');
	socket.on('render_progress_json', renderInfo => {
		if(renderInfo.renderID === resp.renderID) {
			if(renderInfo.progress.includes('Rendering')) {
				process.stdout.write('\r' + renderInfo.progress)
			}
			if(renderInfo.progress.includes('Finalizing')) {
				process.stdout.write('\rVideo is being uploaded...\r')
			}
		}
	});

	socket.on('render_done_json', renderInfo => {
		if(renderInfo.renderID === resp.renderID) {
			socket.disconnect();
			console.log(renderInfo.videoUrl)
		}
	});
});
