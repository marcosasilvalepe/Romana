"use strict"; 

let domain;
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

	} catch(e) { console.log(`Couldnt get domain name. ${e}`) }	
})();

//WEIGHT AND DOCUMENT OBJECTS STUFF
let weight_object, document_object, watch_document;
const weight_objects_array = [], document_objects_array = [];

//REMOVE WEIGHT_OBJECT FROM WEIGHTS ARRAY
const remove_weight_from_weights_array = () => {
	return new Promise(resolve => {
		for (let i = 0; i < weight_objects_array.length; i++) {
			if (weight_object.frozen.id === weight_objects_array[i].frozen.id) {
				const index = weight_objects_array.indexOf(weight_objects_array[i]);
				weight_objects_array.splice(index, 1);
			}
		}
		return resolve()	
	})
}

//WEIGHT OBJECT
class create_weight_object {

	constructor(weight_object) {
		this.average_weight = weight_object.average_weight;
		this.cycle = weight_object.cycle;
		this.documents = [];
		this.default_data = weight_object.default_data;
		this.driver = weight_object.driver;
		this.frozen = weight_object.frozen;
		Object.freeze(this.frozen);
		this.gross_weight = weight_object.gross_weight;
		this.last_weights = weight_object.last_weights;
		this.final_net_weight = weight_object.final_net_weight;
		this.kilos = weight_object.kilos;
		this.kilos_breakdown = weight_object.kilos_breakdown;
		this.process = weight_object.default_data.process;
		this.secondary_plates = weight_object.secondary_plates;					
		this.status = weight_object.status;
		this.tara_type = 'automatica';
		this.tare_containers = weight_object.tare_containers;
		this.tare_weight = weight_object.tare_weight;
		this.transport = weight_object.transport;
	}

	print_weight() {
		return new Promise(async (resolve, reject) => {
			try {
				
				const 
				weight_id = this.frozen.id,
				get_weight = await fetch('/get_finished_weight', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value
					}, 
					body: JSON.stringify({ weight_id })
				}),
				response = await get_weight.json();
			
				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				await load_script('js/qz-tray.js');
				await load_script('js/print.js');

				//PRINT WITH DOT MATRIX
				if (jwt_decode(token.value).qzTray) {
					try {
					
						if (!await qz.websocket.isActive()) await qz.websocket.connect();
						console.log("connected to printer socket");
				
						const printer = await qz.printers.find("OKI");
						console.log(`Printer ${printer} found!`);
	
						const config = qz.configs.create(printer);
						console.log('ok')
	
						await print_with_dot_matrix(config, response.weight_object);
						return resolve();
				
					} catch(print_error) { console.log(`Couldn't connect to printer. ${print_error}`) }
				}

				//CREATE WINDOW AND PRINT WITH BROWSER
				window.open(`${domain}:3000/print?weight_id=${weight_id}`, 'PRINT');
				
				return resolve();

			} catch(error) { error_handler('Error al intentar imprimir pesaje', error); return reject(error) }
		})
	}

	update_driver(driver_id, set_driver_as_default) {
		if (!this.active.edit) return;
		return new Promise(async (resolve, reject) => {
			driver_id = sanitize(driver_id);
			const weight_id = sanitize(this.frozen.id);
			try {
				const update = await fetch('/update_driver', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value
					}, 
					body: JSON.stringify({ weight_id, driver_id, set_driver_as_default })
				}),
				response = await update.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				this.driver.id = response.driver.id;
				this.driver.name = response.driver.name;
				this.driver.rut = response.driver.rut;
				return resolve();
			} catch(error) { error_handler('Error al actualizar chofer en pesaje en /update_driver', error); return reject(error) }
		})
	}

	annul_document(doc_id) {
		if (!this.active.edit) return;
		return new Promise(async (resolve, reject) => {
			doc_id = sanitize(doc_id);
			try {
				const
				annul = await fetch('/annul_document', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ doc_id })
				}),
				response = await annul.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				weight_object.gross_weight.containers_weight = response.containers_weight;
				weight_object.gross_weight.net = response.gross_net;
				weight_object.final_net_weight = response.final_net_weight;

				const docs = weight_object.documents;
				for (let i = 0; i < docs.length; i++) {
					if (docs[i].frozen.id === parseInt(doc_id)) {
						weight_object.documents.splice(i, 1);
					}
				}

				return resolve();
			} catch (error) { error_handler('Error al anular documento en /annul_document', error); reject(error) }
		})
	}

	save_weight() {
		return new Promise(async (resolve, reject) => {
			if (!this.active.edit) return;
			try {

				const
				weight_id = sanitize(this.frozen.id),
				process = sanitize(this.process),
				save_weight = await fetch('/save_weight', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value
					}, 
					body: JSON.stringify({ weight_id, process })
				}),
				response = await save_weight.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';
				
				if (response.process === 'gross') this.gross_weight.status = response.status;
				else this.tare_weight.status = response.status;
				
				return resolve(true);
			} catch(error) { error_handler('Error al guardar peso.', error); return reject(error) }
		})
	}
}

