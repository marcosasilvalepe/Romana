"use strict";

(async function() {

    const 
    get_companies = await fetch('/companies_get_internal_entities', {
        method: 'GET',
        headers: {
            "Authorization" : token.value
        }
    }),
    response = await get_companies.json();

    console.log(response)

    if (response.error !== undefined) throw response.error;
    if (!response.success) throw 'Success response from server is false.';

    const 
    legend_data = [],
    data_set = [];

    for (const company of response.companies) {
        if (company.receptions > 0) {
            legend_data.push(company.short_name.toUpperCase());
            data_set.push({
                value: parseInt(company.receptions),
                name: company.short_name.toUpperCase()
            })    
        }
    }
    
    const chartDom = document.querySelector('#companies-charts > div');
    const myChart = echarts.init(chartDom, 'dark');
    let option;

    option = {
    tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
        data: legend_data
    },
    series: [
        {
            name: 'Access From',
            type: 'pie',
            selectedMode: 'single',
            radius: [0, '30%'],
            label: {
                position: 'inner',
                fontSize: 14
        },
        labelLine: { show: false },
        data: 
            [
                { value: 1548, name: 'Search Engine' },
                { value: 775, name: 'Direct' },
                { value: 679, name: 'Marketing', selected: true }
            ]
        },
        {
            name: 'RECEPCIONES',
            type: 'pie',
            radius: ['45%', '60%'],
            labelLine: {
                length: 30
            },
            label: {
                /*formatter: '{a|{a}}{abg|}\n{hr|}\n  {b|{b}：}{c}  {per|{d}%}  ',*/
                formatter: '{b|{b}}\n{hr|}\n{per|{d}%}\n{c}',
                backgroundColor: '#F6F8FC',
                borderColor: '#8C8D8E',
                borderWidth: 1,
                borderRadius: 4,
                triggerEvent: true,
                rich: {
                    a: {
                        color: '#6E7079',
                        lineHeight: 22,
                        align: 'left'
                    },
                    hr: {
                        borderColor: '#8C8D8E',
                        width: '100%',
                        borderWidth: 1,
                        height: 0
                    },
                    b: {
                        color: '#4C5058',
                        fontSize: 12,
                        fontWeight: 'bold',
                        lineHeight: 33,
                        align: 'center',
                        padding: [2, 12]
                    },
                    c: {
                        fontSize: 12,
                        fontWeight: 'bold',
                        align: 'center',
                        padding: [3, 12]
                    },
                    per: {
                        color: '#fff',
                        backgroundColor: '#4C5058',
                        padding: [3, 4],
                        borderRadius: 4,
                        align: 'center'
                    }
                }
            },
            data: data_set
        }
    ]
    };

    option && myChart.setOption(option);

    myChart.on('click', params => {
        console.log(params)
    })
       
})();
