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

const get_records = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
        SELECT header.id AS doc_id, header.weight_id, header.date AS doc_date, header.number AS doc_number, 
        entities.id AS entity_id, entities.name AS entity_name, entities.rut AS entity_rut, entity_branches.name AS branch_name, 
        body.product_name, body.cut, body.price, body.kilos, body.informed_kilos, containers.name AS container_name, 
        body.container_amount
        FROM documents_header header
        INNER JOIN weights ON header.weight_id=weights.id
        INNER JOIN entities ON header.client_entity=entities.id
        INNER JOIN entity_branches ON header.client_branch=entity_branches.id
        INNER JOIN documents_body body ON header.id=body.document_id
        LEFT OUTER JOIN products ON body.product_code=products.code
        LEFT OUTER JOIN containers ON body.container_code=containers.code
        WHERE weights.created < '2019-11-20 00:00:00' AND weights.status <> 'N' 
        AND header.status='I' AND body.status <> 'N' AND weights.cycle=1
        ORDER BY entity_rut ASC, doc_number ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);



            return resolve(entities_array);
        })
    })
}

const get_entities = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
        SELECT entities.id, entities.name, entities.rut
        FROM documents_header header
        INNER JOIN weights ON header.weight_id=weights.id
        INNER JOIN entities ON header.client_entity=entities.id
        WHERE (weights.created BETWEEN '2019-01-01 00:00:00' AND '2019-10-30 00:00:00') AND weights.status <> 'N' 
        AND header.status='I' AND weights.cycle=2 AND entities.id <> 183 AND entities.id <> 149 AND entities.id <> 233
        GROUP BY entities.id
        ORDER BY entities.name ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve(results);
        })
    })
}

const get_documents = id => {
    return new Promise((resolve, reject) => {
        conn.query(`
            SELECT header.id AS doc_id, header.weight_id, header.date AS doc_date, header.number AS doc_number, 
            entity_branches.name AS branch_name, body.product_name, body.cut, body.price, body.kilos, body.informed_kilos, 
            containers.name AS container_name, body.container_amount
            FROM documents_header header
            INNER JOIN weights ON header.weight_id=weights.id
            INNER JOIN entities ON header.client_entity=entities.id
            INNER JOIN entity_branches ON header.client_branch=entity_branches.id
            INNER JOIN documents_body body ON header.id=body.document_id
            LEFT OUTER JOIN products ON body.product_code=products.code
            LEFT OUTER JOIN containers ON body.container_code=containers.code
            WHERE (weights.created BETWEEN '2019-01-01 00:00:00' AND '2019-10-30 00:00:00') AND weights.status <> 'N' 
            AND header.status='I' AND body.status <> 'N' AND weights.cycle=2
            AND header.client_entity=${id}
            ORDER BY doc_number ASC;
        `, (error, results, fields) => {
            if (error) return reject(error);

            const docs_array = [], temp_array = [];

            for (let doc of results) {
                    
                if (temp_array.includes(doc.doc_id)) continue;
                temp_array.push(doc.doc_id);

                const document = {
                    id: doc.doc_id,
                    weight_id: doc.weight_id,
                    date: doc.doc_date,
                    number: doc.doc_number,
                    branch: doc.branch_name,
                    rows: []
                }

                for (let record of results) {

                    if (record.doc_id !== document.id) continue;
                    
                    document.rows.push({
                        product: record.product_name,
                        kilos: record.kilos,
                        kg_inf: record.informed_kilos,
                        cut: record.cut,
                        price: record.price,
                        container: (record.container_name === null) ? '' : record.container_name.replace(' Con Marcado VL', ''),
                        container_amount: record.container_amount
                    });
                }
                docs_array.push(document);
            }
            return resolve(docs_array);
        })
    })
}

