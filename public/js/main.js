"use strict";

const screen_width = window.screen.width;

async function valid_session() {

	const 
	now = Math.floor(new Date().getTime() / 1000),
	expiration = token.expiration;
	
	//CHECK IF TOKES HAS EXPIRED
	if (expiration - now > 0) return;

	//REFRESH TOKEN
	try {

		const 
		refresh_token = await fetch('/refresh_token', {
			method: 'GET', 
			headers: { "Cache-Control" : "no-cache" } 
		}),
		response = await refresh_token.json();

		if (!response.success || response.no_token !== undefined || response.error !== undefined) throw 'No refresh token';

		token.value = response.token;
		token.expiration = jwt_decode(token.value).exp;

	} catch(error) { window.location = '/' }
}

setInterval(valid_session, 60000); //CHECK VALID SESSION EVERY MINUTE

//TO PREVENT DOUBLE CLICK
let clicked = false; 
function prevent_double_click() {
	clicked = true;
	setTimeout(() => { clicked = false }, 200);
}

function btn_double_clicked(btn) {
	if (btn.classList.contains('clicked')) return true;
	
	btn.classList.add('clicked');
	setTimeout(() => {
		btn.classList.remove('clicked');
	}, 200);
	return false;
}

const remove_loader = () => {
	return new Promise(async resolve => {
		
		if (!!document.querySelector('#loader') === false) return resolve();

		if (document.getElementById('loader').classList.contains('loading')) {
			document.getElementById('loader').classList.remove('loading');
			await delay(500);
			document.getElementById('loader').remove();
		}
		return resolve();
	})
}

Array.prototype.sortBy = function(p) {
    return this.slice(0).sort(function(a,b) {
        return (a[p] < b[p]) ? 1 : (a[p] > b[p]) ? -1 : 0;
    });
}

function validate_date(date) {
	try {
		new Date(date).toISOString();
		return true
	} catch(e) { return false }
}

const main_content = document.getElementById('main__content');
let animating = false;

