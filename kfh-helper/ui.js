/* ============================================
   КФХ-Помощник · общий фундамент (ui.js)
   Нижнее меню, ЕДИНАЯ шторка «Ещё» (плитки), бейджи,
   логотип→главная, вкладки сервисов, счётчики архива и календаря,
   прокрутка лент мышью на десктопе + видимый тонкий скроллбар.
   ============================================ */
(function(){
"use strict";
var KFH=window.KFH=window.KFH||{};

KFH.supabaseReady=function(){return typeof window.supabase!=="undefined"&&typeof window.SUPABASE_URL!=="undefined"&&typeof window.SUPABASE_ANON_KEY!=="undefined";};
KFH.sb=function(){return window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);};
KFH.esc=function(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");};
KFH.todayISO=function(){return new Date().toISOString().split("T")[0];};
KFH.localArr=function(k){try{var a=JSON.parse(localStorage.getItem(k));return Array.isArray(a)?a:[];}catch(e){return[];}}
KFH.fmtDate=function(iso){if(!iso)return "без даты";var d=new Date(iso+"T00:00:00");if(isNaN(d))return "без даты";return d.toLocaleDateString("ru-RU");};
KFH.daysUntil=function(iso){return Math.round((new Date(iso+"T00:00:00")-new Date(KFH.todayISO()+"T00:00:00"))/86400000);};

KFH.setBadge=function(key,n){
  var el=document.querySelector('[data-badge="'+key+'"]');
  if(!el)return;
  if(n>0){el.hidden=false;el.textContent=n>9?"9+":String(n);}else{el.hidden=true;}
};

/* ---------- глобальные стили лент: скроллбар на десктопе + курсор ---------- */
(function injectRibbonStyles(){
  var st=document.createElement("style");
  st.textContent=
  "@media (min-width:900px){"+
    ".chip-row,.fields-slider{scrollbar-width:thin;scrollbar-color:#c3ccd4 transparent}"+
    ".chip-row::-webkit-scrollbar,.fields-slider::-webkit-scrollbar{display:block;height:6px}"+
    ".chip-row::-webkit-scrollbar-thumb,.fields-slider::-webkit-scrollbar-thumb{background:#c3ccd4;border-radius:3px}"+
    ".chip-row::-webkit-scrollbar-track,.fields-slider::-webkit-scrollbar-track{background:transparent}"+
  "}"+
  "@media (pointer:fine){"+
    ".chip-row,.fields-slider{cursor:grab}"+
    ".chip-row.dragging,.fields-slider.dragging{cursor:grabbing;user-select:none}"+
  "}";
  document.head.appendChild(st);
})();

/* ---------- прокрутка лент перетаскиванием мышью (десктоп) ---------- */
function enableDragScroll(el){
  if(el._dragInit)return;
  el._dragInit=true;
  var isDown=false,startX=0,startL=0,moved=false;
  el.addEventListener("pointerdown",function(e){
    if(e.pointerType!=="mouse")return; /* на телефоне работает обычный свайп */
    isDown=true;moved=false;startX=e.clientX;startL=el.scrollLeft;
    el.classList.add("dragging");
  });
  window.addEventListener("pointermove",function(e){
    if(!isDown)return;
    var dx=e.clientX-startX;
    if(Math.abs(dx)>4)moved=true;
    el.scrollLeft=startL-dx;
  });
  window.addEventListener("pointerup",function(){
    if(!isDown)return;
    isDown=false;el.classList.remove("dragging");
    if(moved){el.dataset.dragged="1";setTimeout(function(){delete el.dataset.dragged;},0);}
  });
  /* после протяжки не срабатывает случайный клик по плитке */
  el.addEventListener("click",function(e){
    if(el.dataset.dragged){e.preventDefault();e.stopPropagation();delete el.dataset.dragged;}
  },true);
}
function initDragScroll(){
  document.querySelectorAll(".chip-row,.fields-slider").forEach(enableDragScroll);
}

/* ЕДИНЫЙ список сервисов для шторки «Ещё» на всех страницах */
var MODULES=[
 {href:"index.html",ico:"🏠",t:"Главная"},
 {href:"profile.html",ico:"🏡",t:"Анкета"},
 {href:"economy.html",ico:"📊",t:"Экономика"},
 {href:"hr.html",ico:"🧾",t:"Кадры"},
 {href:"legal.html",ico:"⚖️",t:"Юр. помощник"},
 {href:"subsidies.html",ico:"🌾",t:"Субсидии"},
 {href:"calendar.html",ico:"📅",t:"Календарь"},
 {href:"archive.html",ico:"🗂️",t:"Архив"},
 {href:"request.html",ico:"✉️",t:"Заявка"}
];
function currentPage(){return location.pathname.split("/").pop()||"index.html";}

/* ---------- ЕДИНАЯ шторка «Ещё»: плитки, один список везде ---------- */
function buildSheet(){
  if(document.getElementById("kfh-sheet"))return;
  var page=currentPage();
  if(page==="login.html"||page==="index.html"||page==="")return;
  var sheet=document.createElement("div");
  sheet.className="kfh-sheet";sheet.id="kfh-sheet";sheet.hidden=true;
  sheet.innerHTML='<div class="kfh-sheet-card"><div class="kfh-sheet-head"><b>Все разделы</b><button class="kfh-sheet-close" id="kfh-sheet-close" type="button">✕</button></div>'+
    '<div class="kfh-sheet-grid">'+MODULES.map(function(m){
      return '<a class="kfh-sheet-btn" href="'+m.href+'"><span class="kfh-sheet-ico">'+m.ico+'</span><span class="kfh-sheet-t">'+m.t+'</span></a>';
    }).join("")+'</div></div>';
  document.body.appendChild(sheet);
  sheet.querySelector("#kfh-sheet-close").addEventListener("click",function(){sheet.hidden=true;});
  sheet.addEventListener("click",function(e){if(e.target===sheet)sheet.hidden=true;});
}
KFH.openSheet=function(){
  var s=document.getElementById("kfh-sheet");
  if(s)s.hidden=false;
};

/* ---------- нижнее меню (кроме главной, кабинета, логина) ---------- */
function buildNav(){
  if(document.querySelector(".kfh-bottom-nav"))return;
  var page=currentPage();
  if(page==="login.html"||page==="index.html"||page==="cabinet.html"||page==="")return;

  var nav=document.createElement("nav");
  nav.className="kfh-bottom-nav";
  nav.innerHTML=
    '<a class="kfh-nav-btn" href="cabinet.html"><span class="kfh-nav-ico-wrap"><span class="kfh-nav-ico">🏠</span></span>Кабинет</a>'+
    '<a class="kfh-nav-btn'+(page==="calendar.html"?" active":"")+'" href="calendar.html"><span class="kfh-nav-ico-wrap"><span class="kfh-nav-ico">📅</span><span class="kfh-badge" data-badge="cal" hidden>0</span></span>Календарь</a>'+
    '<a class="kfh-nav-btn'+(page==="archive.html"?" active":"")+'" href="archive.html"><span class="kfh-nav-ico-wrap"><span class="kfh-nav-ico">🗂️</span><span class="kfh-badge" data-badge="arch" hidden>0</span></span>Архив</a>'+
    '<button class="kfh-nav-btn" id="kfh-nav-more" type="button"><span class="kfh-nav-ico-wrap"><span class="kfh-nav-ico">⋯</span></span>Ещё</button>';
  document.body.appendChild(nav);
  document.body.classList.add("kfh-has-nav");

  nav.querySelector("#kfh-nav-more").addEventListener("click",KFH.openSheet);
}

/* логотип → главная */
function brandHome(){
  var brand=document.querySelector(".top-brand");
  if(brand&&brand.tagName!=="A"){
    brand.style.cursor="pointer";
    brand.title="На главную страницу";
    brand.addEventListener("click",function(){location.href="index.html";});
  }
}

/* ---------- актуальные бейджи архива и календаря ---------- */
KFH.refreshBadges=async function(){
  var archCount=0,calCount=0;
  if(KFH.supabaseReady()){
    try{
      var client=KFH.sb();
      var s=await client.auth.getSession();
      if(s.data&&s.data.session){
        var uid=s.data.session.user.id;
        var a=await client.from("archive_docs").select("id",{count:"exact",head:true}).eq("user_id",uid);
        archCount=a.count||0;
        var c=await client.from("calendar_events").select("id",{count:"exact",head:true}).eq("user_id",uid).gte("event_date",KFH.todayISO());
        calCount=c.count||0;
      }
    }catch(e){}
  }else{
    archCount=KFH.localArr("kfh_archive_v1").length;
    var calArr=KFH.localArr("kfh_calendar_v1").filter(function(x){return (x.date||"")>=KFH.todayISO();});
    calCount=calArr.length;
  }
  KFH.setBadge("arch",archCount);
  KFH.setBadge("cal",calCount);
};

function initNav(){
  buildSheet();
  buildNav();
  brandHome();
  initDragScroll();
  KFH.refreshBadges();
}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",initNav);}else{initNav();}
})();

