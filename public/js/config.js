//ENTITIES
document.getElementById('config__entities').addEventListener('click', async function() {

    if (clicked) return;

    const
    fade_out_div = document.getElementById('config-grid'),
    fade_in_div = document.getElementById('config-content'),
    template = await (await fetch('/templates/template-client-main.html')).text();

    fade_out_animation(fade_out_div);

    fade_in_div.innerHTML = template;
    await load_css('css/clients.css');
    await load_script('js/clients.js')

    await clients_get_entities();

    while (!fade_out_div.classList.contains('animationend')) { await delay(10) }
    
    fade_in_animation(fade_in_div);
    fade_out_div.classList.remove('animationend');

    breadcrumbs('add', 'config', 'CLIENTES / PROVEEDORES');
});

//PRODUCTS
document.getElementById('config__products').addEventListener('click', async e => {

    if (clicked) return;

    const
    fade_out_div = document.getElementById('config-grid'),
    fade_in_div = document.getElementById('config-content'),
    template = await (await fetch('/templates/template-products.html')).text();
    fade_out_animation(fade_out_div);

    fade_in_div.innerHTML = template;
    await load_css('css/products.css');
    await load_script('js/products.js')

    document.querySelectorAll('#products__table .tbody .tr').forEach(tr => { tr.remove() });
    await get_all_products();

    while (!fade_out_div.classList.contains('animationend')) { await delay(10) }
    
    fade_in_animation(fade_in_div);
    fade_out_div.classList.remove('animationend');

    breadcrumbs('add', 'config', 'PRODUCTOS');    

});