const analytics = {};

document.querySelector('#analytics__breadcrumb li:first-child').addEventListener('click', async e => {

    if (clicked) return;
	prevent_double_click();

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
	prevent_double_click();

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

    } catch(error) { error_handler('Error al intentar abrir productos', error) }
});

/*************************** STOCK REPORTS *****************************/
document.getElementById('analytics__containers-stock-btn').addEventListener('click', async e => {

    if (clicked) return;
	prevent_double_click();

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
                <div class="td name">${DOMPurify().sanitize(entity.name)}</div>
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

        while (!fade_out_div.classList.contains('animationend')) { await delay(10) }
        fade_out_div.classList.remove('animationend', 'active');
        
        await fade_in_animation(fade_in_div);
        fade_in_div.classList.add('active');
        fade_in_div.classList.remove('hidden');

		breadcrumbs('add', 'analytics', 'STOCK ENVASES');

    } catch(error) { error_handler('Error al intentar abrir stock de envases.', error) }
});

document.querySelector('#analytics__entities-table .tbody').addEventListener('click', async e => {

    if (clicked) return;
	prevent_double_click();

    let tr;
    if (e.target.className === 'tr') tr = e.target;
    else if (e.target.classList.contains('td')) tr = e.target.parentElement;
    else return;

    const entity_id = DOMPurify().sanitize(tr.getAttribute('data-entity-id'));

    try {

        const
        get_entity_movements = await fetch('/analytics_entity_movements', {
            method: 'POST', 
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify({ entity_id })
        }),
        response = await get_entity_movements.json();

        if (response.error !== undefined) throw response.error;
		if (!response.success) throw 'Success response from server is false.';

        

        console.log(response)

    } catch(error) { error_handler('Error al intentar abrir detalles de stock de entidad.', error) }
});