import { QdrantClient } from "@qdrant/js-client-rest";
import { blockQuote, italic } from "discord.js";
import { stripIndents } from "common-tags";
import * as dotenv from "dotenv";
import axios from "axios";
import { getNWords } from "./documents/utils/utils.js";
import { FileDownloader } from "./documents/downloader/downloader.js";

type AnotherType = {
  dims: number[];
  type: string;
  data: {
      [key: string]: number;
  }
  size: number;
}

try {

  dotenv.config();

  const qdrant = new QdrantClient({
    url: "http://localhost",
    port: 6333,
  });

  // make sure the collection exists
  await qdrant.getCollections().then((array) => { 
      console.log(array);
      if(!array.collections.some((collection) => collection.name === process.env.QDRANT_COLLECTION)) {
          throw new Error("Collection does not exist");
      };
  });

  const port = process.env.ILIAS_PORT ? parseInt(process.env.ILIAS_PORT, 10) : 3000;
  const term = "death";
  const response = await axios.get(`http://localhost:${port}/?search=${encodeURIComponent(term as string)}`);
  const tensor: AnotherType = await response.data;
  const count = 5;

  const data = Object.values(tensor.data).map(Number);

  const result = await qdrant.search("test", {vector: data, limit: count});

  //const string = result[0].payload?.content;
  const string = `From old
  Egypt have come the fundamental esoteric and occult teachings which have so strongly influenced the philosophies of all races, nations and peoples, for several thousand years. Egypt, the home of the Pyramids and the Sphinx, was the birthplace of the Hidden Wisdom and Mystic Teachings. From her Secret Doctrine all nations have borrowed. India, Persia, Chaldea, Medea, China, Japan, Assyria, ancient Greece and Rome, and other ancient countries partook liberally at the feast of knowledge which the Hierophants and Masters of the Land of Isis so freely provided for those who came prepared to partake of the great store of Mystic and Occult Lore which the masterminds of that ancient land had gathered together.

  In ancient Egypt dwelt the great Adepts and Masters who have never been surpassed, and who seldom have been equaled, during the centuries that have taken their processional flight since the days of the Great Hermes. In Egypt was located the Great Lodge of Lodges of the Mystics. At the doors of her Temples entered the Neophytes who afterward, as Hierophants, Adepts, and Masters, traveled to the four corners of the earth, carrying with them the precious knowledge which they were ready, anxious, and willing to pass on to those who were ready to receive the same. All students of the Occult recognize the debt that they owe to these venerable Masters of that ancient land.
  
  But among these great Masters of Ancient Egypt there once dwelt one of whom Masters hailed as "The Master of Masters." This man, if "man" indeed he was, dwelt in Egypt in the earliest days. He was known as Hermes Trismegistus. He was the father of the Occult Wisdom; the founder of Astrology; the discoverer of Alchemy. The details of his life story are lost to history, owing to the lapse of the years, though several of the ancient countries disputed with each other in their claims to the honor of having furnished his birthplace—and this thousands of years ago. The date of his sojourn in Egypt, in that his last incarnation on this planet, is not now known, but it has been fixed at the early days of the oldest dynasties of Egypt—long before the days of Moses. The best authorities regard him as a contemporary of Abraham, and some of the Jewish traditions go so far as to claim that Abraham acquired a portion of his mystic knowledge from-Hermes himself.`
  const first = encodeURIComponent(getNWords(string as string, 5, true));
  const last = encodeURIComponent(getNWords(string as string, 5, false));
  console.log(`#:~:text=${first},${last}`);


  const downloader = await FileDownloader.create();
  downloader.download("")
  //const message = await test.createMessage(result);


  //console.log(message[0].url);

} catch (error) {
  console.error(error);
}
