import _ from "lodash";
import axios, { HttpStatusCode } from "axios";
import cheerio from "cheerio";

import type IGame from "./interfaces/IGame.ts";
import type IMedal from "./interfaces/IMedals.ts";
import type ISport from "./interfaces/ISport.ts";
import type ISchedules from "./interfaces/ISchedules.ts";
import type IAthlete from "./interfaces/IAthlete.ts";
import Cache from "@/lib/cache.ts";

// 伪装headers
const FAKE_HEADERS = {
  Accept: "*/*",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "zh-CN,zh;q=0.9",
  "Cache-Control": "no-cache",
  "Apollographql-Client-Name": "oe-api-production",
  Pragma: "no-cache",
  Priority: "u=1, i",
  Origin: "https://olympics.com",
  "Sec-Ch-Ua":
    '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-User": "?1",
  Referer: "https://olympics.com/zh",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Upgrade-Insecure-Requests": "1",
  "X-Country-Code": "CN",
  "X-Language": "zh"
};
const cache = new Cache();

async function getGames(): Promise<IGame[]> {
  const data = await cache.get('olympics:games');
  if (data)
    return data;
  const result = await axios.get(
    `https://olympics.com/zh/api/v1/b2p/menu/topbar/olympic-games`,
    {
      headers: FAKE_HEADERS,
      validateStatus: () => true
    }
  );
  if (result.status != HttpStatusCode.Ok)
    return [];
  const { modules } = result.data;
  const module = modules.find(v => v.type == 'olympicEditionsDropdownCarousel');
  if (!module || !module.content)
    return [];
  const games: IGame[] = module.content.map(v => ({
    id: v.slug,
    type: v.season,
    name: v.title,
    year: Number((v.slug.match(/\d+$/) || [])[0]) || 0,
    url: v.url
  }));
  await cache.set('olympics:games', games, 604800);
  return games;
}

async function getGame(gameId: string): Promise<IGame | null> {
  const games = await getGames();
  return games.find(v => v.id == gameId) || null;
}

async function getMedals(gameId: string): Promise<IMedal[]> {
  const data = await cache.get('olympics:medals:' + gameId);
  if (data)
    return data;
  const game = await getGame(gameId);
  if (!game)
    throw new Error('此奥运竞赛不存在，请检查竞赛ID是否正确');
  const result = await axios.get(
    `https://olympics.com/zh/olympic-games/${gameId}/medals`,
    {
      headers: {
        ...FAKE_HEADERS,
        Referer: `https://olympics.com/zh/olympic-games/${gameId}/medals`,
      },
      validateStatus: () => true
    }
  );
  if (result.status != HttpStatusCode.Ok)
    return [];
  const html = result.data;
  const $ = cheerio.load(html);
  const tableContent = $('div[data-cy="table-content"]');
  const countryNames: string[] = Array.from(tableContent.find('span[data-cy="country-name"]').map((_, item) => $(item).text().trim().replace('USSR', '前苏联').replace('ROC', '俄罗斯奥委会')) as any);
  const countryCodes: string[] = Array.from(tableContent.find('div[data-cy="tri-letter-code"]').map((_, item) => $(item).text().trim()) as any);
  const goldMedals: number[] = Array.from(tableContent.find('div[data-medal-id^="gold-medals-row-"]').map((_, item) => Number($(item).text().trim()) || 0) as any);
  const silverMedals: number[] = Array.from(tableContent.find('div[data-medal-id^="silver-medals-row-"]').map((_, item) => Number($(item).text().trim()) || 0) as any);
  const bronzeMedals: number[] = Array.from(tableContent.find('div[data-medal-id^="bronze-medals-row-"]').map((_, item) => Number($(item).text().trim()) || 0) as any);
  const medals: IMedal[] = countryNames.map((_, i) => ({ country: countryNames[i], code: countryCodes[i], gold: goldMedals[i], silver: silverMedals[i], bronze: bronzeMedals[i], total: goldMedals[i] + silverMedals[i] + bronzeMedals[i] }));
  medals.sort((a, b) => b.total - a.total);
  await cache.set('olympics:medals:' + gameId, medals, 600);
  return medals;
}

async function getSports(gameId?: string): Promise<ISport[]> {
  const schedules = await getSchedules(gameId);
  if (!schedules)
    return [];
  return schedules.sports;
}

