const express = require('express');
const products_router = express.Router();
const conn = require('../config/db');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const { todays_date, userMiddleware, error_handler, delay } = require('./routes_functions');

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

        const remove_image = path => {
            return new Promise((resolve, reject) => {
                fs.unlink(path, error => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const product_with_records = await check_product_records();
        if (product_with_records) throw 'Producto tiene registros en la base de datos.';

        // TRY TO DELETE FILE
        try {

            const imagepath = await new Promise((resolve, reject) => {
                conn.query(`SELECT image FROM products WHERE code=${conn.escape(product_code)};`, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve(results[0].image);
                })
            });

            if (imagepath !== null) {

                const filepath = path.join(process.cwd(), 'public', imagepath.slice(2, imagepath.length));
                console.log(filepath);

                await remove_image(filepath);

            }

        }
        catch(e) { console.log(`Something went wrong trying to delete file. ${e}`) }

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
                        '${type + ' ' + name.replace(new RegExp(type, 'gmi'), '').trim()}',
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

products_router.post('/save_product_image', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { product_code, image_name } = req.body,
    file_extension = image_name.split('.')[1],
    temp = { resized: false },
    response = { success: false }

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
        if (file_exists) await remove_image(`./public/images/grapes/${temp.file}`);

        let image_size = await get_image_size();
        
        await resize_image();
        image_size = await get_image_size();
        
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
});

products_router.post('/upload_products_image', userMiddleware.isLoggedIn, express.raw({ type: 'application/octet-stream', limit: '10mb' }), async (req, res) => {

    const response = { success: false };

    try {

        const buffer = req.body;

        const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8;
        const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
        const isGIF = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
        const isWebP = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

        let extension;
        if (isJPEG) extension = 'jpg';
        else if (isPNG) extension = 'png';
        else if (isGIF) extension = 'gif';
        else if (isWebP) extension = 'webp';
        else throw 'File is not an image';

        response.filename = `image-${Date.now()}.${extension}`;
        const filePath = path.join(process.cwd(), 'temp', response.filename);

        fs.writeFileSync(filePath, buffer);
        response.success = true;

    }
    catch(e) { response.error = e }
    finally { res.json(response) }
});

module.exports = { products_router }