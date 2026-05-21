"use strict";

const path = require('path');
const fs = require("fs");

//const puppeteer = require('puppeteer');
const { executablePath } = require('puppeteer');

//FOR BYPASSING ROBOT PROTECTION ON BANK SITE
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

console.log(executablePath());

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1) + min) };

const sii_url = 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D52%26TIPO%3D4';
const conn = require('./config/db');

const global = {};

const thousand_separator = num => { return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.') }

const delay = ms => { return new Promise(resolve => { setTimeout(resolve, ms) }) }

const get_doc_data = doc_id => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT header.id, header.date, header.document_total, header.type, internal_entities.name AS internal_name, 
            internal_entities.rut AS internal_rut, internal_branches.name AS internal_branch, internal_city.comuna AS internal_city,
            internal_entities.id1, internal_entities.id2, vehicles.internal AS internal_vehicle,
            entity.rut AS destination_rut, entity.name AS destination_name, branch.name AS destination_branch_name, 
            branch.address AS destination_branch_address, client_city.comuna AS destination_branch_comuna,
            weights.primary_plates, weights.secondary_plates, drivers.name AS driver_name, drivers.rut AS driver_rut,
            weights.cycle, documents_comments.comments
            FROM documents_header header
            INNER JOIN weights ON header.weight_id=weights.id
            INNER JOIN entities entity ON header.client_entity=entity.id
            INNER JOIN entity_branches branch ON header.client_branch=branch.id
            INNER JOIN internal_entities ON header.internal_entity=internal_entities.id
            INNER JOIN internal_branches ON header.internal_branch=internal_branches.id
            INNER JOIN comunas client_city ON branch.comuna=client_city.id
            INNER JOIN comunas internal_city ON internal_branches.comuna=internal_city.id
            INNER JOIN drivers ON weights.driver_id=drivers.id
            LEFT OUTER JOIN documents_comments ON header.id=documents_comments.doc_id
            INNER JOIN vehicles ON weights.primary_plates=vehicles.primary_plates
            WHERE header.id=${parseInt(doc_id)};
        `, (error, results, fields) => {

            if (error || results.length === 0) return reject(error);

            return resolve({
                id: results[0].id,
                cycle: results[0].cycle,
                driver: {
                    name: results[0].driver_name,
                    rut: results[0].driver_rut
                },
                plates: results[0].primary_plates,
                internal_vehicle: (results[0].internal_vehicle === 1) ? true : false,
                date: results[0].date.toLocaleString('es-CL').split(' ')[0],
                total: (results[0].document_total === null) ? 0 : thousand_separator(results[0].document_total),
                sale: (results[0].type === 2) ? true : false,
                internal_entity: {
                    name: results[0].internal_name,
                    rut: results[0].internal_rut,
                    branch: results[0].internal_branch,
                    city: results[0].internal_city,
                    csg: (results[0].type === 2) ? results[0].id2 : results[0].id1
                },
                client_entity: {
                    name: results[0].destination_name,
                    rut: results[0].destination_rut,
                    branch: results[0].destination_branch_name,
                    address: results[0].destination_branch_name,
                    city: results[0].destination_branch_comuna
                },
                comments: results[0].comments
            })
        })
    })
}

const get_document_rows = document => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT body.product_code, products.type AS product_type, body.product_name, body.cut AS descarte, 
            body.price, body.kilos, body.informed_kilos, body.container_code, containers.name AS container_name, 
            body.container_amount, containers.weight AS container_weight, containers.type AS container_type
            FROM documents_body body
            LEFT OUTER JOIN products ON body.product_code=products.code
            LEFT OUTER JOIN containers ON body.container_code=containers.code
            WHERE body.document_id=${parseInt(document.id)} AND (body.status='T' OR body.status='I');
        `, (error, results, fields) => {
            if (error) return reject(error);

            const rows = [];
            for (let i = 0; i < results.length; i++) {
                if (results[i].product_code === null && results[i].container_code === null) continue;
                const row = {
                    product: {
                        code: results[i].product_code,
                        type: (results[i].product_code === null) ? '' : results[i].product_type.toUpperCase().trim(),
                        cut: (results[i].product_code === 'Pasas') ? 'PARRON' : (results[i].descarte === null) ? '' : results[i].descarte.toUpperCase(),
                        price: (results[i].product_code === null) ? null : results[i].price,
                        kilos: results[i].kilos,
                        informed_kilos: results[i].informed_kilos
                    },
                    container: {
                        code: (results[i].container_code === null) ? '' : results[i].container_code,
                        amount: (results[i].container_code !== null && 1 * results[i].container_amount > 0) ? results[i].container_amount : null,
                        type: (results[i].container_code === null) ? '' : results[i].container_type.replace('Bin', 'Bins').toUpperCase(),
                        weight: results[i].container_weight
                    }
                }

                // SET CONTAINER NAME 
                row.container.name = (results[i].container_code === null) ? 
                    row.container.name = '' 
                    : 
                    results[i].container_name.trim().toUpperCase().replace('BIN', 'BINS').trim()
                ;

                // TRY AND SHORTEN CONTAINER IF IT'S STILL TOO LONG
                //if (row.container.name.length > 25) row.container.name = row.container.name.replce('PLASTICA', 'PLAST.').replace('PLASTICO', 'PLAST.');

                //SET PRODUCT NAME
                if (results[i].product_code === null) row.product.name = '';
                else if (results[i].product_code === 'GEN') row.product.name = results[i].product_name.toUpperCase();
                else row.product.name = results[i].product_name.split('-')[0].toUpperCase().trim();

                // TRY TO REDUCE PRODUCT NAME TO FIT IN THE FIELD
                if (row.product.name.split("CSG")[0].length > 25) row.product.name = row.product.name.replace('RESECADO UVA', 'RESECADO').replace('SWEET', 'SWT.');
                if (row.product.name.split("CSG")[0].length > 25) row.product.name = row.product.name.replace('SWT.', 'S.')

                rows.push(row);
            }
            return resolve(rows);
        })
    })
}

