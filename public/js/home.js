"use strict";

const home_object = {
    cycle: 1,
    filters: {
        cut: null,
        type: null,
        internal: false
    },
    date: {
        start: null,
        end: null
    },
    internal: false
}

//TOUCH EVENTS ON PRODUCTS MOVEMENTS IN MODAL
const product_drag = {
    active: false,
    direction: null,
    min_x_move: 60,
    max_x_move: 2 * (screen_width / 3),
    max_y_move: 40,
    x_temp: null,
    x_start: null,
    y_start: null,
    x_end: null,
    y_end: null,
    x_move: null,
    x_offset: null
}

//GENERAL STUFF
function update_products_list(data) {
    return new Promise(resolve => {

        let show_percentage = true;
        for (let i = 0; i < data.products.length; i++) {
            if (data.products[i].kilos <= 0) {
                show_percentage = false;
                break
            }            
        }
        
        const table = document.querySelector('#home-products');
        data.products.forEach(product => {

            const product_div = document.createElement('div');
            product_div.className = 'product';
            product_div.setAttribute('data-product-code', product.code);
    
            product_div.innerHTML = `
                <div class="product-img-container">
                    <div class="product-img">
                        <div style="background-image:url('${product.image}')"></div>
                    </div>
                </div>
                <h4 class="product-name">${sanitize(product.name.split('-')[0].replace(product.type, '').trim())}</h4>
                <p class="kilos">${thousand_separator(parseInt(product.kilos))} KG</p>
                <p>${(show_percentage) ? (Math.floor(((parseInt(product.kilos) / data.total) * 10000)) / 100) + '%' : ''}</p>
            `;
            table.appendChild(product_div)    
            
        });
        
        const 
        parron_percentage = (data.total === 0) ? 0 : Math.floor(((data.parron / data.total) * 10000)) / 100,
        packing_percentage = (data.total === 0) ? 0 : Math.floor(((data.packing / data.total) * 10000)) / 100;
    
        document.querySelector('#home-statistics__total .stats-data p').innerText = `${thousand_separator(data.total)} KG`;
    
        document.querySelector('#home-statistics__parron .stats-data span').innerText = `${parron_percentage}%`;
        document.querySelector('#home-statistics__parron .stats-data p').innerText = `${thousand_separator(data.parron)} KG`;
    
        document.querySelector('#home-statistics__packing .stats-data span').innerText = `${packing_percentage}%`;
        document.querySelector('#home-statistics__packing .stats-data p').innerText = `${thousand_separator(data.packing)} KG`;
    
        if (screen_width < 768) {
            document.querySelector('#home-statistics__date .stats-data p:first-child').innerText = new Date(home_object.date.start).toLocaleString('es-CL').split(' ')[0].replace(/[,]/gm, '');
            document.querySelector('#home-statistics__date .stats-data p:last-child').innerText = new Date(home_object.date.end).toLocaleString('es-CL').split(' ')[0].replace(/[,]/gm, '');
        }

        setTimeout(resolve, 0);
    })
}

function home_update_products(response) {
    return new Promise(async (resolve, reject) => {

        const products_div = document.getElementById('home-products'),
        products_in_grid = (products_div.children.length === 0) ? false : true;

        if (products_in_grid) fade_out_animation(products_div);
        else products_div.classList.add('hidden');

        try {

            const data = {
                packing: response.total.packing,
                parron: response.total.parron,
                total: response.total.packing + response.total.parron
            },
            promise_array = [],
            products_array = [];

            if (products_in_grid)
                while (!products_div.classList.contains('animationend')) { await delay(5) }
    
            response.products.forEach(product => {
                promise_array.push(new Promise(resolve => {
                    const img = new Image();
                    img.onload = () => { resolve() }
                    img.src = (product.image === null) ? './images/grapes/no-image.jpg' : product.image;
                    products_array.push({ 
                        code: product.code, 
                        name: product.name.trim(), 
                        kilos: product.total, 
                        image: img.src,
                        type: product.type
                    });
                }))
            });
    
            await Promise.all(promise_array);
            data.products = products_array.sortBy('kilos');
    
            products_div.innerHTML = '';
            await update_products_list(data);

            //WAIT FOR ANIMATION TO FINISH IF IT HASN'T
            if (products_in_grid) {
                console.log('waiting')
                while (!products_div.classList.contains('animationend')) { await delay(10) }
                products_div.classList.remove('animationend');
            }

            fade_in_animation(products_div);
            products_div.classList.remove('hidden');
            
            const
            cycle_icon = document.querySelector('#home-statistics__cycle .stats-icon i'),
            cycle_text = document.querySelector('#home-statistics__cycle .stats-data p');
    
            if (response.cycle === 1) {
                cycle_icon.className = 'fad fa-arrow-down';
                cycle_text.innerText = 'RECEPCION';
            } else if (response.cycle === 2) {
                cycle_icon.className = 'fad fa-arrow-up';
                if (home_object.filters.internal) cycle_text.innerText = 'DESPACHOS INTERNOS';
                else cycle_text.innerText = cycle_text.innerText = 'DESPACHO';
            }
            else if (response.cycle === 3) {
                cycle_icon.className = 'fal fa-warehouse';
                cycle_text.innerText = 'INGRESOS BODEGA';
            }
            else if (response.cycle === 0) {
                cycle_icon.className = 'fad fa-sort-alt';
                cycle_text.innerText = 'STOCK BODEGA';
            }
    
            if (!!document.querySelector('#home-statistics__cycle .dropdown-container'))
                document.querySelector('#home-statistics__cycle .dropdown-container').classList.remove('active');
            
            document.querySelector('#home-statistics__cycle').setAttribute('data-cycle', response.cycle);

            //UPDATE HOME OBJECT
            home_object.cycle = response.cycle;
            home_object.products = response.products;
            home_object.date.start = sanitize(response.season.start);
            home_object.date.end = sanitize(response.season.end);
            home_object.total = response.total;
            home_object.filters.type = sanitize(response.type);

            if (screen_width < 576) {
                document.querySelector('#home-statistics__date .stats-data > p:first-child').innerText = new Date(home_object.date.start).toLocaleString('es-CL').split(' ')[0].replace(/[,]/gm, '');
                document.querySelector('#home-statistics__date .stats-data > p:last-child').innerText = new Date(home_object.date.end).toLocaleString('es-CL').split(' ')[0].replace(/[,]/gm, '');    
            }

            document.querySelector('#home-statistics__product .stats-data > p').innerText = home_object.filters.type.toUpperCase();

            return resolve();

        } catch(e) { return reject(e) }
    })
}

