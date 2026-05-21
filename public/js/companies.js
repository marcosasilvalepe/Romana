"use strict";

function companies_create_entities_list(companies) {
    return new Promise(resolve => {

        document.querySelectorAll('#companies__entities-list .table-body tbody tr').forEach(tr => tr.remove());

        for (let company of companies) {

            if (company.debits === 0 && company.credits === 0) continue;

            const tr = document.createElement('tr');
            tr.setAttribute('data-company-id', company.id);
            tr.innerHTML = `
                <td class="type">${sanitize(company.type)}</td>
                <td class="rut">${sanitize(company.rut)}</td>
                <td class="name">${sanitize(company.name)}</td>
                <td class="kilos">${thousand_formatter(parseInt(company.kilos))}</td>
                <td class="informed_kilos">${thousand_formatter(parseInt(company.informed_kilos))}</td>
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

            const season_select = document.querySelector('#companies__entities-list__season-select');
            const season_id = season_select.options[season_select.selectedIndex].value;

            const get_entities = await fetch('/companies_get_clients_list', {
                method: 'POST',
                headers: { "Content-Type" : "application/json" },
                body: JSON.stringify({ target_season: parseInt(season_id)})
            });
            const response = await get_entities.json();

            if (response.error !== undefined) throw response.error;
            if (!response.success) throw 'Success response from server is false.';

            console.log(response)

            global.companies = response.companies;

            await companies_create_entities_list(global.companies);
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
        //global.company_movements = response.records.sortBy('date');

        global.company_movements.push(response.payment_data);

        //REMOVE ALL ROWS
        document.querySelectorAll('#companies__entity-movements .table-body tbody tr').forEach(tr => tr.remove());
        
        //CREATE ROWS
        await companies_entity_movements_create_rows(global.company_movements);

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

        document.querySelector('#analytics > .content').appendChild(payment_div);

        const seasons = response.seasons;
        for (let i = seasons.length - 1; i >= 0; i--) {
            const option = document.createElement('option');
            option.setAttribute('value', seasons[i].id);
            option.innerText = seasons[i].name.toUpperCase();
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
                fade_in_div = document.querySelector('#analytics__entities_movements'),
                fade_out_div = document.querySelector('#new-payment');

                await fade_out_animation(fade_out_div);
                fade_out_div.classList.add('hidden');

                fade_in_animation(fade_in_div);
                fade_in_div.classList.remove('hidden');

                await delay(500);

                fade_out_div.remove();
                breadcrumbs('remove', 'analytics');
            }
            catch(e) { console.log(e) }
        });

        payment_div.querySelector('#new-payment button.green').addEventListener('click', create_new_payment);

        const 
        fade_out_div = document.querySelector('#analytics__entities_movements'),
        fade_in_div = payment_div;
    
        await fade_out_animation(fade_out_div);
        fade_out_div.classList.add('hidden');
    
        fade_in_animation(fade_in_div);
        fade_in_div.classList.remove('hidden');
    
        await delay(500);
        fade_out_div.classList.remove('animationend');

        breadcrumbs('add', 'analytics', 'CREAR PAGO');

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

// UPDATES RECORDS FOR BUYS AND SALES OF INTERNAL ENTITIES. NOT USED AFTER UPDATE
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

function companies_entity_movements_create_rows(data) {
    return new Promise(resolve => {

        const internal_entity_select = document.querySelector('#companies__filters__internal-entities');

        let i = 0, balance = 0;
        for (let row of data) {

            const multiplier = (row.payment !== undefined || row.cycle === 2) ? 1 : -1;
            balance += (row.payment) ? multiplier * parseInt(row.total) : multiplier * row.total * 1.19;

            const tr = document.createElement('tr');
            tr.setAttribute('data-row-id', row.id);
            tr.setAttribute('data-entity-id', row.entity.id);

            if (row.payment !== undefined && row.payment.code === 'TRF') tr.setAttribute('data-payment-code', 'TRF');
            if (row.weight_id !== undefined) tr.setAttribute('data-weight-id', row.weight_id);

            tr.innerHTML = `
                <td class="line-number">${i + 1}</td>
                <td class="date">${new Date(row.date).toLocaleString('es-CL').split(', ')[0]}</td>
                <td class="entity">${row.entity.name}</td>
                <td class="doc-number">${(row.number === null) ? '-' : thousand_separator(row.number)}</td>
                <td class="status">${(row.payment === undefined) ? '-' : row.payment.status}</td>
                <td class="import">${(row.payment !== undefined || row.cycle === 2) ? 'Abono' : 'Cargo'}</td>
                <td class="type">${(row.payment !== undefined) ? row.payment.name : (row.cycle === 1) ? 'Guía de Compra' : 'Guia de Venta'}</td>
                <td class="amount">${(row.payment) ? thousand_formatter(row.total) : '$' + thousand_separator(Math.round(row.total * 1.19))}</td>
                <td class="balance">$${thousand_separator(Math.round(balance))}</td>
            `;

            i++;
            document.querySelector('#companies__entity-movements .table-body tbody').appendChild(tr);

            // CREATE INTERNAL ENTITY OPTION IF IT DOESN'T EXISTS
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

    await companies_create_entities_list(global.companies);
    animating = false;
}

const companies_show_entity_movements = async e => {

    if (clicked) return;

    let tr;
    if (e.target.matches('td')) tr = e.target.parentElement;
    else if (e.target.matches('tr')) tr = e.target;
    else return;

    const company_id = parseInt(tr.getAttribute('data-company-id'));
    const company_name = tr.querySelector('.name').innerText;
    const season_select = document.querySelector('#companies__entities-list__season-select');
    const season = parseInt(season_select.options[season_select.selectedIndex].value);
    const season_name = season_select.options[season_select.selectedIndex].innerText;

    try {

        const get_company_movements = await fetch('/companies_get_entity_movements', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json"
            },
            body: JSON.stringify({ company_id, season })
        });
        const response = await get_company_movements.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        console.log(response)

        global.company_movements = response.records.sortBy('date');
        global.company_movements.reverse();

        document.querySelector('#companies__entity-movements .company-name h3').innerText = company_name;
        document.querySelector('#companies__entity-movements .company-name h3').setAttribute('data-company-id', company_id);

        await companies_entity_movements_create_rows(global.company_movements);

        document.querySelector('#companies__filters__season').previousElementSibling.innerText = season_name.replace("Temporada ", "");
        document.querySelector('#companies__filters__season').value = season;

        const fade_out_div = document.querySelector('#companies__entities-list');
        const fade_in_div = document.querySelector('#companies__entity-movements');

        await fade_out_animation(fade_out_div);
        fade_out_div.classList.add('hidden');

        fade_in_animation(fade_in_div);
        fade_in_div.classList.remove('hidden');

        fade_out_div.classList.remove('animationend');
        breadcrumbs('add', 'analytics', 'MOVIMIENTOS');

    } catch(e) { error_handler('No se pudo obtener movimientes de la empresa.', e) }
}

const companies_close_entity_movements = async () => {

    if (clicked || animating) return;
    animating = true;

    await check_loader();

    try {

        const
        fade_in_div = document.querySelector('#companies__entities-list'),
        fade_out_div = document.querySelector('#companies__entity-movements');

        await fade_out_animation(fade_out_div);
        fade_out_div.classList.add('hidden');

        fade_in_animation(fade_in_div);
        fade_in_div.classList.remove('hidden');

        document.querySelectorAll('#companies__entity-movements .table-body tbody tr').forEach(tr => tr.remove());

        // RESET TABLE AND FILTERS
        const internal_entities_select = document.querySelector('#companies__filters__internal-entities');
        while (internal_entities_select.children.length > 1) internal_entities_select.lastElementChild.remove();
        
        document.querySelector('#companies__filters__internal-entities').selectedIndex = 0;
        document.querySelector('#companies__filters__internal-entities').previousElementSibling.innerText = 'TODAS';

        const season_select = document.querySelector('#companies__filters__season');
        season_select.selectedIndex = 0;
        season_select.previousElementSibling.innerText = season_select.options[season_select.selectedIndex].innerText;

        document.querySelector('#companies__filters__imports').selectedIndex = 0;
        document.querySelector('#companies__filters__imports').previousElementSibling.innerText = 'TODOS';
        
        document.querySelector('#companies__filters__doc-types').selectedIndex = 0;
        document.querySelector('#companies__filters__doc-types').previousElementSibling.innerText = 'TODOS';

        global.company_movements = [];
        
        await delay(500);

        fade_out_div.classList.remove('animationend');
        breadcrumbs('remove', 'analytics');

    } 
    catch(e) { error_handler('No se pudo obtener la lista de clientes/proveedores', e) }
    finally { 
        animating = false;
        check_loader();
    }
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

    await check_loader();

    try {
        
        //const fade_out_div = document.getElementById('companies-grid');
        //const fade_in_div = document.getElementById('companies__entities-list');

        //fade_out_animation(fade_out_div);

        await update_companies_list();

        //while (!fade_out_div.classList.contains('animationend')) await delay(10);

        //fade_out_div.classList.add('hidden');
        //fade_out_div.classList.remove('animationend');
        //fade_in_animation(fade_in_div);
        //fade_in_div.classList.remove('hidden');

        //breadcrumbs('add', 'analytics', 'CLIENTES / PROVEEDORES');

    }
    catch(e) { console.log(e) }
    finally { 
        animating = false;
        check_loader();
    }
}

const companies_close_entities_list = async () => {

    if (clicked) return;

    const fade_out_div = document.getElementById('analytics__entities_movements');
    const fade_in_div = document.getElementById('analytics__main-grid');

    await fade_out_animation(fade_out_div);
    fade_out_div.classList.add('hidden');
    fade_out_div.classList.remove('active');

    //REMOVE ALL LIST FROM ENTITIES
    document.querySelector('#companies__entities-list .table-body tbody').innerHTML = '';

    fade_in_animation(fade_in_div);
    fade_in_div.classList.add('active');
    fade_in_div.classList.remove('hidden');
    fade_out_div.classList.remove('animationend');

    breadcrumbs('remove', 'analytics');
}

const companies_entity_movements_export_to_excel = async type => {

    type = sanitize(type);

    const season_select = document.querySelector('#companies__filters__season');
    const season_id = parseInt(season_select.options[season_select.selectedIndex].value);
    const company_id = parseInt(document.querySelector('#companies__entity-movements .company-name h3').getAttribute('data-company-id'));

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

        document.querySelector('#analytics').appendChild(menu);
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

const companies_filter_data = () => {

    const companies_select = document.querySelector('#companies__filters__internal-entities');
    const import_select = document.querySelector('#companies__filters__imports');
    const doc_type_select = document.querySelector('#companies__filters__doc-types');
    
    const selected_company = companies_select.options[companies_select.selectedIndex].value;
    const selected_import = import_select.options[import_select.selectedIndex].value;
    const selected_doc_type = doc_type_select.options[doc_type_select.selectedIndex].value;

    const filtered_data = global.company_movements
        .filter(row => (selected_company === 'All') ? row : row.entity.id == selected_company)
        .filter(row => (selected_import === 'All') ? row : (selected_import === 'charges') ? row.payment === undefined && row.cycle === 1 : row.payment !== undefined || row.cycle === 2)
        .filter(row => (selected_doc_type === 'All') ? row : (selected_doc_type === 'GRC') ? row.payment === undefined : row.payment !== undefined && row.payment.code === selected_doc_type);

    return filtered_data;
}

const companies_movements_filters = async e => {

    const select = e.target;
    const data = companies_filter_data();

    document.querySelectorAll('#companies__entity-movements .table-body tbody tr').forEach(tr => tr.remove());
    await companies_entity_movements_create_rows(data);

    select.previousElementSibling.innerText = select.options[select.selectedIndex].innerText;
}

const companies_movements_season_filter = async e => {

    const select = document.querySelector('#companies__filters__season');
    const season = parseInt(select.options[select.selectedIndex].value);
    const season_name = select.options[select.selectedIndex].innerText;
    const company_id = document.querySelector('#companies__entity-movements .company-name > h3').getAttribute('data-company-id');

    try {

        await check_loader();
        
        const 
        get_company_movements = await fetch('/companies_get_entity_movements', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json"
            },
            body: JSON.stringify({ company_id, season })
        }),
        response = await get_company_movements.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        global.company_movements = response.records.sortBy('date');
        global.company_movements.reverse();

        const data = companies_filter_data();
        
        document.querySelectorAll('#companies__entity-movements .table-body tbody tr').forEach(tr => tr.remove());
        await companies_entity_movements_create_rows(data);

        select.previousElementSibling.innerText = select.options[select.selectedIndex].innerText;

    }
    catch(e) { error_handler(`No se pudo obtener datos para ${season_name}. ${e}`) }
    finally { check_loader() }
}

const companies_change_season = async e => {

    const select = e.target;

    if (animating) {
        select.previousElementSibling.innerText = select.options[select.selectedIndex].innerText;
        return;
    }

    await check_loader();
    const season_name = select.options[select.selectedIndex].innerText;

    try {

        const company_id = parseInt(document.querySelector('#companies__entity-movements h3[data-company-id]').getAttribute('data-company-id'));
        const season = parseInt(select.options[select.selectedIndex].value);

        const 
        get_company_movements = await fetch('/companies_get_entity_movements', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json"
            },
            body: JSON.stringify({ company_id, season })
        }),
        response = await get_company_movements.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        global.company_movements = response.records.sortBy('date');
        global.company_movements.reverse();

        document.querySelectorAll('#companies__entity-movements .table-body tbody tr').forEach(tr => { tr.remove() });
        await companies_entity_movements_create_rows(global.company_movements);

        //CHANGE TEXT AFTER EVERYTHING WENT OK
        select.previousElementSibling.innerText = select.options[select.selectedIndex].innerText;

    } 
    catch(e) { error_handler(`No se pudo obtener registros de la ${season_name.toLowerCase()}.`, e) }
    finally { check_loader() }
}

//ENTITIES LIST FILTERS
const companies_entities_list_search_entity = async e => {

    if (e.key !== 'Enter') return;

    const text = e.target.value;
    if (text.length === 0) {
        await companies_create_entities_list(global.companies);
        return;
    }

    const entities = [];

    for (const entity of global.companies) {
        if (entity.name.toLowerCase().includes(text.toLowerCase())) entities.push(entity);
    }

    document.querySelectorAll('#companies__entities-list .table-body tbody tr').forEach(tr => tr.remove());

    for (let company of entities) {
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
}

const companies_entities_list_season_change = async e => {

    if (animating) return;
    animating = true;

    await check_loader();

    const select = e.target;
    const season_name = select.options[select.selectedIndex].innerText;
    const target_season = select.value;

    try {

        const 
        get_data = await fetch('/companies_get_clients_list', {
            method: 'POST',
            headers: { "Content-Type" : "application/json" },
            body: JSON.stringify({ target_season })
        }),
        response = await get_data.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        global.companies = response.companies;

        const entity_type_select = document.querySelector('#companies__entities-list-type-select');
        const entity_type = entity_type_select.options[entity_type_select.selectedIndex].innerText;

        const data = (entity_type === 'Todos') ? global.companies : global.companies.filter(row => row.type === entity_type);
        await companies_create_entities_list(data);

        select.previousElementSibling.innerText = season_name.replace("Temporada ", "");

    }
    catch(e) { error_handler(`No se pudo obtener los datos de la ${season_name.toLowerCase()}.`, e) }
    finally {
        animating = false;
        check_loader();
    }
}

const companies_entities_type_change = async e => {

    const select = e.target;
    const type = select.options[select.selectedIndex].innerText;

    const data = (type === 'Todos') ? global.companies : global.companies.filter(company => (type === 'Cliente y Proveedor') ? company.type === 'Cliente' || company.type === 'Proveedor' : company.type === type);

    await companies_create_entities_list(data);

    select.previousElementSibling.innerText = type;
}

const companies_event_listeners = async () => {
    return new Promise(async (resolve, reject) => {
        try {

            const 
            get_companies = await fetch('/companies_get_internal_entities'),
            response = await get_companies.json();

            if (response.error !== undefined) throw response.error;
            if (!response.success) throw 'Success response from server is false.';


            //EVENT LISTENERS
            document.querySelector('#companies__entities-list-container .header .close-btn-absolute').addEventListener('click', companies_close_entities_list);
            document.querySelector('#companies__entities-list-container .table-header thead tr').addEventListener('click', companies_sort_entities_by_filter);
            document.querySelector('#companies__entities-list-container .table-body tbody').addEventListener('click', companies_show_entity_movements);
            //document.querySelector('#companies__breadcrumb').addEventListener('click', companies_breadcrumb);
            //document.querySelector('#companies__filters__season').addEventListener('change', companies_change_season);

            //ENTITY MOVEMENTS FILTERS
            document.querySelector('#companies__filters__internal-entities').addEventListener('change', companies_movements_filters);
            document.querySelector('#companies__filters__imports').addEventListener('change', companies_movements_filters);
            document.querySelector('#companies__filters__doc-types').addEventListener('change', companies_movements_filters);
            document.querySelector('#companies__filters__season').addEventListener('change', companies_movements_season_filter);

            //ENTITY MOVEMENTS TABLE
            document.querySelector('#companies__entity-movements .table-header thead tr').addEventListener('click', companies_entity_movements_sort_results);
            document.querySelector('#companies__entity-movements .table-body tbody').addEventListener('mouseup', companies_show_context_menu);

            document.querySelector('#companies__entity-movements .close-btn-absolute').addEventListener('click', companies_close_entity_movements);
            document.querySelector('#companies__entity-movements .btns button').addEventListener('click', show_new_payment_div);

            //ENTITIES LIST FILTERS
            document.getElementById('companies__entities-list__name-search').addEventListener('keydown', companies_entities_list_search_entity);
            document.getElementById('companies__entities-list__name-search').addEventListener('input', async e => {

                if (e.target.value.length === 0 && e.target.classList.contains('has-content')) e.target.classList.remove('has-content');
                else if (e.target.value.length > 0 && !e.target.classList.contains('has-content')) e.target.classList.add('has-content');

                const entities = (e.target.value.length === 0) ? global.companies : global.companies.filter(row => row.name.toLowerCase().includes(e.target.value.toLowerCase()));
                await companies_create_entities_list(entities);

            });
            document.getElementById('companies__entities-list__season-select').addEventListener('change', companies_entities_list_season_change);
            document.getElementById('companies__entities-list-type-select').addEventListener('change', companies_entities_type_change);

            //ADD SEASONS TO SELECT
            for (const season of response.seasons) {

                const option = document.createElement('option');
                option.value = season.id;
                option.text = season.name;
                document.getElementById('companies__filters__season').appendChild(option);

                const option2 = document.createElement('option');
                option2.value = season.id;
                option2.text = season.name;
                document.getElementById('companies__entities-list__season-select').appendChild(option2);
            }

            document.querySelector('#companies__filters__season option:first-child').setAttribute("selected", "");
            document.querySelector('#companies__entities-list__season-select').previousElementSibling.innerText = response.seasons[0].name.replace("Temporada ", '');
            //document.querySelector('#companies__filters__season').dispatchEvent(new Event('change', { bubbles: true }));

            document.querySelector('#companies__entities-list__season-select option:first-child').setAttribute("selected", "");
            //document.querySelector('#companies__entities-list__season-select').dispatchEvent(new Event('change', { bubbles: true }));

            for (const type of response.entity_types) {

                const option = document.createElement('option');
                option.value = type.code;
                option.innerText = type.name;
                document.getElementById('companies__entities-list-type-select').appendChild(option);
            }

            return resolve();
        }
        catch(e) { return reject(e) }
    })
}

/*
for (const company of response.companies) {

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
                        <p class="amount">${received_percentage}% - $${thousand_formatter(parseInt(company.receptions))}</p>
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
                        <p class="amount">${dispatched_percentage}% - $${thousand_formatter(parseInt(company.dispatches))}</p>
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
                        <p>$${thousand_formatter(company.countable_balance)}</p>
                    </div>
                    <div class="balance available">
                        <p>DISPONIBLE</p>
                        <p>$${thousand_formatter(company.available_balance)}</p>
                    </div>

                    <div class="balance credit-line">
                        <p>LINEA CREDITO</p>
                        <p>$${thousand_formatter(company.credit_balance)}</p>
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
*/