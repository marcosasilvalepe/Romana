const vehicles_create_tr = vehicles => {
    return new Promise(resolve => {

        const table = document.querySelector('#vehicles-table .tbody');
        
        vehicles.forEach(vehicle => {
            const tr = document.createElement('div');
            tr.className = 'tr';
            tr.setAttribute('data-primary-plates', vehicle.primary_plates);
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
                <div class="td primary-plates">${DOMPurify().sanitize(vehicle.primary_plates)}</div>
                <div class="td secondary-plates">ACOPLADO</div>
                <div class="td driver"></div>
                <div class="td transport"></div>	
            `;

            tr.querySelector('.status i').className = (vehicle.status === 0) ? 'far fa-times' : 'far fa-check';
            tr.querySelector('.internal i').className = (vehicle.internal === 0) ? 'far fa-times' : 'far fa-check';
            tr.querySelector('.secondary-plates').innerText = (vehicle.secondary_plates === null) ? '-' : vehicle.secondary_plates;
            tr.querySelector('.driver').innerText = (vehicles.driver_name === null) ? '-' : vehicle.driver_name;
            tr.querySelector('.transport').innerText = (vehicles.transport_name === null) ? '-' : vehicle.transport_name;
            table.appendChild(tr);
        });
        return resolve();
    })
}

const vehicles_list_vehicles = (status, internal) => {
    return new Promise(async (resolve, reject) => {

        try {

            const
            list_vehicles = await fetch('/list_vehicles', {
                method: 'POST',
                headers: {
                    "Content-Type" : "application/json",
                    "Authorization" : token.value
                },
                body: JSON.stringify({ status, internal })
            }),
            response = await list_vehicles.json();

            if (response.error !== undefined) throw response.error;
		    if (!response.success) throw 'Success response from server is false.';

            await vehicles_create_tr(response.vehicles);

            return resolve();

        } catch(error) { error_handler('Error al obtener vehiculos', error); return reject() }
    })
}

const vehicles_create_edit_event_listeners = () => {
    return new Promise(resolve => {

        //PRIMARY PLATES
        document.querySelector('.create-vehicle__primary-plates').addEventListener('input', custom_input_change);

        //SECONDARY PLATES
		document.querySelector('.create-vehicle__secondary-plates').addEventListener('input', custom_input_change);

        //TRANSPORT SELECT
        document.querySelector('.create-vehicle__transport-select').addEventListener('change', e => {
			e.target.parentElement.classList.add('has-content');
			const p = e.target.parentElement.querySelector('p');
			p.innerText = e.target.options[e.target.selectedIndex].innerText;
		});

        //INTERNAL AND ACTIVE CHECKBOX
        document.querySelectorAll('.cbx').forEach(label => {
            label.parentElement.addEventListener('click', function() {
                const input = this.querySelector('input');
                if (input.checked) {
                    input.checked = false;
                    return;
                }
                input.checked = true;
            })
        });

        //BACK BTN
        document.querySelector('.create-weight__create-vehicle__back-to-create-weight').addEventListener('click', async e => {

            const fade_out_div = document.getElementById('vehicles__vehicle-template');
            await fade_out_animation(fade_out_div);
            fade_out_div.classList.add('hidden');
            fade_out_div.classList.remove('active', 'animationend');
            fade_out_div.innerHTML = '';

            if (fade_out_div.hasAttribute('data-create-vehicle')) fade_out_div.removeAttribute('data-create-vehicle');
        });

        //CHOOSE DRIVER
        document.querySelector('.create-weight__create-vehicle__choose-driver-btn').addEventListener('click', create_vehicle_choose_driver);
        return resolve();
    })
}

//EDIT VEHICLE
document.querySelector('#vehicles-table .tbody').addEventListener('click', async e => {

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
            document.getElementById('vehicles__delete-vehicle-btn').classList.remove('enabled');
            tr.classList.remove('selected');
        }
        else {
            document.querySelectorAll('#vehicles-table .tbody .tr.selected').forEach(tr => { tr.classList.remove('selected') });
            tr.classList.add('selected');
            document.getElementById('vehicles__delete-vehicle-btn').classList.add('enabled');
        }
        return;
    }

    const primary_plates = DOMPurify().sanitize(tr.getAttribute('data-primary-plates'));

    try {

        const
        get_vehicle = await fetch('/get_vehicle', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify({ primary_plates })
        }),
        response = await get_vehicle.json();

        if (response.error !== undefined) throw response.error;
	    if (!response.success) throw 'Success response from server is false.';

        console.log(response)

        const 
        modal = document.getElementById('vehicles__vehicle-template'),
        template = await (await fetch('templates/template-create-vehicle.html')).text();

        modal.innerHTML = template;

        //EVENT LISTENERS
        await vehicles_create_edit_event_listeners();

        //PREVENTS PRIMARY PLATES FROM BEING ALTERED WHEN EDITING VEHICLE
        document.querySelector('.create-vehicle__primary-plates').addEventListener('input', async e => {
            e.target.value = response.vehicle.primary_plates;
			const tooltip = e.target.parentElement.querySelector('.widget-tooltip');
			if (!tooltip.classList.contains('hidden')) {
				await fade_out(tooltip);
				tooltip.classList.add('hidden');
			}
		});

        modal.querySelector('.create-vehicle__vehicle-data .header h3').innerText = 'EDITAR VEHICULO';

        //PRIMARY PLATES
        modal.querySelector('.create-vehicle__primary-plates').value = response.vehicle.primary_plates;
        modal.querySelector('.create-vehicle__primary-plates').classList.add('has-content');

        //SECONDARY PLATES
        modal.querySelector('.create-vehicle__secondary-plates').value = response.vehicle.secondary_plates;
        if (response.vehicle.secondary_plates !== null) modal.querySelector('.create-vehicle__secondary-plates').classList.add('has-content');

        //TRANSPORT SELECT
        const transport_select = modal.querySelector('.create-vehicle__transport-select');
		response.entities.forEach(entity => {
			const option = document.createElement('option');
			option.value = entity.id;
			option.innerText = entity.name;
			transport_select.appendChild(option);
		});

        //SELECT TRANSPORT ONLY IF IS SAN VICENTE. DEFAULT TO NONE
        const selected_option = (response.vehicle.transport_id === null) ? 
            transport_select.querySelector('option:nth-child(2)') : transport_select.querySelector(`option[value="${response.vehicle.transport_id}"]`);
            
        transport_select.options[selected_option.index].selected = true;
        transport_select.dispatchEvent(new Event('change'));

        //INTERNAL AND STATUS CHECKBOX
        if (response.vehicle.internal === 1) modal.querySelector('.create-vehicle__internal-cbx').checked = true;
		if (response.vehicle.status === 1) modal.querySelector('.create-vehicle__active-cbx').checked = true;
		
        fade_in_animation(modal);
        document.getElementById('vehicles__vehicle-template').classList.add('active');

    } catch(error) { error_handler('Error al intentar editar vehiculo.', error) }
});

//SEARCH VEHICLE IN INPUT
document.querySelector('#vehicles__search-vehicle').addEventListener('input', custom_input_change);
document.querySelector('#vehicles__search-vehicle').addEventListener('keydown', async e => {

    if (e.code !== 'Tab' && e.key !== 'Enter') return;

    const partial_plates = DOMPurify().sanitize(e.target.value);
    
    try {

        const
        get_vehicles = await fetch('/get_vehicles_by_plates', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify({ partial_plates })
        }),
        response = await get_vehicles.json();

        if (response.error !== undefined) throw response.error;
	    if (!response.success) throw 'Success response from server is false.';

        document.querySelectorAll('#vehicles-table .tbody .tr').forEach(tr => { tr.remove() });

        const status_select = document.getElementById('vehicles__status-select');
        status_select.previousElementSibling.innerText = 'Todos';
        status_select.options[1].selected = true;

        const internal_select = document.getElementById('vehicles__internal-select');
        internal_select.previousElementSibling.innerText = 'Todos';
        internal_select.options[1].selected = true;

        await vehicles_create_tr(response.vehicles);

    } catch(error) { error_handler('Error al buscar vehículo', error) }
});

//GET VEHICLES BY SELECT
const vehicles_get_vehicles_by_select = (status, internal) => {
    return new Promise(async (resolve, reject) => {

        try {

            status = DOMPurify().sanitize(status);
            internal = DOMPurify().sanitize(internal);

            const
            get_vehicles = await fetch('/get_vehicles_from_filters', {
                method: 'POST',
                headers: {
                    "Content-Type" : "application/json",
                    "Authorization" : token.value
                },
                body: JSON.stringify({ status, internal })
            }),
            response = await get_vehicles.json();

            if (response.error !== undefined) throw response.error;
	        if (!response.success) throw 'Success response from server is false.';

            document.querySelectorAll('#vehicles-table .tbody .tr').forEach(tr => { tr.remove() });
            await vehicles_create_tr(response.vehicles);

            return resolve()
        } catch(e) { return reject(e) }
    })
}

//STATUS SELECT
document.querySelector('#vehicles__status-select').addEventListener('change', async e => {

    const
    status_select = e.target,
    internal_select = document.getElementById('vehicles__internal-select'),
    status = DOMPurify().sanitize(status_select.options[status_select.selectedIndex].value),
    internal = DOMPurify().sanitize(internal_select.options[internal_select.selectedIndex].value);

    if (status.length === 0) return; //GET OUT FOR FIRST OPTION SELECTED -> WHEN SEARCHING BY PLATES FIRST OPTION GETS SELECTED

    try {

        await vehicles_get_vehicles_by_select(status, internal);
        document.getElementById('vehicles__search-vehicle').value = '';
        document.getElementById('vehicles__search-vehicle').classList.remove('has-content');

        status_select.parentElement.classList.add('has-content');
        status_select.previousElementSibling.innerText = status_select.options[status_select.selectedIndex].innerText;

    } catch(error) { error_handler('Error al buscar vehículos por estado.', error) }
});

//INTERNAL SELECT
document.querySelector('#vehicles__internal-select').addEventListener('change', async e => {

    const
    status_select = document.getElementById('vehicles__status-select'),
    internal_select = e.target,
    status = DOMPurify().sanitize(status_select.options[status_select.selectedIndex].value),
    internal = DOMPurify().sanitize(internal_select.options[internal_select.selectedIndex].value);

    if (internal.length === 0) return; //GET OUT FOR FIRST OPTION SELECTED -> WHEN SEARCHING BY PLATES FIRST OPTION GETS SELECTED

    try {

        await vehicles_get_vehicles_by_select(status, internal);
        document.getElementById('vehicles__search-vehicle').value = '';
        document.getElementById('vehicles__search-vehicle').classList.remove('has-content');

        internal_select.parentElement.classList.add('has-content');
        internal_select.previousElementSibling.innerText = internal_select.options[internal_select.selectedIndex].innerText;

    } catch(error) { error_handler('Error al buscar vehículos por estado.', error) }
});

//DELETE VEHICLE
document.getElementById('vehicles__delete-vehicle-btn').addEventListener('click', async function() {

    if (clicked) return;

    const 
    btn = this,
    tr = document.querySelector('#vehicles-table .tbody .tr.selected');

    if (!btn.classList.contains('enabled') || !!tr === false) return;

    const plates = DOMPurify().sanitize(tr.getAttribute('data-primary-plates'));

    try {

        const
        delete_vehicle = await fetch('/delete_vehicle', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify({ plates })
        }),
        response = await delete_vehicle.json();

        if (response.error !== undefined) throw response.error;
	    if (!response.success) throw 'Success response from server is false.';

        tr.remove();
        btn.classList.remove('enabled');

    } catch(error) { error_handler('Error al intentar eliminar vehículo.', error) }
});


//CREATE VEHICLE
document.querySelector('#vehicles__create-vehicle-btn').addEventListener('click', async e => {

    if (clicked) return;

    try {

        const
        get_transport = await fetch('/get_transport', {
            method: 'GET',
            headers: {
                "Cache-Control" : "no-cache",
                "Authorization" : token.value
            }
        }),
        response = await get_transport.json();

        if (response.error !== undefined) throw response.error;
        if (!response.success) throw 'Success response from server is false.';        

        const 
        fade_in_div = document.getElementById('vehicles__vehicle-template'),
        template = await (await fetch('templates/template-create-vehicle.html')).text();

        fade_in_div.innerHTML = template;

        //CREATE OPTIONS FOR TRANSPORT SELECT
        const transport_select = document.querySelector('.create-vehicle__transport-select');
		response.entities.forEach(entity => {
			const option = document.createElement('option');
			option.value = entity.id;
			option.innerText = entity.name;
			transport_select.appendChild(option);
		});
        
        //EVENT LISTENERS
        await vehicles_create_edit_event_listeners();

        fade_in_div.setAttribute('data-create-vehicle', true);

        fade_in_animation(fade_in_div);
        document.getElementById('vehicles__vehicle-template').classList.add('active');
        fade_in_div.classList.remove('hidden');

    } catch(error) { error_handler('Error al intentar abrir template para crear producto.', error) }
});
