const express = require('express');
const entities_router = express.Router();
const conn = require('../config/db');

const { userMiddleware, validate_rut, format_rut, error_handler } = require('./routes_functions');

const get_giros = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT id, giro FROM giros ORDER BY giro ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

/********************** CLIENTS / PROVIDERS *********************/
entities_router.post('/get_entities_data', userMiddleware.isLoggedIn, async (req, res) => {

    const 
    { status, type } = req.body,
    type_sql = (type.length > 1) ? '' : `AND entities.type='${type.substring(0, 1)}'`,
    status_sql = (status.length > 1) ? '' : `AND entities.status='${status.substring(0, 1)}'`,
    response = { success: false }

    try {

        const get_entities = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT entities.id, entities.status, entities.type, entities.rut, entities.name, giros.giro
                    FROM entities
                    INNER JOIN giros ON entities.giro=giros.id
                    WHERE entities.name <> '' ${type_sql} ${status_sql}
                    ORDER BY entities.name ASC; 
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.entities = results;
                    return resolve();
                })
            })
        }

        await get_entities()
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting entities data. ${e}`);
        error_handler(`Endpoint: /get_entities_data -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

entities_router.post('/search_client_entity', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { entity } = req.body,
    response = { success: false }

    try {

        const get_entities = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT entities.id, entities.status, entities.type, entities.rut, entities.name, giros.giro
                    FROM entities
                    INNER JOIN giros ON entities.giro=giros.id
                    WHERE entities.name LIKE '%${entity}%'
                    ORDER BY entities.name ASC; 
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.entities = results;
                    return resolve();
                })
            })
        }

        await get_entities();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting client entities. ${e}`);
        error_handler(`Endpoint: /search_client_entity -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

entities_router.post('/get_entity_data', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { entity_id } = req.body,
    response = { success: false }

    try {

        const get_entity_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT entities.id, entities.status, entities.type, entities.billing_type AS billing, 
                    entities.rut, entities.name, entities.phone, entities.email, entities.giro
                    FROM entities
                    INNER JOIN giros ON entities.giro=giros.id
                    WHERE entities.id=${conn.escape(entity_id)}; 
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.entity = results[0];
                    return resolve();
                })
            })
        }

        const get_entity_branches = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT branch.id, branch.name, comunas.comuna, branch.address, branch.phone, branch.email
                    FROM entity_branches branch
                    INNER JOIN comunas ON branch.comuna=comunas.id
                    WHERE branch.entity_id=${conn.escape(entity_id)}
                    ORDER BY branch.name ASC;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.branches = results;
                    return resolve();
                })
            })
        }

        await get_entity_data();
        await get_entity_branches();
        response.giros = await get_giros();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting entity data. ${e}`);
        error_handler(`Endpoint: /get_entity_data -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

entities_router.post('/get_branch_data', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { branch_id } = req.body,
    response = { success: false }

    try {

        const get_branch = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT branch.id, branch.name, comunas.id AS comuna, comunas.region_id AS region, branch.address, branch.phone, branch.email
                    FROM entity_branches branch
                    INNER JOIN comunas ON branch.comuna=comunas.id
                    WHERE branch.id=${conn.escape(branch_id)};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.branch = results[0];
                    return resolve();
                })
            })
        }

        const get_comunas = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT * FROM regiones;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.regions = results;
                    return resolve();
                })
            })
        }

        await get_branch();
        await get_comunas();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting branch data. ${e}`);
        error_handler(`Endpoint: /get_branch_data -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response); }
})

