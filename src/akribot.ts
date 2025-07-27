
import { sleep } from 'bun';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import puppeteer from 'puppeteer';

async function readTextFile(path: string) {
  try {
    const cookie = await fs.readFile(path, 'utf8');
    return cookie.trim();
  } catch (err: any) {
    throw new Error(err);
  }
}

async function writeTextFile(path: string, cookieValue: string) {
  try {
    await fs.writeFile(path, cookieValue, 'utf8');
  } catch (err: any) {
    throw new Error(err);
  }
}


//
const cookieFile = `${__dirname}/robloxsecurity`;
const cookieName = ".ROBLOSECURITY";
let lastFetch = 0;

export async function getRobloxCookie() {
    const last_cookie = await readTextFile(cookieFile);

    if (Date.now() - lastFetch >= 1000 * 60 * 10) {
      return last_cookie;
    }

    const browser = await puppeteer.launch({ headless: true });
    browser.setCookie({name: cookieName, value: last_cookie, domain: ".roblox.com", secure: true, httpOnly: true});

    const page = await browser.newPage();
    await page.goto('https://www.roblox.com/home');
    
    const cookies = await browser.cookies();
    const robloxSec = cookies.find(cookie => cookie.name === '.ROBLOSECURITY');
    await browser.close();

    if (robloxSec) {
      lastFetch = Date.now();
      await writeTextFile(cookieFile, robloxSec.value);
    }

    return robloxSec?.value;
}