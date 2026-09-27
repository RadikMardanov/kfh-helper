/* ============================================
   КФХ-Помощник · виджет оценки сервиса (rating.js)
   Подключать на страницах, где есть <div id="rate-mount"></div>.
   ============================================ */
(function(){
function boot(){
  if(typeof window.supabase==="undefined"||typeof window.SUPABASE_URL==="undefined"||typeof window.SUPABASE_ANON_KEY==="undefined"){return;}
  var mount=document.getElementById("rate-mount");
  if(!mount)return;
  var sbR=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);

  var css=document.createElement("style");
  css.textContent=
  ".rate-card{margin-top:14px;padding:16px 18px;background:#f7f8fa;border:1px solid #edeff2;border-radius:22px;box-shadow:0 1px 3px rgba(15,23,42,.05)}"+
  ".rate-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}"+
  ".rate-avg{font-size:26px;font-weight:900;color:#0f172a}"+
  ".rate-stars{font-size:21px;color:#d97706;letter-spacing:2px}"+
  ".rate-stars .off{color:#d1d5db}"+
  ".rate-count{color:#6b7280;font-size:14px}"+
  ".rate-big-stars{display:flex;gap:8px;margin:12px 0 4px;flex-wrap:wrap}"+
  ".rate-star-btn{min-width:54px;min-height:54px;font-size:32px;border-radius:12px;border:1px solid #d3d9df;background:#fff;color:#d1d5db;cursor:pointer}"+
  ".rate-star-btn.on{color:#d97706;border-color:#d97706;background:#fff8e8}"+
  ".rate-comment-toggle{background:none;border:none;color:#15803d;font-weight:700;font-size:14px;cursor:pointer;padding:6px 0;text-decoration:underline}"+
  ".rate-comment{width:100%;min-height:70px;margin-top:8px;padding:10px 12px;border:1px solid #d3d9df;border-radius:10px;font-family:inherit;font-size:15px;resize:vertical}"+
  ".rate-btn{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:11px 19px;border-radius:12px;border:1px solid transparent;font-size:16px;font-weight:700;cursor:pointer;white-space:nowrap}"+
  ".rate-btn.primary{background:#16a34a;color:#fff}.rate-btn.primary:hover{background:#15803d}"+
  ".rate-btn.secondary{background:#fff;border-color:#d3d9df;color:#0f172a}.rate-btn.secondary:hover{background:#f3f4f6}";
  document.head.appendChild(css);

  mount.innerHTML=
  '<div class="rate-card">'+
    '<div class="rate-row">'+
      '<div class="rate-avg" id="rate-avg">—</div>'+
      '<div class="rate-stars" id="rate-stars-view"></div>'+
      '<div class="rate-count" id="rate-count">Загрузка…</div>'+
      '<button class="rate-btn primary" id="rate-open" style="margin-left:auto;min-height:42px">Оценить</button>'+
    '</div>'+
    '<div id="rate-form" hidden>'+
      '<p style="margin:10px 0 0;color:#6b7280;font-size:14px">1 — очень плохо, 5 — отлично:</p>'+
      '<div class="rate-big-stars" id="rate-big-stars"></div>'+
      '<div style="margin-top:8px"><button class="rate-comment-toggle" id="rate-comment-toggle" type="button">💬 Добавить комментарий (необязательно)</button></div>'+
      '<textarea class="rate-comment" id="rate-comment" hidden placeholder="Чего не хватило или что неудобно? Видно только команде сервиса."></textarea>'+
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">'+
        '<button class="rate-btn primary" id="rate-send">Отправить оценку</button>'+
        '<button class="rate-btn secondary" id="rate-cancel">Отмена</button>'+
      '</div>'+
      '<p style="margin-top:8px;color:#6b7280;font-size:14px" id="rate-msg"></p>'+
    '</div>'+
  '</div>';

  function $(id){return document.getElementById(id);}
  var myScore=0,chosen=0,loggedUser=null;
  function starsHtml(avg){var full=Math.round(avg),h="";for(var i=1;i<=5;i++){h+='<span class="'+(i<=full?"":"off")+'">★</span>';}return h;}
  function plural(n){var m=n%10,d=n%100;if(m===1&&d!==11)return "оценка";if(m>=2&&m<=4&&(d<10||d>=20))return "оценки";return "оценок";}

  async function loadRatings(){
    try{
      var r=await sbR.from("ratings").select("user_id,score");
      var rows=r.data||[];
      if(rows.length){
        var sum=rows.reduce(function(a,x){return a+Number(x.score);},0);
        var avg=sum/rows.length;
        $("rate-avg").textContent=avg.toFixed(1);
        $("rate-count").textContent=rows.length+" "+plural(rows.length)+" сервиса";
        $("rate-stars-view").innerHTML=starsHtml(avg);
      }else{
        $("rate-avg").textContent="—";
        $("rate-count").textContent="оценок пока нет — будьте первым";
        $("rate-stars-view").innerHTML=starsHtml(0);
      }
      if(loggedUser){
        var mine=null;rows.forEach(function(x){if(x.user_id===loggedUser.id)mine=x;});
        if(mine){myScore=Number(mine.score);$("rate-open").textContent="Моя оценка: "+myScore+"★";}
      }
    }catch(e){}
  }
  function buildPicker(){
    var box=$("rate-big-stars");box.innerHTML="";
    for(var i=1;i<=5;i++){(function(v){
      var b=document.createElement("button");
      b.type="button";b.className="rate-star-btn";b.textContent="★";
      b.addEventListener("click",function(){chosen=v;renderPicker();});
      box.appendChild(b);})(i);}
  }
  function renderPicker(){
    var btns=$("rate-big-stars").children;
    for(var i=0;i<btns.length;i++){btns[i].classList.toggle("on",i<chosen);}
  }

  $("rate-open").addEventListener("click",async function(){
    var s=await sbR.auth.getSession();
    if(!s.data.session){
      if(confirm("Оценивать сервис могут только зарегистрированные пользователи — так честно и без накруток. Войти?"))location.href="login.html";
      return;
    }
    loggedUser=s.data.session.user;
    chosen=myScore||0;renderPicker();
    $("rate-form").hidden=false;$("rate-msg").textContent="";
  });
  $("rate-cancel").addEventListener("click",function(){$("rate-form").hidden=true;$("rate-comment").hidden=true;});
  $("rate-comment-toggle").addEventListener("click",function(){$("rate-comment").hidden=!$("rate-comment").hidden;});
  $("rate-send").addEventListener("click",async function(){
    if(chosen<=0){$("rate-msg").textContent="Выберите количество звёзд (1 — очень плохо, 5 — отлично).";return;}
    var s=await sbR.auth.getSession();
    if(!s.data.session){location.href="login.html";return;}
    $("rate-send").disabled=true;$("rate-msg").textContent="Сохраняем…";
    var commentVal=$("rate-comment").value.trim()||null;
    var res=await sbR.from("ratings").upsert({user_id:s.data.session.user.id,score:chosen,comment:commentVal},{onConflict:"user_id"});
    $("rate-send").disabled=false;
    if(res.error){$("rate-msg").textContent="Ошибка: "+res.error.message;return;}
    myScore=chosen;
    $("rate-form").hidden=true;$("rate-comment").hidden=true;
    $("rate-open").textContent="Моя оценка: "+chosen+"★ — спасибо!";
    $("rate-msg").textContent="";
    loadRatings();
  });

  (async function(){
    try{var s=await sbR.auth.getSession();if(s.data.session)loggedUser=s.data.session.user;}catch(e){}
    buildPicker();loadRatings();
  })();
}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",boot);}else{boot();}
})();