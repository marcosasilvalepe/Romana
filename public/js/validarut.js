"use strict";

const
rut = '6.916.471-4',
new_rut = rut.replace(/[^0-9a-zA-Z]/gm, ''),
digits = new_rut.substring(0, new_rut.length - 1),
dv = new_rut.substring(new_rut.length - 1).toLowerCase(),
digits_array = digits.split('');

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

if (dv === new_dv) console.log("ok")
else console.log("error")
