# Full Stack Web Application - ERP

## Frontend -> Plain CSS and Vanilla Javascript
## Backend -> NodeJs, MySQL Database, SocketIO, SerialPort, Puppeteer for webscraping and Express Handlebars

The project functions as a custom ERP developed exclusively for a holding company with 6 different companies working as a whole, and is used for controlling stock of plastic bin containers, amount of kilos of grapes received, amount of kilos of raisins produced, generating and exporting reports in Excel, etc., automating most of the administrative work and cutting down the amount of administrative personel by more than half.

It uses SerialPort to connect to a digital scale of up to 60.000 KG used for weighing trucks and SocketIO for transmitting the data to the user.

It also uses Puppeteer to generate electronic dispatch documents for trucks, according to the data stored in the database, in the Chilean Internal Revenue System's website (SII) and also access bank statements from all 6 of the companies, without the user having to know the credentials.
