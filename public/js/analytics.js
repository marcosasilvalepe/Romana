const analytics = {};

document.querySelector('#analytics__breadcrumb li:first-child').addEventListener('click', async e => {

    if (clicked) return;

    const analytics_breadcrumb = document.getElementById('analytics__breadcrumb');
    if (analytics_breadcrumb.children.length === 1) return;

    const
    fade_out_div = document.querySelector('#analytics > .content > .active'),
    fade_in_div = document.querySelector('#analytics__main-grid');

    fade_out_animation(fade_out_div);

    while (!fade_out_div.classList.contains('animationend')) { await delay(10) }
    fade_out_div.classList.remove('animationend', 'active');

    while (analytics_breadcrumb.children.length > 1) { analytics_breadcrumb.lastElementChild.remove() }

    await fade_in_animation(fade_in_div);
    fade_in_div.classList.remove('hidden');
    fade_in_div.classList.add('active');

    if (fade_out_div.id === 'analytics__containers-stock')
        document.querySelectorAll('#analytics__entities-table .tbody .tr').forEach(tr => { tr.remove() });
});

/*************************** PRODUCTS REPORTS *****************************/
document.querySelector('#analytics__products-movements-btn').addEventListener('click', async e => {

    if (clicked) return;

    await check_loader();

    const
    fade_out_div = document.querySelector('#analytics__main-grid'),
    fade_in_div = document.querySelector('#analytics__products-movements');

    fade_out_animation(fade_out_div);

    try {

        let templates_exists = false;
		if (!!document.querySelector('#home-products-container') === false) {

			const template = await (await fetch('/templates/template-home.html')).text();
			fade_in_div.innerHTML = template;

			await load_css('css/home.css');
			await load_script('js/home.js');

			templates_exists = true;

		} else {

			home_object.internal = true;
			await home_get_initial_products();

		}

        while (!fade_out_div.classList.contains('animationend')) { await delay(10) }
        fade_out_div.classList.remove('animationend', 'active');
        
        await fade_in_animation(fade_in_div);
        fade_in_div.classList.add('active');
        fade_in_div.classList.remove('hidden');

		breadcrumbs('add', 'analytics', 'KILOS PRODUCTOS');

    }
    catch(error) { error_handler('Error al intentar abrir productos', error) }
    finally { check_loader() }
});

/*************************** STOCK REPORTS *****************************/
document.getElementById('analytics__containers-stock-btn').addEventListener('click', async e => {

    if (clicked) return;

    const
    fade_out_div = document.querySelector('#analytics__main-grid'),
    fade_in_div = document.querySelector('#analytics__containers-stock');

    fade_out_animation(fade_out_div);

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

        while (!fade_out_div.classList.contains('animationend')) await delay(10);
        fade_out_div.classList.remove('animationend', 'active');
        
        await fade_in_animation(fade_in_div);
        fade_in_div.classList.add('active');
        fade_in_div.classList.remove('hidden');

		breadcrumbs('add', 'analytics', 'STOCK ENVASES');

    } catch(error) { error_handler('Error al intentar abrir stock de envases.', error) }
});

/*************************** CLOSE STOCK REPORTS DIV *****************************/
document.querySelector('#analytics__entities-table > .close-btn-absolute').addEventListener('click', () => {
    document.querySelector('#analytics__breadcrumb li:first-child').click();
});

/*************************** TRUCK DRIVERS REPORTS DIV *****************************/
function analytics_drivers_table_create_rows() {
    return new Promise(resolve => {

        document.querySelectorAll('#analytics__drivers-table__table-container tbody tr').forEach(tr => tr.remove());

        for (let driver of analytics.drivers) {

            const tr = document.createElement('tr');
            tr.setAttribute('data-driver-id', driver.id);
            tr.innerHTML = `
                <td class="name">${sanitize(driver.name)}</td>
                <td class="rut">${sanitize(driver.rut)}</td>
                <td class="phone">${(driver.phone === null) ? '-' : sanitize(driver.phone)}</td>
                <td class="internal">
                    <div class="${(driver.internal === 0) ? 'not-found' : 'found'}">
                        <i class="${(driver.internal === 0) ? 'far fa-times' : 'far fa-check'}"></i>
                    </div>
                </td>
                <td class="active">
                    <div class="${(driver.active === 0) ? 'not-found' : 'found'}">
                        <i class="${(driver.active === 0) ? 'far fa-times' : 'far fa-check'}"></i>
                    </div>
                </td>
                <td class="kilos">${thousand_separator(driver.kilos)} KG</td>
            `;

            document.querySelector('#analytics__drivers-table__table-container tbody').appendChild(tr);
        }
        return resolve();
    })
}

