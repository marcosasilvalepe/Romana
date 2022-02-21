function delay(delayValue) { return new Promise(resolve => setTimeout(resolve, delayValue)); }

(async function() {
    const p = document.querySelector('.message p:last-child');
    for (let i = 6; i > 0; i--) {
        p.innerText = `Redirigiendo a login en ${i} segundos`;
        await delay(1000);
    }
    window.location = '/';
})();