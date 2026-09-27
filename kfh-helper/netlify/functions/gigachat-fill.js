/* ============================================
   КФХ-Помощник · серверный прокси к GigaChat (Sber, РФ)
   Прячет ключи, возвращает СТРОГИЙ JSON полей анкеты.
   Вызов: POST /.netlify/functions/gigachat-fill
   Тело: { text?: string, image?: { mime, base64 } }

   Переменные окружения Netlify (уровень САЙТА, бесплатно):
   GIGACHAT_CLIENT_ID      — обязательно
   GIGACHAT_CLIENT_SECRET  — обязательно
   GIGACHAT_BASE_URL       — необязательно; для тестового контура:
                             https://gigachat-api.pers.sberbank.ru/gigachat/api/v1
                             (по умолчанию боевой: https://gigachat.devices.sberbank.ru/api/v1)
   GIGACHAT_SCOPE          — необязательно (по умолчанию GIGACHAT_API)
   ============================================ */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const AUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const BASE_URL = process.env.GIGACHAT_BASE_URL || "https://gigachat.devices.sberbank.ru/api/v1";
const SCOPE = process.env.GIGACHAT_SCOPE || "GIGACHAT_API";

let tokenCache = { token: null, expires: 0 };

async function getToken() {
  const id = process.env.GIGACHAT_CLIENT_ID;
  const secret = process.env.GIGACHAT_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (tokenCache.token && Date.now() < tokenCache.expires - 60000) return tokenCache.token;
  const auth = Buffer.from(id + ":" + secret).toString("base64");
  const resp = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + auth,
      "RqUID": crypto.randomUUID(),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "scope=" + SCOPE
  });
  if (!resp.ok) throw new Error("OAuth HTTP " + resp.status);
  const j = await resp.json();
  let ttl = Number(j.expires_in || 0);
  if (ttl < 1e6) ttl = ttl * 1000; /* если пришло в секундах */
  tokenCache = { token: j.access_token, expires: Date.now() + ttl };
  return j.access_token;
}

async function chat(messages) {
  const token = await getToken();
  if (!token) throw new Error("NO_KEYS");
  const resp = await fetch(BASE_URL + "/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "GigaChat",
      messages: messages,
      temperature: 0.1,
      max_tokens: 2000
    })
  });
  if (!resp.ok) throw new Error("Completions HTTP " + resp.status);
  const j = await resp.json();
  return j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : "";
}

function extractJson(text) {
  const s = String(text || "");
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return {};
  try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return {}; }
}

const SYSTEM_PROMPT =
  "Ты — помощник, который заполняет анкету сельскохозяйственного хозяйства (Россия). " +
  "Извлекай факты ТОЛЬКО из сообщения пользователя или документа. Не придумывай значения. " +
  "Верни СТРОГО один JSON-объект без пояснений и без markdown со следующими ключами " +
  "(если значение неизвестно — null): " +
  "farm_name (строка), farm_type (одно из: КФХ, ИП, ЛПХ, ООО, СПК, Другое), " +
  "activity_type (одно из: Растениеводство, Животноводство, Смешанное, Переработка, Другое), " +
  "region (строка), district (строка), land_area (число, га), reg_date (строка ГГГГ-ММ-ДД), " +
  "okved_main (строка, код), workers_count (число), cattle_count (число), members_count (число), " +
  "family_members (число), own_funds_pct (число 0-100), agro_revenue_share (число 0-100), " +
  "land_title (одно из: Собственность, Аренда, Собственность и аренда, Земли нет, null), " +
  "seasonal (bool), cattle_dairy (bool), has_machinery (bool), no_tax_debt (bool), " +
  "export_activity (bool), rural_residence (bool), land_for_project (bool), apk_reports (bool), " +
  "vetis_done (bool), evsd_done (bool), collateral_lack (bool), sme_registry (bool), " +
  "okved_agro (bool), prev_agrostartup (bool), commit_5y (bool). " +
  "Числа возвращай числами без слов. Даты приводи к ГГГГ-ММ-ДД. " +
  "Фразы без отрицания («есть коровы») дают true; явные отрицания («нет долгов») учитывай по смыслу поля.";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ ok: false, error: "METHOD" }) };
  }
  if (!process.env.GIGACHAT_CLIENT_ID || !process.env.GIGACHAT_CLIENT_SECRET) {
    return {
      statusCode: 200, headers: CORS,
      body: JSON.stringify({ ok: false, error: "NOT_CONFIGURED", message: "GigaChat не подключён: задайте GIGACHAT_CLIENT_ID и GIGACHAT_CLIENT_SECRET в переменных окружения сайта (Site configuration → Environment variables)." })
    };
  }
  /* MVP: сертификаты GigaChat выпущены российским УЦ, которого нет в доверенном хранилище Node */
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  let payload;
  try { payload = JSON.parse(event.body || "{}"); }
  catch (e) { return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "BAD_JSON" }) }; }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const image = payload.image && payload.image.base64 ? payload.image : null;
  if (!text && !image) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "EMPTY" }) };
  }

  const userContent = [];
  if (text) userContent.push({ type: "text", text: text });
  if (image) userContent.push({ type: "image_url", image_url: { url: "data:" + (image.mime || "image/jpeg") + ";base64," + image.base64 } });
  if (image && !text) userContent.push({ type: "text", text: "Это документ хозяйства. Извлеки из него данные для анкеты." });

  try {
    const content = await chat([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent }
    ]);
    const data = extractJson(content);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, data: data }) };
  } catch (e) {
    const msg = String((e && e.message) || e);
    if (msg === "NO_KEYS") {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: "NOT_CONFIGURED", message: "GigaChat не подключён (нет ключей)." }) };
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: "API", message: msg }) };
  }
};