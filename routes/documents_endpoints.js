const express = require('express');
const documents_router = express.Router();
const conn = require('../config/db');
const excel = require('exceljs');

const { userMiddleware, validate_date, format_html_date, set_to_monday, error_handler } = require('./routes_functions');


/****************** DOCUMENTS *****************/
documents_router.get('/documents_get_docs', userMiddleware.isLoggedIn, async (req, res) => {

    const response = { success: false }

    try {

        const get_docs = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.weight_id, weights.primary_plates AS plates, weights.status AS weight_status, weights.cycle AS cycle, cycles.name AS cycle_name, 
                    header.number, header.status AS doc_status, entities.name AS entity, header.date
                    FROM documents_header header
                    INNER JOIN weights ON header.weight_id=weights.id
                    INNER JOIN entities ON header.client_entity=entities.id
                    INNER JOIN cycles ON weights.cycle=cycles.id
                    WHERE weights.status='T' AND header.status='I'
                    ORDER BY weights.id DESC, header.id ASC LIMIT 100;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.docs = results;
                    return resolve();
                })
            })
        }

        await get_docs();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting documents. ${e}`);
        error_handler(`Endpoint: /documents_get_docs -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

documents_router.post('/documents_docs_by_number', userMiddleware.isLoggedIn, async (req, res) => {

    const 
    { weight_status, doc_status, cycle, doc_number } = req.body,
    weight_status_sql = (weight_status === 'All') ? '' : `AND weights.status='${weight_status}'`,
    doc_status_sql = (doc_status === 'All') ? '' : `AND header.status='${doc_status}'`,
    cycle_sql = (cycle === 'All') ? '' : `AND weights.cycle=${parseInt(cycle)}`,
    response = { success: false }

    try {

        const get_documents = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.weight_id, weights.primary_plates AS plates, weights.status AS weight_status, weights.cycle, cycles.name AS cycle_name, 
                    header.number, header.status AS doc_status, entities.name AS entity, header.date
                    FROM documents_header header
                    INNER JOIN weights ON header.weight_id=weights.id
                    INNER JOIN entities ON header.client_entity=entities.id
                    INNER JOIN cycles ON weights.cycle=cycles.id
                    WHERE header.number=${parseInt(doc_number)} ${weight_status_sql} ${doc_status_sql} ${cycle_sql}
                    ORDER BY weights.id DESC, header.id;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.docs = results;
                    return resolve();
                })
            })
        }

        await get_documents();
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting documents by number. ${e}`);
        error_handler(`Endpoint: /documents_docs_by_number -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

documents_router.post('/documents_get_docs_from_filters', userMiddleware.isLoggedIn, async (req, res ) => {

    const 
    { sort, ascending_order, weight_status, doc_status, cycle, doc_number, entity, start_date, end_date } = req.body,
    weight_status_sql = (weight_status === 'All') ? '' : `AND weights.status='${weight_status}'`,
    doc_status_sql = (doc_status === 'All') ? '' : `AND header.status='${doc_status}'`,
    cycle_sql = (cycle === 'All') ? '' : `AND weights.cycle=${parseInt(cycle)}`,
    entity_sql = (entity.length === 0) ? '' : `AND entities.name LIKE '%${entity}%'`,
    doc_number_sql = (doc_number.length === 0 || doc_number === null) ? '' : `AND header.number=${parseInt(doc_number)}`,
    response = { success: false };

    try {

        const get_documents = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.weight_id, weights.primary_plates AS plates, weights.status AS weight_status, weights.cycle, cycles.name AS cycle_name, 
                    header.number, header.status AS doc_status, entities.name AS entity, header.date
                    FROM documents_header header
                    INNER JOIN weights ON header.weight_id=weights.id
                    INNER JOIN entities ON header.client_entity=entities.id
                    INNER JOIN cycles ON weights.cycle=cycles.id
                    WHERE 1=1 ${doc_number_sql} ${weight_status_sql} ${doc_status_sql} ${cycle_sql} ${entity_sql} ${date_sql}
                    ORDER BY weights.id DESC, header.id;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    response.documents = results;
                    return resolve();
                })
            })
        }

        let new_start_date, new_end_date;
        if (!validate_date(start_date) && validate_date(end_date)) new_start_date = new_end_date = end_date;
        else if (validate_date(start_date) && !validate_date(end_date)) new_start_date = new_end_date = start_date;
        else if (validate_date(start_date) && validate_date(end_date)) {

            if (start_date > end_date) new_start_date = new_end_date = start_date;
            else {
                new_start_date = start_date;
                new_end_date = end_date;    
            }
        }
        else {
            //const now = new Date();
            new_start_date = format_html_date(set_to_monday(new Date()));
            new_end_date = format_html_date(new Date());
        }

        const date_sql = `AND (header.date BETWEEN '${new_start_date} 00:00:00' AND '${new_end_date} 00:00:00')`;

        await get_documents();
        response.date = {
            start: new_start_date,
            end: new_end_date
        }
        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error getting documents from filters. ${e}`);
        error_handler(`Endpoint: /documents_get_docs_from_filters -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