function home_change_cycle(cycle) {
    return new Promise(async (resolve, reject) => {

        if (document.querySelector('#analytics').classList.contains('active')) check_loader();
        
        const
        data = {
            cycle: parseInt(cycle),
            internal: sanitize(home_object.filters.internal),
            product_type: sanitize(home_object.filters.type),
            start_date: sanitize(home_object.date.start),
            end_date: sanitize(home_object.date.end)    
        }

        try {
    
            const
            change_cycle = await fetch('/get_products_by_date', {
                method: 'POST', 
                headers: { 
                    "Content-Type" : "application/json",
                    "Authorization" : token.value 
                }, 
                body: JSON.stringify(data)
            }),
            response = await change_cycle.json();
    
            if (response.error !== undefined) throw response.error;
            if (!response.success) throw 'Success response from server is false.';

            await home_update_products(response);

            if (!!document.querySelector('#loader')) check_loader();
            
            return resolve();
    
        } catch(error) { check_loader(); error_handler('Error al obtener ciclo', error); reject(); }    
    })
}

//CHANGE CYCLE STUFF

//CLICK ON DROPDOWN -> BIGGER SCREENS ONLY
function home_change_cycle_event(e) {

    if (clicked) return;

    let dropdown_item;
    if (e.target.matches('i')) dropdown_item = e.target.parentElement.parentElement;
    else if (e.target.matches('p')) dropdown_item = e.target.parentElement;
    else if (e.target.classList.contains('icon-container')) dropdown_item = e.target.parentElement;
    else if (e.target.classList.contains('dropdown-item')) dropdown_item = e.target;
    else return;
    
    home_object.filters.internal = (dropdown_item.nextElementSibling === null) ? true : false;

    const cycle = parseInt(dropdown_item.getAttribute('data-cycle'));
    if (cycle === home_object.cycle) return;

    home_change_cycle(cycle);
}

//CLICK ON BUTTON CYCLE IN MODAL -> FOR SMALLER SCREEN ONLY
async function home_change_cycle_in_modal() {

    if (clicked) return;

    const template = `
        <div id="home-modal__change-cycle">
            <div id="home-modal__close">
                <i class="fas fa-times-circle"></i>
            </div>
            <h3>SELECCIONAR CICLO</h3>
            <div id="home-modal__change-cycle-buttons">
                <div class="home-modal__change-cycle" data-cycle="1" data-cycle-name="recepcion">
                    <div class="icon-container">
                        <i class="fad fa-arrow-down"></i>
                    </div>
                    <p>RECEPCION</p>
                </div>
                <div class="home-modal__change-cycle" data-cycle="2" data-cycle-name="despacho">
                    <div class="icon-container">
                        <i class="fad fa-arrow-up"></i>
                    </div>
                    <p>DESPACHO</p>
                </div>
                <div class="home-modal__change-cycle" data-cycle="3" data-cycle-name="ingresos bodega">
                    <div class="icon-container">
                        <i class="fal fa-warehouse"></i>
                    </div>
                    <p>INGRESOS<br>BODEGA</p>
                </div>
            </div>
        </div>
    `;

    document.querySelector('#home-modal__data').innerHTML = template;
    
    //CHANGE CYCLE IN SMALLER SCREENS
    document.querySelector('#home-modal__change-cycle-buttons').addEventListener('click', async e => {

        if (clicked) return;

        let btn;
        if (e.target.classList.contains('home-modal__change-cycle')) btn = e.target;
        else if (e.target.className === 'icon-container' || e.target.matches('p')) btn = e.target.parentElement;
        else if (e.target.matches('i')) btn = e.target.parentElement.parentElement;
        else return;

        if (btn.classList.contains('active')) return;

        const cycle = parseInt(btn.getAttribute('data-cycle'));
        home_object.filters.internal = (cycle === 3) ? true : false;

        await home_change_cycle(cycle);

        document.querySelector('.home-modal__change-cycle.active').classList.remove('active');
        btn.classList.add('active');

    })
    
    document.getElementById('home-modal__close').addEventListener('click', async () => {

        const new_cycle = parseInt(document.querySelector('.home-modal__change-cycle.active').getAttribute('data-cycle'));
        document.querySelector('#home-modal').classList.remove('active');
        
        if (new_cycle !== home_object.cycle) await delay(600);
        else await home_change_cycle(new_cycle);
        
        document.querySelector('#home-modal__change-cycle').remove();
    });

    document.querySelector(`.home-modal__change-cycle[data-cycle="${home_object.cycle}"]`).classList.add('active');
    document.querySelector('#home-modal').classList.add('active')
}

