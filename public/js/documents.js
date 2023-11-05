const finished_documents = {
    documents: []
}

/***************** FILTERS ******************/
const get_documents_filters = () => {

    const 
    weight_status_select = document.getElementById('documents__weight-status-select'),
    doc_status_select = document.getElementById('documents__doc-status-select'),
    cycle_select = document.getElementById('documents__cycle-select'),
    data = {
        sort: document.querySelector('#documents__table .th.selected').classList[1],
        ascending_order: document.querySelector('#documents__table .th.selected').getAttribute('data-ascending-order'),
        start_date: document.getElementById('documents__start-date').value,
        end_date: document.getElementById('documents__end-date').value,
        weight_status: weight_status_select.options[weight_status_select.selectedIndex].value,
        doc_status: doc_status_select.options[doc_status_select.selectedIndex].value,
        cycle: cycle_select.options[cycle_select.selectedIndex].value,
        doc_number: document.getElementById('documents__doc-number').value.replace(/\D/gm, ''),
        entity: document.getElementById('documents__entity').value
    }

    //SANITIZE OBJECT
	for (let key in data) { data[key] = sanitize(data[key]) }
    return data;
}

document.querySelector('#documents__doc-number').addEventListener('input', text_input_to_number);

document.querySelector('#documents__doc-number').addEventListener('keyup', async e => {

    if (e.key !== 'Enter') return;

    const data = get_documents_filters();

    try {

        check_loader();

        const
        get_documents = await fetch('/documents_docs_by_number', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json"
            },
            body: JSON.stringify(data)
        }),
        response = await get_documents.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        console.log(response)

        documents.querySelectorAll('#documents__table .tbody .tr').forEach(tr => { tr.remove() })
        await documents_create_trs(response.docs)

        //RESET FILTERS
        document.querySelectorAll('#documents__filters input').forEach(input => { 
            if (input.id !== e.target.id) input.value = '' 
        });
        document.getElementById('documents__entity').classList.remove('has-content');

    }
    catch(e) { error_handler('Error al buscar documento.', e) }
    finally { check_loader() }
})

document.querySelector('#documents__entity').addEventListener('input', e => {
    if (
        (e.target.value.length === 0 && e.target.classList.contains('has-content')) ||
        (e.target.value.length > 0 && !e.target.classList.contains('has-content'))
    ) e.target.classList.toggle('has-content');
})

const documents_create_trs = docs => {
    return new Promise(resolve => {

        for (let i = 0; i < docs.length; i++) {

            const tr = document.createElement('div');
            tr.className = 'tr';
            tr.setAttribute('data-weight-id', docs[i].weight_id);
            tr.setAttribute('data-weight-status', docs[i].weight_status);
            tr.innerHTML = `
                <div class="td line">${i + 1}</div>
                <div class="td weight_status"></div>
                <div class="td weight_id">${thousand_separator(docs[i].weight_id)}</div>
                <div class="td cycle" data-cycle="${parseInt(docs[i].cycle)}">
                    <div>
                        <i></i>
                        <p>${sanitize(docs[i].cycle_name.toUpperCase())}</p>
                    </div>
                </div>
                <div class="td plates">${sanitize(docs[i].plates)}</div>
                <div class="td date"></div>
                <div class="td number"></div>
                <div class="td entity">${sanitize(docs[i].entity)}</div>
            `;

            let weight_status;
            if (docs[i].weight_status === 'I') weight_status = 'INGRESADO';
            else if (docs[i].weight_status === 'T') weight_status = 'TERMINADO';
            else if (docs[i].weight_status === 'N') weight_status = 'NULO';
            else weight_status = 'ERROR';

            tr.querySelector('.weight_status').innerText = weight_status;

            let i_class;
            if (docs[i].cycle === 1) i_class = 'fad fa-arrow-down';
            else if (docs[i].cycle === 2) i_class = 'fad fa-arrow-up';
            else if (docs[i].cycle === 3) i_class = 'fad fa-arrow-down';
            tr.querySelector('.cycle i').className = i_class;

            tr.querySelector('.date').innerText = (docs[i].date === null) ? '-' : new Date(docs[i].date).toLocaleString('es-CL').split(' ')[0].replace(',','');
            tr.querySelector('.number').innerText = (docs[i].number === null) ? '-' : thousand_separator(docs[i].number);

            document.querySelector('#documents__table .tbody').appendChild(tr);
            
        }

        return resolve();
    })
}

