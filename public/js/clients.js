"use strict";

const clients_search_entity = async e => {

    if (e.key!== 'Enter') return;

    const entity = sanitize(e.target.value);

    try {
        
        const
        search_entity = await fetch('/search_client_entity', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify({ entity })
        }),
        response = await search_entity.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        document.querySelectorAll('#clients__table .tbody .tr').forEach(tr => { tr.remove() })
        
        await clients_create_row(response.entities);

        const status_select = document.querySelector('#clients__entities-active-select');
        status_select.options[1].selected = true;
        status_select.previousElementSibling.innerText = 'Todos';

        const type_select = document.querySelector('#clients__entities-type-select');
        type_select.options[1].selected = true;
        type_select.previousElementSibling.innerText = 'Todos';

    } catch(error) { error_handler('Error al buscar entidad') }
}

const clients_create_row = entities => {
	return new Promise(resolve => {
		const tbody = document.querySelector('#clients__table .tbody');
		entities.forEach(entity => {
	
			const tr = document.createElement('div');
			tr.className='tr';
			tr.setAttribute('data-entity-id', entity.id);
			tr.innerHTML = `
                <div class="td edit">
                    <div>
                        <i class="fas fa-pen-square"></i>
                    </div>
                </div>
				<div class="td active">
					<div>
						<i></i>
					</div>
				</div>
				<div class="td type"></div>
				<div class="td name">${sanitize(entity.name)}</div>
				<div class="td rut">${sanitize(entity.rut)}</div>
				<div class="td giro">${sanitize(entity.giro)}</div>
			`;
	
			let entity_type;
			if (entity.type === 'C') entity_type = 'Cliente';
			else if (entity.type === 'P') entity_type = 'Proveedor';
			else if (entity.type === 'A') entity_type = 'Cliente / Proveedor';
			else if (entity.type === 'T') entity_type = 'Transportista';
			else entity_type = '?';
			tr.querySelector('.type').innerText = entity_type
	
			tr.querySelector('.active i').className = (entity.status === 0) ? 'far fa-times' : 'far fa-check';
			tbody.appendChild(tr);
		});	
		resolve();
	})
}

function clients_select_filters() {
    return new Promise(async (resolve, reject) => {

        const
        status_select = document.getElementById('clients__entities-active-select'),
        type_select = document.getElementById('clients__entities-type-select'),
        status = sanitize(status_select.options[status_select.selectedIndex].value),
        type = sanitize(type_select.options[type_select.selectedIndex].value);
        
        try {
    
            const
            get_entities = await fetch('/get_entities_data', {
                method: 'POST',
                headers: {
                    "Content-Type" : "application/json",
                    "Authorization" : token.valuen 
                },
                body: JSON.stringify({ status, type })
            }),
            response = await get_entities.json();
    
            document.querySelectorAll('#clients__table .tbody .tr').forEach(tr => { tr.remove() })
    
            await clients_create_row(response.entities);
            document.getElementById('clients__search-entity').value = '';

            return resolve();
        } catch(error) { error_handler('No se pudo seleccionar el tipo de entidad', error); return reject() }    
    })
}

const clients_active_select = async function() {

    await clients_select_filters();

    const status_select = document.getElementById('clients__entities-active-select');
    status_select.parentElement.classList.add('has-content');
    const p = status_select.parentElement.querySelector('p');
    p.innerText = status_select.options[status_select.selectedIndex].innerText;
}

const clients_type_select =  async function() {

    await clients_select_filters();

    const type_select = document.getElementById('clients__entities-type-select');
    type_select.parentElement.classList.add('has-content');
    const p = type_select.parentElement.querySelector('p');
    p.innerText = type_select.options[type_select.selectedIndex].innerText;    
}

