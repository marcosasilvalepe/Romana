"use strict";

function companies_create_entities_list() {
    return new Promise(resolve => {

        document.querySelectorAll('#companies__entities-list .table-body tbody tr').forEach(tr => tr.remove());

        for (let company of global.companies) {
            const tr = document.createElement('tr');
            tr.setAttribute('data-company-id', company.id);
            tr.innerHTML = `
                <td class="type">${sanitize(company.type)}</td>
                <td class="rut">${sanitize(company.rut)}</td>
                <td class="name">${sanitize(company.name)}</td>
                <td class="debits">$${thousand_separator(parseInt(company.debits))}</td>
                <td class="credits">$${thousand_separator(parseInt(company.credits))}</td>
                <td class="balance">$${thousand_separator((parseInt(company.balance)))}</td>
            `;
    
            document.querySelector('#companies__entities-list .table-body tbody').appendChild(tr);
        }
        return resolve();
    })
}

function update_companies_list() {
    return new Promise(async (resolve, reject) => {
        try {

            const 
            get_entities = await fetch('/companies_get_clients_list'),
            response = await get_entities.json();

            console.log(response);

            if (response.error !== undefined) throw response.error;
            if (!response.success) throw 'Success response from server is false.';

            global.companies = response.companies;

            await companies_create_entities_list();

            return resolve();

        } catch(e) { error_handler('No se pudo actualizar lista de empresas', e); return reject(e) }
    })
}

function companies_format_last_update_date(date) {
    const 
    days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    last_update = new Date(date),
    day_number = last_update.getDay() - 1,
    month_number = last_update.getMonth(),
    year = last_update.getFullYear(),
    seconds = (last_update.getSeconds() < 10) ? '0' + last_update.getSeconds() : last_update.getSeconds(),
    minutes = (last_update.getMinutes() < 10) ? '0' + last_update.getMinutes() : last_update.getMinutes(),
    hours = (last_update.getHours() < 10) ? '0' + last_update.getHours() : last_update.getHours();
    return `${days[day_number]} ${(last_update.getDate() < 10) ? '0' + last_update.getDate() : last_update.getDate()} de ${months[month_number]} ${year} ${hours}:${minutes}:${seconds}`;
}

async function show_bank_balance_image() {

    const 
    company_div = this.parentElement.parentElement.parentElement.parentElement,
    company_id = parseInt(company_div.getAttribute('data-company-id'));

    try { window.open(`${domain}:3000/companies_get_bank_balance_image?company_id=${company_id}`, 'VER CARTOLA') } 
    catch(e) { error_handler('Error al obtener imagen de cartola.', e) }
}

async function create_new_payment() {

    if (btn_double_clicked(this)) return;

    try {

        const 
        company_id = document.querySelector('#new-payment .header h3').getAttribute('data-company-id'),
        payment_date = document.querySelector('#new-payment__payment-date').value,
        season_select = document.querySelector('#new-payment__season-select'),
        season = season_select.options[season_select.selectedIndex].value,
        payment_select = document.querySelector('#new-payment_payment-type'),
        payment_type = payment_select.options[payment_select.selectedIndex].value,
        entities_select = document.querySelector('#new-payment__internal-entity'),
        internal_entity = entities_select.options[entities_select.selectedIndex].value,
        amount = document.querySelector('#new-payment__amount').value.replace(/\D/gm, ''),
        doc_number = document.querySelector('#new-payment__doc-number').value,
        comments = document.querySelector('#new-payment .new-payment-comments textarea').value;

        if (!validate_date(payment_date) || payment_date.length === 0) throw 'Fecha del pago inválida.'
        if (season.length === 0) throw 'No se ha seleccionado una temporada para el pago.'
        if (payment_type.length === 0) throw 'No se ha seleccionado el tipo de pago.';
        if (internal_entity.length === 0) throw 'No se ha seleccionado la entidad pagadora.'
        if (parseInt(amount) == NaN || amount.length === 0) throw 'El monto a pagar no es válido.';
        if (payment_type === 'CHQ' && doc_number.length === 0) throw 'No se ha ingresado el número del cheque.';

        const data = { company_id, payment_date, season, payment_type, internal_entity, amount, doc_number, comments }
        //SANITIZE OBJECT
        for (let key in data) { data[key] = sanitize(data[key]) }

        const 
        create_payment = await fetch('/create_new_payment', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json"
            },
            body: JSON.stringify(data)
        }),
        response = await create_payment.json();

        console.log(response)

        //UPDATE ROWS
        global.company_movements = response.records.sortBy('date');

        //REMOVE ALL ROWS
        document.querySelectorAll('#companies__entity-movements .table-body tbody tr').forEach(tr => tr.remove());
        
        //CREATE ROWS
        await companies_entity_movements_create_rows();

        document.getElementById('message-container-2').innerHTML = `
			<div id="weight__secondary-plates-updated">
				<i class="fad fa-check"></i>
				<h4>PAGO CREADO<br>CORRECTAMENTE</h4>
			</div>
		`;

        document.querySelector('#new-payment .footer button.red').click();
        await delay(750);

		document.getElementById('message-section-2').classList.add('active');
		await delay(1750);

		document.getElementById('message-section-2').classList.remove('active');
		await delay(600);
		document.getElementById('message-container-2').innerHTML = '';

    }
    catch(e) { error_handler('No se pudo crear el pago', e) }
    finally { animating = false }
}