//DOCUMENT OBJECT
class create_document_object {

	constructor(doc) {
		this.frozen = doc.frozen
		Object.freeze(this.frozen);
		this.number = doc.number;
		this.date = doc.date;
		this.sale = doc.sale;
		this.type = doc.type;
		this.electronic = doc.electronic;
		this.comments = doc.comments;
		this.client = doc.client;
		this.internal = doc.internal;
		this.kilos = doc.kilos;
		this.containers = doc.containers;
		this.containers_weight = doc.containers_weight;
		this.rows = [];
		this.total = doc.total;
	}

	watch_object() {

		const watch = {
			containers: this.containers,
			containers_weight: this.containers_weight,
			kilos: this.kilos,
			total: this.total
		}

		watch_document = setInterval(async () => {

			if (!weight_object.kilos_breakdown || weight_object === null) {
				clearInterval(watch_document);
				return;
			}

			for (let key in watch) {
				if (watch[key] !== this[key]) {
					console.log('Value changed for ' + key + ' !!!!');
					await change_kilos_breakdown_status();
					clearInterval(watch_document);
					break;
				}
			}

		}, 50);
	}

	print_document() {
		return new Promise(async (resolve, reject) => {
			try {
				
				if (this.number === null) throw 'Número del documento sin ingresar';
				if (this.date === null) throw 'Fecha del documento sin ingresar';
				if (this.client.entity.id === null) throw `La entidad de ${(weight_object.cycle.id === 2) ? 'destino' : 'origen'} no ha sido seleccionada`;
				if (this.client.branch.id === null) throw `La sucursal de ${(weight_object.cycle.id === 2) ? 'destino' : 'origen'} no ha sido seleccionada`;
				if (this.internal.entity.id === null) throw `Entidad de ${(weight_object.cycle.id === 2) ? 'origen' : 'destino'} sin seleccionar.`;
				if (this.internal.entity.id !== 1) throw `Entidad de ${(weight_object.cycle.id === 2) ? 'origen' : 'destino'} errónea. Seleccionar otra entidad.`;

				const 
				doc_id = this.frozen.id,
				get_document = await fetch('/print_document', {
					method: 'POST', 
					headers: { "Content-Type" : "application/json" }, 
					body: JSON.stringify({ doc_id })
				}),
				response = await get_document.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				const { doc_data } = response;
				console.log(doc_data)			

				await load_script('js/qz-tray.js');

				//PRINT WITH DOT MATRIX
				let config;
				try {
					
					if (!await qz.websocket.isActive()) await qz.websocket.connect();
					console.log("connected to printer socket")
			
					let printer;
					try { printer = await qz.printers.find("OKI") } 
					catch(err) {
						
						console.log('Looking for printer in linux');
						//FOR LINUX
						printer = await qz.printers.find("ML320");
					}

					console.log(`Printer ${printer} found !`);
					config = qz.configs.create(printer);

				} catch(print_error) { console.log(`Couldn't connect to printer.`); return }
				
				const 
				months_array = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'],
				doc_date = new Date(doc_data.date),
				year = doc_date.getFullYear(),
				month = months_array[doc_date.getMonth()],
				day = (doc_date.getDate() < 10) ? '0' + doc_date.getDate() : doc_date.getDate(),
				day_and_month = `                                                   ${day}    ${month}`,
				address = print_doc_break_line(replace_spanish_chars(doc_data.entity.address), 9, 48, 3),
				giro = print_doc_break_line(replace_spanish_chars(doc_data.entity.giro), 9, 35, 31),
				line_jump = '\x0A';

				if (year < 2019) throw 'Fecha de documento inválida.';

				const data = [
					line_jump, line_jump, line_jump, line_jump, line_jump, line_jump, line_jump, line_jump,
					`                                                           ${thousand_separator(doc_data.number)}` + '\r\n',//9
					line_jump, line_jump, line_jump, line_jump,

				  //'01234567890123456789012345678901234567890123456789012345678901234567890123456789',
				  //'1         1         2         3         4         5         6         7         ',
					day_and_month + print_doc_spaces(0, day_and_month, 72) + year + '\r\n', //14
				  //'                                               10      DICIEMBRE      2021' + '\x0A', //14
					line_jump,
					`            ${replace_spanish_chars(doc_data.entity.name.toUpperCase())}` + '\r\n', //16
					line_jump,
					'           ' + replace_spanish_chars(address.first_line.toUpperCase()) + print_doc_spaces(11, address.first_line, 55) + doc_data.entity.rut + '\r\n',  //18
					'    ' + replace_spanish_chars(address.second_line.toUpperCase()) + '\r\n', //19
					'          ' + replace_spanish_chars(doc_data.entity.comuna.toUpperCase()) + print_doc_spaces(10, doc_data.entity.comuna, 36) + replace_spanish_chars(giro.first_line.toUpperCase()) + '\r\n', //20
					'                                ' + replace_spanish_chars(giro.second_line.toUpperCase()) + '\r\n', //20
					line_jump, line_jump, line_jump
				];

				let total_containers = 0, total_kilos = 0;

				for (let row of doc_data.rows) {
					if (row.product.code === 'GEN') {

						const traslado_description = await get_traslado_description(row.id);
						console.log(traslado_description)
						data.push(`              ${replace_spanish_chars(traslado_description.toUpperCase())}` + '\r\n', '\r\n');

					} else {

						const 
						product_name = (row.product.name === null) ? '' : row.product.name,
						product_cut = (row.product.cut === null) ? '' : row.product.cut,
						product_amount = (row.product.kilos === null) ? '' : thousand_separator(row.product.kilos),
						product_price = (row.product.price === null) ? '' : '$' + thousand_separator(row.product.price) + '+IVA',
						product = 'KG ' + product_name.toUpperCase() + ' DESCARTE ' + product_cut.toUpperCase();
	
						if (product_name.length > 0) {
							const product_line = print_doc_body_string(product_amount, product, product_price);
							data.push(product_line + '\r\n');
						}
	
						const
						container_amount = (row.container.amount === null) ? '' : thousand_separator(row.container.amount),
						container_name = (row.container.name === null) ? '' : row.container.name.toUpperCase();
	
						if (container_name.length > 0) {
							const container_line = '      ' + container_amount + print_doc_spaces(7, container_amount, 15) + container_name;
							data.push(container_line + '\r\n');
						}
	
						if (product_name.length > 0 || container_name.length > 0) data.push('\r\n');
					}

					total_containers += 1 * row.container.amount;
					total_kilos += 1 * row.product.kilos;
				}

				if (doc_data.rows.length > 1) {
					if (total_containers > 0)
						data.push('      ' + thousand_separator(total_containers) + print_doc_spaces(7, thousand_separator(total_containers), 15) + 'ENVASES EN TOTAL.' + '\r\n');
					
					if (total_kilos > 0)
						data.push('      ' + thousand_separator(total_kilos) + print_doc_spaces(7, thousand_separator(total_kilos), 15) + 'KG. EN TOTAL.' + '\r\n');
				}

				while (data.length < 42) { data.push(line_jump) }

				//PRINT FOR PATACON - CHANGE LATER!!!!
				if (doc_data.entity.rut === '89.069.300-8')
					data.push(print_doc_center_text('CODIGO CSP BODEGA: 7175335'), '\r\n');

				if (doc_data.comments !== null) data.push(print_doc_center_text(replace_spanish_chars(doc_data.comments.toUpperCase())), '\r\n');

				const
				driver_name = replace_spanish_chars(doc_data.driver.name),
				driver_rut = doc_data.driver.rut,
				primary_plates = replace_spanish_chars(doc_data.vehicle.primary_plates),
				secondary_plates = (doc_data.vehicle.secondary_plates === null) ? '' : ' - ' + replace_spanish_chars(doc_data.vehicle.secondary_plates),
				plates = primary_plates + secondary_plates,
				sag_id = (document_object.sale) ? '05379020' : '05375101',
				sale_type_first_list = (document_object.sale) ? 'GUIA CONSTITUYE VENTA' : 'GUIA NO CONSTITUYE VENTA',
				sale_type_second_line = (document_object.sale) ? '' : 'SOLO TRASLADO DE MATERIAL PROPIO';

			  			//'01234567890123456789012345678901234567890123456789012345678901234567890123456789',
			  			//'1         1         2         3         4         5         6         7         ',
				data.push(print_doc_center_text(`ID: ${sag_id} - VEHICULO: ${plates}`) + '\r\n');
				data.push(print_doc_center_text(`CHOFER: ${driver_name.toUpperCase()} - RUT: ${driver_rut}`) + '\r\n');
				data.push(print_doc_center_text(sale_type_first_list) + '\r\n');
				if (sale_type_second_line.length > 0) data.push(print_doc_center_text(sale_type_second_line) + '\r\n');
				data.push(' \r\n \r\n \r\n \r\n');

				/*
				data.push(`                        ID: 05375101 - VEHICULO: ${plates}` + '\x0A' + '\x0A');
				data.push(`                       CHOFER: ${driver_name.toUpperCase()} - RUT: ${driver_rut}` + '\x0A');
				data.push('                            GUIA NO CONSTITUYE VENTA' + '\x0A' + '\x0A');
				data.push('                       SOLO TRASLADO DE MATERIAL PROPIO' + '\x0A' + '\x0A');
				*/

				data.forEach(d => { console.log(d) })
				qz.print(config, data);

				return resolve()
			} catch(e) { error_handler('Error al intentar imprimir pesaje', e); return reject() }
		});
	}

