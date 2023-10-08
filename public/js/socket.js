"use strict";

const electronic_document_progress_bar = async (start, end, text) => {

	const 
	range_input = document.querySelector('#electronic-document__progress-steps > div'),
	percentage = document.querySelector('#electronic-document__progress-step p'),
	progress_description = document.querySelector('#electronic-document__progress-description p');

	for (let i = start; i <= end; i++) {
		range_input.setAttribute('data-progress', end);
		range_input.style.left = end + '%';
		percentage.innerText = i + '%'
		await delay(50)
	}

	progress_description.innerText = text;

}

let domain, socket;
(async () => {
	try {

		const 
		socket_domain = await fetch('/get_socket_domain', {
			method: 'GET',
			headers: {
				"Cache-Control" : "no-cache"
			}
		}),
		response = await socket_domain.json();

		domain = response.domain;

		socket = io(domain + ':3100', {
			autoConnect: false
		});
	
		socket.connect();
	
		socket.on('connect', () => {
	
			socket.emit('test', 'IT WORKED!!');
		
			socket.on('chat-message', msg => {
				console.log(msg)	
			});
		
			socket.on('new weight dev', weight => {
				console.log(weight)
				document.querySelector('#create-weight__take-weight__weight p').innerText = weight;
			});
	
			socket.on('transmitting serial data', weight_data => {
	
				console.log(weight_data);
				//CURRENT USER IN APP MATCHES USER THAN OPENED THE SERIAL PORT
				//if (weight_data.user_id === jwt_decode(token.value).userId) {
					if (parseInt(weight_data.weight_value) !== NaN) {
						document.querySelector('#create-weight__take-weight__weight p').innerText = weight_data.weight_value;
					}	
				//}
	
				/*
				//SERIAL PORT DATA GETS TRANSIMITTED FOR OTHER USERS
				else {
	
					if (!!document.querySelector('#serial-weight-data__info') === false) return; 
	
					global.serial_data = weight_data;
					const serial_data_div = document.getElementById('serial-weight-data__indicator');
	
					if (serial_data_div.getAttribute('data-serial-open') === 'false') {
						serial_data_div.setAttribute('data-serial-open', true);
						serial_data_div.querySelector('i').className = 'fal fa-unlock-alt';
					}
					
					const serial_data_info = document.getElementById('serial-weight-data__info');
					if (!!serial_data_info) {
	
					}
	
				}
				*/
	
			});
	
			socket.on('serial port connection error', () => {
	
				if (!!document.querySelector('#create-weight-step-2')) {
	
					weight_object.tara_type = 'manual';
					
					document.querySelector('#new-weight__widget__tara-type .header-check-type p').innerText = 'MANUAL';
					document.getElementById('create-weight__take-weight__weight').className = 'manual';
	
					const conn_status = document.querySelector('#create-weight__status-container > div:first-child');
					conn_status.classList.remove('connection-ok');
					conn_status.classList.add('connection-error');
	
					const tara_status = document.querySelector('#create-weight__status-container > div:last-child');
					tara_status.classList.remove('automatica');
					tara_status.classList.add('manual');
					tara_status.querySelector('p').innerHTML = 'TARA<br>MANUAL';
	
				}
			})
		
			socket.on('new weight updated', async response => {
		
				try {
	
					console.log(response);
	
					if (response.error !== undefined) throw 'Error al intentar guardar peso bruto. Valor no puede ser 0.'
			
					let target, status;
					if (response.data.update.process === 'gross') {
						target = weight_object.gross_weight;
						document.getElementById('tare-weight__gross-weight').innerText = thousand_separator(response.data.update.net) + ' KG';
					}
					else {
						target = weight_object.tare_weight;
						document.getElementById('gross-weight__tara-weight').innerText = thousand_separator(response.data.update.net) + ' KG';
					}
			
					target.date = response.data.update.date;
					target.status = response.data.update.status;
					target.type = response.data.update.tara_type;
					target.user = response.data.update.user;
					target.brute = response.data.update.brute;
					target.net = response.data.update.net;
					status = target.status;
					
					document.getElementById(`${response.data.update.process}-weight__brute`).innerText = thousand_separator(response.data.update.brute) + ' KG';
					document.getElementById(`${response.data.update.process}-weight__net`).innerText = thousand_separator(response.data.update.net) + ' KG';
			
					if (weight_object.gross_weight.status > 1 && weight_object.tare_weight.status > 1) {
						weight_object.final_net_weight = response.data.update.final_net_weight;
						document.getElementById('gross__final-net-weight').innerText = thousand_separator(response.data.update.final_net_weight) + ' KG';
						document.getElementById('tare__final-net-weight').innerText = thousand_separator(response.data.update.final_net_weight) + ' KG';
						document.getElementById('gross-weight__tara-weight').nextElementSibling.innerText = 'PESO NETO TARA';
						document.getElementById('gross__final-net-weight').nextElementSibling.innerText = 'PESO NETO FINAL';
					}
					else if (weight_object.gross_weight.status > 1 && weight_object.tare_weight.status === 1)
						document.getElementById('gross__final-net-weight').innerText = thousand_separator(response.data.update.net - weight_object.average_weight) + ' KG';
					
					else if (weight_object.gross_weight.status === 1 && weight_object.tare_weight.status > 1) 
						document.getElementById('gross-weight__tara-weight').innerText = thousand_separator(response.data.update.net) + ' KG';
					
			
					if (weight_object.tara_type === 'manual') {
						document.getElementById('take-weight__manual-input').value = response.data.update.brute;
						document.getElementById('take-weight__manual-input').classList.add('pulse-up');
					} else document.querySelector('#create-weight__take-weight__weight p').innerText = response.data.update.brute;
			
					document.querySelector('#create-weight__take-weight__weight p').classList.add('pulse-up');
					await delay(700);
					document.querySelector('#create-weight__modal').classList.remove('active');
			
					await delay(500);
			
					if (!!document.querySelector('#create-weight__take-weight-container')) {
	
						document.querySelector('#create-weight__take-weight-container').remove();
			
						const
						weight_btn = document.getElementById('take-weight-container'),
						cancel_save_btns = document.getElementById('save-cancel-btns');
			
						weight_btn.classList.remove('active');
						cancel_save_btns.classList.add('active');
						document.getElementById('create-weight-step-2').setAttribute('data-status', status);
					}
	
				} catch(e) { error_handler('Error al intentar guardar pesaje.', e) }
	
			})
	
			socket.on('serial port automatically closed', () => {
				//if (!!document.querySelector(''))
			})
	
			//WEIGHT HAS BEEN CREATED BY OTHER USER -> CREATE ROW IN PENDING WEIGHTS TABLE
			socket.on('weight created by another user', weight => {
				
				if (!!document.querySelector(`#pending-weights-table tr[data-weight-id="${weight.id}"]`)) return;
	
				const tr = document.createElement('tr');
				tr.className = 'hidden';
				tr.setAttribute('data-weight-id', weight.id);
				tr.innerHTML = `
					<td class="weight-id">${thousand_separator(weight.id)}</td>
					<td class="created">${sanitize(new Date(weight.created).toLocaleString('es-CL'))}</td>
					<td class="cycle"></td>
					<td class="gross-brute">-</td>
					<td class="primary-plates">${sanitize(weight.primary_plates)}</td>
					<td class="driver">${sanitize(weight.driver)}</td>
					<td class="client">-</td>
				`;
	
				if (weight.cycle === 1) tr.querySelector('.cycle').innerHTML = `<div><i class="fad fa-arrow-down"></i><p>RECEPCION</p></div>`;
				else if (weight.cycle === 2) tr.querySelector('.cycle').innerHTML = `<div><i class="fad fa-arrow-up"></i><p>DESPACHO</p></div>`;
				else if (weight.cycle === 3) tr.querySelector('.cycle').innerHTML = `<div><p>INTERNO</p></div>`;
				else if (weight.cycle === 4) tr.querySelector('.cycle').innerHTML = `<div><p>SERVICIO</p></div>`;
				
				document.querySelector('#pending-weights-table tbody').prepend(tr);
				fade_in_animation(tr);
				tr.classList.remove('hidden');
			})
	
			//WEIGHT IS HAS BEEN CHANGED TO ANNULED OR FINISHED BY OTHER USER
			socket.on('weight status changed by other user', async data => {

				console.log(data)

				//IF SAME WEIGHT IS OPEN AND ANOTHER USER CHANGED THE STATUS THEN THE DIV GETS CLOSED
				if (document.querySelector('#weight').classList.contains('active') && data.user_id !== jwt_decode(token.value).userId) {
					if (!!document.querySelector('#create-weight-step-2') && document.querySelector('#create-weight-step-2').classList.contains('active')) {
						if (weight_object.frozen.id === data.weight_id) 
							document.querySelector('#weight__breadcrumb > li:first-child').click();
					}
				}

				//REMOVE TR FROM PENDING WEIGHTS LIST
				const tr = document.querySelector(`#pending-weights-table tr[data-weight-id="${data.weight_id}"]`);
				if (!!tr) {
					await fade_out_animation(tr);
					tr.remove();
				}
				
				//UPDATE PRODUCT KILOS
				if (!!document.querySelector('#home-products-container'))
					await home_change_cycle(home_object.cycle);
				
				//UPDATE CONTAINERS STOCK
				if (document.querySelector('#analytics').children.length > 0) {
					if (!!document.querySelector('#analytics__entities-table tbody') && document.querySelector('#analytics__entities-table tbody').children.length > 0) {
						try {

							const 
							get_entities_stock = await fetch('/analytics_stock_get_entities', {
								method: 'GET',
								headers: {
									"Cache-Control" : "no-cache",
									"Authorization" : token.value
								}
							}),
							response = await get_entities_stock.json();

							if (response.error !== undefined) throw response.error;
							if (!response.success) throw 'Success response from server is false.';

							document.querySelectorAll('#analytics__entities-table .table-content tbody tr').forEach(tr => tr.remove());

							response.entities.forEach(entity => {
								const tr = document.createElement('div');
								tr.className = 'tr';
								tr.setAttribute('data-entity-id', entity.id);
								tr.innerHTML = `  
									<div class="td type"></div>
									<div class="td name">${sanitize(entity.name)}</div>
									<div class="td initial">${thousand_separator(entity.initial_stock)}</div>
									<div class="td dispatches">${thousand_separator(entity.dispatches)}</div>
									<div class="td receptions">${thousand_separator(entity.receptions)}</div>
									<div class="td stock">${thousand_separator(entity.stock)}</div>
								`;

								let type;
								if (entity.type === 'C') type = 'Cliente';
								else if (entity.type === 'P') type = 'Proveedor';
								else if (entity.type === 'A') type = 'Cliente y Proveedor';
								else type = entity.type;

								tr.querySelector('.type').innerText = type;
								document.querySelector('#analytics__entities-table .tbody').appendChild(tr)
							});

						} catch(e) { console.log(e) }
					}
				}

				//UPDATE COMPANIES TOTALS
				if (document.querySelector('#companies > .content').children.length > 0) {
					document.querySelector('#companies-grid__update-btn').click();

					//UPDATE ENTITIES LIST
					if (document.querySelector('#companies__entities-list .table-body tbody').children.length > 0) {
						await update_companies_list();
					}
				}
			})
	
			//GROSS WEIGHT HAS BEEN UPDATED BY ANOTHER USER -< UPDATES PENDING WEIGHTS TABLE GROSS WEIGHT
			socket.on('gross weight updated in one of the weights that are pending', weight => {
				const tr = document.querySelector(`#pending-weights-table tr[data-weight-id="${weight.id}"]`);
				if (!!tr) tr.querySelector('.gross-brute').innerText = thousand_separator(weight.gross_weight);
			})
	
			//FIRST DOCUMENT ENTITY IN PENDING WEIGHT HAS BEEN UPDATED
			socket.on('update pending weight entity in pending weights table', weight => {
				const tr = document.querySelector(`#pending-weights-table tr[data-weight-id="${weight.id}"]`);
				if (!!tr) tr.querySelector('.client').innerText = weight.entity_name;
			})
	
			//GENERATE ELECTRONIC DOCUMENT
			socket.on('error generating electronic document', e => {

				const close_btn = document.querySelector('#generate-electronic-document .footer button.red');
				close_btn.classList.add('enabled');

				close_btn.click();
				error_handler('No se pudo generar el documento electrónico.', e)
			})

			socket.on('electronic dispatch document - update progress', async data => {

				//REMOVE CLASS ENABLED FROM BUTTON IF PROGRESS IS 80 AND DOCUMENT HAS ALREADY BEEN EMITTED
				if (data.progress === 80) document.querySelector('#generate-electronic-document button.enabled.red').classList.remove('enabled');

				const progress_container = document.querySelector('.content-container.active #electronic-document__progress-steps .progress-container');
				if (!!progress_container === false) return;

				//WAIT FOR A PREVIOUS UPDATE ANIMATION TO BE FINISHED
				while (progress_container.classList.contains('updating-progress')) await delay(10);

				progress_container.classList.add('updating-progress');

				const input = progress_container.querySelector('input');
				let current_value = parseInt(input.value);

				for (let i = current_value + 1; i <= data.progress; i++) {
					input.value = i;
					input.dispatchEvent(new Event('change', { bubbles: true }));
					await delay(50);
				}

				progress_container.classList.remove('updating-progress');
			})
	
			socket.on('electronic document - file saved', async data => {

				console.log('file saved!!! response from socket...');
				
				const progress_container = document.querySelector('.content-container.active #electronic-document__progress-steps .progress-container');
				if (!!progress_container === false) return;

				//WAIT FOR A PREVIOUS UPDATE ANIMATION TO BE FINISHED
				while (progress_container.classList.contains('updating-progress')) await delay(10);

				progress_container.classList.add('updating-progress');

				const input = progress_container.querySelector('input');
				let current_value = parseInt(input.value);

				for (let i = current_value + 1; i <= 100; i++) {
					input.value = i;
					input.dispatchEvent(new Event('change', { bubbles: true }));
					await delay(50);
				}

				document.querySelector('.content-container.active .create-document__doc-number input').value = data.doc_number;
				document.querySelector('.content-container.active .create-document__doc-number input').classList.add('has-content');
				document.querySelector('.content-container.active .create-document__doc-number > .widget').classList.add('saved');
				document.querySelector('.content-container.active .create-document__footer__electronic').classList.add('enabled');

				document_object.number = data.doc_number;
				document_object.electronic = true;

				console.log('document object status changed\r\n', document_object);

				progress_container.classList.remove('updating-progress');
	
			})
	
			socket.on('electronic document - finished generating document', async data => {

				console.log('inside finished electronic document');

				const progress_container = document.querySelector('.content-container.active #electronic-document__progress-steps .progress-container');
				if (!!progress_container === false) return;

				//WAIT FOR A PREVIOUS UPDATE ANIMATION TO BE FINISHED
				while (progress_container.classList.contains('updating-progress')) await delay(10);

				console.log('done waiting for animation to end from previous process...')

				document_object.number = data.doc_number;
				document_object.electronic = true;
				
				document.querySelector('#generate-electronic-document button.red').classList.add('enabled');
				document.querySelector('#generate-electronic-document button.red').click();

				console.log('clicked red button to close div');

				while (!!document.querySelector('#generate-electronic-document')) {
					console.log('waiting for div to disappear...');
					await delay(10);
				}

				console.log('clicking on print document');
				document.querySelector('.content-container.active .create-document__footer__buttons .create-document__footer__print-document').click();
			})

			socket.on(`electronic document - emitted but couldn't save it`, async () => {
				error_handler('El documento se generó correctamente pero no se pudo descargar desde la página del SII.');
				document.querySelector('#generate-electronic-document button.red').classList.add('enabled');
				document.querySelector('#generate-electronic-document button.red').click();
			})
	
			//UPDATE BANK BALANCE STUFF
			socket.on('bank balance - open loader div', company_id => {

				const company_div = document.querySelector(`.company[data-company-id="${company_id}"]`);
				if (!!company_div === false) return;

				const
				company_name = company_div.querySelector('.company-data p').innerText,
				fade_in_div = company_div.querySelector('.updating-bank-balance');

				fade_in_div.querySelector('h4:last-child').innerText = company_name;

				fade_in_animation(fade_in_div);
				fade_in_div.classList.add('active');

			})
	
			socket.on('bank balance - updating balance', async data => {

				const company_div = document.querySelector(`#companies .company[data-company-id="${data.id}"]`);
				if (!!company_div === false) return;

				//WAIT FOR A PREVIOUS UPDATE ANIMATION TO BE FINISHED
				while (company_div.classList.contains('updating-balance')) await delay(10);

				company_div.classList.add('updating-balance');

				const input = company_div.querySelector(`.progress-container input[name="percent"]`);
				const current_value = parseInt(input.value);

				for (let i = current_value + 1; i <= data.progress; i++) {
					input.value = i;
					input.dispatchEvent(new Event('change', { bubbles: true }));
					await delay(50);
				}

				company_div.classList.remove('updating-balance');

			})

			socket.on('bank balance - finished updating balance', async data => {
	
				const company_div = document.querySelector(`#companies .company[data-company-id="${data.id}"]`);
				if (!!company_div === false) return;

				//WAIT FOR A PREVIOUS UPDATE ANIMATION TO BE FINISHED
				while (company_div.classList.contains('updating-balance')) await delay(10);

				//UPDATE PERCENTAGE TO 100
				const input = company_div.querySelector('input[name="percent"]');
				
				for (let i = 91; i <= 100; i++) {
					input.value = i;
					input.dispatchEvent(new Event('change', { bubbles: true }));
					await delay(75);
				}
	
				//UPDATE VALUES IN DIV
				company_div.querySelector('.countable p:last-child').innerText = '$' + thousand_separator(data.balance.countable);
				company_div.querySelector('.available p:last-child').innerText = '$' + thousand_separator(data.balance.available);
				company_div.querySelector('.credit-line p:last-child').innerText = '$' + thousand_separator(data.balance.credit);
				company_div.querySelector('.last-update span:last-child').innerText = companies_format_last_update_date(data.last_update);

				//FADE OUT DIV TO SHOW UPDATED VALUES
				const fade_out_div = company_div.querySelector('.updating-bank-balance');
				await fade_out_animation(fade_out_div);
				fade_out_div.classList.remove('active');

				input.value = 0;
				input.dispatchEvent(new Event('change', { bubbles: true }));
	
			})

			socket.on('error updating bank balance', async data => {
				
				const company_div = document.querySelector(`#companies .company[data-company-id="${data.company_id}"]`);
				if (!!company_div === false) return;

				try {

					const input = company_div.querySelector('input');

					const fade_out_div = company_div.querySelector('.updating-bank-balance');
					await fade_out_animation(fade_out_div);
					fade_out_div.classList.remove('active');

					input.value = 0;
					input.dispatchEvent(new Event('change', { bubbles: true }));

					throw data.error;

				} catch(e) { error_handler('Ocurrió un error al intentar actualizar saldo para empresa.', e) }
				
			})

			//UPDATE TOTALS IN COMPANIES
			socket.on('update companies totals after document has been edited', async () => {

				if (!document.querySelector('#companies').classList.contains('active')) return;
				document.querySelector('#companies-grid__update-btn').click();

				if (!document.querySelector('#companies__entities-list').classList.contains('active')) return;

				try { update_companies_list }
				catch(e) { console.log(e) }

			})

			//SERVER ERRORS
			socket.on('found errors in server', errors => {
				global.errors = errors.sortBy('id');
				global.errors.reverse();
				if (!jwt_decode(token.value).notifyErrors) return;
				document.querySelector('#menu-errors').classList.add('error-active');
			})

			//WEIGHTS WITH ERRORS HAVE BEEN UPDATED
			socket.on('errors in weights have been updated', data => {

				if (data.error !== undefined && document.querySelector('#errors').classList.contains('visible')) {
					document.querySelector('#errors .close-btn-absolute').click();
					return;
				}

				const { user_id, corrected_weights, ignored_errors } = data;

				//REMOVE WEIGHT WITH ERROR FROM GLOBAL.ERRORS ARRAY
				for (const weight_id of ignored_errors) {
					for (let i = 0; i < global.errors.length; i++) {
						const weight_with_error = global.errors[i];
						if (weight_id === weight_with_error.id) {
							global.errors.splice(i, 1);
							i--;
						}
					}
				}

				//REMOVE CORRECTED WEIGHT WITH ERROR FROM GLOBAL.ERRORS ARRAY
				for (const weight_id of corrected_weights) {
					for (let i = 0; i < global.errors.length; i++) {
						const weight_with_error = global.errors[i];
						if (weight_id === weight_with_error.id) {
							global.errors.splice(i, 1);
							i--;
						}
					}
				}

				if (global.errors.length === 0) document.querySelector('#menu-errors').classList.remove('error-active');

				//REMOVE ROW FROM TABLE
				if (jwt_decode(token.value).userId !== user_id && document.querySelector('#errors').classList.contains('visible')) {

					for (const weight_id of ignored_errors) {
						const tr = document.querySelector(`#errors .table-body tbody tr[data-weight-id=${weight_id}]`);
						if (!!tr) tr.remove();
					}
				}
			})

			socket.on('finished checking for errors in servers', response => {
				try {

					console.log(response)

					if (response.error !== undefined) throw response.error;
					if (!response.success) throw 'Success response from server is false.';

					global.errors = response.errors.sortBy('id');
					global.errors.reverse();

					const errors = global.errors;

					const div = document.createElement('div');
					div.className = 'hidden';
					div.innerHTML = `
						<div class="create-document-absolute">
							
							<div class="header">
								<h3>ERRORES EN SERVIDOR</h3>
							</div>
				
							<div class="body">
				
								<div class="error-row">
									<div class="error__messages">
										<div class="table-header">
											<table>
												<thead>
													<tr>
														<th class="line">Nº</th>
														<th class="weight-id">PESAJE</th>
														<th class="date">FECHA</th>
														<th class="vehicle">PATENTE</th>
														<th class="message">ERROR</th>
														<th class="corrected">CORREGIDO</th>
														<th class="ignore-error">IGNORAR</th>
													</tr>
												</thead>
											</table>
										</div>
										<div class="table-body">
											<table>
												<tbody></tbody>
											</table>
										</div>
									</div>
								</div>
							</div>
				
							<div class="footer">
								<div class="create-document-btns-container">
									<button class="svg-wrapper enabled red">
										<svg height="45" width="160" xmlns="http://www.w3.org/2000/svg">
											<rect class="shape" height="45" width="160"></rect>
										</svg>
										<div class="desc-container">
											<i class="fas fa-times-circle"></i>
											<p>CANCELAR</p>
										</div>
									</button>
									<button class="svg-wrapper enabled green">
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
				
							<div class="close-btn-absolute">
								<div>
									<i class="fas fa-times"></i>
								</div>
							</div>
				
						</div>
						
					`;
					
					//CREATE ERROR ROWS
					for (let i = 0; i < errors.length; i++) {
				
						const tr = document.createElement('tr');
						tr.setAttribute('data-weight-id', errors[i].id);
						tr.innerHTML = `
							<td class="line">${i + 1}</td>
							<td class="weight-id">${thousand_separator(errors[i].id)}</td>
							<td class="date">${sanitize(errors[i].date)}</td>
							<td class="vehicle">${sanitize(errors[i].plates)}</td>
							<td class="message">${sanitize(errors[i].message)}</td>
							<td class="corrected">
								<div>
									<input class="create-vehicle__active-cbx" type="checkbox">
									<label class="cbx"></label>
								</div>
							</td>
							<td class="ignore-error">
								<div>
									<input class="create-vehicle__active-cbx" type="checkbox">
									<label class="cbx"></label>
								</div>
							</td>
						`;
				
						div.querySelector('.table-body tbody').appendChild(tr);
					}
				
					//CLOSE DIV
					div.querySelector('.close-btn-absolute').addEventListener('click', async function() {
						if (btn_double_clicked(this) || animating) return;
						await fade_out_animation(div);
						div.remove();
						document.querySelector('#errors').classList.remove('visible')
					});
				
					//CHECKBOXES
					div.querySelectorAll('input').forEach(input => {
						input.parentElement.addEventListener('click', function() {
							const check_box = this.querySelector('input');
							if (check_box.checked) check_box.checked = false;
							else check_box.checked = true;
						})
					});
				
					//ACCEPT BTN
					div.querySelector('button.green').addEventListener('click', async function() {
				
						if (btn_double_clicked(this) || animating) return;
				
						const corrected_weights = [];
						const ignored_errors = [];
				
						div.querySelectorAll('input').forEach(input => {
							const weight_id = parseInt(input.parentElement.parentElement.parentElement.getAttribute('data-weight-id'));
							if (input.parentElement.parentElement.className === 'corrected' && input.checked && !corrected_weights.includes(weight_id)) corrected_weights.push(weight_id);
							else if (input.parentElement.parentElement.className === 'ignore-error' && input.checked && !ignored_errors.includes(weight_id)) ignored_errors.push(weight_id)
						});
				
						socket.emit('ignore error in weights', { user_id: jwt_decode(token.value).userId, corrected_weights, ignored_errors });
				
						div.querySelector('.close-btn-absolute').click();
				
					});
				
					document.querySelector('#errors').appendChild(div);
					document.querySelector('#errors').classList.add('visible');
				
					fade_in_animation(div);
					div.classList.remove('hidden');

				}
				catch(e) { error_handler('Error al intentar encontrar errores en la base de datos', e) }
				finally { check_loader() }
			})
	
		});
	
		socket.on('disconnect', () => {
			console.log('socket disconnected');
		});
	
		const socketReconnect = async () => {
			try {
				await delay(500);
				if (!socket.connected) socket.connect();
			} 
			catch(e) { console.log(`Error reconnecting socket. ${e}`); socketReconnect() }
		}
	
		window.onfocus = () => {
			if (!socket.connected && screen_width < 768) socketReconnect();
		}
	
		window.onblur = () => {
			console.log(socket.connected);
			if (socket.connected && screen_width < 768) socket.disconnect();
		}
	
		/**************** DOCUMENTS ****************/
		socket.on('document -> product cut updated', async response => {
	
			try {
	
				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';		
	
				const row_object = await get_row_object(response.row_id);
				row_object.product.cut = response.cut;
	
				if (response.last_price.found) {
					row_object.product.last_price.found = response.last_price.found;
					row_object.product.last_price.price = response.last_price.price;
				}
	
				const price_input = document.querySelector(`#create-document__body__table-container tr[data-row-id="${response.row_id}"] .product-price input`);
	
				if (row_object.product.last_price.found && row_object.product.last_price.price !== null) {
					price_input.value = '$' + thousand_separator(row_object.product.last_price.price);
					price_input.parentElement.classList.remove('saved');
				}
		
				price_input.focus();
	
			} catch(e) { console.log(e); error_handler(e) }
	
		})

	} catch(e) { console.log(`Couldnt get domain name. ${e}`) }	
})();