const do_summary = (summary, type, varieties, entity) => {
    return new Promise((resolve, reject) => {
        try {

            const font = 'Calibri';
            const header_row = summary.getRow(2);

            const summary_columns = [
                { header: 'Nº', key: 'line' },
                { header: 'VARIEDAD', key: 'variety' },
                { header: 'PACKING', key: 'packing' },
                { header: 'PARRON', key: 'parron' },
                { header: 'TOTAL', key: 'total' }
            ];

            for (let j = 0; j < summary_columns.length; j++) {
                header_row.getCell(j + 1).value = summary_columns[j].header;
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

            let variety_index = 1;
            let current_row = 3;
            for (let variety of varieties) {

                summary.getCell(`A${current_row}`).value = variety_index;
                summary.getCell(`B${current_row}`).value = variety.name;
                summary.getCell(`C${current_row}`).value = (type === 'lepefer') ? variety.kilos.packing : variety.kg_inf.packing;
                summary.getCell(`D${current_row}`).value = (type === 'lepefer') ? variety.kilos.parron : variety.kg_inf.parron;
                summary.getCell(`E${current_row}`).value = { formula: `SUM(C${current_row}:D${current_row})` };

                summary.getCell(`C${current_row}`).numFmt = '#,##0;[Red]#,##0';
                summary.getCell(`D${current_row}`).numFmt = '#,##0;[Red]#,##0';
                summary.getCell(`E${current_row}`).numFmt = '#,##0;[Red]#,##0';

                current_row ++;;
                variety_index ++;
            }

            //SUM TOTALS
            const totals_columns = ['C', 'D', 'E'];
            for (let column of totals_columns) {
                summary.getCell(column + current_row).value = { formula: `SUM(${column + 3}:${column + (current_row - 1)})` }
                summary.getCell(column + current_row).alignment = {
                    vertical: 'middle',
                    horizontal: 'center'
                }
                summary.getCell(column + current_row).font = {
                    name: font,
                    size: 11,
                    bold: true
                }
                summary.getCell(column + current_row).numFmt = '#,##0;[Red]#,##0';
            }

            // WRITE ENTITY DATA
            if (type !== 'lepefer') {
                summary.getCell(`A${current_row + 3}`).value = entity[0];
                summary.getCell(`A${current_row + 3}`).font = {
                    name: font,
                    size: 12
                }
                summary.getCell(`A${current_row + 3}`).alignment = {
                    vertical: 'middle',
                    horizontal: 'center'
                }
                summary.mergeCells(`A${current_row + 3}:E${current_row + 3}`);
    
                summary.getCell(`A${current_row + 4}`).value = 'RUT: ' + entity[1];
                summary.getCell(`A${current_row + 4}`).font = {
                    name: font,
                    size: 12
                }
                summary.getCell(`A${current_row + 4}`).alignment = {
                    vertical: 'middle',
                    horizontal: 'center'
                }
                summary.mergeCells(`A${current_row + 4}:E${current_row + 4}`);    
            }

            //FORMAT CELLS
            //SET WIDTH FOR EACH COLUMN
            for (let j = 1; j <= 5; j++) {

                let dataMax = 0;
                for (let i = current_row - 1; i > 2; i--) {

                    const 
                    this_row = summary.getRow(i),
                    this_cell = this_row.getCell(j);

                    if (this_cell.value === null) continue;
                    
                    this_cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    }
                    this_cell.alignment = {
                        vertical: 'middle',
                        horizontal: 'center'
                    }
                    this_cell.font = {
                        name: font,
                        size: 11
                    }

                    let columnLength = this_cell.value.length + 3;	
                    if (columnLength > dataMax) dataMax = columnLength;
                }

                //console.log(`Column ${j} width is ${dataMax}`)
                summary.getColumn(j).width = (dataMax < 5) ? 5 : dataMax; 
            }

            summary.getColumn(3).width = 13;
            summary.getColumn(4).width = 13;
            summary.getColumn(5).width = 13;

            return resolve();
        } catch(e) { return reject(e) }
    })
}

