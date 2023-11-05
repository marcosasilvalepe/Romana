"use strict";

function create_containers_tr(containers) {
    return new Promise((resolve, reject) => {
        try {

            document.querySelector('#containers-table .table-content .tbody').innerHTML = '';

            for (const container of containers) {

                const tr = document.createElement('div');
                tr.className = 'tr';
                tr.setAttribute('data-container-code', container.code);
                tr.innerHTML = `
                    <div class="td edit">
                        <div>
                            <i class="fas fa-pen-square"></i>
                        </div>
                    </div>
                    <div class="td code">${sanitize(container.code)}</div>
                    <div class="td name">${sanitize(container.name)}</div>
                    <div class="td type">${sanitize(container.type)}</div>
                    <div class="td weight">${parseInt(container.weight)} KG</div>
                    <div class="td stock">${(container.initial_stock === null) ? 0 : parseInt(container.initial_stock)}</div>
                `;

                document.querySelector('#containers-table .table-content .tbody').appendChild(tr);
            }
            return resolve();
        }
        catch(e) { return reject(e) }
    })
}

function get_containers() {
    return new Promise(async (resolve, reject) => {
        try {

            const
            containers_data = await fetch('/get_containers', {
                method: 'GET',
                headers: { "Cache-Control" : "no-cache" }
            }),
            response = await containers_data.json();

            if (response.error !== undefined) throw response.error;
		    if (!response.success) throw 'Success response from server is false.';

            await create_containers_tr(response.containers);
            return resolve();
        }
        catch(e) { return reject(e) }
    })
}

document.querySelector('#containers-table .table-content .tbody').addEventListener('click', async function(e) {

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
            document.getElementById('containers__delete-container-btn').classList.remove('enabled');
            tr.classList.remove('selected');
        }
        else {
            document.querySelectorAll('#containers-table .tbody .tr.selected').forEach(tr => { tr.classList.remove('selected') });
            tr.classList.add('selected');
            document.getElementById('containers__delete-container-btn').classList.add('enabled');
        }
        return;
    }

    const containers_code = sanitize(tr.getAttribute('data-container-code'));

    try {

        //EDIT CONTAINER
        const template = await (await fetch('../templates/template-create-edit-container.html', {
            method: 'GET',
            headers: { "Cache-Control" : "no-cache" }
        })).text();

        const div = document.createElement('div');
        div.id = 'containers__create-container';
        div.className = 'hidden';
        div.innerHTML = template;
        div.querySelector('.header h3').innerText = 'EDITAR ENVASE';
        div.querySelector('button.green .desc-container i').className = 'fas fa-check-circle';
        div.querySelector('button.green .desc-container p').innerText = 'GUARDAR';

        div.querySelectorAll('input').forEach(input => input.classList.add('has-content'));
        div.querySelector('#containers__create-container-code').value = tr.querySelector('.code').innerText;
        div.querySelector('#containers__create-container-name').value = tr.querySelector('.name').innerText;
        div.querySelector('#containers__create-container-weight').value = tr.querySelector('.weight').innerText;

        div.querySelector('.select-effect').classList.add('has-content');
        div.querySelector('select').value = tr.querySelector('.type').innerText;

        /****************** EVENT LISTENERS ************/
        div.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', custom_input_change);
        });

        //CONTAINER CODE CAN'T BE UPDATED
        div.querySelector('#containers__create-container-code').addEventListener('input', e => e.target.value = containers_code );

        div.querySelector('select').addEventListener('change', async e => {

            const 
            select = e.target,
            type = select.options[select.selectedIndex].value;
    
            select.parentElement.classList.add('has-content');
            const p = select.parentElement.querySelector('p');
            p.innerText = select.options[select.selectedIndex].innerText;
        });
        div.querySelector('select').dispatchEvent(new Event('change', { bubbles: true }));


        div.querySelector('button.red').addEventListener('click', async function() {
            await fade_out_animation(div);
            div.remove();
        });

        div.querySelector('button.green').addEventListener('click', async function() {

            const type_select = div.querySelector('#containers__create-container-type');

            const data = {
                code: containers_code,
                name: sanitize(div.querySelector('#containers__create-container-name').value.trim()),
                type: sanitize(type_select.options[type_select.selectedIndex].value.trim()),
                weight: div.querySelector('#containers__create-container-weight').value.replace(/\D/gm, '')
            };

            try {

                if (data.name.length === 0) throw 'Nombre de contenedor vacío.';
                if (data.type.length === 0) throw 'Tipo de contenedor vacío';
                if (data.weight.length === 0) throw 'Peso de contenedor vacío.';

                const
                save_data = await fetch('/save_container_data', {
                    method: 'POST',
                    headers: { "Content-Type" : "application/json" },
                    body: JSON.stringify(data)
                }),
                response = await save_data.json();

                if (response.error !== undefined) throw response.error;
                if (!response.success) throw 'Success response from server is false.';

                tr.querySelector('.name').innerText = sanitize(response.container.name);
                tr.querySelector('.type').innerText = sanitize(response.container.type);
                tr.querySelector('.weight').innerText = sanitize(response.container.weight) + ' KG';

                div.querySelector('button.red').click();

            }
            catch(e) { error_handler('No se pudo guardar los datos del contenedor') }
        });
    
        document.querySelector('#containers > .content').appendChild(div);
        
        fade_in_animation(div);
        div.classList.remove('hidden');
        div.classList.add('active');
        div.querySelector('#containers__create-container-code').focus();
    }
    catch(e) { error_handler('No se puede editar el envase.', e) }
});