const analytics_drivers_table_header_sort = async e => {
    
    let th;
    if (e.target.matches('span') || e.target.matches('i')) th = e.target.parentElement.parentElement;
    else if (e.target.matches('div')) th = e.target.parentElement;
    else if (e.target.matches('th')) th = e.target;
    else return;

    const filter = th.classList[0];

    if (th.classList.contains('selected')) {

        th.classList.toggle('reversed')
        analytics.drivers.reverse();
    }
    else {
        document.querySelector('#analytics__drivers-table__table-container .table-header th.selected').classList.remove('selected', 'reversed');
        th.classList.add('selected');
        analytics.drivers = analytics.drivers.sortBy(filter);
    }

    await analytics_drivers_table_create_rows();
}

const analytics_drivers_get_data_from_filters = () => {

    const
    internal_select = document.querySelector('#analytics__drivers-filters__type'),
    active_select = document.querySelector('#analytics__drivers-filters__active'),
    cycle_select = document.querySelector('#analytics__drivers-filters__cycle');

    return {
        cycle: cycle_select.options[cycle_select.selectedIndex].value,
        date: {
            start: document.querySelector('#analytics__drivers-filters__start-date').value,
            end: document.querySelector('#analytics__drivers-filters__end-date').value
        },
        internal: internal_select.options[internal_select.selectedIndex].value,
        active: active_select.options[active_select.selectedIndex].value
    }

}

const analytics_drivers_filter_select = async e => {

    const select = e.target;
    const data = analytics_drivers_get_data_from_filters();

    try {

        const
        get_drivers = await fetch('/analytics_get_drivers_kilos', {
            method:'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify(data)
        }),
        response = await get_drivers.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        select.previousElementSibling.innerText = select.options[select.selectedIndex].innerText;

        analytics.drivers = response.drivers.sortBy('name');
        analytics.drivers.reverse();

        await analytics_drivers_table_create_rows();

        document.querySelector('#analytics__drivers-filters__start-date').value = response.season.start.split(' ')[0];
        document.querySelector('#analytics__drivers-filters__end-date').value = response.season.end.split(' ')[0];

        document.querySelector('#analytics__drivers-table__table-container .table-header thead th.selected').classList.remove('selected', 'reversed');
        document.querySelector('#analytics__drivers-table__table-container .table-header thead th.name').classList.add('selected');

    } catch(e) { error_handler('No se pudo obtener kilos de choferes.', e) }
}

const analytics_drivers_filter_date_input = async e => {

    const data = analytics_drivers_get_data_from_filters();

    try {

        const
        get_drivers = await fetch('/analytics_get_drivers_kilos', {
            method:'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify(data)
        }),
        response = await get_drivers.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        analytics.drivers = response.drivers.sortBy('name');
        analytics.drivers.reverse();

        await analytics_drivers_table_create_rows();

        document.querySelector('#analytics__drivers-table__table-container .table-header thead th.selected').classList.remove('selected', 'reversed');
        document.querySelector('#analytics__drivers-table__table-container .table-header thead th.name').classList.add('selected');


    } catch(e) { error_handler('No se pudo obtener kilos de choferes', e) }
}

const analytics_drivers_export_to_excel = async report_type => {

    check_loader();

    report_type = sanitize(report_type);

    try {

        const data = analytics_drivers_get_data_from_filters();
        data.report_type = report_type;

        console.log(data)

        const
        generate_excel = await fetch('/analytics_drivers_generate_excel', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify(data)
        }),
        response = await generate_excel.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        const file_name = response.file_name;
		window.open(`${domain}:3000/get_excel_report?file_name=${file_name}`, 'GUARDAR EXCEL');

    } 
    catch(e) { error_handler('No se pudo exportar la información a Excel', e) }
    finally { check_loader() }
}

