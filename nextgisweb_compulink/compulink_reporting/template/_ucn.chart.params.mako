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
                x: {
                    fixLower: 'minor',
                    fixUpper: 'minor',
                    majorLabels: true,
                    microTicks: false,
                    minorLabels: false,
                    minorTicks: false,
                    natural: false,
                    majorTickStep: 31,
                    rotation: -30,
                    includeZero: true
                },
                y: {
                    title: 'Проложено ВОЛС, км',
                    vertical: true,
                    fixLower: 'major',
                    fixUpper: 'major',
                    includeZero: true
                }
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
                x: {
                    fixLower: 'minor',
                    fixUpper: 'minor',
                    majorLabels: true,
                    microTicks: false,
                    minorLabels: false,
                    minorTicks: false,
                    natural: false,
                    majorTickStep: 1,
                    rotation: -30,
                    includeZero: false
                },
                y: {
                    title: 'Проложено ВОЛС, км',
                    vertical: true,
                    fixLower: 'major',
                    fixUpper: 'major',
                    includeZero: true
                }
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
                x: {
                    fixLower: 'minor',
                    fixUpper: 'minor',
                    majorLabels: true,
                    microTicks: false,
                    minorLabels: false,
                    minorTicks: false,
                    natural: false,
                    majorTickStep: 31,
                    rotation: -30,
                    includeZero: true
                },
                y: {
                    title: 'Смонтировано ТД, шт',
                    vertical: true,
                    fixLower: 'major',
                    fixUpper: 'major',
                    includeZero: true
                }
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
                x: {
                    fixLower: 'minor',
                    fixUpper: 'minor',
                    majorLabels: true,
                    microTicks: false,
                    minorLabels: false,
                    minorTicks: false,
                    natural: false,
                    majorTickStep: 1,
                    rotation: -30,
                    includeZero: false
                },
                y: {
                    title: 'Смонтировано ТД, шт',
                    vertical: true,
                    fixLower: 'major',
                    fixUpper: 'major',
                    includeZero: true
                }
            },
            seriesSettings: {
                plan: {name: 'План', stroke: '#5692c9', fill: '#5692c9'},
                fact: {name: 'Факт', stroke: '#ed7d31', fill: '#ed7d31'}
            }
        }
    };
</script>