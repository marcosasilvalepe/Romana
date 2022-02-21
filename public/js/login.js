function get_cookie(name) {
	let matches = document.cookie.match(new RegExp(
	  "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
	));
	return matches ? decodeURIComponent(matches[1]) : undefined;
}

/*** WAIT DELAY FUNCTION ***/
function delay(delayValue) { return new Promise(resolve => setTimeout(resolve, delayValue)); }

/*** FADE OUT FUNCTION ***/
function fade_out(el, display) {
	return new Promise((resolve, reject) => {
		el.style.opacity = 1;
		el.style.display = display;
		if (display!==undefined) el.style.display = display;
		(function fade() {
			if ((el.style.opacity -= .1) < 0) {
				el.style.display = "none";
				el.removeAttribute("style"); 
				resolve();
			} 
			else { requestAnimationFrame(fade) }
		})();	
	})
}

/*** FADE IN FUNCTION ***/
function fade_in(el, delay_value, display) {
	return new Promise(async (resolve, reject) => {
		if (delay_value===undefined) { delay_value=0 }
		el.style.opacity = 0;
		el.style.display = display || "block";
		await delay(delay_value);
		(function fade() {
			let val = parseFloat(el.style.opacity);
			if (!((val += 0.1) > 1)) {
				el.style.opacity = val;
				requestAnimationFrame(fade)
			} else { el.removeAttribute("style") }
		})();
		resolve();
	})
}

document.getElementById('userpassword').addEventListener('keydown', e => {
	if (e.key !== 'Enter') return;
	document.querySelector('input[type="submit"').click();
})

let token;
document.querySelector('input[type="submit"').addEventListener('click', async function() {
    
	const 
	user = DOMPurify().sanitize(document.getElementById('username').value),
	password = DOMPurify().sanitize(document.getElementById('userpassword').value);

	if (user.length === 0 || password.length === 0) {
		alert('Usuario y/o contraseña vacío');
		return;
	}

	const login = document.querySelector('.login');
	login.classList.add('test');
	setTimeout(() => { login.classList.add('animationend') }, 500)

	try {
		const
		login_user = await fetch('/login_user', {
			method: 'POST', headers: { "Content-Type" : "application/json" }, body: JSON.stringify({ user, password })
		}),
		response = await login_user.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		token = response.token;

		console.log(jwt_decode(response.token))
	
		let user_name = jwt_decode(response.token).userName;
		const vowels = ['a', 'e', 'i', 'o', 'u'];

		if (user_name === 'Felipe') {
			const
			first_vowel = Math.floor(Math.random() * (4- 0 + 1) + 0),
			second_vowel = Math.floor(Math.random() * (4- 0 + 1) + 0),
			thirh_vowel = Math.floor(Math.random() * (4- 0 + 1) + 0);
			user_name = 'Juan T' + vowels[first_vowel] + 'ch' + vowels[second_vowel] + 'p' + vowels[thirh_vowel];
		}
		document.querySelector('.success p').innerHTML = `Bienvenido de vuelta<br>${user_name}`

		while (!login.classList.contains('animationend')) { await delay(10) }
		document.querySelector('.authent').classList.add('active');

		await delay(2000);
		document.querySelector('.authent').classList.remove('active');

		document.querySelector('.login').classList.remove('test');
        await fade_out(document.querySelector('.login > div:first-child'));
        document.querySelector('.login div').classList.add('hidden');

		await delay(500);
		fade_in(document.querySelector('.success'));
        document.querySelector('.success').classList.add('active');

		await delay(1000)
		window.location = '/app'

	} catch(error) { alert(`Error al intentar ingresar usuario. ${error.toString()}`); login.classList.remove('test') }
})

function focus_prev(that) { that.previousElementSibling.classList.toggle('focused') }

document.querySelectorAll('input').forEach(input => {
	input.addEventListener('keyup', e => {
		if (e.target.value.length === 0) {
			e.target.nextElementSibling.classList.remove('visible');
			return;
		}
		e.target.nextElementSibling.classList.add('visible');
	});
})

document.getElementById('username').focus();

(async function() {

	try {

		const
		get_new_token = await fetch('/refresh_token', {
			method: 'GET', 
			headers: { "Cache-Control" : "no-cache" }
		}),
		response = await get_new_token.json();

		user_name = jwt_decode(response.token).userName;
		document.querySelector('.success p').innerHTML = `Bienvenido de vuelta<br>${user_name}`

        if (response.success) {
            window.location = '/app';
            return;
        }

	} catch(error) { console.log(error) }
})();