const analytics_drivers_reports_context_menu = e => {

    let tr;
    if (e.target.matches('i')) tr = e.target.parentElement.parentElement.parentElement;
    else if (e.target.matches('div')) tr = e.target.parentElement.parentElement;
    else if (e.target.matches('td')) tr = e.target.parentElement;
    else if (e.target.matches('tr')) tr = e.target;
    else return;

    if (tr.classList.contains('selected')) {
        if (e.which !== 3) tr.classList.remove('selected');
    } 
    else {
        
        const selected_tr = document.querySelector('#documents__table .tr.selected');
        if (!!selected_tr) document.querySelector('#documents__table .tr.selected').classList.remove('selected');
		tr.classList.add('selected');
    }

    if (e.which === 3) {

        let menu;
        if (!!document.querySelector('#analytics__drivers__context-menu')) menu = document.querySelector('#analytics__drivers__context-menu');
        else {

            menu = document.createElement('div');
            menu.id = 'analytics__drivers__context-menu';
            menu.className = 'context-menu';
            menu.innerHTML = `
                <div>
                    <div class="context-menu__child" data-report-type="drivers">
                        <i class="fal fa-balance-scale-right"></i>
                        <span>EXPORTAR A EXCEL POR CHOFER</span>
                    </div>
                    <div class="context-menu__child" data-report-type="internal-entities">
                        <i class="fal fa-print"></i>
                        <span>EXPORTAR A EXCEL POR EMPRESAS</span>
                    </div>
                </div>
            `;
        
            document.querySelector('#analytics__drivers-table').appendChild(menu);

            menu.querySelectorAll('.context-menu__child').forEach(div => {
                div.addEventListener('click', function() {
                    analytics_drivers_export_to_excel(this.getAttribute('data-report-type'));
                })
            })
        }

        menu.style.left = e.pageX + 'px';
        menu.style.top = e.pageY + 'px';

        document.body.addEventListener('click', async () => { 
            if (!!document.querySelector('#analytics__drivers__context-menu')) 
                document.querySelector('#analytics__drivers__context-menu').remove();
        }, { once: true })
    }
}