function client_template_event_listeners(giros) {
    return new Promise(resolve => {

        document.querySelectorAll('#clients__client-template input').forEach(input => { input.addEventListener('input', custom_input_change) });

        document.querySelectorAll('#clients__client-template .select-effect').forEach(select => {
            select.querySelector('select').addEventListener('change', e => {
                select.classList.add('has-content');
                const p = e.target.parentElement.querySelector('p');
                p.innerText = e.target.options[e.target.selectedIndex].innerText;
            });
        });
    
        const giro_select = document.querySelector('#client-template__entity-giro select');
        giros.forEach(giro => {
            const option = document.createElement('option');
            option.value = giro.id;
            option.innerText = giro.giro;
            giro_select.appendChild(option);
        });

         //BRANCH TABLE CLICK
         document.querySelector('#client-template__branch-table .tbody').addEventListener('click', clients_edit_branch);

         //ADD BRANCH BUTTON
        document.querySelector('#client-template__add-branch').addEventListener('click', clients_add_branch);

        //DELETE ENTITY
        document.getElementById('client-template__delete-entity').addEventListener('click', clients_delete_entity);

        resolve();
    })
}

//EDIT ENTITY
const clients_edit_entity = async e => {

    if (clicked) return;
	prevent_double_click();

    let tr, edit = false;

    //CLICK ON EDIT BTN
    if (e.target.matches('i') && e.target.className === 'fas fa-pen-square') {
        edit = true;
        tr = e.target.parentElement.parentElement.parentElement
    } 
    
    //CLICK SOMEWHERE ELSE
    else {
        if (e.target.classList.contains('td')) tr = e.target.parentElement;
        else if (e.target.className.length === 0) tr = e.target.parentElement.parentElement;
        else if (e.target.matches('i')) tr = e.target.parentElement.parentElement.parentElement;
        else return;
    }
    
    if (!edit) {
        if (tr.classList.contains('selected')) {
            document.getElementById('client__delete-entity-btn').classList.remove('enabled');
            tr.classList.remove('selected');

        }
        else {
            document.querySelectorAll('#clients__table .tbody .tr.selected').forEach(tr => { tr.classList.remove('selected') });
            tr.classList.add('selected');
            document.getElementById('client__delete-entity-btn').classList.add('enabled');
        }
        return;
    }

    //EDIT ENTITY
    const 
    entity_id = tr.getAttribute('data-entity-id'),
    fade_out_div = document.querySelector('#clients__table-grid');
    fade_out_animation(fade_out_div);

    try {

        const
        get_entity_data = await fetch('/get_entity_data', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify({ entity_id })
        }),
        response = await get_entity_data.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        const 
        template = await (await fetch('templates/template-client.html')).text(),
        template_div = document.createElement('div');

        template_div.id = 'clients__client-template';
        template_div.className = 'hidden';
        template_div.setAttribute('data-entity-id', response.entity.id);
        template_div.innerHTML = template;
        document.querySelector('#clients > .content').appendChild(template_div);

        await client_template_event_listeners(response.giros);

        document.querySelector('#clients__client-template h3').innerText = 'EDITAR ENTIDAD';

        const 
        giro_select = document.querySelector('#client-template__entity-giro select'),
        giro_option_index = giro_select.querySelector(`option[value="${response.entity.giro}"]`).index;

        giro_select.options[giro_option_index].selected = true;
        giro_select.dispatchEvent(new Event('change'));

        document.querySelector('#client-template__entity-name input').classList.add('has-content');
        document.querySelector('#client-template__entity-name input').value = response.entity.name;
 
        document.querySelector('#client-template__entity-rut input').classList.add('has-content');
        document.querySelector('#client-template__entity-rut input').value = response.entity.rut;
 
        const 
        type_select = document.querySelector('#client-template__entity-type select'),
        type_option_index = type_select.querySelector(`option[value="${response.entity.type}"]`).index;

        type_select.options[type_option_index].selected = true;
        type_select.dispatchEvent(new Event('change'));

        if (response.entity.phone.length > 0) document.querySelector('#client-template__entity-phone input').classList.add('has-content');
        document.querySelector('#client-template__entity-phone input').value = response.entity.phone;

        if (response.entity.email.length > 0) document.querySelector('#client-template__entity-email input').classList.add('has-content');
        document.querySelector('#client-template__entity-email input').value = response.entity.email;

        const 
        status_select = document.querySelector('#client-template__entity-status select'),
        status_option_index = status_select.querySelector(`option[value="${response.entity.status}"]`).index;

        status_select.options[status_option_index].selected = true;
        status_select.dispatchEvent(new Event('change'));
        
        document.querySelector(`#client-template__entity-status p`).innerText = (response.entity.status === 1) ? 'Activo' : "Inactivo";
        document.querySelector(`#client-template__entity-status p`).setAttribute('data-status', response.entity.status);
        document.querySelector(`#client-template__entity-status .select-effect`).classList.add('has-content');

        const 
        tbody = document.querySelector('#client-template__branch-table .tbody'),
        branches = response.branches;
        for (let i = 0; i < branches.length; i++) {
            const tr = document.createElement('div');
            tr.className = 'tr';
            tr.setAttribute('data-branch-id', branches[i].id);
            tr.innerHTML = `
                <div class="td number">${i + 1}</div>
                <div class="td branch">${sanitize(branches[i].name)}</div>
                <div class="td address">${sanitize(branches[i].address)}</div>
                <div class="td comuna">${sanitize(branches[i].comuna)}</div>			
            `;
            tbody.appendChild(tr);
        }

        //INPUTS EVENT LISTENERS
        document.querySelectorAll('#clients__client-template input').forEach(input => {
            input.addEventListener('input', custom_input_change);
        });

        //SAVE DATA BTN 
        document.getElementById('cliente-template__save').addEventListener('click', clients_save_data);

        while (!fade_out_div.classList.contains('animationend')) { await delay(10) }
        await fade_in_animation(template_div);
        fade_out_div.classList.remove('animationend');

        breadcrumbs('add', 'clients', 'Editar Entidad');

    } catch(error) { error_handler('Error al buscar datos de entidad.', error) }
}

