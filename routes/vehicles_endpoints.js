const express = require('express');
const vehicles_router = express.Router();
const conn = require('../config/db');

const { userMiddleware, error_handler } = require('./routes_functions');

/********************** VEHICLES *********************/
vehicles_router.post('/list_vehicles', userMiddleware.isLoggedIn, async (req, res) => {

    const
    status = (req.body.status) ? 1 : 0,
    internal = (req.body.internal) ? 1 : 0,
    response = { success: false };

    try {

        const list_vehicles = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT vehicles.*, drivers.name AS driver_name, entities.name AS transport_name
                    FROM vehicles
                    LEFT OUTER JOIN drivers ON vehicles.driver_id=drivers.id
                    LEFT OUTER JOIN entities ON vehicles.transport_id=entities.id
                    WHERE vehicles.status=${status} AND vehicles.internal=${internal};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.vehicles = results;
                    return resolve();
                })
            })
        }

        await list_vehicles();
        response.success = true;

    }
    catch(e) {
        response.error = e;
        console.log(`Error listing vehicles. ${e}`);
        error_handler(`Endpoint: /list_vehicles -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

vehicles_router.post('/get_vehicle', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { primary_plates } = req.body,
    response = { success: false }

    try {

        const get_vehicle = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT vehicles.*, drivers.name AS driver_name, entities.name AS transport_name
                    FROM vehicles
                    LEFT OUTER JOIN drivers ON vehicles.driver_id=drivers.id
                    LEFT OUTER JOIN entities ON vehicles.transport_id=entities.id
                    WHERE vehicles.primary_plates=${conn.escape(primary_plates)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.vehicle = results[0];
                    return resolve();
                })
            })
        }

        get_entities = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id, name FROM entities WHERE type='T' ORDER BY name ASC;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.entities = results;
                    return resolve();
                })
            })
        }
        
        await get_vehicle();
        await get_entities();
        response.success = true;

    }
    catch(e) {
        response.error = e;
        console.log(`Error getting vehicle data. ${e}`);
        error_handler(`Endpoint: /get_vehicle -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

vehicles_router.post('/get_vehicle_default_driver', userMiddleware.isLoggedIn, async(req, res) => {

    const 
    { plates } = req.body,
    response = { 
        success: false,
        driver: null
    }

    try {

        const get_driver = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT vehicles.id, vehicles.driver_id, drivers.rut, drivers.name, drivers.phone, drivers.internal, drivers.active 
                    FROM vehicles 
                    LEFT OUTER JOIN drivers ON vehicles.driver_id=drivers.id
                    WHERE vehicles.primary_plates=${conn.escape(plates)};
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length > 0) {
                        response.driver = {
                            id: results[0].driver_id,
                            rut: results[0].rut,
                            name: results[0].name,
                            phone: results[0].phone,
                            internal: results[0].internal,
                            active: results[0].active
                        }
                    }
                    return resolve(true);
                })
            })
        }

        await get_driver();
        response.success = true;

    }
    catch(e) {
        response.error = e;
        console.log(`Error getting vehicles default driver data. ${e}`);
        error_handler(`Endpoint: /get_vehicle_default_driver -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

vehicles_router.post('/save_vehicle_data', userMiddleware.isLoggedIn, async(req, res) => {

    const 
    { primary_plates, secondary_plates, internal, active } = req.body,
    transport_id = (req.body.transport_id === 'none') ? null : parseInt(req.body.transport_id),
    driver_id = (req.body.driver_id === null) ? null : parseInt(req.body.driver_id),
    response = { success: false }

    try {

        const update_vehicle_data = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    UPDATE vehicles 
                    SET
                        status=${parseInt(active)},
                        internal=${parseInt(internal)},
                        secondary_plates=${conn.escape(secondary_plates)},
                        transport_id=${transport_id},
                        driver_id=${driver_id}
                    WHERE primary_plates=${conn.escape(primary_plates)}; 
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        await update_vehicle_data();
        response.success = true;

    }
    catch(e) {
        response.error = e;
        console.log(`Error saving vehicle data. ${e}`);
        error_handler(`Endpoint: /save_vehicle_data -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

vehicles_router.post('/get_vehicles_by_plates', userMiddleware.isLoggedIn, async (req, res) => {

    const
    partial_plates = req.body.partial_plates.replace(/[^0-9a-z]/gmi, ''),
    response = { success: false }

    try {

        const get_vehicles_from_partial_plates = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT vehicles.*, drivers.name AS driver_name, entities.name AS transport_name
                    FROM vehicles
                    LEFT OUTER JOIN drivers ON vehicles.driver_id=drivers.id
                    LEFT OUTER JOIN entities ON vehicles.transport_id=entities.id
                    WHERE vehicles.primary_plates LIKE '%${partial_plates}%' ORDER BY vehicles.primary_plates ASC;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.vehicles = results;
                    return resolve();
                })
            })
        }

        await get_vehicles_from_partial_plates();
        response.success = true;

    }
    catch(e) {
        response.error = e;
        console.log(`Error getting vehicles by plates. ${e}`);
        error_handler(`Endpoint: /save_vehicle_data -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

vehicles_router.post('/get_vehicles_from_filters', userMiddleware.isLoggedIn, async (req, res) => {

    const
    { status, internal } = req.body,
    status_sql = (status === 'All' || status.length === 0) ? '' : `vehicles.status=${parseInt(status)}`,
    and_operator = (status === 'All' || status.length === 0) ? '' : 'AND',
    internal_sql = (internal === 'All' || internal.length === 0) ? '' : `AND vehicles.internal=${parseInt(internal)}`,
    response = { success: false }

    try {

        const get_vehicles_from_filters = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT vehicles.*, drivers.name AS driver_name, entities.name AS transport_name
                    FROM vehicles
                    LEFT OUTER JOIN drivers ON vehicles.driver_id=drivers.id
                    LEFT OUTER JOIN entities ON vehicles.transport_id=entities.id
                    WHERE vehicles.primary_plates <> '' ${and_operator} ${status_sql} ${internal_sql} ORDER BY vehicles.primary_plates ASC;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.vehicles = results;
                    return resolve();
                })
            })
        }

        await get_vehicles_from_filters();
        response.success = true;

    }
    catch(e) {
        response.error = e;
        console.log(`Error getting vehicles by filters. ${e}`);
        error_handler(`Endpoint: /get_vehicles_from_filters -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

vehicles_router.post('/delete_vehicle', userMiddleware.isLoggedIn, async (req, res) => {
    
    const 
    { plates } = req.body,
    response = { success: false }

    try {

        const check_records = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT id FROM weights WHERE primary_plates=${conn.escape(plates)} LIMIT 1;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    if (results.length === 0) return resolve(true);
                    return resolve(false);
                })
            })
        }

        const delete_vehicle = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    DELETE FROM vehicles WHERE primary_plates=${conn.escape(plates)}
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve();
                })
            })
        }

        const allowed_to_delete = await check_records();
        if (!allowed_to_delete) throw `Vehículo ${plates} tiene registros en la base de datos y por lo tanto no puede ser eliminado`;
        
        await delete_vehicle();
        response.success = true;

    }
    catch(e) {
        response.error = e;
        console.log(`Error deleting vehicle. ${e}`);
        error_handler(`Endpoint: /delete_vehicles -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

module.exports = { vehicles_router }