async function show_new_payment_div(e) {

    if (clicked || animating) return;
    animating = true;

    try {

        const
        get_payment_data = await fetch('/new_payment_get_data'),
        response = await get_payment_data.json();

        console.log(response);

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        const 
        company_id = document.querySelector('#companies__entity-movements .company-name h3').getAttribute('data-company-id'),
        company_name = document.querySelector('#companies__entity-movements > .company-name h3').innerText;

        const payment_div = document.createElement('div');
        payment_div.id = 'new-payment';
        payment_div.className = 'hidden';
        payment_div.innerHTML = `
            <div>
                <div class="header">
                    <h4>NUEVO PAGO</h4>
                    <h3 data-company-id=${parseInt(company_id)}>${sanitize(company_name)}</h3>
                </div>

                <div class="body">
                    
                    <div>
                        <input id="new-payment__payment-date" type="date" class="input-effect has-content">
                        <label>FECHA DEL PAGO</label>
                        <span class="focus-border"></span>
                    </div>

                    <div>
                        <div class="select-effect has-content">
                            <p>SELECCIONAR</p>
                            <select id="new-payment__season-select">
                                <option value="" hidden=""></option>
                            </select>
                            <i class="far fa-chevron-down"></i>
                            <label>TEMPORADA</label>
                            <span class="focus-border"></span>
                        </div>
                    </div>

                    <div>
                        <div class="select-effect has-content">
                            <p>SELECCIONAR</p>
                            <select id="new-payment_payment-type">
                                <option value="" hidden=""></option>
                            </select>
                            <i class="far fa-chevron-down"></i>
                            <label>TIPO DE PAGO</label>
                            <span class="focus-border"></span>
                        </div>
                    </div>

                    <div>
                        <div class="select-effect has-content">
                            <p>SELECCIONAR</p>
                            <select id="new-payment__internal-entity">
                                <option value="" hidden=""></option>
                                
                            </select>
                            <i class="far fa-chevron-down"></i>
                            <label>ENTIDAD PAGADORA</label>
                            <span class="focus-border"></span>
                        </div>
                    </div>

                    <div>
                        <input id="new-payment__amount" type="text" class="input-effect" spellcheck="false">
                        <label>MONTO A PAGAR</label>
                        <span class="focus-border"></span>
                    </div>

                    <div>
                        <input id="new-payment__doc-number" type="text" class="input-effect" spellcheck="false">
                        <label>Nº DOCUMENTO</label>
                        <span class="focus-border"></span>
                    </div>

                    <div class="new-payment-comments">
                        <textarea spellcheck="false" placeholder="Observaciones"></textarea>
                    </div>
                    
                </div>

                <div class="footer">
                    <button class="svg-wrapper enabled red">
                        <svg height="45" width="160" xmlns="http://www.w3.org/2000/svg">
                            <rect class="shape" height="45" width="160"></rect>
                        </svg>
                        <div class="desc-container">
                            <i class="fas fa-times-circle"></i>
                            <p>CANCELAR</p>
                        </div>
                    </button>

                    <button class="svg-wrapper enabled green" >
                        <svg height="45" width="160" xmlns="http://www.w3.org/2000/svg">
                            <rect class="shape" height="45" width="160"></rect>
                        </svg>
                        <div class="desc-container">
                            <i class="fad fa-money-check-alt"></i>
                            <p>CREAR PAGO</p>
                        </div>
                    </button>
                </div>

            </div>
        `;

        document.querySelector('#companies > .content').appendChild(payment_div);

        for (let season of response.seasons) {
            const option = document.createElement('option');
            option.setAttribute('value', season.id);
            option.innerText = season.name.toUpperCase();
            document.querySelector('#new-payment__season-select').appendChild(option);
        }

        for (let payment of response.payment_types) {
            const option = document.createElement('option');
            option.setAttribute('value', payment.code);
            option.innerText = payment.name.toUpperCase();
            document.querySelector('#new-payment_payment-type').appendChild(option);
        }

        for (let entity of response.entities) {
            const option = document.createElement('option');
            option.setAttribute('value', entity.id);
            option.innerText = entity.short_name.toUpperCase();
            document.querySelector('#new-payment__internal-entity').appendChild(option);
        }

        payment_div.querySelectorAll('select').forEach(el => {
            el.addEventListener('change', e => {
                const select = e.target;
                select.previousElementSibling.innerText = select.options[select.selectedIndex].innerText;
            })
        })

        payment_div.querySelector('#new-payment__amount').addEventListener('input', e => {
            const 
            input = e.target,
            value = input.value.replace(/\D/gm, '');

            if (input.value.length === 0) input.classList.remove('has-content');
            else {
                input.classList.add('has-content');
                input.value = '$' + thousand_separator(value);
            }
        });

        payment_div.querySelector('#new-payment__doc-number').addEventListener('input', e => {
            const input = e.target;
            if (input.value.length === 0) input.classList.remove('has-content');
            else input.classList.add('has-content');
        });

        payment_div.querySelector('#new-payment button.red').addEventListener('click', async function() {

            if (btn_double_clicked(this)) return;

            try {

                const
                fade_in_div = document.querySelector('#companies__entity-movements'),
                fade_out_div = document.querySelector('#new-payment');

                await fade_out_animation(fade_out_div);
                fade_out_div.classList.add('hidden');

                fade_in_animation(fade_in_div);
                fade_in_div.classList.remove('hidden');

                await delay(500);

                fade_out_div.remove();
                breadcrumbs('remove', 'companies');
            }
            catch(e) { console.log(e) }
        });

        payment_div.querySelector('#new-payment button.green').addEventListener('click', create_new_payment);

        const 
        fade_out_div = document.querySelector('#companies__entity-movements'),
        fade_in_div = payment_div;
    
        await fade_out_animation(fade_out_div);
        fade_out_div.classList.add('hidden');
    
        fade_in_animation(fade_in_div);
        fade_in_div.classList.remove('hidden');
    
        await delay(500);
        fade_out_div.classList.remove('animationend');

        breadcrumbs('add', 'companies', 'CREAR PAGO');

    }
    catch(e) { error_handler('No se pudo obtener datos para crear nuevo pago', e) }
    finally { animating = false }
}