//DELETE ENTITY BTN
const clients_table_delete_entity = async function() {
    console.log(1)

    if (clicked || !this.classList.contains('enabled')) return;
	prevent_double_click();

    if (!!document.querySelector('#clients__table .tbody .tr.selected' === false)) return;

    const entity = sanitize(document.querySelector('#clients__table .tbody .tr.selected').getAttribute('data-entity-id'));

    try {

        const
        delete_entity = await fetch('/delete_entity', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify({ entity })
        }),
        response = await delete_entity.json();

        if (response.error !== undefined) throw response.error;
        if (!response.success) throw 'Success response from server is false.';

        document.querySelector(`#clients__table-grid .tr[data-entity-id="${entity}"]`).remove();
        document.getElementById('client__delete-entity-btn').classList.remove('enabled');

    } catch(error) { error_handler('Error al intentar eliminar entidad', error) }
}

//CREATE ENTITY BTN -> CLICK EVENT
const clients_create_entity_btn =  async e => {

    if (clicked) return;
	prevent_double_click();

    try {

        const 
        get_giros = await fetch('/get_giros', {
            method: 'GET',
            headers: {
                "Cache-Control" : "no-cache",
                "Authorization" : token.value
            }
        }),
        response = await get_giros.json();

        if (response.error !== undefined) throw response.error;
        if (!response.success) throw 'Success response from server is false.';

        const 
        template_div = document.createElement('div'),
        template = await (await fetch('templates/template-client.html')).text();

        template_div.id = 'clients__client-template';
        template_div.className = 'hidden';
        template_div.innerHTML = template;
        document.querySelector('#clients > .content').appendChild(template_div);

        await client_template_event_listeners(response.giros);

        document.getElementById('cliente-template__save').addEventListener('click', clients_create_entity);

        document.getElementById('client-template__delete-entity').classList.remove('enabled');
        document.getElementById('client-template__add-branch').classList.remove('enabled');

        document.querySelector('#cliente-template__save p').innerText = 'CREAR';
        document.querySelector('#cliente-template__save i').className = 'far fa-plus-circle';

        const fade_out_div = document.querySelector('#clients__table-grid');
        await fade_out_animation(fade_out_div);
        await fade_in_animation(template_div);
        breadcrumbs('add', 'clients', 'Crear Entidad');
        fade_out_div.classList.remove('animationend');   

    } catch(error) { error_handler('Error al intentar crear entidad', error) }
}

