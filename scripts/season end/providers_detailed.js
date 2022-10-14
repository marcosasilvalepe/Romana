"use strict";

const mysql = require('mysql');

const conn = mysql.createConnection({ 
    host: "localhost",
    port: 3306,
    user: "root", 
    password: "", 
    database: "romana" 
});


const excel = require('exceljs');


const get_grapes_providers = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT entities.id, entities.name, entities.rut
            FROM weights
            INNER JOIN documents_header header ON weights.id=header.weight_id
            INNER JOIN entities ON header.client_entity=entities.id
            WHERE weights.status='T' AND header.status='I' AND weights.cycle=2 AND
            (weights.created BETWEEN '2021-12-01 00:00:00' AND '2022-08-09 23:59:59')
            GROUP BY entities.id
            ORDER BY entities.name ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

const get_providers_varieties = provider_id => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT products.name, products.code
            FROM documents_header header
            INNER JOIN weights ON header.weight_id=weights.id
            INNER JOIN documents_body body ON header.id=body.document_id
            INNER JOIN products ON body.product_code=products.code
            WHERE weights.status='T' AND header.status='I' AND weights.cycle=2 AND
            (weights.created BETWEEN '2021-12-01 00:00:00' AND '2022-08-09 23:59:59')
            AND products.type='Pasas' AND header.client_entity=${provider_id}
            GROUP BY products.name
            ORDER BY products.name ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

const get_kilos = (provider_id, product_code, cut) => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT SUM(body.kilos) AS kilos
            FROM documents_header header 
            INNER JOIN weights ON header.weight_id=weights.id
            INNER JOIN documents_body body ON header.id=body.document_id
            INNER JOIN products ON body.product_code=products.code
            WHERE weights.status='T' AND header.status='I' AND weights.cycle=2 AND
            weights.created > '2021-12-01 00:00:00' AND body.status='T'
            AND body.product_code='${product_code}' AND body.cut='${cut}'
            AND header.client_entity=${provider_id};
        `, (error, results, fields) => {
            if (error || results.length === 0) return reject(error);
            return resolve(results[0].kilos * 1);
        })
    })
}

(async () => {
    try {

        /************ GET DATA ********/
        const providers = await get_grapes_providers();

        for (let i = 0; i < providers.length; i++) {

            const varieties = await get_providers_varieties(providers[i].id);
            
            for (let j = 0; j < varieties.length; j++) {
                varieties[j].packing = await get_kilos(providers[i].id, varieties[j].code, 'Packing');
                varieties[j].parron = await get_kilos(providers[i].id, varieties[j].code, 'Parron');
                varieties[j].total = varieties[j].packing + varieties[j].parron;
            }
            
            providers[i].varieties = varieties;

            //console.log(providers[i].name, providers[i].varieties)
        }


        /********************** GENERATE EXCEL ****************/
        const font = 'Calibri';
        const workbook = new excel.Workbook();

        for (let i = 0; i < providers.length; i++) {

            if (providers[i].varieties.length === 0) continue;

            const sheet = workbook.addWorksheet(providers[i].rut.replace(/[.-]/gm, ''), {
                pageSetup:{
                    paperSize: 9
                }
            });

            const columns = [
                { header: 'Nº', key: 'line' },                
                { header: 'VARIEDAD', key: 'variety' },
                { header: 'PACKING', key: 'packing' },
                { header: 'PARRON', key: 'parron' },
                { header: 'TOTAL', key: 'total' }
            ]

            //FORMAT FIRST ROW
            const header_row = sheet.getRow(2);
            for (let i = 0; i < columns.length; i++) {
                header_row.getCell(i + 1).value = columns[i].header;
                header_row.getCell(i + 1).border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                }
                header_row.getCell(i + 1).alignment = {
                    vertical: 'middle',
                    horizontal: 'center'
                }
                header_row.getCell(i + 1).font = {
                    size: 11,
                    name: font,
                    bold: true
                }
            }

            const varieties = providers[i].varieties;

            for (let j = 0; j < varieties.length; j++) {

                const data_row = sheet.getRow(j + 3);
                data_row.getCell(1).value = j + 1;
                data_row.getCell(2).value = varieties[j].name;
                data_row.getCell(3).value = varieties[j].packing;
                data_row.getCell(4).value = varieties[j].parron;
                data_row.getCell(5).value = varieties[j].total;      
                
                data_row.getCell(1).numFmt = '#,##0;[Red]#,##0';
                data_row.getCell(3).numFmt = '#,##0;[Red]#,##0';
                data_row.getCell(4).numFmt = '#,##0;[Red]#,##0';
                data_row.getCell(5).numFmt = '#,##0;[Red]#,##0';

                //FORMAT CELLS
                for (let k = 1; k <= 5; k++) {
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
            

            const last_row = sheet.getRow(varieties.length + 3);
            last_row.getCell(3).value =  { formula: `SUM(C3:C${varieties.length + 2})` }
            last_row.getCell(4).value =  { formula: `SUM(D3:D${varieties.length + 2})` }
            last_row.getCell(5).value =  { formula: `SUM(E3:E${varieties.length + 2})` }

            for (let j = 3; j <= 5; j++) {
                const active_cell = last_row.getCell(j);
                active_cell.font = {
                    size: 11,
                    name: font,
                    bold: true
                }

                active_cell.alignment = {
                    vertical: 'middle',
                    horizontal: 'center'
                }

                active_cell.numFmt = '#,##0;[Red]#,##0';
            }

            sheet.removeConditionalFormatting();

            const providers_name_row = sheet.getRow(1);
            providers_name_row.getCell(1).value = providers[i].name.toUpperCase();
            sheet.mergeCells('A1:E1');

            for (let j = 1; j <= 5; j++) {
                const active_cell = providers_name_row.getCell(j);
                active_cell.font = {
                    size: 11,
                    name: font,
                    bold: true
                }

                active_cell.alignment = {
                    vertical: 'middle',
                    horizontal: 'center'
                }
            }
            

        }

        const file_name = 'variedades_por_proveedor';
        await workbook.xlsx.writeFile('./' + file_name + '.xlsx');

    }
    catch(e) { console.log(e) }
    finally { process.exit() }
})();