async function home_smaller_screen_filter_menu() {

    if (animating) return;
    animating = true;

    try {

        const template = `
            <div class="header">
                <h3>SELECCIONAR FILTROS</h3>
            </div>

            <div id="home__smaller-screen-filters" class="body">

                <div>

                    <div data-cycle="1">
                        <div class="icon-container">
                            <i class="fad fa-arrow-down"></i>
                        </div>
                        <p>RECEPCION</p>
                    </div>

                    <div data-cycle="2">
                        <div class="icon-container">
                            <i class="fad fa-arrow-up"></i>
                        </div>
                        <p>DESPACHO</p>
                    </div>

                    <div data-cycle="3">
                        <div class="icon-container">
                            <i class="fal fa-warehouse"></i>
                        </div>
                        <p>INGRESOS<br>BODEGA</p>
                    </div>

                    <div data-cycle="0">
                        <div class="icon-container">
                            <i class="fad fa-sort-alt"></i>
                        </div>
                        <p>STOCK<br>BODEGA</p>
                    </div>
                
                </div>

                <hr>

                <div>

                    <div>
                        <select>
                            <option disabled value="">SELECCIONAR TEMPORADA</option>
                        </select>
                    </div>

                    <div class="input-effect-container">
                        <input id="home-date__start" type="date" class="input-effect has-content">
                        <label>FECHA INICIAL</label>
                        <span class="focus-border"></span>
                    </div>

                    <div class="input-effect-container">
                        <input id="home-date__end" type="date" class="input-effect has-content">
                        <label>FECHA FINAL</label>
                        <span class="focus-border"></span>
                    </div>

                </div>

                <hr>

                <div>

                    <div data-product="Uva">
                        <div class="icon-container">
                            <i class="fas fa-check"></i>
                        </div>
                        <p>UVA</p>
                    </div>

                    <div data-product="Pasas">
                        <div class="icon-container">
                            <i class="fas fa-check"></i>
                        </div>
                        <p>PASAS</p>
                    </div>

                    <div data-product="Otros">
                        <div class="icon-container">
                            <i class="fas fa-check"></i>
                        </div>
                        <p>OTROS</p>
                    </div>

                </div>

            </div>

            <div class="footer">
                <button class="svg-wrapper enabled red">
                    <svg height="45" width="160" xmlns="http://www.w3.org/2000/svg">
                        <rect class="shape" height="45" width="160" />
                    </svg>
                    <div class="desc-container">
                        <i class="fas fa-times-circle"></i>
                        <p>CANCELAR</p>
                    </div>
                </button>

                <button class="svg-wrapper enabled green">
                    <svg height="45" width="160" xmlns="http://www.w3.org/2000/svg">
                        <rect class="shape" height="45" width="160" />
                    </svg>
                    <div class="desc-container">
                        <i class="fas fa-check-circle"></i>
                        <p>ACEPTAR</p>
                    </div>
                </button>
            </div>
        `;

        const container = document.createElement('div');
        container.id = 'home-products__small-screen-filters';
        container.className = 'hidden';
        container.innerHTML = template;

        container.querySelector(`div[data-cycle="${home_object.cycle}"]`).classList.add('active');
        container.querySelector('#home-date__start').value = home_object.date.start;
        container.querySelector('#home-date__end').value = home_object.date.end;
        container.querySelector(`div[data-product="${home_object.filters.type}"]`).classList.add('active');

        const seasons = home_object.seasons;

        for (let i = seasons.length - 1; i >= 0; i--) {
            const option = document.createElement('option');
            option.setAttribute('data-start', seasons[i].start);
            option.setAttribute('data-end', seasons[i].end);
            option.innerText = seasons[i].name;
            option.value = "";
            container.querySelector('select').appendChild(option);
        }

        /****************** EVENT LISTENERS ****************/

        container.querySelectorAll('div[data-cycle]').forEach(div => {
            div.addEventListener('click', function() {
                if (clicked) return;
                container.querySelector('.active[data-cycle]').classList.remove('active');
                this.classList.add('active');
            });
        });

        container.querySelector('select').addEventListener('change', function() {
            
            const 
            select = this,
            option = select.options[select.selectedIndex],
            start = option.getAttribute('data-start'),
            end = option.getAttribute('data-end');

            container.querySelector('#home-date__start').value = start;
            container.querySelector('#home-date__end').value = end;

        });

        container.querySelectorAll('div[data-product]').forEach(div => {
            div.addEventListener('click', function() {
                if (clicked) return;
                container.querySelector('.active[data-product]').classList.remove('active');
                this.classList.add('active');
            });
        });


        container.querySelector('button.red').addEventListener('click', async () => {
            if (clicked) return;
            await fade_out_animation(container);
            container.remove();
        })

        container.querySelector('button.green').addEventListener('click', async () => {
            
            if (clicked) return;

            await check_loader();

            const data = {
                cycle: parseInt(container.querySelector('.active[data-cycle]').getAttribute('data-cycle')),
                product_type: sanitize(container.querySelector('.active[data-product]').getAttribute('data-product')),
                start_date: sanitize(container.querySelector('#home-date__start').value),
                end_date: sanitize(container.querySelector('#home-date__end').value)
            }

            try {

                const
                change_cycle = await fetch('/get_products_by_date', {
                    method: 'POST', 
                    headers: { 
                        "Content-Type" : "application/json",
                        "Authorization" : token.value 
                    }, 
                    body: JSON.stringify(data)
                }),
                response = await change_cycle.json();
        
                if (response.error !== undefined) throw response.error;
                if (!response.success) throw 'Success response from server is false.';

                await home_update_products(response);
                check_loader();
                container.querySelector('button.red').click();

            } catch(e) { check_loader(); error_handler('No se pudieron aplicar los filtros.', e) }
        });

        document.getElementById('home-products').appendChild(container);
        fade_in_animation(container);
        container.classList.remove('hidden');

    }
    catch(e) { error_handler('', e) }
    finally { animating = false }
}