const generate_excel_sheet = entity => {
    return new Promise(async (resolve, reject) => {
        try {

            const workbook = new excel.Workbook();
            const font = 'Calibri';

            const lepefer_summary = workbook.addWorksheet('TOTALES LEPEFER', {
                pageSetup:{
                    paperSize: 9
                }
            });
            lepefer_summary.getCell('A1').value = 'TOTALES KILOS LEPEFER';
            lepefer_summary.getCell('A1').font = {
                size: 18,
                name: font,
                bold: true
            }
            lepefer_summary.getCell('A1').alignment = {
                vertical: 'middle',
                horizontal: 'center'
            }
            lepefer_summary.mergeCells(`A1:E1`);
            lepefer_summary.getRow(1).height = 20;

            const provider_summary = workbook.addWorksheet('TOTALES PROVEEDOR', {
                pageSetup:{
                    paperSize: 9
                }
            });
            provider_summary.getCell('A1').value = 'TOTALES KILOS PROVEEDOR';
            provider_summary.getCell('A1').font = {
                size: 18,
                name: font,
                bold: true
            }
            provider_summary.getCell('A1').alignment = {
                vertical: 'middle',
                horizontal: 'center'
            }
            provider_summary.mergeCells(`A1:E1`);
            provider_summary.getRow(1).height = 20;
            
            const sheet = workbook.addWorksheet('DOCUMENTOS', {
                pageSetup:{
                    paperSize: 9,
                    orientation: 'landscape'
                }
            });

            sheet.pageSetup.margins = {
                left: 0.2, right: 0.2,
                top: 0.5, bottom: 0.5,
                header: 0.1, footer: 0.1
            };

            const create_header_row = row_number => {
                const columns = [
                    { header: 'Nº', key: 'line' },
                    { header: 'PESAJE', key: 'weight_id' },
                    { header: 'FECHA DOC.', key: 'doc_date' },
                    { header: 'SUCURSAL', key: 'branch' },
                    { header: 'Nº DOC.', key: 'doc_number' },
                    { header: 'ENVASE', key: 'container_name' },
                    { header: 'CANT. ENV.', key: 'container_amount' },
                    { header: 'PRODUCTO', key: 'product' },
                    { header: 'DESCARTE', key: 'cut' },
                    { header: 'PRECIO', key: 'price' },
                    { header: 'KILOS', key: 'kilos' },
                    { header: 'KG. INF.', key: 'kg_inf' },
                    { header: 'TOTAL', key: 'total' }
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
                    header_row.getCell(j + 1).alignment = { vertical: 'middle', horizontal: 'center' }
                    header_row.getCell(j + 1).font = { size: 10, name: font, bold: true }
                }
            }

            create_header_row(2)

            let current_row = 3, total_containers = 0;

            const varieties = [], varieties_temp = [];

            const data = entity.documents;
            for (let i = 0; i < data.length; i++) {

                const starting_row = current_row;

                for (let j = 0; j < data[i].rows.length; j++) {

                    if (data[i].rows[j].product === null) continue;

                    //ADD TO VARIETIES ARRAY
                    let index;
                    if (varieties_temp.includes(data[i].rows[j].product)) index = varieties_temp.indexOf(data[i].rows[j].product);
                        
                    //CREATE AND PUSH VARIETY OBJECT
                    else {
                        varieties_temp.push(data[i].rows[j].product);
                        varieties.push({
                            name: data[i].rows[j].product,
                            kilos: { parron: 0, packing: 0 },
                            kg_inf: { parron: 0, packing: 0 }
                        });
                        index = varieties_temp.length - 1;
                    }

                    if (data[i].rows[j].cut === 'Packing') {
                        varieties[index].kilos.packing += (entity.id === 195) ? data[i].rows[j].kg_inf : data[i].rows[j].kilos;
                        varieties[index].kg_inf.packing += data[i].rows[j].kg_inf;
                    }

                    else {
                        varieties[index].kilos.parron += (entity.id === 195) ? data[i].rows[j].kg_inf : data[i].rows[j].kilos;
                        varieties[index].kg_inf.parron += data[i].rows[j].kg_inf;
                    }
                    
                    //DO SHEET STUFF
                    const data_row = sheet.getRow(current_row);
                    data_row.getCell(1).value = i + 1;
                    data_row.getCell(2).value = parseInt(data[i].weight_id);
                    data_row.getCell(3).value = (data[i].date === null) ? '-' : data[i].date;
                    data_row.getCell(4).value = (data[i].branch === null) ? '-' : data[i].branch;
                    data_row.getCell(5).value = (data[i].number === null) ? '-' : data[i].number;
                    data_row.getCell(6).value = data[i].rows[j].container;
                    data_row.getCell(7).value = (data[i].rows[j].container_amount === null) ? '-' : data[i].rows[j].container_amount;
                    data_row.getCell(8).value = data[i].rows[j].product;
                    data_row.getCell(9).value = data[i].rows[j].cut;
                    data_row.getCell(10).value = data[i].rows[j].price;
                    data_row.getCell(11).value = (entity.id === 195) ? data[i].rows[j].kg_inf : data[i].rows[j].kilos;
                    data_row.getCell(12).value = data[i].rows[j].kg_inf;
                    data_row.getCell(13).value = { formula: `J${current_row} * L${current_row}` }

                    data_row.getCell(1).numFmt = '#,##0;[Red]#,##0';
                    data_row.getCell(2).numFmt = '#,##0;[Red]#,##0';
                    data_row.getCell(5).numFmt = '#,##0;[Red]#,##0';
                    data_row.getCell(7).numFmt = '#,##0;[Red]#,##0';
                    data_row.getCell(10).numFmt = '#,##0;[Red]#,##0';
                    data_row.getCell(11).numFmt = '#,##0;[Red]#,##0';
                    data_row.getCell(12).numFmt = '#,##0;[Red]#,##0';
                    data_row.getCell(13).numFmt = '#,##0;[Red]#,##0';

                    current_row++;

                    //FORMAT EACH CELL ROW
                    for (let k = 1; k <= 13; k++) {
                        data_row.getCell(k).border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        }
                        data_row.getCell(k).alignment = {
                            vertical: 'middle',
                            horizontal: 'center'
                        }
                        data_row.getCell(k).font = {
                            name: font,
                            size: 10
                        }
                    }

                    total_containers += data[i].rows[j].container_amount;
                }

                //MERGE CELLS
                sheet.mergeCells(`A${starting_row}:A${current_row - 1}`);
                sheet.mergeCells(`B${starting_row}:B${current_row - 1}`);
                sheet.mergeCells(`C${starting_row}:C${current_row - 1}`);
                sheet.mergeCells(`D${starting_row}:D${current_row - 1}`);
                sheet.mergeCells(`E${starting_row}:E${current_row - 1}`);

                //SUM DOCUMENT CONTAINERS
                const sums_array = [{ index: 7, letter: 'G' }, { index: 11, letter: 'K' }, { index: 12, letter: 'L' }, { index: 13, letter: 'M'}];
                const last_doc_row = sheet.getRow(current_row);

                for (let obj of sums_array) {
                    last_doc_row.getCell(obj.index).value =  { formula: `SUM(${obj.letter}${starting_row}:${obj.letter}${current_row - 1})` }
                    last_doc_row.getCell(obj.index).font = {
                        size: 10,
                        name: font,
                        bold: true
                    }
                    last_doc_row.getCell(obj.index).alignment = {
                        vertical: 'middle',
                        horizontal: 'center'
                    }
                    last_doc_row.getCell(obj.index).numFmt = '#,##0;[Red]#,##0';
                }

                current_row += 2;

                if (i < data.length - 1) {
                    create_header_row(current_row)
                    current_row++;    
                }
            }

            const last_cell = sheet.getCell(`A${current_row}`);
            //last_cell.value = `TOTAL ${type} = ${total_containers}`;

            last_cell.font = { size: 15, name: font, bold: true }
            last_cell.alignment = { vertical: 'middle', horizontal: 'center' }
            sheet.mergeCells(`A${current_row}:L${current_row}`);
            
            //SET WIDTH FOR EACH COLUMN
            for (let j = 1; j <= 13; j++) {

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

            sheet.getColumn(13).width = 14;
            
            //WRITE FIRST ROW AND MERGE
            const first_row = sheet.getRow(1);
            first_row.height = 21;
            first_row.getCell(1).value = entity.name.toUpperCase();
            sheet.mergeCells('A1:M1');

            for (let j = 1; j <= 13; j++) {
                const active_cell = first_row.getCell(j);
                active_cell.font = {
                    size: 18,
                    name: font,
                    bold: true
                }

                active_cell.alignment = {
                    vertical: 'middle',
                    horizontal: 'center'
                }
            }

            sheet.removeConditionalFormatting();

            //VARIETIES SUMMARY
            await do_summary(lepefer_summary, 'lepefer', varieties, []);
            await do_summary(provider_summary, 'proveedor', varieties, [entity.name, entity.rut]);

            totals.push({
                name: entity.name,
                rut: entity.rut,
                varieties: varieties
            });

            await workbook.xlsx.writeFile('./files/' + entity.name.toUpperCase() + '.xlsx');
            return resolve();
        } catch(e) { return reject(e) }
    })
}