async function clients_create_entity() {

    if (btn_double_clicked(this)) return;

    try {

        const data = {
            name: document.querySelector('#client-template__entity-name input').value,
            rut: document.querySelector('#client-template__entity-rut input').value,
            giro: document.querySelector('#client-template__entity-giro select').value,
            type: document.querySelector('#client-template__entity-type select').value,
            phone: document.querySelector('#client-template__entity-phone input').value,
            email: document.querySelector('#client-template__entity-email input').value,
            status: document.querySelector('#client-template__entity-status select').value
        }

        if (data.name.length === 0) throw 'Campo de Razón Social vacío';
        if (data.rut.length === 0) throw 'Campo de RUT vacío';
        if (!validate_rut(data.rut)) throw 'RUT Inválido';
        if (data.giro.length === 0) throw 'Giro sin seleccionar';
        if (data.type.length === 0) throw 'Tipo de Entidad sin seleccionar';
        if (data.status.length === 0) throw 'Estado de Entidad sin seleccionar';

        //SANITIZE OBJECT
        for (let key in data) { data[key] = sanitize(data[key]) }

        const
        create_entity = await fetch('/create_entity', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify(data)
        }),
        response = await create_entity.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';
        if (response.existing_entity !== undefined) throw `Entidad con RUT ${response.existing_entity.rut} ya existe Razón Social: ${response.existing_entity.name}.`;

        document.getElementById('clients__client-template').setAttribute('data-entity-id', response.entity_id);
        document.querySelector('#clients__client-template > div > h3').innerText = 'EDITAR ENTIDAD';

        document.getElementById('client-template__delete-entity').classList.add('enabled');
        document.getElementById('client-template__add-branch').classList.add('enabled');

        document.querySelector('#cliente-template__save p').innerText = 'GUARDAR';
        document.querySelector('#cliente-template__save i').className = 'far fa-cloud-upload';
        document.getElementById('cliente-template__save').removeEventListener('click', clients_create_entity);

        //CREATE ROW IN ENTITIES LIST
        const
        tbody = document.querySelector('#clients__table .tbody'),
        giro_select = document.querySelector('#client-template__entity-giro select'),
        giro = giro_select.options[giro_select.selectedIndex].innerText,
        type_select = document.querySelector('#client-template__entity-type select'),
        type = type_select.options[type_select.selectedIndex].innerText,
        i_classname = (data.status === '0') ? 'far fa-times' : 'far fa-check',
        tr = document.createElement('div');
        tr.className = 'tr';
        tr.setAttribute('data-entity-id', response.entity_id);
        tr.innerHTML = `
            <div class="td edit">
                <div>
                    <i class="fas fa-pen-square"></i>
                </div>
            </div>
            <div class="td active">
                <div>
                    <i class="${i_classname}"></i>
                </div>
            </div>
            <div class="td type">${sanitize(type)}</div>
            <div class="td name">${sanitize(data.name)}</div>
            <div class="td rut">${sanitize(response.formatted_rut)}</div>
            <div class="td giro">${sanitize(giro)}</div>
		`;
        tbody.prepend(tr);

        document.querySelector('#client-template__entity-rut input').value = response.formatted_rut;
        //SAVE DATA BTN 
        document.getElementById('cliente-template__save').addEventListener('click', clients_save_data);

    } catch(error) { error_handler('Error al intentar crear entidad.', error) }
}

//DELETE ENTITY BTN -> CLICK EVENT
async function clients_delete_entity() {

    if (clicked) return;
	prevent_double_click();

    if (!this.classList.contains('enabled')) return;

    const entity = sanitize(document.getElementById('clients__client-template').getAttribute('data-entity-id'));

    try {

        const
        delete_entity = await fetch('/delete_entity', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify({ entity })
        }),
        response = await delete_entity.json();

        if (response.error !== undefined) throw response.error;
        if (!response.success) throw 'Success response from server is false.';

        document.querySelector(`#clients__table-grid .tr[data-entity-id="${entity}"]`).remove();
        document.querySelector('#clients__client-template .close-btn-absolute').click();
        document.getElementById('client__delete-entity-btn').classList.remove('enabled');

    } catch(error) { error_handler('Error al intentar eliminar entidad', error) }
}

