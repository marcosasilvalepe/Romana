"use strict";

//const puppeteer = require('puppeteer');
const { executablePath } = require('puppeteer');

//FOR BYPASSING ROBOT PROTECTION ON BANK SITE
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin())

const conn = require('../config/db');

/*
const mysql = require('mysql');
const conn = mysql.createConnection({ 
    host: "172.27.55.204",
    port: 3306,
    user: "marcos", 
    password: "M@r$l1985_:)", 
    database: "romana" 
});
*/

const delay = ms => { return new Promise(resolve => { setTimeout(resolve, ms) }) }

const bank_url = 'https://login.portalempresas.bancochile.cl/bancochile-web/empresa/login/index.html#/login';

const global = {};

const get_credentials = id => {
    return new Promise((resolve, reject) => {
        try {
            conn.query(`
                SELECT id, rut, bank_user, bank_password
                FROM internal_entities
                WHERE id=${parseInt(id)};
            `, (error, results, fields) => {
                if (error || results.length === 0) return reject(error);
                return resolve({
                    id: results[0].id,
                    rut: results[0].rut,
                    user: results[0].bank_user,
                    password: results[0].bank_password
                })
            })
        } catch(e) { return reject(e) }
    })
}

const save_balance = () => {
    return new Promise((resolve, reject) => {
        conn.query(`
            UPDATE internal_entities
            SET 
                countable_balance=${global.balance.countable},
                available_balance=${global.balance.available},
                credit_balance=${global.balance.credit},
                last_balance_update=NOW()
            WHERE id=${global.credentials.id};
        `, (error, results, fields) => {
            if (error) return reject(error);
            return resolve();
        })
    })
} 

