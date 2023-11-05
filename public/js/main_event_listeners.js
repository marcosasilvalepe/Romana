"use strict";

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

document.getElementById('user-profile').addEventListener('click', function() {
	if (btn_double_clicked(this)) return;
	document.getElementById('menu-user').click();
})

document.getElementById('menu-user').addEventListener('click', () => {

	if (clicked || animating) return;
	animating = true;

	if (!!document.querySelector('#user-profile-module')) {
		document.querySelector('#user-profile__accept-btn').click();
		animating = false;
		return;
	}

	const container = document.createElement('div');
	container.className = 'hidden';
	container.id = 'user-profile-module';
	container.innerHTML = `
		<div class="content-container">
			<div class="content">
				<div id="user-profile__content" class="create-document-absolute">
					<div class="header">
						<h3>PREFERENCIAS USUARIO</h3>
					</div>
					<div class="body">
						
						<div id="user-profile__preferences-container">
							<div id="user-profile__preferences">
								<div id="user-profile__qz-tray" onclick="(this.querySelector('input').checked) ? this.querySelector('input').checked = false : this.querySelector('input').checked = true;">
									<input class="create-vehicle__active-cbx" type="checkbox" data-prev-tab-selector="#create-vehicle__internal-cbx" data-next-tab-selector="#create-weight__create-vehicle__back-to-create-weight" value="">
									<label class="cbx"></label>
									<label class="lbl">IMPRESORA A PUNTO</label>
								</div>
								<div id="user-profile__tutorial" onclick="(this.querySelector('input').checked) ? this.querySelector('input').checked = false : this.querySelector('input').checked = true;">
									<input class="create-vehicle__active-cbx" type="checkbox" data-prev-tab-selector="#create-vehicle__internal-cbx" data-next-tab-selector="#create-weight__create-vehicle__back-to-create-weight" value="">
									<label class="cbx"></label>
									<label class="lbl">TUTORIAL ACTIVO</label>
								</div>
								<div id="user-profile__session-alive" onclick="(this.querySelector('input').checked) ? this.querySelector('input').checked = false : this.querySelector('input').checked = true;">
									<input class="create-vehicle__active-cbx" type="checkbox" data-prev-tab-selector="#create-vehicle__internal-cbx" data-next-tab-selector="#create-weight__create-vehicle__back-to-create-weight" value="">
									<label class="cbx"></label>
									<label class="lbl">MANTENER SESION ACTIVA</label>
								</div>
							</div>

							<div id="user-profiles__footer-btns">
								<div id="user-profile__change-password" class="user-profile-btn">
									<div>
										<i class="far fa-user-lock"></i>
									</div>
									<div>
										<p>CAMBIAR<br>CONTRASEÑA</p>
									</div>
								</div>
								<div id="user-profile__close-session" class="user-profile-btn">
									<div>
										<i class="far fa-user-times"></i>
									</div>
									<div>
										<p>CERRAR<br>SESION</p>
									</div>
								</div>
							</div>
						</div>

						<div id="change-password-container" class="hidden">
							<h4>CAMBIAR CONTRASEÑA</h4>
							<div id="change-password-inputs">
								<div>
									<input spellcheck="false" type="password" class="input-effect" maxlength="32">
									<label>Clave Actual</label>
									<span class="focus-border"></span>
									<i class="fal fa-unlock-alt"></i>
								</div>
								<div>
									<input spellcheck="false" type="password" class="input-effect" maxlength="32">
									<label>Clave Nueva</label>
									<span class="focus-border"></span>
									<i class="fal fa-unlock-alt"></i>
									<div class="icon-container">
										<div class="not-found"><i class="fas fa-times"></i></div>
										<div class="found"><i class="fas fa-check"></i></div>
									</div> 
								</div>
								<div>
									<input spellcheck="false" type="password" class="input-effect" maxlength="32">
									<label>Confirmar Clave</label>
									<span class="focus-border"></span>
									<i class="fal fa-unlock-alt"></i>
									<div class="icon-container">
										<div class="not-found"><i class="fas fa-times"></i></div>
										<div class="found"><i class="fas fa-check"></i></div>
									</div>
								</div>
							</div>

							<div id="change-password-btns">
								<button class="svg-wrapper enabled red">
									<svg height="45" width="160" xmlns="http://www.w3.org/2000/svg">
										<rect class="shape" height="45" width="160"></rect>
									</svg>
									<div class="desc-container">
										<i class="fas fa-chevron-double-left"></i>
										<p>VOLVER</p>
									</div>
								</button>
								<button class="svg-wrapper icon-left green">
									<svg height="45" width="160" xmlns="http://www.w3.org/2000/svg">
										<rect class="shape" height="45" width="160"></rect>
									</svg>
									<div class="desc-container">
										<i class="far fa-cloud-upload"></i>
										<p>GUARDAR</p>
									</div>
								</button>
							</div>

						</div>

					</div>
					<div class="footer">
						<div class="create-document-btns-container">
							<button id="user-profile__cancel-btn" class="svg-wrapper enabled red">
								<svg height="45" width="160" xmlns="http://www.w3.org/2000/svg">
									<rect class="shape" height="45" width="160"></rect>
								</svg>
								<div class="desc-container">
									<i class="fas fa-times-circle"></i>
									<p>CANCELAR</p>
								</div>
							</button>
							<button id="user-profile__accept-btn" class="svg-wrapper enabled green">
								<svg height="45" width="160" xmlns="http://www.w3.org/2000/svg">
									<rect class="shape" height="45" width="160"></rect>
								</svg>
								<div class="desc-container">
									<i class="fas fa-check-circle"></i>
									<p>ACEPTAR</p>
								</div>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;

	if (jwt_decode(token.value).qzTray) container.querySelector('#user-profile__qz-tray input').checked = true;
	if (jwt_decode(token.value).tutorial) container.querySelector('#user-profile__tutorial input').checked = true;
	if (jwt_decode(token.value).keepSessionAlive) container.querySelector('#user-profile__session-alive input').checked = true;

	//SHOW CHANGE PASSWORD DIV
	container.querySelector('#user-profile__change-password').addEventListener('click', async () => {

		const 
		fade_out_div = document.getElementById('user-profile__preferences-container'),
		fade_in_div = document.getElementById('change-password-container');

		await fade_out_animation(fade_out_div);
		fade_out_div.classList.add('hidden');

		fade_in_animation(fade_in_div);
		fade_in_div.classList.remove('hidden');

	});

	//BACK TO USER PREFERENCES DIV
	container.querySelector('#change-password-btns button.red').addEventListener('click', async () => {

		const 
		fade_out_div = document.getElementById('change-password-container'),
		fade_in_div = document.getElementById('user-profile__preferences-container');

		await fade_out_animation(fade_out_div);
		fade_out_div.classList.add('hidden');

		fade_in_animation(fade_in_div);
		fade_in_div.classList.remove('hidden');

	});

	container.querySelectorAll('#change-password-inputs input').forEach(input => {
		input.addEventListener('input', custom_input_change);
	});

	//CURRENT PASSWORD INPUT
	container.querySelector('#change-password-inputs > div:first-child input').addEventListener('input', e => {

		if (e.target.value.length < 6) {
			document.querySelector('#change-password-btns button.green').classList.remove('enabled');
			return
		}

		const 
		new_password_icon = document.querySelector('#change-password-inputs > div:nth-child(2) .icon-container .found'),
		confirm_password_icon = document.querySelector('#change-password-inputs > div:last-child .icon-container .found');

		if (new_password_icon.classList.contains('active') && confirm_password_icon.classList.contains('active'))
			document.querySelector('#change-password-btns button.green').classList.add('enabled');

	})

	//NEW PASSWORD INPUT
	container.querySelector('#change-password-inputs > div:nth-child(2) input').addEventListener('input', e => {
		
		const 
		input = e.target,
		icon_container = input.parentElement.querySelector('.icon-container'),
		confirm_password_input = container.querySelector('#change-password-inputs > div:last-child input');

		if (input.value !== confirm_password_input.value) {
			container.querySelector('#change-password-inputs > div:last-child .icon-container .found').classList.remove('active');
			container.querySelector('#change-password-inputs > div:last-child .icon-container .not-found').classList.add('active');
			container.querySelector('#change-password-btns button.green').classList.remove('enabled');
		} else {
			container.querySelector('#change-password-inputs > div:last-child .icon-container .found').classList.add('active');
			container.querySelector('#change-password-btns button.green').classList.add('enabled');
		}

		if (input.value.length < 6) {
			icon_container.lastElementChild.classList.remove('active');
			icon_container.firstElementChild.classList.add('active');
		}
		
		else {
			icon_container.firstElementChild.classList.remove('active');
			icon_container.lastElementChild.classList.add('active');
		}
	})

	//CONFIRM PASSWORD INPUT
	container.querySelector('#change-password-inputs > div:last-child input').addEventListener('input', e => {

		const 
		new_password = container.querySelector('#change-password-inputs > div:nth-child(2) input').value,
		confirm_password = e.target.value,
		icon_container = container.querySelector('#change-password-inputs > div:last-child .icon-container');

		if (new_password !== confirm_password) {
			icon_container.firstElementChild.classList.add('active');
			icon_container.lastElementChild.classList.remove('active');
			container.querySelector('#change-password-btns button.green').classList.remove('enabled');
		}
		else {

			container.querySelector('#change-password-btns button.green').classList.add('enabled');

			if (icon_container.firstElementChild.classList.contains('active') || !icon_container.lastElementChild.classList.contains('active'))
				icon_container.lastElementChild.classList.add('active');
		}

	});

	//SAVE NEW PASSWORD BUTTON
	container.querySelector('#change-password-btns button.green').addEventListener('click', async function() {
		
		if (!this.classList.contains('enabled')) return;

		const
		current_password = sanitize(document.querySelector('#change-password-inputs > div:first-child input').value),
		new_password = sanitize(document.querySelector('#change-password-inputs > div:nth-child(2) input').value),
		confirm_password = sanitize(document.querySelector('#change-password-inputs > div:last-child input').value);

		try {

			if (new_password !== confirm_password) throw 'Contraseñas no coinciden';
			if (new_password < 6 || confirm_password < 6) throw 'La contraseña debe tener por lo menos 6 caracteres';

			const
			update_password = await fetch('/change_user_password', {
				method: 'POST',
				headers: {
					"Content-Type" : "application/json"
				},
				body: JSON.stringify({ current_password, new_password, confirm_password })
			}),
			response = await update_password.json();

			if (response.error !== undefined) throw response.error;
			if (!response.success) throw 'Success response from server is false.';

			alert('success')

		} catch(e) { error_handler('No se puede guardar nueva contraseña.', e) }
	})

	container.querySelectorAll('#change-password-inputs i').forEach(el => {
		el.addEventListener('click', function() {
			const 
			input = this.parentElement.querySelector('input'),
			new_type = (input.getAttribute('type') === "password") ? 'text' : 'password';
			input.setAttribute('type', new_type);
		})
	})

	container.querySelector('#user-profile__close-session').addEventListener('click', async () => {
		try {

			const
			close_session = await fetch('/close_user_session'),
			response = await close_session.json();

			if (response.error !== undefined) throw response.error;
			if (!response.success) throw 'Success response from server is false.';

			window.location = '/'

		} catch(e) { error_handler('No se pudo cerrar la sesión', e) }
	});

	container.querySelector('#user-profile__cancel-btn').addEventListener('click', async function() {
		if (btn_double_clicked(this)) return;
		await fade_out(container);
		container.remove();
	});

	container.querySelector('#user-profile__accept-btn').addEventListener('click', async function() {

		if (btn_double_clicked(this)) return;

		const data = {
			qz_tray: container.querySelector('#user-profile__qz-tray input').checked,
			tutorial: container.querySelector('#user-profile__tutorial input').checked,
			keep_session_alive: container.querySelector('#user-profile__session-alive input').checked
		}

		try {

			const
			save_preferences = await fetch('/save_user_preferences', {
				method: 'POST',
				headers: {
					"Content-Type" : "application/json"
				},
				body: JSON.stringify(data)
			}),
			response = await save_preferences.json();

			if (response.error !== undefined) throw response.error;
			if (!response.success) throw 'Success response from server is false.';

			token.value = response.token;
        	token.expiration = jwt_decode(token.value).exp;

			document.querySelector('#user-profile__cancel-btn').click();

		} catch(e) { error_handler('Error al guardar preferencias de usuario.', e) }
	});

	

	document.getElementById('main__content').prepend(container);
	fade_in(container);
	container.classList.remove('hidden');
	animating = false;
})

document.getElementById('serial-weight-data').addEventListener('click', function() {

	//if (this.getAttribute('data-serial-open') === 'false') return;

	const serial_data_div = document.createElement('section');
	serial_data_div.id = 'serial-weight-data__info';
	serial_data_div.className = 'hidden';
	serial_data_div.setAttribute('data-cycle', 2);
	serial_data_div.innerHTML = `
		<div>
			<div class="create-document-absolute">

				<div class="header">
					<h3>PESAJE EN PROCESO</h3>
				</div>
				
				<div class="body">
					<div>

						<div class="widget">
							<div class="widget-container">
								<div class="widget-icon">
									<i class="fal fa-info"></i>
								</div>
								<div class="widget-data">
									<h5>Nº PESAJE</h5>
									<p>27.485</p>
								</div>
							</div>
						</div>

						<div class="widget">
							<div class="widget-container">
								<div class="widget-icon">
									<i class="fad fa-exchange"></i>
								</div>
								<div class="widget-data">
									<h5>CICLO</h5>
									<p>RECEPCION</p>
								</div>
							</div>
						</div>

						<div class="widget">
							<div class="widget-container">
								<div class="widget-icon">
									<i class="fad fa-users"></i>
								</div>
								<div class="widget-data">
									<h5>USUARIO</h5>
									<p>Marcos</p>
								</div>
							</div>
						</div>

						<div class="widget">
							<div class="widget-container">
								<div class="widget-icon">
									<i class="fal fa-sync-alt"></i>
								</div>
								<div class="widget-data">
									<h5>PROCESO</h5>
									<p>Peso Bruto</p>
								</div>
							</div>
						</div>

						<div class="widget">
							<div class="widget-container">
								<div class="widget-icon">
									<i class="fad fa-users-cog"></i>
								</div>
								<div class="widget-data">
									<h5>CHOFER</h5>
									<p>Rodolfo Villanueva</p>
								</div>
							</div>
						</div>

						<div class="widget">
							<div class="widget-container">
								<div class="widget-icon">
									<i class="fal fa-truck-container"></i>
								</div>
								<div class="widget-data">
									<h5>CAMION</h5>
									<p>FKPS28</p>
								</div>
							</div>
						</div>
						
					</div>

					<div id="serial-weight-data__info__weight">
						<p>34.960</p>
					</div>

				</div>

				<div class="close-btn-absolute">
					<div>
						<i class="fas fa-times"></i>
					</div>
				</div>
				
			</div>
		</div>
	`;

	serial_data_div.addEventListener('click', async () => {
		await fade_out(serial_data_div);
		serial_data_div.remove();
		global.serial_data = null;
	})

	document.querySelector('#main__content').appendChild(serial_data_div)
	fade_in(serial_data_div);
	serial_data_div.classList.remove('hidden');

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
		if (screen_width <= 768) document.getElementById('hamburguer-menu').click();
		animating = true;
		main_content_animation();
	}

	try {

		//ASSIGN WEIGHT OBJECT TO ACTIVE WEIGHT IN WEIGHT MODULE
		for (let weight of weight_objects_array) {
			if (!weight.active.status && weight.active.module === 'weight') {

				weight.active.status = true;
				weight_object = weight;

				//CHOOSE DOCUMENT OBJECT IF IT WAS ACTIVE
				document_object = null;
				for (let doc of weight_object.documents) {
					if (doc.active) document_object = doc;
				}
			}
			else weight.active.status = false;
		}

		const 
		session_token = token.value,
		get_pending_weights = await fetch('/list_pending_weights', {
			method: 'GET', 
			headers: { 
				"Cache-Control" : "no-cache"
			}
		}),
		response = await get_pending_weights.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

		await load_css('css/weights.css');
		await load_script('js/weight.js');

		document.querySelectorAll('#pending-weights-table tbody tr').forEach(tr => { tr.remove() });
		create_pending_weights_tr(response.pending_weights);
		
		if (document.querySelector('main').classList.contains('hidden')) {
			await check_loader();
			fade_in_animation(document.querySelector('main'));
			document.querySelector('main').classList.remove('hidden');	
		}

		//WAIT FOR DATA FROM SERVER
		if (!!active_container && active_container.id !== 'weight') { 
			while (animating) { await delay(10) }
			active_container.classList.remove('active');
			document.querySelector('.menu-item.active').classList.remove('active');
		}

		document.getElementById('menu-weights').classList.add('active');
		document.getElementById('weight').classList.add('active');

		if (!!active_container && active_container.id !== 'weight') main_content_animation();

	} catch(error) { error_handler('Error al obtener pesajes pendientes.', error); animating = false }
});

/*********** DOCUMENTS ***********/
document.getElementById('menu-documents').addEventListener('click', async function() {

	const btn = this;
	if (btn.classList.contains('active') || btn_double_clicked(btn) || animating) return;

	const active_container = document.querySelector('#main__content > .active');
	if (!!active_container) {
		animating = true;		
		main_content_animation();
	}

	try {

		if (!!document.querySelector('#documents__table-grid') === false) {
			const template = await (await fetch('/templates/template-documents.html', {
				method: 'GET',
				headers: { "Cache-Control" : "no-cache" }
			})).text();
            document.querySelector('#documents').innerHTML = template;

			await load_css('css/documents.css');
			await load_script('js/documents.js');
		}

		for (let weight of weight_objects_array) {
			if (!weight.active.status && weight.active.module === 'documents') {

				weight.active.status = true;
				weight_object = weight;

				//CHOOSE DOCUMENT OBJECT IF IT WAS ACTIVE
				document_object = null;
				for (let doc of weight_object.documents) {
					if (doc.active) document_object = doc;
				}
			}
			else weight.active.status = false;
		}

		if (!!active_container) {
			
			while (animating) await delay(10);

			document.querySelector('.menu-item.active').classList.remove('active');
			active_container.classList.remove('active');
			
			document.getElementById('menu-documents').classList.add('active');
			document.getElementById('documents').classList.add('active');

			main_content_animation();

			await delay(600);
			document.querySelector('#documents__doc-number').focus();

		}

	} catch(error) { error_handler('Error al intentar cargar documentos.', error); animating = false }

});

/*********** ANALYTICS ***********/
document.getElementById('menu-analytics').addEventListener('click', async function() {

	const btn = this;
	if (btn_double_clicked(btn) || animating) return;

	if (document.getElementById('menu-analytics').classList.contains('active')) return;

	document.querySelector('#analytics').classList.add('hidden');

	const active_container = document.querySelector('#main__content > .active');
	if (!!active_container) {

		if (screen_width <= 768) document.getElementById('hamburguer-menu').click();
		animating = true;		
		main_content_animation();
	}

	try {

		//FETCH TEMPLATE IF IT HASN'T DOEN IT YET
        if (!!document.querySelector('#analytics__entities-table') === false) {

            const template = await (await fetch('/templates/template-analytics.html', {
				method: 'GET',
				headers: { "Cache-Control" : "no-cache" }
			})).text();
            document.querySelector('#analytics').innerHTML = template;

			await load_css('css/analytics.css');
			await load_script('js/analytics.js');

			if (screen_width < 576)
				document.querySelector('#analytics__entities-table .th.stock').innerText = 'STOCK';
        }

		for (let weight of weight_objects_array) {
			if (!weight.active.status && weight.active.module === 'analytics') {

				weight.active.status = true;
				weight_object = weight;

				//CHOOSE DOCUMENT OBJECT IF IT WAS ACTIVE
				document_object = null;
				for (let doc of weight_object.documents) {
					if (doc.active) document_object = doc;
				}
			}
			else weight.active.status = false;
		}

		document.getElementById('menu-analytics').classList.add('active');
		document.getElementById('analytics').classList.add('active');

		if (!!active_container) {
			
			while (animating) await delay(10);

			document.querySelector('.menu-item.active').classList.remove('active');
			active_container.classList.remove('active');

			main_content_animation();

		}

		document.querySelector('#analytics').classList.remove('hidden');

	} 
	catch(error) { error_handler('Error al intentar cargar reportes.', error) }
	finally { animating = false }
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
			const template = await (await fetch('/templates/template-client-main.html', {
				method: 'GET',
				headers: { "Cache-Control" : "no-cache" }
			})).text();

			while (animating) { await delay(10) }

			document.querySelector('#clients > .content').innerHTML = template;
	
			await load_css('css/clients.css');
			await load_script('js/clients.js');	
		}

		while (animating) { await delay(10) }

		document.querySelectorAll('#clients__table-grid .tbody .tr').forEach(tr => { tr.remove() });
		await clients_get_entities();

		document.querySelector('#clients__breadcrumb').addEventListener('click', async function() {

			const btn = this;
			if (btn_double_clicked(btn)) return;
			
			const
            fade_out_div = document.getElementById('clients__client-template'),
            fade_in_div = document.getElementById('clients__table-grid');

            await fade_out_animation(fade_out_div);
            await fade_in_animation(fade_in_div);
            fade_out_div.remove();

			breadcrumbs('remove', 'clients');
		})

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

			const template = await (await fetch('/templates/template-products.html', {
				method: 'GET',
				headers: { "Cache-Control" : "no-cache" }
			})).text();
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
			
			const template = await (await fetch('/templates/template-vehicles.html', {
				method: 'GET',
				headers: { "Cache-Control" : "no-cache" }
			})).text();
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

	}
	catch(error) { error_handler('Error al intentar abrir vehiculos.', error); animating = false }
});

/*********** PRODUCTS ***********/
document.getElementById('menu-companies').addEventListener('click', async function() {

	const btn = this;
	if (btn_double_clicked(btn) || animating) return;

	const active_container = document.querySelector('#main__content > .active');
	animating = true;
	if (!!active_container) main_content_animation()
	
	await load_css('css/companies.css');
	await load_script('js/companies.js');

	if (!!active_container) {
		while (animating) await delay(10);
		document.querySelector('.menu-item.active').classList.remove('active');
		active_container.classList.remove('active');
	}

	btn.classList.add('active');
	document.getElementById('companies').classList.add('active');

	if (!!active_container) main_content_animation();
	
	animating = false;
});

const user_data = jwt_decode(token.value);
if (user_data.userProfile === 1) document.getElementById('menu-weights').click();
else document.getElementById('menu-analytics').click();