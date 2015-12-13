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
                plan: {name: 'План', stroke: '#5692c9'},
                fact: {name: 'Факт', stroke: '#ed7d31'}
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
                plan: {name: 'План', stroke: '#5692c9', fill: '#5692c9'},
                fact: {name: 'Факт', stroke: '#ed7d31', fill: '#ed7d31'}
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
                plan: {name: 'План', stroke: '#5692c9'},
                fact: {name: 'Факт', stroke: '#ed7d31'}
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
                plan: {name: 'План', stroke: '#5692c9', fill: '#5692c9'},
                fact: {name: 'Факт', stroke: '#ed7d31', fill: '#ed7d31'}
            }
        }
    };
</script>