const go_to_bank_site = io => {
    return new Promise(async (resolve, reject) => {
        let browser, page;
        try {

            browser = await puppeteer.launch({ 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                executablePath: executablePath()
            });
            page = await browser.newPage();

            //page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Safari/537.36');
            await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36");

            await page.goto(bank_url);

            await page.evaluate(async () => {
                return await new Promise(resolve => {
                    window.focus()
                    return resolve();
                })
            });

            io.sockets.emit('bank balance - updating balance', { id: global.credentials.id, progress: 10 });

            await page.waitForSelector('#iduserName');

            await page.focus('#iduserName');
            await page.keyboard.type(global.credentials.user);

            await page.focus('input[name="password"][type="password"][ng-keydown="vm.limpiarPassword()"]');
            await page.keyboard.type(global.credentials.password);

            await page.click('#idIngresar');

            io.sockets.emit('bank balance - updating balance', { id: global.credentials.id, progress: 20 });

            //LOGGED IN
            await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
            await page.waitForSelector('div.listado-empresas ul li');

            //SELECT COMPANY BASED ON RUT
            await page.evaluate(async global => {
                return await new Promise(async resolve => {

                    const delay = ms => { return new Promise(resolve => { setTimeout(resolve, ms) }) }

                    let company_found = false, target_span;
                    while (!company_found) {
    
                        const rut_spans = document.querySelectorAll('.listado-empresas ul li span.empresa span.rut');
                        if (rut_spans.length < 3) await delay(50);
                        else {
                            for (let span of rut_spans) {
                                if (span.innerText === global.credentials.rut) {
                                    target_span = span;
                                    company_found = true;
                                    break;
                                }
                            }    
                        }
                    }
    
                    target_span.parentElement.click();
                    return resolve();

                })
            }, global);

            io.sockets.emit('bank balance - updating balance', { id: global.credentials.id, progress: 30 });

            console.log('waiting for navigation')

            //WAIT FOR PAGE TO LOAD CONTENT
            await page.waitForNavigation({ 
                waitUntil: 'networkidle2', 
                timeout: 5000 
            });

            console.log('done waiting for navigation');

            await page.waitForSelector('a.ng-binding[ui-sref="headerCuentas.movimientosEmpresa"]');
            console.log('done waiting for selector')

            await page.waitForSelector('a.ng-binding[ui-sref="headerCuentas.movimientosEmpresa"]');

            io.sockets.emit('bank balance - updating balance', { id: global.credentials.id, progress: 40 });

            await page.evaluate(async global => {
                return await new Promise(async resolve => {

                    const delay = ms => { return new Promise(resolve => { setTimeout(resolve, ms) }) }
                    
                    const div_to_wait = (global.credentials.id === '78.447.760-6') ? 'a.ng-binding[ui-sref="headerCuentas.movimientosEmpresa"]' : '#printThis';

                    let div_visible = false;
                    while (!div_visible) {
    
                        const div = document.querySelector('a.ng-binding[ui-sref="headerCuentas.movimientosEmpresa"]');
                        div.click();

                        if (!!document.querySelector(div_to_wait) === false) await delay(100);
                        else div_visible = true
                    }    
                    return resolve();
                })
            }, global);
            console.log('clicked');

            io.sockets.emit('bank balance - updating balance', { id: global.credentials.id, progress: 50 });

            //SELECT CLP ACCOUNT ON LEPEFER
            if (global.credentials.rut === '78.447.760-6') {

                console.log('inside');

                await page.waitForSelector('label.bch-custom-check.radiobutton input[type="radio"][name="cuenta"][ng-change="seleccionaCuenta()"]');

                console.log('radio btn found')

                io.sockets.emit('bank balance - updating balance', { id: global.credentials.id, progress: 60 });

                await page.evaluate(async () => {
                    return await new Promise(async resolve => {

                        const delay = ms => { return new Promise(resolve => { setTimeout(resolve, ms) }) }

                        while (!document.body.classList.contains('modal-open')) await delay(50);
    
                        const radio_btn = document.querySelector('label.bch-custom-check.radiobutton input[type="radio"][name="cuenta"][ng-change="seleccionaCuenta()"]');
    
                        let allowed = false;
    
                        while (!allowed) {

                            const accept_btn = document.querySelector('.modal-content button.success[ng-click="ok()"]');
                            radio_btn.click();
                            
                            if (accept_btn.hasAttribute('disabled')) await delay(100);
                            else allowed = true;
    
                        }
                        
                        return resolve();
                    })

                });

                console.log('radio btn clicked');

                io.sockets.emit('bank balance - updating balance', { id: global.credentials.id, progress: 70 });
                
                //CLICK ON ACCEPT BTN AFTER IT'S ENABLED
                await page.evaluate(async () => {
                    return await new Promise(async resolve => {
                        const delay = ms => { return new Promise(resolve => { setTimeout(resolve, ms) }) }

                        let enabled = false;
    
                        while (!enabled) {
                            const accept_btn = document.querySelector('button.btn.success[ng-click="ok()"]')
                            if (accept_btn.hasAttribute('disabled')) await delay(10);
                            else {
                                enabled = true;
                                accept_btn.click();
                            }
                        }
                        return resolve()
                    })

                });
            }

            io.sockets.emit('bank balance - updating balance', { id: global.credentials.id, progress: 80 });

            await page.waitForSelector('div.saldo-disponible h5.text-info.ng-binding');

            console.log('getting balances')

            global.balance = await page.evaluate(async global => {
                return await new Promise(async resolve => {

                    const delay = ms => { return new Promise(resolve => { setTimeout(resolve, ms) }) }

                    const available_div = document.querySelector('div.saldo-disponible h5.text-info.ng-binding');
                    while (!!available_div === false) await delay(10);
                    const available_balance = parseInt(available_div.innerText.replace(/\D/gm, ''));

                    const countable_div = document.querySelector('div.caja-cont-saldo h6.valor.text-info.ng-binding');
                    while (!!countable_div === false) await delay(10);
                    const countable_balance = parseInt(countable_div.innerText.replace(/\D/gm, ''));


                    let credit_balance = 0;

                    //RODADOS DOESN'T HAVE A CREDIT LINE
                    if (global.credentials.rut !== '77.682.621-9') {
                        const credit_div = available_div.parentElement.parentElement.parentElement.nextElementSibling.firstElementChild.lastElementChild.querySelector('h5:last-child');
                        while (!!credit_div === false) await delay(10);
                        credit_balance = parseInt(credit_div.innerText.replace(/\D/gm, ''));
                    }

                    return resolve({
                        available: available_balance,
                        countable: countable_balance,
                        credit: credit_balance
                    });
                })
            }, global)

            console.log('finished getting balances');
        
            io.sockets.emit('bank balance - updating balance', { id: global.credentials.id, progress: 90 });

            await save_balance();
            
            await page.screenshot({
                path: `./bank_balance/${global.credentials.id}_bank_balance.png`,
                fullPage: true,
                type: 'png'
            });

            console.log('finished!!!');

            await page.close();
            await browser.close();
            
            return resolve();
        } catch(e) { 

            if (browser !== undefined) await browser.close();
            return reject(e)
        }
    })
}

const get_bank_balance = (company_id, io) => {
    return new Promise(async (resolve, reject) => {
        try {

            global.credentials = await get_credentials(company_id);

            console.log(global)
            await go_to_bank_site(io);
            
            return resolve({
                balance: {
                    available: global.balance.available,
                    countable: global.balance.countable,
                    credit: global.balance.credit
                },
                id: global.credentials.id,
                last_update: new Date()
            });

        } catch(e) { return reject(e) }
    })
}

module.exports = { get_bank_balance }