entities_router.get('/get_giros', userMiddleware.isLoggedIn, async (req, res) => {
    
    const response = { success: false }

    try {

        response.giros = await get_giros();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting giros. ${e}`);
        error_handler(`Endpoint: /get_giros -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

entities_router.get('/get_regions', userMiddleware.isLoggedIn, async (req, res) => {

    const response = { success: false }

    try {

        const get_regions = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT * FROM regiones;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.regions = results;
                    return resolve();
                })
            })
        }

        await get_regions();
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting regions. ${e}`);
        error_handler(`Endpoint: /get_regions -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

entities_router.post('/clients_save_data', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { client_id, name, rut, giro, type, phone, email, status, billing } = req.body,
    response = { success: false }

    try {

        const save_data = () =>  {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE entities
                    SET
                        status=${conn.escape(status)},
                        billing_type=${parseInt(billing)},
                        type=${conn.escape(type)},
                        rut=${conn.escape(formatted_rut)},
                        name=${conn.escape(name)},
                        phone=${conn.escape(phone)},
                        email=${conn.escape(email)},
                        giro=${conn.escape(giro)}
                    WHERE id=${conn.escape(client_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                });
            })
        }
        
        if (! await validate_rut(rut)) throw 'RUT Inválido';
        const formatted_rut = await format_rut(rut);
        await save_data();
        response.formatted_rut = formatted_rut;
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error saving entity data. ${e}`);
        error_handler(`Endpoint: /clients_save_data -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

entities_router.post('/save_branch_data', userMiddleware.isLoggedIn, async (req, res) => {

    const 
    { branch_id, name, address, comuna, phone } = req.body,
    response = { success: false }

    try {

        const save_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE entity_branches
                    SET 
                        name=${conn.escape(name)},
                        comuna=${conn.escape(comuna)},
                        address=${conn.escape(address)},
                        phone=${conn.escape(phone)}
                    WHERE id=${conn.escape(branch_id)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        await save_data();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error saving branch data. ${e}`);
        error_handler(`Endpoint: /save_branch_data -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

entities_router.post('/create_branch', userMiddleware.isLoggedIn, async (req, res) => {

    const 
    { entity_id, name, address, comuna, phone } = req.body,
    response = { success: false }

    try {

        const create_branch = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    INSERT INTO entity_branches
                    (entity_id, name, comuna, address, phone)
                    VALUES (${conn.escape(entity_id)}, ${conn.escape(name)}, ${conn.escape(comuna)}, ${conn.escape(address)}, ${conn.escape(phone)});
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.branch_id = results.insertId;
                    return resolve();
                })
            })
        }

        const get_branch_comuna = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT comuna FROM comunas WHERE id=${conn.escape(comuna)};
                `, (error, results, fields) => {
                    if (error || results.length === 0) return reject(error);
                    response.comuna = results[0].comuna;
                    return resolve();
                })
            })
        }

        await create_branch();
        await get_branch_comuna();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error creating branch. ${e}`);
        error_handler(`Endpoint: /create_branch -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

entities_router.post('/delete_branch', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { entity, branch } = req.body,
    response = { success: false }

    try {

        const check_branch_registries= () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id FROM documents_header WHERE client_entity=${conn.escape(entity)} AND client_branch=${conn.escape(branch)} LIMIT 1;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) return resolve(true);
                    return resolve(false);
                })
            })
        }        

        const delete_branch = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    DELETE FROM entity_branches WHERE id=${conn.escape(branch)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const branch_with_registries = await check_branch_registries();
        if (!branch_with_registries) await delete_branch();
        else throw 'Sucursal con registros en la base de datos';
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error deleting branch. ${e}`);
        error_handler(`Endpoint: /delete_branch -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

entities_router.post('/create_entity', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { name, rut, giro, type, phone, email, status, billing } = req.body,
    response = { success: false }

    console.log(req.body)

    try {

        const check_existing_rut = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT name, rut FROM entities WHERE rut='${formatted_rut}';
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) {
                        response.existing_entity = {
                            name: results[0].name,
                            rut: results[0].rut
                        }
                        return resolve(true);
                    }
                    return resolve(false);
                });
            })
        }

        const create_entity = () =>  {
            return new Promise((resolve, reject) => {
                conn.query(`
                    INSERT INTO entities (status, type, billing_type, rut, name, phone, email, giro)
                    VALUES (
                        ${parseInt(status)}, 
                        ${conn.escape(type)},
                        ${parseInt(billing)},
                        ${conn.escape(formatted_rut)}, 
                        ${conn.escape(name)}, 
                        ${conn.escape(phone)}, 
                        ${conn.escape(email)},
                        ${conn.escape(giro)})
                    ;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.entity_id = results.insertId;
                    return resolve();
                });
            })
        }
        
        if (! await validate_rut(rut)) throw 'RUT Inválido';
        const formatted_rut = await format_rut(rut);

        const entity_exists = await check_existing_rut();
        if (entity_exists) throw 'Entidad con RUT ingresado ya existe.';
        await create_entity();
        response.formatted_rut = formatted_rut;
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error saving entity data. ${e}`);
        error_handler(`Endpoint: /create_entity -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

entities_router.post('/delete_entity', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { entity } = req.body,
    response = { success: false }

    try {

        const check_entity_registries= () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id FROM documents_header WHERE client_entity=${conn.escape(entity)} LIMIT 1;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) return resolve(true);
                    return resolve(false);
                })
            })
        }        

        const delete_entity = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    DELETE FROM entities WHERE id=${conn.escape(entity)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const entity_with_regisitries = await check_entity_registries();
        if (!entity_with_regisitries) await delete_entity();
        else throw 'Entidad con registros en las base de datos';
        response.success = true;
    }
    catch(e) { 
        response.error = e; 
        console.log(`Error deleting entity. ${e}`);
        error_handler(`Endpoint: /delete_entity -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

module.exports = { entities_router }