	update_doc_number(doc_number) {
		if (!weight_object.active.edit) return;
		return new Promise(async (resolve, reject) => {
			doc_number = sanitize(doc_number);
			const doc_id = sanitize(this.frozen.id);

			try {
				const	
				update = await fetch('/update_doc_number', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ doc_id, doc_number })
				}),
				response = await update.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				if (response.doc_number === null) this.number = null;
				else this.number = parseInt(response.doc_number);

				this.existing_document = response.existing_document;
				return resolve();
			}
			catch (error) { error_handler('Error al actualizar número de documento /update_doc_number', error); return reject(error) }
		})
	}

	update_doc_date(doc_date) {
		if (!weight_object.active.edit) return;
		return new Promise(async (resolve, reject) => {
			doc_date = sanitize(doc_date + ' 00:00:00');
			const doc_id = sanitize(this.frozen.id);
			try {
				const	
				update = await fetch('/update_doc_date', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ doc_id, doc_date })
				}),
				response = await update.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				this.date = doc_date;
				return resolve();

			}
			catch (error) { error_handler('Error al actualizar fecha del documento en /update_doc_date', error); reject(error) }
		})
	}

	update_client(client_id) {
		if (!weight_object.active.edit) return;
		return new Promise(async (resolve, reject) => {

			client_id = sanitize(client_id);
			const document_id = sanitize(this.frozen.id);
			try {
				const
				update_client_entity = await fetch('/update_client_entity', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ document_id, client_id })
				}),
				response = await update_client_entity.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				this.client.entity.id = response.entity.id;
				this.client.entity.name = response.entity.name;

				if (response.last_record.found) {
					this.internal.entity.id = response.last_record.entity.id;
					this.internal.entity.name = response.last_record.entity.name;
					this.internal.branch.id = response.last_record.branch.id;
					this.internal.branch.name = response.last_record.branch.name;
				} else {
					this.internal.entity.id = null;
					this.internal.entity.name = null;
					this.internal.branch.id = null;
					this.internal.branch.name = null;
				}
				return resolve(response.branches);
			} catch(error) { error_handler('Error al seleccionar entidad de cliente/proveedor en /select_client_entity', error); return reject(); }
		})
	}

	update_branch(branch_id) {
		if (!weight_object.active.edit) return;
		return new Promise(async (resolve,reject) => {
			
			branch_id = sanitize(branch_id);

			const
			doc_number = sanitize(document_object.number),
			document_id = sanitize(this.frozen.id),
			document_electronic = this.electronic;

			try {
				const
				update = await fetch('/document_update_branch', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ branch_id, doc_number, document_id, document_electronic })
				}),
				response = await update.json();

				if (response.error !== undefined) throw response.error;
				
				this.existing_document = response.existing_document;
				this.client.branch.id = response.branch_id;
				this.client.branch.name = response.branch_name;
				
				//if (response.existing_document) this.number = null;
				this.electronic = response.last_document_electronic;

				return resolve(true);
			} catch(error) { error_handler('Error al actualizar sucursal de cliente/proveedor en /document_update_branch', error); return reject(error) }
		})
	}

	update_internal(target_id, target_table) {
		if (!weight_object.active.edit) return;
		return new Promise(async (resolve, reject) => {
			target_id = sanitize(target_id);
			target_table = sanitize(target_table);
			const document_id = sanitize(this.frozen.id);

			try {
				const
				update = await fetch('/document_select_internal', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ target_id, target_table, document_id })
				}),
				response = await update.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				if (target_table==='internal-entities') {
					this.internal.entity.id = response.id;
					this.internal.entity.name = response.name
				} else {
					this.internal.branch.id = response.id;
					this.internal.branch.name = response.name
				}
				return resolve(true);
			} catch (error) { error_handler('Error al seleccionar entidad interna en /document_select_internal', error); reject(error) }
		})
	}
}

