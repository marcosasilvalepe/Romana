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