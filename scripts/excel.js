const UserInput = require('wait-for-user-input');
const mysql = require('mysql');
const ExcelJS = require('exceljs');

/*
const conn = mysql.createConnection({ 
    host: "192.168.1.90",
    port: 3306,
    user: "dte", 
    password: "m1Ks3DVIAS28h7dt", 
    database: "romana" 
});
*/

const conn = mysql.createConnection({ 
    host: "localhost",
    port: 3306,
    user: "root", 
    password: "", 
    database: "romana" 
});

const get_entities = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT entities.id, entities.rut, entities.name
            FROM documents_header header
            INNER JOIN entities ON header.client_entity=entities.id
            INNER JOIN weights ON header.weight_id=weights.id
            WHERE weights.status='T' AND (header.status='I' OR header.status='T')
            AND weights.created > '2021-12-01 00:00:00' AND weights.cycle=1
            GROUP BY entities.name
            ORDER BY entities.name ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results)
        })
    })
}

const get_products_for_entity = entity => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT products.code, products.name
            FROM documents_body body
            INNER JOIN documents_header header ON body.document_id=header.id
            INNER JOIN weights ON header.weight_id=weights.id
            INNER JOIN products ON body.product_code=products.code
            WHERE weights.status='T' AND (header.status='I' OR header.status='T') AND weights.cycle=1
            AND weights.created > '2021-12-01 00:00:00' AND (body.status='T' OR body.status='I') 
            AND header.client_entity=${entity}
            GROUP BY products.name
            ORDER BY products.name ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

const get_kilos_for_products = (entity, code) => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT SUM (body.kilos) AS kilos
            FROM documents_body body
            INNER JOIN documents_header header ON body.document_id=header.id
            INNER JOIN weights ON header.weight_id=weights.id
            WHERE weights.status='T' AND (header.status='I' OR header.status='T') AND weights.cycle=1
            AND weights.created > '2021-12-01 00:00:00' AND (body.status='T' OR body.status='I') 
            AND header.client_entity=${entity} AND body.product_code='${code}';
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(1 * results[0].kilos);
        })
    })
}

(async () => {
    try {

        const workbook = new ExcelJS.Workbook();

        const entities = await get_entities();

        for (let i = 0; i < entities.length; i++) {

            const sheet = workbook.addWorksheet(entities[i].name, {
                pageSetup:{
                    paperSize: 9, 
                    orientation:'landscape'
                }
            });

            sheet.columns = [
                { header: 'Producto', key: 'Producto' },
                { header: 'Kilos', key: 'Kilos' }
            ]

            entities[i].products = await get_products_for_entity(entities[i].id);
            const products = entities[i].products;
            let total = 0;

            for (let j = 0; j < products.length; j++) {

                products[j].kilos = await get_kilos_for_products(entities[i].id, products[j].code);
                total += products[j].kilos;
                
                const product_cell = sheet.getCell(`A${j + 2}`);
                product_cell.value = products[j].name;
                product_cell.font = {
                    name: 'Arial',
                    size: 11
                }
                product_cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                }

                const kilos_cell = sheet.getCell(`B${j + 2}`);
                kilos_cell.value = products[j].kilos;
                kilos_cell.font = {
                    name: 'Arial',
                    size: 11
                }
                kilos_cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                }
                kilos_cell.alignment = {
                    vertical: 'middle',
                    horizontal: 'center'
                }
                kilos_cell.numFmt = '#,##0;[Red]#,##0';

            }

            sheet.getCell(`A${products.length + 2}`).value = 'TOTAL';
            sheet.getCell(`A${products.length + 2}`).font = {
                bold: true,
                name: 'Arial',
                size: 11
            }
            sheet.getCell(`B${products.length + 2}`).value = total;
            sheet.getCell(`B${products.length + 2}`).font = {
                bold: true,
                name: 'Arial',
                size: 11
            }
            sheet.getCell(`B${products.length + 2}`).alignment = {
                vertical: 'middle',
                horizontal: 'center'
            }
            sheet.getCell(`B${products.length + 2}`).numFmt = '#,##0;[Red]#,##0';

            //COLUMN AUTOFIT
            sheet.columns.forEach(column => {

                let dataMax = 0;
                column.eachCell({ includeEmpty: true }, cell => {

                    let columnLength = cell.value.length;	
                    if (columnLength > dataMax) dataMax = columnLength;
                    
                })
                column.width = dataMax < 10 ? 10 : dataMax;
            })


            const header_row = sheet.getRow(1);
            
            header_row.getCell(1).font = { 
                bold: true,
                name: 'Arial',
                size: 11
            }
            header_row.getCell(1).alignment = {
                vertical: 'middle'
            }

            header_row.getCell(2).font = { 
                bold: true,
                name: 'Arial',
                size: 11
            }
            header_row.getCell(2).alignment = {
                vertical: 'middle',
                horizontal: 'center'
            }

            sheet.insertRow(1, { id: 1, name: 'John Doe' });
            sheet.getCell('A1').value = entities[i].name;
            sheet.getCell('A1:B1').font = {
                bold: true,
                name: 'Arial',
                size: 11
            }
            sheet.getCell('A1:B1').alignment = {
                vertical: 'middle',
                horizontal: 'center'
            }
            sheet.mergeCells('A1:B1');

        }


        await workbook.xlsx.writeFile('export.xlsx');

    }
    catch(error) { console.log(error) }
    finally { process.exit() }
})();