//CLICK ON DROPDOWN -> BIGGER SCREENS ONLY
document.querySelector('#home-statistics__date .dropdown').addEventListener('click', e => {

    if (clicked) return;

    let start_date, end_date;

    //CHANGING DATE DIRECTLY ON INPUTS
    if (e.target.matches('input')) {

        start_date = document.getElementById('home-date__start').value;
        end_date = document.getElementById('home-date__end').value;

    }
    
    // CHANGIN DATE WITH BUTTONS FROM DROPDOWN
    else {

        const 
        now = new Date(),
        day = (now.getDate() < 10) ? '0' + now.getDate() : now.getDate(),
        month = (now.getMonth() < 10) ? '0' + (now.getMonth() + 1) : now.getMonth() + 1, 
        year = now.getFullYear(),
        dropdown_item = e.target.parentElement;
    
        //TODAY
        if (dropdown_item.id === 'home-date__today') {
            start_date = `${year}-${month}-${day}`;
            end_date = `${year}-${month}-${day}`;
        }

        //THIS WEEK
        else if (dropdown_item.id === 'home-date__this-week') {

            let monday = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1);
            console.log(monday)
            if (monday < 10) monday = '0' + monday;

            start_date = `${year}-${month}-${monday}`;
            end_date = `${year}-${month}-${day}`;

            console.log(start_date, end_date)
        }

        //THIS MONTH
        else if (dropdown_item.id === 'home-date__this-month') {

            start_date = `${year}-${month}-01`;
            end_date = end_date = `${year}-${month}-${day}`;

        }

        //FOR SEASONS
        else {

            const season_id = parseInt(dropdown_item.getAttribute('data-season-id'));
            for (let i = 0; i < home_object.seasons.length; i++) {
                if (season_id === home_object.seasons[i].id) {
                    start_date = home_object.seasons[i].start;
                    end_date = home_object.seasons[i].end;
                    break;
                }
            }
        }    
    }

    get_products_by_date(start_date, end_date);
});

function get_products_by_date(start_date, end_date) {
    return new Promise(async (resolve, reject) => {
        
        if (home_object.date.start === start_date && home_object.date.end === end_date) return resolve();
    
        const 
        products = document.getElementById('home-products'),
        products_in_grid = (products.children.length === 0) ? false : true;

        if (products_in_grid) fade_out_animation(products);
        else products.classList.add('hidden');
    
        try {

            check_loader();
    
            if (!validate_date(start_date) || !validate_date(end_date)) throw 'Fecha no válida';
            if (start_date < '2019-01-01') throw 'Valor mínimo en fecha de inicio es 01-01-2019';
            if (start_date > end_date) {
                start_input.value = end_date;
                start_date = end_date;
            }
    
            const
            data = {
                cycle: parseInt(home_object.cycle),
                product_type: sanitize(home_object.filters.type),
                start_date: sanitize(start_date),
                end_date: sanitize(end_date)
            },
            get_products = await fetch('/get_products_by_date', {
                method: 'POST', 
                headers: { 
                    "Content-Type" : "application/json",
                    "Authorization" : token.value 
                }, 
                body: JSON.stringify(data)
            }),
            response = await get_products.json();
    
            if (response.error !== undefined) throw response.error;
            if (!response.success) throw 'Success response from server is false.';

            await home_update_products(response);
            check_loader();
            return resolve();

        } catch(error) { check_loader(); error_handler('Error al buscar productos por fecha', error); return reject() }
    })
}

function home_products_date() {

    const
    start_input = document.getElementById('home-date__start'),
    start_date = sanitize(start_input.value),
    end_input = document.getElementById('home-date__end'),
    end_date = sanitize(end_input.value);

    get_products_by_date(start_date, end_date);
}

//CHANGE PRODUCT STUFF
function home_change_product(product_type) {
    return new Promise(async (resolve, reject) => {
        
        check_loader();

        const
        data = {
            cycle: parseInt(home_object.cycle),
            start_date: sanitize(home_object.date.start),
            end_date: sanitize(home_object.date.end),
            product_type: sanitize(product_type) 
        }
    
        try {
    
            const
            change_cycle = await fetch('/get_products_by_date', {
                method: 'POST', 
                headers: { 
                    "Content-Type" : "application/json",
                    "Authorization" : token.value 
                }, 
                body: JSON.stringify(data)
            }),
            response = await change_cycle.json();
    
            if (response.error !== undefined) throw response.error;
            if (!response.success) throw 'Success response from server is false.';

            await home_update_products(response);
            check_loader();
            return resolve();

        } catch(error) { check_loader(); error_handler(`Error al cambiar producto a ${product_type}.`, error); reject() }
    })
}

