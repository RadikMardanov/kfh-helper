/* ============================================
   КФХ-Помощник · Автозаполнение реквизитов по ИНН (DaData)
   Подключается ТОЛЬКО там, где нужно: legal.html и hr.html.
   ============================================ */
(function(){
"use strict";

/* ВСТАВЬТЕ СЮДА ваш ключ DaData (dadata.ru → профиль → «Ключи API») */
var DADATA_KEY = "56d8f9e839e42db1551451cf310b5c2cb065fab4";

var API="https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party";

var CSS=".inn-card{margin:14px 0;padding:14px 16px;border:1px dashed #cfd8d0;border-radius:12px;background:#fff}"
+".inn-title{font-weight:800;font-size:15px;margin-bottom:8px;color:#0f172a}"
+".inn-modes{display:flex;gap:16px;margin-bottom:10px;font-size:14px;color:#374151;flex-wrap:wrap}"
+".inn-modes label{display:flex;align-items:center;gap:6px;cursor:pointer}"
+".inn-row{display:flex;gap:10px;flex-wrap:wrap}"
+".inn-input{flex:1 1 220px;min-height:48px;padding:12px 14px;border:1px solid #d3d9df;border-radius:10px;font-size:17px}"
+".inn-btn{min-height:48px;padding:10px 18px;border-radius:12px;border:1px solid #d3d9df;background:#fff;font-size:16px;font-weight:700;cursor:pointer}"
+".inn-btn:hover{background:#f3f4f6}"
+".inn-status{margin-top:10px;font-size:14px;color:#374151;line-height:1.5}";

function addCss(){var s=document.createElement("style");s.textContent=CSS;document.head.appendChild(s);}

/* ---------- запрос к DaData ---------- */
function lookup(inn){
  if(!DADATA_KEY){return Promise.reject(new Error("Не указан ключ DaData. Зарегистрируйтесь бесплатно на dadata.ru и вставьте ключ в файл dadata.js (строка DADATA_KEY)."));}
  return fetch(API,{
    method:"POST",mode:"cors",
    headers:{"Content-Type":"application/json","Accept":"application/json","Authorization":"Token "+DADATA_KEY},
    body:JSON.stringify({query:inn,count:1})
  })
  .then(function(r){
    if(r.status===401||r.status===403){throw new Error("DaData: ключ недействителен.");}
    if(r.status===429){throw new Error("DaData: исчерпан дневной лимит запросов.");}
    if(!r.ok){throw new Error("DaData: ошибка "+r.status+".");}
    return r.json();
  })
  .then(function(j){
    if(!j.suggestions||!j.suggestions.length){throw new Error("По этому ИНН ничего не найдено. Проверьте цифры или заполните реквизиты вручную.");}
    return j.suggestions[0].data;
  });
}
window.KFHInn={lookup:lookup};

/* ---------- разбор ответа ---------- */
function shortName(d){return (d.name&&(d.name.short_with_opf||d.name.full_with_opf))||"(название не распознано)";}
function director(d){return (d.management&&d.management.name)?(d.management.name+(d.management.post?", "+d.management.post:"")):"";}
function addr(d){return (d.address&&d.address.value)||"";}
function reqLine(d){
  var p=["ИНН "+(d.inn||"—")];
  if(d.ogrn)p.push("ОГРН "+d.ogrn);
  if(addr(d))p.push("адрес: "+addr(d));
  var dir=director(d);if(dir)p.push("руководитель: "+dir);
  return p.join("; ");
}

/* ---------- вставка в поля текущего шаблона ---------- */
function insertFields(mode,d){
  var fields=(typeof window.KFHInnGetFields==="function")?window.KFHInnGetFields():[];
  var set=window.KFHInnSet;
  if(typeof set!=="function")return [];
  var done=[];
  (fields||[]).forEach(function(f){
    var id=String(f.id||"");var v=null;
    if(mode==="own"){
      if(id==="e"||id==="seller"){v=shortName(d);}
      else if(id==="inn"||id==="seller_inn"){v=d.inn||"";}
      else if(id==="ogrn"){v=d.ogrn||"";}
      else if(id==="addr_e"||id==="seller_addr"){v=addr(d);}
    }else{
      if(id==="buyer"||id==="to"||id==="s2"){v=shortName(d);}
      else if(id==="buyer_inn"){v=d.inn||"";}
      else if(id==="buyer_addr"){v=addr(d);}
      else if(id==="buyer_sign"){v=director(d)||null;}
    }
    if(v){set(id,v);done.push(f.label||id);}
  });
  return done;
}

/* ---------- виджет ---------- */
function build(){
  var box=document.getElementById("inn-box");
  if(!box)return;
  box.innerHTML='<div class="inn-card"><div class="inn-title">🔎 Автозаполнение реквизитов по ИНН</div>'
   +'<div class="inn-modes"><label><input type="radio" name="inn-mode" value="own" checked> Моё хозяйство</label>'
   +'<label><input type="radio" name="inn-mode" value="party"> Контрагент (покупатель, подрядчик)</label></div>'
   +'<div class="inn-row"><input class="inn-input" id="inn-input" inputmode="numeric" placeholder="ИНН 10 или 12 цифр">'
   +'<button class="inn-btn" id="inn-btn" type="button">Подтянуть</button></div>'
   +'<div class="inn-status" id="inn-status">Данные подставятся в поля документа ниже — проверьте их перед формированием.</div>'
   +'</div>';
  document.getElementById("inn-btn").addEventListener("click",function(){
    var st=document.getElementById("inn-status");
    var inn=(document.getElementById("inn-input").value||"").replace(/\D/g,"");
    if(!/^\d{10}(\d{2})?$/.test(inn)){st.textContent="⚠️ Введите ИНН из 10 или 12 цифр.";return;}
    var mode=(document.querySelector('input[name="inn-mode"]:checked')||{}).value||"own";
    st.textContent="Ищем…";
    lookup(inn).then(function(d){
      var done=insertFields(mode,d);
      st.innerHTML="✅ <b>"+shortName(d)+"</b><br>"
        +(done.length?("Подставлено в поля: "+done.join(", ")+"."):"В этом шаблоне нет полей для автоподстановки.")
        +"<br>Реквизиты: "+reqLine(d);
    }).catch(function(e){st.textContent="⚠️ "+e.message;});
  });
}

function init(){addCss();build();}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",init);}else{init();}
})();