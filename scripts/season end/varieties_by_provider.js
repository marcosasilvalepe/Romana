"use strict";

const mysql = require('mysql');

const conn = mysql.createConnection({ 
    host: "192.168.1.90",
    port: 3306,
    user: "dte", 
    password: "m1Ks3DVIAS28h7dt", 
    database: "romana" 
});

const cycle = 1;

const product = 'Uva';

const excel = require('exceljs');

const get_varieties = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT products.name, products.code
            FROM documents_header header
            INNER JOIN weights ON header.weight_id=weights.id
            INNER JOIN documents_body body ON header.id=body.document_id
            INNER JOIN products ON body.product_code=products.code
            WHERE weights.status='T' AND header.status='I' AND weights.cycle=${cycle} AND
            (weights.created BETWEEN '2021-12-01 00:00:00' AND '2022-12-31 23:59:59')
            AND products.type='${product}'
            GROUP BY products.name
            ORDER BY products.name ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

const get_providers = product_code => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT entities.id, entities.name
            FROM documents_header header
            INNER JOIN weights ON header.weight_id=weights.id
            INNER JOIN documents_body body ON header.id=body.document_id
            INNER JOIN entities ON header.client_entity=entities.id
            WHERE weights.status='T' AND header.status='I' AND (body.status='T' OR body.status='I')
            AND (weights.created BETWEEN '2021-12-01 00:00:00' AND '2022-12-31 23:59:59') AND weights.cycle=${cycle} AND
            body.product_code='${product_code}'
            GROUP BY entities.id
            ORDER BY entities.name ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

const get_kilos = (entity, product_code) => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT SUM(body.kilos) AS kilos
            FROM documents_header header
            INNER JOIN weights ON header.weight_id=weights.id
            INNER JOIN documents_body body ON header.id=body.document_id
            WHERE weights.status='T' AND header.status='I' AND (body.status='T' OR body.status='I')
            AND (weights.created BETWEEN '2021-12-01 00:00:00' AND '2022-12-31 23:59:59') AND header.client_entity=${entity}
            AND weights.cycle=${cycle} AND body.product_code='${product_code}';
        `, (error, results, fields) => {
            if (error || results.length === 0) return reject(error);
            return resolve(results[0].kilos);
        })
    })
}

(async () => {
    try {

        const varieties = await get_varieties();

        for (let i = 0; i < varieties.length; i++) {

            const providers = await get_providers(varieties[i].code);

            let total = 0;
            for (let j = 0; j < providers.length; j++) {
                providers[j].kilos = await get_kilos(providers[j].id, varieties[i].code);
                total += providers[j].kilos;
            }

            varieties[i].providers = providers;
            varieties[i].providers.sort((a, b) => b.kilos - a.kilos);
            varieties[i].total = total;
        }

        varieties.sort((a, b) => b.total - a.total);

        /************** GENERATE EXCEL **************/

        const font = 'Calibri';
        const workbook = new excel.Workbook();

        for (let i = 0; i < varieties.length; i++) {

            const sheet = workbook.addWorksheet(varieties[i].name, {
                pageSetup:{
                    paperSize: 9
                }
            });

            const columns = [
                { header: 'Nº', key: 'line' },
                { header: 'ENTIDAD', key: 'entity' },
                { header: '%', key: 'precentage' },
                { header: 'KILOS', key: 'kilos' }
            ]

            const header_row = sheet.getRow(2);
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

            const providers = varieties[i].providers;

            let current_row = 4;

            for (let j = 0; j < providers.length; j++) {

                const data_row = sheet.getRow(j + 3);
                data_row.getCell(1).value = j + 1;
                data_row.getCell(2).value = providers[j].name;
                data_row.getCell(3).value = (Math.floor((providers[j].kilos / varieties[i].total) * 1000) / 10) + '%';
                data_row.getCell(4).value = providers[j].kilos;

                data_row.getCell(1).numFmt = '#,##0;[Red]#,##0';
                data_row.getCell(4).numFmt = '#,##0;[Red]#,##0';

                //FORMAT CELLS
                for (let k = 1; k <= 4; k++) {
                    const active_cell = data_row.getCell(k);
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
                current_row++;
            }

            //SET WIDTH FOR EACH COLUMN
            for (let j = 1; j <= 4; j++) {

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

            const last_row = sheet.getRow(providers.length + 3);
            last_row.getCell(4).value =  { formula: `SUM(D3:D${providers.length + 2})` }
            last_row.getCell(4).font = {
                size: 11,
                name: font,
                bold: true
            }
            last_row.getCell(4).alignment = {
                vertical: 'middle',
                horizontal: 'center'
            }

            last_row.getCell(4).numFmt = '#,##0;[Red]#,##0';

            const variety_name_row = sheet.getRow(1);
            variety_name_row.getCell(1).value = varieties[i].name.toUpperCase() + ' TEMPORADA 2022';
            sheet.mergeCells('A1:D1');

            for (let j = 1; j <= 4; j++) {
                const active_cell = variety_name_row.getCell(j);
                active_cell.font = {
                    size: 14,
                    name: font,
                    bold: true
                }

                active_cell.alignment = {
                    vertical: 'middle',
                    horizontal: 'center'
                }
            }

            sheet.getRow(1).height = 18;

            sheet.getColumn(4).width = 14;

            sheet.removeConditionalFormatting();

        }

        const file_name = 'informe';
        await workbook.xlsx.writeFile('./' + file_name + '.xlsx');


    }
    catch(e) { console.log(e) }
    finally { process.exit() }
})();