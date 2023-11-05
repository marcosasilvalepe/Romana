"use strict";

function create_driver_tr(drivers) {
    return new Promise(resolve => {

        document.querySelector('#drivers-table .table-content .tbody').innerHTML = '';

        for (const driver of drivers) {

            const tr = document.createElement('div');
            tr.className = 'tr';
            tr.setAttribute('data-driver-id', driver.id);
            tr.innerHTML = `
                <div class="td edit">
                      <div>
                        <i class="fas fa-pen-square"></i>
                    </div>
                </div>
                <div class="td name">${sanitize(driver.name)}</div>
                <div class="td rut">${sanitize(driver.rut)}</div>
                <div class="td phone">${sanitize(driver.phone)}</div>
                <div class="td internal"></div>
                <div class="td active"></div>
            `;

            if (driver.internal === 0) tr.querySelector('.internal').innerHTML = '<div><i class="far fa-times"></i></div>';
            else tr.querySelector('.internal').innerHTML = `<div><i class="far fa-check"></i></div>`;

            if (driver.active === 0) tr.querySelector('.active').innerHTML = '<div><i class="far fa-times"></i></div>';
            else tr.querySelector('.active').innerHTML = `<div><i class="far fa-check"></i></div>`;

            document.querySelector('#drivers-table .table-content .tbody').appendChild(tr);
        }

        return resolve();
    })
}

function get_drivers() {
    return new Promise(async (resolve, reject) => {
        try {

            const
            fetch_drivers = await fetch('/get_active_drivers', {
                method: 'GET',
                headers: { "Cache-Control" : "no-cache" }
            }),
            response = await fetch_drivers.json();

            console.log(response);

            if (response.error !== undefined) throw response.error;
		    if (!response.success) throw 'Success response from server is false.';

            await create_driver_tr(response.drivers);
            return resolve();

        } catch(e) { return reject(e) }
    })
}

function drivers_get_data_filters() {
    return new Promise(async (resolve, reject) => {
        try {

            const 
            driver = sanitize(document.querySelector('#drivers__search-driver').value),
            internal_select = document.querySelector('#drivers__internal-select'),
            internal = internal_select.options[internal_select.selectedIndex].value,
            active_select = document.querySelector('#drivers__status-select'),
            active = active_select.options[active_select.selectedIndex].value;

            const data = { driver, internal, active };

            //SANITIZE OBJECT
            for (let key in data) { data[key] = sanitize(data[key]) }

            const 
            search_driver = await fetch('/search_driver', {
                method: 'POST',
                headers: { "Content-Type" : "application/json" },
                body: JSON.stringify(data)
            }),
            response = await search_driver.json();

            if (response.error !== undefined) throw response.error;
		    if (!response.success) throw 'Success response from server is false.';

            await create_driver_tr(response.drivers);

            return resolve();
        }
        catch(e) { return reject(e) }
    })
}

