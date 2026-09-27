/* ============================================
   КФХ-Помощник · связка модулей через профиль (profile-link.js)
   Читает данные хозяйства из Supabase (или локально в демо)
   и предоставляет их всем страницам.
   Подключать ПОСЛЕ config.js и supabase, ДО основного скрипта страницы.
   ============================================ */
window.KFHProfile=(function(){
"use strict";
var PROFILE_KEY="kfh_helper_demo_profile_v1";
var cache=null;

function supabaseReady(){return typeof window.supabase!=="undefined"&&typeof window.SUPABASE_URL!=="undefined"&&typeof window.SUPABASE_ANON_KEY!=="undefined";}
function sb(){return window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);}

/* Возвращает профиль хозяйства (кэширует) */
async function get(){
  if(cache)return cache;
  var p=null;
  if(supabaseReady()){
    try{
      var s=await sb().auth.getSession();
      if(s.data&&s.data.session){
        var r=await sb().from("profiles").select("*").eq("id",s.data.session.user.id).maybeSingle();
        if(r.data)p=r.data;
      }
    }catch(e){}
  }
  if(!p){
    try{p=JSON.parse(localStorage.getItem(PROFILE_KEY));}catch(e){p=null;}
  }
  cache=p;
  return p;
}

/* Подставляет значения из профиля в поля по маппингу {id_поля: поле_профиля}.
   Заполняет только ПУСТЫЕ поля, чтобы не затирать ввод пользователя. */
async function applyToInputs(map){
  var p=await get();
  if(!p)return p;
  for(var id in map){
    var el=document.getElementById(id);
    if(!el)continue;
    var key=map[id];
    var val=p[key];
    if(val===undefined||val===null||String(val).trim()==="")continue;
    if(el.type==="checkbox"){ if(!el.checked)el.checked=!!val; }
    else if(el.value===""||el.value==="0"){ el.value=val; }
  }
  return p;
}

/* Короткая сводка хозяйства: «Название · Регион · Тип» */
function summary(p){
  if(!p)return "";
  var parts=[];
  if(p.farm_name)parts.push(p.farm_name);
  if(p.region)parts.push(p.region);
  if(p.farm_type)parts.push(p.farm_type);
  return parts.join(" · ");
}

return {get:get,applyToInputs:applyToInputs,summary:summary};
})();