"use strict";

let socket;
try {

	socket = io('http://localhost:3100', {
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

		socket.on('transmitting serial data', weight => {
			if (parseInt(weight) !== NaN) {
				document.querySelector('#create-weight__take-weight__weight p').innerText = weight;
			}
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

		//WEIGHT HAS BEEN CREATED BY OTHER USER -> CREATE ROW IN PENDING WEIGHTS TABLE
		socket.on('weight created by another user', weight => {
			
			if (!!document.querySelector(`#pending-weights-table tr[data-weight-id="${weight.id}"]`)) return;

			const tr = document.createElement('tr');
			tr.className = 'hidden';
			tr.setAttribute('data-weight-id', weight.id);
			tr.innerHTML = `
				<td class="weight-id">${thousand_separator(weight.id)}</td>
				<td class="created">${DOMPurify().sanitize(new Date(weight.created).toLocaleString('es-CL'))}</td>
				<td class="cycle"></td>
				<td class="gross-brute">-</td>
				<td class="primary-plates">${DOMPurify().sanitize(weight.primary_plates)}</td>
				<td class="driver">${DOMPurify().sanitize(weight.driver)}</td>
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
		socket.on('weight status changed by other user', async weight_id => {
			const tr = document.querySelector(`#pending-weights-table tr[data-weight-id="${weight_id}"]`);
			if (!!tr) {
				await fade_out_animation(tr);
				tr.remove();
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

} catch(socket_error) { console.log(`Error connecting socket. ${socket_error}`) }