async function show_bank_balance_div() {

    const 
    company_div = this.parentElement.parentElement.parentElement,
    fade_in_div = company_div.querySelector('.bank-balance-container'),
    fade_out_div = company_div.querySelector('.company-summary');

    await fade_out_animation(fade_out_div);
    fade_out_div.classList.add('hidden');

    fade_in_animation(fade_in_div);
    fade_in_div.classList.remove('hidden');

    await delay(500);
    fade_out_div.classList.remove('animationend');

}

async function companies_update_internal_entities() {

    check_loader();

    try {

        const 
        get_companies = await fetch('/companies_get_internal_entities'),
        response = await get_companies.json();

        console.log(response)

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        for (let company of response.companies) {

            const 
            last_update_text = companies_format_last_update_date(company.last_balance_update),
            received_percentage = (response.total.received === null || response.total.received === 0) ? 0 : Math.floor((company.receptions / (1 * response.total.received)) * 1000) / 10,
            dispatched_percentage = (response.total.dispatched === null || response.total.dispatched == 0) ? 0 : Math.floor((company.dispatches / (1 * response.total.dispatched)) * 1000) / 10;

            const company_div = document.querySelector(`#companies-grid > .company[data-company-id="${company.id}"]`);

            company_div.querySelector('.movements-summary .receptions p.amount').innerText = `${received_percentage}% - $${thousand_separator(company.receptions)}`;
            company_div.querySelector('.movements-summary .dispatches p.amount').innerText = `$${company.dispatches} - ${dispatched_percentage}%`;

            company_div.querySelector('.balance.countable p:last-child').innerText = '$' + thousand_separator(company.countable_balance);
            company_div.querySelector('.balance.available p:last-child').innerText = '$' + thousand_separator(company.available_balance);
            company_div.querySelector('.balance.credit-line p:last-child').innerText = '$' + thousand_separator(company.credit_balance);

        }

    }
    catch(e) { error_handler('No se pudo actualizar los valores de recepciones y despachos', e) }
    finally { check_loader() }
}

