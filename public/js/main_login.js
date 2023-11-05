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
		await load_script('js/socket.js');

		const user_data = jwt_decode(response.token);

		if (user_data.userProfile === 1) document.getElementById('menu-weights').click();
		else document.getElementById('menu-analytics').click();
		
		/*
		if('serviceWorker' in navigator) {
			// Register the service worker
			const reg = await navigator.serviceWorker.register('service_worker.js?v=0.80', {
				scope: '/'
			});

			console.log(reg)
			console.log("Service worker has been registered for scope: " + reg.scope);

		}
		*/

	} catch(error) { console.log(error) }
})();