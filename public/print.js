/*** NUMBER FORMATER ***/
function thousand_separator(num) { return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.') }

function print_spaces(description, description_value, total_spaces, spaces_to_description_value) {
    
    const 
    left_spaces = spaces_to_description_value - description.length,
    right_spaces = total_spaces - description.length - description_value.length - left_spaces;

    let empty_spaces = '';
    for (let i = 0; i < right_spaces; i++) { empty_spaces += ' ' }

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
    if (str.length > max_length - 3) return str.substr(0, max_length - 3) + '...';
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

function print_with_dot_matrix(config) {
    return new Promise(resolve => {
        console.log(weight_object)
        const 
        weight = weight_object,
        line_jump = '\x0A' + '\x0A' + '\x0A',
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
            '\x1B' + '\x69' + '\x61' + '\x00' + '\x1B' + '\x40', // set printer to ESC/P mode and clear memory buffer
            '\x1B' + '\x55' + '\x02', '\x1B' + '\x33' + '\x0F', // set margin (02) and line feed (0F) values)
            '\x1B' + '\x6B' + '\x0B' + '\x1B' + '\x58' + '\x00' + '\x3A' + '\x00', // set font and font size     
            `                         Ticket de Pesaje Nº ${thousand_separator(weight.frozen.id)}` + '\x0A' + '\x0A',
            `                         Impreso ${new Date().toLocaleString('es-CL')}` + '\x0A',
            line_jump,
            'Empresa        78.447.760-6 - Sociedad Comercial Lepefer y Cia. Ltda.' + '\x0A' + '\x0A' + '\x0A',
            'Ciclo          ' + weight.cycle.name + cycle_spaces + 'Neto Final     ' + thousand_separator(weight.final_net_weight) + ' KG' + '\x0A' + '\x0A' + '\x0A',
            'Patente        ' + plates + plates_spaces + 'Neto Inf.      ' + thousand_separator(weight.kilos.informed) + ' KG' + '\x0A' + '\x0A' + '\x0A',
            'Chofer         ' + driver + driver_spaces + 'Diferencia     ' + thousand_separator(weight.final_net_weight - weight.kilos.informed) + ' KG' + '\x0A' + '\x0A' + '\x0A',
            line_jump,
            'INFORMACION PESO BRUTO                     INFORMACION PESO TARA' + '\x0A' + '\x0A' + '\x0A',
            'Fecha          ' + gross_date + gross_date_spaces + 'Fecha          ' + tare_date + '\x0A' + '\x0A' + '\x0A',
            'Operador       ' + gross_user + gross_user_spaces + 'Operador       ' + tare_user + '\x0A' + '\x0A' + '\x0A',
            'Peso Vehiculo  ' + gross_brute + gross_brute_spaces + 'Peso Vehiculo  ' + thousand_separator(weight.tare_weight.brute + ' KG') + '\x0A' + '\x0A' + '\x0A',
            'Peso Envases   ' + gross_containers + gross_containers_spaces + 'Peso Envases   ' + thousand_separator(weight.tare_weight.containers_weight) + ' KG' + '\x0A' + '\x0A' + '\x0A',
            'Peso Neto      ' + gross_net + gross_net_spaces + 'Peso Neto      ' + thousand_separator(weight.tare_weight.net) + ' KG' + '\x0A' + '\x0A' + '\x0A',
            line_jump
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
                'Nº Doc: ' + doc_number + doc_number_spaces + doc_date + '\x0A' + '\x0A' + '\x0A',
                origin + '\x0A' + '\x0A',
                destination + '\x0A' + '\x0A',
                '\n',
                `PRODUCTO / ENVASES                     DESCARTE        KG INF.        KILOS` + '\x0A' + '\x0A' + '\x0A'
            );
    
            doc.rows.forEach(row => {
    
                const 
                containers = (row.container.code === null) ? '' : reduce_string_length(thousand_separator(row.container.amount) + ' ' + row.container.name, 80),
                product = (row.product.name === null) ? '' : reduce_string_length(row.product.name, 36),
                cut = (row.product.cut === null) ? '' : proper_case(row.product.cut);
                
                console.log(row.product)

                let kilos, kg_inf;
                if (weight.cycle.id === 1) {
                    kilos = (row.product.kilos === null) ? '' : thousand_separator(row.product.kilos);
                    kg_inf = (row.product.informed_kilos === null) ? '' : thousand_separator(row.product.informed_kilos);
                } else {
                    kilos = (row.product.informed_kilos === null) ? '' : thousand_separator(row.product.informed_kilos);
                    kg_inf = (row.product.kilos === null) ? '' : thousand_separator(row.product.kilos);
                }
                data.push(print_body_string(product, cut, kg_inf, kilos), '\x0A' + '\x0A', containers, '\x0A' + '\x0A', '---' + '\x0A' + '\x0A');
            });
            
            //REMOVE LAST --- ROW SEPARATOR IN DOCUMENT
            data.splice(data.length - 1, 1);
            data.push('_______________________________________________' + '\x0A' + '\x0A' + '\x0A');
        });
        
        //REMOVE LAST ----- DOCUMENT SEPARATOR
        data.splice(data.length - 1, 1);
    
        data.forEach(row => {
            console.log(row)
        })
        
        //PRINT
        qz.print(config, data);
        resolve();
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