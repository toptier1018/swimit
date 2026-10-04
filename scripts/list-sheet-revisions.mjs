import { google } from "googleapis";

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
  ],
});

async function main() {
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.revisions.list({
    fileId: spreadsheetId,
    fields:
      "revisions(id,modifiedTime,lastModifyingUser,keepForever,originalFilename)",
    pageSize: 20,
  });
  console.log(JSON.stringify(res.data.revisions || [], null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