const get_sii_credentials = rut => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT dte_user, dte_pass, dte_signature FROM internal_entities WHERE rut=${conn.escape(rut)};
        `, (error, results, fields) => {
            
            if (error) return reject(error);
            if (results.length === 0) return reject('No se pudo encontrar Usuario y Clave de SII para entidad interna seleccionada en documento.');
            if (results[0].dte_user === null || results[0].dte_pass === null || results[0].dte_signature === null) return reject('Usuario y/o Clave de SII para entidad interna están vacíos.');

            return resolve({
                user: results[0].dte_user,
                password: results[0].dte_pass,
                signature: results[0].dte_signature
            });
        })
    })
}

const save_doc_number = (doc_id, doc_number) => {
    return new Promise((resolve, reject) => {
        conn.query(`
            UPDATE documents_header
            SET 
                number=${parseInt(doc_number)},
                electronic=1
            WHERE id=${parseInt(doc_id)};
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve();
        })
    })
}

async function waitForEvent(page, event, timeout = 35000) {
    return Promise.race([
        page.evaluate(
            event => new Promise(resolve => document.querySelector('#collapseRECEPTOR select[name="EFXP_GIRO_RECEP"]').addEventListener(event, resolve, { once: true })),
            event
        ),
        page.waitForTimeout(timeout)
    ]);
}

