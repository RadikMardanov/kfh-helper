/* ============================================
   КФХ-Помощник · сохранение документа в архив (save-archive.js)
   Сохраняет документ как настоящий .docx (читается и на телефоне).
   Требует, чтобы download-docx.js был подключён ДО этого файла.
   ============================================ */
(function(){
window.KFH=window.KFH||{};
var ARCH_KEY="kfh_archive_v1";
function supabaseReady(){return typeof window.supabase!=="undefined"&&typeof window.SUPABASE_URL!=="undefined"&&typeof window.SUPABASE_ANON_KEY!=="undefined";}
function sb(){return window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);}

/* транслитерация для безопасного имени файла */
function translit(str){
  var map={"а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"yo","ж":"zh","з":"z","и":"i","й":"y","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"h","ц":"ts","ч":"ch","ш":"sh","щ":"sch","ъ":"","ы":"y","ь":"","э":"e","ю":"yu","я":"ya"," ":"_","А":"a","Б":"b","В":"v","Г":"g","Д":"d","Е":"e","Ё":"yo","Ж":"zh","З":"z","И":"i","Й":"y","К":"k","Л":"l","М":"m","Н":"n","О":"o","П":"p","Р":"r","С":"s","Т":"t","У":"u","Ф":"f","Х":"h","Ц":"ts","Ч":"ch","Ш":"sh","Щ":"sch","Ъ":"","Ы":"y","Ь":"","Э":"e","Ю":"yu","Я":"ya"};
  var out="";
  for(var i=0;i<str.length;i++){
    var c=str[i];
    if(map[c]!==undefined)out+=map[c];
    else if(/[a-zA-Z0-9\-_]/.test(c))out+=c;
    else out+="_";
  }
  return out.replace(/_+/g,"_").replace(/^_|_$/g,"");
}

var TYPE_MAP={
  claim:"Претензия / суд",term:"Претензия / суд",
  sale:"Договор",lease:"Договор",addag:"Договор",labor:"Договор",fixed:"Договор",gph:"Договор",
  pact:"Акт",act:"Акт",
  hire_app:"Заявление",fire_app:"Заявление",
  hire_ord:"Приказ",fire_ord:"Приказ"
};
KFH.archiveType=function(key){return TYPE_MAP[key]||"Другое";};

KFH.saveDocToArchive=async function(opts){
  opts=opts||{};
  var name=opts.name||"Документ";
  var docType=opts.doc_type||"Другое";
  var text=opts.text||"";
  var today=new Date().toISOString().split("T")[0];

  if(supabaseReady()){
    var client=sb();
    var s=await client.auth.getSession();
    if(!s.data||!s.data.session){
      if(confirm("Чтобы сохранить документ в архив, нужен аккаунт. Войти?"))location.href="login.html";
      return false;
    }
    var uid=s.data.session.user.id;

    var safeName=translit(name).substring(0,50)||"document";
    var fileName=safeName+"_"+Date.now()+".docx";
    var filePath=uid+"/"+fileName;

    try{
      /* настоящий DOCX — откроется и на телефоне */
      var blob=(window.KFHDocx)?KFHDocx.buildBlob(text):new Blob([text],{type:"text/plain;charset=utf-8"});
      var up=await client.storage.from("archive-files").upload(filePath,blob,{
        contentType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert:false
      });
      if(up.error){console.error("Ошибка загрузки файла:",up.error);filePath=null;}
    }catch(e){console.error("Исключение при загрузке:",e);filePath=null;}

    var res=await client.from("archive_docs").insert({
      user_id:uid,
      doc_type:docType,
      name:name,
      doc_date:today,
      counter:"",
      comment:"Сформировано в сервисе",
      file_name:fileName,
      file_path:filePath
    }).select().single();

    if(res.error){alert("Ошибка сохранения в архив: "+res.error.message);return false;}
    if(window.KFH&&KFH.refreshBadges)KFH.refreshBadges();
    return true;
  }else{
    var arr=[];try{arr=JSON.parse(localStorage.getItem(ARCH_KEY))||[];}catch(e){}
    arr.push({id:Date.now(),type:docType,name:name,date:today,counter:"",comment:"Сформировано в сервисе",file_name:"(текст документа)"});
    localStorage.setItem(ARCH_KEY,JSON.stringify(arr));
    if(window.KFH&&KFH.refreshBadges)KFH.refreshBadges();
    return true;
  }
};
})();