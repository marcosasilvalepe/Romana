// Initialize the echarts instance based on the prepared dom

(async function() {

    const 
    get_grapes_total = await fetch('/grapes_data', { method: 'GET', headers: { "Cache-Control" : "no-cache" } }),
    response = await get_grapes_total.json();
    
    console.log(response)

    /*
    let total = 0;
    response.providers.forEach(provider => {
        total += provider.kilos
    })
    console.log(thousand_separator(total))
    */


    let option;
    if (screen_width > 1200) {
        document.getElementById('home-charts').style.width = '1300px';
        document.getElementById('home-charts').style.height = '600px';
        option = {
            title: {
                text: 'TEMPORADA 2019 - Recepcion Uva',
                textAlign: 'left',
                top: '2%',
                left: '30px',
                padding: [20, 0, 0, 0], 
                subtextStyle: {
                    fontSize: 15
                }
            },
            legend: {
                orient: 'vertical',
                top: '15%',
                left: '2%', 
                align: 'auto',
                height: '80%',
                itemWidth: 15,
                type: 'scroll'
            },
            tooltip: {},
            
            series: [
                {
                    type: 'pie',
                    radius: '80%',
                    center: ['65%', '50%'],
                    encode: {
                        itemName: 'product',
                        value: response.season.name
                    },
                    data: [],
                    color: ['#E60000', '#55DD00', '#F77000', '#003BDD', '#EEEE00', '#00EEDA', '#7100EE', '#EE009B', '#EE0000'],
                    //color: [],
                    itemStyle: {
                        borderWidth: 3,
                        borderColor: 'rgba(255, 255, 255, .25)',
                        shadowBlur: '200',
                        shadowColor: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            ]
        }
    }
    else if (screen_width < 450) {
        document.getElementById('home-charts').style.width = '100vw';
        document.getElementById('home-charts').style.height = 'calc(100vh - 65px)';
        option = {
            title: {
                text: 'TEMPORADA 2019 - Recepcion Uva',
                textAlign: 'left',
                top: '0',
                left: '10px',
                padding: [20, 0, 0, 0], 
                subtextStyle: {
                    fontSize: 15
                }
            },
            legend: {
                orient: 'horizontal',
                top: '12%',
                left: '2%', 
                align: 'auto',
                height: '20%',
                itemWidth: 15,
                type: 'scroll'
            },
            tooltip: {},
            
            series: [
                {
                    type: 'pie',
                    radius: '40%',
                    center: ['50%', '40%'],
                    encode: {
                        itemName: 'product',
                        value: response.season.name
                    },
                    data: [],
                    color: ['#E60000', '#55DD00', '#F77000', '#003BDD', '#EEEE00', '#00EEDA', '#7100EE', '#EE009B', '#EE0000'],
                    //color: [],
                    itemStyle: {
                        borderWidth: 3,
                        borderColor: 'rgba(255, 255, 255, .25)',
                        shadowBlur: '200',
                        shadowColor: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            ]
        };
    }

    const varieties = response.varieties.sortBy('kilos');

    let total_kilos = 0;
    varieties.forEach(product => { total_kilos += product.kilos });

    console.log(option)
    varieties.forEach(product => {
        option.series[0].data.push({name: product.name.replace('Uva', ''), value: product.kilos});
        //option.series[0].color.push(product.color);
    });
    
    option.title.subtext = `${thousand_separator(total_kilos)} KILOS`;
    const myChart = echarts.init(document.getElementById('home-charts'), 'dark');

    // Display the chart using the configuration items and data just specified.
    myChart.setOption(option);        
})();
