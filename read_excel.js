"use strict";

const excel = require('exceljs');

const mysql = require('mysql');


const conn = mysql.createConnection({ 
    host: "192.168.1.90",
    port: 3306,
    user: "dte", 
    password: "m1Ks3DVIAS28h7dt", 
    database: "romana" 
});

const { executablePath } = require('puppeteer');

//FOR BYPASSING ROBOT PROTECTION ON BANK SITE
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin())


const sii_url = 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi?DESDE_DONDE_URL=OPCION%3D52%26TIPO%3D4';
const fs = require('fs');
const global = {};

const thousand_separator = num => { return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.') }

function delay(delayValue) { return new Promise(resolve => setTimeout(resolve, delayValue)) }

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

const get_driver_rut = driver => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT rut FROM drivers WHERE name='${driver}';
        `, (error, results, fields) => {
            if (error || results.length === 0) return reject(error);
            return resolve(results[0].rut);
        })
    })
}

const readExcel = () => {
    return new Promise(async (resolve, reject) => {
        try {

            const weights = [];

            //You can use the absolute path also
            let filepath = './gonpiza.xlsx';

            let workbook = new excel.Workbook();

            await workbook.xlsx.readFile(filepath);

            //You can use the index number also eg. 0 for selecting the sheet
            let worksheet = workbook.getWorksheet("Hoja1");

            const rows = [];

            await new Promise(resolve => {

                worksheet.eachRow({ includeEmpty: true }, async (row, rowNumber) => {
                    //console.log("row " + rowNumber + ' value is ' + row.values);
    
                    //console.log(row.values[1])
                    rows.push({
                        weight_id: row.values[1],
                        date: row.values[2],
                        plates: row.values[4],
                        driver: row.values[5],
                        containers: row.values[9],
                        product: {
                            name: row.values[10],
                            cut: row.values[11],
                            price: row.values[12],
                            kilos: row.values[13]
                        }
                    })
    
                })

                return resolve();

            })

            let current_weight;
            for (let i = 0; i < rows.length; i++) {
                
                const row = rows[i];

                if (row.weight_id === undefined) break;

                if (current_weight === row.weight_id) continue;
                current_weight = row.weight_id;
                
                const weight = {
                    weight_id: row.weight_id,
                    cycle: 2,
                    sale: true,
                    total: null,
                    plates: row.plates,
                    driver: {
                        name: row.driver,
                        rut: await get_driver_rut(row.driver)
                    },
                    date: (row.date === undefined) ? '' : row.date.split(' ')[0],
                    comments: `FRUTA PROVENIENTE DE UN AREA REGLAMENTADA POR LOBESIA BOTRANA\nPESAJE Nº ${row.weight_id}`,
                    client_entity: {
                        name: 'Soc. Comercial Lepefer y Cia Ltda.',
                        rut: '78.447.760-6',
                        branch: 'Secado El Convento',
                        address: 'Secado El Convento',
                        city: 'San Felipe'
                    },
                    rows: []
                }

                weights.push(weight);
                
                for (let j = i; j < rows.length; j++) {

                    if (weight.weight_id !== rows[j].weight_id) break;
                    weight.rows.push({
                        container: {
                            code: '005',
                            name: 'Bin Plastico',
                            amount: rows[j].containers
                        },
                        product: {
                            type: 'Uva',
                            cut: rows[j].product.cut,
                            price: rows[j].product.price,
                            informed_kilos: rows[j].product.kilos,
                            name: rows[j].product.name
                        }
                    })
                }
            }

            return resolve(weights);

        } catch(error) { return reject(error) }
    })
}

const go_to_sii = (doc, browser) => {
    return new Promise(async (resolve, reject) => {
        
        try {
            
            
            const page = await browser.newPage();

            
            //page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Safari/537.36');
            await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36");            
            
            await page.goto(sii_url);
    
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
            console.log(doc.internal_entity.rut);

            //SELECT ENTITY FROM DROPDOWN FOR JUAN LEPE LOGIN
            if (
                doc.internal_entity.rut === '77.114.753-4' || 
                doc.internal_entity.rut === '78.447.760-6' || 
                doc.internal_entity.rut === '77.686.780-2' ||
                doc.internal_entity.rut === '76.198.953-7'
            ) {
                console.log('selecting...')
                await page.waitForSelector('select.form-control[name="RUT_EMP"]');

                await page.select('select.form-control[name="RUT_EMP"]', doc.internal_entity.rut.replace(/[.]/gm, ''));
                await page.click('.btn.btn-default[type="submit"]');

                console.log('clicked on option')
            }

            
            await page.waitForSelector('#collapseRECEPTOR input[name="EFXP_RUT_RECEP"]');

            //CONSTITUTES SALE SELECT
            if (!doc.sale) await page.select('#collapseEMISOR select[name="EFXP_IND_VENTA"]', '6');
            
            //DESTINATION RUT
            const 
            client_rut = doc.client_entity.rut.split('-'),
            client_digits = client_rut[0].replace(/[.]/gm, ''),
            client_dv = client_rut[1];
    
            await page.focus('#collapseRECEPTOR input[name="EFXP_RUT_RECEP"]');
            await page.keyboard.type(client_digits);
            await page.keyboard.press('Tab');
            await page.keyboard.type(client_dv);
            await page.keyboard.press('Tab');
    
            await page.waitForNavigation({ 
                waitUntil: 'networkidle2', 
                timeout: 15000 
            });

            //DESTINATION CITY -> NEEDS TO BE AFTER DESTINATION RUT INPUT
            await page.evaluate( () => { document.querySelector('#collapseEMISOR input[name="EFXP_CIUDAD_ORIGEN"]').value = '' });
            await page.focus('#collapseEMISOR input[name="EFXP_CIUDAD_ORIGEN"]');
            await page.keyboard.type(doc.internal_entity.city.toUpperCase());

            //CHANGE DOCUMENT DATE
            const
            document_date = doc.date.split('-'),
            document_day = document_date[0],
            document_month = document_date[1];
    
            await page.waitForSelector('#collapseEMISOR select[name="cbo_dia_boleta"]');
            await page.select('#collapseEMISOR select[name="cbo_dia_boleta"]', document_day);
            await page.select('#collapseEMISOR select[name="cbo_mes_boleta"]', document_month);
    
            //DESTINATION CITY
            await page.waitForSelector('#collapseRECEPTOR input[name="EFXP_CIUDAD_RECEP"]');
            await page.focus('#collapseRECEPTOR input[name="EFXP_CIUDAD_RECEP"]');
            await page.keyboard.type(doc.client_entity.city);
            
            //VEHICLE DATA
            if (await page.evaluate('document.getElementById("EFXP_RUT_TRANSPORTE")')) {
    
                const 
                driver_rut_split = doc.driver.rut.split('-'),
                driver_rut_digits = driver_rut_split[0].replace(/[.]/gm, ''),
                driver_rut_dv = driver_rut_split[1];
    
                await page.focus('#EFXP_RUT_TRANSPORTE');

                //RODADOS RUT
                if (doc.internal_vehicle) {

                    await page.keyboard.type('77682621');
                    await page.keyboard.press('Tab');
                    await page.keyboard.type('9');
                    await page.keyboard.press('Tab');
                }

                //TYPE CLIENT RUT
                else {
                    await page.keyboard.type(client_digits);
                    await page.keyboard.press('Tab');
                    await page.keyboard.type(client_dv);
                    await page.keyboard.press('Tab');
                }
                
                await page.keyboard.type(doc.plates);
                await page.keyboard.press('Tab');
                await page.keyboard.type(driver_rut_digits);
                await page.keyboard.press('Tab');
                await page.keyboard.type(driver_rut_dv);
                await page.keyboard.press('Tab');
                await page.keyboard.type(doc.driver.name);
    
            }
            else { 
    
                console.log('Transport div not found... Adding data to text area instead...\r\n');
                await page.keyboard.press('Enter');
                await page.keyboard.type('PATENTE VEHICULO: ' + doc.plates);
                await page.keyboard.press('Enter');
                await page.keyboard.type('CHOFER: ' + doc.driver.name);
                await page.keyboard.press('Enter');
                await page.keyboard.type('RUT CHOFER: ' + doc.driver.rut);

            }
    
            const rows = doc.rows;

            //CHECK IF DOCUMENT HAS PRODUCTS IN ANY OF THE ROWS. IF IT DOESNT THEN IT'S TRANSPORT GUIDE ONLY (NO SALE)
            let document_with_products = false;
            for (let row of rows) {
                if (row.product !== null) {
                    document_with_products = true;
                    break;
                }
            }

            //ADD DOCUMENT BODY DETAILS

            let i = 0;
            for (let row of rows) {

                //CLICK ON BUTTON TO ADD NEW LINE IF IT ISN'T THE FIRST ONE
                if (i > 0) {
                    await page.click(`#rowDet_Botones input[name="AGREGA_DETALLE"]`);
                    await page.waitForSelector(`#rowDet_0${i + 1}`);
                }

                //EMPTY CONTAINERS
                if (row.product.code === null) {

                    //CONTAINER NAME
                    await page.focus(`#myTable input[name="EFXP_NMB_0${i + 1}"]`);
                    await page.keyboard.type(row.container.type);

                    //CLICK ON ADD LONGER DESCRIPTION CHECKBOX
                    await page.click(`#myTable input[name="DESCRIP_0${i + 1}"]`);
                    await page.waitForSelector(`#rowDescripcion_0${i + 1} textarea`);

                    //CONTAINER FULL DESCRIPTION
                    await page.focus(`#rowDescripcion_0${i + 1} textarea`);
                    await page.keyboard.type(row.container.name + ' - VACIO');

                    //CONTAINER AMOUNT
                    await page.focus(`#myTable input[name="EFXP_QTY_0${i + 1}"]`);
                    await page.keyboard.type(row.container.amount.toString());

                    //CONTAINER UNIT
                    await page.focus(`#myTable input[name="EFXP_UNMD_0${i + 1}"]`);
                    await page.keyboard.type('UN');

                    //CONTAINER PRICE -> 1 FOR EMPTY
                    await page.focus(`#myTable input[name="EFXP_PRC_0${i + 1}"]`);
                    await page.keyboard.type('1');
                }

                //CONTAINER WITH PRODUCT
                else {

                    //ON SHORT DESCRIPTION WRITE PRODUCT TYPE ONLY
                    await page.waitForSelector(`#myTable input[name="EFXP_NMB_0${i + 1}"]`);
                    await page.focus(`#myTable input[name="EFXP_NMB_0${i + 1}"]`);

                    if (row.product.code === 'GEN') await page.keyboard.type('ITEM:');
                    else await page.keyboard.type(row.product.type);

                    //CLICK ON ADD LONGER DESCRIPTION CHECKBOX
                    await page.waitForSelector(`input[name="DESCRIP_0${i + 1}"]`);
                    await page.click(`#myTable input[name="DESCRIP_0${i + 1}"]`);
                    
                    //WRITE PRODUCT FULL DESCRIPTION
                    await page.waitForSelector(`#rowDescripcion_0${i + 1} textarea`);
                    await page.focus(`#rowDescripcion_0${i + 1} textarea`);

                    if (row.product.code === 'GEN') await page.keyboard.type(row.product.name);
                    else {

                        //DON'T WRITE CONTAINER IF CONTAINER CODE IS FOR PRODUCT WITHOUT CONTAINER
                        await page.keyboard.type(row.product.name.replace(row.product.type + ' ', ''));
                        if (row.container.code !== '350') {
                            await page.keyboard.press('Enter');
                            if (row.product.cut.length === 0) await page.keyboard.type(row.container.amount + ' ' + row.container.name);
                            else await page.keyboard.type(row.product.cut + ' ' + row.container.amount + ' ' + row.container.name);
                        }
                    }

                    //PRODUCT AMOUNT
                    await page.focus(`#myTable input[name="EFXP_QTY_0${i + 1}"]`);

                    //if (row.product.code !== 'GEN' && (1 * row.product.kilos === 0))
                        //throw `Error. Kilos de ${row.product.name} es 0. ¿ Faltará hacer el desgloce de kilos ?`

                    if (row.product.code === 'GEN') await page.keyboard.type(row.product.informed_kilos.toString()); 
                    else await page.keyboard.type(row.product.informed_kilos.toString()); 

                    //PRODUCT UNIT
                    await page.focus(`#myTable input[name="EFXP_UNMD_0${i + 1}"]`);
                    
                    if (row.product.name.includes('UVA') || row.product.name.includes('PASAS')) await page.keyboard.type('KG');
                    else await page.keyboard.type('UN');

                    //PRICE PRICE
                    await page.focus(`#myTable input[name="EFXP_PRC_0${i + 1}"]`);
                    await page.keyboard.type(row.product.price.toString());

                }

                i++;
            }

            //DO COMMENTS AND CSG
            const last_row_number = (i + 1 < 10) ? '0' + (i + 1) : i + 1;
            await page.click(`#rowDet_Botones input[name="AGREGA_DETALLE"]`);
            await page.waitForSelector(`#rowDet_${last_row_number}`);
            await page.focus(`#myTable input[name="EFXP_NMB_${last_row_number}"]`);

            //ADD CSG
            if (doc.internal_entity.csg === null) await page.keyboard.type(`OBSERVACIONES:`);
            else await page.keyboard.type(`ID: ${doc.internal_entity.csg}`);

            await page.focus(`#myTable input[name="EFXP_QTY_${last_row_number}"]`);
            await page.keyboard.type('1');
            await page.keyboard.press('Tab');

            await page.focus(`#myTable input[name="EFXP_UNMD_${last_row_number}"]`);
            await page.keyboard.type('UN');
            await page.keyboard.press('Tab');

            await page.focus(`#myTable input[name="EFXP_PRC_${last_row_number}"]`);
            await page.keyboard.type('1');
            await page.keyboard.press('Tab');

            //CLICK ON ADD LONGER DESCRIPTION CHECKBOX
            await page.click(`#myTable input[name="DESCRIP_${last_row_number}"]`);
            await page.waitForSelector(`#rowDescripcion_${last_row_number} textarea`);
            await page.focus(`#rowDescripcion_${last_row_number} textarea`);

            if (doc.comments !== null) {
                const observations = doc.comments.split('\n');
                for (let line of observations) {
                    if (doc.internal_entity.csg !== null && line.includes('ID:')) continue;
                    await page.keyboard.type(line);
                    await page.keyboard.press('Enter');
                }
    
                await page.keyboard.press('Backspace');    
            }

            //CHECK FOR MIN VALUE OF IVA
            const iva = await page.evaluate(async () => {
                return await new Promise(resolve => {
                    return resolve(parseInt(document.querySelector('input[name="EFXP_IVA"]').value))
                })
            });

            if (iva === 0) {

                await page.evaluate( last_row_number => {
                    document.querySelector(`#myTable input[name="EFXP_PRC_${last_row_number}"]`).value = 5;
                    document.querySelector(`#myTable input[name="EFXP_QTY_${last_row_number}"]`).value = 0;
                }, last_row_number)

                await page.focus(`#myTable input[name="EFXP_QTY_${last_row_number}"]`);
                await page.keyboard.type('1');
                await page.keyboard.press('Tab');
            }

            //SELECT GIRO
            await page.evaluate(() => {
                
                const 
                select = document.querySelector('#collapseRECEPTOR select[name="EFXP_GIRO_RECEP"]'),
                options = select.options;

                if (options.length === 1) select.options[0].selected = true;
                else {
                    for (let i = 0; i < options.length; i++) {
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

            //PROCEED TO VISUALIZE DOCUMENT
            await page.click('button[name="Button_Update"]');

            let dialog_msg;
            page.on('dialog', async dialog => {
                dialog_msg = dialog.message();
                console.log('dialog', dialog.message())
                await dialog.dismiss();
            });

            //PROCEED TO SIGN PAGE
            await page.waitForSelector('input.btn.btn-default[onclick="goSignDTE(this);"]');

            console.log('waiting for navigation')
            try {

                await page.waitForSelector('input.btn.btn-default[onclick="goSignDTE(this);"][disabled]', {
                    timeout: 1000
                });
                
                console.log('BTN has disabled attribute');

            } catch(err) { console.log(`Btn doesn't have disabled attribute. Continuing...`) }

            console.log(dialog_msg)
            if (dialog_msg !== undefined) throw dialog_msg;

            await page.click('input.btn.btn-default[name="btnSign"]');

            console.log('proceed to sign document');
            //SIGN PAGE -> WRITE SIGN PASSWORD
            await page.waitForSelector('#myPass');

            //WAIT FOR SIGN CONTAINER TO BE VISIBLE
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

            //CLICK ON DOWNLOAD PDF
            await page.waitForSelector('div.web-sii.cuerpo a.btn.btn-default[target="_blank"]');
            console.log('waiting to download doc');

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
    
                        const 
                        get_file = await fetch(download_link, {
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
                        }),
                        blob_file = await get_file.blob();
    
                        response.pdf = await read_file_as_binary(blob_file);
                        response.success = true;
    
                    }
                    catch(e) { response.error = e; console.log(e) }
                    finally { return resolve(response) }
                })
            }, download_link);

            await page.waitForSelector('table[bordercolor="#E6500A"] td b');

            const doc_data = await page.evaluate(async () => {
                return await new Promise(resolve => {
                    const document_data = document.querySelector('table[bordercolor="#E6500A"] td b').innerText;
                    return resolve(document_data);
                })
            });

            const doc_number = doc_data.split('\n')[4].replace(/\D/gm, '');
            const doc_name = `${doc.internal_entity.rut} - ${doc_number}`

            if (!data.success) console.log(`electronic document - emitted but couldn't save it`);
            else fs.writeFileSync(`./electronic_docs/${doc.internal_entity.rut} - ${doc_number}.pdf`, data.pdf, 'binary');

            console.log('finished');
            
            await page.close();

            return resolve();

        } catch(e) {
            console.log(e)
            //if (browser !== undefined) await browser.close();
            //return reject(e);
        }
    })
}

(async () => {
    try {

        const documents = await readExcel();
        
        const agroleps = {
            name: 'Comercial Agroleps Limitada',
            rut: '77.117.977-0',
            branch: 'Secado El Convento',
            city: 'San Felipe',
            csg: '05379438'
        }

        const tsv = {
            name: 'Sociedad de Transportes San Vicente Limitada',
            rut: '77.686.780-2',
            branch: 'Secado El Convento',
            city: 'San Felipe',
            csg: '05379623'
        }

        const browser = await puppeteer.launch({ 
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: executablePath()
        });

        for (const doc of documents) {

            doc.internal_entity = {
                name: 'Comercial Los Huertos de Maiten Ltda.',
                rut: '77.114.753-4',
                branch: 'Secado El Convento',
                city: 'San Felipe',
                csg: '05379426'   
            }

            global.credentials = await get_sii_credentials(doc.internal_entity.rut);

            await go_to_sii(doc, browser)
        }

        await browser.close();

    }
    catch(e) { console.log(e) }
    finally { process.exit() }
})();