//ROW OBJECT FOR DOCUMENT OBJECT
class document_row {

	update_product(code) {
		if (!weight_object.active.edit) return;
		return new Promise( async (resolve, reject) => {

			code = sanitize(code.trim());
			const row_id = sanitize(this.id);

			try {

				const
				update = await fetch('/update_product', {
					method: 'POST',
					headers: {
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					},
					body: JSON.stringify({ row_id, code })
				}),
				response = await update.json();
			
				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';
				
				this.product.code = response.code;
				this.product.name = response.name;
				this.product.type = response.type;
				
				return resolve();
			} catch (error) { error_handler('Error al actualizar product en /update_product', error); return reject(error); }
		})
	}

	update_cut(cut) {
		if (!weight_object.active.edit) return;
		return new Promise(async (resolve, reject) => {

			cut = sanitize(cut);
			const 
			row_id = this.id,
			product_code = this.product.code,
			entity_id = sanitize(document_object.client.entity.id);

			try {

				const
				update_cut = await fetch('/update_cut', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value
					}, 
					body: JSON.stringify({ row_id, product_code, cut, entity_id })
				}),
				response = await update_cut.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				this.product.cut = cut;

				if (response.last_price.found) {
					this.product.last_price.found = response.last_price.found;
					this.product.last_price.price = response.last_price.price;
				} else {
					this.product.last_price.found = false;
					this.product.last_price.price = null;
				}

				return resolve();

			} catch(error) { error_handler('Error al seleccionar tipo de descarte', error); return reject(error) }
		});
	}

	update_price(price) {
		if (!weight_object.active.edit) return;
		return new Promise(async (resolve, reject) => {
			price = sanitize(price);
			const row_id = sanitize(this.id);

			try {
				const
				update = await fetch('/update_price', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ row_id, price })
				}),
				response = await update.json();
	
				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				this.product.price = response.price;
				this.product.total = response.product_total;
				document_object.total = response.doc_total;
				resolve(true)
			}
			catch (error) { error_handler('Error al actualizar precio en /update_price', error); return reject(error) }
		})
	}

	update_kilos(kilos) {
		if (!weight_object.active.edit) return;
		return new Promise(async (resolve, reject) => {
			kilos = sanitize(kilos);
			const row_id = sanitize(this.id);
			try {
				const
				update = await fetch('/update_kilos', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ row_id, kilos })
				}),
				response = await update.json();
	
				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				this.product.total = response.product_total;

				/*
				if (weight_object.cycle.id === 1) this.product.informed_kilos = response.kilos;
				else this.product.kilos = response.kilos;
				*/

				this.product.informed_kilos = response.kilos;

				document_object.kilos = response.doc_kilos;
				document_object.total = response.doc_total;
				resolve(true);
			}
			catch (error) { error_handler('Error al actualizar kilos en /update_kilos', error); return reject(error) }
		})
	}

	update_container(code) {
		if (!weight_object.active.edit) return;
		return new Promise(async (resolve, reject) => {

			code = sanitize(code.trim());
			const row_id = sanitize(this.id);
			try {	
				const
				update = await fetch('/update_container', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ row_id, code })
				}),
				response = await update.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				if (response.found) {
					this.container.code = response.container.code;
					this.container.name = response.container.name;
					this.container.weight = response.container.weight;
					document_object.containers_weight = response.document.containers_weight;
				}
				
				else {
					this.container.code = null;
					this.container.name = null;
					this.container.weight = null;	
				}

				return resolve();
			} catch (error) { error_handler('Error al actualizar envase en /update_container', error); return reject(error) }
		})
	}

	update_container_amount(amount) {
		if (!weight_object.active.edit) return;
		return new Promise(async (resolve,reject) => {

			amount = sanitize(amount);
			const row_id = sanitize(this.id);
			try {
				const
				update = await fetch('/update_container_amount', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ row_id, amount })
				}),
				response = await update.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				document_object.containers_weight = response.document.containers_weight;
				document_object.containers = response.document.containers_amount;

				this.container.amount = response.container_amount;

				return resolve();
			} catch(error) { error_handler('Error al actualizar cantidad de envases en /update_container_amount', error); return reject(error) }
		})
	}

	annul_row() {
		if (!weight_object.active.edit) return;
		return new Promise(async (resolve, reject) => {

			const row_id = sanitize(this.id);
			try {	
				const
				annul = await fetch('/annul_row', {
					method: 'POST', 
					headers: { 
						"Content-Type" : "application/json",
						"Authorization" : token.value 
					}, 
					body: JSON.stringify({ row_id })
				}),
				response = await annul.json();

				if (response.error !== undefined) throw response.error;
				if (!response.success) throw 'Success response from server is false.';

				if (response.single_row) {
					this.product.code = null;
					this.product.name = null;
					this.product.kilos = null;
					this.product.price = null;
					this.product.total = null;
					this.container.code = null;
					this.container.name = null;
					this.container.weight = null;
					this.container.amount = null;
				} else {
					const row_index = document_object.rows.indexOf(this);
					document_object.rows.splice(row_index, 1);
				} 
				return resolve();
			} catch(error) { error_handler('Error al anular fila en documento en /annul_row', error); return reject(error) }
		})
	}

	constructor(row) {
		this.id = row.id
		this.product = row.product;
		this.container = row.container;
	}
}

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