const go_to_sii = socket => {
    return new Promise(async (resolve, reject) => {

        const session_start = Math.round(new Date());
        const image_path = path.join(__dirname, 'puppeteer_progress', session_start + '.png');

        let browser;
        let page;

        try {

            browser = await puppeteer.launch({ 
                headless: true,
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--window-size=1920,1080',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--disable-site-isolation-trials',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-automation',
                    '--enable-webgl',
                    '--start-maximized'
                ],
                defaultViewport: {
                    width: 950,
                    height: 975
                },
                executablePath: executablePath()
            });
            page = await browser.newPage();

            async function take_screenshot() {
                return new Promise(async resolve => {
                    try {
                        await page.screenshot({ path: image_path, fullPage: false });
                        return resolve(fs.readFileSync(image_path)); // BUFFER
                    }
                    catch(e) { return resolve(null) }
                })
            }

            // Additional page-level evasions
            await page.evaluateOnNewDocument(() => {

                // Overwrite the languages property to make it seem more realistic
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['es-CL', 'es'],
                });
            
                // Overwrite permissions query to always return granted
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
                );
            
                // Overwrite plugins to return a non-empty array
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });
            });

            socket.on('cancel browser', async () => {
                try {
                    if (browser) await browser.close();
                    console.log('Browser closed correctly');
                }
                catch(e) { console.log(`Error closing browser. ${e}`) }
                return resolve();
            });

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await page.goto(sii_url);
            socket.emit('electronic dispatch document - update progress', { progress: 10, screenshot: await take_screenshot() });
    
            //LOGIN BUTTON
            await page.waitForSelector('#bt_ingresar');

            await page.focus('#rutcntr');
            await page.keyboard.type(global.credentials.user);

            await page.focus('#clave');
            await page.keyboard.type(global.credentials.password);

            await Promise.all([
                page.click('#bt_ingresar'),
                console.log('Esperando a que la página termine de cargar...\r\n'),
                page.waitForNavigation({ 
                    waitUntil: 'networkidle2', 
                    timeout: 45000 
                }),
            ]);
            
            console.log('Usuario y Clave ingresado correctamente. Ingresando datos encabezado...\r\n');
            socket.emit('electronic dispatch document - update progress', { progress: 20, screenshot: await take_screenshot() });

            console.log('Internal Entity RUT: ' + global.document.internal_entity.rut);

            // SELECCIONAR ENTIDAD CUANDO SE ENTRA CON EL RUT DEL TANITO
            if (
                global.document.internal_entity.rut === '77.114.753-4' || 
                global.document.internal_entity.rut === '78.447.760-6' || 
                global.document.internal_entity.rut === '77.686.780-2' ||
                global.document.internal_entity.rut === '76.198.953-7'
            )
            {
                console.log('selecting...')
                await page.waitForSelector('select.form-control[name="RUT_EMP"]');

                await page.select('select.form-control[name="RUT_EMP"]', global.document.internal_entity.rut.replace(/[.]/gm, ''));

                await page.click('.btn.btn-default[type="submit"]');
                console.log('clicked on option. Waiting for load event....'); //////HERE!!!!!!!!!!!!

                await page.waitForNavigation({ 
                    waitUntil: 'load', 
                    timeout: 10000 
                });

                console.log('Finished waiting for loading of page. Now Waiting for network idle event');
                await page.waitForNavigation({ 
                    waitUntil: 'networkidle2', 
                    timeout: 10000 
                });
                console.log('Finished waiting for network idle...');
            }

            // MARIANA E HIJOS APARECE UNA PAGINA QUE PIDE HACER CLICK EN UN BOTON
            else if (global.document.internal_entity.rut === '77.269.490-3') {

                console.log('inside mariana e hijos')

                await page.waitForSelector('.web-sii.cuerpo .panel.panel-default + p > a:first-child', { timeout: 10000 });
                
                console.log('clicking on continue btn');
                await page.click('.web-sii.cuerpo .panel.panel-default + p > a:first-child');

                // SELECT MARIANA E HIJOS
                console.log('New page loaded. Selecting Mariana e Hijos from dropdown');

                await page.waitForSelector('select.form-control[name="RUT_EMP"]');
                await page.select('select.form-control[name="RUT_EMP"]', '77269490-3');
                
                await delay(250);
                await page.click('button[type="submit"]');

                try {
                    await page.waitForNavigation({ 
                        waitUntil: 'networkidle2', 
                        timeout: 10000 
                    });
                } catch(e) { console.log('Error waiting for network idle2') }

                console.log('finished selection Mariana e Hijos');
            }
            
            await page.waitForSelector('#collapseEMISOR select[name="EFXP_IND_VENTA"]');

            // CONSTITUTES SALE SELECT
            if (!global.document.sale) await page.select('#collapseEMISOR select[name="EFXP_IND_VENTA"]', '6');
            
            // DESTINATION RUT
            const client_rut = global.document.client_entity.rut.split('-');
            const client_digits = client_rut[0].replace(/[.]/gm, '');
            const client_dv = client_rut[1];
    
            await page.focus('#collapseRECEPTOR input[name="EFXP_RUT_RECEP"]');
            await page.keyboard.type(client_digits);
            await page.keyboard.press('Tab');
            await page.keyboard.type(client_dv);
            await page.keyboard.press('Tab');
    
            await page.waitForNavigation({ 
                waitUntil: 'networkidle2', 
                timeout: 5000 
            });

            socket.emit('electronic dispatch document - update progress', { progress: 30, screenshot: await take_screenshot() });

            // DESTINATION CITY -> NEEDS TO BE AFTER DESTINATION RUT INPUT
            await page.evaluate( () => { document.querySelector('#collapseEMISOR input[name="EFXP_CIUDAD_ORIGEN"]').value = '' });
            await page.focus('#collapseEMISOR input[name="EFXP_CIUDAD_ORIGEN"]');
            await page.keyboard.type(global.document.internal_entity.city.toUpperCase());

            // CHANGE DOCUMENT DATE
            const document_date = global.document.date.split('-');
            const document_day = document_date[0];
            const document_month = document_date[1];
    
            await page.waitForSelector('#collapseEMISOR select[name="cbo_dia_boleta"]');
            await page.select('#collapseEMISOR select[name="cbo_dia_boleta"]', document_day);
            await page.select('#collapseEMISOR select[name="cbo_mes_boleta"]', document_month);
    
            // DESTINATION CITY
            await page.waitForSelector('#collapseRECEPTOR input[name="EFXP_CIUDAD_RECEP"]');
            await page.focus('#collapseRECEPTOR input[name="EFXP_CIUDAD_RECEP"]');
            await page.keyboard.type(global.document.client_entity.city);
            
            // VEHICLE DATA
            if (await page.evaluate('document.getElementById("EFXP_RUT_TRANSPORTE")')) {
    
                const driver_rut_split = global.document.driver.rut.split('-');
                const driver_rut_digits = driver_rut_split[0].replace(/[.]/gm, '');
                const driver_rut_dv = driver_rut_split[1];
    
                await page.focus('#EFXP_RUT_TRANSPORTE');

                // RODADOS RUT
                if (global.document.internal_vehicle) {

                    await page.keyboard.type('77682621');
                    await page.keyboard.press('Tab');
                    await page.keyboard.type('9');
                    await page.keyboard.press('Tab');
                }

                // TYPE CLIENT RUT
                else {
                    await page.keyboard.type(client_digits);
                    await page.keyboard.press('Tab');
                    await page.keyboard.type(client_dv);
                    await page.keyboard.press('Tab');
                }
                
                await page.keyboard.type(global.document.plates);
                await page.keyboard.press('Tab');
                await page.keyboard.type(driver_rut_digits);
                await page.keyboard.press('Tab');
                await page.keyboard.type(driver_rut_dv);
                await page.keyboard.press('Tab');
                await page.keyboard.type(global.document.driver.name);

            }
            else { 
    
                console.log('Transport div not found... Adding data to text area instead...\r\n');
                await page.keyboard.press('Enter');
                await page.keyboard.type('PATENTE VEHICULO: ' + global.document.plates);
                await page.keyboard.press('Enter');
                await page.keyboard.type('CHOFER: ' + global.document.driver.name);
                await page.keyboard.press('Enter');
                await page.keyboard.type('RUT CHOFER: ' + global.document.driver.rut);
            }
    
            socket.emit('electronic dispatch document - update progress', { progress: 40, screenshot: await take_screenshot() });

            // ADD DOCUMENT BODY DETAILS
            let i = 0;
            for (const row of global.document.rows) {

                // CLICK ON BUTTON TO ADD NEW LINE IF IT ISN'T THE FIRST ONE
                if (i > 0) {
                    await page.click(`#rowDet_Botones input[name="AGREGA_DETALLE"]`);
                    await page.waitForSelector(`#rowDet_0${i + 1}`);
                }

                //EMPTY CONTAINERS
                if (row.product.code === null) {

                    const emptyText = (row.container.name.includes('CAJA')) ? ' VACIA' : ' VACIO';

                    // CONTAINER NAME
                    await page.focus(`#myTable input[name="EFXP_NMB_0${i + 1}"]`);

                    // TYPE CONTAINER NAME + EMPTY TEXT
                    if ((row.container.name + emptyText).length <= 25) await page.keyboard.type(row.container.name + emptyText);

                    // TYPE CONTAINER NAME ONLY AND ADD DESCRIPTION TO WRITE THE REST
                    else {

                        let productName = row.container.name + emptyText;
                        let continuation = '';

                        while (productName.length > 25) {

                            const split = productName.split(" ");
                            const lastWord = split[split.length - 1].trim();

                            productName = productName.replace(lastWord, '').trim();
                            continuation = lastWord + ' ' + continuation;
                        }

                        await page.keyboard.type(productName);

                        // CLICK ON ADD LONGER DESCRIPTION CHECKBOX
                        await page.waitForSelector(`input[name="DESCRIP_0${i + 1}"]`);
                        await page.click(`#myTable input[name="DESCRIP_0${i + 1}"]`);

                        // WRITE PRODUCT FULL DESCRIPTION
                        await page.waitForSelector(`#rowDescripcion_0${i + 1} textarea`);
                        await page.focus(`#rowDescripcion_0${i + 1} textarea`);

                        await page.keyboard.type(continuation);
                    }

                    // CONTAINER AMOUNT
                    await page.focus(`#myTable input[name="EFXP_QTY_0${i + 1}"]`);
                    await page.keyboard.type(row.container.amount.toString());

                    // CONTAINER UNIT
                    await page.focus(`#myTable input[name="EFXP_UNMD_0${i + 1}"]`);
                    await page.keyboard.type('UN');

                    // CONTAINER PRICE -> 1 FOR EMPTY
                    await page.focus(`#myTable input[name="EFXP_PRC_0${i + 1}"]`);
                    await page.keyboard.type('1');
                }

                // CONTAINER WITH PRODUCT
                else {

                    await page.waitForSelector(`#myTable input[name="EFXP_NMB_0${i + 1}"]`);
                    await page.focus(`#myTable input[name="EFXP_NMB_0${i + 1}"]`);

                    // ON SHORT DESCRIPTION WRITE PRODUCT WITHOUT CUT. EG UVA SWEET CELEBRATION
                    const productName = (row.product.code === 'GEN') ? row.product.name.split(' ')[0] : row.product.name.split(' CSG')[0].trim();
                    await page.keyboard.type(productName);

                    // CLICK ON ADD LONGER DESCRIPTION CHECKBOX
                    await page.waitForSelector(`input[name="DESCRIP_0${i + 1}"]`);
                    await page.click(`#myTable input[name="DESCRIP_0${i + 1}"]`);
                    
                    // WRITE PRODUCT FULL DESCRIPTION
                    await page.waitForSelector(`#rowDescripcion_0${i + 1} textarea`);
                    await page.focus(`#rowDescripcion_0${i + 1} textarea`);

                    if (row.product.code === 'GEN') await page.keyboard.type(row.product.name.replace(productName, '').trim());
                    else {
                        
                        if (row.product.cut) {

                            // ADDS CUT
                            if(row.product.type !== 'RESECADO') await page.keyboard.type('DESC. ' + row.product.cut);

                            // ADD CSG IF IT HAS ONE
                            if (row.product.name.includes('CSG')) await page.keyboard.type((row.product.type === 'RESECADO') ? row.product.name.replace(productName, '').trim() : ' - ' + row.product.name.replace(productName, '').trim());

                            // PRESS ENTER IF ANY OF THE 2 PREVIOUS CONDITIONS MET. IF THE CONTAINER CODE IS 350 THEN IT SHOULDN'T PRESS ENTER BECAUSE THERE'S AN EXTRA LINE
                            if ((row.product.type !== 'RESECADO' || row.product.name.includes('CSG')) && row.container.code !== '350') await page.keyboard.type(' - ');
                        }

                        // WRITE CONTAINER AMOUNT AND NAME ONLY IF THE CODE ISN'T 350 (PRODUCTO SIN ENVASES)
                        if (row.container.code !== '350') await page.keyboard.type(row.container.amount + ' ' + row.container.name.replace('GRIS', '').replace('ABIERTO', '').trim());
                    }

                    // PRODUCT AMOUNT
                    await page.focus(`#myTable input[name="EFXP_QTY_0${i + 1}"]`);

                    if (row.product.code !== 'GEN' && (1 * row.product.kilos === 0))
                        throw `Error. Kilos de ${row.product.name} es 0. ¿ Faltará hacer el desgloce de kilos ?`

                    if (row.product.code === 'GEN') await page.keyboard.type(row.product.informed_kilos.toString()); 
                    else await page.keyboard.type(row.product.kilos.toString()); 

                    // PRODUCT UNIT
                    await page.focus(`#myTable input[name="EFXP_UNMD_0${i + 1}"]`);
                    
                    if (row.product.type === 'UVA' || row.product.type === 'PASAS' || row.product.type === 'RESECADO') await page.keyboard.type('KG');
                    else await page.keyboard.type('UN');

                    // PRODUCT PRICE
                    await page.focus(`#myTable input[name="EFXP_PRC_0${i + 1}"]`);
                    await page.keyboard.type(row.product.price.toString());
                }

                i++;
            }

            socket.emit('electronic dispatch document - update progress', { progress: 50, screenshot: await take_screenshot() });

            const last_row_number = (i + 1 < 10) ? '0' + i : i;

            // CHECK IF DESCRIPTION SELECTOR EXISTS
            const descriptionExists = await page.evaluate(async last_row_number => {
                return await new Promise(resolve => {
                    return resolve(!!document.querySelector(`#rowDescripcion_${last_row_number} textarea`));
                })
            }, last_row_number);

            if (descriptionExists) {
                await page.focus(`#rowDescripcion_${last_row_number} textarea`);
                await page.keyboard.press('End');
                await page.keyboard.press('Enter');
                await page.keyboard.press('Enter');
            }
            else {
                await page.click(`#myTable input[name="DESCRIP_${last_row_number}"]`);
                await page.focus(`#rowDescripcion_${last_row_number} textarea`);
                await page.keyboard.press('Enter');
            }
            
            // ADD COMMENTS IF THERE ARE ANY
            if (global.document.comments !== null) {
                const observations = global.document.comments.split('\n');
                for (const line of observations) {

                    if (global.document.internal_entity.csg !== null && line.includes('ID:') || line.length === 0) continue;

                    // DOCUMENT COMMENTS GO HERE
                    await page.keyboard.type(line + ' - ');
                }
    
                await page.keyboard.press('Backspace');
                await page.keyboard.press('Backspace');
                await page.keyboard.press('Backspace');
            }

            // ADD CSG
            if (global.document.internal_entity.csg === null) await page.keyboard.type(`OBSERVACIONES:`);
            else await page.keyboard.type(` - ID: ${global.document.internal_entity.csg}`);

            // CHECK FOR MIN VALUE OF IVA
            const iva = await page.evaluate(async () => {
                return await new Promise(resolve => {
                    return resolve(parseInt(document.querySelector('input[name="EFXP_IVA"]').value))
                })
            });

            if (iva === 0) {

                // RESET LAST ROW AMOUNT VALUES SO THE TOTAL IS RECALCULATED
                const lastRowAmount = await page.evaluate(async last_row_number => {
                    return await new Promise(resolve => {
                        const selector = document.querySelector(`#myTable input[name="EFXP_QTY_${last_row_number}"]`);
                        const amount = selector.value;
                        selector.value = '';

                        document.querySelector(`#myTable input[name="EFXP_PRC_${last_row_number}"]`).value = '';
                        return resolve(amount);
                    })
                }, last_row_number);

                // TAB THROUGH TO RESET VALUES
                await page.focus(`#myTable input[name="EFXP_QTY_${last_row_number}"]`);
                await page.keyboard.press('Tab');
                await page.keyboard.press('Tab');
                await page.keyboard.press('Tab');

                // REDO VALUES SO DOCUMENT HAS IVA
                await page.focus(`#myTable input[name="EFXP_QTY_${last_row_number}"]`);
                await page.keyboard.press(lastRowAmount);
                await page.keyboard.press('Tab');
                await page.keyboard.press('Tab');

                await page.focus(`#myTable input[name="EFXP_PRC_${last_row_number}"]`);
                await page.keyboard.press('5');
                await page.keyboard.press('Tab');


                // CHECK VALUE OF IVA AGAIN
                const newIva = await page.evaluate(async () => {
                    return await new Promise(resolve => {
                        return resolve(parseInt(document.querySelector('input[name="EFXP_IVA"]').value))
                    })
                });

                if (newIva === 0) console.log('Shit. IVA did not change');
            }

            // SELECT GIRO
            await page.evaluate(() => {
                
                const select = document.querySelector('#collapseRECEPTOR select[name="EFXP_GIRO_RECEP"]');
                const options = select.options;

                if (options.length === 1) select.options[0].selected = true;
                else {
                    for (let i = 0; i < options.length; i++) {

                        console.log(options[i].innerText);

                        if (options[i].innerText.includes('AGRICOLA')) {
                            select.options[i].selected = true;
                            break;
                        }
                        else if (options[i].innerText.includes('AGRIC')) {
                            select.options[i].selected = true;
                            break;
                        }
                        else if (options[i].innerText.includes('UVA')) {
                            select.options[i].selected = true;
                            break;
                        }
                        else if (options[i].innerText.includes('JUGO')) {
                            select.options[i].selected = true;
                            break;
                        }
                        else if (options[i].innerText.includes('VINO')) {
                            select.options[i].selected = true;
                            break;
                        }
                        else if (options[i].innerText.includes('FRUT')) {
                            select.options[i].selected = true;
                            break;
                        }
                        else continue;
                    }                    
                }

                select.dispatchEvent(new Event('change', { bubbles: true }));
            });

            console.log('Giro seleccionado correctamente...\r\n');

            return;

            // PROCEED TO VISUALIZE DOCUMENT
            await page.click('button[name="Button_Update"]');

            let dialog_msg;
            page.on('dialog', async dialog => {

                dialog_msg = dialog.message();

                try { await dialog.dismiss() }
                catch(e) { console.log(`Couldn't close dialog. ${e}`) }

                socket.emit('electronic dispatch document - update progress', { progress: 55, screenshot: await take_screenshot() });

                console.log('dialog message:', dialog_msg);

                try { 
                    if (browser) await browser.close();
                    console.log('Browser closed correctly');
                }
                catch(e) { console.log(`Couldn't close browser. ${e}`) }

                console.log(`dialog message typeof is: ${typeof dialog_msg}`);
		        return reject(dialog_msg.toString());
            });

            // PROCEED TO SIGN PAGE
            await page.waitForNavigation();
            await page.waitForSelector('input.btn.btn-default[onclick="goSignDTE(this);"]');
            console.log('waiting for navigation');

            try {
                await page.waitForSelector('input.btn.btn-default[onclick="goSignDTE(this);"][disabled]', { timeout: 1000 });
                console.log('BTN has disabled attribute');
            }
            catch(err) { console.log(`Btn doesn't have disabled attribute. Continuing...`) }

            socket.emit('electronic dispatch document - update progress', { progress: 60, screenshot: await take_screenshot() });

            await page.click('input.btn.btn-default[name="btnSign"]');

            // SIGN PAGE -> WRITE SIGN PASSWORD
            console.log('proceed to sign document');

            page.on('console', msg => console.log('PAGE LOG:', msg.text()));
            try {
                await page.waitForNavigation({ 
                    waitUntil: 'domcontentloaded', 
                    timeout: 5000 
                });
            }
            catch(e) { console.log(e) }
            
            console.log('done waiting for navigation');
            await page.evaluate(async () => {
                return await new Promise(async res => {
                    const delay = ms => { return new Promise(resolve => { setTimeout(resolve, ms) }) }
                    while (!!document.querySelector('#myPass') === false) { await delay(100) }
                    return res();
                })
            });

            console.log('finished evaluating div');
            socket.emit('electronic dispatch document - update progress', { progress: 70, screenshot: await take_screenshot() });

            // WAIT FOR SIGN CONTAINER TO BE VISIBLE
            await page.evaluate(async () => {
                return await new Promise(async resolve => {
                    const delay = ms => { return new Promise(resolve => { setTimeout(resolve, ms) }) }
                    const sign_container = document.getElementById('ingresoClaveCertificadoCentral');
                    while (sign_container.style.display === 'none') await delay(100);
                    return resolve();
                })
            })

            await page.focus('#myPass');
            await page.keyboard.type(global.credentials.signature);

            await page.waitForSelector('#btnFirma');
            console.log('clicking on sign btn');

            await page.click('#btnFirma');
            console.log('#btnFirma clicked');

            socket.emit('electronic dispatch document - update progress', { progress: 80, screenshot: await take_screenshot() });

            // CLICK ON DOWNLOAD PDF
            await page.waitForNavigation();
            await page.waitForSelector('div.web-sii.cuerpo a.btn.btn-default[target="_blank"]');
            console.log('waiting to download document...');

            const download_link = await page.evaluate(async () => {
                return await new Promise(resolve => {
                    const link = document.querySelector('div.web-sii.cuerpo a.btn.btn-default[target="_blank"]').getAttribute('href');
                    return resolve('https://' + document.domain + link);
                })
            });

            console.log(download_link);

            const data = await page.evaluate(async download_link => {
                return await new Promise(async resolve => {
    
                    function read_file_as_binary(blob) {
                        return new Promise(res => {
                            const fr = new FileReader();
                            fr.onload = () => { return res(fr.result) }
                            fr.readAsBinaryString(blob);
                        });
                    }
    
                    const response = { success: false }
                    try {
    
                        const get_file = await fetch(download_link, {
                            credentials: 'include',
                            headers: {
                                'accept' : 'text/html, application/xhtml+xml, application/xml; application/pdf, q=0.9,image/webp, */*;q=0.8',
                                'cache-control' : 'no-cache',
                                'pragma' : 'no-cache',
                                'sec-fetch-mode' : 'navigate',
                                'sec-fetch-site' : 'same-site',
                                'upgrade-insecure-requests': '1'
                            },
                            referrerPolicy: 'no-referrer-when-downgrade',
                            body: null,
                            method: 'GET',
                            mode: 'cors'
                        });
                        const blob_file = await get_file.blob();
    
                        response.pdf = await read_file_as_binary(blob_file);
                        response.success = true;
    
                    }
                    catch(e) { console.log(e); response.error = e }
                    finally { return resolve(response) }
                })
            }, download_link);

            await page.waitForSelector('table[bordercolor="#E6500A"] td b');

            socket.emit('electronic dispatch document - update progress', { progress: 95, screenshot: await take_screenshot() });

            const doc_data = await page.evaluate(async () => {
                return await new Promise(resolve => {
                    const document_data = document.querySelector('table[bordercolor="#E6500A"] td b').innerText;
                    return resolve(document_data);
                })
            });

            const doc_number = doc_data.split('\n')[4].replace(/\D/gm, '');
            const doc_name = `${global.document.internal_entity.rut} - ${doc_number}`

            await save_doc_number(global.document.id, doc_number);

            if (!data.success) socket.emit(`electronic document - emitted but couldn't save it`);
            else fs.writeFileSync(`./electronic_docs/${global.document.internal_entity.rut} - ${doc_number}.pdf`, data.pdf, 'binary');

            socket.emit(`electronic document - file saved`, { doc_number, doc_name, screenshot: await take_screenshot() });

            console.log('Finished');

            // CLOSE SESSION
            await page.waitForSelector('#cerrar-sesion');
            await page.click('#cerrar-sesion');

            // WAIT FOR NAVIGATION TO FINISH CLOSING THE SESSION
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 });
            console.log('Session closed');

            await browser.close();

            fs.unlink(image_path, () => console.log('puppeteer session image deleted'));
            return resolve({ doc_number, doc_name });

        }
        catch(e) {

            fs.unlink(image_path, () => console.log('puppeteer session image deleted'));

            //socket.emit('error generating electronic document', e);
            if (browser !== undefined) await browser.close();
            return reject(e);
        }
    })
}

const generate_electronic_document = async (doc_id, socket) => {
    return new Promise(async (resolve, reject) => {
        try {

            global.document = await get_doc_data(doc_id);

            if (global.document.internal_entity.rut === '78.447.760-6' && global.document.internal_entity.branch === 'Secado Colina') {
                global.document.internal_entity.csg = '13338689';
            }

            global.document.rows = await get_document_rows(global.document);
            global.credentials = await get_sii_credentials(global.document.internal_entity.rut);

            const doc_data = await go_to_sii(socket);
            return resolve(doc_data)
        }
        catch(e) { return reject(e) }    
    })
}

module.exports = { generate_electronic_document } 