const documents_show_weight = async e => {
    try {

        const 
        tr = document.querySelector('#documents__table .tbody .tr.selected');
        modal = document.createElement('div');
        
        modal.id = 'documents__modal';
        document.querySelector('#documents > .config').appendChild(modal);

        await visualize_finished_weight(tr.getAttribute('data-weight-id'), modal, true);
        
    } catch(e) { error_handler('Error al intentar abrir pesaje.', e) }
}

const documents_print_weight = async () => {

    const weight_id = document.querySelector('#documents__table .tbody .tr.selected').getAttribute('data-weight-id');

    try {

        const
		get_weight = await fetch('/get_finished_weight', {
			method: 'POST', 
			headers: { 
				"Content-Type" : "application/json"
			}, 
			body: JSON.stringify({ weight_id })
		}),
		response = await get_weight.json();

		if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        const print_weight = new create_weight_object(response.weight_object);
		response.weight_object.documents.forEach(doc => { 
			const new_doc = new create_document_object(doc);
			doc.rows.forEach(row => {
				new_doc.rows.push(new document_row(row));
			}) 
			print_weight.documents.push(new_doc);
		});

		await print_weight.print_weight();

    } catch(e) { error_handler('Error al intentar imprimir pesaje', e) }
}

const documents_export_results_to_excel = async type => {

    const data = get_documents_filters();
    data.type = type;

    //GET MIN AND MAX VALUES FOR WEIGHTS IF SHOWING FIRST 100 RESULTS
    if (
        data.cycle === 'All' && data.doc_number.length === 0 && data.doc_status === 'I' && data.end_date.length === 0 && 
        data.entity.length === 0 && data.sort === 'weight_id' && data.start_date.length === 0 && data.weight_status === 'T'
    )
    {
        const weights = [];
        document.querySelectorAll('#documents__table .table-content .tbody .tr').forEach(tr => {
            weights.push(parseInt(tr.getAttribute('data-weight-id')))
        });

        data.min_weight = Math.min(...weights);
        data.max_weight = Math.max(...weights);
    }

    try {

        const
        generate_excel = await fetch('/documents_generate_excel', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json"
            },
            body: JSON.stringify(data)
        }),
        response = await generate_excel.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        const file_name = response.file_name;
		window.open(`${domain}:3000/get_excel_report?file_name=${file_name}`, 'GUARDAR EXCEL');

    } catch(e) { error_handler('Error al intentar generar archivo excel.', e) }
}

const documents_select_row = e => {

    let tr;
    if (e.target.matches('i') || e.target.matches('p')) tr = e.target.parentElement.parentElement.parentElement;
    else if (e.target.className.length === 0) tr = e.target.parentElement.parentElement;
    else if (e.target.classList.contains('td')) tr = e.target.parentElement;
    else if (e.target.classList.contains('tr')) tr = e.target;
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
        if (!!document.querySelector('#documents__context-menu')) menu = document.querySelector('#documents__context-menu');
        else {

            menu = document.createElement('div');
            menu.id = 'documents__context-menu';
            menu.className = 'context-menu';
            menu.innerHTML = `
                <div>
                    <div id="documents__show-weight" class="context-menu__child">
                        <i class="fal fa-balance-scale-right"></i>
                        <span>VER PESAJE</span>
                    </div>
                    <div id="documents__print-weight" class="context-menu__child">
                        <i class="fal fa-print"></i>
                        <span>IMPRIMIR PESAJE</span>
                    </div>
                    <div id="documents__excel-simple" class="context-menu__child">
                        <i class="fal fa-file-edit"></i>
                        <span>EXPORTAR A EXCEL SIMPLE</span>
                    </div>
                    <div id="documents__excel-detailed" class="context-menu__child">
                        <i class="fal fa-file-edit"></i>
                        <span>EXPORTAR A EXCEL DETALLADO</span>
                    </div>
                </div>
            `;
        
            document.querySelector('#documents').appendChild(menu);
            
            document.querySelector('#documents__show-weight').addEventListener('click', documents_show_weight);
            document.querySelector('#documents__print-weight').addEventListener('click', documents_print_weight);
            document.querySelector('#documents__excel-simple').addEventListener('click', () => {
                documents_export_results_to_excel('simple')
            });
            document.querySelector('#documents__excel-detailed').addEventListener('click', () => {
                documents_export_results_to_excel('detailed');
            });
        }

        menu.style.left = e.pageX + 'px';
        menu.style.top = e.pageY + 'px';

        document.body.addEventListener('click', async () => { 
            if (!!document.querySelector('#documents__context-menu')) 
                document.querySelector('#documents__context-menu').remove();
        }, { once: true })
    }
}