function companies_entity_movements_create_rows() {
    return new Promise(resolve => {

        const internal_entity_select = document.querySelector('#companies__filters__internal-entities');
        let i = 0, balance = 0;
        for (let row of global.company_movements) {

            const multiplier = (row.payment === undefined) ? -1 : 1;
            balance += (multiplier * parseInt(row.total));

            const tr = document.createElement('tr');
            tr.setAttribute('data-row-id', row.id);
            tr.setAttribute('data-entity-id', row.entity.id);

            if (row.payment !== undefined && row.payment.code === 'TRF') tr.setAttribute('data-payment-code', 'TRF');
            
            if (row.weight_id !== undefined) tr.setAttribute('data-weight-id', row.weight_id);

            tr.innerHTML = `
                <td class="line-number">${i + 1}</td>
                <td class="date">${new Date(row.date).toLocaleString('es-CL').split(', ')[0]}</td>
                <td class="entity">${row.entity.name}</td>
                <td class="doc-number">${(row.doc_number === null) ? '-' : thousand_separator(row.doc_number)}</td>
                <td class="status">${(row.payment === undefined) ? '-' : row.payment.status}</td>
                <td class="import">${(row.payment === undefined) ? 'Cargo' : 'Abono'}</td>
                <td class="type">${(row.payment === undefined) ? 'Guía de Compra' : row.payment.name}</td>
                <td class="amount">${(row.total === null) ? '-' : '$' + thousand_separator(parseInt(row.total))}</td>
                <td class="balance">$${thousand_separator(balance)}</td>
            `;

            i++;
            document.querySelector('#companies__entity-movements .table-body tbody').appendChild(tr);

            //CHECK INTERNAL COMPANY
            if (!!internal_entity_select.querySelector(`option[value="${row.entity.id}"]`) === false) {
                const option = document.createElement('option');
                option.setAttribute('value', row.entity.id);
                option.innerText = row.entity.name;
                internal_entity_select.appendChild(option);
            }
        }

        return resolve();
    })
}

const companies_sort_entities_by_filter = async e => {

    if (animating || clicked) return;
    animating = true;

    let th;
    if (e.target.matches('span') || e.target.matches('i')) th = e.target.parentElement.parentElement;
    else if (e.target.matches('div')) th = e.target.parentElement;
    else if (e.target.matches('th')) th = e.target;
    else return;

    const filter = th.classList[0];

    if (th.classList.contains('active')) {

        if (th.classList.contains('inverse')) {
            th.classList.remove('inverse');
            global.companies = global.companies.sortBy(filter);
        }
        else {
            th.classList.add('inverse');
            global.companies.reverse();
        }
        
    }

    else {
        document.querySelector('#companies__entities-list .table-header th.active').classList.remove('active', 'inverse');
        th.classList.add('active');
        global.companies = global.companies.sortBy(filter);
    }

    await companies_create_entities_list();
    animating = false;
}

