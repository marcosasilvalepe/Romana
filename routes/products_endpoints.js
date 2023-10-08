const express = require('express');
const products_router = express.Router();
const conn = require('../config/db');
const sharp = require('sharp');

const { todays_date, userMiddleware, error_handler } = require('./routes_functions');

/********************** PRODUCTS *********************/
products_router.post('/get_products', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { type } = req.body,
    type_sql = (type === 'All') ? '' : `AND type=${conn.escape(type)}`,
    response = { success: false }

    try {

        const get_products = () => {
            return new Promise((resolve, reject) => 
                conn.query(`
                    SELECT code, name, type, image FROM products WHERE code <> '' ${type_sql} ;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.products = results;
                    return resolve();
                })
            )
        }

        await get_products();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting products. ${e}`);
        error_handler(`Endpoint: /get_products -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

products_router.post('/get_product', userMiddleware.isLoggedIn, async (req, res) => {

    const 
    { code } = req.body,
    response = { success: false }

    try {

        const get_product = () => {
            return new Promise((resolve, reject) => 
                conn.query(`
                    SELECT code, name, type, image FROM products WHERE code=${conn.escape(code)};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.product = {
                        code: results[0].code,
                        name: results[0].name,
                        type: results[0].type,
                        image: results[0].image
                    };
                    return resolve();
                })
            )
        }

        await get_product();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting product data. ${e}`);
        error_handler(`Endpoint: /get_product -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }

})

products_router.post('/delete_product', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { product_code } = req.body,
    response = { success: false }

    try {

        const check_product_records = () => {
            return new Promise((resolve, reject) => 
                conn.query(`
                    SELECT id FROM documents_body WHERE product_code=${conn.escape(product_code)} LIMIT 1;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length === 0) return resolve(false);
                    return resolve(true);
                })
            )
        }

        const delete_product = () => {
            return new Promise((resolve, reject) => 
                conn.query(`
                    DELETE FROM products WHERE code=${conn.escape(product_code)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            )
        }

        const product_with_records = await check_product_records();
        if (product_with_records) throw 'Producto tiene registros en la base de datos.';

        await delete_product();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error deleting product. ${e}`);
        error_handler(`Endpoint: /delete_product -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

products_router.post('/create_save_product', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { create, code,  type, primary_name, secondary_name } = req.body,
    name = (secondary_name.length === 0) ? primary_name : primary_name + ' - ' + secondary_name,
    response = { success: false }

    try {

        const check_product_records = () => {
            return new Promise((resolve, reject) => 
                conn.query(`
                    SELECT id FROM products WHERE code=${conn.escape(code)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length === 0) return resolve(false);
                    return resolve(true);
                })
            )
        }

        const create_product = () => {
            return new Promise((resolve, reject) => 
                conn.query(`
                    INSERT INTO products (code, name, type, created, created_by)
                    VALUES (
                        ${conn.escape(code).toUpperCase()},
                        '${type + ' ' + name}',
                        '${type}',
                        '${todays_date()}',
                        ${req.userData.userId}
                    );
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.product_id = results.insertId;
                    return resolve();
                })
            )
        }

        const check_created_product = () => {
            return new Promise((resolve, reject) => 
                conn.query(`
                    SELECT code, name, type, image FROM products WHERE id=${response.product_id} ;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.products = results;
                    return resolve();
                })
            )
        }

        const save_product = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE products
                    SET 
                        name=${conn.escape(name)},
                        type=${conn.escape(type)}
                    WHERE code=${conn.escape(code)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        if (create) {

            const product_with_records = await check_product_records();
            if (product_with_records) throw 'Producto ya existe en base de datos';
    
            await create_product();
            await check_created_product();
    
        } else await save_product();

        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error creating product. ${e}`);
        error_handler(`Endpoint: /create_save_product -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

products_router.post('/upload_product_image', userMiddleware.isLoggedIn, async (req, res) => {

    const 
    query = new URLSearchParams(req.url),
    image_name = query.get('/upload_product_image?image_name'),
    response = { success: false }

    try {

        req.on('data', async chunk => {
            fs.appendFileSync(`./temp/${image_name}`, chunk);
        });

        response.success = true;
        
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error uploading product image. ${e}`);
        error_handler(`Endpoint: /upload_product_image -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

products_router.post('/save_product_image', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { product_code, image_name } = req.body,
    file_extension = image_name.split('.')[1],
    temp = { resized: false },
    response = { success: false }

    console.log(image_name, file_extension)
    try {

        const check_files = () => {
            return new Promise((resolve, reject) => {
                fs.readdir('./public/images/grapes', (error, files) => {
                    if (error) return reject(error);
                    for (let i = 0; i < files.length; i++) {
                        const code = files[i].split('.')[0];
                        if (code === product_code) {
                            temp.file = files[i];
                            return resolve(true);
                        }
                    }
                    return resolve(false);
                })
            })
        }

        const remove_image = path => {
            return new Promise((resolve, reject) => {
                fs.unlink(path, error => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const get_image_size = () => {
            return new Promise((resolve, reject) => {
                try { 
                    const { size } = fs.statSync(`./temp/${image_name}`);
                    return resolve(size);
                }
                catch(e) { return reject(e) }
            })
        }

        
        const resize_image = () => {
            return new Promise(async (resolve, reject) => {
                try {

                    const 
                    metadata = await sharp(`./temp/${image_name}`).metadata(),
                    image_width = metadata.width,
                    new_width = Math.floor(image_width * 0.7);

                    await sharp(`./temp/${image_name}`)
                        .resize({
                            width: new_width
                        })
                        .toFile(`./temp/${image_name}.resized`)

                    temp.resized = true;

                    //REPLACE ORIGINAL FILE WITH RESIZED ONE
                    fs.rename(`./temp/${image_name}.resized`, `./temp/${image_name}`, error => {
                        if (error) throw error;
                        return resolve()
                    })

                } catch(e) { return reject(e) }
            })
        }
        

        const move_product_image = () => {
            return new Promise((resolve, reject) => {
                const 
                temp_path = `./temp/${image_name}`,
                final_path = `./public/images/grapes/${product_code}.${file_extension}`;

                fs.rename(temp_path, final_path, error => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const update_db = () => {
            return new Promise((resolve, reject) => {
                console.log(`${product_code}.${file_extension}`)
                conn.query(`
                    UPDATE products SET image='./images/grapes/${product_code}.${file_extension}' WHERE code=${conn.escape(product_code)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve()
                })
            })
        }

        let file_exists = await check_files();
        console.log(file_exists)
        
        if (file_exists) await remove_image(`./public/images/grapes/${temp.file}`);

        let image_size = await get_image_size();
        console.log(image_size)

        
        await resize_image();
        image_size = await get_image_size();
        console.log(image_size);
        

        /*
        while (image_size > 100000) {
            await resize_image();
            image_size = await get_image_size();
            console.log(image_size);
        }
        */
        
        await move_product_image();
        
        await update_db();

        response.image_name = `${product_code}.${file_extension}`;
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error saving product image. ${e}`);
        error_handler(`Endpoint: /save_product_image -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

module.exports = { products_router }