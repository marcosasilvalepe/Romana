const { SerialPort } = require('serialport')

const { ReadlineParser } = require('@serialport/parser-readline')
const port = new SerialPort({
  path: 'COM4',
  parser: new ReadlineParser('\n'),
  baudRate: 9600,
  autoOpen: false,
  dataBits: 7
}).setEncoding('utf8');

port.open(function (err) {
    if (err) {
        return console.log('Error opening port: ', err.message)
    }

    console.log('port opened')

    port.on('data', data => {
        
        const 
        buffer = Buffer.from(data).toString().trim(),
        weight = parseInt(buffer.substring(3, 10));

        console.log(buffer, `   ----   Weight is ${weight}`)

    })

})