//SAVE ENTITY DATA BTN -> CLICK EVENT
async function clients_save_data() {

    const btn = this;
	if (btn_double_clicked(btn)) return;

    try {

        const data = {
            client_id: document.getElementById('clients__client-template').getAttribute('data-entity-id'),
            name: document.querySelector('#client-template__entity-name input').value,
            rut: document.querySelector('#client-template__entity-rut input').value,
            giro: document.querySelector('#client-template__entity-giro select').value,
            type: document.querySelector('#client-template__entity-type select').value,
            phone: document.querySelector('#client-template__entity-phone input').value,
            email: document.querySelector('#client-template__entity-email input').value,
            status: document.querySelector('#client-template__entity-status select').value
        }

        if (data.name.length === 0) throw 'Campo de Razón Social vacío';
        if (data.rut.length === 0) throw 'Campo de RUT vacío';
        if (!validate_rut(data.rut)) throw 'RUT Inválido';
        if (data.giro.length === 0) throw 'Giro sin seleccionar';
        if (data.type.length === 0) throw 'Tipo de Entidad sin seleccionar';
        if (data.status.length === 0) throw 'Estado de Entidad sin seleccionar';

        //SANITIZE OBJECT
        for (let key in data) { data[key] = sanitize(data[key]) }

        const
        save_data = await fetch('/clients_save_data', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify(data)
        }),
        response = await save_data.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        //CHANGE ENTITY DATA IN MAIN LIST
        if (!!document.querySelector(`#clients__table .tr[data-entity-id="${data.client_id}"]`)) {

            const 
            i_classname = (data.status === '0') ? 'far fa-times' : 'far fa-check',
            type_select = document.querySelector('#client-template__entity-type select'),
            type = type_select.options[type_select.selectedIndex].innerText,
            row = document.querySelector(`#clients__table .tr[data-entity-id="${data.client_id}"]`);

            row.querySelector('.td.active i').className = i_classname;
            row.querySelector('.td.type').innerText = type;
            row.querySelector('.td.rut').innerText = response.formatted_rut;

            const giro_select = document.querySelector('#client-template__entity-giro select');
            row.querySelector('.giro').innerText = giro_select.options[giro_select.selectedIndex].innerText;

        }

        document.querySelector('#clients__breadcrumb > li:first-child').click();

    } catch(error) { error_handler('Error al intentar guardar datos de entidad', error) }
}

//ADD BRANCH BTN -> CLICK EVENT
async function clients_add_branch() {

    if (clicked) return;
	prevent_double_click();

    const btn = this;
    if (!btn.classList.contains('enabled')) return;

    try {

        const 
        create_branch_template = await (await fetch('templates/template-create-branch.html')).text(),
        get_regions = await fetch('/get_regions', {
            method: 'GET',
            headers: {
                "Authorization" : token.value
            }
        }),
        response = await get_regions.json();

        if (response.error !== undefined) throw response.error;
        if (!response.success) throw 'Success response from server is false.';        

        console.log(response)

        btn.classList.remove('enabled');

        document.getElementById('client-template__create-branch').innerHTML = create_branch_template;

        const region_select = document.querySelector('#client-template__regions-select select');
        response.regions.forEach(region => {
            const option = document.createElement('option');
            option.setAttribute('value', region.id);
            option.innerText = region.region;
            region_select.appendChild(option);
        });

        region_select.addEventListener('change', client_regions_select);
        document.querySelector('#client-template__create-branch .close-btn-absolute').addEventListener('click', clients_close_create_branch_div);

        document.querySelectorAll('#client-template__create-branch .select-effect select').forEach(select => {
            select.addEventListener('change', e => {
                select.parentElement.classList.add('has-content');
                const p = e.target.parentElement.querySelector('p');
                p.innerText = e.target.options[e.target.selectedIndex].innerText;
            })
        })

        document.querySelectorAll('#client-template__create-branch input').forEach(input => { input.addEventListener('input', custom_input_change) });

        //CHANGE DELETE BUTTON TO CANCEL BUTTON
        document.getElementById('client-template__delete-branch-btn').addEventListener('click', clients_close_create_branch_div);
        document.querySelector('#client-template__delete-branch-btn p').innerText = 'CANCELAR';
        document.querySelector('#client-template__delete-branch-btn i').className = 'fas fa-times-circle';

        document.getElementById('client-template__create-branch-btn').classList.add('orange');
        document.querySelector('#client-template__create-branch-btn p').innerText = 'CREAR';
        document.getElementById('client-template__create-branch-btn').addEventListener('click', clients_create_branch);

        const 
        hide_div = document.getElementById('client-template__branch-table'),
        show_div = document.getElementById('client-template__create-branch');

        await fade_out_animation(hide_div);
        hide_div.classList.remove('animationend');
        await fade_in_animation(show_div);   

    } catch(error) { error_handler('Error al intentar crear sucursal.', error) }
}

