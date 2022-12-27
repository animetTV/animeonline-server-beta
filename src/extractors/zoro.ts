import axios from "axios";
import { load } from 'cheerio';

const zoroBase = "https://zoro.to";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36";
const headerOption = { "User-Agent": USER_AGENT, "X-Requested-With": "XMLHttpRequest" };
import { scrapeSource } from '../helper/rapid-cloud';

type Source = {
    file: string;
    type: string;
};

type Subtitle = {
    file: string;
    lang: string;
    language: string;
}

const zoroExtractor = async(id: string) => {
    // let type = 1; // 1: sub 2: dub
    const sources = [];
    const sources_bk = [];
    const subtitles = [];

    try {
        id = id.split("-").pop();

        const res = await axios.get( zoroBase + `/ajax/v2/episode/servers?episodeId=${id}`, {
            headers: headerOption
        });
        const $ = load(res.data.html)

        let dataId;
        const subOrDub = "sub";
        // if (type == 2) subOrDub = "dub"

        // if (subOrDub === "dub" && $('div.servers-dub').length <= 0) {
        //     return {
        //         noDubs: true,
        //         error_message: "No dubs available for this episode"
        //     }
        // }

        $(`div.servers-${subOrDub} > div.ps__-list > div.server-item`).each((i:number, el) => {
            console.log(i);
            
            if (Number($(el).attr("data-server-id")) == 1) {
                dataId = $(el).attr("data-id");
            };
        });

        const resSources = await scrapeSource(dataId);
        // append cors nodes to each source url
        resSources.sources.forEach((source) => {
            const item: Source = {
                file: `https://cors-daddy.onrender.com/${source.file}`,
                type: 'hls'
            };
            sources.push(item);
        });

        // transform subtitles
        resSources.subtitles.forEach((subtitle: any) => {
            // check for undefine var
            if (subtitle.label) {
                const item: Subtitle = {
                    file: subtitle.file,
                    lang: subtitle.label,
                    language:subtitle.label,
                };
                subtitles.push(item);
            }
        });

        // transform array put 'English' sub on top
        for (let i = 0; i < subtitles.length; i++) {
            const item = subtitles[i];
            if (item.lang === 'English') {
              const selectedEl = subtitles.splice(i, 1)[0];
              subtitles.unshift(selectedEl);
              break;
            }
          }
        
        return {
            sources: sources as Source[],
            sources_bk: sources_bk as Source[],
            subtitles: subtitles as Subtitle[],
        };
    } catch (err) {
        return { error: err } 
    }
};

export default zoroExtractor;