"use strict";

//TO PREVENT DOUBLE CLICK
let clicked = false;
let animating = false;

function prevent_double_click() {
	clicked = true;
	setTimeout(() => { clicked = false }, 300);
}

document.body.addEventListener('click', () => {
	if (clicked) return;
	prevent_double_click();
})

/********** ERROR HANDLER STUFF **********/
async function error_handler(custom_msg, msg) {

	document.activeElement.blur();
	
	console.log(msg);
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
function get_file_version(src) {
	return new Promise(async (resolve, reject) => {
		try {

			const
			get_latest_file_version = await fetch('/get_file_version', {
				method: 'POST',
				headers: {
					"Content-Type" : "application/json"
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

function load_script(src, type) {
	return new Promise(async resolve => {
		const version = await get_file_version(src);
		if (!!document.querySelector(`script[src="${src}?v=${version}"]`)) return resolve();

		const weight_script = document.createElement('script');
		weight_script.setAttribute('defer', '');
		weight_script.setAttribute('type', (type === undefined) ? 'text/javascript' : type);
		weight_script.onload = () => { return resolve() }
		weight_script.src = src + '?v=' + version;
		document.body.appendChild(weight_script);
	})
}

function load_css(src) {
	return new Promise(async resolve => {
		const version = await get_file_version(src);
		if (!!document.querySelector(`link[href="${src}?v=${version}"]`)) return resolve();

		const css = document.createElement('link');
		css.onload = () => { return resolve() }
		css.setAttribute('rel', 'stylesheet');
		css.setAttribute('href', src + '?v=' + version);
		document.head.appendChild(css);
	})
}

/*** BREADCRUMBS ***/
function breadcrumbs(process, div, breadcrumb) {
	if (process==='add') {
		const
		ul = document.getElementById(`${div}__breadcrumb`),
		li = document.createElement('li'),
		h4 = document.createElement('h4'),
		i = document.createElement('i');
		//svg_template = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -13 115 26"><path d="M 8 0 L 0 -13 L 107 -13 L 115 0 L 107 13 L 0 13 L 8 0" fill="url(#breadcrumb-gradient-1)" /></svg><p>${breadcrumb}</p>`;
		//li.innerHTML = svg_template;
		
		h4.innerText = breadcrumb;
		i.className = 'far fa-chevron-right';
		li.append(i, h4);
		ul.appendChild(li)
	} else if (process==='remove') {
		document.querySelector(`#${div}__breadcrumb > li:last-child`).remove();
	}
}

/*** VALIDATE RUT ***/
function validate_rut(rut) {
	const
	new_rut = rut.replace(/[^0-9kK]/gm, ''),
	digits = new_rut.substring(0, new_rut.length - 1),
	digits_array = digits.split(''),
	dv = new_rut.substring(new_rut.length - 1).toLowerCase();
	
	let m = 2, sum = 0;

	for (let i = digits_array.length - 1; i >= 0; i--) {
		sum += m * parseInt(digits_array[i]);
		m++;
		if (m===8) m = 2; 
	}

	let new_dv = (11 - (sum % 11));

	if (new_dv === 11) new_dv = '0';
	else if (new_dv === 10) new_dv = 'k';
	else new_dv = new_dv.toString();

	if (dv === new_dv) return true;
	return false;
}

/*** WAIT DELAY FUNCTION ***/
function delay(delayValue) { return new Promise(resolve => setTimeout(resolve, delayValue)) }

/*** NUMBER FORMATER ***/
function thousand_separator(num) { 
	return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.') 
}

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
	return new Promise(async resolve => {
		if (delay_value === undefined) delay_value=0;
		el.style.opacity = 0;
		el.style.display = display || "block";
		await delay(delay_value);
		(function fade() {
			let val = parseFloat(el.style.opacity);
			if (!((val += 0.1) > 1)) {
				el.style.opacity = val;
				requestAnimationFrame(fade)
			} else {
				el.removeAttribute("style");
				resolve();
			}
		})();
	})
}

/*** FADE ANIMATION ***/
async function fade_animation(first_div, second_div) {

	first_div.classList.add('fadeout-scaled-up');
	await delay(550);
	first_div.classList.add('hidden');

	second_div.classList.remove('hidden');
	second_div.classList.add('fadeout-scaled-down');
	await delay(300);

	first_div.classList.remove('fadeout-scaled-up');
	second_div.classList.remove('fadeout-scaled-down');

}

async function wait_for_fade_animation(div) {
	div.classList.add('fadeout-scaled-up');
	await delay(600);

	div.classList.add('hidden', 'animationend');
	div.classList.remove('fadeout-scaled-up');
}

function fade_out_animation(div) {
	return new Promise(resolve => {
		div.classList.add('fadeout-scaledDown');
		div.addEventListener('animationend', () => {
			div.classList.add('hidden', 'animationend');
			div.classList.remove('fadeout-scaledDown');
			return resolve();	
		}, { once: true })
	})
}

function fade_in_animation(div) {
	return new Promise(resolve => {
		div.classList.remove('hidden');
		div.classList.add('fadein-scaledUp');
		div.addEventListener('animationend', () => {
			div.classList.remove('fadein-scaledUp');
			return resolve();
		}, { once:true })	
	})
}

/*** INPUT EFFECT ***/ //EVENT -> INPUT
function custom_input_change() {
	const el = this;
	if (el.classList.contains('has-content') && el.value.length === 0) el.classList.toggle('has-content');
	else if (!el.classList.contains('has-content') && el.value.length > 0) el.classList.toggle('has-content');
}

function btn_double_clicked(btn) {

	if (btn.classList.contains('clicked')) return true;
	
	btn.classList.add('clicked');
	setTimeout(() => btn.classList.remove('clicked'), 200);
	return false;
}

function check_loader() {
	return new Promise(async resolve => {
		
		//REMOVE LOEADER
		if (!!document.querySelector('#loader')) {

			if (document.getElementById('loader').classList.contains('loading')) {
				document.getElementById('loader').classList.remove('loading');
				await delay(300);
				document.getElementById('loader').remove();
			}

		} 
		
		//CREATE LOADER
		else {

			const loader = document.createElement('div');
			loader.id = 'loader';
			loader.className = 'loading';
			loader.innerHTML = `
				<div id="loader-background"></div>
				<div class="wrapper">
					<div class="circle"></div>
					<div class="circle"></div>
					<div class="circle"></div>
					<div class="shadow"></div>
					<div class="shadow"></div>
					<div class="shadow"></div>
					<span>CARGANDO</span>
				</div>
			`;
			
			document.body.prepend(loader)

		}

		return resolve();
	})
}

function validate_date(date) {
	try {
		new Date(date).toISOString();
		return true
	} catch(e) { return false }
}

function sanitize(str) { return DOMPurify().sanitize(str)}

function replace_spanish_chars(str) {
    str = str
            .replace(/[á]/gm, 'a').replace(/[Á]/gm, 'A')
            .replace(/[é]/gm, 'e').replace(/[É]/gm, 'E')
            .replace(/[í]/gm, 'i').replace(/[Í]/gm, 'I')
            .replace(/[ó]/gm, 'o').replace(/[Ó]/gm, 'O')
            .replace(/[ú]/gm, 'u').replace(/[Ú]/gm, 'U')
            .replace(/[ñ]/gm, '¤').replace(/[Ñ]/gm, '¥')
    return str
}

function debounce(callback, wait) {
    let timerId;
    return (...args) => {
      clearTimeout(timerId);
      timerId = setTimeout(() => {
        callback(...args);
      }, wait);
    };
}

function text_input_to_number(e) {
	if (
        (e.target.value.length === 0 && e.target.classList.contains('has-content')) ||
        (e.target.value.length > 0 && !e.target.classList.contains('has-content'))
    ) e.target.classList.toggle('has-content');

    const doc_number = e.target.value.replace(/\D/gm, '');
    e.target.value = thousand_separator(doc_number);
}

function puppeteer_progress_circle(e) {
	const 
	input = e.target,
	circle = input.parentElement.querySelector('svg circle:last-child'),
	val = parseInt(input.value);

	if (isNaN(val)) val = 100;
	else {

		const r = circle.getAttribute('r');
		const c = Math.PI * (r * 2);
	
		if (val < 0) val = 0;
		else if (val > 100) val = 100;
	
		const pct = ((100 - val) / 100) * c;

		circle.style.strokeDashoffset = pct;
	
	}

	input.previousElementSibling.setAttribute('data-pct', val);
}