//EDIT BRANCH FROM TABLE
async function clients_edit_branch(e) {

    if (clicked) return;
	prevent_double_click();

    const branch_id = sanitize(e.target.parentElement.getAttribute('data-branch-id'));
    try {
        
        const
        create_branch_template = await (await fetch('templates/template-create-branch.html')).text(),
        get_branch_data = await fetch('/get_branch_data', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify({ branch_id })
        }),
        response = await get_branch_data.json();
        
        if (response.error !== undefined) throw response.error;
        if (!response.success) throw 'Success response from server is false.';

        document.getElementById('client-template__create-branch').setAttribute('data-branch-id', response.branch.id);

        document.getElementById('client-template__create-branch').innerHTML = create_branch_template;

        document.querySelector('#client-template__create-branch h3').innerText = 'EDITAR SUCURSAL';

        document.querySelector('#client-template__create-branch-btn p').innerText = 'GUARDAR';
        document.querySelector('#client-template__create-branch-btn i').className = 'far fa-cloud-upload';
        document.querySelector('#client-template__create-branch-btn').classList.add('green');
        document.querySelector('#client-template__create-branch-btn').addEventListener('click', client_save_branch_data);

        document.querySelectorAll('#client-template__create-branch .select-effect select').forEach(select => {
            select.addEventListener('change', e => {
                select.parentElement.classList.add('has-content');
                const p = e.target.parentElement.querySelector('p');
                p.innerText = e.target.options[e.target.selectedIndex].innerText;
            })
        })

        document.querySelectorAll('#client-template__create-branch input').forEach(input => { input.addEventListener('input', custom_input_change) });

        document.querySelector('#client-template__create-branch__name').value = response.branch.name;
        document.querySelector('#client-template__create-branch__name').classList.add('has-content');

        document.querySelector('#client-template__create-branch__address').value = response.branch.address;
        document.querySelector('#client-template__create-branch__address').classList.add('has-content');

        if (response.branch.phone.length > 0) {
            document.querySelector('#client-template__create-branch__phone').value = response.branch.phone;
            document.querySelector('#client-template__create-branch__phone').classList.add('has-content');
        }

        document.getElementById('client-template__add-branch').classList.remove('enabled');
        const regions_select = document.querySelector('#client-template__regions-select select');

        regions_select.addEventListener('change', client_regions_select);

        document.querySelector('#client-template__create-branch .close-btn-absolute').addEventListener('click', clients_close_create_branch_div);
        document.getElementById('client-template__delete-branch-btn').addEventListener('click', clients_delete_branch);

        response.regions.forEach(region => {
            const option = document.createElement('option');
            option.setAttribute('value', region.id);
            option.innerText = region.region;
            regions_select.appendChild(option);
        });

        const region_select = document.querySelector('#client-template__regions-select select');
        region_select.options[response.branch.region - 1].selected = true;
        region_select.dispatchEvent(new Event('change'));

        const comuna_select = document.querySelector('#client-template__comunas-select select');
        while (!!comuna_select.querySelector(`option[value="${response.branch.comuna}"]`) === false) { await delay(10) }

        const comuna_option = comuna_select.querySelector(`option[value="${response.branch.comuna}"]`).index;
        comuna_select.options[comuna_option].selected = true;
        comuna_select.dispatchEvent(new Event('change'));

        const 
        hide_div = document.getElementById('client-template__branch-table'),
        show_div = document.getElementById('client-template__create-branch');

        await fade_out_animation(hide_div);
        hide_div.classList.remove('animationend');
        await fade_in_animation(show_div);       

    } catch(error) { error_handler('Error al obtener datos de sucursal', error) }
}