const companies_show_entity_movements = async e => {

    if (clicked) return;

    let tr;
    if (e.target.matches('td')) tr = e.target.parentElement;
    else if (e.target.matches('tr')) tr = e.target;
    else return;

    const 
    company_id = parseInt(tr.getAttribute('data-company-id')),
    company_name = tr.querySelector('.name').innerText;

    try {

        const 
        get_company_movements = await fetch('/companies_get_entity_movements', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json"
            },
            body: JSON.stringify({ company_id })
        }),
        response = await get_company_movements.json();

        console.log(response);

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        global.company_movements = response.records.sortBy('date');
        global.company_movements.reverse();

        document.querySelector('#companies__entity-movements .company-name h3').innerText = company_name;
        document.querySelector('#companies__entity-movements .company-name h3').setAttribute('data-company-id', company_id);

        await companies_entity_movements_create_rows();

        document.querySelector('#companies__entity-movements .btns button').addEventListener('click', show_new_payment_div);

        const
        fade_out_div = document.querySelector('#companies__entities-list'),
        fade_in_div = document.querySelector('#companies__entity-movements');

        await fade_out_animation(fade_out_div);
        fade_out_div.classList.add('hidden');

        fade_in_animation(fade_in_div);
        fade_in_div.classList.remove('hidden');

        fade_out_div.classList.remove('animationend');

        breadcrumbs('add', 'companies', 'MOVIMIENTOS');

    } catch(e) { error_handler('No se pudo obtener movimientes de la empresa.', e) }
}

const companies_close_entity_movements = async () => {

    if (clicked) return;

    try {

        const
        fade_in_div = document.querySelector('#companies__entities-list'),
        fade_out_div = document.querySelector('#companies__entity-movements');

        await fade_out_animation(fade_out_div);
        fade_out_div.classList.add('hidden');

        await update_companies_list();    

        //REMOVE ALL ROWS
        document.querySelector('#companies__entity-movements .table-body tbody').innerHTML = '';

        //REMOVE INTERNAL ENTITIES FROM SELECT
        const internal_entities_select = document.querySelector('#companies__filters__internal-entities');
        while (internal_entities_select.children.length > 2) internal_entities_select.lastElementChild.remove();

        fade_in_animation(fade_in_div);
        fade_in_div.classList.remove('hidden');

        await delay(500);

        fade_out_div.classList.remove('animationend');
        breadcrumbs('remove', 'companies');

    } catch(e) { error_handler('No se pudo obtener la lista de clientes/proveedores', e) }
}

const companies_breadcrumb = async e => {

    let li;
    if (e.target.matches('i') || e.target.matches('h4')) li = e.target.parentElement;
    else if (e.target.matches('li')) li = e.target;
    else return;

    const ul = li.parentElement;

    if (ul.children.length === 1) return;

    //CLICK ON FIRST LI AND ACTIVE DIV IS LIST OF COMPANIES
    if (!document.querySelector('#companies__entities-list').classList.contains('hidden')) {
        if (li === ul.firstElementChild) document.querySelector('#companies__entities-list > .close-btn-absolute').click();
    }
}

async function companies_show_entities_movements() {

    if (animating) return;
    animating = true;

    try {
        
        const fade_out_div = document.getElementById('companies-grid');
        const fade_in_div = document.getElementById('companies__entities-list');

        fade_out_animation(fade_out_div);

        await update_companies_list();

        while (!fade_out_div.classList.contains('animationend')) await delay(10);

        fade_out_div.classList.add('hidden');
        fade_out_div.classList.remove('animationend');
        fade_in_animation(fade_in_div);
        fade_in_div.classList.remove('hidden');

        breadcrumbs('add', 'companies', 'CLIENTES / PROVEEDORES');

    }
    catch(e) { console.log(e) }
    finally { animating = false }
}

