const products_create_tr = products => {
    return new Promise(async (resolve, reject) => {

        try {

            const
            promise_array = [],
            products_array = [];
        
            products.forEach(product => {
                promise_array.push(new Promise(resolve => {
                    const img = new Image();
                    img.onload = () => { resolve() }
                    img.src = (product.image === null) ? './images/grapes/no-image.jpg' : product.image;

                    const
                    product_names = product.name.split('-'),
                    primary_name = product_names[0].replace(product.type, '').trim(),
                    secondary_name = (product_names.length > 1) ? product_names[1].trim() : '-';

                    products_array.push({ 
                        code: product.code,
                        type: product.type,
                        primary_name: primary_name,
                        secondary_name: secondary_name,
                        image: img.src 
                    });
                }))
            });
        
            await Promise.all(promise_array);

            products_array.sortBy('primary_name');

            const tbody = document.querySelector('#products__table .tbody');
            products_array.forEach(product => {
    
                const tr = document.createElement('div');
                tr.className = 'tr';
                tr.setAttribute('data-code', product.code);
                tr.innerHTML = `
                    <div class="td edit">
                        <div>
                            <i class="fas fa-pen-square"></i>
                        </div>
                    </div>
                    <div class="td code">${sanitize(product.code)}</div>
                    <div class="td type">${sanitize(product.type)}</div>
                    <div class="td primary-name">${sanitize(product.primary_name)}</div>
                    <div class="td alternative-name">${sanitize(product.secondary_name)}</div>
                    <div class="td image">
                        <div style="background-image: url('${product.image}')"></div>
                    </div>
                `;
                tbody.appendChild(tr);
            })
            return resolve();
        } catch(error) { error_handler('No se pudo crear todos los productos.', error); return reject() }
    })
}

const product_template_event_listeners = e => {
    return new Promise(resolve => {
        document.querySelectorAll('#products__create-edit-product select').forEach(select => {
            select.addEventListener('change', e => {
                select.parentElement.classList.add('has-content');
                const p = select.parentElement.querySelector('p');
                p.innerText = select.options[select.selectedIndex].innerText;    
            })
        });

        document.querySelectorAll('#products__create-edit-product input').forEach(input => {
            input.addEventListener('input', e => {
                if (e.target.value.length === 0) {
                    e.target.classList.remove('has-content');
                    return;
                }
                e.target.classList.add('has-content');
            })
        });

        document.querySelector('#products__create-edit-product__container > .close-btn-absolute').addEventListener('click', async e => {
            const div = document.getElementById('products__create-edit-product__container');
            document.getElementById('products__product-template').classList.remove('active');
            await fade_out_animation(div);
            div.parentElement.classList.add('hidden');
            div.remove();
        });

        document.querySelector('#product__create-edit__product-image').parentElement.addEventListener('click', async function() {
            this.querySelector('input').click();
        });

        document.querySelector('#products__create-edit-product input[name="image"]').onchange = e => {
            const 
            input = e.target,
            reader = new FileReader();
            reader.onload = event => {
                document.querySelector('#product__create-edit__product-image > div').style.backgroundImage = `url("${event.target.result}")`;
            }
            reader.readAsDataURL(input.files[0]);
        }

        return resolve();
    })
}

const delete_product = async function() {

    if (btn_double_clicked(this)) return;

    const product_code = sanitize(document.getElementById('products__create-edit-product').getAttribute('data-code'));

    try {

        const
        delete_product = await fetch('/delete_product', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify({ product_code })
        }),
        response = await delete_product.json();

        if (response.error !== undefined) throw response.error;
        if (!response.success) throw 'Success response from server is false.';

        document.querySelector(`#products__table .tbody .tr[data-code="${product_code}"]`).remove();
        document.querySelector('#products__create-edit-product__container > .close-btn-absolute').click();

    } catch(error) { error_handler('No se pudo eliminar el product.', error) }
}

