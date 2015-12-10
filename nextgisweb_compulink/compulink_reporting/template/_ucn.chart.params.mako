<script>
    var params = {
        dynamicsVols: {
            dataKeys: ['dynamics', 'Vols'],
            chartSettings: {
                title: 'Динамика строительства ВОЛС'
            },
            plotSettings: {
                type: 'Default'
            },
            seriesSettings: {
                plan: {stroke: 'blue'},
                fact: {stroke: 'red'}
            }
        },
        planVols: {
            dataKeys: ['plan', 'Vols'],
            chartSettings: {
                title: 'Текущее исполнение плана строительства ВОЛС'
            },
            plotSettings: {
                type: 'ClusteredColumns',
                gap: 5,
                maxBarSize: 20
            },
            seriesSettings: {
                plan: {stroke: '#3333ff', fill: '#6699ff'},
                fact: {stroke: '#ff0000', fill: '#ff6666'}
            }
        },
        dynamicsTd: {
            dataKeys: ['dynamics', 'Td'],
            chartSettings: {
                title: 'Динамика строительства ТД'
            },
            plotSettings: {
                type: 'Default'
            },
            seriesSettings: {
                plan: {stroke: 'blue'},
                fact: {stroke: 'red'}
            }
        },
        planTd: {
            dataKeys: ['plan', 'Td'],
            chartSettings: {
                title: 'Текущее исполнение плана строительства ТД'
            },
            plotSettings: {
                type: 'ClusteredColumns',
                gap: 5,
                maxBarSize: 20
            },
            seriesSettings: {
                plan: {stroke: '#3333ff', fill: '#6699ff'},
                fact: {stroke: '#ff0000', fill: '#ff6666'}
            }
        }
    };
</script>