const companies_close_entities_list = async () => {

    if (clicked) return;

    const
    fade_out_div = document.getElementById('companies__entities-list'),
    fade_in_div = document.getElementById('companies-grid');

    await fade_out_animation(fade_out_div);
    fade_out_div.classList.add('hidden');

    //REMOVE ALL LIST FROM ENTITIES
    document.querySelector('#companies__entities-list .table-body tbody').innerHTML = '';

    fade_in_animation(fade_in_div);
    fade_in_div.classList.remove('hidden');
    fade_out_div.classList.remove('animationend');

    breadcrumbs('remove', 'companies');

}

const companies_entity_movements_export_to_excel = async type => {

    type = sanitize(type);

    const 
    season_select = document.querySelector('#companies__filters__season'),
    season_id = parseInt(season_select.options[season_select.selectedIndex].value),
    company_id = parseInt(document.querySelector('#companies__entity-movements .company-name h3').getAttribute('data-company-id'));

    try {

        const
        generate_excel = await fetch('/companies_generate_excel', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json"
            },
            body: JSON.stringify({ type, company_id, season_id })
        }),
        response = await generate_excel.json();

        console.log(response);

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        const file_name = response.file_name;
		window.open(`${domain}:3000/get_excel_report?file_name=${file_name}`, 'GUARDAR EXCEL');

    } catch(e) { error_handler('No se pudo exportar la información a Excel.', e) }
}

const companies_entity_movements_sort_results = e => {

    let th;
    if (e.target.matches('i') || e.target.matches('span')) th = e.target.parentElement.parentElement;
    else if (e.target.matches('div')) th = e.target.parentElement;
    else if (e.target.matches('th')) th = e.target;
    else return;

    console.log(th);

    if (th.className === 'line-number') return;

    const filter = th.classList[0];

    console.log(filter)

}

const companies_show_context_menu = async e => {

    let tr;
    if (e.target.matches('td')) tr = e.target.parentElement;
    else if (e.target.matches('tr')) tr = e.target;
    else return;

    if (e.which !== 3) return;

    let menu;
    if (!!document.querySelector('#companies__context-menu')) menu = document.querySelector('#companies__context-menu');
    else {

        menu = document.createElement('div');
        menu.id = 'companies__context-menu';
        menu.className = 'context-menu';
        menu.innerHTML = `
            <div>
                <div class="context-menu__child">
                    <i class="fal fa-file-edit"></i>
                    <span>EXPORTAR A EXCEL SIMPLE</span>
                </div>
                <div class="context-menu__child">
                    <i class="fal fa-file-edit"></i>
                    <span>EXPORTAR A EXCEL DETALLADO</span>
                </div>
            </div>
        `;

        menu.querySelector('.context-menu__child:first-child').addEventListener('click', () => {
            if (clicked) return;
            companies_entity_movements_export_to_excel('simple');
        });

        menu.querySelector('.context-menu__child:nth-child(2)').addEventListener('click', () => {
            if (clicked) return;
            companies_entity_movements_export_to_excel('detailed-1');
        });

        document.querySelector('#companies').appendChild(menu);
    }

    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';

    document.body.addEventListener('click', async () => { 
        if (!!document.querySelector('#companies__context-menu')) 
            document.querySelector('#companies__context-menu').remove();
    }, { once: true })

}

async function companies_show_products_movements() {

}

//COMPANIES FILTERS
const companies_filters_internal_entities_select = e => {

    const select = e.target;

}

const companies_filters_imports = e => {

    const select = e.target;


}

const companies_filters_doc_types = e => {

    const select = e.target;


}