function main_content_animation() {
	
	if (!animating) {
		main_content.classList.remove('hidden');
		main_content.classList.add('fadeout-scaled-down');
		main_content.addEventListener('animationend', () => {
			main_content.classList.remove('fadeout-scaled-down');
		}, { once: true })		
		return;
	}

	main_content.classList.add('fadeout-scaled-up');
	main_content.addEventListener('animationend', () => {
		main_content.classList.add('hidden');
		main_content.classList.remove('fadeout-scaled-up');
		animating = false;	
	}, { once: true });
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

/************************ MAIN MENU FUNCTIONS ************************/

/*** NAVIGATE USING ARROW KEYS ***/
const escape_key_pressed = () => {

	if (!!document.querySelector('#create-weight-step-2')) {

		//EXIT CYCLE CHANGE
		if (!!document.querySelector('#create-weight__change-cycle-type-container')) 
			document.getElementById('create-weight__change-cycle__close-modal').click();

		//EXIT PROCESS CHANGE
		else if (!!document.querySelector('#create-weight__change-process-type-container')) 
			document.getElementById('create-weight__change-process__close-modal').click();

		//EXIT TARA CHANGE
		else if (!!document.querySelector('#create-weight__change-tara-type-container')) 
			document.getElementById('create-weight__change-tara__close-modal').click();

		//EXIT CHANGE DRIVER
		else if (!!document.querySelector('#create-weight__change-driver-container')) 
			document.getElementById('create-weight__change-driver__close-modal').click();

		//EXIT DOCUMENT
		else if (!!document.querySelector('#create-document__details-container')) 
			document.getElementById('create-document__footer__back-btn').click();

		//EXIT KILOS BREAKDOWN
		else if (!!document.querySelector('#kilos-breakdown-container')) 
			document.getElementById('close-kilos-breakdown-container').click();

		//EXIT TARE CONTAINERS
		else if (!!document.querySelector('#weight__tare-containers__add-container')) 
			document.getElementById('weight__tare-containers__close').click();

		else document.querySelector('#weight__breadcrumb li:first-child').click();

	}

	else if (document.querySelector('#create-weight-step-1').classList.contains('active')) {

		if (!!document.querySelector('#create-weight__modal > .create-vehicle-container'))
			document.querySelector('#create-weight__modal > .create-vehicle-container .create-weight__create-vehicle__back-to-create-weight').click();

		else
			document.querySelector('#weight__breadcrumb li:first-child').click();
	}
}

const keys_pressed = {}
document.addEventListener('keydown', ev => {

	if (ev.target.hasAttribute('data-navigation') || ev.target.tagName === 'INPUT') {

		onkeydown = onkeyup = (e) => {
			e = e || event;
			keys_pressed[e.code] = e.type == 'keydown';

			if (e.type === 'keydown') {

				if (keys_pressed.Tab) {
					if (e.shiftKey) {
						if (e.target.hasAttribute('data-prev-tab-selector')) {
							e.preventDefault();
							const previous_div = e.target.getAttribute('data-prev-tab-selector');
							document.querySelector(previous_div).focus();
						}					
					}
					else {
						if (e.target.hasAttribute('data-next-tab-selector')) {
							e.preventDefault();
							const next_el = e.target.getAttribute('data-next-tab-selector');
							document.querySelector(next_el).focus();
						}
					}
					return;
				}
				else if (keys_pressed.Escape) escape_key_pressed();
			}
		}
	}

	else if (ev.code === 'Escape') escape_key_pressed();

});

document.getElementById('close-error-div').addEventListener('click', async () => {

	const
	error_section = document.getElementById('error-section'),
	left_menu_icon = document.getElementById('menu-errors');

	error_section.classList.remove('active');
	await delay(700);
	error_section.removeAttribute('style');
	left_menu_icon.classList.remove('new-error');
	if (!!document.querySelector('#error-section .error-container:not(.hidden)'))
		document.querySelector('#error-section .error-container:not(.hidden)').classList.add('hidden');
})

//DRAG DIV STUFF
let dragObj = null; //object to be moved
let xOffset = 0; //used to prevent dragged object jumping to mouse location
let yOffset = 0;

if (screen_width > 768) {
	window.onload = function() {
		document.getElementById("error-section").addEventListener("mousedown", startDrag, true);
		document.getElementById("error-section").addEventListener("touchstart", startDrag, true);
		document.onmouseup = stopDrag;
		document.ontouchend = stopDrag;	
	}	
}

function startDrag(e) {

	//sets offset parameters and starts listening for mouse-move
	e.preventDefault();
	e.stopPropagation();
	dragObj = document.getElementById('error-section');
	//dragObj.style.position = "absolute";
	const rect = dragObj.getBoundingClientRect();
	
	if (e.type==="mousedown") {
		xOffset = e.clientX - rect.left - (dragObj.offsetWidth / 2); //clientX and getBoundingClientRect() both use viewable area adjusted when scrolling aka 'viewport'
		yOffset = e.clientY - rect.top - (dragObj.offsetHeight / 2);
		window.addEventListener('mousemove', dragObject, true);
	}
	else if (e.type==="touchstart") {
		xOffset = e.targetTouches[0].clientX - rect.left; //clientX and getBoundingClientRect() both use viewable area adjusted when scrolling aka 'viewport'
		yOffset = e.targetTouches[0].clientY - rect.top;
		window.addEventListener('touchmove', dragObject, true);
	}
}

function dragObject(e) {
	//Drag object
	//e.preventDefault();
	//e.stopPropagation();
	console.log(e)
	if (dragObj == null) return; // if there is no object being dragged then do nothing
	else if (e.type==="mousemove") {
		dragObj.style.left = e.clientX - xOffset + "px"; // adjust location of dragged object so doesn't jump to mouse position
		dragObj.style.top = e.clientY - yOffset + "px";
	}
	else if (e.type==="touchmove") {
		dragObj.style.left = e.targetTouches[0].clientX - xOffset + "px"; // adjust location of dragged object so doesn't jump to mouse position
		dragObj.style.top = e.targetTouches[0].clientY - yOffset + "px";
	}
}

function stopDrag(e) {	
	//End dragging
	if (dragObj) {
		dragObj = null;
		window.removeEventListener('mousemove', dragObject, true);
		window.removeEventListener('touchmove', dragObject, true);
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
function delay(delayValue) { return new Promise(resolve => setTimeout(resolve, delayValue)); }

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
	if (el.classList.contains('has-content') && el.textLength === 0) el.classList.toggle('has-content');
	else if (!el.classList.contains('has-content') && el.textLength > 0) el.classList.toggle('has-content');
}

/********************* CREATING OR EDITING VEHICLES *******************/
const create_vehicle_finalize = async function() {

	const btn = this;
	if (btn_double_clicked(btn)) return;
	if (!btn.classList.contains('enabled')) return;

	const 
	transport_select = document.querySelector('.content-container.active .create-vehicle__transport-select'),
	driver_tr = document.querySelector('.content-container.active .create-weight__change-driver tbody tr.selected'),
	data = {
		primary_plates: document.querySelector('.content-container.active .create-vehicle__primary-plates').value,
		secondary_plates: document.querySelector('.content-container.active .create-vehicle__secondary-plates').value,
		transport_id: transport_select.options[transport_select.selectedIndex].value,
		driver_id: (driver_tr === null) ? null : driver_tr.getAttribute('data-driver-id')
	}

	try {

		if (data.primary_plates.length < 6) throw 'Patente de vehículo necesita al menos 6 caracteres';

		//SANITIZE OBJECT
		for (let key in data) { data[key] = DOMPurify().sanitize(data[key]) }
		data.internal = (document.querySelector('.content-container.active .create-vehicle__internal-cbx').checked) ? true : false;
		data.status = (document.querySelector('.content-container.active .create-vehicle__active-cbx').checked) ? true : false;

		const 
		create_vehicle = await fetch('/create_vehicle', {
			method: 'POST',
			headers: {
				"Content-Type" : "application/json",
				"Authorization" : token.value
			},
			body: JSON.stringify(data)
		}),
		response = await create_vehicle.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		console.log(response)

		//CREATE VEHICLE IN WEIGHT MODULE
		if (document.querySelector('#main__content > .content-container.active').id === 'weight') {

			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td class="primary-plates">${DOMPurify().sanitize(response.created.primary_plates)}</td>
				<td class="secondary-plates"></td>
				<td class="driver">${DOMPurify().sanitize(response.created.driver)}</td>
				<td class="phone"></td>
				<td class="internal">
					<div>
						<i></i>
					</div>
				</td>
				<td class="status">
					<div>
						<i></i>
					</div>
				</td>
			`;

			tr.querySelector('.secondary-plates').innerText = (response.created.secondary_plates === null) ? '-' : response.created.secondary_plates;
			tr.querySelector('.phone').innerText = (response.created.phone === null) ? '-' : response.created.phone;

			tr.querySelector('.internal i').className = (response.created.status === 0) ? 'far fa-times' : 'far fa-check';
			tr.querySelector('.status i').className = (response.created.internal === 0) ? 'far fa-times' : 'far fa-check';

			document.querySelector('#create-weight__select-vehicle-table tbody').prepend(tr);
			document.querySelector('.content-container.active .create-weight__create-vehicle__back-to-create-weight').click();

			await delay(500);
			document.querySelector('#create-weight__select-vehicle-table tbody tr:first-child').click();
			return;
		}
		
		//CREATE VEHICLE IN VEHICLES MODULE
		const tr = document.createElement('div');
		tr.className = 'tr';
		tr.setAttribute('data-primary-plates', response.created.primary_plates)
		tr.innerHTML = `
			<div class="td edit">
				<div>
					<i class="fas fa-pen-square"></i>
				</div>
			</div>
			<div class="td status">
				<div><i></i></div>
			</div>
			<div class="td internal">
				<div><i></i></div>
			</div>
			<div class="td primary-plates">${DOMPurify().sanitize(response.created.primary_plates)}</div>
			<div class="td secondary-plates"></div>
			<div class="td driver">${DOMPurify().sanitize(response.created.driver)}</div>
			<div class="td transport"></div>
		`;

		tr.querySelector('.status i').className = (response.created.internal === 0) ? 'far fa-times' : 'far fa-check';
		tr.querySelector('.internal i').className = (response.created.status === 0) ? 'far fa-times' : 'far fa-check';

		tr.querySelector('.secondary-plates').innerText = (response.created.secondary_plates === null) ? '-' : response.created.secondary_plates;
		tr.querySelector('.transport').innerText = (data.transport_id === 'none') ? '' : transport_select.options[transport_select.selectedIndex].innerText;

		document.querySelector('#vehicles-table .tbody').prepend(tr);
		document.querySelector('.content-container.active .create-weight__create-vehicle__back-to-create-weight').click();

	} catch(error) {error_handler('Error al intentar crear vehículo', error) }
}

/********************* CREATING OR EDITING VEHICLES *******************/
const edit_vehicle_finalize = async function() {

	if (clicked) return;
	prevent_double_click();

	const 
	modal = document.getElementById('vehicles__vehicle-template'),
	transport_select = modal.querySelector('.create-vehicle__transport-select'),
	data = {
		primary_plates: modal.querySelector('.create-vehicle__primary-plates').value.replace(/[^a-zA-Z0-9]/gm, '').toUpperCase(),
		secondary_plates: modal.querySelector('.create-vehicle__secondary-plates').value.replace(/[^a-zA-Z0-9]/gm, '').toUpperCase(),
		transport_id: transport_select.options[transport_select.selectedIndex].value,
		internal: (modal.querySelector('.create-vehicle__internal-cbx').checked) ? '1' : '0',
		active: (modal.querySelector('.create-vehicle__active-cbx').checked) ? '1' : '0',
		driver_id: (!!modal.querySelector('.create-weight__change-driver tr.selected')) ? modal.querySelector('.create-weight__change-driver tr.selected').getAttribute('data-driver-id') : null
	}

	//SANITIZE OBJECT
	for (let key in data) { data[key] = DOMPurify().sanitize(data[key]) }

	try {

		const
		save_vehicle_data = await fetch('/save_vehicle_data', {
			method: 'POST',
			headers: {
				"Content-Type" : "application/json",
				"Authorization" : token.value
			},
			body: JSON.stringify(data)
		}),
		response = await save_vehicle_data.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		const 
		tr = document.querySelector(`#vehicles-table .tbody .tr[data-primary-plates=${data.primary_plates}]`),
		status_class = (data.active === '0') ? 'far fa-times' : 'far fa-check',
		internal_class = (data.internal === '0') ? 'far fa-times' : 'far fa-check',
		secondary_plates = (data.secondary_plates.length === 0) ? '-' : data.secondary_plates,
		transport = (data.transport_id === 'none') ? '-' : transport_select.querySelector(`option:nth-child(${transport_select.selectedIndex + 1})`).innerText,
		driver_name = (!!modal.querySelector('.content-container.active .create-weight__change-driver tr.selected')) ? modal.querySelector('.content-container.active .create-weight__change-driver tr.selected .driver').innerText : '-';

		console.log(transport)

		tr.querySelector('.status i').className = status_class;
		tr.querySelector('.internal i').className = internal_class;
		tr.querySelector('.secondary-plates').innerText = secondary_plates;
		tr.querySelector('.driver').innerText = driver_name;
		tr.querySelector('.transport').innerText = transport;

		document.querySelector('.content-container.active .create-weight__create-vehicle__back-to-create-weight').click();
	} catch(error) { error_handler('Error al intentar guardar datos de vehiculo.', error) }
}

/********************* CREATING OR EDITING VEHICLES *******************/
const create_vehicle_choose_driver = async () => {

	if (clicked) return;
	prevent_double_click();

	const
	modal = document.querySelector('.content-container.active .create-vehicle__vehicle-data'),
	plates = DOMPurify().sanitize(modal.querySelector('.create-vehicle__primary-plates').value.replace(/[^a-zA-Z0-9]/gm, '').toUpperCase()),
	tooltip = modal.querySelector('.create-vehicle__vehicle-data .create-vehicle-data .widget-tooltip');

	if (plates.length < 6) {	
		tooltip.firstElementChild.innerText = 'Patente del vehículo requiere mínimo 6 caracteres.';
		fade_in(tooltip);
		tooltip.classList.remove('hidden');
		return;
	}

	let default_driver = null
	try {

		//CREATING DRIVER IN WEIGHT
		if (document.getElementById('weight').classList.contains('active')) {
			
			const 
			check_plates = await fetch('/check_existing_plates', {
				method: 'POST',
				headers: {
					"Content-Type" : "application/json",
					"Authorization" : token.value
				},
				body: JSON.stringify({ plates })
			}),
			response = await check_plates.json();

			if (response.error !== undefined) throw response.error;
			if (!response.success) throw 'Success response from server is false.';

		}
		
		//EDITING EXISITING VEHICHE
		else {

			const
			get_default_driver = await fetch('/get_vehicle_default_driver', {
				method: 'POST',
				headers: {
					"Content-Type" : "application/json",
					"Authorization" : token.value
				},
				body: JSON.stringify({ plates })
			}),
			response = await get_default_driver.json();

			if (response.error !== undefined) throw response.error;
			if (!response.success) throw 'Success response from server is false.';

			default_driver = response.driver;

		}

		//TEMPLATE ALREADY EXISTS SO NO NEED TO FETCH IT AGAIN
		if (!!document.querySelector('.content-container.active .create-weight__change-driver-container')) {

			const drivers_table = document.querySelector('.content-container.active .create-weight__change-driver-container');
			if (drivers_table.hasAttribute('data-default-driver')) {

				if (!!drivers_table.querySelector('.tbl-content tbody tr.selected')) drivers_table.querySelector('.tbl-content tbody tr.selected').classList.remove('selected');

				default_driver = JSON.parse(drivers_table.getAttribute('data-default-driver')); 
				if (!!document.querySelector(`.content-container.active .create-weight__change-driver-container tr[data-driver-id="${default_driver.id}"]`) === false) {
					
					const tr = document.createElement('tr');
					tr.className = 'selected';
					tr.setAttribute('data-driver-id', default_driver.id);
					tr.innerHTML = `
						<td class="driver">${DOMPurify().sanitize(default_driver.name)}</td>
						<td class="rut">${DOMPurify().sanitize(default_driver.rut)}</td>
						<td class="phone"></td>
						<td class="internal">
							<div>
								<i class=""></i>
							</div>
						</td>
						<td class="status">
							<div>
								<i class=""></i>
							</div>
						</td>
					`;

					const 
					phone = (default_driver.phone === null) ? '' : default_driver.phone,
					internal_class = (default_driver.internal === 0) ? 'far fa-times' : 'far fa-check',
					status_class = (default_driver.active === 0) ? 'far fa-times' : 'far fa-check';

					tr.querySelector('.phone').innerText = phone;
					tr.querySelector('.internal i').className = internal_class;
					tr.querySelector('.status i').className = status_class;

					drivers_table.querySelector('.tbl-content tbody').prepend(tr);
				}
				else drivers_table.querySelector(`.tbl-content tbody tr[data-driver-id="${default_driver.id}"]`).classList.add('selected');
			}

			document.querySelector('.content-container.active .create-vehicle-container').classList.remove('active');
			return;
		}

		const 
		driver_template = await (await fetch('./templates/template-change-driver.html')).text(),
		driver_div = document.createElement('div');
		
		driver_div.innerHTML = driver_template;
		driver_div.querySelector('.change-driver__type-btns').lastElementChild.remove();

		modal.parentElement.parentElement.appendChild(driver_div);
		driver_div.querySelector('.create-weight__change-driver__set-driver').classList.add('enabled');

		const
		driver_type = 'internal',
		get_drivers = await fetch('/get_drivers', { 
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json",
				"Authorization" : token.value 
			}, 
			body: JSON.stringify({ driver_type }) 
		}),
		drivers_response = await get_drivers.json();

		if (drivers_response.error !== undefined) throw drivers_response.error;
		if (!drivers_response.success) throw 'Success response from server is false.';

		console.log(drivers_response)
		if (default_driver !== null) {

			document.querySelector('.content-container.active .create-weight__change-driver-container').setAttribute('data-default-driver', JSON.stringify(default_driver));
			
			let default_driver_in_response = false;
			for (let i = 0; i < drivers_response.drivers.length; i++) {
				if (drivers_response.drivers[i].id === default_driver.id) {
					default_driver_in_response = true;
					break;
				}
			}

			if (!default_driver_in_response) drivers_response.drivers.unshift(default_driver);	
		}

		driver_div.querySelector('.create-weight__change-driver tbody').addEventListener('click', change_driver_select_tr);
		driver_div.querySelector('.create-weight__change-driver__close-modal').addEventListener('click', e => {
			driver_div.previousElementSibling.classList.add('active');
		});
		driver_div.querySelector('.create-weight__change-driver__search-driver input').addEventListener('input', select_driver_search_driver);
		
		//INSIDE WEIGHT MODULE
		if (document.getElementById('weight').classList.contains('active')) {
			driver_div.querySelector('.create-weight__change-driver__create-driver-btn').addEventListener('click', select_driver_create_driver_btn);
			driver_div.querySelector('.create-weight__change-driver__set-driver').addEventListener('click', create_vehicle_finalize);
		}

		//INSIDE VEHICLES MODULE
		else {

			driver_div.querySelector('.create-weight__change-driver__create-driver-btn').remove();
			driver_div.querySelector('.create-document-btns-container').classList.add('edit-vehicle');

			//CHANGE EVENT LISTENER FOR FINALIZE BTN -> CREATE OR EDIT IF IT HAS ATTRIBUTE
			if (document.getElementById('vehicles__vehicle-template').hasAttribute('data-create-vehicle'))
				driver_div.querySelector('.create-weight__change-driver__set-driver').addEventListener('click', create_vehicle_finalize);
			
			//DOES'T HAVE ATTRIBUTE SO FINALIZE EDITING VEHICLE
			else
				driver_div.querySelector('.create-weight__change-driver__set-driver').addEventListener('click', edit_vehicle_finalize);
		}
		
		//CREATE DRIVER BTNS
		document.querySelector('#create-weight__change-driver__back-to-select-driver').addEventListener('click', select_driver_create_driver_back_btn);
		document.querySelector('#create-weight__change-driver__create-driver').addEventListener('click', select_driver_create_driver);
		
		driver_div.querySelector('#create-weight__create-driver-rut').addEventListener('input', select_driver_create_driver_rut_input);
		driver_div.querySelector('#create-weight__create-driver-rut').addEventListener('keydown', select_driver_create_driver_rut_keydown);
		
		driver_div.querySelectorAll('.create-weight__change-driver__create .input-effect').forEach(input => {
			input.addEventListener('input', custom_input_change);
		});

		document.getElementById('create-driver__active-cbx').checked = true;

		driver_div.querySelectorAll('.change-driver__type-btns > div:not(.default-driver)').forEach(driver_type => {
			driver_type.addEventListener('click', list_drivers_by_type);
		});
		
		const drivers = drivers_response.drivers;
		await change_driver_create_tr(drivers);

		if (default_driver !== null) 
			document.querySelector(`.content-container.active .create-weight__change-driver-container tbody tr[data-driver-id="${default_driver.id}"]`).classList.add('selected');

		await delay(10)

		modal.parentElement.classList.remove('active');

	} catch(error) { error_handler('Error en patente del vehículo.', error) }
}

/*********** LEFT MENU HAMBURGUER ***********/
document.getElementById('left-menu__icon').addEventListener('click', () => {

	if (clicked) return;
	prevent_double_click();

	document.getElementById('left__menu').classList.toggle('active');
});

/*********** WEIGHTS ***********/
document.getElementById('menu-weights').addEventListener('click', async function() {

	const btn = this;
	if (btn_double_clicked(btn) || animating) return;
	
	const active_container = document.querySelector('#main__content > .active')
	
	//CREATE WEIGHT IS OPEN SO IT CLOSES IT

	if (!!active_container && active_container.id === 'weight') {

		if (!!document.querySelector('#create-weight-step-2')) 
		document.querySelector('#create-weight-step-2 > .close-btn-absolute').click();
	
		//CREATE WEIGHT FIRST STEP IS OPEN SO IT CLOSES IT
		else if (document.querySelector('#create-weight-step-1').classList.contains('active')) 
			document.querySelector('#weight__breadcrumb li:first-child').click();

		//FINISHED WEIGHT WINDOW IS OPEN SO IT CLOSES IT
		else if (document.getElementById('finished-weight__containers').classList.contains('active'))
			document.querySelector('#weight__breadcrumb li:first-child').click();

	}
	
	//ACTIVE CONTAINER IS NOT WEIGHT
	if (!!active_container && active_container.id !== 'weight') {
		animating = true;
		main_content_animation();
	}

	try {

		const 
		session_token = token.value,
		get_pending_weights = await fetch('/list_pending_weights', {
			method: 'GET', 
			headers: { 
				"Cache-Control" : "no-cache", 
				"Authorization" : session_token 
			}
		}),
		response = await get_pending_weights.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		await load_css('css/weights.css');
		await load_script('js/weight.js');

		remove_loader();

		//WAIT FOR DATA FROM SERVER
		if (!!active_container && active_container.id !== 'weight') { 
			while (animating) { await delay(10) }
			active_container.classList.remove('active');
			document.querySelector('.menu-item.active').classList.remove('active');
		}

		document.querySelectorAll('#pending-weights-table tbody tr').forEach(tr => { tr.remove() });

		create_pending_weights_tr(response.pending_weights);

		document.getElementById('menu-weights').classList.add('active');
		document.getElementById('weight').classList.add('active');

		if (!!active_container && active_container.id !== 'weight') main_content_animation();

	} catch(error) { error_handler('Error al obtener pesajes pendientes.', error); animating = false }
});

/*********** ANALYTICS ***********/
document.getElementById('menu-analytics').addEventListener('click', async function() {

	const btn = this;
	if (btn_double_clicked(btn) || animating) return;

	const active_container = document.querySelector('#main__content > .active');
	if (!!active_container) {
		animating = true;		
		main_content_animation();
	}

	try {

		//FETCH TEMPLATE IF IT HASN'T DOEN IT YET
        if (!!document.querySelector('#analytics__entities-table') === false) {

            const template = await (await fetch('/templates/template-analytics.html')).text();
            document.querySelector('#analytics').innerHTML = template;

			await load_css('css/analytics.css');
			await load_script('js/analytics.js');
        }

		if (!!active_container) {
			
			while (animating) { await delay(10) }

			document.querySelector('.menu-item.active').classList.remove('active');
			active_container.classList.remove('active');
			
			document.getElementById('menu-analytics').classList.add('active');
			document.getElementById('analytics').classList.add('active');

			main_content_animation();

		}
	} catch(error) { error_handler('Error al intentar cargar reportes.', error); animating = false }
});

/*********** CLIENTS ***********/
document.getElementById('menu-clients').addEventListener('click', async function() {

	const btn = this;
	if (btn_double_clicked(btn) || animating) return;
	
	const active_container = document.querySelector('#main__content > .active');
	animating = true;
	main_content_animation();

	try {

		if (!!document.querySelector('#clients__table-grid') === false) {
			const template = await (await fetch('/templates/template-client-main.html')).text();

			while (animating) { await delay(10) }

			document.querySelector('#clients > .content').innerHTML = template;
	
			await load_css('css/clients.css');
			await load_script('js/clients.js');	
		}

		while (animating) { await delay(10) }

		document.querySelectorAll('#clients__table-grid .tbody .tr').forEach(tr => { tr.remove() });
		await clients_get_entities();

		document.querySelector('.menu-item.active').classList.remove('active');
		btn.classList.add('active');

		active_container.classList.remove('active');
		document.querySelector('#clients').classList.add('active');

		main_content_animation();

	} catch(error) { error_handler('Error al intentar abrir clientes/proveedores.', error); animating = false }
});

/*********** PRODUCTS ***********/
document.getElementById('menu-products').addEventListener('click', async function() {

	const btn = this;
	if (btn_double_clicked(btn) || animating) return;
	
	const active_container = document.querySelector('#main__content > .active');
	animating = true;
	main_content_animation();

	try {

		if (!!document.querySelector('#products__table-grid') === false) {

			const template = await (await fetch('/templates/template-products.html')).text();
			document.querySelector('#products > .content').innerHTML = template;

			await load_css('css/products.css');
			await load_script('js/products.js');

		}

		while (animating) { await delay(10) }

		document.querySelectorAll('#products__table .tbody .tr').forEach(tr => { tr.remove() });
		await get_all_products();

		document.querySelector('.menu-item.active').classList.remove('active');
		btn.classList.add('active');

		active_container.classList.remove('active');
		document.querySelector('#products').classList.add('active');

		main_content_animation();

	} catch(error) { error_handler('Error al intentar abrir productos', error); animating = false }
});

/*********** PRODUCTS ***********/
document.getElementById('menu-vehicles').addEventListener('click', async function() {

	const btn = this;
	if (btn_double_clicked(btn) || animating) return;

	const active_container = document.querySelector('#main__content > .active');
	animating = true;
	main_content_animation();

	try {

		if (!!document.querySelector('#vehicles__table-grid') === false) {
			
			const template = await (await fetch('/templates/template-vehicles.html')).text();
			document.querySelector('#vehicles > .content').innerHTML = template;
			
			await load_css('css/vehicles.css');
			await load_script('js/vehicles.js');

		}

		while (animating) { await delay(10) }

		document.querySelectorAll('#vehicles-table .tbody .tr').forEach(tr => { tr.remove() });
		await vehicles_list_vehicles(true, true);

		document.querySelector('.menu-item.active').classList.remove('active');
		active_container.classList.remove('active');

		btn.classList.add('active');
		document.getElementById('vehicles').classList.add('active');

		main_content_animation();

	} catch(error) { error_handler('Error al intentar abrir vehiculos.', error); animating = false }
});

const tachapa = () => {
	const 
	vowels = ['a', 'e', 'i', 'o', 'u'],
	first_vowel = Math.floor(Math.random() * (4- 0 + 1) + 0),
	second_vowel = Math.floor(Math.random() * (4- 0 + 1) + 0),
	thirh_vowel = Math.floor(Math.random() * (4- 0 + 1) + 0);
	return 'Juan T' + vowels[first_vowel] + 'ch' + vowels[second_vowel] + 'p' + vowels[thirh_vowel];
}

const user_name = (jwt_decode(token.value).userName === 'Felipe') ? tachapa() : jwt_decode(token.value).userName;
document.querySelector('#user-profile-container p').innerText = user_name;