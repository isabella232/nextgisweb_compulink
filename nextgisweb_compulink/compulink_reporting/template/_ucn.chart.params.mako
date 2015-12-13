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
            axisSettings: {
                x: {fixLower: 'minor', fixUpper: 'minor', natural: true},
                y: {title: 'Проложенные ВОЛС, км', vertical: true, fixLower: 'major', fixUpper: 'major', includeZero: true}
            },
            seriesSettings: {
                plan: {name: 'План', stroke: 'blue'},
                fact: {name: 'Факт', stroke: 'red'}
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
            axisSettings: {
                x: {fixLower: 'minor', fixUpper: 'minor', natural: true},
                y: {title: 'Проложенные ВОЛС, км', vertical: true, fixLower: 'major', fixUpper: 'major', includeZero: true}
            },
            seriesSettings: {
                plan: {name: 'План', stroke: '#3333ff', fill: '#6699ff'},
                fact: {name: 'Факт', stroke: '#ff0000', fill: '#ff6666'}
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
            axisSettings: {
                x: {fixLower: 'minor', fixUpper: 'minor', natural: true},
                y: {title: 'Смонтированные ТД, шт', vertical: true, fixLower: 'major', fixUpper: 'major', includeZero: true}
            },
            seriesSettings: {
                plan: {name: 'План', stroke: 'blue'},
                fact: {name: 'Факт', stroke: 'red'}
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
            axisSettings: {
                x: {fixLower: 'minor', fixUpper: 'minor', natural: true},
                y: {title: 'Смонтированные ТД, шт', vertical: true, fixLower: 'major', fixUpper: 'major', includeZero: true}
            },
            seriesSettings: {
                plan: {name: 'План', stroke: '#3333ff', fill: '#6699ff'},
                fact: {name: 'Факт', stroke: '#ff0000', fill: '#ff6666'}
            }
        }
    };
</script>