document.querySelector('#analytics__drivers-reports-btn').addEventListener('click', async () => {

    if (clicked) return;

    const
    fade_in_div = document.querySelector('#analytics__drivers-table'),
    fade_out_div = document.querySelector('#analytics__main-grid');

    try {

        const
        get_drivers = await fetch('/analytics_get_drivers_kilos', {
            method:'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify({ 
                cycle: 1, 
                date: { 
                    start: '', 
                    end: '' 
                },
                internal: 1,
                active: 1
            })
        }),
        response = await get_drivers.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        document.querySelector('#analytics__drivers-table').innerHTML = `
            <div class="header">

            </div>

            <div class="body">
                <div id="analytics__drivers-table__filters">

                    <div class="select-effect has-content">
                        <p>INTERNO</p>
                        <select id="analytics__drivers-filters__type">
                            <option value="" hidden=""></option>
                            <option value="All">TODOS</option>
                            <option selected="" value="1">INTERNO</option>
                            <option value="2">EXTERNO</option>
                        </select>
                        <i class="far fa-chevron-down"></i>
                        <label>TIPO</label>
                        <span class="focus-border"></span>
                    </div>

                    <div class="select-effect has-content">
                        <p>ACTIVO</p>
                        <select id="analytics__drivers-filters__active">
                            <option value="" hidden=""></option>
                            <option value="All">TODOS</option>
                            <option selected="" value="1">ACTIVO</option>
                            <option value="2">INACTIVO</option>
                        </select>
                        <i class="far fa-chevron-down"></i>
                        <label>ACTIVOS</label>
                        <span class="focus-border"></span>
                    </div>

                    <div>
                        <input id="analytics__drivers-filters__start-date" type="date" class="input-effect has-content">
                        <label>FECHA INICIAL</label>
                        <span class="focus-border"></span>
                    </div>

                    <div>
                        <input id="analytics__drivers-filters__end-date" type="date" class="input-effect has-content">
                        <label>FECHA FINAL</label>
                        <span class="focus-border"></span>							
                    </div>

                    <div class="select-effect has-content">
                        <p>RECEPCION</p>
                        <select id="analytics__drivers-filters__cycle">
                            <option value="" hidden=""></option>
                            <option value="All">TODOS</option>
                            <option value="1" selected="">RECEPCION</option>
                            <option value="2">DESPACHO</option>
                        </select>
                        <i class="far fa-chevron-down"></i>
                        <label>CICLO</label>
                        <span class="focus-border"></span>
                    </div>

                </div>
                <div id="analytics__drivers-table__table-container">

                    <div class="table-header">
                        <table>
                            <thead>
                                <tr>
                                    <th class="name selected">
                                        <div>
                                            <i class="fas fa-chevron-down"></i>
                                            <span>NOMBRE</span>
                                        </div>    
                                    </th>
                                    <th class="rut">
                                        <div>
                                            <i class="fas fa-chevron-down"></i>
                                            <span>RUT</span>
                                        </div>
                                    </th>
                                    <th class="phone">
                                        <div>
                                            <i class="fas fa-chevron-down"></i>
                                            <span>TELEFONO</span>                                    
                                        </div>
                                    </th>
                                    <th class="internal">
                                        <div>
                                            <i class="fas fa-chevron-down"></i>
                                            <span>INTERNO</span>    
                                        </div>
                                    </th>
                                    <th class="active">
                                        <div>
                                            <i class="fas fa-chevron-down"></i>
                                            <span>ACTIVO</span>    
                                        </div>
                                    </th>
                                    <th class="kilos">
                                        <div>
                                            <i class="fas fa-chevron-down"></i>
                                            <span>TOTAL</span>    
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                    
                    <div class="table-body">
                        <table>
                            <tbody></tbody>
                        </table>
                    </div>

                    <div class="close-btn-absolute">
                        <div>
                            <i class="fas fa-times"></i>
                        </div>
                    </div>
                </div>
            </div>

            <div class="footer"></div>
        `;

        analytics.drivers = response.drivers.sortBy('name');
        analytics.drivers.reverse();

        await analytics_drivers_table_create_rows();

        /********************* EVENT LISTENERS *********************/

        //SELECT FILTERS
        document.querySelector('#analytics__drivers-filters__type').addEventListener('change', analytics_drivers_filter_select);
        document.querySelector('#analytics__drivers-filters__active').addEventListener('change', analytics_drivers_filter_select);
        document.querySelector('#analytics__drivers-filters__cycle').addEventListener('change', analytics_drivers_filter_select);

        //START AND END DATE
        document.querySelectorAll('#analytics__drivers-table__filters input').forEach(input => {
            input.addEventListener('input', analytics_drivers_filter_date_input);
        })

        //SORT RESULTS FROM TABLE HEADER CLICK
        document.querySelector('#analytics__drivers-table__table-container .table-header thead').addEventListener('click', analytics_drivers_table_header_sort);

        //SHOW CONTEXT MENU FOR EXPORTING TO EXCEL
        document.querySelector('#analytics__drivers-table__table-container .table-body tbody').addEventListener('mouseup', analytics_drivers_reports_context_menu);

        //CLOSE DRIVERS REPORTS DIV
        document.querySelector('#analytics__drivers-table__table-container .close-btn-absolute').addEventListener('click', async () => {

            if (animating) return;
            animating = true;

            try {

                const 
                fade_in_div = document.querySelector('#analytics__main-grid'),
                fade_out_div = document.querySelector('#analytics__drivers-table');
    
                await fade_out_animation(fade_out_div);
                fade_out_div.classList.add('hidden');
    
                fade_in_animation(fade_in_div);
                fade_in_div.classList.remove('hidden');
    
                await delay(500);
                fade_out_div.classList.remove('animationend');

                document.querySelector('#analytics__drivers-table').innerHTML = '';
            } 
            catch(e) { console.log(e) }
            finally { animating = false }
        });

        //SET DATE OF CURRENT SEASON
        document.querySelector('#analytics__drivers-filters__start-date').value = response.season.start.split(' ')[0];
        document.querySelector('#analytics__drivers-filters__end-date').value = response.season.end.split(' ')[0];

        await fade_out_animation(fade_out_div);
        fade_out_div.classList.add('hidden');
        fade_out_div.classList.remove('active');
    
        fade_in_animation(fade_in_div);
        fade_in_div.classList.remove('hidden');
    
        breadcrumbs('add','analytics', 'INFORMES CHOFERES');

        await delay(500);
        fade_out_div.classList.remove('animationend');
        fade_in_div.classList.add('active');

    } catch(e) { error_handler('Error al obtener datos de choferes.',e ) }
});