function drivers_create_edit_driver(create) {
    return new Promise(async (resolve, reject) => {
        try {

            const template = await (await fetch('templates/template-create-edit-driver.html', {
                method: 'GET',
                headers: { "Cache-Control" : "no-cache" }
            })).text();
        
            const div = document.createElement('div');
            div.id = 'drivers__create-driver';
            div.className = 'hidden';
            div.innerHTML = template;
        
            /****************** EVENT LISTENERS ***************/

            div.querySelectorAll('input.input-effect').forEach(input => {
                input.addEventListener('input', custom_input_change);
            })
        
            div.querySelector('button.red').addEventListener('click', async () => {
                await fade_out_animation(div);
                div.remove();
            });
        
            //BUTTON IS FOR CREATING DRIVER
            if (create)
                div.querySelector('button.green').addEventListener('click', async function() {
        
                    if (btn_double_clicked(this)) return;
            
                    const
                    data = {
                        name: document.getElementById('drivers__create-driver-name').value,
                        rut: document.getElementById('drivers__create-driver-rut').value,
                        phone: document.getElementById('drivers__create-driver-phone').value
                    };
            
                    if (data.name.length === 0 || data.rut.length === 0) return;
            
                    if (!validate_rut(data.rut)) {
                        error_handler('No se pudo crear el chofer.', 'RUT Inválido.')
                        return;
                    }
            
                    //SANITIZE OBJECT
                    for (let key in data) { data[key] = sanitize(data[key]) }
            
                    data.internal = (document.getElementById('drivers__create-driver__internal-cbx').checked) ? 1 : 0,
                    data.active = (document.getElementById('drivers__create-driver__active-cbx').checked) ? 1 : 0;
            
                    try {
            
                        const
                        create_driver = await fetch('/create_driver', {
                            method: 'POST', 
                            headers: { 
                                "Content-Type" : "application/json" 
                            }, 
                            body: JSON.stringify(data)
                        }),
                        response = await create_driver.json();
            
                        if (response.error !== undefined) throw response.error;
                        if (!response.success) {
                            if (response.existing_driver === undefined) throw 'Success response from server is false.';
                            else throw `Error al crear chofer. Chofer con rut ${response.existing_driver.rut} ya existe -> ${response.existing_driver.name}`;
                        }
            
                        //CREATE TR WITH DATA FROM DRIVER
                        const tr = document.createElement('div');
                        tr.setAttribute('data-driver-id', response.driver.id);
                        tr.className = 'tr';
                        tr.innerHTML = `
                            <div class="td edit">
                                <div>
                                    <i class="fas fa-pen-square"></i>
                                </div>
                            </div>
                            <div class="td name">${sanitize(response.driver.name)}</div>
                            <div class="td rut">${sanitize(response.driver.rut)}</div>
                            <div class="td phone">${sanitize(response.driver.phone)}</div>
                            <div class="td internal"></div>
                            <div class="td active"></div>
                        `;
            
                        if (response.driver.internal === 0) tr.querySelector('.internal').innerHTML = '<div><i class="far fa-times"></i></div>';
                        else tr.querySelector('.internal').innerHTML = `<div><i class="far fa-check"></i></div>`;
            
                        if (response.driver.active === 0) tr.querySelector('.active').innerHTML = '<div><i class="far fa-times"></i></div>';
                        else tr.querySelector('.active').innerHTML = `<div><i class="far fa-check"></i></div>`;
            
                        document.querySelector('#drivers-table .table-content .tbody').prepend(tr);
            
                        const selected_tr = document.querySelector('#drivers-table .table-content .tbody .tr.selected');
                        if (!!selected_tr) selected_tr.classList.remove('selected');
            
                        tr.classList.add('selected');
            
                        div.querySelector('button.red').click();
            
                    }
                    catch(e) { error_handler('No se pudo creal el chofer.', e) }
                });
            
            //BUTTON IS FOR EDITING EXISTING DRIVER
            else {
                
                div.querySelector('button.green .desc-container i').className = 'fas fa-check-circle';
                div.querySelector('button.green .desc-container p').innerText = 'GUARDAR';

                div.querySelector('button.green').addEventListener('click', async function() {

	                if (btn_double_clicked(this)) return;

                    const data = {
                        id: parseInt(div.querySelector('.header h3').getAttribute('data-driver-id')),
                        name: sanitize(div.querySelector('#drivers__create-driver-name').value),
                        rut: sanitize(div.querySelector('#drivers__create-driver-rut').value),
                        phone: sanitize(div.querySelector('#drivers__create-driver-phone').value),
                        internal: document.querySelector('#drivers__create-driver__internal-cbx').checked,
                        active: document.querySelector('#drivers__create-driver__active-cbx').checked
                    }

                    try {


                        if (data.name.length === 0) throw 'Nombre de chofer vacío.';
                        if (data.rut.length === 0) throw 'RUT de chofer vacío.';
                        if (!validate_rut(data.rut)) throw('No se pudo crear el chofer.', 'RUT Inválido.')
                           
                        const
                        save_data = await fetch('/save_driver_data', {
                            method: 'POST',
                            headers: { "Content-Type" : "application/json" },
                            body: JSON.stringify(data)
                        }),
                        response = await save_data.json();

                        const tr = document.querySelector(`#drivers-table .table-content .tbody .tr[data-driver-id="${response.driver.id}"]`);
                        tr.querySelector('.name').innerText = sanitize(response.driver.name);
                        tr.querySelector('.rut').innerText = sanitize(response.driver.rut);
                        tr.querySelector('.phone').innerText = sanitize(response.driver.phone);

                        if (response.driver.internal === 0) tr.querySelector('.internal').innerHTML = '<div><i class="far fa-times"></i></div>';
                        else tr.querySelector('.internal').innerHTML = `<div><i class="far fa-check"></i></div>`;

                        if (response.driver.active === 0) tr.querySelector('.active').innerHTML = '<div><i class="far fa-times"></i></div>';
                        else tr.querySelector('.active').innerHTML = `<div><i class="far fa-check"></i></div>`;

                        div.querySelector('button.red').click();

                    } catch(e) { error_handler('No se pudo guardar los datos del chofer', e) }

                });
            }
        
            document.querySelector('#drivers > .content').appendChild(div);
        
            fade_in_animation(div);
            div.classList.remove('hidden');
            div.classList.add('active');
            div.querySelector('#drivers__create-driver-name').focus();

            return resolve();
        }
        catch(e) { return reject(e) }
    })
}

