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

    if (kilos === null) kilos = '0';
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

    if (container_name === null) container_name = '0';
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

function print_with_dot_matrix(config, weight) {
    return new Promise((resolve, reject) => {

        try {
            console.log(weight_object)
            const 
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
            tare_user = (tare.user.id === null) ? '' : replace_spanish_chars(tare.user.name.toUpperCase()),
            gross_user = (gross.user.id === null) ? '' : replace_spanish_chars(gross.user.name.toUpperCase()),
            spaces_to_gross_user = print_spaces(' Operador      ', tare_user, 48),
            driver = (weight.driver.name === null) ? '' : replace_spanish_chars(weight.driver.name.toUpperCase()),
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
            corrected_net_value = thousand_separator(parseInt(weight.final_net_weight)),
            informed_net_value = thousand_separator(parseInt(weight.kilos.informed)),
            difference_value = thousand_separator(parseInt(weight.final_net_weight - weight.kilos.informed));
            
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
                ` Patente        ${replace_spanish_chars(weight.frozen.primary_plates)}` + '\r\n',
                ` Ciclo          ${cycle}` + '\r\n',
                ' Empresa           78.447.760-6   Sociedad Comercial Lepefer y Cia Ltda.' + '\r\n',
                ' Direcci¢n      Callejon El Convento s/n' + '\r\n',
                ` Transportista  ${transport}` + spaces_to_secondary_plates + `Acoplado ${replace_spanish_chars(secondary_plates)}` + '\r\n',
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
                
            ];
        
            const doc_type = (weight.cycle.id === 2) ? 'GDD' : 'GDR';

            if (weight.documents.length > 0) 
                data.push(
                    ' Detalle' + '\r\n',
                    ' Tipo/NøDoc     Origen/Sucursal          Producto / Envase                  Cant' + '\r\n'
                );

            weight.documents.forEach(doc => {
                doc.rows.forEach(row => {
                    
                    if (row.product.code === 'GEN') return;

                    if (row.product.name !== null && row.product.cut === null) 
                        throw `Descarte para ${row.product.name} no ha sido seleccionado en documento.`;
                    
                    const product = (row.product.name === null) ? '' : row.product.name + ' ' + row.product.cut;
    
                    data.push(
                        build_doc_first_line_string(doc_type, doc.number, replace_spanish_chars(doc.client.entity.name), product, row.product.kilos) + '\r\n',
                        build_doc_second_line_string(replace_spanish_chars(doc.client.branch.name), row.container.name, row.container.amount) + '\r\n'
                    );

                });
            });
        
            data.forEach(row => { console.log(row) })
            
            //PRINT
            qz.print(config, data);
            return resolve();

        } catch(error) { error_handler('Error al intentar imprimir pesaje.', error); return reject() }
    })
}