const entities_stock_close_module = async () => {

    const 
    fade_in_div = document.querySelector('#analytics__entities-table'),
    fade_out_div = document.querySelector('#analytics__entities-stock-movements');

    await fade_out_animation(fade_out_div);
    fade_out_div.classList.add('hidden');
    fade_out_div.innerHTML = '';

    fade_in_animation(fade_in_div);
    fade_in_div.classList.remove('hidden');

}

const get_entity_stock_excel_report = async (entity_id, report_type) => {

    const
    start_date = document.querySelector('#entities-stock__start-date').value,
    end_date = document.querySelector('#entities-stock__end-date').value;

    try {

        if (!validate_date(start_date)) throw 'Fecha de inicio inválida';
        if (!validate_date(end_date)) throw 'Fecha de término inválida';

        const 
        generate_excel = await fetch('/analytics_stock_generate_excel', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify({ entity_id, report_type, start_date, end_date })
        }),
        response = await generate_excel.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';        

        const file_name = response.file_name;
		window.open(`${domain}:3000/get_excel_report?file_name=${file_name}`, 'GUARDAR EXCEL');

    } catch(e) { error_handler('Error al generar archivo excel.', e) }
}

const analytics_show_weight = async weight_id => {
    try {

        const modal = document.createElement('div');
        modal.className = 'finished-weight__modal';
        document.querySelector('#analytics__containers-stock').appendChild(modal);

        const close_btn = document.querySelector('#analytics__entities-stock-movements .analytics__entities-stock-movements .close-btn-absolute');
        await fade_out_animation(close_btn);
        close_btn.classList.add('hidden');

        await visualize_finished_weight(weight_id, modal, false);

    } catch(e) { error_handler('Error al intentar abrir pesaje', e) }
}

const entity_stock_context_menu = e => {

    let tr;
    if (e.target.classList.contains('td')) tr = e.target.parentElement;
    else if (e.target.className.length === 0) tr = e.target.parentElement.parentElement;
    else if (e.target.matches('i') || e.target.matches('p')) tr = e.target.parentElement.parentElement.parentElement;
    else return;

    if (tr.classList.contains('selected')) {
        if (e.which !== 3) tr.classList.remove('selected');
    } 
    else {
        
        const selected_tr = document.querySelector('#analytics__entities-stock-movements .tr.selected');
        if (!!selected_tr) document.querySelector('#analytics__entities-stock-movements .tr.selected').classList.remove('selected');
		tr.classList.add('selected');
    }

    if (e.which === 3) {

        let menu;
        if (!!document.querySelector('#stock-entities__context-menu')) menu = document.querySelector('#stock-entities__context-menu');
        else {

            menu = document.createElement('div');
            menu.id = 'stock-entities__context-menu';
            menu.className = 'context-menu';
            menu.innerHTML = `
                <div>
                    <div id="entity_stock__show-weight" class="context-menu__child">
                        <i class="fal fa-balance-scale-right"></i>
                        <span>VER PESAJE</span>
                    </div>
                    <div id="entity_stock__excel-simple" class="context-menu__child" data-report-type="simple">
                        <i class="fal fa-file-edit"></i>
                        <span>EXPORTAR A EXCEL SIMPLE</span>
                    </div>
                    <div id="entity_stock__excel-by-document" class="context-menu__child" data-report-type="by-document">
                        <i class="fal fa-file-edit"></i>
                        <span>EXPORTAR A EXCEL POR DOCUMENTO</span>
                    </div>
                    <div id="entity_stock__excel-by-weight" class="context-menu__child" data-report-type="by-weight">
                        <i class="fal fa-file-edit"></i>
                        <span>EXPORTAR A EXCEL POR PESAJE</span>
                    </div>
                    <div id="entity_stock__excel-norformat" class="context-menu__child" data-report-type="noformat">
                        <i class="fal fa-file-edit"></i>
                        <span>EXPORTAR A EXCEL SIN FORMATO</span>
                    </div>
                </div>
            `;

            menu.addEventListener('click', e => {

                let menu_child;
                if (e.target.className === 'context-menu__child') menu_child = e.target;
                else if (e.target.matches('i') || e.target.matches('span')) menu_child = e.target.parentElement;
                else return;

                const weight_id = parseInt(tr.getAttribute('data-weight-id'));

                if (menu_child.id === 'entity_stock__show-weight') analytics_show_weight(weight_id);
                else {

                    const 
                    entity_id = parseInt(document.querySelector('#entity-stock__entity-header').getAttribute('data-entity-id')),
                    report_type = menu_child.getAttribute('data-report-type');

                    get_entity_stock_excel_report(entity_id, report_type);
                }

            });
        
            document.querySelector('#analytics__entities-stock-movements .table-content .tbody').appendChild(menu);
            
        }

        menu.style.left = e.pageX + 'px';
        menu.style.top = e.pageY + 'px';

        document.body.addEventListener('click', async () => { 
            if (!!document.querySelector('#stock-entities__context-menu')) 
                document.querySelector('#stock-entities__context-menu').remove();
        }, { once: true })

    }
}