//KILOS STATISTICS STUFF
async function filter_products_by_type() {

    if (clicked) return;
     
    const 
    this_div = this,
    target = this_div.id.replace('home-statistics__', '');

    if (home_object.filters.cut === target) return;

    home_object.filters.cut = target;
    document.querySelector('#home-statistics .home-statistics.active').classList.remove('active');
    this_div.classList.add('active');

    const 
    products = document.querySelector('#home-products'),
    products_in_grid = (products.children.length === 0) ? false : true;

    if (products_in_grid) fade_out_animation(products);
    else products.classList.add('hidden');

    const updated_products = home_object.products.map(product => {

        let target_kilos;
        if (target === 'parron') target_kilos = product.kilos.parron;
        else if (target === 'packing') target_kilos = product.kilos.packing;
        else target_kilos = product.total;

        return { 
            code: product.code, 
            name: product.name.split('-')[0].replace(product.type, '').trim(), 
            kilos: target_kilos, 
            image: product.image 
        }
    }).sortBy('kilos');

    //WAIT FOR ANIMATION TO FINISH
    if (products_in_grid) {
        while (!products.classList.contains('animationend')) { await delay(5) }
        products.classList.remove('animationend');
    }

    products.innerHTML = '';
    updated_products.forEach(product => {

        if (product.kilos > 0) {

            let target_total;
            if (target === 'parron') target_total = home_object.total.parron;
            else if (target === 'packing') target_total = home_object.total.packing;
            else target_total = home_object.total.packing + home_object.total.parron;

            const product_div = document.createElement('div');
    
            product_div.className = 'product';
            product_div.setAttribute('data-product-code', sanitize(product.code));
    
            product_div.innerHTML = `
                <div class="product-img-container">
                    <div class="product-img">
                        <div style="background-image:url('${sanitize(product.image)}')"></div>
                    </div>
                </div>
                <h4 class="product-name">${sanitize(product.name)}</h4>
                <p class="kilos">${thousand_separator(product.kilos)} KG</p>
                <p class="percentage">${Math.floor(((product.kilos / target_total) * 10000)) / 100}%</p>
            `;
            products.appendChild(product_div)    
        }
    });

    fade_in_animation(products);
    products.classList.remove('hidden');
}

//CLICK ON PRODUCT IMAGE TO SHOW MOVEMENTS
async function drag_product_in_modal(product_code) {
    return new Promise(async (resolve, reject) => {

        product_drag.active = true;

        const
        home_modal = document.querySelector('#home-modal__data > .row'),
        cycle = home_object.cycle,
        internal = home_object.filters.internal,
        start_date = home_object.date.start,
        end_date = home_object.date.end;

        home_modal.classList.add(`transition`);
        home_modal.style.transform = (product_drag.direction === 'left') ? `translateX(${- screen_width - 10}px)` : `translateX(${screen_width + 10}px)`;
    
        try {
    
            const
            template = await (await fetch('./templates/template-product-movements.html', {
                method: 'GET',
                headers: { "Authorization" : token.value }
            })).text(),
            get_products_movements = await fetch('/get_products_movements', {
                method: 'POST', 
                headers: { 
                    "Content-Type" : "application/json",
                    "Authorization" : token.value 
                }, 
                body: JSON.stringify({ cycle, internal, start_date, end_date, product_code })
            }),
            response = await get_products_movements.json();
    
            if (response.error !== undefined) throw response.error;
            if (!response.success) throw 'Success response from server is false.';
    
            response.template = template;
            await delay(400);
    
            home_modal.style.visibility = 'hidden';
            home_modal.classList.remove('transition');
            home_modal.removeAttribute('style');

            if (product_drag.direction === 'left') {
                home_modal.style.right = - screen_width - 10 + 'px'
                home_modal.style.transition = 'right 200ms 0s linear';
            }
            else {
                home_modal.style.left = - screen_width - 10 + 'px';
                home_modal.style.transition = 'left 200ms 0s linear';
            }
    
            home_modal.innerHTML = '';
            await create_products_modal_content(response);
    
            home_modal.style.visibility = 'visible';
            await delay(10);

            if (product_drag.direction === 'left') home_modal.style.right = '0px';
            else home_modal.style.left = '0px';
    
            await delay(600);
            home_modal.removeAttribute('style');
            product_drag.active = false;
            return resolve();
        } catch(error) { error_handler('Error al buscar recepciones de producto.', error); return reject(); }    
    });
}

async function product_modal_arrow(e) {

    if (clicked) return;

    const
    target = (e.target.matches('i')) ? e.target.parentElement : e.target,
    next = target.getAttribute('data-navigation'),
    current_product = document.querySelector('#home-modal__product-container').getAttribute('data-product-code'),
    products = document.querySelectorAll('#home-products > div');

    let new_product;
    for (let i = 0; i < products.length; i++) {
        const code = products[i].getAttribute('data-product-code');
        if (code === current_product) {
            if (next === 'next') {
                if (i === products.length) return;
                product_drag.direction = 'left';
                new_product = products[i].nextElementSibling.getAttribute('data-product-code');
            } else {
                if (i === 0) return;
                product_drag.direction = 'right';
                new_product = products[i].previousElementSibling.getAttribute('data-product-code');
            }
            break;
        }
    }
    await drag_product_in_modal(new_product);
    product_drag.direction = null;
}

