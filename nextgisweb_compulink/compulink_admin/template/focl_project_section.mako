<span>Наименование</span> <input type="text" placeholder="${obj}"> <br/><br/>
<a href="${request.route_url('resource.create', id=obj.id, _query=dict(cls='focl_struct'))}">
    Создать Структуру ВОЛС
</a>
<br/><br/>
<a href="${request.route_url('resource.create', id=obj.id, _query=dict(cls='situation_plan'))}">
    Создать Ситуационный план
</a>