const entities_stock_create_tr = async documents => {
    return new Promise(resolve => {

        let total = 0;
        for (let i = 0; i < documents.length; i++) {

            const doc = documents[i];

            let container_amount = (doc.weight.cycle.id === 1) ? -1 * doc.containers : 1 * doc.containers;

            const tr = document.createElement('div');
            tr.className = 'tr';
            tr.setAttribute('data-doc-id', parseInt(doc.id));
            tr.setAttribute('data-doc-number', doc.number);
            tr.setAttribute('data-weight-id', parseInt(doc.weight.id));
    
            tr.innerHTML = `
                <div class="td line">${i + 1}</div>
                <div class="td weight-id">${thousand_separator(parseInt(doc.weight.id))}</div>
                <div class="td cycle" data-cycle-id="${doc.weight.cycle.id}">
                    <div>
                        <i></i>
                        <p>${doc.weight.cycle.name.toUpperCase()}</p>
                    </div>
                </div>
                <div class="td doc-number">${(doc.number === null) ? '-' : thousand_separator(parseInt(doc.number))}</div>
                <div class="td date">${(doc.date === null) ? '-' : new Date(doc.date).toLocaleString('es-CL').split(', ')[0]}</div>
                <div class="td doc-status">${doc.status}</div>
                <div class="td branch">${(doc.client.branch.name === null) ? '-' : doc.client.branch.name}</div>
                <div class="td internal-entity">${(doc.internal.entity.name === null) ? '-' : doc.internal.entity.name}</div>
                <div class="td containers">${thousand_separator(container_amount)}</div>
            `;
    
            let i_class = '';
            if (doc.weight.cycle.id === 1) i_class = 'fad fa-arrow-down';
            else if (doc.weight.cycle.id === 2) i_class = 'fad fa-arrow-up';
            
            tr.querySelector('.cycle i').className = i_class;
            document.querySelector(`#analytics__entities-stock-movements .table-content .tbody`).appendChild(tr);

            total += container_amount;
        }

        //UPDATE TOTAL
        document.querySelector('#analytics__entities-stock-movements .table-totals p:last-child').innerText = thousand_separator(total);

        return resolve();
    })
}