async function home_show_client_documents(e) {
    
    if (clicked) return;

    let tr;
    if (e.target.matches('i') || e.target.matches('p')) tr = e.target.parentElement.parentElement.parentElement;
    else if (e.target.className === 'client-div') tr = e.target.parentElement.parentElement;
    else if (e.target.matches('td')) tr = e.target.parentElement;
    else return;

    //REMOVE DETAILS IF THEY EXIST
    if (!!document.querySelector('#home__product-movements__documents')) {
        await fade_out(document.querySelector('#home__product-movements__documents'));
        document.querySelector('#home__product-movements__documents').classList.add('hidden');
        if (tr.classList.contains('row-with-content')) {
            tr.classList.remove('row-with-content');
            tr.nextElementSibling.remove();
            tr.nextElementSibling.remove();
            return;
        }
        const active_row = document.querySelector('#home-modal__clients tbody .row-with-content');
        active_row.nextElementSibling.remove();
        active_row.nextElementSibling.remove();
        active_row.classList.remove('row-with-content');
    }

    const
    client_id = parseInt(tr.getAttribute('data-client-id')),
    product_code = sanitize(document.getElementById('home-modal__product-container').getAttribute('data-product-code')),
    cycle = parseInt(home_object.cycle),
    start_date = sanitize(home_object.date.start),
    end_date = sanitize(home_object.date.end);
    
    try {

        const
        get_documents = await fetch('/get_product_documents', {
            method: 'POST', 
            headers: { 
                "Content-Type" : "application/json",
                "Authorization" : token.value 
            }, 
            body: JSON.stringify({ client_id, product_code, cycle, start_date, end_date })
        }),
        response = await get_documents.json();

        if (response.error !== undefined) throw response.error;
	    if (!response.success) throw 'Success response from server is false.';

        const 
        tr1 = document.createElement('tr'),
        tr2 = document.createElement('tr');

        tr2.className = 'documents';
        tr2.innerHTML = `
            <td colspan="12">
                <div id="home__product-movements__documents" style="display:none">
                    <div class="head">
                        <div class="row">
                            <div class="documents-branch">SUCURSAL</div>
                            <div class="documents-date">FECHA</div>
                            <div class="documents-plates">VEHICULO</div>
                            <div class="documents-number">DOC.</div>
                            <div class="documents-kilos">KILOS</div>
                        </div>
                    </div>
                    <div class="body"></div>
                </div>
            </td>
        `;

        response.data.forEach(doc => {
            const row = document.createElement('div');
            row.className='row';
            row.innerHTML = `
                <div class="documents-branch">${sanitize(doc.branch)}</div>
                <div class="documents-date">${new Date(doc.date).toLocaleString('es-CL')}</div>
                <div class="documents-plates">${sanitize(doc.plates)}</div>
                <div class="documents-number"></div>
                <div class="documents-kilos">${thousand_separator(doc.kilos)}</div>    
            `;
            const doc_number = (doc.number === null) ? '-' : thousand_separator(doc.number);
            row.querySelector('.documents-number').innerText = doc_number;
            tr2.querySelector('.body').appendChild(row);
        });
        
        tr.classList.add('row-with-content');
        tr.parentElement.insertBefore(tr1, tr.nextElementSibling);
        tr.parentElement.insertBefore(tr2, tr.nextElementSibling.nextElementSibling);
        
        const details_div = document.querySelector('#home__product-movements__documents');
        fade_in(details_div, 0, 'flex');
        details_div.style.display = 'flex';
        tr.scrollIntoView({ behavior: 'smooth', block: 'start', inline: "nearest" });

    } catch(error) { error_handler('Error al buscar documentos de cliente.', error) }
}

function create_products_modal_content(response) {
    return new Promise(async (resolve, reject) => {
        try {

            document.querySelector('#home-modal__data').innerHTML = response.template;
            const home_modal = document.querySelector('#home-modal__data > .row');
            
            document.querySelector('#home-modal__navigation > div:first-child').addEventListener('click', product_modal_arrow);
            document.querySelector('#home-modal__navigation > div:last-child').addEventListener('click', product_modal_arrow);
            document.querySelector('#home-modal__clients .table-body').addEventListener('click', home_show_client_documents);
        
            home_modal.addEventListener('touchstart', e => {
                if (product_drag.active) return;
                const rect = home_modal.getBoundingClientRect();
                product_drag.x_start = e.targetTouches[0].screenX;
                product_drag.x_temp = e.targetTouches[0].screenX;
                product_drag.x_offset = e.targetTouches[0].clientX - rect.left;
                product_drag.y_start = e.targetTouches[0].screenY;
                product_drag.y_temp = e.targetTouches[0].screenY;
            
            }, true);
            
            home_modal.addEventListener('touchmove', e => {
                if (product_drag.active) return;
                product_drag.x_end = e.changedTouches[0].screenX;
                product_drag.y_end = e.changedTouches[0].screenY;
                
                const 
                x_move = Math.abs(product_drag.x_temp - product_drag.x_end),
                y_move = Math.abs(product_drag.y_start - product_drag.y_end);
            
                if (y_move > product_drag.max_y_move) return;
                if (x_move < product_drag.min_x_move) return;
            
                product_drag.x_temp = screen_width;
                product_drag.x_move = x_move;
                home_modal.style.transform = `translateX(${e.targetTouches[0].clientX - product_drag.x_offset}px)`;
            
            }, true);
            
            home_modal.addEventListener('touchend', async e => {
                if (product_drag.active) return;
                if (product_drag.x_start === null || product_drag.x_end === null) return;
            
                product_drag.x_end = e.changedTouches[0].clientX;
            
                if (product_drag.x_end - product_drag.x_start < 0 ) product_drag.direction = 'left';
                else product_drag.direction = 'right';
            
                const x_moved = Math.abs(product_drag.x_start - product_drag.x_end);
            
                if (x_moved < product_drag.max_x_move) {
                    home_modal.classList.add(`transition`);
                    home_modal.removeAttribute('style');
                    await delay(350);
                    home_modal.classList.remove('transition');
                } else {
                    const 
                    products_code = document.getElementById('home-modal__product-container').getAttribute('data-product-code'),
                    products = document.querySelectorAll('#home-products > div');
            
                    let product_code;
                    for (let i = 0; i < products.length; i++) {
                        const code = products[i].getAttribute('data-product-code');
                        if (code === products_code) {
                            if (product_drag.direction === 'left') product_code = products[i].nextElementSibling.getAttribute('data-product-code');
                            else product_code = products[i].previousElementSibling.getAttribute('data-product-code');
                            break;
                        }
                    }
            
                    await drag_product_in_modal(product_code);
                }
            
                product_drag.direction = null;
                product_drag.x_temp = null;
                product_drag.x_start = null;
                product_drag.y_start = null;
                product_drag.x_end = null;
                product_drag.y_end = null;
                product_drag.x_move = null;
                product_drag.x_offset = null;
            });
        
            const
            product_code = response.code,
            img = document.querySelector(`#home-products .product[data-product-code="${product_code}"] .product-img > div`).style.backgroundImage,
            modal = document.getElementById('home-modal'),
            modal_content = document.querySelector('#home-modal__data > .row'),
            data = { 
                clients: response.clients.sortBy('total'),
                packing: response.packing,
                parron: response.parron,
                total: response.packing + response.parron
            };
        
            document.getElementById('home-modal__product-container').setAttribute('data-product-code', product_code);
            
            modal_content.querySelector('#home-modal__close').addEventListener('click', async () => {
                await fade_out(modal);
                modal.classList.remove('active');
                document.querySelector('#home-modal__data').firstElementChild.remove();
            });
            modal_content.querySelector('#home-modal__product-img > div').style.backgroundImage = img;
        
            let product_name;
            for (let i = 0; i < home_object.products.length; i++) {
                if (home_object.products[i].code === product_code) {
                    product_name = home_object.products[i].name.toUpperCase();
                    break;
                }
            }
            modal_content.querySelector('#home-modal__product-container > h3').innerText = product_name;
            
            let parron_p;
            if (screen_width < 768) {
        
                const total_kilos = document.createElement('h4');
                total_kilos.innerText =  `${thousand_separator(data.total)} KG - ${Math.floor(((data.total / (home_object.total.packing + home_object.total.parron)) * 10000)) / 100}%`;
                document.getElementById('home-modal__product-container').appendChild(total_kilos);
        
                document.getElementById('home-modal__product-container').appendChild(document.querySelector('#home-modal__data .home-modal__kilos-container'));
                modal_content.querySelector('.home-modal__kilos-container .home-modal__kilos').remove();
        
                parron_p = modal.querySelector('.home-modal__kilos-container .home-modal__kilos:first-child p');
        
            } else {
                modal_content.querySelector('.home-modal__kilos-container .home-modal__kilos:first-child p').innerText = `${thousand_separator(data.total)} KG`;
                parron_p = modal.querySelector('.home-modal__kilos-container .home-modal__kilos:nth-child(2) p');
            }
            
            parron_p.innerText = `${thousand_separator(data.parron)} KG - ${Math.floor(((data.parron / data.total) * 10000)) / 100}%`;
            modal_content.querySelector('.home-modal__kilos-container .home-modal__kilos:last-child p').innerText = 
                `${thousand_separator(data.packing)} KG - ${Math.floor(((data.packing / data.total) * 10000)) / 100}%`;   
        
            const table = modal_content.querySelector('#home-modal__clients tbody');
            data.clients.forEach(client => {
                const 
                tr = document.createElement('tr'),
                total = client.kilos.packing + client.kilos.parron;
        
                tr.setAttribute('data-client-id', client.id);
                tr.innerHTML = `
                    <td class="client">
                        <div class="client-div">
                            <i class="fal fa-angle-down"></i>
                            <p>${client.name}</p>
                        </div>
                    </td>
                    <td class="kilos">${thousand_separator(total)}</td>
                    <td class="percentage">${Math.floor(((total / data.total) * 10000)) / 100}%</td>
                `;
                table.appendChild(tr);
            });

            return resolve();

        } catch(e) { return reject(e) }
    })

}