Array.prototype.sortBy = function(p) {
    return this.slice(0).sort(function(a,b) {
        return (a[p] < b[p]) ? 1 : (a[p] > b[p]) ? -1 : 0;
    });
}

const toggle_custom_input_class = function() {
	if (
		this.value.length === 0 && this.classList.contains('has-content') 
		||
		this.value.length > 0 && !this.classList.contains('has-content') 
	) this.classList.toggle('has-content')
}

const main_content = document.getElementById('main__content');

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

/************************ MAIN MENU FUNCTIONS ************************/

/*** NAVIGATE USING ARROW KEYS ***/
const escape_key_pressed = () => {

	//CREATING OR EDITING WEIGHT
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
		else if (!!document.querySelector('.content-container.active .create-document__details-container')) 
			document.querySelector('.content-container.active .create-document__footer__back-btn').click();

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

	else if (ev.key === 'Enter' && document.getElementById('error-section').className === 'active') {
		document.getElementById('close-error-div').click();
	}
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

/********************* CREATING OR EDITING VEHICLES *******************/
const create_vehicle_finalize = async function() {

	const btn = this;
	if (btn_double_clicked(btn)) return;
	if (!btn.classList.contains('enabled')) return;

	const 
	transport_select = document.querySelector('.content-container.active .create-vehicle__transport-select'),
	driver_tr = document.querySelector('.content-container.active .create-weight__change-driver tbody tr.selected'),
	data = {
		primary_plates: document.querySelector('.content-container.active .create-vehicle__primary-plates').value.toUpperCase(),
		secondary_plates: document.querySelector('.content-container.active .create-vehicle__secondary-plates').value.toUpperCase(),
		transport_id: transport_select.options[transport_select.selectedIndex].value,
		driver_id: (driver_tr === null) ? null : driver_tr.getAttribute('data-driver-id')
	}

	try {

		if (data.primary_plates.length < 6) throw 'Patente de vehículo necesita al menos 6 caracteres';

		//SANITIZE OBJECT
		for (let key in data) { data[key] = sanitize(data[key]) }
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
				<td class="primary-plates">${sanitize(response.created.primary_plates)}</td>
				<td class="secondary-plates"></td>
				<td class="driver">${sanitize(response.created.driver)}</td>
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
			<div class="td primary-plates">${sanitize(response.created.primary_plates)}</div>
			<div class="td secondary-plates"></div>
			<div class="td driver">${sanitize(response.created.driver)}</div>
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
	for (let key in data) { data[key] = sanitize(data[key]) }

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
	plates = sanitize(modal.querySelector('.create-vehicle__primary-plates').value.replace(/[^a-zA-Z0-9]/gm, '').toUpperCase()),
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
		
		//EDITING EXISITING VEHICLE
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
						<td class="driver">${sanitize(default_driver.name)}</td>
						<td class="rut">${sanitize(default_driver.rut)}</td>
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

		if (default_driver !== null) {

			document.querySelector('.content-container.active .create-weight__change-driver-container').setAttribute('data-default-driver', JSON.stringify(default_driver));
			
			let default_driver_in_response = false;
			for (driver of drivers_response.drivers) {
				if (driver.id === default_driver.id) {
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

		document.querySelectorAll('#create-weight__change-driver__create input').forEach(input => {
			input.addEventListener('input', custom_input_change);
		})
		
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

document.getElementById('menu-user').addEventListener('click', () => {

	const container = document.createElement('div');
	container.id = 'user-profile-module';
	container.innerHTML = `
		<div class="content-container">
			<div class="content">
				<div id="user-profile__content" class="create-document-absolute">
					<div class="header">
						<h3>PREFERENCIAS USUARIO</h3>
					</div>
					<div class="body">

						<div id="user-profile__preferences">
							<div id="user-profile__qz-tray" onclick="(this.querySelector('input').checked) ? this.querySelector('input').checked = false : this.querySelector('input').checked = true;">
								<input class="create-vehicle__active-cbx" type="checkbox" data-prev-tab-selector="#create-vehicle__internal-cbx" data-next-tab-selector="#create-weight__create-vehicle__back-to-create-weight" value="">
								<label class="cbx"></label>
								<label class="lbl">IMPRESORA A PUNTO</label>
							</div>
							<div id="user-profile__tutorial" onclick="(this.querySelector('input').checked) ? this.querySelector('input').checked = false : this.querySelector('input').checked = true;">
								<input class="create-vehicle__active-cbx" type="checkbox" data-prev-tab-selector="#create-vehicle__internal-cbx" data-next-tab-selector="#create-weight__create-vehicle__back-to-create-weight" value="">
								<label class="cbx"></label>
								<label class="lbl">TUTORIAL</label>
							</div>
							<div id="user-profile__session-alive" onclick="(this.querySelector('input').checked) ? this.querySelector('input').checked = false : this.querySelector('input').checked = true;">
								<input class="create-vehicle__active-cbx" type="checkbox" data-prev-tab-selector="#create-vehicle__internal-cbx" data-next-tab-selector="#create-weight__create-vehicle__back-to-create-weight" value="">
								<label class="cbx"></label>
								<label class="lbl">MANTENER SESION ACTIVA</label>
							</div>
						</div>

						<div id="user-profiles__footer-btns">

							<div id="user-profile__close-session">
								<div>
									<i class="far fa-user-lock"></i>
								</div>
								<div>
									<p>CAMBIAR<br>PASSWORD</p>
								</div>
							</div>

							<div id="user-profile__close-session">
								<div>
									<i class="far fa-user-times"></i>
								</div>
								<div>
									<p>CERRAR<br>SESION</p>
								</div>
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

	container.querySelector('#user-profile__cancel-btn').addEventListener('click', async () => {

		if (clicked) return;
		prevent_double_click();
		container.remove();

	});

	container.querySelector('#user-profile__accept-btn').addEventListener('click', async function() {

		const btn = this;
		if (btn_double_clicked(btn)) return;

		const data = {
			qz_tray: container.querySelector('#user-profile__qz-tray input').checked,
			tutorial: container.querySelector('#user-profile__tutorial input').checked
		}

		try {

			const
			save_preferences = await fetch('/save_user_preferences', {
				method: 'POST',
				headers: {
					"Content-Type" : "application/json",
					"Authorization" : token.value
				},
				body: JSON.stringify({data})
			}),
			response = await save_preferences.json();

			if (response.error !== undefined) throw response.error;
			if (!response.success) throw 'Success response from server is false.';

			console.log(response)

			token.value = response.token;
        	token.expiration = jwt_decode(token.value).exp;

			document.querySelector('#user-profile__cancel-btn').click();

		} catch(e) { error_handler('Error al guardar preferencias de usuario.', e) }
	});

	document.getElementById('main__content').prepend(container);

})

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
				"Cache-Control" : "no-cache", 
				"Authorization" : session_token 
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
			const template = await (await fetch('/templates/template-documents.html')).text();
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

		if (!!active_container) {
			
			while (animating) await delay(10);

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

		document.querySelector('#clients__breadcrumb').addEventListener('click', async function() {

			if (clicked || this.children.length < 2) return;
			prevent_double_click();

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

if (screen_width < 768) {
	
	document.getElementById('hamburguer-menu').addEventListener('click', function() {
		this.firstElementChild.classList.toggle('active');
		document.getElementById('left__menu').classList.toggle('active');
	});

}

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

(async () => {
	try {
		await load_css('css/main.css');
	} catch(e) { error_handler('No se pudo cargar recurso.', e) }
})();

document.querySelectorAll('input').forEach(input => { input.value = '' });