document.querySelector('#containers__delete-container-btn').addEventListener('click', async function(e) {

    const btn = this;
    if (btn_double_clicked(btn) || !btn.classList.contains('enabled')) return;

    const tr = document.querySelector('#containers-table .table-content .tbody .tr.selected');
    if (!!tr === false) return;

    const container_code = sanitize(tr.getAttribute('data-container-code'));

    try {

        const
        delete_container = await fetch('/delete_container', {
            method: 'POST',
            headers: { "Content-Type" : "application/json" },
            body: JSON.stringify({ container_code })
        }),
        response = await delete_container.json();

        console.log(response);

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        tr.remove();

    }
    catch(e) { error_handler('No se pudo eliminar el envase.', e) }
});

document.querySelector('#containers-btns button.green').addEventListener('click', async function() {

    if (btn_double_clicked(this)) return;

    const template = await (await fetch('../templates/template-create-edit-container.html', {
        method: 'GET',
        headers: { "Cache-Control" : "no-cache" }
    })).text();

    const div = document.createElement('div');
    div.id = 'containers__create-container';
    div.className = 'hidden';
    div.innerHTML = template;

    /************** EVENT LISTENERS ************/
    div.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', custom_input_change);
    });

    div.querySelector('select').addEventListener('change', async e => {

        const 
        select = e.target,
        type = select.options[select.selectedIndex].value;

        select.parentElement.classList.add('has-content');
        const p = select.parentElement.querySelector('p');
        p.innerText = select.options[select.selectedIndex].innerText;
    });

    div.querySelector('button.red').addEventListener('click', async function() {
        await fade_out_animation(div);
        div.remove();
    });

    //CREATE CONTAINER
    div.querySelector('button.green').addEventListener('click', async function() {

        const type_select = div.querySelector('#containers__create-container-type');

        const data = {
            code: sanitize(div.querySelector('#containers__create-container-code').value.trim()),
            name: sanitize(div.querySelector('#containers__create-container-name').value.trim()),
            type: sanitize(type_select.options[type_select.selectedIndex].value.trim()),
            weight: div.querySelector('#containers__create-container-weight').value.replace(/\D/gm, '')
        };

        try {

            const
            create_container = await fetch('/create_container', {
                method: 'POST',
                headers: { "Content-Type" : "application/json" },
                body: JSON.stringify(data)
            }),
            response = await create_container.json();

            if (response.error !== undefined) throw response.error;
            if (!response.success) throw 'Success response from server is false.';

            const tr = document.createElement('div');
            tr.className = 'tr';
            tr.setAttribute('data-container-code', response.container.code);
            tr.innerHTML = `
                <div class="td edit">
                    <div>
                        <i class="fas fa-pen-square"></i>
                    </div>
                </div>
                <div class="td code">${sanitize(response.container.code)}</div>
                <div class="td name">${sanitize(response.container.name)}</div>
                <div class="td type">${sanitize(response.container.type)}</div>
                <div class="td weight">${sanitize(response.container.weight)} KG</div>
                <div class="td stock">${(response.container.initial_stock === null) ? 0 : parseInt(response.container.initial_stock)}</div>
            `;

            const selected_tr = div.querySelector('#containers-table .table-content .tbody .tr.selected');
            if (!!selected_tr) selected_tr.classList.remove('selected');

            document.querySelector('#containers-table .table-content .tbody').prepend(tr);
            tr.classList.add('selected');

            div.querySelector('button.red').click();
        }
        catch(e) { error_handler('No se pudo crear el envase', e) }
    });
    

    document.querySelector('#containers > .content').appendChild(div);
        
    fade_in_animation(div);
    div.classList.remove('hidden');
    div.classList.add('active');
    div.querySelector('#containers__create-container-code').focus();

});

(async () => {
    try { await get_containers() }
    catch(e) { error_handler('No se pudo cargar envases.', e) }
})();