const create_save_product = async create => {

    const 
    type_select = document.getElementById('product__create-edit__type-select'),
    image_input = document.querySelector('#product__create-edit__product-image').previousElementSibling,
    file_reader = new FileReader(),
    data = {
        code: document.getElementById('product__create-edit__code').value,
        type : type_select.options[type_select.selectedIndex].value,
        primary_name: document.getElementById('product__create-edit__primary-name').value,
        secondary_name: document.getElementById('product__create-edit__secondary-name').value
    };

    let image = (image_input.files.length > 0) ? image_input.files[0] : null;

    let image_name, image_upload;

    //UPLOAD IMAGE TO SERVER ON SEPARTE REQUEST
    file_reader.onload = async e => {

        try {

            check_loader();

            console.log(image_name)

            const
            content = e.target.result,
            chunk_size = 20000,
            total_chunks = e.target.result.byteLength / chunk_size;

            for (let chunk = 0; chunk < total_chunks + 1; chunk++) {

                const this_chunk = content.slice(chunk * chunk_size, (chunk + 1) * chunk_size);
                
                const 
                upload_file = await fetch(`upload_product_image?image_name=${image_name}`, {
                    method: 'POST',
                    headers: {
                        "Content-Type" : "application/octet-stream",
                        "Content-Length" : this_chunk.length
                    },
                    body: this_chunk
                }),
                upload_response = await upload_file.json();;

                if (upload_response.error !== undefined || !upload_response.success) throw 'Error al subir archivo.'
               
            }

            const 
            save_product_image = await fetch('/save_product_image', {
                method: 'POST',
                headers: {
                    "Content-Type" : "application/json",
                    "Authorization" : token.value
                },
                body: JSON.stringify({ product_code: data.code, image_name: image_name })
            }),
            save_image_response = await save_product_image.json();

            image_upload = true;

            const table_image = document.querySelector(`#products__table .tr[data-code="${data.code}"] .image > div`);
            if (!!table_image) table_image.style.backgroundImage = `url("./images/grapes/${save_image_response.image_name}")`;

        } 
        catch(error) { error_handler('Error al subir imagen de producto.', error) }
        finally { check_loader() }
    }

    //SANITIZE OBJECT
    for (let key in data) { data[key] = sanitize(data[key]) }

    try {

        if (data.code.length === 0) throw 'Campo de código vacío.'
        if (data.type.length === 0) throw 'Tipo de producto no seleccionado.'
        if (data.primary_name.length === 0) throw 'Campo de nombre principal vacío';

        data.create = create;

        const 
        create_product = await fetch('/create_save_product', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify(data)
        }),
        response = await create_product.json();

        if (response.error !== undefined) throw response.error;
        if (!response.success) throw 'Success response from server is false.';

        if (image === null) image_upload = true;
        else {
            image_name = image.name;
            image_upload = false;
            file_reader.readAsArrayBuffer(image);
        }

        if (create) {
            await products_create_tr(response.products);
            document.querySelector(`#products__table .tbody .tr:last-child`).scrollIntoView();
        } else {
            
            const tr = document.querySelector(`#products__table .tr[data-code="${data.code}"]`);
            tr.querySelector('.type').innerText = data.type;
            tr.querySelector('.primary-name').innerText = data.primary_name;
            tr.querySelector('.alternative-name').innerText = (data.secondary_name.length === 0) ? '-' : data.secondary_name;
        }

        while (!image_upload) await delay(10)
        document.querySelector('#products__create-edit-product__container > .close-btn-absolute').click();

    } catch(error) {error_handler('Error al intentar crear producto.', error) }
}

//EDIT PRODUCT IN TABLE
document.querySelector('#products__table .tbody').addEventListener('click', async e => {

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
        else return;
    }

    if (!edit) {
        
        if (tr.classList.contains('selected')) {
            document.getElementById('products__delete-product-btn').classList.remove('enabled');
            tr.classList.remove('selected');
        }
        else {
            document.querySelectorAll('#products__table .tbody .tr.selected').forEach(tr => { tr.classList.remove('selected') });
            tr.classList.add('selected');
            document.getElementById('products__delete-product-btn').classList.add('enabled');
        }
        return;
    }

    try {

        const
        code = sanitize(tr.getAttribute('data-code')),
        get_product = await fetch('/get_product', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify({ code })
        }),
        response = await get_product.json();
    
        if (response.error !== undefined) throw response.error;
        if (!response.success) throw 'Success response from server is false.';

        const template = await (await fetch('templates/template-create-edit-product.html')).text();
        document.querySelector('#products__product-template').innerHTML = template;

        document.getElementById('products__create-edit-product').setAttribute('data-code', response.product.code);

        await product_template_event_listeners();

        document.getElementById('product__create-edit__code').addEventListener('input', e => {
            e.target.value = response.product.code;
        });
    
        document.querySelector('#product-template__delete-entity').addEventListener('click', delete_product);
        document.querySelector('#product-template__save').addEventListener('click', function() {
            
            const btn = this;
	        if (btn_double_clicked(btn)) return;
	        
            prevent_double_click();
            create_save_product(false);
        });

        const 
        type_select = document.getElementById('product__create-edit__type-select'),
        name_array = response.product.name.split('-'),
        primary_name = name_array[0].replace(response.product.type, '').trim(),
        secondary_name = (name_array.length > 1) ? name_array[1].trim() : '';
    
        document.getElementById('product__create-edit__code').classList.add('has-content');
        document.getElementById('product__create-edit__code').value = response.product.code;

        type_option = document.querySelector(`#product__create-edit__type-select option[value="${response.product.type}"]`).index;
        type_select.options[type_option].selected = true;
        type_select.dispatchEvent(new Event('change'));

        document.getElementById('product__create-edit__primary-name').classList.add('has-content')
        document.getElementById('product__create-edit__primary-name').value = primary_name;

        if (secondary_name.length > 0) {
            document.getElementById('product__create-edit__secondary-name').classList.add('has-content');    
            document.getElementById('product__create-edit__secondary-name').value = secondary_name;
        }

        document.querySelector('#product__create-edit__product-image > div').style.backgroundImage = `url('${response.product.image}')`;
        document.querySelector('#product__create-edit__product-image i').style.display = 'none';

        const fade_in_div = document.getElementById('products__product-template');
        fade_in_animation(fade_in_div);
        document.getElementById('products__product-template').classList.add('active');

    } catch(error) { error_handler('No se pudo obtener datos del producto.', error) }
})