//CLOSE EDIT-CREATE BRANCH DIV -> CLICK EVENT
async function clients_close_create_branch_div() {

    if (clicked) return;
	prevent_double_click();

    const 
    show_div = document.getElementById('client-template__branch-table'),
    hide_div = document.getElementById('client-template__create-branch');

    await fade_out_animation(hide_div);
    hide_div.classList.remove('animationend');
    await fade_in_animation(show_div);
    document.querySelector('#client-template__create-branch > div').remove();

    document.getElementById('client-template__add-branch').classList.add('enabled');
}

//CREATE BRANCH BTN INSIDE CREATE BRANCH DIV -> CLICK EVENT
async function clients_create_branch() {

    if (btn_double_clicked(this)) return;

    try {

        const data = {
            entity_id: document.getElementById('clients__client-template').getAttribute('data-entity-id'),
            name: document.getElementById('client-template__create-branch__name').value,
            address: document.getElementById('client-template__create-branch__address').value,
            comuna: document.querySelector('#client-template__comunas-select select').value,
            phone: document.getElementById('client-template__create-branch__phone').value
        }

        if (data.name.length === 0) throw 'Campo de Nombre de Sucursal vacío';
        if (data.address.length === 0) throw 'Campo de Dirección vacío';
        if (data.comuna.length === 0) throw 'Comuna sin seleccionar';

        //SANITIZE OBJECT
        for (let key in data) { data[key] = sanitize(data[key]) }

        const
        create_branch = await fetch('/create_branch', {
            method: 'POST',
            headers: {
                "COntent-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify(data)
        }),
        response = await create_branch.json();

        if (response.error !== undefined) throw response.error;
        if (!response.success) throw 'Success response from server is false.';

        const 
        tbody = document.querySelector('#client-template__branch-table .tbody'),
        tr = document.createElement('div'),
        number = document.createElement('div'),
        branch = document.createElement('div'),
        address = document.createElement('div'),
        comuna = document.createElement('div');

        tbody.appendChild(tr);
        tr.append(number, branch, address, comuna);

        tr.className = 'tr';
        tr.setAttribute('data-branch-id', response.branch_id);

        number.innerText = tbody.children.length;
        number.className = 'td number';

        branch.className = 'td branch';
        branch.innerText = data.name;

        address.className = 'td address';
        address.innerText = data.address;

        comuna.className = 'td comuna';
        comuna.innerText = response.comuna;

        document.getElementById('client-template__create-branch').removeAttribute('data-branch-id');
        document.querySelector('#client-template__create-branch .close-btn-absolute').click();
        
    } catch(error) { error_handler('Error al crear sucursal.', error) } 
}

//SAVE BRANCH DATA BTN INSIDE EDIT BRANCH DIV -> CLICK EVENT
async function client_save_branch_data() {

    const btn = this;
	if (btn_double_clicked(btn)) return;

    try {

        const data = {
            branch_id: document.getElementById('client-template__create-branch').getAttribute('data-branch-id'),
            name: document.getElementById('client-template__create-branch__name').value,
            address: document.getElementById('client-template__create-branch__address').value,
            comuna: document.querySelector('#client-template__comunas-select select').value,
            phone: document.getElementById('client-template__create-branch__phone').value
        }
        
        //SANITIZE OBJECT
        for (let key in data) { data[key] = sanitize(data[key]) }

        const 
        save_data = await fetch('/save_branch_data', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify(data)
        }),
        response = await save_data.json();

        if (response.error !== undefined) throw response.error;
        if (!response.success) throw 'Success response from server is false.';

        const 
        comuna_select = document.querySelector('#client-template__comunas-select select'),
        comuna = comuna_select.options[comuna_select.selectedIndex].innerText,
        tr = document.querySelector(`#client-template__branch-table .tr[data-branch-id="${data.branch_id}"]`);

        tr.querySelector('.branch').innerText = data.name;
        tr.querySelector('.address').innerText = data.address;
        tr.querySelector('.comuna').innerText = comuna;

        document.querySelector('#client-template__create-branch > .close-btn-absolute').click();

    } catch(error) { error_handler('Error al intentar guardar datos de sucursal.', error) }
}