const documents_sort_docs = e => {

    let th;
    if (e.target.matches('i') || e.target.matches('span')) th = e.target.parentElement.parentElement;
    else if (e.target.className.length === 0) th = e.target.parentElement;
    else if (e.target.classList.contains('th')) th = e.target;
    else return;

    if (th.classList.contains('line')) return;

    document.querySelectorAll('#documents__table .tbody .tr').forEach(tr => { tr.remove() });    

    const filter = th.classList[1];
    let ascending_order = true;

    if (th.classList.contains('selected')) {
        finished_documents.documents = finished_documents.documents.reverse();
        ascending_order = false;
    }
    else finished_documents.documents = finished_documents.documents.sortBy(filter);

    document.querySelector('#documents__table .thead .th.selected').classList.remove('selected');
    th.classList.add('selected');
    th.setAttribute('data-ascending-order', ascending_order);

    documents_create_trs(finished_documents.documents);
}

const documents_search_by_client_name = async e => {

    if (e.key !== 'Enter') return;

    const data = get_documents_filters();

    try {

        check_loader();

        const
        get_documents = await fetch('/documents_get_docs_by_entity', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json"
            },
            body: JSON.stringify(data)
        }),
        response = await get_documents.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        finished_documents.documents = response.documents;

        document.querySelectorAll('#documents__table .tbody .tr').forEach(tr => { tr.remove() });
        await documents_create_trs(finished_documents.documents);

    } 
    catch(e) { error_handler('Error al buscar documentos por cliente / proveedor.', e) }
    finally { check_loader() }
}

const documents_select_on_change = async e => {

    await documents_search_with_filters();
    const select = e.target;
    select.previousElementSibling.innerText = select.options[select.selectedIndex].innerText;

}

const documents_search_with_filters = () => {
    return new Promise(async (resolve, reject) => {
        try {

            const data = get_documents_filters();
            check_loader();
            
            const
            get_documents = await fetch('/documents_get_docs_from_filters', {
                method: 'POST',
                headers: {
                    "Content-Type" : "application/json"
                },
                body: JSON.stringify(data)
            }),
            response = await get_documents.json();
    
            if (response.error !== undefined) throw response.error;
            if (!response.success) throw 'Success response from server is false.';
    
            finished_documents.documents = response.documents;
    
            document.querySelectorAll('#documents__table .tbody .tr').forEach(tr => { tr.remove() });
            await documents_create_trs(finished_documents.documents);
    
            document.getElementById('documents__start-date').value = response.date.start;
            document.getElementById('documents__end-date').value = response.date.end;
            
            check_loader()

            return resolve();

        }
        catch(error) {
            error_handler('Error al buscar documentos por ciclo', error);
            check_loader()
            return reject(error)
        }
    })
}

const documents_search_by_date = e => {
    if (e.target.value.length < 10) return;
    debounce(documents_search_with_filters(), 750);
}

(async () => {
    try {

        const 
        get_documents = await fetch('/documents_get_docs', {
            method: 'GET',
            headers: {
                "Content-Type" : "application/json"
            }
        }),
        response = await get_documents.json();

        if (response.error !== undefined) throw response.error;
        if (!response.success) throw 'Success response from server is false.';

        finished_documents.documents = response.docs;
        await documents_create_trs(finished_documents.documents);

        document.querySelector('#documents__start-date').addEventListener('input', documents_search_by_date);
        document.querySelector('#documents__end-date').addEventListener('input', documents_search_by_date);
        
        document.getElementById('documents__entity').addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            documents_search_with_filters();
        });
        
        document.getElementById('documents__cycle-select').addEventListener('change', documents_select_on_change);
        document.getElementById('documents__doc-status-select').addEventListener('change', documents_select_on_change);
        document.getElementById('documents__weight-status-select').addEventListener('change', documents_select_on_change);

        document.querySelector('#documents__table .tbody').addEventListener('mouseup', documents_select_row);
        document.querySelector('#documents__table .thead .tr').addEventListener('click', documents_sort_docs);

    } catch(error) { error_handler('Error al buscar documentos.', error) }
})();