const totals = [];

(async () => {

    try {

        //const records = await get_records();

        const entities = await get_entities();

        for (let entity of entities) {
            entity.documents = await get_documents(entity.id);
            await generate_excel_sheet(entity);
        }

        const workbook = new excel.Workbook();
        const font = 'Calibri';
        const entities_sheet = workbook.addWorksheet('PROVEEDORES', {
            pageSetup:{
                paperSize: 9
            }
        });
        entities_sheet.pageSetup.margins = {
            left: 0.2, right: 0.2,
            top: 0.5, bottom: 0.5,
            header: 0.1, footer: 0.1
        };
        
        const varieties = [], varieties_name = [];
        //DO ENTITIES SHEET
        const columns = [
            { header: 'Nº', key: 'line' },
            { header: 'PROVEEDOR', key: 'entity' },
            { header: 'RUT', key: 'rut' },
            { header: 'KG. LEPEFER', key: 'kilos' },
            { header: 'KG. PROVEEDOR', key: 'kg_inf' },
            { header: 'DIFERENCIA', key: 'difference' }
        ];

        for (let j = 0; j < columns.length; j++) {
            const header_row = entities_sheet.getRow(2);
            header_row.getCell(j + 1).value = columns[j].header;
            header_row.getCell(j + 1).border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
            header_row.getCell(j + 1).alignment = { vertical: 'middle', horizontal: 'center' }
            header_row.getCell(j + 1).font = { size: 10, name: font, bold: true }
        }

        let i = 1;
        let current_row = 3;
        for (let entity of totals) {

            entity.kilos = 0;
            entity.kg_inf = 0;
            
            //FILL VARIETIES ARRAY
            for (let variety of entity.varieties) {
                
                entity.kilos += variety.kilos.packing;
                entity.kilos += variety.kilos.parron;

                entity.kg_inf += variety.kg_inf.packing;
                entity.kg_inf += variety.kg_inf.parron;

                let index;
                if (varieties_name.includes(variety.name)) index = varieties_name.indexOf(variety.name)
                else {
                    varieties_name.push(variety.name);
                    varieties.push({
                        name: variety.name,
                        kilos: { packing: 0, parron: 0 },
                        kg_inf: { packing: 0, parron: 0 }
                    });
                    index = varieties_name.length - 1
                }

                varieties[index].kilos.packing += variety.kilos.packing;
                varieties[index].kilos.parron += variety.kilos.parron;
                varieties[index].kg_inf.packing += variety.kg_inf.packing;
                varieties[index].kg_inf.parron += variety.kg_inf.parron;
            }

            const this_row = entities_sheet.getRow(current_row);
            this_row.getCell(1).value = i;
            this_row.getCell(2).value = entity.name;
            this_row.getCell(3).value = entity.rut;
            this_row.getCell(4).value = entity.kilos;
            this_row.getCell(5).value = entity.kg_inf;
            this_row.getCell(6).value = { formula: `D${current_row} - E${current_row}` }

            this_row.getCell(4).numFmt = '#,##0;[Red]#,##0';
            this_row.getCell(5).numFmt = '#,##0;[Red]#,##0';
            this_row.getCell(6).numFmt = '#,##0;[Red]#,##0';

            for (let j = 1; j <= 6; j++) {
                this_row.getCell(j).border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                }
                this_row.getCell(j).alignment = { vertical: 'middle', horizontal: 'center' }
                this_row.getCell(j).font = { size: 11, name: font }
            }
            i ++;
            current_row ++;
        }

        let last_row = entities_sheet.getRow(current_row);
        const entities_cols = [ { column: 'D', number: 4 }, { column: 'E', number: 5 }, { column: 'F', number: 6 } ];
        for (let j = 0; j <= 2; j++) {
            last_row.getCell(entities_cols[j].number).value = { formula: `SUM(${entities_cols[j].column}3:${entities_cols[j].column}${current_row - 1})` }
            last_row.getCell(entities_cols[j].number).numFmt = '#,##0;[Red]#,##0';
            last_row.getCell(entities_cols[j].number).alignment = { vertical: 'middle', horizontal: 'center' }
            last_row.getCell(entities_cols[j].number).font = { size: 11, name: font, bold: true }
        }

        //SET WIDTH FOR EACH COLUMN
        for (let j = 1; j <= 6; j++) {

            let dataMax = 0;
            for (let i = current_row - 1; i > 1; i--) {

                const 
                this_row = entities_sheet.getRow(i),
                this_cell = this_row.getCell(j);

                if (this_cell.value === null) continue;

                let columnLength = this_cell.value.length + 2;	
                if (columnLength > dataMax) dataMax = columnLength;

            }

            entities_sheet.getColumn(j).width = (dataMax < 5) ? 5 : dataMax; 
        }
        
        entities_sheet.getCell('A1').value = 'TOTALES POR PROVEEDOR';
        entities_sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' }
        entities_sheet.getCell('A1').font = { size: 18, name: font, bold: true }
        entities_sheet.mergeCells('A1:F1');
        entities_sheet.getRow(1).height = 20;

        /************** DO SHEET BY VARIETIES *************/
        const varieties_sheet = workbook.addWorksheet('VARIEDADES', {
            pageSetup:{
                paperSize: 9
            }
        });
        varieties_sheet.pageSetup.margins = {
            left: 0.2, right: 0.2,
            top: 0.5, bottom: 0.5,
            header: 0.1, footer: 0.1
        };

        const varieties_columns = [
            { header: 'Nº', key: 'line' },
            { header: 'VARIEDAD', key: 'variety' },
            { header: 'PACKING', key: 'packing' },
            { header: 'PARRON', key: 'parron' },
            { header: 'TOTAL', key: 'total' }
        ];

        for (let j = 0; j < varieties_columns.length; j++) {
            const header_row = varieties_sheet.getRow(2);
            header_row.getCell(j + 1).value = varieties_columns[j].header;
            header_row.getCell(j + 1).border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
            header_row.getCell(j + 1).alignment = { vertical: 'middle', horizontal: 'center' }
            header_row.getCell(j + 1).font = { size: 10, name: font, bold: true }
        }

        i = 1;
        current_row = 3;

        for (let variety of varieties) {

            const this_row = varieties_sheet.getRow(current_row);
            this_row.getCell(1).value = i;
            this_row.getCell(2).value = variety.name;
            this_row.getCell(3).value = variety.kilos.packing;
            this_row.getCell(4).value = variety.kilos.parron;
            this_row.getCell(5).value = { formula: `C${current_row} + D${current_row}` }

            this_row.getCell(3).numFmt = '#,##0;[Red]#,##0';
            this_row.getCell(4).numFmt = '#,##0;[Red]#,##0';
            this_row.getCell(5).numFmt = '#,##0;[Red]#,##0';

            for (let j = 1; j <= 5; j++) {
                this_row.getCell(j).border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                }
                this_row.getCell(j).alignment = { vertical: 'middle', horizontal: 'center' }
                this_row.getCell(j).font = { size: 11, name: font }
            }
            i ++;
            current_row ++;
        }

        last_row = varieties_sheet.getRow(current_row);
        const varieties_cols = [ { column: 'C', number: 3 }, { column: 'D', number: 4 }, { column: 'E', number: 5 } ];
        for (let j = 0; j <= 2; j++) {
            last_row.getCell(varieties_cols[j].number).value = { formula: `SUM(${varieties_cols[j].column}3:${varieties_cols[j].column}${current_row - 1})` }
            last_row.getCell(varieties_cols[j].number).numFmt = '#,##0;[Red]#,##0';
            last_row.getCell(varieties_cols[j].number).alignment = { vertical: 'middle', horizontal: 'center' }
            last_row.getCell(varieties_cols[j].number).font = { size: 11, name: font, bold: true }
        }

        varieties_sheet.getCell('A1').value = 'TOTALES POR VARIEDAD';
        varieties_sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' }
        varieties_sheet.getCell('A1').font = { size: 18, name: font, bold: true }
        varieties_sheet.mergeCells('A1:E1');
        varieties_sheet.getRow(1).height = 20;

        //SET WIDTH FOR EACH COLUMN
        for (let j = 1; j <= 6; j++) {

            let dataMax = 0;
            for (let i = current_row - 1; i > 1; i--) {

                const 
                this_row = varieties_sheet.getRow(i),
                this_cell = this_row.getCell(j);

                if (this_cell.value === null) continue;

                let columnLength = this_cell.value.length + 2;	
                if (columnLength > dataMax) dataMax = columnLength;

            }

            varieties_sheet.getColumn(j).width = (dataMax < 5) ? 5 : dataMax; 
        }

        await workbook.xlsx.writeFile('./files/TOTALES POR ENTIDAD.xlsx');
        //console.log(docs_array.length)
    }
    catch(e) { console.log(e) }
    finally { process.exit() }
})();