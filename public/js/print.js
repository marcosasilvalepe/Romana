/*** NUMBER FORMATER ***/
function thousand_separator(num) { return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.') }

function print_spaces(description, description_value, total_spaces) {
    
    const left_spaces = total_spaces - description.length - description_value.length;

    let empty_spaces = '';
    for (let i = 0; i < left_spaces; i++) { empty_spaces += ' ' }

    return empty_spaces;
}

function print_body_string_spaces(spaces_amount) {
    let spaces = '';
    for (let i = 0; i < spaces_amount; i++) { spaces += ' ' }
    return spaces;
}

function print_body_string(product, cut, kg_inf, kilos) {
                //'0         1         2         3         4         5         6         7         ',
                //'01234567890123456789012345678901234567890123456789012345678901234567890123456789',
    //const str = 'Uva Sweet Celebration - IFG 3             Packing     $1.200    38.590    38.590';

    /*
    const
    product = 'Uva Sweet Celebration - IFG 3', //29
    cut = 'Packing', //7
    price = '$1.200', //6
    kg_inf = '38.590', //6
    kilos = '38.590', //6 
    */
    const
    total_spaces_to_cut = 39,
    spaces_to_cut = print_body_string_spaces(total_spaces_to_cut - product.length), //13
    total_spaces_to_kg_inf = 55,
    spaces_to_kg_inf = print_body_string_spaces(total_spaces_to_kg_inf - product.length - spaces_to_cut.length - cut.length),
    total_spaces_to_kilos = 70,
    spaces_to_kilos = print_body_string_spaces(total_spaces_to_kilos - product.length - spaces_to_cut.length - cut.length - spaces_to_kg_inf.length - kg_inf.length);

    return product + spaces_to_cut + cut + spaces_to_kg_inf + kg_inf + spaces_to_kilos + kilos;
}

function reduce_string_length(str, max_length) {

    while (str.length > max_length) { str = str.substring(0, str.length - 1) }
    return str;
}

function proper_case(str) {
    let upper = true
    let newStr = ""
    for (let i = 0, l = str.length; i < l; i++) {
        if (str[i] == ' ') {
            upper = true;
            newStr += str[i];
            continue;
        }
        newStr += upper ? str[i].toUpperCase() : str[i].toLowerCase();
        upper = false;
    }
    return newStr;
}

function format_print_weight_date(date) {

    if (date.length === 0) return '';

    const
    date_split = date.split(' '),
    new_date = date_split[0],
    hour = date_split[1].substring(0, date_split[1].length - 3);

    const 
    date_array = new_date.split('-'),
    day = date_array[0],
    month = date_array[1],
    year = date_array[2].substring(2, 4);

    return `${day}/${month}/${year} ${hour}`;
}

function print_header_weight_line(truck_weight, containers_weight, net_weight) {

    truck_weight = thousand_separator(truck_weight);
    containers_weight = (containers_weight === ' Neto S/Envases') ? containers_weight : thousand_separator(containers_weight) + ',000';
    net_weight = thousand_separator(net_weight);

    //SET STRING LENGTH TO FIXED
    while (truck_weight.length < 6) { truck_weight = ' ' + truck_weight }

    while (containers_weight.length < 10) { containers_weight = ' ' + containers_weight }

    while (net_weight.length < 6) { net_weight = ' ' + net_weight }

    //GENERATE SPACES
    let spaces_to_containers = '';
    while (truck_weight.length + spaces_to_containers.length < 9) { spaces_to_containers += ' ' }

    let spaces_to_net = '';
    while (containers_weight.length + spaces_to_net.length < 18) { spaces_to_net += ' ' }

    let spaces_to_weight_kilos = '';
    while (net_weight.length + spaces_to_weight_kilos.length < 16) { spaces_to_weight_kilos += ' ' }


    return truck_weight + spaces_to_containers + containers_weight + spaces_to_net + net_weight + spaces_to_weight_kilos;
}

function build_doc_first_line_string(doc_type, doc_number, entity, product, kilos) {

    if (doc_number === null) doc_number = 0;
    
    if (entity === null) entity = '';
    else entity = reduce_string_length(entity, 21).toUpperCase();

    product = reduce_string_length(product, 32);

    if (kilos === null) kilos = '';
    else kilos = kilos.toString();

    const doc = ' ' + doc_type + doc_number;

    let spaces_to_entity = '';
    while (doc.length + spaces_to_entity.length < 16) { spaces_to_entity += ' ' }

    let spaces_to_product = '';
    while (doc.length + spaces_to_entity.length + entity.length + spaces_to_product.length < 41) { spaces_to_product += ' ' }

    let spaces_to_kilos = '';
    while (doc.length + spaces_to_entity.length + entity.length + spaces_to_product.length + product.length + spaces_to_kilos.length < 75) { spaces_to_kilos += ' ' }

    //ADD SPACES TO KILOS
    while (kilos.length < 5) { kilos = ' ' + kilos }

    return doc + spaces_to_entity + entity + spaces_to_product + product + spaces_to_kilos + kilos;
}

function build_doc_second_line_string(branch, container_name, container_amount) {

    if (branch === null) branch = '';
    else branch = reduce_string_length(branch, 21);

    if (container_name === null) container_name = '';
    else container_name = reduce_string_length(container_name, 32);

    if (container_amount === null) container_amount = '0';
    else container_amount = container_amount.toString();

    const initial_spaces = '                ';

    let spaces_to_container = '';
    while (initial_spaces.length + branch.length + spaces_to_container.length < 41) { spaces_to_container += ' ' }

    let spaces_to_amount = '';
    while (initial_spaces.length + branch.length + spaces_to_container.length + container_name.length + spaces_to_amount.length < 75) { spaces_to_amount += ' ' }

    //FORMAT CONTAINER AMOUNT
    while (container_amount.length < 5) { container_amount = ' ' + container_amount }

    return initial_spaces + branch.toUpperCase() + spaces_to_container + container_name.toUpperCase() + spaces_to_amount + container_amount;
}

function print_with_dot_matrix(config) {
    return new Promise((resolve, reject) => {

        try {
            console.log(weight_object)
            const 
            weight = weight_object,
            line_jump = '\x0A',
            now = new Date().toLocaleString('es-CL'),
            secondary_plates = (weight.secondary_plates === null) ? '' : weight.secondary_plates,
            transport = (weight.transport.name === null) ? 'EXTERNO' : weight.transport.name,
            spaces_to_secondary_plates = print_spaces(` Transportista  `, transport, 61);
    
            let cycle;
            if (weight.cycle.id === 1) cycle = 'Recepci¢n';
            else if (weight.cycle.id === 2) cycle = 'Despacho';
            else if (weight.cycle.id === 3) cycle = 'Interno';
            else cycle = 'Servicio';
    
            const
            gross = weight.gross_weight,
            tare = weight.tare_weight,
            tare_date = (tare.date === null) ? format_print_weight_date('') : format_print_weight_date(tare.date),
            spaces_to_gross_date = print_spaces(' Fecha - Hora  ', tare_date, 48),
            gross_date = (gross.date === null) ? format_print_weight_date('') : format_print_weight_date(gross.date),
            tare_user = (tare.user.id === null) ? '' : tare.user.name.toUpperCase(),
            gross_user = (gross.user.id === null) ? '' : gross.user.name.toUpperCase(),
            spaces_to_gross_user = print_spaces(' Operador      ', tare_user, 48),
            driver = (weight.driver.name === null) ? '' : weight.driver.name.toUpperCase(),
            spaces_to_gross_driver = print_spaces(' Chofer        ', driver, 48);

            const 
            gross_weight_line = print_header_weight_line(gross.brute, gross.containers_weight, gross.net),
            tare_weight_line = print_header_weight_line(tare.brute, tare.containers_weight, tare.net),
            net_weight_line = print_header_weight_line(gross.brute - tare.brute, ' Neto S/Envases', gross.net - tare.net);

            let 
            corrected_net = 'Neto Corregido ', 
            informed_net = 'Neto Informado ', 
            difference = 'Diferencia     ';
    
            let
            corrected_net_value = thousand_separator(weight.final_net_weight),
            informed_net_value = thousand_separator(weight.kilos.informed),
            difference_value = thousand_separator(weight.final_net_weight - weight.kilos.informed);
            
            //PRINT SPACES
            while (corrected_net_value.length < 6) { corrected_net_value = ' ' + corrected_net_value }
            while (informed_net_value.length < 6) { informed_net_value = ' ' + informed_net_value }
            while (difference_value.length < 6) { difference_value = ' ' + difference_value }

            corrected_net = corrected_net + corrected_net_value;
            informed_net = informed_net + informed_net_value;
            difference = difference + difference_value;

            data = [
                `                         Ticket de Pesaje Nø${weight.frozen.id}` + '\r\n',
                `                            Impreso ${format_print_weight_date(now)}` + '\r\n',
                line_jump,
                ` Patente        ${weight.frozen.primary_plates}` + '\r\n',
                ` Ciclo          ${cycle}` + '\r\n',
                ' Empresa           78.447.760-6   Sociedad Comercial Lepefer y Cia Ltda.' + '\r\n',
                ' Direcci¢n      Callejon El Convento s/n' + '\r\n',
                ` Transportista  ${transport}` + spaces_to_secondary_plates + `Acoplado ${secondary_plates}` + '\r\n',
                line_jump,
                ' Informaci¢n Tara                               Informaci¢n Pesaje Bruto' + '\r\n',
              //'0         1         2         3         4         5         6         7         ',
              //'01234567890123456789012345678901234567890123456789012345678901234567890123456789',
                ' Fecha - Hora  ' + tare_date + spaces_to_gross_date + gross_date + '\r\n',
                ' Operador      ' + tare_user + spaces_to_gross_user +  gross_user + '\r\n',
                ' Chofer        ' + driver + spaces_to_gross_driver + driver + '\r\n',
                line_jump,
                ' Peso (Kg)    Cami¢n      Envases   Sin Envases' + '\r\n',
                ' Bruto        ' + gross_weight_line + corrected_net + '\r\n',
                ' Tara         ' + tare_weight_line + informed_net + '\r\n',
                ' Neto         ' + net_weight_line + difference + '\r\n',
                ' Detalle' + '\r\n',
                ' Tipo/NøDoc     Origen/Sucursal          Producto / Envase                  Cant' + '\r\n'
            ];
        
            const doc_type = (weight.cycle.id === 2) ? 'GDD' : 'GDR';

            weight.documents.forEach(doc => {
                doc.rows.forEach(row => {
    
                    if (row.product.name !== null && row.product.cut === null) throw `Descarte para ${row.product.name} no ha sido seleccionado en documento.`;
                    const product = (row.product.name === null) ? '' : row.product.name + ' ' + row.product.cut;
    
                    data.push(
                        build_doc_first_line_string(doc_type, doc.number, doc.client.entity.name, product, row.product.kilos) + '\r\n',
                        build_doc_second_line_string(doc.client.branch.name, row.container.name, row.container.amount) + '\r\n'
                    );

                });
            });
        
            data.forEach(row => { console.log(row) })
return
            //PRINT
            qz.print(config, data);
            return resolve();

        } catch(error) { error_handler('Error al intentar imprimir pesaje.', error); return reject() }
    })
}

function print_with_browser(weight) {
  	return new Promise(async (resolve, reject) => {
		try {
			
			//TOP ROW
			document.querySelector('#print-ticket > p:first-child').innerText = `Ticket de Pesaje ${thousand_separator(weight.frozen.id)}`;
			document.querySelector('#print-ticket > p:last-child').innerText = `Impreso ${new Date().toLocaleString('es-CL')}`;
			
			//HEADER LEFT SIDE
			document.querySelector('#print-weight-cycle').innerText = weight.cycle.name;
			document.querySelector('#print-weight-plates').innerText = (weight.secondary_plates === null) ? weight.frozen.primary_plates : weight.frozen.primary_plates + ' - ' + weight.secondary_plates;
			document.querySelector('#print-weight-driver').innerText = weight.driver.name;

			//HEADER RIGHT SIDE
			document.querySelector('#print-kilos').innerText = thousand_separator(weight.final_net_weight) + ' KG';
			document.querySelector('#print-kg-inf').innerText = thousand_separator(weight.kilos.informed) + ' KG';
			document.querySelector('#print-kilos-difference').innerText = thousand_separator(weight.final_net_weight - weight.kilos.informed) + ' KG';

			//GROSS WEIGHT DATA
			document.querySelector('#print-gross-date').innerText = (weight.gross_weight.date === null) ? '' : weight.gross_weight.date;
			document.querySelector('#print-gross-user').innerText = (weight.gross_weight.user.name === null) ? '' : weight.gross_weight.user.name;
			document.querySelector('#print-gross-brute').innerText = thousand_separator(weight.gross_weight.brute) + ' KG';
			document.querySelector('#print-gross-containers').innerText = thousand_separator(weight.gross_weight.containers_weight) + ' KG';
			document.querySelector('#print-gross-net').innerText = thousand_separator(weight.gross_weight.net) + ' KG';

			//TARE WEIGHT DATA
			document.querySelector('#print-tare-date').innerText = (weight.tare_weight.date === null) ? '' : weight.tare_weight.date;
			document.querySelector('#print-tare-user').innerText = (weight.tare_weight.user.name === null) ? '' : weight.tare_weight.user.name;
			document.querySelector('#print-tare-brute').innerText = thousand_separator(weight.tare_weight.brute) + ' KG';
			document.querySelector('#print-tare-containers').innerText = thousand_separator(weight.tare_weight.containers_weight) + ' KG';
			document.querySelector('#print-tare-net').innerText = thousand_separator(weight.tare_weight.net) + ' KG';

			//DOCUMENTS
			weight.documents.forEach(doc => {

				const print_document = document.createElement('div');
				document.getElementById('print-documents').appendChild(print_document);
				print_document.className = 'print-document grid-row';
				print_document.innerHTML = `
					<div class="print-document-header grid-row">
						<div class="grid-row">
							<p></p>
							<p></p>
						</div>
						<p></p>
						<p></p>
					</div>
					<div class="print-document-body grid-row">
						<div class="grid-column">
							<p>Producto</p>
							<p>Descarte</p>
							<p>Kg. Inf.</p>
							<p>Kilos</p>
                            <p>Envases</p>
						</div>
					</div>
				`;
                //<div>----------------------------------------------------------------------------------------------------------------------------------------------------------</div>
				print_document.querySelector('.print-document-header .grid-row p:first-child').innerHTML = (doc.number === null) ? '<b>Nº Doc:</b> -' : '<b>Nº Doc:</b> ' + DOMPurify().sanitize(thousand_separator(doc.number));
				
				//DOCUMENT DATE
				let doc_date;
				if (doc.date === null) doc_date = '<b>Fecha Doc:</b> -';
				else {
					const 
					date = new Date(doc.date.split('T')[0]),
					doc_year = date.getFullYear(),
					doc_month = (date.getMonth() + 1 < 10) ? '0' + (date.getMonth() + 1) : date.getMonth() + 1,
					doc_day = (date.getDate() + 1 < 10) ? '0' + (date.getDate() + 1) : date.getDate() + 1;
					doc_date = DOMPurify().sanitize(doc_day + '-' + doc_month + '-' + doc_year);
				}
				print_document.querySelector('.print-document-header .grid-row p:last-child').innerHTML = '<b>Fecha Doc:</b> ' + doc_date;

				//ORIGIN AND DESTINATION
				let origin, destination;
				if (weight.cycle.id === 1) {
					origin = '<b>Origen:</b> ' + doc.client.entity.name + ' - ' + doc.client.branch.name;
					destination = '<b>Destino:</b> ' + doc.internal.entity.name + ' - ' + doc.internal.branch.name;
				} else {
					origin = '<b>Origen:</b> ' + doc.internal.entity.name + ' - ' + doc.internal.branch.name;
					destination = '<b>Destino:</b> ' + doc.client.entity.name + ' - ' + doc.client.branch.name;
				}
				print_document.querySelector('.print-document-header > p:nth-child(2)').innerHTML = origin;
				print_document.querySelector('.print-document-header > p:last-child').innerHTML = destination;

				//DOCUMENT BODY
				doc.rows.forEach(row => {

					const grid_column = document.createElement('div');
					grid_column.className = 'grid-column';
					grid_column.innerHTML = `
						<p class="product"></p>
						<p class="cut"></p>
						<p class="kg-inf"></p>
						<p class="kilos"></p>
						<p class="containers"></p>
					`;
					
					grid_column.querySelector('.containers').innerText = (row.container.code === null) ? '-' : thousand_separator(row.container.amount) + ' ' + row.container.name;
					grid_column.querySelector('.product').innerText = (row.product.name === null) ? '-' : row.product.name;
					grid_column.querySelector('.cut').innerText = (row.product.cut === null) ? '-' : row.product.cut;
					
					let kilos, kg_inf;
					if (weight.cycle.id === 1) {
						kilos = (row.product.kilos === null) ? '-' : thousand_separator(row.product.kilos) + ' KG';
						kg_inf = (row.product.informed_kilos === null) ? '-' : thousand_separator(row.product.informed_kilos) + ' KG';
					} else {
						kilos = row.product.informed_kilos;
						kg_inf = row.product.kilos;
					}
					grid_column.querySelector('.kg-inf').innerText = kg_inf;
					grid_column.querySelector('.kilos').innerText = kilos;
					
					print_document.querySelector('.print-document-body').appendChild(grid_column);
				});
				
			});
			resolve();
		} catch(error) { console.log(`Error. ${error}`); reject() }
  	});
}

function test(weight) {
    
    const 
    line_jump = '\n\n',
    total_spaces = 43,
    left_spaces = 15,
    cycle_spaces = print_spaces('Ciclo', weight.cycle.name, total_spaces, left_spaces),
    plates = (weight.secondary_plates === null) ? weight.frozen.primary_plates : weight.frozen.primary_plates + ' - ' + weight.secondary_plates,
    plates_spaces = print_spaces('Patente', plates, total_spaces, left_spaces),
    driver = reduce_string_length(weight.driver.name, 25),
    driver_spaces = print_spaces('Chofer', driver, total_spaces, left_spaces),
    gross_date = (weight.gross_weight.date === null) ? '' : weight.gross_weight.date,
    gross_date_spaces = print_spaces('Fecha', gross_date, total_spaces, left_spaces),
    gross_user = (weight.gross_weight.user.name === null) ? '' : weight.gross_weight.user.name,
    gross_user_spaces = print_spaces('Operador', gross_user, total_spaces, left_spaces),
    tare_date = (weight.tare_weight.date === null) ? '' : weight.tare_weight.date,
    tare_user = (weight.tare_weight.user.name === null) ? '' : weight.tare_weight.user.name,
    gross_brute = thousand_separator(weight.gross_weight.brute) + ' KG',
    gross_brute_spaces = print_spaces('Peso Vehiculo', gross_brute, total_spaces, left_spaces),
    gross_containers = thousand_separator(weight.gross_weight.containers_weight) + ' KG',
    gross_containers_spaces = print_spaces('Peso Envases', gross_containers, total_spaces, left_spaces),
    gross_net = thousand_separator(weight.gross_weight.net) + ' KG',
    gross_net_spaces = print_spaces('Peso Neto', gross_net, total_spaces, left_spaces);

    data = [
        `                         Ticket de Pesaje Nº ${thousand_separator(weight.frozen.id)}`,
        `                         Impreso ${new Date().toLocaleString('es-CL')}`,
        line_jump,
        'Empresa        78.447.760-6 - Sociedad Comercial Lepefer y Cia. Ltda.',
      //'0         1         2         3         4         5         6         7         ',
      //'01234567890123456789012345678901234567890123456789012345678901234567890123456789',
      //`Ciclo          Despacho                    Neto Final     38.590 KG` + '\x0A',
        'Ciclo          ' + weight.cycle.name + cycle_spaces + 'Neto Final     ' + thousand_separator(weight.final_net_weight) + ' KG',
        
      //`Patente        VB3427 - JF4701             Neto Inf.      0 KG` + '\x0A',
        'Patente        ' + plates + plates_spaces + 'Neto Inf.      ' + thousand_separator(weight.kilos.informed) + ' KG',

      //`Chofer         Felipe Ojeda Quijanes       Diferencia     38.590 KG` + '\x0A',
        'Chofer         ' + driver + driver_spaces + 'Diferencia     ' + thousand_separator(weight.final_net_weight - weight.kilos.informed) + ' KG',

        line_jump,
        'INFORMACION PESO BRUTO                     INFORMACION PESO TARA',
      //`Fecha          23/02/2021 12:01:20         Fecha          23/02/2021 18:11:45` + '\x0A',
        'Fecha          ' + gross_date + gross_date_spaces + 'Fecha          ' + tare_date,

      //`Operador       MARCOS                      Operador       FELIPE` + '\x0A',
        'Operador       ' + gross_user + gross_user_spaces + 'Operador       ' + tare_user,

      //`Peso Vehiculo  55.790 KG                   Peso Vehiculo  13.690 KG` + '\x0A',
        'Peso Vehiculo  ' + gross_brute + gross_brute_spaces + 'Peso Vehiculo  ' + thousand_separator(weight.tare_weight.brute + ' KG'),

      //`Peso Envases   3.510 KG                    Peso Envases   0 KG` + '\x0A',
        'Peso Envases   ' + gross_containers + gross_containers_spaces + 'Peso Envases   ' + thousand_separator(weight.tare_weight.containers_weight) + ' KG',

      //`Peso Neto      52.280 KG                   Peso Neto      13.690 KG` + '\x0A',
        'Peso Neto      ' + gross_net + gross_net_spaces + 'Peso Neto      ' + thousand_separator(weight.tare_weight.net) + ' KG',

        line_jump
      //'0         1         2         3         4         5         6         7         ',
      //'01234567890123456789012345678901234567890123456789012345678901234567890123456789',
      //`Nº Doc: 162.456      Fecha Doc: 26-02-2021` + `\x0A`,
      //`Origen: Servicios Agricolas Cumbre - Huelquen` + line_jump,
      //`Destino: Soc. Comercial Lepefer y Cia. Ltda - Secado El Convento`,
      //'0         1         2         3         4         5         6         7         ',
      //'01234567890123456789012345678901234567890123456789012345678901234567890123456789',
      //`PRODUCTO / ENVASES                        DESCARTE    PRECIO    KG INF.   KILOS` + `\x0A`,
      //`25 Bins Plasticos Azul Con Marcado VL` + `\x0A`,
      //`Uva Sweet Celebration - IFG 3             Packing     $1.200    38.590    38.590` + `\x0A`,
      //`---` + `\x0A`,
      //`19 Bins Plasticos Gris` + `\x0A`,
      //`Uva IFG 14 - Sweet Saphire                Packing     $290      12.450    13.320` + `\x0A`,
      //`---` + `\x0A`,
      //`29 Bins Plasticos Gris` + `\x0A`,
      //`Uva Flame                                 Packing     $250      22.440    32.520` + `\x0A`,
      //`------------------------------------------`
    ];

    weight.documents.forEach(doc => {

        const 
        doc_number = (doc.number === null) ? '' : thousand_separator(doc.number),
        doc_number_spaces = print_spaces('Nº Doc: ', doc_number, 21, 8);

        //DOCUMENT DATE
        let doc_date;
        if (doc.date === null) doc_date = 'Fecha Doc: -';
        else {
            const 
            date = new Date(doc.date.split('T')[0]),
            doc_year = date.getFullYear(),
            doc_month = (date.getMonth() + 1 < 10) ? '0' + (date.getMonth() + 1) : date.getMonth() + 1,
            doc_day = (date.getDate() + 1 < 10) ? '0' + (date.getDate() + 1) : date.getDate() + 1;
            doc_date = 'Fecha Doc: ' + DOMPurify().sanitize(doc_day + '-' + doc_month + '-' + doc_year);
        }
        
        //ORIGIN AND DESTINATION
        let origin, destination;
        if (weight.cycle.id === 1) {
            origin = reduce_string_length('Origen: ' + doc.client.entity.name + ' - ' + doc.client.branch.name, 80);
            destination = reduce_string_length('Destino: ' + doc.internal.entity.name + ' - ' + doc.internal.branch.name, 80);
        } else {
            origin = reduce_string_length('Origen: ' + doc.internal.entity.name + ' - ' + doc.internal.branch.name, 80);
            destination = reduce_string_length('Destino: ' + doc.client.entity.name + ' - ' + doc.client.branch.name);
        }

        data.push(
          //`Nº Doc: 162.456      Fecha Doc: 26-02-2021` + `\x0A`,
            'Nº Doc: ' + doc_number + doc_number_spaces + doc_date,
            origin,
            destination,
            '\n',
          //'0         1         2         3         4         5         6         7         ',
          //'01234567890123456789012345678901234567890123456789012345678901234567890123456789',
            `ENVASES / PRODUCTO                     DESCARTE     PRECIO     KG INF.    KILOS`
        );

        doc.rows.forEach(row => {

            const 
            containers = (row.container.code === null) ? '' : reduce_string_length(thousand_separator(row.container.amount) + ' ' + row.container.name, 39),
            product = (row.product.name === null) ? '' : row.product.name,
            cut = (row.product.cut === null) ? '' : proper_case(row.product.cut),
            price = (row.product.cut === null) ? '' : '$' + thousand_separator(row.product.price);

            let kilos, kg_inf;
            if (weight.cycle.id === 1) {
                kilos = (row.product.kilos === null) ? '' : thousand_separator(row.product.kilos);
                kg_inf = (row.product.informed_kilos === null) ? '' : thousand_separator(row.product.informed_kilos);
            } else {
                kilos = (row.product.informed_kilos === null) ? '' : thousand_separator(row.product.informed_kilos);
                kg_inf = (row.product.kilos === null) ? '' : thousand_separator(row.product.kilos);
            }
            data.push(containers, print_body_string(product, cut, price, kg_inf, kilos), '---');
        });
        
        //REMOVE LAST --- ROW SEPARATOR IN DOCUMENT
        data.splice(data.length - 1, 1);
        data.push('------------------------------------------')

    });
    
    //REMOVE LAST ----- DOCUMENT SEPARATOR
    data.splice(data.length - 1, 1);

    data.forEach(d => {
        console.log(d)
    })
}