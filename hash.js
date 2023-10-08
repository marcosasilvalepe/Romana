const bcrypt = require('bcryptjs/dist/bcrypt');

const str = '123456';

(async () => {

    const hash = await bcrypt.hash(str, 10);

    console.log(await bcrypt.compare(str, hash))


})();