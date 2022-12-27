import axios from 'axios';
import { load } from 'cheerio';
import AnimeScraper, {
  AnimeSource,
  GetSourcesQuery,
} from '../../core/AnimeScraper';
import zoroExtractor from '../../extractors/zoro';
import { SourceAnime, SourceEpisode } from '../../types/data';
import { fulfilledPromises } from '../../utils';

const BASE_URL = "https://zoro.to";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36";
const headerOption = { "User-Agent": USER_AGENT, "X-Requested-With": "XMLHttpRequest" };


export default class AnimeZoroScraper extends AnimeScraper {
  constructor() {
    super('zoro', 'Zoro', { baseURL: BASE_URL });
    // Languages that the source supports (Two letter code)
    // See more: https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
    this.locales = ['en'];
    this.scrapingPages = 1;
    this.monitorURL = "https://zoro.to/recently-updated?page=1";
  }

  async statusCheck(): Promise<boolean> {
    const response = await axios.get(
      `${BASE_URL}/recently-updated?pag=1`,
    );

    
    return response.status === 200;
  }
  
  shouldMonitorChange(oldPage: string, newPage: string): boolean {
    if (!oldPage || !newPage) return false;
    const selector = '.film-name h3';
    const nameSelector = 'a';

    const $old = load(oldPage);
    const $new = load(newPage);

    const oldTitle = $old(selector).find(nameSelector).text().trim();
    const newTitle = $new(selector).find(nameSelector).text().trim();

    return oldTitle !== newTitle;
  }
  
  async scrapeAnimePage(page: number): Promise<SourceAnime[]> {
    const { data } = await axios.get(
      `${BASE_URL}/recently-updated?page=${page}`
    );
      
    const $ = load(data);
    
    return fulfilledPromises<Promise<SourceAnime>>(
      $('.film-name')
      .toArray()
      .map(async (el) => {
        const sourceMediaId = $(el).find('a').attr('href').split('/')[1].split('?')[0];
        const episodes = await this.getEpisodes(sourceMediaId);

        const name = $(el).find('a').text();

        return{
          titles: [name],
          episodes,
          sourceId: this.id,
          sourceMediaId: sourceMediaId,
        };
      }),    
    );
  }

  async getEpisodes( sourceSlug: string): Promise<SourceEpisode[]> {

    wait(1500);
    
    const { data } = await axios.get(`${BASE_URL}/watch/${sourceSlug}`);
 
    const $ = load(data);
    const idNum = sourceSlug.split("-").pop();

    const episodesRes = await axios.get(BASE_URL + `/ajax/v2/episode/list/${idNum}`, {
      headers: {
          ...headerOption,
          "Referer": BASE_URL + `watch/${sourceSlug}`
      }
    });
    
    const $$ = load(episodesRes.data.html);

    return $$('div.detail-infor-content > div.ss-list > a')
      .toArray()
      .map((el) => {
       

        return {
          name: $(el).attr("data-number"),
          sourceEpisodeId: $(el).attr("href").split("/").pop().replace("?ep=", "-episode-"),
          sourceMediaId: sourceSlug,
        };
      });
 
  }

  
  // async scrapeAnime(sourceId: string): Promise<SourceAnime> {
  //   return;
  // }
  
  async getSources(query: GetSourcesQuery): Promise<AnimeSource> {
    const { episode_id } = query;
    const { sources, subtitles } = await zoroExtractor(episode_id);
    
    if (!sources?.length) return { sources: [], subtitles: []};

    return { sources, subtitles };
  }
}

function wait(ms) {
  return new Promise( (resolve) => {setTimeout(resolve, ms)});
}