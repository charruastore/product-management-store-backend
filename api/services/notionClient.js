import { Client } from "@notionhq/client";
import { ENV } from "../../config/env.js";

export const notion = new Client({ auth: ENV.NOTION_TOKEN });
export const NOTION_DB_ID = ENV.NOTION_DB_ID;
