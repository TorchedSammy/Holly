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
	if (res.status !== 201) {
		console.log(`Error: ${res.status}`);
		process.exit(1);
	}
	const resp = await res.json();

	const socket = io('https://ordr-ws.issou.best');
	socket.on('render_progress_json', renderinfo => {
		if(renderinfo.renderID === resp.renderID) {
			console.log(renderinfo.progress)
		}
	});

	socket.on('render_done_json', renderInfo => {
		if(renderInfo.renderID === resp.renderID) {
			socket.disconnect();
			console.log(renderInfo.videoUrl)
		}
	});
});