document.getElementById('home-products').addEventListener('click', async e => {
    
    if (clicked || home_object.cycle === 0) return;
    if (e.target.parentElement.className !== 'product-img') return;
    
    const
    cycle = home_object.cycle,
    internal = home_object.filters.internal,
    product_code = e.target.parentElement.parentElement.parentElement.getAttribute('data-product-code'),
    start_date = home_object.date.start,
    end_date = home_object.date.end;
    
    try {

        const
        get_products_movements = await fetch('/get_products_movements', {
            method: 'POST', 
            headers: { 
                "Content-Type" : "application/json",
                "Authorization" : token.value 
            }, 
            body: JSON.stringify({ cycle, internal, start_date, end_date, product_code })
        }),
        response = await get_products_movements.json();

        if (response.error !== undefined) throw response.error;
	    if (!response.success) throw 'Success response from server is false.';

        const template = await (await fetch('./templates/template-product-movements.html')).text();
        response.template = template;

        const modal = document.getElementById('home-modal');

        await create_products_modal_content(response);
        
        fade_in(modal, 0, 'flex');
        modal.classList.add('active');

    } catch(error) { error_handler('Error al buscar recepciones de producto.', error) }
});

function home_get_initial_products() {
    return new Promise(async (resolve, reject) => {
        try {

            const 
            get_grapes_total = await fetch('/grapes_data', { 
                method: 'GET', 
                headers: {
                    "Cache-Control" : "no-cache",
                    "Authorization" : token.value 
                } 
            }),
            response = await get_grapes_total.json();
    
            if (response.error !== undefined) throw response.error;
            if (!response.success) throw 'Success response from server is false.';

            console.log(response)

            document.querySelector('#home-statistics__cycle').setAttribute('data-cycle', response.cycle);

            if (home_object.internal) fade_out(document.getElementById('home-products'));

            home_object.cycle = response.cycle;

            let cycle_name;
            if (response.cycle === 1) cycle_name = 'RECEPCION';
            else if (response.cycle === 2) cycle_name = 'DESPACHO';
            else if (response.cycle === 3) cycle_name = 'INGRESOS BODEGA';

            document.querySelector('#home-statistics__cycle .stats-data p').innerText = cycle_name;

            document.querySelector('#home-statistics__product .stats-data p').innerText = response.type.toUpperCase();
            
            document.querySelectorAll('#home-products > .product').forEach(div => { div.remove() });

            home_object.filters.cut = 'total';
            home_object.filters.type = response.type;
            home_object.date.start = response.seasons[response.seasons.length - 1].start;
            home_object.date.end = response.seasons[response.seasons.length - 1].end;

            home_object.products = response.products;
            home_object.seasons = response.seasons;
            home_object.total = response.total;
    
            if (screen_width >= 768) {

                const date_dropdown = document.querySelector('#home-statistics__date .dropdown');
                if (date_dropdown.children.length !== home_object.seasons.length + 2) {
    
                    while (date_dropdown.children.length > 3) date_dropdown.lastElementChild.remove();
    
                    for (let i = home_object.seasons.length - 1; i >= 0; i--) {
                        const 
                        div = document.createElement('div'),
                        p = document.createElement('p');
                        div.appendChild(p);
            
                        div.className = 'dropdown-item';
                        div.id = `home-date__${home_object.seasons[i].name.replace('Temporada ', '')}`;
                        p.innerText = home_object.seasons[i].name;
                        div.setAttribute('data-season-id', home_object.seasons[i].id);
                        document.querySelector('#home-statistics__date .dropdown').appendChild(div);
                    }    
                }
                
                document.getElementById('home-date__start').value = home_object.date.start;
                document.getElementById('home-date__end').value = home_object.date.end;    
            }
    
            const data = { 
                total: home_object.total.packing + home_object.total.parron,
                packing: home_object.total.packing,
                parron: home_object.total.parron
            },
            promise_array = [],
            products_array = [];
        
            home_object.products.forEach(product => {
                promise_array.push(new Promise(resolve => {
                    const img = new Image();
                    img.onload = () => { resolve() }
                    img.src = (product.image === null) ? './images/grapes/no-image.jpg' : product.image;
                    products_array.push({ 
                        code: product.code, 
                        name: product.name.trim(), 
                        kilos: product.total, 
                        image: img.src,
                        type: product.type
                    });
                }))
            });
        
            await Promise.all(promise_array);
            data.products = products_array.sortBy('kilos');
            await update_products_list(data);

            if (home_object.internal) {
                const home_products = document.getElementById('home-products');
                home_products.classList.remove('hidden', 'animationend');
                fade_in_animation(home_products);
                home_object.internal = false;
            }

            return resolve();
        } catch(error) { error_handler('Error al obtener datos iniciales.', error); return reject() }
    });
}