documents_router.post('/documents_generate_excel', userMiddleware.isLoggedIn, async (req, res) => {

    const 
    { weight_status, doc_status, cycle, doc_number, entity, start_date, end_date, type, min_weight, max_weight } = req.body,
    weight_status_sql = (weight_status === 'All') ? '' : `AND weights.status='${weight_status}'`,
    doc_status_sql = (doc_status === 'All') ? '' : `AND header.status='${doc_status}'`,
    cycle_sql = (cycle === 'All') ? '' : `AND weights.cycle=${parseInt(cycle)}`,
    entity_sql = (entity.length === 0) ? '' : `AND entities.name LIKE '%${entity}%'`,
    doc_number_sql = (doc_number.length === 0 || doc_number === null) ? '' : `AND header.number=${parseInt(doc_number)}`,
    temp = {},
    response = { success: false };

    try {

        const get_last_100_records_simple = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.weight_id, weights.status AS weight_status, weights.cycle, cycles.name AS cycle_name, weights.primary_plates,
                    header.number, header.status AS doc_status, entities.name AS entity, header.date, header.document_total, drivers.name AS driver,
                    entity_branches.name AS branch
                    FROM documents_header header
                    INNER JOIN weights ON header.weight_id=weights.id
                    LEFT OUTER JOIN entities ON header.client_entity=entities.id
                    INNER JOIN cycles ON weights.cycle=cycles.id
                    LEFT OUTER JOIN drivers ON weights.driver_id=drivers.id
                    LEFT OUTER JOIN entity_branches ON header.client_branch=entity_branches.id
                    WHERE 1=1 ${doc_number_sql} ${weight_status_sql} ${doc_status_sql} ${cycle_sql} ${entity_sql}
                    ORDER BY weights.id DESC, header.id LIMIT 100;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    temp.documents = results;
                    return resolve()
                })
            })
        }

        const get_documents_simple = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.weight_id, weights.status AS weight_status, weights.cycle, cycles.name AS cycle_name, weights.primary_plates,
                    header.number, header.status AS doc_status, entities.name AS entity, header.date, header.document_total, drivers.name AS driver,
                    entity_branches.name AS branch
                    FROM documents_header header
                    INNER JOIN weights ON header.weight_id=weights.id
                    LEFT OUTER JOIN entities ON header.client_entity=entities.id
                    INNER JOIN cycles ON weights.cycle=cycles.id
                    LEFT OUTER JOIN drivers ON weights.driver_id=drivers.id
                    LEFT OUTER JOIN entity_branches ON header.client_branch=entity_branches.id
                    WHERE 1=1 ${doc_number_sql} ${weight_status_sql} ${doc_status_sql} ${cycle_sql} ${entity_sql} ${date_sql}
                    ORDER BY weights.id DESC, header.id;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    temp.documents = results;
                    return resolve();
                })
            })
        }

        const generate_excel_simple = () => {
            return new Promise(async (resolve, reject) => {
                try {

                    const font = 'Calibri';
                    const workbook = new excel.Workbook();

                    const sheet = workbook.addWorksheet('Hoja1', {
                        pageSetup:{
                            paperSize: 9
                        }
                    });

                    sheet.columns = [
                        { header: 'Nº', key: 'line' },
                        { header: 'ESTADO PESAJE', key: 'weight_status' },
                        { header: 'PESAJE', key: 'weight_id' },
                        { header: 'CICLO', key: 'cycle' },
                        { header: 'VEHICULO', key: 'plates' },
                        { header: 'CHOFER', key: 'driver' },
                        { header: 'FECHA DOC.', key: 'doc_date' },
                        { header: 'ESTADO DOC.', key: 'doc_status' },
                        { header: 'ENTIDAD', key: 'entity' },
                        { header: 'SUCURSAL', key: 'branch' },
                        { header: 'TOTAL DOC.', key: 'doc_total' }
                    ]

                    //FORMAT FIRST ROW
                    const header_row = sheet.getRow(1);
                    for (let i = 1; i <= 11; i++) {
                        header_row.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        }
                        header_row.getCell(i).alignment = {
                            vertical: 'middle',
                            horizontal: 'center'
                        }
                        header_row.getCell(i).font = {
                            size: 11,
                            name: font,
                            bold: true
                        }
                    }

                    const docs = temp.documents;

                    for (let i = 0; i < docs.length; i++) {
                        
                        const data_row = sheet.getRow(i + 2);

                        let weight_status;
                        if (docs[i].weight_status === 'T') weight_status = 'TERMINADO';
                        else if (docs[i].weight_status === 'I') weight_status = 'INGRESADO';
                        else if (docs[i].weight_status === 'N') weight_status = 'NULO';

                        data_row.getCell(1).value = i + 1;
                        data_row.getCell(2).value = weight_status;
                        data_row.getCell(3).value = parseInt(docs[i].weight_id);
                        data_row.getCell(4).value = docs[i].cycle_name;
                        data_row.getCell(5).value = docs[i].primary_plates;
                        data_row.getCell(6).value = docs[i].driver;
                        data_row.getCell(7).value = docs[i].date
                        data_row.getCell(8).value = (docs[i].doc_status === 'I') ? 'INGRESADO' : 'NULO';
                        data_row.getCell(9).value = docs[i].entity;
                        data_row.getCell(10).value = docs[i].branch;
                        data_row.getCell(11).value = (docs[i].document_total === null)  ? 0 : parseInt(docs[i].document_total);

                        data_row.getCell(1).numFmt = '#,##0;[Red]#,##0';
                        data_row.getCell(3).numFmt = '#,##0;[Red]#,##0';
                        data_row.getCell(11).numFmt = '#,##0;[Red]#,##0';

                        for (let j = 1; j <= 11; j++) {
                            const active_cell = data_row.getCell(j);
                            active_cell.font = {
                                size: 11,
                                name: font
                            }

                            active_cell.alignment = {
                                vertical: 'middle',
                                horizontal: 'center'
                            }

                            active_cell.border = {
                                top: { style: 'thin' },
                                left: { style: 'thin' },
                                bottom: { style: 'thin' },
                                right: { style: 'thin' }
                            }
                        }
                    }

                    sheet.columns.forEach(column => {
                        let dataMax = 0;
                        column.eachCell({ includeEmpty: false }, cell => {
                            let columnLength = cell.value.length + 3;	
                            if (columnLength > dataMax) {
                                dataMax = columnLength;
                            }
                        });
                        column.width = (dataMax < 5) ? 5 : dataMax;
                    });

                    sheet.removeConditionalFormatting();

                    const file_name = new Date().getTime();
                    await workbook.xlsx.writeFile('./temp/' + file_name + '.xlsx');
                    response.file_name = file_name;

                    return resolve();
                } catch(e) { return reject(e) }
            })
        }

        const get_last_100_records_detailed = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.id, weights.created AS weight_date, header.weight_id, weights.status AS weight_status, weights.cycle, cycles.name AS cycle_name, 
                    weights.primary_plates, header.number AS doc_number, header.status AS doc_status, entities.name AS entity, entities.billing_type, header.date, 
                    header.document_total, drivers.name AS driver, entity_branches.name AS branch, containers.name AS container_name, body.container_amount, 
                    body.product_name, body.cut, body.kilos, body.informed_kilos, body.price, body.informed_kilos, documents_comments.comments
                    FROM documents_header header
                    INNER JOIN documents_body body ON header.id=body.document_id
                    LEFT OUTER JOIN containers ON body.container_code=containers.code
                    LEFT OUTER JOIN products ON body.product_code=products.code
                    INNER JOIN weights ON header.weight_id=weights.id
                    LEFT OUTER JOIN entities ON header.client_entity=entities.id
                    INNER JOIN cycles ON weights.cycle=cycles.id
                    LEFT OUTER JOIN drivers ON weights.driver_id=drivers.id
                    LEFT OUTER JOIN entity_branches ON header.client_branch=entity_branches.id
                    LEFT OUTER JOIN documents_comments ON header.id=documents_comments.doc_id
                    WHERE 1=1 AND (body.status='T' OR body.status='I') AND (weights.id BETWEEN ${parseInt(min_weight)} AND ${parseInt(max_weight)})
                    ${doc_number_sql} ${weight_status_sql} ${doc_status_sql} ${cycle_sql} ${entity_sql}
                    ORDER BY weights.id ASC, header.id DESC, body.id;
                `, async (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve(results);    
                })
            })
        }

        const get_documents_detailed = () => {
            return new Promise((resolve, reject) => {
                conn.query(`
                    SELECT header.id, weights.created AS weight_date, header.weight_id, weights.status AS weight_status, weights.cycle, cycles.name AS cycle_name, 
                    weights.primary_plates, header.number AS doc_number, header.status AS doc_status, entities.name AS entity, entities.billing_type, header.date, 
                    header.document_total, drivers.name AS driver, entity_branches.name AS branch, containers.name AS container_name, body.container_amount, 
                    body.product_name, body.cut, body.kilos, body.informed_kilos, body.price, body.informed_kilos, documents_comments.comments
                    FROM documents_header header
                    INNER JOIN documents_body body ON header.id=body.document_id
                    LEFT OUTER JOIN containers ON body.container_code=containers.code
                    LEFT OUTER JOIN products ON body.product_code=products.code
                    INNER JOIN weights ON header.weight_id=weights.id
                    LEFT OUTER JOIN entities ON header.client_entity=entities.id
                    INNER JOIN cycles ON weights.cycle=cycles.id
                    LEFT OUTER JOIN drivers ON weights.driver_id=drivers.id
                    LEFT OUTER JOIN entity_branches ON header.client_branch=entity_branches.id
                    LEFT OUTER JOIN documents_comments ON header.id=documents_comments.doc_id
                    WHERE 1=1 AND (body.status='T' OR body.status='I')
                    ${doc_number_sql} ${weight_status_sql} ${doc_status_sql} ${cycle_sql} ${entity_sql} ${date_sql}
                    ORDER BY header.id ASC, body.id ASC;
                `, (error, results, fields) => {
                    if (error) return reject(error);
                    return resolve(results);
                })
            })
        }

        const generate_excel_detailed = results => {
            return new Promise(async (resolve, reject) => {
                try {

                    //CREATE OBJECTS
                    const documents = [];

                    let current_doc_id;

                    for (let k = 0; k < results.length; k++) {

                        if (current_doc_id === results[k].id) continue;
                        current_doc_id = results[k].id;

                        const document = {
                            id: results[k].id,
                            internal_billing: (results[k].billing_type === 0) ? false : true,
                            doc_status: (results[k].doc_status === 'I') ? 'INGRESADO' : 'NULO',
                            entity: results[k].entity,
                            weight_id: results[k].weight_id,
                            weight_status,
                            weight_date: results[k].weight_date,
                            cycle: results[k].cycle_name,
                            plates: results[k].primary_plates,
                            driver: results[k].driver,
                            date: results[k].date,
                            branch: results[k].branch,
                            number: results[k].doc_number,
                            comments: (results[k].comments === null) ? '' : results[k].comments.split('\n').join(' - '),
                            rows: []
                        }

                        if (results[k].weight_status === 'T') document.weight_status = 'TERMINADO';
                        else if (results[k].weight_status === 'I') document.weight_status = 'INGRESADO';
                        else if (results[k].weight_status === 'N') document.weight_status = 'NULO';
                        else results[k].weight_status = '???';

                        for (let i = k; i < results.length; i++) {

                            if (results[i].id !== document.id) break;

                            document.rows.push({
                                container_name: results[i].container_name,
                                container_weight: results[i].container_weight,
                                container_amount: results[i].container_amount,
                                product_name: results[i].product_name,
                                cut: results[i].cut,
                                kilos: results[i].kilos,
                                informed_kilos: results[i].informed_kilos,
                                price: results[i].price
                            });
                        }

                        documents.push(document);
                    }

                    const font = 'Calibri';
                    const workbook = new excel.Workbook();

                    const sheet = workbook.addWorksheet('Hoja1', {
                        pageSetup:{
                            paperSize: 9
                        }
                    });

                    const create_header_row = row_number => {
                        const columns = [
                            { header: 'ESTADO PESAJE', key: 'weight_status' },
                            { header: 'PESAJE', key: 'weight_id' },
                            { header: 'FECHA PESAJE', key: 'weight_date' },
                            { header: 'CICLO', key: 'cycle' },
                            { header: 'VEHICULO', key: 'plates' },
                            { header: 'CHOFER', key: 'driver' },
                            { header: 'FECHA DOC.', key: 'doc_date' },
                            { header: 'Nº DOC.', key: 'doc_number' },
                            { header: 'ESTADO DOC.', key: 'doc_status' },
                            { header: 'ENTIDAD', key: 'entity' },
                            { header: 'SUCURSAL', key: 'branch' },
                            { header: 'ENVASE', key: 'container_name' },
                            { header: 'ENVASES', key: 'container_amount' },
                            { header: 'PRODUCTO', key: 'product' },
                            { header: 'DESCARTE', key: 'cut' },
                            { header: 'PRECIO', key: 'price' },
                            { header: 'KILOS', key: 'kilos' },
                            { header: 'KG. INF.', key: 'informed_kilos' },
                            { header: 'TOTAL PROD.', key: 'product_total' },
                            { header: 'OBSERVACIONES', key: 'comments' }
                        ]

                        const header_row = sheet.getRow(row_number);
                        for (let j = 0; j < columns.length; j++) {
                            header_row.getCell(j + 1).value = columns[j].header;
                            header_row.getCell(j + 1).border = {
                                top: { style: 'thin' },
                                left: { style: 'thin' },
                                bottom: { style: 'thin' },
                                right: { style: 'thin' }
                            }
                            header_row.getCell(j + 1).alignment = {
                                vertical: 'middle',
                                horizontal: 'center'
                            }
                            header_row.getCell(j + 1).font = {
                                size: 11,
                                name: font,
                                bold: true
                            }
                        }
                    }

                    create_header_row(1)

                    let current_row = 1;

                    for (let i = 0; i < documents.length; i++) {

                        let first_row = current_row + 1;

                        create_header_row(current_row);
                        current_row++;

                        for (let row of documents[i].rows) {

                            const data_row = sheet.getRow(current_row);

                            data_row.getCell(1).value = documents[i].weight_status;
                            data_row.getCell(2).value = parseInt(documents[i].weight_id);
                            data_row.getCell(3).value = new Date(documents[i].weight_date).toLocaleString('es-CL');
                            data_row.getCell(4).value = documents[i].cycle;
                            data_row.getCell(5).value = documents[i].plates;
                            data_row.getCell(6).value = documents[i].driver;
                            data_row.getCell(7).value = documents[i].date;
                            data_row.getCell(8).value = documents[i].number;                           
                            data_row.getCell(9).value = documents[i].doc_status;
                            data_row.getCell(10).value = documents[i].entity;
                            data_row.getCell(11).value = documents[i].branch;

                            data_row.getCell(12).value = (row.container_name === null) ? '' : row.container_name;
                            data_row.getCell(13).value = (row.container_amount === null) ? '' : parseInt(row.container_amount);
                            data_row.getCell(14).value = (row.product_name === null) ? '' : row.product_name;
                            data_row.getCell(15).value = (row.cut === null) ? '' : row.cut;
                            data_row.getCell(16).value = (row.price === null) ? '' : parseInt(row.price);
                            data_row.getCell(17).value = (row.kilos === null) ? '' : parseInt(row.kilos);
                            data_row.getCell(18).value = (row.informed_kilos === null) ? '' : parseInt(row.informed_kilos);

                            //IF ENTITY GET BILLED FOR OUR KILOS THEN TOTAL FORMULA MULTITPLIES KILOS WITH PRICE. OTHERWISE IT MULTIPLIES INFORMED_KILOS WITH PRICE
                            if (documents[i].internal_billing) data_row.getCell(19).value = { formula: `=P${current_row}*Q${current_row}`};
                            else data_row.getCell(19).value = { formula: `=P${current_row}*R${current_row}`};

                            data_row.getCell(20).value = documents[i].comments;

                            data_row.getCell(2).numFmt = '#,##0;[Red]#,##0';
                            data_row.getCell(3).numFmt = 'DD/MM/YYYY HH:MM:SS';
                            data_row.getCell(8).numFmt = '#,##0;[Red]#,##0';
                            data_row.getCell(13).numFmt = '#,##0;[Red]#,##0';
                            data_row.getCell(16).numFmt = '$#,##0;[Red]-$#,##0';
                            data_row.getCell(17).numFmt = '#,##0;[Red]#,##0';
                            data_row.getCell(18).numFmt = '#,##0;[Red]#,##0';
                            data_row.getCell(19).numFmt = '$#,##0;[Red]-$#,##0';

                            //FORMAT EACH CELL ROW
                            for (let j = 1; j <= 20; j++) {
                                data_row.getCell(j).border = {
                                    top: { style: 'thin' },
                                    left: { style: 'thin' },
                                    bottom: { style: 'thin' },
                                    right: { style: 'thin' }
                                }
                                data_row.getCell(j).alignment = {
                                    vertical: 'middle',
                                    horizontal: 'center'
                                }
                            }

                            data_row.getCell(20).alignment = { vertical: 'top', horizontal: 'center', wrapText: true }

                            current_row++;
                        }

                        //SUM TOTALS
                        const last_row = current_row - 1;
                        const totals_row = sheet.getRow(current_row);
                        
                        totals_row.getCell(13).value = { formula: `SUM(M${first_row}:M${last_row})` }
                        totals_row.getCell(17).value = { formula: `SUM(Q${first_row}:Q${last_row})` }
                        totals_row.getCell(18).value = { formula: `SUM(R${first_row}:R${last_row})` }
                        totals_row.getCell(19).value = { formula: `SUM(S${first_row}:S${last_row})` }

                        for (let j = 2; j <= 20; j++) {
                            totals_row.getCell(j).numFmt = '#,##0;[Red]#,##0';
                            totals_row.getCell(j).alignment = {
                                vertical: 'middle',
                                horizontal: 'center'
                            }
                            totals_row.getCell(j).font = { 
                                name: font,
                                bold: true
                            }
                        }

                        totals_row.getCell(19).numFmt = '$#,##0;[Red]-$#,##0';

                        sheet.mergeCells(`A${first_row}:A${last_row}`);
                        sheet.mergeCells(`B${first_row}:B${last_row}`);
                        sheet.mergeCells(`C${first_row}:C${last_row}`);
                        sheet.mergeCells(`D${first_row}:D${last_row}`);
                        sheet.mergeCells(`E${first_row}:E${last_row}`);
                        sheet.mergeCells(`F${first_row}:F${last_row}`);
                        sheet.mergeCells(`G${first_row}:G${last_row}`);
                        sheet.mergeCells(`H${first_row}:H${last_row}`);
                        sheet.mergeCells(`I${first_row}:I${last_row}`);
                        sheet.mergeCells(`J${first_row}:J${last_row}`);
                        sheet.mergeCells(`K${first_row}:K${last_row}`);
                        sheet.mergeCells(`T${first_row}:T${last_row}`);

                        current_row += 2;
                    }

                    //SET WIDTH FOR EACH COLUMN
                    for (let j = 1; j <= 20; j++) {

                        let dataMax = 0;
                        for (let i = current_row - 1; i > 1; i--) {
    
                            const 
                            this_row = sheet.getRow(i),
                            this_cell = this_row.getCell(j);

                            if (this_cell.value === null) continue;
    
                            let columnLength = this_cell.value.length + 3;	
                            if (columnLength > dataMax) dataMax = columnLength;
    
                        }
    
                        sheet.getColumn(j).width = (dataMax < 5) ? 5 : dataMax; 
                    }

                    sheet.getColumn(2).width = 12;
                    sheet.getColumn(3).width = 21;
                    sheet.getColumn(20).width = 30;

                    sheet.removeConditionalFormatting();

                    const file_name = new Date().getTime();
                    await workbook.xlsx.writeFile('./temp/' + file_name + '.xlsx');
                    response.file_name = file_name;

                    return resolve();
                } catch(e) { return reject(e) }
            })
        }

        let new_start_date, new_end_date;
        if (!validate_date(start_date) && validate_date(end_date)) new_start_date = new_end_date = end_date;
        else if (validate_date(start_date) && !validate_date(end_date)) new_start_date = new_end_date = start_date;
        else if (validate_date(start_date) && validate_date(end_date)) {

            if (start_date > end_date) new_start_date = new_end_date = start_date;
            else {
                new_start_date = start_date;
                new_end_date = end_date;    
            }
        }
        else {
            new_start_date = format_html_date(set_to_monday(new Date()));
            new_end_date = format_html_date(new Date());
        }

        const date_sql = `AND (weights.created BETWEEN '${new_start_date} 00:00:00' AND '${new_end_date} 23:59:59')`;

        if (type === 'simple') {

            if (start_date.length === 0 && end_date.length === 0) await get_last_100_records_simple();
            else await get_documents_simple();

            if (start_date.length === 0 && end_date.length === 0) await get_last_100_records_simple();
            else await get_documents_simple();

            await generate_excel_simple();
        }

        else {
            const db_data = (start_date.length === 0 && end_date.length === 0) ? await get_last_100_records_detailed() : await get_documents_detailed();
            await generate_excel_detailed(db_data);
        }

        response.success = true;

    }
    catch(e) { 
        response.error = e; 
        console.log(`Error generating excel for documents. ${e}`);
        error_handler(`Endpoint: /documents_generate_excel_simple -> User Name: ${req.userData.userName}\r\n${e}`);
    }
    finally { res.json(response) }
})

module.exports = { documents_router };