//DELETE BRANCH BTN -> CLICK EVENT
async function clients_delete_branch() {

    if (btn_double_clicked(this)) return;

    try {

        const data = {
            entity: document.getElementById('clients__client-template').getAttribute('data-entity-id'),
            branch: document.getElementById('client-template__create-branch').getAttribute('data-branch-id')
        }

        //SANITIZE OBJECT
        for (let key in data) { data[key] = sanitize(data[key]) }

        const
        delete_branch = await fetch('/delete_branch', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify(data)
        }),
        response = await delete_branch.json();

        if (response.error !== undefined) throw response.error;
        if (!response.success) throw 'Success response from server is false.';  

        document.querySelector(`#client-template__branch-table .tr[data-branch-id="${data.branch}"]`).remove();

        const trs = document.querySelectorAll('#client-template__branch-table .tbody .tr');
        for (let i = 0; i < trs.length; i++) {
            trs[i].querySelector('.number').innerText = i + 1;
        }

        document.querySelector('#client-template__create-branch .close-btn-absolute').click();

    } catch(error) { error_handler('Error al intentar eliminar sucursal', error) }
}

async function client_regions_select(e) {

    const selected_region = e.target.options[e.target.selectedIndex].getAttribute('value');
    try {

        const
        get_comunas = await fetch('/fetch_comunas', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify({ selected_region })
        }),
        response = await get_comunas.json();

        if (response.error !== undefined) throw response.error;
        if (!response.success) throw 'Success response from server is false.';
        
        const comunas_select = document.querySelector('#client-template__comunas-select select');
        while (comunas_select.children.length > 0) { comunas_select.firstElementChild.remove() }
        document.querySelector('#client-template__comunas-select > p').innerText = '';
        document.querySelector('#client-template__comunas-select').classList.remove('has-content');

        response.comunas.forEach(comuna => {
            const option = document.createElement('option');
            option.setAttribute('value', comuna.id);
            option.innerText = comuna.comuna;
            comunas_select.appendChild(option);
        });

    } catch(error) { error_handler('Error al obtener comunas de region.', error) }
}

//ON LOAD FUNCTION
function clients_get_entities() {
    return new Promise(async (resolve, reject) => {

        const
        status = '1',
        type = 'P';
    
        try {
    
            const
            get_entities = await fetch('/get_entities_data', {
                method: 'POST',
                headers: {
                    "Content-Type" : "application/json",
                    "Authorization" : token.valuen 
                },
                body: JSON.stringify({ status, type })
            }),
            response = await get_entities.json();
    
            if (response.error !== undefined) throw response.error;
            if (!response.success) throw 'Success response from server is false.';
    
            //SEARCH ENTITY IN MAIN DIV
            document.getElementById('clients__search-entity').addEventListener('input', e => {
                if (e.target.value.length === 0) e.target.classList.remove('has-content');
                else e.target.classList.add('has-content');
            });
    

            document.getElementById('client__delete-entity-btn').addEventListener('click', clients_table_delete_entity);
            document.getElementById('clients__search-entity').addEventListener('keydown', clients_search_entity);
            document.getElementById('clients__entities-active-select').addEventListener('change', clients_active_select);
            document.getElementById('clients__entities-type-select').addEventListener('change', clients_type_select);
            document.querySelector('#clients__table .tbody').addEventListener('click', clients_edit_entity);
            document.getElementById('client__create-entity-btn').addEventListener('click', clients_create_entity_btn);
    
            await clients_create_row(response.entities);

            return resolve();
        } catch(e) { error_handler('Error al intentar abrir clientes/proveedores', e); return reject() }        
    })
}