(async () => {

    document.getElementById('home-statistics__total').addEventListener('click', filter_products_by_type);
    document.getElementById('home-statistics__packing').addEventListener('click', filter_products_by_type);
    document.getElementById('home-statistics__parron').addEventListener('click', filter_products_by_type);

    if (screen_width < 768) {

        const 
        start_date_p = document.createElement('p'),
        end_date_p = document.createElement('p');

        document.querySelector('#home-statistics__date .stats-data').prepend(start_date_p);
        document.querySelector('#home-statistics__date .stats-data').append(end_date_p);

        document.querySelectorAll('#home-statistics .dropdown-container').forEach(dropdown => { dropdown.remove() });

        //document.querySelector('#home-statistics__cycle').addEventListener('click', home_change_cycle_in_modal);
        document.querySelector('#home-statistics__cycle').addEventListener('click', home_smaller_screen_filter_menu);
        document.querySelector('#home-statistics__date').addEventListener('click', home_smaller_screen_filter_menu);
        document.querySelector('#home-statistics__product').addEventListener('click', home_smaller_screen_filter_menu);
    }
    
    else {

        const start_date = document.createElement('input');
        start_date.id = 'home-date__start';
        start_date.setAttribute('type', 'date');
        start_date.setAttribute('min', '2019-01-01');
        start_date.className = 'input-effect';
        
        const end_date = document.createElement('input');
        end_date.id = 'home-date__end';
        end_date.setAttribute('type', 'date');
        start_date.setAttribute('min', '2019-01-01');
        end_date.className = 'input-effect';

        start_date.addEventListener('input', home_products_date);
        end_date.addEventListener('input', home_products_date);

        document.querySelector('#home-statistics__date .stats-data').prepend(start_date);
        document.querySelector('#home-statistics__date .stats-data').append(end_date);

        //CYCLE BTN
        document.querySelector('#home-statistics__cycle').addEventListener('click', function() {

            const btn = this;
            document.querySelectorAll(`#home-statistics .dropdown-container:not(#${btn.id} .dropdown-container)`).forEach(dropdown => {
                dropdown.classList.remove('active');
            });
            btn.querySelector('.dropdown-container').classList.toggle('active');

        });

        //DATE BTN
        document.querySelector('#home-statistics__date').addEventListener('click', function(e) {
            
            if (e.target.matches('input')) return;

            const btn = this;
            document.querySelectorAll(`#home-statistics .dropdown-container:not(#${btn.id} .dropdown-container)`).forEach(dropdown => {
                dropdown.classList.remove('active');
            });
            btn.querySelector('.dropdown-container').classList.toggle('active');
        });

        //PRODUCT TYPE BTN
        document.querySelector('#home-statistics__product').addEventListener('click', function(e) {

            if (e.target.matches('p') && e.target.parentElement.className === 'dropdown-item') return;
            else if (e.target.className === 'dropdown-item') return;

            const btn = this;
            document.querySelectorAll(`#home-statistics .dropdown-container:not(#${btn.id} .dropdown-container)`).forEach(dropdown => {
                dropdown.classList.remove('active');
            });
            btn.querySelector('.dropdown-container').classList.toggle('active');

        });

        //EVENT LISTENERS
        document.querySelector('#home-statistics__cycle .dropdown').addEventListener('click', home_change_cycle_event);

        document.querySelector('#home-statistics__product .dropdown').addEventListener('click', async e => {
            
            const type = e.target.parentElement.getAttribute('data-type');
            if (home_object.filters.type === type) return;
            await home_change_product(type);

            document.querySelector('#home-statistics__product').click();
            
        });

    }
    
    try { await home_get_initial_products() } 
    catch(error) { error_handler('Error al obtener productos.', error) }
    
})();