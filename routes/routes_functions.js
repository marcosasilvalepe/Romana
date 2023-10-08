const jwt = require('jsonwebtoken');
const fs = require('fs');

const jwt_auth_secret = process.env.ACCESS_TOKEN_SECRET;
const jwt_refresh_secret = process.env.REFRESH_TOKEN_SECRET;
const socket_domain = (process.env.NODE_ENV === 'development') ? 'https://localhost:3100/socket.io/socket.io.js' : 'https://192.168.1.90:3100/socket.io/socket.io.js';

const delay = ms => { return new Promise(resolve => setTimeout(resolve, ms)) }

const get_cookie = (request, cookie) => {
    if (!request.headers.cookie) return undefined;
    
    const cookie_array = request.headers.cookie.split(';');
    for (let i = 0; i < cookie_array.length; i++) {
        const c = cookie_array[i].split('=');
        if (c[0].trim() === cookie) return c[1].trim();
    }
    return undefined;
}

const userMiddleware = {
    isLoggedIn: (req, res, next) => {
        try {

            const 
            token = get_cookie(req, 'jwt'),
            decoded = jwt.verify(token, jwt_refresh_secret);

            req.userData = decoded;
            next();

        } catch (err) { return res.status(401).render('401') }
    }
}

const todays_date = () => {
    const 
    now = new Date(),
    year = now.getFullYear(),
    month = (now.getMonth() + 1 < 10) ? '0' + (now.getMonth() + 1) : now.getMonth() + 1,
    day = (now.getDate() < 10) ? '0' + now.getDate() : now.getDate(),
    hour = now.toLocaleString('es-CL').split(' ')[1];
    return year + '-' + month + '-' + day + ' ' + hour;
}

const validate_rut = rut => {
    return new Promise((resolve, reject) => {
        try {
            const
            new_rut = rut.replace(/[^0-9kK]/gm, ''),
            digits = new_rut.substring(0, new_rut.length - 1),
            digits_array = digits.split(''),
            dv = new_rut.substring(new_rut.length - 1).toLowerCase();
            
            let m = 2, sum = 0;
        
            for (let i = digits_array.length - 1; i >= 0; i--) {
                sum += m * parseInt(digits_array[i]);
                m++;
                if (m===8) m = 2; 
            }
        
            let new_dv = (11 - (sum % 11));
        
            if (new_dv === 11) new_dv = '0';
            else if (new_dv === 10) new_dv = 'k';
            else new_dv = new_dv.toString();
        
            if (dv === new_dv) return resolve(true);
            return resolve(false);        
        } catch(e) { return reject() }
    })
}

const format_rut = rut => {
    return new Promise(resolve => {

        rut = rut.replace(/[^0-9kK]/gm, '');

        let first_digits, middle_digits, last_digits, dv;
        if (rut.length < 9) {
            first_digits = rut.substring(0, 1);
            middle_digits = rut.substring(1, 4);
            last_digits = rut.substring(4,7);
        }
        else {
            first_digits = rut.substring(0, 2)
            middle_digits = rut.substring(2, 5);
            last_digits = rut.substring(5, 8);
        }
        dv = rut.substring(rut.length - 1).toUpperCase();
        return resolve(`${first_digits}.${middle_digits}.${last_digits}-${dv}`);    
    })
}

const format_date = date => {
    let
    current_date = date.getDate(),
    current_month = date.getMonth() + 1,
    current_year = date.getFullYear(),
    current_hrs = date.getHours(),
    current_mins = date.getMinutes(),
    current_secs = date.getSeconds();

    // Add 0 before date, month, hrs, mins or secs if they are less than 0
    current_date = current_date < 10 ? '0' + current_date : current_date;
    current_month = current_month < 10 ? '0' + current_month : current_month;
    current_hrs = current_hrs < 10 ? '0' + current_hrs : current_hrs;
    current_mins = current_mins < 10 ? '0' + current_mins : current_mins;
    current_secs = current_secs < 10 ? '0' + current_secs : current_secs;

    return current_year + '-' + current_month + '-' + current_date + ' ' + current_hrs + ':' + current_mins + ':' + current_secs;
}

const validate_date = date => {
	try {
		new Date(date).toISOString();
		return true
	} catch(e) { return false }
}

const format_html_date = date => {
    const
    year = date.getFullYear(),
    month = (date.getMonth() + 1 < 10) ? '0' + (date.getMonth() + 1) : date.getMonth() + 1,
    day = (date.getDate() < 10) ? '0' + (date.getDate()) : date.getDate();
    return year + '-' + month + '-' + day;
}

const set_to_monday = date => {
    let new_date = date;
    const day = new_date.getDay() || 7;
    if (day !== 1) new_date.setHours(-24 * (day - 1));
    return new_date;
}

const error_handler = msg => {
    return new Promise((resolve, reject) => {
        const now = new Date().toLocaleString('es-CL');
        fs.appendFile('error_log.txt', now + ' -> ' + msg + '\r\n\r\n', error => {
            if (error) return reject(error);
            return resolve();
        })
    })
}

module.exports = { delay, get_cookie, userMiddleware, todays_date, validate_rut, format_rut, format_date, validate_date, format_html_date, set_to_monday, error_handler, jwt_auth_secret, jwt_refresh_secret, socket_domain }