(async () => {

    try {

        const 
        get_companies = await fetch('/companies_get_internal_entities'),
        response = await get_companies.json();

        console.log(response)

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        const template = await (await fetch('./templates/template-companies.html', {
			method: 'GET',
			headers: { "Cache-Control" : "no-cache" }
		})).text();
        
        document.querySelector('#companies .content').innerHTML = template;

        //EVENT LISTENERS
        document.querySelector('#companies__entities-list > .close-btn-absolute').addEventListener('click', companies_close_entities_list);
        document.querySelector('#companies__entities-list .table-header thead tr').addEventListener('click', companies_sort_entities_by_filter);
        document.querySelector('#companies__entities-list .table-body tbody').addEventListener('click', companies_show_entity_movements);
        document.querySelector('#companies__entity-movements .close-btn-absolute').addEventListener('click', companies_close_entity_movements);
        document.querySelector('#companies__breadcrumb').addEventListener('click', companies_breadcrumb);

        //ENTITY MOVEMENTS FILTERS
        document.querySelector('#companies__filters__internal-entities').addEventListener('change', companies_filters_internal_entities_select);
        document.querySelector('#companies__filters__imports').addEventListener('change', companies_filters_imports);
        document.querySelector('#companies__filters__doc-types').addEventListener('change', companies_filters_doc_types);

        //ENTITY MOVEMENTS TABLE
        document.querySelector('#companies__entity-movements .table-header thead tr').addEventListener('click', companies_entity_movements_sort_results);
        document.querySelector('#companies__entity-movements .table-body tbody').addEventListener('mouseup', companies_show_context_menu);

        for (let company of response.companies) {

            const 
            last_update_text = companies_format_last_update_date(company.last_balance_update),
            received_percentage = (response.total.received === null || response.total.received === 0) ? 0 : Math.floor((company.receptions / (1 * response.total.received)) * 1000) / 10,
            dispatched_percentage = (response.total.dispatched === null || response.total.dispatched == 0) ? 0 : Math.floor((company.dispatches / (1 * response.total.dispatched)) * 1000) / 10;

            const widget = document.createElement('div');
            widget.className = 'company internal';
            widget.setAttribute('data-company-id', company.id);
            widget.innerHTML = `
                <div class="company-data-container">
                    <div class="company-data">
                        <p>${sanitize(company.name)}</p>
                        <p>${sanitize(company.rut)}</p>
                    </div>
                </div>

                <div class="company-summary">

                    <div class="movements-summary">

                        <div class="receptions">
                            <div>
                                <div class="icon-container">
                                    <i class="fad fa-arrow-down"></i>
                                </div>
                                <span>RECEPCIONES</span>
                            </div>
                            <div>
                                <p class="amount">${received_percentage}% - $${thousand_separator(parseInt(company.receptions))}</p>
                            </div>
                        </div>

                        <div class="dispatches">
                            <div>
                                <div class="icon-container">
                                    <i class="fad fa-arrow-up"></i>
                                </div>
                                <span>DESPACHOS</span>
                            </div>
                            <div>
                                <p class="amount">${dispatched_percentage}% - $${thousand_separator(parseInt(company.dispatches))}</p>
                            </div>
                        </div>
                        
                    </div>

                    <div class="company-summary-btns">
                        <div class="company-summary-btn">
                            <div>
                                <i class="fal fa-info"></i>
                            </div>
                            <p>INFO<br>EMPRESA</p>                   
                        </div>
                        <div class="company-summary-btn">
                            <div>
                                <i class="fal fa-university"></i>
                            </div>
                            <p>VER SALDO<br>EN BANCO</p>                   
                        </div>
                        <div class="company-summary-btn" data-movements>
                            <div>
                                <i class="fas fa-sort-alt"></i>
                            </div>
                            <p>ENTRADAS<br>Y SALIDAS</p>
                        </div>
                    </div>

                </div>
                
                <div class="bank-balance-container hidden">

                    <div class="bank-balance">
                        
                        <div class="balance-container">
                            <div class="balance countable">
                                <p>CONTABLE</p>
                                <p>$${thousand_separator(company.countable_balance)}</p>
                            </div>
                            <div class="balance available">
                                <p>DISPONIBLE</p>
                                <p>$${thousand_separator(company.available_balance)}</p>
                            </div>

                            <div class="balance credit-line">
                                <p>LINEA CREDITO</p>
                                <p>$${thousand_separator(company.credit_balance)}</p>
                            </div>
                        </div>

                        <div class="balance-btns-container">

                            <div class="bank-balance-btn back">
                                <div class="icon-container">
                                    <i class="fal fa-backward"></i>
                                </div>

                                <div class="bank-balance-btn-description">
                                    <p>VOLVER</p>
                                </div>
                            </div>
                        
                            <div class="bank-balance-btn update-bank-balance">
                                <div class="icon-container">
                                    <i class="far fa-sync"></i>
                                </div>

                                <div class="bank-balance-btn-description">
                                    <p>ACTUALIZAR</p>
                                </div>
                            </div>

                            <div class="bank-balance-btn bank-balance-image">
                                <div class="icon-container">
                                    <i class="fal fa-image-polaroid"></i>
                                </div>

                                <div class="bank-balance-btn-description">
                                    <p>CARTOLA</p>
                                </div>
                            </div>

                        </div>
                        
                    </div>

                    <div class="last-update">
                        <span>Última Actualización:</span>
                        <span>${sanitize(last_update_text)}</span>
                    </div>

                </div>
                <div class="updating-bank-balance">
                    <div>
                        <div>
                            <h4>Actualizando Saldo</h4>
                            <h4></h4>
                        </div>
                        <div>
                            <div class="progress-container">
                                <div data-pct="0">
                                    <svg width="100" height="100" viewPort="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg">
                                        <circle r="45" cx="50" cy="50" fill="transparent" stroke-dasharray="282.74" stroke-dashoffset="0"></circle>
                                        <circle r="45" cx="50" cy="50" fill="transparent" stroke-dasharray="282.74" stroke-dashoffset="0" style="stroke-dashoffset: 282.743px;"></circle>
                                    </svg>
                                </div>
                                <input name="percent" type="hidden">
                            </div>
                        </div>
                    </div>
                </div>
            `;

            //SHOW BANK BALANCE DIV
            widget.querySelector('.company-summary-btn:nth-child(2)').addEventListener('click', show_bank_balance_div);

            //BACK TO MAIN DIV FROM BANK BALANCE
            widget.querySelector('.bank-balance-btn.back').addEventListener('click', async () => {

                const 
                fade_in_div = widget.querySelector('.company-summary'),
                fade_out_div = widget.querySelector('.bank-balance-container');

                await fade_out_animation(fade_out_div);
                fade_out_div.classList.add('hidden');

                fade_in_animation(fade_in_div);
                fade_in_div.classList.remove('hidden');

                await delay(500)
                fade_out_div.classList.remove('animationend');

            });

            //UPDATE BANK BALANCE BTN
            widget.querySelector('.update-bank-balance').addEventListener('click', function() {

                const 
                company_div = this.parentElement.parentElement.parentElement.parentElement,
                company_id = parseInt(company_div.getAttribute('data-company-id'));

                socket.emit('update bank balance', company_id);

            });

            //UPDATE PROGRESS CIRCLE WHEN EXECUTING PUPPETEER SCRIPT FOR GETTING BALANCES FROM BANK
            widget.querySelector('input[name="percent"]').addEventListener('change', puppeteer_progress_circle);

            //SHOW BANK BALANCE IMAGE
            widget.querySelector('.bank-balance-image').addEventListener('click', show_bank_balance_image);

            //SHOW RECEPTIONS AND DISPATCHES FOR COMPANY
            widget.querySelector('div[data-movements]').addEventListener('click', companies_show_products_movements);

            widget.querySelector('.progress-container input').value = 0;
            document.getElementById('companies-grid').appendChild(widget);
        }

        const clients_widget = document.createElement('div');
        clients_widget.className = 'company';
        clients_widget.innerHTML = `
            <p>CLIENTES</p>
            <p>PROVEEDORES</p>
        `;
        document.getElementById('companies-grid').appendChild(clients_widget);

        clients_widget.addEventListener('click', companies_show_entities_movements);

        //UPDATE BUTTON
        const update_btn = document.createElement('div');
        update_btn.id = 'companies-grid__update-btn';
        update_btn.innerHTML = `
            <div>
                <div>
                    <i class="fas fa-sync"></i>
                </div>
                <p>ACTUALIZAR</p>
            </div>
        `;

        update_btn.addEventListener('click', companies_update_internal_entities);

        document.getElementById('companies-grid').appendChild(update_btn);

    } catch(e) { error_handler('No se pudo cargar datos de empresas.', e) }

})();