async function getSchedules(gameId: string): Promise<ISchedules> {
  const data = await cache.get('olympics:schedules:' + gameId);
  if (data)
    return data;
  const game = await getGame(gameId);
  if (!game)
    throw new Error('此奥运竞赛不存在，请检查竞赛ID是否正确');
  if (game.year != new Date().getFullYear())
    throw new Error('此奥运竞赛已结束，无法查看赛程');
  let result = await axios.get(
    `https://olympics.com/zh/${gameId}/schedule`,
    {
      headers: FAKE_HEADERS,
      validateStatus: () => true
    }
  );
  if (result.status != HttpStatusCode.Ok)
    return null;
  let $ = cheerio.load(result.data);
  const interfaceButton = $('a[data-cy="interface-button"]').last();
  if (!interfaceButton)
    return null;
  const url = interfaceButton.attr('href');
  if (!url)
    return null;
  result = await axios.get(
    `https://olympics.com${url}`,
    {
      headers: FAKE_HEADERS,
      validateStatus: () => true
    }
  );
  if (result.status != HttpStatusCode.Ok)
    return null;
  $ = cheerio.load(result.data);
  const nextData = JSON.parse($('script[id="__NEXT_DATA__"]').text() || '{}');
  if (!nextData['props'] || !nextData['props']['pageProps'] || !nextData['props']['pageProps']['page'] || !nextData['props']['pageProps']['page']['items'])
    return null;
  const scheduleWrapper = nextData['props']['pageProps']['page']['items'].find(v => v.name == 'scheduleWrapper');
  if (!scheduleWrapper || !scheduleWrapper.data)
    return null;
  let scheduleData = scheduleWrapper.data;
  const schedules = {};
  for (let day of scheduleData.days) {
    const [year, month, date] = day.split('-');
    const monthText = {
      '01': 'january',
      '02': 'february',
      '03': 'march',
      '04': 'april',
      '05': 'may',
      '06': 'june',
      '07': 'july',
      '08': 'august',
      '09': 'september',
      '10': 'october',
      '11': 'november',
      '12': 'december'
    }[month];
    const result = await axios.get(
      `https://olympics.com/zh/${gameId}/schedule/${parseInt(date)}-${monthText}`,
      {
        headers: {
          ...FAKE_HEADERS,
          Referer: `https://olympics.com/zh/${gameId}/schedule/${parseInt(date)}-${monthText}`
        },
        validateStatus: () => true
      }
    );
    if (result.status != HttpStatusCode.Ok) {
      schedules[day] = [];
      continue;
    }
    $ = cheerio.load(result.data);
    const nextData = JSON.parse($('script[id="__NEXT_DATA__"]').text() || '{}');
    if (!nextData['props'] || !nextData['props']['pageProps'] || !nextData['props']['pageProps']['page'] || !nextData['props']['pageProps']['page']['items']) {
      schedules[day] = [];
      continue;
    }
    const scheduleWrapper = nextData['props']['pageProps']['page']['items'].find(v => v.name == 'scheduleWrapper');
    if (!scheduleWrapper || !scheduleWrapper.data) {
      schedules[day] = [];
      continue;
    }
    scheduleData = scheduleWrapper.data;
    schedules[day] = scheduleData.schedules.map(v => ({
      units: v.units,
      sport: {
        code: v.discipline.disciplineCode,
        name: v.discipline.description
      },
      venue: v.venue ? {
        code: v.venue.venueCode,
        description: v.venue.description
      } : null
    }))
  }
  const schedulesData = {
    days: scheduleData.days,
    sports: (scheduleData.disciplines || []).map(v => ({
      id: v.disciplineSlug,
      name: v.description,
      code: v.disciplineCode,
      url: `https://olympics.com/zh/sports/${v.disciplineSlug.replace(/^discipline\-/, '')}`
    })),
    schedules,
    disclaimerText: scheduleData.disclaimerText
  };
  await cache.set(`olympics:schedules:${gameId}`, schedulesData, 86400);
  return schedulesData;
}

async function getAthletes(gameId: string, sportId = '', teamCode = ''): Promise<IAthlete[]> {
  sportId = sportId.replace('discipline-', '');
  const data = await cache.get('olympics:athletes:' + gameId + ':' + sportId);
  if (data)
    return data;
  const game = await getGame(gameId);
  if (!game)
    throw new Error('此奥运竞赛不存在，请检查竞赛ID是否正确');
  const athletes = [];
  let nextToken = null;
  let pageNumber = 1;
  while (pageNumber == 1 || nextToken) {
    const result = await axios.post(
      `https://olympics.com/_sed/api/olympic-games/${gameId}/athletes?page=${pageNumber}&discipline=${sportId}&noc=${teamCode}`, {
      discipline: sportId,
      nextToken,
      noc: teamCode
    },
      {
        headers: {
          ...FAKE_HEADERS,
          Referer: `https://olympics.com/zh/olympic-games/${gameId}/athletes`,
          "Content-Type": "text/plain;charset=UTF-8",
          Cookie: 'dl_anonymous_id=anonymous_user'
        },
        validateStatus: () => true
      }
    );
    if (result.status != HttpStatusCode.Ok)
      break;
    const { athleteList, pagination } = result.data;
    for (let item of athleteList) {
      const { athlete, countryName, countryCode, goldMedal, silverMedal, bronzeMedal, sport } = item;
      athletes.push({
        name: athlete.name,
        image: athlete.image.replace('{formatInstructions}', 't_1-1_300'),
        url: athlete.url,
        medals: {
          country: countryName,
          code: countryCode,
          gold: goldMedal,
          silver: silverMedal,
          bronze: bronzeMedal,
          total: goldMedal + silverMedal + bronzeMedal
        },
        sport
      });
    }
    nextToken = pagination ? pagination.nextToken : null;
    pageNumber++;
  }
  await cache.set(`olympics:athletes:${gameId}:${sportId}`, athletes, 3600);
  return athletes;
}

export default {
  getGames,
  getMedals,
  getSports,
  getSchedules,
  getAthletes
};
