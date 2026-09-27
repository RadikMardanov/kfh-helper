/* ============================================
   КФХ-Помощник · Реквизиты сторон хозяйства (req.js)
   Хранит реквизиты хозяйства и автоподставляет их в поля
   генераторов документов (hr.html, legal.html).
   Подключать ПОСЛЕ dadata.js.
   ============================================ */
(function(){
"use strict";
var LS_KEY="kfh_farm_req_v1";

/* какие поля шаблонов считаем «своими реквизитами» */
var NAME_IDS=["e","seller","lessee","s1"];
var INN_IDS=["inn","seller_inn","e_inn"];
var OGRN_IDS=["ogrn"];
var ADDR_IDS=["addr_e","seller_addr","e_addr"];
var HEAD_IDS=["ep","seller_rep","e_rep"];
var SIGN_IDS=["seller_sign"];

var CSS=".req-card{margin:14px 0;padding:14px 16px;border:1px solid #e3e7ec;border-radius:12px;background:#fff}"
+".req-title{font-weight:800;font-size:15px;color:#0f172a}"
+".req-sub{font-size:13px;color:#6b7280;margin:4px 0 8px}"
+".req-view{font-size:14px;color:#374151;line-height:1.5;margin-bottom:10px}"
+".req-btns{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}"
+".req-btn{min-height:40px;padding:8px 14px;border-radius:10px;border:1px solid #d3d9df;background:#fff;font-size:14px;font-weight:700;cursor:pointer}"
+".req-btn:hover{background:#f3f4f6}"
+".req-btn-primary{background:#16a34a;border-color:#16a34a;color:#fff}"
+".req-lab{display:block;margin:8px 0 4px;font-size:13px;font-weight:700;color:#1f2937}"
+".req-in{width:100%;min-height:44px;padding:10px 12px;border:1px solid #d3d9df;border-radius:10px;font-size:16px}"
+".req-status{font-size:13px;color:#6b7280;margin-top:6px}";

function addCss(){var s=document.createElement("style");s.textContent=CSS;document.head.appendChild(s);}
function $(id){return document.getElementById(id);}
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function escAttr(s){return esc(s).replace(/"/g,"&quot;");}
function supabaseReady(){return typeof window.supabase!=="undefined"&&typeof window.SUPABASE_URL!=="undefined"&&typeof window.SUPABASE_ANON_KEY!=="undefined";}
function sb(){return window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);}
function localGet(){try{var o=JSON.parse(localStorage.getItem(LS_KEY));return o||{};}catch(e){return {};}}
function localSet(v){localStorage.setItem(LS_KEY,JSON.stringify(v));}

var data=localGet();

/* ---------- значение для поля шаблона ---------- */
function valFor(id){
  if(NAME_IDS.indexOf(id)>=0)return data.farm_name||"";
  if(INN_IDS.indexOf(id)>=0)return data.inn||"";
  if(OGRN_IDS.indexOf(id)>=0)return data.ogrn||"";
  if(ADDR_IDS.indexOf(id)>=0)return data.address||"";
  if(HEAD_IDS.indexOf(id)>=0)return data.head_name||"";
  if(SIGN_IDS.indexOf(id)>=0){
    if(!data.head_name)return "";
    return data.head_name+(data.head_post?", "+data.head_post:"");
  }
  return "";
}

/* ---------- подстановка в поля текущего шаблона ---------- */
function fillEmpty(force){
  var fields=(window.KFHInnGetFields&&window.KFHInnGetFields())||[];
  var set=window.KFHInnSet;
  if(typeof set!=="function")return 0;
  var n=0;
  (fields||[]).forEach(function(f){
    var id=String(f.id||"");
    var v=valFor(id);
    if(!v)return;
    var el=document.getElementById("f_"+id);
    if(el&&(force||el.value==="")){set(id,v);n++;}
  });
  return n;
}

/* ---------- разбор ответа DaData ---------- */
function norm(d){
  return {
    farm_name:(d.name&&(d.name.short_with_opf||d.name.full_with_opf))||"",
    inn:d.inn||"",
    ogrn:d.ogrn||"",
    address:(d.address&&d.address.value)||"",
    head_name:(d.management&&d.management.name)||"",
    head_post:(d.management&&d.management.post)||""
  };
}

function status(t){var el=$("req-status");if(el)el.textContent=t;}

/* ---------- интерфейс ---------- */
function renderBox(){
  var box=$("req-box");if(!box)return;
  var has=data.farm_name||data.inn;
  box.innerHTML='<div class="req-card">'
   +'<div class="req-title">🏡 Реквизиты сторон</div>'
   +'<div class="req-sub">Автоматически подставляются в документы: название хозяйства, ИНН, ОГРН, адрес, руководитель.</div>'
   +(has
     ? '<div class="req-view"><b>'+esc(data.farm_name)||"—"+'</b><br>'
       +'ИНН: '+(esc(data.inn)||"—")+' · ОГРН: '+(esc(data.ogrn)||"—")+'<br>'
       +'Адрес: '+(esc(data.address)||"—")+'<br>'
       +'Руководитель: '+(esc(data.head_name)||"—")+(data.head_post?" ("+esc(data.head_post)+")":"")+'</div>'
     : '<div class="req-view">Реквизиты ещё не заполнены. Заполните вручную или обновите по ИНН — и все документы будут формироваться с готовым блоком сторон.</div>')
   +'<div class="req-btns">'
   +'<button class="req-btn" id="req-edit" type="button">Изменить</button>'
   +'<button class="req-btn" id="req-dadata" type="button">Обновить по ИНН</button>'
   +'<button class="req-btn" id="req-apply" type="button">Подставить в документ</button>'
   +'</div>'
   +'<div id="req-edit-wrap" hidden>'
   +'<label class="req-lab">Название хозяйства</label><input class="req-in" id="rq-farm_name" value="'+escAttr(data.farm_name)+'">'
   +'<label class="req-lab">ИНН</label><input class="req-in" id="rq-inn" value="'+escAttr(data.inn)+'">'
   +'<label class="req-lab">ОГРН / ОГРНИП</label><input class="req-in" id="rq-ogrn" value="'+escAttr(data.ogrn)+'">'
   +'<label class="req-lab">Адрес</label><input class="req-in" id="rq-address" value="'+escAttr(data.address)+'">'
   +'<label class="req-lab">ФИО руководителя</label><input class="req-in" id="rq-head_name" value="'+escAttr(data.head_name)+'">'
   +'<label class="req-lab">Должность руководителя</label><input class="req-in" id="rq-head_post" value="'+escAttr(data.head_post)+'">'
   +'<div class="req-btns"><button class="req-btn req-btn-primary" id="req-save" type="button">Сохранить</button>'
   +'<button class="req-btn" id="req-cancel" type="button">Отмена</button></div>'
   +'</div>'
   +'<div class="req-status" id="req-status"></div>'
   +'</div>';
  wire();
}

function wire(){
  $("req-edit").addEventListener("click",function(){$("req-edit-wrap").hidden=!$("req-edit-wrap").hidden;});
  $("req-cancel").addEventListener("click",function(){renderBox();});
  $("req-apply").addEventListener("click",function(){
    var n=fillEmpty(true);
    status(n?("Подставлено в полей: "+n+". Проверьте и нажмите «Сформировать документ»."):"В этом шаблоне нет подходящих полей.");
  });
  $("req-dadata").addEventListener("click",function(){
    var inn=String(data.inn||"").replace(/\D/g,"");
    if(!/^\d{10}(\d{2})?$/.test(inn)){status("Сначала укажите ИНН хозяйства (кнопка «Изменить»), затем «Обновить по ИНН».");return;}
    if(!window.KFHInn){status("DaData не подключена (файл dadata.js).");return;}
    status("Обновляем…");
    window.KFHInn.lookup(inn).then(function(d){
      var nd=norm(d);
      for(var k in nd){if(nd[k])data[k]=nd[k];}
      localSet(data);renderBox();
      var n=fillEmpty(true);
      status("Реквизиты обновлены"+(n?(", подставлено в "+n+" полей"):"")+".");
    }).catch(function(e){status("⚠️ "+e.message);});
  });
  $("req-save").addEventListener("click",function(){
    data={
      farm_name:$("rq-farm_name").value.trim(),
      inn:$("rq-inn").value.trim(),
      ogrn:$("rq-ogrn").value.trim(),
      address:$("rq-address").value.trim(),
      head_name:$("rq-head_name").value.trim(),
      head_post:$("rq-head_post").value.trim()
    };
    localSet(data);
    saveProfiles();
    renderBox();
    var n=fillEmpty(true);
    status("Сохранено"+(n?(", подставлено в "+n+" полей документа"):"")+".");
  });
}

/* ---------- сохранение в аккаунт ---------- */
async function saveProfiles(){
  if(!supabaseReady())return;
  try{
    var s=await sb().auth.getSession();
    if(!s.data.session)return;
    var payload={
      farm_name:data.farm_name||null,inn:data.inn||null,ogrn:data.ogrn||null,
      address:data.address||null,head_name:data.head_name||null,head_post:data.head_post||null
    };
    var r=await sb().from("profiles").update(payload).eq("id",s.data.session.user.id).select();
    if((!r.data||!r.data.length)&&(data.farm_name||data.inn)){
      payload.id=s.data.session.user.id;
      payload.email=s.data.session.user.email;
      await sb().from("profiles").insert(payload);
    }
  }catch(e){}
}

/* ---------- загрузка: аккаунт → кэш → DaData ---------- */
async function load(){
  if(supabaseReady()){
    try{
      var s=await sb().auth.getSession();
      if(s.data.session){
        var r=await sb().from("profiles").select("farm_name,inn,ogrn,address,head_name,head_post").eq("id",s.data.session.user.id).maybeSingle();
        if(r.data){
          ["farm_name","inn","ogrn","address","head_name","head_post"].forEach(function(k){
            if(r.data[k])data[k]=r.data[k];
          });
        }
      }
    }catch(e){}
  }
  if(data.inn&&(!data.ogrn||!data.address||!data.head_name)&&window.KFHInn){
    try{
      var d=await window.KFHInn.lookup(String(data.inn).replace(/\D/g,""));
      var nd=norm(d);
      for(var k in nd){if(nd[k]&&!data[k])data[k]=nd[k];}
    }catch(e){}
  }
  localSet(data);
}

function init(){
  if(!document.getElementById("req-box"))return;
  addCss();renderBox();
  load().then(function(){renderBox();fillEmpty(false);});
}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",init);}else{init();}

window.KFHReq={get:function(){return data;},fillEmpty:fillEmpty,apply:function(){return fillEmpty(true);}};
})();