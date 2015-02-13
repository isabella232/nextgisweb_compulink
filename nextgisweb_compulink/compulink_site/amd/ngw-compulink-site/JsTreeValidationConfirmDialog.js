define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/topic',
    'ngw-compulink-site/ConfirmDialog'
], function (declare, array, lang, topic, ConfirmDialog) {
    if (!_instance) {
        var _instance = new ConfirmDialog({
            title: 'Внимание!',
            message: 'Выбрано большое количество слоев!<br/>загрузка дополнительных может замедлить работу приложения.<br/>Можете продолжить или выключить ненужные.<br/><br/>Загрузить новые слои?',
            buttonOk: 'Да',
            buttonCancel: 'Нет'
        });
    }
    return _instance;
});