document.querySelector('#drivers__delete-driver-btn').addEventListener('click', async function() {

    const btn = this;
    if (btn_double_clicked(btn)) return;
    if (!btn.classList.contains('enabled')) return;

    try {

        const driver_id = parseInt(document.querySelector('#drivers-table .table-content .tbody .tr.selected').getAttribute('data-driver-id'));

        const 
        delete_driver = await fetch('/delete_driver', {
            method: 'POST',
            headers: { "Content-Type" : "application/json" },
            body: JSON.stringify({ driver_id })
        }),
        response = await delete_driver.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        document.querySelector('#drivers-table .table-content .tbody .tr.selected').remove();

    } catch(e) { error_handler('No se pudo eliminar el chofer.', e) }
});

document.querySelector('#drivers-table .tbody').addEventListener('click', async function(e) {

    if (btn_double_clicked(this)) return;

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
            document.getElementById('drivers__delete-driver-btn').classList.remove('enabled');
            tr.classList.remove('selected');
        }
        else {
            document.querySelectorAll('#drivers-table .tbody .tr.selected').forEach(tr => { tr.classList.remove('selected') });
            tr.classList.add('selected');
            document.getElementById('drivers__delete-driver-btn').classList.add('enabled');
        }
        return;
    }

    const driver_id = tr.getAttribute('data-driver-id');

    try {

        const
        get_vehicle = await fetch('/get_driver_data', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json"
            },
            body: JSON.stringify({ driver_id })
        }),
        response = await get_vehicle.json();

        if (response.error !== undefined) throw response.error;
	    if (!response.success) throw 'Success response from server is false.';

        console.log(response)

        await drivers_create_edit_driver(false);

        document.querySelector('#drivers__create-driver .header h3').setAttribute('data-driver-id', response.driver.id);
        document.querySelector('#drivers__create-driver-name').value = sanitize(response.driver.name);
        document.querySelector('#drivers__create-driver-rut').value = sanitize(response.driver.rut);
        document.querySelector('#drivers__create-driver-phone').value = sanitize(response.driver.phone);

        if (response.driver.name !== null && response.driver.name.length > 0) document.querySelector('#drivers__create-driver-name').classList.add('has-content');
        if (response.driver.rut !== null && response.driver.rut.length > 0) document.querySelector('#drivers__create-driver-rut').classList.add('has-content');
        if (response.driver.phone !== null && response.driver.phone.length > 0) document.querySelector('#drivers__create-driver-phone').classList.add('has-content');

        if (response.driver.internal === 1) document.querySelector('#drivers__create-driver__internal-cbx').checked = true;
        if (response.driver.active === 1) document.querySelector('#drivers__create-driver__active-cbx').checked = true;

    } catch(error) { error_handler('Error al intentar editar vehiculo.', error) }

});

document.querySelector('#drivers__search-driver').addEventListener('keydown', async e => {

    if (e.key !== 'Enter') return;

    try {

        const data = { 
            driver: sanitize(e.target.value), 
            internal: 'All', 
            active: 'All'
        };
        
    
        const 
        search_driver = await fetch('/search_driver', {
            method: 'POST',
            headers: { "Content-Type" : "application/json" },
            body: JSON.stringify(data)
        }),
        response = await search_driver.json();
    
        if (response.error !== undefined) throw response.error;
        if (!response.success) throw 'Success response from server is false.';
    
        await create_driver_tr(response.drivers);

    }
    catch(e) { error_handler('No se pudo buscar al chofer.', e) }
});

document.querySelector('#drivers__search-driver').addEventListener('input', custom_input_change);

document.querySelector('#drivers__internal-select').addEventListener('change', async () => {
    await drivers_get_data_filters();
});

document.querySelector('#drivers__status-select').addEventListener('change', async () => {
    await drivers_get_data_filters();
});

document.querySelector('#drivers__create-driver-btn').addEventListener('click', async function() {
    if (btn_double_clicked(this)) return;
    await drivers_create_edit_driver(true);
});

(async () => {

    try { await get_drivers() }
    catch(e) { error_handler('No se pudo cargar choferes.', e) }

})();