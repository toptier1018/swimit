import { readFileSync } from "fs";
import { resolve } from "path";

const envText = readFileSync(resolve(".env"), "utf8");
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (!m || process.env[m[1]]) continue;
  let v = m[2].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  process.env[m[1]] = v.replace(/\\n/g, "\n");
}

const appKey = process.env.NHN_APPKEY!;
const secret = process.env.NHN_SECRET_KEY!;
const sender = process.env.NHN_SENDER_KEY!;
const codes = [
  "SWIMIT_EP_V1",
  "SWIMIT_MD_V1",
  "SWIMIT_KM_V1",
  "SWIMIT_DA_V1",
  "SWIMIT_HS_V1",
  "SWIMIT_SH_V1",
];

for (const code of codes) {
  const url = `https://api-alimtalk.cloud.toast.com/alimtalk/v2.3/appkeys/${appKey}/senders/${sender}/templates/${code}`;
  const res = await fetch(url, { headers: { "X-Secret-Key": secret } });
  const j = await res.json();
  const t = j.template || {};
  const messageText = String(t.templateContent || t.message || t.content || "");
  const vars = [...messageText.matchAll(/#\{([^}]+)\}/g)].map((m) => m[1]);
  console.log(
    JSON.stringify(
      {
        code,
        ok: j.header?.isSuccessful,
        status: t.status,
        statusName: t.statusName,
        kakao: t.kakaoTemplateCode,
        name: t.templateName,
        vars: [...new Set(vars)],
      },
      null,
      2,
    ),
  );
}