function print_with_browser(weight) {
  	return new Promise(async (resolve, reject) => {
		try {
			
			console.log(weight);
            
            const now = new Date().toLocaleString('es-CL');

            let cycle;
            if (weight.cycle.id === 1) cycle = 'Recepción';
            else if (weight.cycle.id === 2) cycle = 'Despacho';
            else if (weight.cycle.id === 3) cycle = 'Interno';
            else cycle = 'Servicio';

            document.getElementById('ticket-number').innerText = `Ticket de Pesaje Nº ${weight.frozen.id}`;
            document.getElementById('printed-date').innerText = `Impreso ${format_print_weight_date(now)}`;

            document.getElementById('primary-plates').innerText = weight.frozen.primary_plates;
            document.getElementById('cycle').innerText = cycle;
            document.getElementById('secondary-plates').innerText = `Acoplado ${(weight.secondary_plates === null) ? '' : weight.secondary_plates}`;

            const
            gross = weight.gross_weight,
            tare = weight.tare_weight;

            document.getElementById('tare-weight-date').innerText = (tare.date === null) ? '' : format_print_weight_date(tare.date);
            document.getElementById('tare-weight-user').innerText = (tare.user.id === null) ? '' : tare.user.name.toUpperCase();

            document.getElementById('gross-weight-date').innerText = (gross.date === null) ? '' : format_print_weight_date(gross.date);
            document.getElementById('gross-weight-user').innerText = (gross.user.id === null) ? '' : gross.user.name.toUpperCase();

            document.querySelectorAll('.weight-driver').forEach(div => {
                div.innerText = (weight.driver.name === null) ? '' : weight.driver.name.toUpperCase();
            });

            document.getElementById('gross-brute').innerText = thousand_separator(gross.brute);
            document.getElementById('tare-brute').innerText = thousand_separator(tare.brute);
            document.getElementById('brute-difference').innerText = thousand_separator(gross.brute - tare.brute);

            document.getElementById('gross-containers').innerText = `${thousand_separator(gross.containers_weight)},000`;
            document.getElementById('tare-containers').innerText = `${thousand_separator(tare.containers_weight)},000`;

            document.getElementById('gross-net').innerText = thousand_separator(gross.net);
            document.getElementById('tare-net').innerText = thousand_separator(tare.net);
            document.getElementById('tare-net').nextElementSibling.innerText = thousand_separator(gross.net - tare.net);

            document.querySelector('#final-net-weight').innerText = (weight.final_net_weight === null) ? 0 : thousand_separator(weight.final_net_weight);
            document.querySelector('#informed-net').innerText = (weight.kilos.informed === null) ? 0 : thousand_separator(weight.kilos.informed);
            document.querySelector('#net-difference').innerText = thousand_separator(weight.final_net_weight - weight.kilos.informed);

            if (weight.documents.length === 0) {
                document.getElementById('documents__detail-line').remove();
                document.getElementById('documents-body__header').remove();
            }

            //CLASSIC VIEW OF WEIGHT TICKET
            if (jwt_decode(token.value).weightView === 1) {
                weight.documents.forEach(doc => {
                    doc.rows.forEach(row => {
                        
                        const div = document.createElement('div');
                        div.innerHTML = `
                            <div class="documents-body__first-column">
                                <div></div>
                                <div></div>
                            </div>
                    
                            <div class="documents-body__second-column">
                                <div></div>
                                <div></div>
                            </div>
                    
                            <div class="documents-body__third-column">
                                <div></div>
                                <div></div>
                            </div>
                
                            <div class="documents-body__fourth-column">
                                <div></div>
                                <div></div>
                            </div>
                        `;
    
                        div.querySelector('.documents-body__first-column > div:first-child').innerText = (doc.number === null) ? '' : 'GDD' + doc.number;
                        
                        div.querySelector('.documents-body__second-column > div:first-child').innerText = (doc.client.entity.id === null) ? '' : reduce_string_length(doc.client.entity.name, 21).toUpperCase();
                        div.querySelector('.documents-body__second-column > div:last-child').innerText = (doc.client.branch.id === null) ? '' : reduce_string_length(doc.client.branch.name, 21).toUpperCase();
                        
                        div.querySelector('.documents-body__third-column > div:first-child').innerText = (row.product.name === null) ? '' : reduce_string_length(row.product.name, 32);
                        div.querySelector('.documents-body__third-column > div:last-child').innerText = (row.container.name === null) ? '' : reduce_string_length(row.container.name, 32);
    
                        div.querySelector('.documents-body__fourth-column > div:first-child').innerText = (row.product.kilos === null) ? 0 : row.product.kilos;
                        div.querySelector('.documents-body__fourth-column > div:last-child').innerText = (row.container.amount === null) ? 0 : row.container.amount;
    
                        document.getElementById('documents-body__body').appendChild(div);
                    });
                });
            }

            //ROWS COLLAPSED BY PRODUCT 
            else {

                console.log('inside')

                document.querySelector('#documents-body').remove();
                document.querySelector('#documents-alternate-view').classList.add('active');

                for (let doc of weight.documents) {

                    let origin_entity, origin_branch, destination_entity, destination_branch;
                    if (weight.cycle.id === 1) {
                        origin_entity = (doc.client.entity.name === null) ? '' : doc.client.entity.name;
                        origin_branch = (doc.client.branch.name === null) ? '' : doc.client.branch.name;
                        destination_entity = (doc.internal.entity.name === null) ? '' : doc.internal.entity.name;
                        destination_branch = (doc.internal.branch.name === null) ? '' : doc.internal.branch.name;
                    } else {
                        origin_entity = (doc.internal.entity.name === null) ? '' : doc.internal.entity.name;
                        origin_branch = (doc.internal.branch.name === null) ? '' : doc.internal.branch.name;
                        destination_entity = (doc.client.entity.name === null) ? '' : doc.client.entity.name;
                        destination_branch = (doc.client.branch.name === null) ? '' : doc.client.branch.name;
                    }
        
                    const 
                    doc_date = (doc.date === null) ? '-' : new Date(doc.date).toLocaleString('es-CL').split(' ')[0].replace(/[,]/gm, ''),
                    doc_number = (doc.number === null) ? '-' : thousand_separator(doc.number);
    
                    //SUM ALL PRODUCTS
                    const products = [];
    
                    for (let row of doc.rows) {
    
                        let product_in_array = false, index;
                        
                        let i = 0;
                        for (let product of products) {
                            if (row.product.code === product.code && row.product.cut === product.cut && row.product.price === product.price) {
                                product_in_array = true;
                                index = i;
                            }
                            i++;
                        }
    
                        //PRODUCT WASN'T FOUND IN ARRAY SO IT GETS PUSHED
                        if (!product_in_array) {
                            index = products.length;
                            products.push({
                                code: row.product.code,
                                containers: 0,
                                cut: row.product.cut,
                                informed_kilos: 0,
                                kilos: 0,
                                name: row.product.name,
                                price: row.product.price
                            });
                        }
    
                        const product = products[index];
                        product.kilos += row.product.kilos;
                        product.informed_kilos += row.product.informed_kilos;
                        product.containers += row.container.amount;
    
                    }
    
                    console.log(products)

                    //CREATE DIVS
                    const doc_container = document.createElement('div');
                    doc_container.className = 'alternate-view-doc';
                    doc_container.innerHTML = `
                        <div class="alternate-view__header">
                            <div class="doc-header">
                                <div class="doc-date"><b>FECHA DOC:</b> ${doc_date}</div>
                                <div class="doc-number"><b>Nº DOC:</b> ${doc_number}</div>
                            </div>
                            <div class="origin">
                                <div class="entity"><b>ORIGEN:</b> ${origin_entity}</div>
                                <div class="branch"><b>SUCURSAL:</b> ${origin_branch}</div>
                            </div>
                            <div class="destination">
                                <div class="entity"><b>DESTINO:</b> ${destination_entity}</div>
                                <div class="branch"><b>SUCURSAL:</b> ${destination_branch}</div>
                            </div>
                            <div class="comments">
                                <p>${(doc.comments === null) ? '' : '<b>COMENTARIOS DOC:</b>' + sanitize(doc.comments.split('\n').join(' - '))}</p>
                            </div>
                        </div>

                        <div class="alternate-view__body">
                            <div>
                                <div class="product">PRODUCTO</div>
                                <div class="cut">DESCARTE</div>
                                <div class="price">PRECIO</div>
                                <div class="containers">ENVASES</div>
                                <div class="kilos">KILOS</div>
                                <div class="informed-kilos">KG. INF.</div>
                                <div class="average">PROMEDIO</div>
                                <div class="total">TOTAL</div>
                            </div>
                        </div>
                    `;

                    let
                    line_counter = 0,
                    total_doc_containers = 0,
                    total_doc_kilos = 0,
                    total_informed_kilos = 0,
                    total_average = 0,
                    doc_total = 0;

                    for (let product of products) {

                        const row_div = document.createElement('div');
                        row_div.innerHTML = `
                            <div class="product">${(product.name === null) ? '-' : product.name}</div>
                            <div class="cut">${(product.cut === null) ? '-' : product.cut}</div>
                            <div class="price">${(product.price === null) ? '-' : `$${thousand_separator(product.price)}`}</div>
                            <div class="containers">${thousand_separator(product.containers)}</div>
                            <div class="kilos">${(product.kilos === 0) ? '-' : thousand_separator(product.kilos) + ' KG'}</div>
                            <div class="informed-kilos">${(product.informed_kilos === 0) ? '-' : thousand_separator(product.informed_kilos) + ' KG'}</div>
                            <div class="average">${(product.informed_kilos === 0) ? '-' : Math.floor((product.informed_kilos / product.containers) * 10) / 10}</div>
                            <div class="total">${(product.informed_kilos === 0) ? '-' : '$' + thousand_separator(product.informed_kilos * product.price)}</div>
                        `;

                        //SUM TOTALS
                        total_doc_containers += 1 * product.containers;
                        total_doc_kilos += 1 * product.kilos;
                        total_informed_kilos += 1 * product.informed_kilos;
                        total_average += 1 * (product.informed_kilos / product.containers);
                        doc_total += 1 * (product.informed_kilos * product.price);
                        
                        if (1 * product.informed_kilos > 0) line_counter++;

                        doc_container.querySelector('.alternate-view__body').appendChild(row_div);
                    }
        
                    document.querySelector('#documents-alternate-view').appendChild(doc_container);

                    //FOOTER ROW FOR TOTALS
                    const hr = document.createElement('hr');
                    const totals_row_div = document.createElement('div');
                    totals_row_div.innerHTML = `
                        <div class="product"></div>
                        <div class="cut"></div>
                        <div class="price">TOTALES</div>
                        <div class="containers">${thousand_separator(total_doc_containers)}</div>
                        <div class="kilos">${thousand_separator(total_doc_kilos)} KG</div>
                        <div class="informed-kilos">${thousand_separator(total_informed_kilos)} KG</div>
                        <div class="average">${Math.floor((total_average / line_counter)* 10) / 10}</div>
                        <div class="total">$${thousand_separator(doc_total)}</div>
                    `;

                    doc_container.querySelector('.alternate-view__body').append(hr, totals_row_div);
                }

            }
            
			return resolve();
		} catch(error) { console.log(`Error. ${error}`); reject() }
  	});
}

(() => {

    if (!!document.querySelector('#print-with-browser-grid')) {

        window.addEventListener('load', async () => {

            const 
            queryString = window.location.search,
            urlParams = new URLSearchParams(queryString),
            weight_id = urlParams.get('weight_id'),
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
            
            await window.load_css('css/print.css');
            await window.print_with_browser(response.weight_object);
    
            //window.document.close(); // necessary for IE >= 10
            window.focus(); // necessary for IE >= 10*/
            window.print();
            window.close();    
        })

    }

})();