/* ============================================
   Вкладки внутри сервиса (переключение разделов).
   ============================================ */
(function(){
"use strict";
var KFH=window.KFH=window.KFH||{};
function secs(){return Array.prototype.slice.call(document.querySelectorAll(".kfh-scr"));}
KFH.initScreens=function(opts){
  opts=opts||{};
  if(KFH._scrInit||!secs().length)return;
  KFH._scrInit=true;
  var nav=document.getElementById("scrnav");
  var mq=window.matchMedia("(max-width: 899px)");
  var current=null;
  function isMobile(){return mq.matches;}
  function build(){
    if(!nav)return;
    nav.innerHTML=secs().map(function(s){
      return '<button class="kfh-scrbtn" type="button" data-go="'+s.dataset.scr+'">'+(s.dataset.title||s.dataset.scr)+'</button>';
    }).join("");
    Array.prototype.forEach.call(nav.querySelectorAll("[data-go]"),function(b){
      b.addEventListener("click",function(){KFH.goScreen(b.getAttribute("data-go"));});
    });
  }
  KFH.goScreen=function(id){
    var all=secs();var target=null;
    for(var i=0;i<all.length;i++){if(all[i].dataset.scr===id){target=all[i];break;}}
    if(!target)return;
    current=id;
    all.forEach(function(s){s.hidden=s.dataset.scr!==id;});
    if(nav){Array.prototype.forEach.call(nav.querySelectorAll(".kfh-scrbtn"),function(b){
      b.classList.toggle("active",b.getAttribute("data-go")===id);});}
    window.scrollTo(0,0);
  };
  function applyMode(){
    if(nav)nav.classList.toggle("mobile",isMobile());
    build();
    var def=opts.mobile||(secs()[0]?secs()[0].dataset.scr:"calc");
    var keep=(current&&secs().some(function(s){return s.dataset.scr===current;}))?current:def;
    KFH.goScreen(keep);
  }
  applyMode();
  if(mq.addEventListener){mq.addEventListener("change",applyMode);}
  else if(mq.addListener){mq.addListener(applyMode);}
};
function autoInit(){
  if(document.querySelector(".kfh-scr")&&!KFH._scrInit){
    KFH.initScreens(window.KFH_SCREEN_OPTS||{});
  }
}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",autoInit);}else{autoInit();}
})();