//CREATE PRODUCT BTN
document.getElementById('products__create-product-btn').addEventListener('click', async e => {
    try {

        const template = await (await fetch('templates/template-create-edit-product.html')).text();
        document.querySelector('#products__product-template').innerHTML = template;

        await product_template_event_listeners();
        document.getElementById('product-template__save').addEventListener('click', e => {
            if (clicked) return;
	        prevent_double_click();
            create_save_product(true);
        });

        document.querySelector('#product-template__save p').innerText = 'CREAR';

        document.getElementById('product-template__delete-entity').remove();

        const fade_in_div = document.getElementById('products__product-template');
        fade_in_animation(fade_in_div);
        document.getElementById('products__product-template').classList.add('active');

    } catch(error) { error_handler('Error al intentar abrir template para crear producto', error) }
});

//SEARCH PRODUCT
document.getElementById('products__search-product').addEventListener('keydown', async e => {
    
    if (e.code !== 'Tab' && e.key !== 'Enter') return;

    const product = sanitize(e.target.value);

    try {

        const 
        search_product = await fetch('/search_product_by_name', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify({ product })
        }),
        response = await search_product.json();

        if (response.error !== undefined) throw response.error;
        if (!response.success) throw 'Success response from server is false.';

        document.querySelectorAll('#products__table .tbody .tr').forEach(tr => { tr.remove() });
        products_create_tr(response.products);

    } catch(error) { error_handler('Error al buscar producto.', error) }
})

document.getElementById('products__search-product').addEventListener('input', e => {
    if (e.target.value.length === 0) e.target.classList.remove('has-content');
    else e.target.classList.add('has-content');
});

document.getElementById('products__type-select').addEventListener('change', async e => {
    
    const 
    select = e.target,
    type = select.options[select.selectedIndex].value;

    try {

        const
        get_products = await fetch('/get_products', {
            method: 'POST',
            headers: {
                "Content-Type" : "application/json",
                "Authorization" : token.value
            },
            body: JSON.stringify({ type })
        }),
        response = await get_products.json();
    
        if (response.error !== undefined) throw response.error;
        if (!response.success) throw 'Success response from server is false.';

        document.querySelectorAll('#products__table .tbody .tr').forEach(tr => { tr.remove() });

        select.parentElement.classList.add('has-content');
        const p = select.parentElement.querySelector('p');
        p.innerText = select.options[select.selectedIndex].innerText;    

        await products_create_tr(response.products);

    } catch(error) { error_handler('Error al seleccionar productost por tipo.', error) }
});

function get_all_products() {
    return new Promise(async (resolve, reject) => {
        try {

            const
            get_products = await fetch('/get_products', {
                method: 'POST',
                headers: {
                    "Content-Type" : "application/json",
                    "Authorization" : token.value
                },
                body: JSON.stringify({ type: 'Uva' })
            }),
            response = await get_products.json();
        
            if (response.error !== undefined) throw response.error;
            if (!response.success) throw 'Success response from server is false.';
        
            await products_create_tr(response.products);
        
            return resolve();
            
        } catch(error) { error_handler('Error al obtener lista de productos.', error); return reject() }
    })
}