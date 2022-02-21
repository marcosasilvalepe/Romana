/********** ERROR HANDLER STUFF **********/
async function error_handler(custom_msg, msg) {
	console.error(msg);
	if (typeof msg === 'object') {
		if (msg === null) msg = 'msg is null';
		else if (msg.sqlMessage !== undefined) msg = msg.sqlMessage;
		else msg = msg.toString();
	}

	const
	menu_icon = document.getElementById('menu-errors'),
	error_div = document.getElementById('error-section'),
	container = document.getElementById('error-container'),
	error_container = document.createElement('div'),
	now = new Date().toLocaleString('es-CL').split(' ')[1],
	time = document.createElement('h4'),
	custom_div = document.createElement('div'),
	custom_p = document.createElement('p'),
	msg_div = document.createElement('div'),
	msg_p = document.createElement('p');

	error_container.className = 'error-container';
	error_container.append(time, custom_div, msg_div);

	time.innerText = now;

	custom_div.className = 'error-custom-msg';
	custom_div.appendChild(custom_p);
	custom_p.innerText = custom_msg;

	msg_div.className = 'error-msg';
	msg_div.appendChild(msg_p);
	msg_p.innerText = msg;

	container.appendChild(error_container);
	error_div.classList.add('active');
	menu_icon.classList.add('new-error');
}

/*** LOAD JS SCRIPT ***/
const get_file_version = src => {
	return new Promise(async (resolve, reject) => {
		try {

			const
			get_latest_file_version = await fetch('/get_file_version', {
				method: 'POST',
				headers: {
					"Content-Type" : "application/json",
					"Authorization" : token.value
				},
				body: JSON.stringify({ file: src })
			}),
			response = await get_latest_file_version.json();

			if (response.error !== undefined) throw response.error;
			if (!response.success) throw 'Success response from server is false.';

			return resolve(response.version);

		} catch(error) { error_handler('Error al obtener version de archivo a cargar.', error); return reject(); }
	})
}

const load_script = src => {
	return new Promise(async resolve => {

		const version = await get_file_version(src);
		if (!!document.querySelector(`script[src="${src}?v=${version}"]`)) return resolve();

		const weight_script = document.createElement('script');
		weight_script.setAttribute('defer', '');
		weight_script.setAttribute('type', 'text/javascript');
		weight_script.onload = () => { return resolve() }
		weight_script.src = src + '?v=' + version;
		document.body.appendChild(weight_script);
	})
}

const token = {};
(async function() {
    try {

		const
		get_new_token = await fetch('/refresh_token', {
			method: 'GET', headers: { "Cache-Control" : "no-cache" }
		}),
		response = await get_new_token.json();

        if (!response.success || response.no_token !== undefined || response.error !== undefined) {
            window.location = '/';
            return;
        }

		token.value = response.token;
        token.expiration = jwt_decode(token.value).exp;

        await load_script('js/main.js');

		const user_data = jwt_decode(response.token);
		if (user_data.userProfile === 1) document.getElementById('menu-weights').click();

	} catch(error) { console.log(error) }
})();