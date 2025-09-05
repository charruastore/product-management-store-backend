import "dotenv/config";

export const ENV = {
  PORT: process.env.PORT || 5000,
  NOTION_TOKEN: process.env.NOTION_TOKEN,
  NOTION_DB_ID: process.env.NOTION_DB_ID,
};

["NOTION_TOKEN", "NOTION_DB_ID"].forEach((k) => {
  if (!ENV[k]) {
    console.error(`[env] Falta ${k} en .env`);
    process.exit(1);
  }
});
