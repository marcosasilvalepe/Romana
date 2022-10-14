//WEIGHT AND DOCUMENT OBJECTS STUFF
export let weight_object, document_object, watch_document;
export const weight_objects_array = [], document_objects_array = [];

//WEIGHT OBJECT
export class create_weight_object {

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
			driver_id = DOMPurify().sanitize(driver_id);
			const weight_id = DOMPurify().sanitize(this.frozen.id);
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
			doc_id = DOMPurify().sanitize(doc_id);
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
				weight_id = DOMPurify().sanitize(this.frozen.id),
				process = DOMPurify().sanitize(this.process),
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
}

//DOCUMENT OBJECT
export class create_document_object {

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

				const rows = doc_data.rows;
				for (let i = 0; i < rows.length; i++) {
					
					if (rows[i].product.code === 'GEN') {

						const traslado_description = await get_traslado_description(rows[i].id);
						console.log(traslado_description)
						data.push(`              ${replace_spanish_chars(traslado_description.toUpperCase())}` + '\r\n', '\r\n');

					} else {

						const 
						product_name = (rows[i].product.name === null) ? '' : rows[i].product.name,
						product_cut = (rows[i].product.cut === null) ? '' : rows[i].product.cut,
						product_amount = (rows[i].product.kilos === null) ? '' : thousand_separator(rows[i].product.kilos),
						product_price = (rows[i].product.price === null) ? '' : '$' + thousand_separator(rows[i].product.price) + '+IVA',
						product = 'KG ' + product_name.toUpperCase() + ' DESCARTE ' + product_cut.toUpperCase();
	
						if (product_name.length > 0) {
							const product_line = print_doc_body_string(product_amount, product, product_price);
							data.push(product_line + '\r\n');
						}
	
						const
						container_amount = (rows[i].container.amount === null) ? '' : thousand_separator(rows[i].container.amount),
						container_name = (rows[i].container.name === null) ? '' : rows[i].container.name.toUpperCase();
	
						if (container_name.length > 0) {
							const container_line = '      ' + container_amount + print_doc_spaces(7, container_amount, 15) + container_name;
							data.push(container_line + '\r\n');
						}
	
						if (product_name.length > 0 || container_name.length > 0) data.push('\r\n');
					}

					total_containers += 1 * rows[i].container.amount;
					total_kilos += 1 * rows[i].product.kilos;

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
			doc_number = DOMPurify().sanitize(doc_number);
			const doc_id = DOMPurify().sanitize(this.frozen.id);

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
			doc_date = DOMPurify().sanitize(doc_date + ' 00:00:00');
			const doc_id = DOMPurify().sanitize(this.frozen.id);
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

			client_id = DOMPurify().sanitize(client_id);
			const document_id = DOMPurify().sanitize(this.frozen.id);
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
			
			branch_id = DOMPurify().sanitize(branch_id);

			const
			doc_number = DOMPurify().sanitize(document_object.number),
			document_id = DOMPurify().sanitize(this.frozen.id),
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
			target_id = DOMPurify().sanitize(target_id);
			target_table = DOMPurify().sanitize(target_table);
			const document_id = DOMPurify().sanitize(this.frozen.id);

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

	constructor(doc) {
		this.frozen = doc.frozen
		Object.freeze(this.frozen);
		this.number = doc.number;
		this.date = doc.date;
		this.sale = doc.sale;
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
}

//ROW OBJECT FOR DOCUMENT OBJECT
export class document_row {

	update_product(code) {
		if (!weight_object.active.edit) return;
		return new Promise( async (resolve, reject) => {

			code = DOMPurify().sanitize(code.trim());
			const row_id = DOMPurify().sanitize(this.id);

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

			cut = DOMPurify().sanitize(cut);
			const 
			row_id = this.id,
			product_code = this.product.code,
			entity_id = DOMPurify().sanitize(document_object.client.entity.id);

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
			price = DOMPurify().sanitize(price);
			const row_id = DOMPurify().sanitize(this.id);

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
			kilos = DOMPurify().sanitize(kilos);
			const row_id = DOMPurify().sanitize(this.id);
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

			code = DOMPurify().sanitize(code.trim());
			const row_id = DOMPurify().sanitize(this.id);
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

			amount = DOMPurify().sanitize(amount);
			const row_id = DOMPurify().sanitize(this.id);
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

			const row_id = DOMPurify().sanitize(this.id);
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
				return resolve(true);
			} catch(error) { error_handler('Error al anular fila en documento en /annul_row', error); return reject(error) }
		})
	}

	constructor(row) {
		this.id = row.id
		this.product = row.product;
		this.container = row.container;
	}
}