const entities_stock_filter_docs = () => {

    const
    cycle_select = document.querySelector('#entities-stock__cycle-select'),
    start_date_input = document.querySelector('#entities-stock__start-date'),
    end_date_input = document.querySelector('#entities-stock__end-date'),
    branch_select = document.querySelector('#entities-stock__branch-select');

    const 
    cycle_id = cycle_select.options[cycle_select.selectedIndex].value,
    start_date = start_date_input.value,
    end_date = end_date_input.value,
    branch_id = branch_select.options[branch_select.selectedIndex].value;

    const docs = analytics.documents
        .filter(doc => {
            if (doc.weight.cycle.id === parseInt(cycle_id) || cycle_id === 'All') return doc;
        })
        .filter(doc => {
            if (new Date(doc.date) >= new Date(start_date) && new Date(doc.date) <= new Date(end_date)) return doc;
        })
        .filter(doc => {
            if (doc.client.branch.id === branch_id || branch_id === 'All') return doc
        })
    
    return docs;
}

const entities_stock_cycle_select = async e => {

    const 
    documents = entities_stock_filter_docs(),
    select = e.target,
    text = select.selectedOptions[0].innerText;

    document.querySelectorAll('#analytics__entities-stock-movements .table-content .tbody .tr').forEach(div => div.remove());

    await entities_stock_create_tr(documents);
    
    document.querySelector('#entities-stock__cycle-select').previousElementSibling.innerText = text;
}

const entities_stock_search_doc_number = async e => {

    if (e.key !== 'Enter') return;

    const 
    doc_number = e.target.value.replace(/\D/gm, ''),
    cycle_select = document.querySelector('#entities-stock__cycle-select');

    if (cycle_select.selectedIndex !== 1 || doc_number.length === 0) {

        cycle_select.selectedIndex = 1;
        cycle_select.dispatchEvent(new Event('change', { bubbles: true }));

        const table = document.querySelector('#analytics__entities-stock-movements .table-content .tbody');
        while (table.children.length !== analytics.documents.length) await delay(10);
    }

    
    if (doc_number.length === 0) return;

    console.log(doc_number)

    try {
        const selected_tr = document.querySelector('#analytics__entities-stock-movements .tr.selected');
        if (!!selected_tr) selected_tr.classList.remove('selected');
    
        const target_tr = document.querySelector(`#analytics__entities-stock-movements .tr[data-doc-number="${doc_number}"]`);
        target_tr.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});
    
        await delay(450);
        target_tr.classList.add('selected');    
    } catch(error) { error_handler(`El documento Nº ${thousand_separator(doc_number)} no se encuentra en la lista.`, error) }
}

const entity_stock_search_by_date = async () => {

    //GET DOCUMENTS FROM SERVER
    const 
    start_date = document.querySelector('#entities-stock__start-date').value,
    end_date = document.querySelector('#entities-stock__end-date').value,
    entity_id = parseInt(document.querySelector('#entity-stock__entity-header').getAttribute('data-entity-id'))

    try {

        if (!validate_date(start_date)) throw 'Fecha inicial inválida';
        if (!validate_date(end_date)) throw 'Fechan final inválida';

        const
        get_documents = await fetch('/analytics_entity_movements', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify({ entity_id, start_date, end_date })
        }),
        response = await get_documents.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        analytics.documents = response.documents;

        document.querySelectorAll('#analytics__entities-stock-movements .table-content .tbody .tr').forEach(div => div.remove());

        await entities_stock_create_tr(analytics.documents);
    
    } catch(e) { error_handler('Error al buscar documento por fecha,', e) }
}

const entities_stock_branch_select = async () => {

    const 
    select = document.querySelector('#entities-stock__branch-select'),
    branch_id = parseInt(select.options[select.selectedIndex].value);

    const docs = [];

    for (let doc of analytics.documents) {
        if (doc.client.branch.id !== branch_id) continue;
        docs.push(doc);
    }

    document.querySelectorAll('#analytics__entities-stock-movements .table-content .tbody .tr').forEach(div => div.remove());
    await entities_stock_create_tr(docs);

    select.previousElementSibling.innerText = select.options[select.selectedIndex].innerText;
}

const entities_stock_internal_entities_select = async e => {
    
    const
    select = e.target,
    option = select.options[select.selectedIndex],
    entity_id = option.value,
    entity_docs = (entity_id === 'All') ? analytics.documents : analytics.documents.filter(doc => {
        return doc.internal.entity.id === parseInt(entity_id);
    });

    document.querySelectorAll('#analytics__entities-stock-movements .analytics__entities-stock-movements .tbody .tr').forEach(tr => {
        tr.remove();
    })

    await entities_stock_create_tr(entity_docs);
    select.previousElementSibling.innerText = option.innerText;

}

document.querySelector('#analytics__entities-table .tbody').addEventListener('click', async e => {

    if (clicked) return;

    let tr;
    if (e.target.className === 'tr') tr = e.target;
    else if (e.target.classList.contains('td')) tr = e.target.parentElement;
    else return;

    const entity_id = sanitize(tr.getAttribute('data-entity-id'));
    const entities_table = document.querySelector('#analytics__entities-table');

    fade_out_animation(entities_table);

    try {

        const
        get_entity_movements = await fetch('/analytics_entity_movements', {
            method: 'POST', 
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify({ entity_id, start_date: '', end_date: '' })
        }),
        response = await get_entity_movements.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        const 
        template = await (await fetch('./templates/template-entity-stock.html')).text(),
        stock_details_div = document.querySelector('#analytics__entities-stock-movements');

        stock_details_div.innerHTML = template;

        analytics.documents = response.documents;

        const documents = response.documents;
        let total_containers = 0;

        await entities_stock_create_tr(analytics.documents);

        for (let i = 0; i < documents.length; i++) {
            let container_amount = (documents[i].weight.cycle.id === 1) ? -1 * documents[i].containers : 1 * documents[i].containers;
            total_containers += container_amount;
        }

        for (let entity of response.internal_entities) {
            const option = document.createElement('option');
            option.value = entity.id;
            option.innerText = entity.short_name.toUpperCase();
            document.querySelector('#entities-stock__entity-select').appendChild(option);
        }

        for (let branch of response.branches) {
            const option = document.createElement('option');
            option.value = branch.id;
            option.innerText = branch.name.toUpperCase();
            document.querySelector('#entities-stock__branch-select').appendChild(option);
        }

        document.querySelector('#entity-stock__entity-header').setAttribute('data-entity-id', entity_id);
        document.querySelector('#entity-stock__entity-header h2').innerText = tr.querySelector('.name').innerText.toUpperCase()

        document.querySelector('#entities-stock__start-date').value = response.season.start.split(' ')[0];
        document.querySelector('#entities-stock__end-date').value = response.season.end.split(' ')[0];

        document.querySelector('.analytics__entities-stock-movements .table-totals p:last-child').innerText = total_containers;

        /************* EVENT LISTENERS ***********/
        document.querySelector('#analytics__entities-stock-movements .close-btn-absolute').addEventListener('click', entities_stock_close_module);
        if (screen_width > 768) {

            document.querySelector('#entities-stock__cycle-select').addEventListener('change', entities_stock_cycle_select);
            
            document.querySelector('#entities-stock__doc-number').addEventListener('keydown', entities_stock_search_doc_number);
            document.querySelector('#entities-stock__doc-number').addEventListener('input', text_input_to_number);
    
            document.querySelectorAll('#entity-stock__filters input[type="date"]').forEach(input => {
                input.addEventListener('input', entity_stock_search_by_date);
            });
    
            document.querySelector('#entities-stock__branch-select').addEventListener('change', entities_stock_branch_select);
            document.querySelector('#entities-stock__entity-select').addEventListener('change', entities_stock_internal_entities_select);
            document.querySelector('#analytics__entities-stock-movements .analytics__entities-stock-movements .table-content .tbody').addEventListener('mouseup', entity_stock_context_menu);    
        }

        //FOR SMALLER SCREENS
        else {

            stock_details_div.querySelector('#entity-stock__filters').remove();
            stock_details_div.querySelector('.table-header .internal-entity span').innerText = 'ENTIDAD';
            stock_details_div.querySelector('.table-header .containers span').innerText = 'BINS';

        }

        while (!entities_table.classList.contains('hidden')) await delay(10);
        entities_table.classList.remove('animationend');
        
        fade_in_animation(stock_details_div);
        stock_details_div.classList.remove('hidden');

    } catch(error) { error_handler('Error al intentar abrir detalles de stock de entidad.', error) }
});